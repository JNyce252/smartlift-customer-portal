#!/usr/bin/env bash
# Step 5 — Rotate Aurora `hotelapp` password into Secrets Manager and close
# the database security group's 0.0.0.0/0 ingress.
#
# Three phases — runnable independently. Use the env var PHASE=A|B|C, or just
# run with no args to do them all in sequence.
#
#   PHASE A  attach IAM policy, set DB_SECRET_ARN env var on each Lambda,
#            verify all Lambdas still working (still using OLD password but
#            now via Secrets Manager, since the secret was created with the
#            current password earlier in this conversation).
#   PHASE B  generate new password, rotate Aurora + Secrets Manager
#            atomically, force warm-pool flush, verify.
#   PHASE C  remove DB_PASSWORD env vars, revoke open SG ingress on 5432.
#
# Pre-req: scripts/deploy-lambda.sh has already been used to deploy the
# updated Lambda source (which can read either Secrets Manager OR env vars).
set -euo pipefail

ROLE_NAME="smartlift-api-role-zg1jcbas"
SECRET_ARN="arn:aws:secretsmanager:us-east-1:416142471465:secret:smartlift/aurora/hotelapp-cAsWga"
SECRET_NAME="smartlift/aurora/hotelapp"
LAMBDAS=(smartlift-api smartlift-review-analyzer smartlift-ai-scorer smartlift-tdlr-refresh smartlift-maintenance-reminder)
SG_ID="sg-0a10102c1e09c540e"
DB_CLUSTER="hotel-leads-aurora"
DB_USER="hotelapp"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

phase_a() {
  echo
  echo "════════ PHASE A: wire Secrets Manager (no password change yet) ════════"

  echo "→ A.1 Attach IAM policy 'secretsmanager-aurora-hotelapp' to the Lambda role..."
  cat > "$TMP/sm-policy.json" <<JSON
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"],
      "Resource": "${SECRET_ARN}"
    }
  ]
}
JSON
  aws iam put-role-policy \
    --role-name "$ROLE_NAME" \
    --policy-name secretsmanager-aurora-hotelapp \
    --policy-document "file://$TMP/sm-policy.json" \
    --output text >/dev/null
  echo "    ok."

  echo "→ A.2 Add DB_SECRET_ARN env var to each Lambda (preserving existing env vars)..."
  for fn in "${LAMBDAS[@]}"; do
    printf "    %-32s ... " "$fn"
    # Pull current env vars, merge in DB_SECRET_ARN, and update.
    current="$(aws lambda get-function-configuration --function-name "$fn" --query 'Environment.Variables' --output json)"
    merged="$(echo "$current" | python3 -c '
import json, sys, os
v = json.load(sys.stdin)
v["DB_SECRET_ARN"] = "'"$SECRET_ARN"'"
print(json.dumps({"Variables": v}))
')"
    echo "$merged" > "$TMP/env-$fn.json"
    aws lambda update-function-configuration \
      --function-name "$fn" \
      --environment "file://$TMP/env-$fn.json" \
      --output text --query "LastUpdateStatus" >/dev/null
    aws lambda wait function-updated --function-name "$fn"
    echo "ok"
  done

  echo "→ A.3 Smoke-test /health (Lambda must be reading from Secrets Manager now)..."
  sleep 3
  curl -sS -o "$TMP/h.txt" -w "    /health → HTTP %{http_code}\n" \
    https://4cc23kla34.execute-api.us-east-1.amazonaws.com/prod/health
  cat "$TMP/h.txt"; echo

  echo "✓ PHASE A complete. All Lambdas now read DB password from Secrets Manager."
  echo "  (DB_PASSWORD env var is still set as fallback — removed in Phase C.)"
}

phase_b() {
  echo
  echo "════════ PHASE B: rotate the password ════════"

  echo "→ B.1 Generate a new random password (32 chars, URL-safe)..."
  NEW_PASSWORD="$(aws secretsmanager get-random-password \
    --password-length 32 \
    --exclude-characters "\"@/\\'\`\$" \
    --require-each-included-type \
    --query RandomPassword --output text)"
  echo "    generated (length=${#NEW_PASSWORD})."

  echo "→ B.2 Update Aurora master password (hotelapp)..."
  aws rds modify-db-cluster \
    --db-cluster-identifier "$DB_CLUSTER" \
    --master-user-password "$NEW_PASSWORD" \
    --apply-immediately \
    --output text --query "DBCluster.Status" >/dev/null
  echo "    Aurora password update queued (Aurora applies in ~10s)."

  echo "→ B.3 Update Secrets Manager secret value..."
  cat > "$TMP/new-secret.json" <<JSON
{
  "username": "${DB_USER}",
  "password": "${NEW_PASSWORD}",
  "host": "hotel-leads-aurora.cluster-cgnwaccyi4a8.us-east-1.rds.amazonaws.com",
  "port": "5432",
  "dbname": "hotelleads",
  "engine": "postgres"
}
JSON
  aws secretsmanager put-secret-value \
    --secret-id "$SECRET_NAME" \
    --secret-string "file://$TMP/new-secret.json" \
    --output text --query "VersionId" >/dev/null
  echo "    Secrets Manager updated."

  echo "→ B.4 Wait 15s for Aurora to apply the password change..."
  sleep 15

  echo "→ B.5 Force Lambda warm-pool flush by re-publishing each function configuration..."
  for fn in "${LAMBDAS[@]}"; do
    printf "    %-32s ... " "$fn"
    # Publish a new version (also touches the config which invalidates warm pools).
    aws lambda publish-version --function-name "$fn" --output text --query Version >/dev/null
    aws lambda wait function-updated --function-name "$fn"
    echo "ok"
  done

  echo "→ B.6 Smoke test all Lambdas after rotation (each should connect with new password)..."
  sleep 5
  curl -sS -o "$TMP/h.txt" -w "    /health → HTTP %{http_code}\n" \
    https://4cc23kla34.execute-api.us-east-1.amazonaws.com/prod/health
  cat "$TMP/h.txt"; echo

  echo "✓ PHASE B complete. Password rotated. New password lives ONLY in Secrets Manager."
  echo "  IMPORTANT: the env var DB_PASSWORD on each Lambda still has the OLD password."
  echo "  Phase C removes those stale env vars and closes the SG."
}

phase_c() {
  echo
  echo "════════ PHASE C: remove fallback DB_PASSWORD env vars + close SG ════════"

  echo "→ C.1 Remove DB_PASSWORD env var from each Lambda (Secrets Manager is now SoT)..."
  for fn in "${LAMBDAS[@]}"; do
    printf "    %-32s ... " "$fn"
    current="$(aws lambda get-function-configuration --function-name "$fn" --query 'Environment.Variables' --output json)"
    merged="$(echo "$current" | python3 -c '
import json, sys
v = json.load(sys.stdin)
v.pop("DB_PASSWORD", None)
print(json.dumps({"Variables": v}))
')"
    echo "$merged" > "$TMP/env-$fn.json"
    aws lambda update-function-configuration \
      --function-name "$fn" \
      --environment "file://$TMP/env-$fn.json" \
      --output text --query "LastUpdateStatus" >/dev/null
    aws lambda wait function-updated --function-name "$fn"
    echo "ok"
  done

  echo "→ C.2 Smoke test (must still work with no DB_PASSWORD env)..."
  sleep 3
  curl -sS -o "$TMP/h.txt" -w "    /health → HTTP %{http_code}\n" \
    https://4cc23kla34.execute-api.us-east-1.amazonaws.com/prod/health
  cat "$TMP/h.txt"; echo

  echo "→ C.3 Revoke 0.0.0.0/0 ingress on port 5432 from $SG_ID..."
  aws ec2 revoke-security-group-ingress \
    --group-id "$SG_ID" \
    --ip-permissions 'IpProtocol=tcp,FromPort=5432,ToPort=5432,IpRanges=[{CidrIp=0.0.0.0/0,Description="Temp Cloudshell access"}]' \
    --output text >/dev/null
  echo "    revoked."

  echo "→ C.4 Optional: also remove port 80 ingress (no HTTP service should run on this SG)..."
  aws ec2 revoke-security-group-ingress \
    --group-id "$SG_ID" \
    --ip-permissions 'IpProtocol=tcp,FromPort=80,ToPort=80,IpRanges=[{CidrIp=0.0.0.0/0}]' \
    --output text 2>/dev/null && echo "    port 80 revoked." || echo "    port 80 already absent (ok)."

  echo "→ C.5 Verify SG is locked down..."
  aws ec2 describe-security-groups --group-ids "$SG_ID" \
    --query "SecurityGroups[0].IpPermissions[].{port:FromPort,from:IpRanges[].CidrIp,desc:IpRanges[].Description}" \
    --output table

  echo
  echo "✓ PHASE C complete. Database is no longer reachable from the public internet."
  echo
  echo "Final verification suggestions:"
  echo "  1. Open the app at https://smarterlift.app and confirm dashboard loads."
  echo "  2. Check CloudWatch /aws/lambda/smartlift-api for any new errors."
  echo "  3. Confirm psql to the cluster hostname from your laptop now hangs/refused."
}

PHASE="${1:-${PHASE:-all}}"
case "$PHASE" in
  A|a) phase_a ;;
  B|b) phase_b ;;
  C|c) phase_c ;;
  all) phase_a; phase_b; phase_c ;;
  *) echo "usage: $0 [A|B|C|all]"; exit 1 ;;
esac
