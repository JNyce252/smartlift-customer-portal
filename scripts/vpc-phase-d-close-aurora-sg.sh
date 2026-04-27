#!/usr/bin/env bash
# vpc-phase-d-close-aurora-sg.sh — Step 5C-redo Phase D
#
# Final cut-over: revokes the temporary 0.0.0.0/0:5432 inbound rule on the
# Aurora security group (sg-0a10102c1e09c540e). After this runs, the database
# is no longer reachable from the public internet — only via the Lambda SG
# inside the VPC. Closes SECURITY.md finding C-1.
#
# Pre-revoke sanity check: invokes smartlift-api /health to confirm the Lambdas
# are still serving requests through the new VPC path. Aborts if anything
# returns non-2xx — the new path must be healthy BEFORE we cut off the
# fallback.
#
# Post-revoke check: re-invokes /health, expects same clean response, and
# prints the final SG state for the record.
#
# Idempotent: if the 0.0.0.0/0:5432 rule is already gone, the script reports
# that and exits 0 cleanly.

set -euo pipefail

REGION="us-east-1"
AURORA_SG="sg-0a10102c1e09c540e"
API_GW_BASE="https://4cc23kla34.execute-api.us-east-1.amazonaws.com/prod"

say()  { printf '\n\033[1;36m==>\033[0m %s\n' "$*" >&2; }
ok()   { printf '   \033[1;32m✓\033[0m %s\n' "$*" >&2; }
warn() { printf '   \033[1;33m!\033[0m %s\n' "$*" >&2; }
die()  { printf '\n\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

# ---------- preflight ----------------------------------------------------
say "Preflight"
caller="$(aws sts get-caller-identity --query 'Arn' --output text)"
[[ "$caller" == *"nyceguy"* ]] || die "Expected IAM user nyceguy, got: $caller"
ok "Caller: $caller"

# ---------- pre-revoke health check --------------------------------------
say "Pre-revoke health check"
health=$(curl -fsS --max-time 10 "$API_GW_BASE/health" 2>/dev/null || true)
if [[ -z "$health" ]]; then
  die "Pre-revoke /health returned empty/error. Lambdas may not be healthy through the new VPC path. Investigate before revoking the SG fallback."
fi
ok "/health response: $health"
echo "$health" | grep -q '"status":"ok"' || die "Pre-revoke /health did not contain status:ok. Aborting."

# Spot-check Lambda config — all 5 must have the Lambda SG attached.
LAMBDA_SG="sg-05ad862bc8fe7fc3c"
say "Confirming all 5 DB-using Lambdas are on Lambda SG $LAMBDA_SG"
for fn in smartlift-api smartlift-tdlr-refresh smartlift-maintenance-reminder smartlift-review-analyzer smartlift-ai-scorer; do
  sgs=$(aws lambda get-function-configuration --region "$REGION" --function-name "$fn" \
    --query 'VpcConfig.SecurityGroupIds' --output text)
  if [[ "$sgs" != "$LAMBDA_SG" ]]; then
    die "$fn is on SGs '$sgs' (expected $LAMBDA_SG). Revoke would break this Lambda. Aborting."
  fi
  ok "$fn on $LAMBDA_SG"
done

# ---------- revoke -------------------------------------------------------
# Idempotent via AWS's own NotFound detection. The chained-projection
# JMESPath approach is fragile when the "rule" you care about is merged
# into a permission object that also has other sources (an SG ingress and
# a CIDR ingress on the same port get returned as a single IpPermission
# with both UserIdGroupPairs[*] and IpRanges[*] populated). Cleaner to just
# attempt the revoke and treat InvalidPermission.NotFound as success.
say "Revoking 0.0.0.0/0:5432 from $AURORA_SG (idempotent)"
out=$(aws ec2 revoke-security-group-ingress --region "$REGION" \
  --group-id "$AURORA_SG" \
  --ip-permissions "IpProtocol=tcp,FromPort=5432,ToPort=5432,IpRanges=[{CidrIp=0.0.0.0/0}]" 2>&1) || rc=$?
rc="${rc:-0}"
if [[ $rc -eq 0 ]]; then
  ok "Revoked: $AURORA_SG no longer accepts tcp/5432 from 0.0.0.0/0"
elif echo "$out" | grep -q "InvalidPermission.NotFound"; then
  ok "Rule was already gone — nothing to revoke. C-1 closed."
else
  die "revoke-security-group-ingress failed: $out"
fi

# ---------- post-revoke verification -------------------------------------
say "Post-revoke verification (waiting 5s for SG change to propagate)"
sleep 5

health=$(curl -fsS --max-time 10 "$API_GW_BASE/health" 2>/dev/null || true)
if [[ -z "$health" ]] || ! echo "$health" | grep -q '"status":"ok"'; then
  warn "Post-revoke /health did NOT return clean. Response: '$health'"
  warn "If this persists, you can re-add the 0.0.0.0/0 rule as an emergency:"
  warn "  aws ec2 authorize-security-group-ingress --group-id $AURORA_SG \\"
  warn "    --ip-permissions 'IpProtocol=tcp,FromPort=5432,ToPort=5432,IpRanges=[{CidrIp=0.0.0.0/0}]'"
  die "Post-revoke health check failed."
fi
ok "Post-revoke /health: $health"

# ---------- final SG state -----------------------------------------------
say "Final state of $AURORA_SG"
aws ec2 describe-security-groups --region "$REGION" --group-ids "$AURORA_SG" \
  --query "SecurityGroups[0].IpPermissions[*].{Proto:IpProtocol,From:FromPort,To:ToPort,Cidrs:IpRanges[*].CidrIp,SGs:UserIdGroupPairs[*].GroupId}" \
  --output table

cat >&2 <<EOF

\033[1;32mPhase D complete. SECURITY.md C-1 is now CLOSED.\033[0m

Final architecture:
  Aurora cluster (vpc-06cec9c7bd56c515d, sg-0a10102c1e09c540e) is reachable
  ONLY from inside the VPC, via:
    - sg-05ad862bc8fe7fc3c (Lambda SG) on port 5432
    - intra-SG self-ingress (legacy, unused)
    - tcp/22 from 52.95.4.19/32 (legacy AWS IP — orthogonal cleanup item)

  All 5 DB-using Lambdas:
    smartlift-api, smartlift-tdlr-refresh, smartlift-maintenance-reminder,
    smartlift-review-analyzer, smartlift-ai-scorer
  …live in subnets:
    smartlift-private-1a (172.31.96.0/20)
    smartlift-private-1b (172.31.112.0/20)
  …with egress to:
    NAT Gateway (nat-07c5a41250bccf625) → IGW for external HTTPS
    Bedrock VPC endpoint (vpce-05d0471881d3b686d) for InvokeModel
    Lambda  VPC endpoint (vpce-076eb482b98292308) for Lambda-to-Lambda invokes

Cost added this session: ~\$32/mo NAT Gateway flat + per-GB processing.
EOF
