#!/usr/bin/env bash
# vpc-phase-b-lambdas.sh — Step 5C-redo Phase B
#
# Attaches one Lambda at a time to the VPC infrastructure built in Phase A:
#   SubnetIds      = [smartlift-private-1a, smartlift-private-1b]
#   SecurityGroups = [smartlift-lambda-sg]
#
# After each attach, the script waits for the function to finish updating, then
# prints a per-Lambda verification command. DO NOT proceed to the next Lambda
# until the current one verifies clean.
#
# Recommended order (lowest blast radius first):
#   1. smartlift-tdlr-refresh        (daily cron; easy to retry tomorrow)
#   2. smartlift-maintenance-reminder (daily cron; same)
#   3. smartlift-review-analyzer     (async invoke; fire-and-forget)
#   4. smartlift-ai-scorer           (already in VPC; switches SG + subnets)
#   5. smartlift-api                 (LAST — the customer-facing one)
#
# Usage:
#   ./scripts/vpc-phase-b-lambdas.sh <lambda-name>            # attach
#   ./scripts/vpc-phase-b-lambdas.sh <lambda-name> rollback   # detach (clear VpcConfig)
#   ./scripts/vpc-phase-b-lambdas.sh <lambda-name> status     # show current VpcConfig

set -euo pipefail

LAMBDA="${1:-}"
MODE="${2:-attach}"

REGION="us-east-1"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
STATE_FILE="$SCRIPT_DIR/.vpc-phase-a-state.json"

ALLOWED=(smartlift-tdlr-refresh smartlift-maintenance-reminder smartlift-review-analyzer smartlift-ai-scorer smartlift-api)

say()  { printf '\n\033[1;36m==>\033[0m %s\n' "$*" >&2; }
ok()   { printf '   \033[1;32m✓\033[0m %s\n' "$*" >&2; }
warn() { printf '   \033[1;33m!\033[0m %s\n' "$*" >&2; }
die()  { printf '\n\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

# ---------- arg / state validation ---------------------------------------
[[ -n "$LAMBDA" ]] || die "Usage: $0 <lambda-name> [attach|rollback|status]"
[[ -f "$STATE_FILE" ]] || die "State file $STATE_FILE missing — run vpc-phase-a-infra.sh first."

found=0
for n in "${ALLOWED[@]}"; do [[ "$n" == "$LAMBDA" ]] && found=1; done
if [[ $found -eq 0 ]]; then
  die "Lambda '$LAMBDA' is not in the allowed list. Allowed: ${ALLOWED[*]}"
fi

PRIV_1A=$(python3 -c "import json,sys; print(json.load(open('$STATE_FILE'))['private_subnet_1a'])")
PRIV_1B=$(python3 -c "import json,sys; print(json.load(open('$STATE_FILE'))['private_subnet_1b'])")
LAMBDA_SG=$(python3 -c "import json,sys; print(json.load(open('$STATE_FILE'))['lambda_sg'])")

[[ -n "$PRIV_1A" && -n "$PRIV_1B" && -n "$LAMBDA_SG" ]] || die "State file is missing required IDs."

# ---------- helpers -------------------------------------------------------
get_vpc_config() {
  aws lambda get-function-configuration --region "$REGION" --function-name "$LAMBDA" \
    --query "VpcConfig.{VpcId:VpcId,Subnets:SubnetIds,SGs:SecurityGroupIds}" --output json
}

print_verification() {
  case "$LAMBDA" in
    smartlift-tdlr-refresh)
      cat >&2 <<EOF

   Verify (re-runs CSV ingest — safe; idempotent on TDLR):
     aws lambda invoke --region $REGION --function-name $LAMBDA \\
       --payload '{}' --cli-binary-format raw-in-base64-out /tmp/tdlr-out.json
     cat /tmp/tdlr-out.json
   Tail logs:
     aws logs tail /aws/lambda/$LAMBDA --since 5m --follow
EOF
      ;;
    smartlift-maintenance-reminder)
      cat >&2 <<EOF

   Verify (sends real reminder emails if any are due today — usually 0).
   Safer: tail recent logs, then trigger manually only if you want a wet test:
     aws logs tail /aws/lambda/$LAMBDA --since 1h
     # Wet test (sends emails for any due reminders):
     aws lambda invoke --region $REGION --function-name $LAMBDA \\
       --payload '{}' --cli-binary-format raw-in-base64-out /tmp/maint-out.json
     cat /tmp/maint-out.json
EOF
      ;;
    smartlift-review-analyzer)
      cat >&2 <<EOF

   Verify (analyzer needs a real prospect_id; the smoke test below should
   return cleanly with "prospect not found" — that proves DB connectivity
   without re-analyzing real reviews):
     aws lambda invoke --region $REGION --function-name $LAMBDA \\
       --payload '{"prospect_id":-1}' --cli-binary-format raw-in-base64-out \\
       /tmp/rev-out.json
     cat /tmp/rev-out.json
   Real test: import a new lead via the UI (LeadSearch → Discover → Import)
   and confirm review_intelligence appears on the prospect within ~30s.
EOF
      ;;
    smartlift-ai-scorer)
      cat >&2 <<EOF

   Verify (single-prospect path is bounded — safe):
     aws lambda invoke --region $REGION --function-name $LAMBDA \\
       --payload '{"prospect_id":1}' --cli-binary-format raw-in-base64-out \\
       /tmp/scorer-out.json
     cat /tmp/scorer-out.json
   Do NOT run with empty payload — that triggers re-score-all (every prospect
   in every tenant; expensive and slow).
EOF
      ;;
    smartlift-api)
      cat >&2 <<EOF

   Verify via API Gateway (this is the customer-facing Lambda — verify NOW):
     curl -fsS https://4cc23kla34.execute-api.us-east-1.amazonaws.com/prod/health
     # → expect: {"status":"ok"} or similar; NO 502/504/timeout
   Authenticated DB read (logged-in browser):
     1. Open smarterlift.app in a browser
     2. Sign in
     3. Open DevTools → Network
     4. Hit /internal/dashboard
     5. Confirm /prospects, /work-orders, /invoices all return 2xx
   Watch for ETIMEDOUT in CloudWatch:
     aws logs tail /aws/lambda/smartlift-api --since 5m --follow
EOF
      ;;
  esac
}

# ---------- modes ---------------------------------------------------------
case "$MODE" in
  status)
    say "Current VPC config for $LAMBDA"
    get_vpc_config
    exit 0
    ;;
  attach|rollback) ;;
  *) die "Unknown mode '$MODE'. Use: attach | rollback | status" ;;
esac

# ---------- preflight -----------------------------------------------------
say "Preflight"
caller="$(aws sts get-caller-identity --query 'Arn' --output text)"
[[ "$caller" == *"nyceguy"* ]] || die "Expected IAM user nyceguy, got: $caller"
ok "Caller: $caller"

current_state="$(aws lambda get-function --region "$REGION" --function-name "$LAMBDA" \
  --query 'Configuration.LastUpdateStatus' --output text)"
[[ "$current_state" == "Successful" ]] || warn "Lambda LastUpdateStatus = $current_state (waiting may take longer)"

current_subnets="$(aws lambda get-function-configuration --region "$REGION" --function-name "$LAMBDA" \
  --query 'VpcConfig.SubnetIds' --output text || true)"
current_sgs="$(aws lambda get-function-configuration --region "$REGION" --function-name "$LAMBDA" \
  --query 'VpcConfig.SecurityGroupIds' --output text || true)"

# ---------- attach --------------------------------------------------------
if [[ "$MODE" == "attach" ]]; then
  desired_subnets_sorted="$(printf '%s\n%s\n' "$PRIV_1A" "$PRIV_1B" | sort | tr '\n' ' ')"
  current_subnets_sorted="$(echo "$current_subnets" | tr '\t' '\n' | sort | tr '\n' ' ')"

  if [[ "$current_sgs" == "$LAMBDA_SG" && "$desired_subnets_sorted" == "$current_subnets_sorted" ]]; then
    ok "$LAMBDA already on the target VPC config — nothing to do."
    print_verification
    exit 0
  fi

  say "Attaching $LAMBDA to VPC"
  ok "Subnets:        $PRIV_1A, $PRIV_1B"
  ok "SecurityGroups: $LAMBDA_SG"
  if [[ -n "$current_subnets" && "$current_subnets" != "None" ]]; then
    warn "Replacing existing VPC config: subnets=[$current_subnets] sgs=[$current_sgs]"
  fi

  # Use file:// JSON to avoid shell-quoting traps.
  payload="$(mktemp -t vpc-config.XXXXXX.json)"
  cat > "$payload" <<EOF
{"SubnetIds":["$PRIV_1A","$PRIV_1B"],"SecurityGroupIds":["$LAMBDA_SG"]}
EOF
  aws lambda update-function-configuration \
    --region "$REGION" \
    --function-name "$LAMBDA" \
    --vpc-config "file://$payload" >/dev/null
  rm -f "$payload"
  ok "update-function-configuration submitted"

  say "Waiting for $LAMBDA to finish updating (VPC ENI attach typically ~30s)"
  aws lambda wait function-updated --region "$REGION" --function-name "$LAMBDA"
  ok "Lambda updated"
fi

# ---------- rollback ------------------------------------------------------
if [[ "$MODE" == "rollback" ]]; then
  say "Rolling back $LAMBDA — clearing VpcConfig"
  payload="$(mktemp -t vpc-config.XXXXXX.json)"
  cat > "$payload" <<'EOF'
{"SubnetIds":[],"SecurityGroupIds":[]}
EOF
  aws lambda update-function-configuration \
    --region "$REGION" \
    --function-name "$LAMBDA" \
    --vpc-config "file://$payload" >/dev/null
  rm -f "$payload"
  ok "Detach submitted"

  say "Waiting for $LAMBDA to finish updating"
  aws lambda wait function-updated --region "$REGION" --function-name "$LAMBDA"
  ok "Lambda detached from VPC (now uses default Lambda networking)"
fi

# ---------- show + verify -------------------------------------------------
say "Final VPC config for $LAMBDA"
get_vpc_config
print_verification

cat >&2 <<EOF

\033[1;32mDone.\033[0m If verification is clean, run again for the next Lambda in order:
  smartlift-tdlr-refresh → smartlift-maintenance-reminder → smartlift-review-analyzer
  → smartlift-ai-scorer → smartlift-api  (last)

Then move to Phase D (revoke 0.0.0.0/0:5432 from Aurora SG).
EOF
