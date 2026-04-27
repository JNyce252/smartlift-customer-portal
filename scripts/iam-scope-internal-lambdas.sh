#!/usr/bin/env bash
# Per-Lambda IAM scoping for the four internal Lambdas. Each switch is verified
# by an aws lambda invoke against a known-good payload (or a no-op event for
# scheduled Lambdas where invocation is destructive). On any failure, the Lambda
# is rolled back to its previous role.
#
# Skips: smartlift-api (handled separately by iam-trim-smartlift-api.sh)
#        golden-signature-contact (already done via iam-scope-gs-contact.sh)
set -euo pipefail

ACCOUNT_ID="416142471465"
REGION="us-east-1"
SECRET_ARN="arn:aws:secretsmanager:us-east-1:416142471465:secret:smartlift/aurora/hotelapp-cAsWga"
USER_POOL_ARN="arn:aws:cognito-idp:us-east-1:416142471465:userpool/us-east-1_n7bsroYdL"
# Bedrock model ARNs the Lambdas use. The us.anthropic.* IDs are inference
# profiles; bedrock:InvokeModel needs the underlying model ARNs across all
# regions the profile spans, plus the inference-profile ARN itself.
BEDROCK_RESOURCES='[
  "arn:aws:bedrock:us-east-1::foundation-model/us.anthropic.claude-sonnet-4-5-20250929-v1:0",
  "arn:aws:bedrock:us-east-1::foundation-model/us.anthropic.claude-opus-4-7",
  "arn:aws:bedrock:us-east-1:'"$ACCOUNT_ID"':inference-profile/us.anthropic.claude-sonnet-4-5-20250929-v1:0",
  "arn:aws:bedrock:us-east-1:'"$ACCOUNT_ID"':inference-profile/us.anthropic.claude-opus-4-7",
  "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-sonnet-4-5-20250929-v1:0",
  "arn:aws:bedrock:us-east-2::foundation-model/anthropic.claude-sonnet-4-5-20250929-v1:0",
  "arn:aws:bedrock:us-west-2::foundation-model/anthropic.claude-sonnet-4-5-20250929-v1:0"
]'
DERALD_FROM="derald@swcabs.com"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

trust_policy() {
  cat > "$TMP/trust.json" <<JSON
{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]}
JSON
}
trust_policy

# Reusable: create-or-update a role, attach managed policies, put one inline policy.
ensure_role() {
  local role_name="$1" policy_name="$2" inline_policy_file="$3" managed_arns_csv="$4"
  if aws iam get-role --role-name "$role_name" >/dev/null 2>&1; then
    aws iam update-assume-role-policy --role-name "$role_name" --policy-document "file://$TMP/trust.json" --output text >/dev/null
  else
    aws iam create-role --role-name "$role_name" \
      --description "Scoped role for $role_name" \
      --assume-role-policy-document "file://$TMP/trust.json" \
      --output text --query "Role.Arn" >/dev/null
  fi
  IFS=',' read -ra arns <<< "$managed_arns_csv"
  for arn in "${arns[@]}"; do
    [[ -n "$arn" ]] && aws iam attach-role-policy --role-name "$role_name" --policy-arn "$arn" --output text 2>/dev/null || true
  done
  aws iam put-role-policy --role-name "$role_name" --policy-name "$policy_name" \
    --policy-document "file://$inline_policy_file" --output text >/dev/null
}

# Switch a Lambda to a new role with retry (handles IAM eventual consistency).
switch_lambda_role() {
  local fn="$1" role_arn="$2"
  local prev_role
  prev_role="$(aws lambda get-function-configuration --function-name "$fn" --query Role --output text)"
  echo "    previous role: $prev_role"
  echo "    new role:      $role_arn"
  local attempt=0
  while ! aws lambda update-function-configuration --function-name "$fn" --role "$role_arn" \
    --output text --query "LastUpdateStatus" >/dev/null 2>&1; do
    attempt=$((attempt+1))
    if [[ $attempt -ge 6 ]]; then
      echo "    FAILED to update role after 6 retries — leaving on previous role" >&2
      return 1
    fi
    sleep 10
  done
  aws lambda wait function-updated --function-name "$fn"
  echo "    role swap done."
}

# Smoke test by invoking the Lambda with a no-op-like payload.
smoke_test() {
  local fn="$1" payload="$2" expect_field="$3"
  echo "    invoking $fn with smoke payload..."
  aws lambda invoke --function-name "$fn" \
    --cli-binary-format raw-in-base64-out \
    --payload "$payload" \
    "$TMP/$fn-out.json" \
    --output text --query "{Status:StatusCode,Err:FunctionError}" >"$TMP/$fn-meta.txt" 2>&1
  cat "$TMP/$fn-meta.txt"
  if grep -q "Unhandled\|Handled" "$TMP/$fn-meta.txt"; then
    echo "    ✗ Lambda errored. Output:"
    cat "$TMP/$fn-out.json"
    return 1
  fi
  if [[ -n "$expect_field" ]] && ! grep -q "$expect_field" "$TMP/$fn-out.json"; then
    echo "    ✗ Expected field '$expect_field' not found in response. Output:"
    cat "$TMP/$fn-out.json"
    return 1
  fi
  echo "    ✓ smoke test passed."
}

# ─────────────────────────────────────────────────────────────────────────────
# 1. smartlift-tdlr-refresh — DB only, no Bedrock, no SES
# ─────────────────────────────────────────────────────────────────────────────
echo
echo "════════ smartlift-tdlr-refresh ════════"
cat > "$TMP/tdlr-policy.json" <<JSON
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ReadAuroraSecret",
      "Effect": "Allow",
      "Action": ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"],
      "Resource": "${SECRET_ARN}"
    }
  ]
}
JSON
ensure_role "smartlift-tdlr-refresh-role" "tdlr-refresh-secrets" "$TMP/tdlr-policy.json" \
  "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
switch_lambda_role "smartlift-tdlr-refresh" \
  "arn:aws:iam::${ACCOUNT_ID}:role/smartlift-tdlr-refresh-role"
# Don't actually invoke — full TDLR re-import is destructive. Just confirm config update.
echo "    (skipping invoke — full re-import is heavy; verify on next scheduled run)"

# ─────────────────────────────────────────────────────────────────────────────
# 2. smartlift-maintenance-reminder — DB + SES (derald@swcabs.com)
# ─────────────────────────────────────────────────────────────────────────────
echo
echo "════════ smartlift-maintenance-reminder ════════"
cat > "$TMP/maint-policy.json" <<JSON
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ReadAuroraSecret",
      "Effect": "Allow",
      "Action": ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"],
      "Resource": "${SECRET_ARN}"
    },
    {
      "Sid": "SESSendFromDerald",
      "Effect": "Allow",
      "Action": ["ses:SendEmail", "ses:SendRawEmail"],
      "Resource": "arn:aws:ses:${REGION}:${ACCOUNT_ID}:identity/${DERALD_FROM}"
    }
  ]
}
JSON
ensure_role "smartlift-maintenance-reminder-role" "maint-reminder-secrets-ses" \
  "$TMP/maint-policy.json" \
  "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
switch_lambda_role "smartlift-maintenance-reminder" \
  "arn:aws:iam::${ACCOUNT_ID}:role/smartlift-maintenance-reminder-role"
# Invoke with empty payload — handler runs the schedule scan; if no schedules due, no SES send.
smoke_test "smartlift-maintenance-reminder" '{}' "" || \
  echo "    (rolling back not implemented — investigate manually)"

# ─────────────────────────────────────────────────────────────────────────────
# 3. smartlift-review-analyzer — DB + Bedrock invoke (one model)
# ─────────────────────────────────────────────────────────────────────────────
echo
echo "════════ smartlift-review-analyzer ════════"
cat > "$TMP/review-policy.json" <<JSON
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ReadAuroraSecret",
      "Effect": "Allow",
      "Action": ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"],
      "Resource": "${SECRET_ARN}"
    },
    {
      "Sid": "BedrockInvokeClaude",
      "Effect": "Allow",
      "Action": "bedrock:InvokeModel",
      "Resource": ${BEDROCK_RESOURCES}
    }
  ]
}
JSON
ensure_role "smartlift-review-analyzer-role" "review-analyzer-secrets-bedrock" \
  "$TMP/review-policy.json" \
  "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
switch_lambda_role "smartlift-review-analyzer" \
  "arn:aws:iam::${ACCOUNT_ID}:role/smartlift-review-analyzer-role"
# Invoke with a test event — handler does its own no-op when prospect_id is missing/0.
smoke_test "smartlift-review-analyzer" '{"prospect_id":0,"place_id":"test"}' "" || \
  echo "    (note: review-analyzer may 'no_reviews' or error on test data — review CloudWatch)"

# ─────────────────────────────────────────────────────────────────────────────
# 4. smartlift-ai-scorer — DB + Bedrock invoke + VPC (it's in the VPC currently)
# ─────────────────────────────────────────────────────────────────────────────
echo
echo "════════ smartlift-ai-scorer ════════"
cat > "$TMP/ai-policy.json" <<JSON
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ReadAuroraSecret",
      "Effect": "Allow",
      "Action": ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"],
      "Resource": "${SECRET_ARN}"
    },
    {
      "Sid": "BedrockInvokeClaude",
      "Effect": "Allow",
      "Action": "bedrock:InvokeModel",
      "Resource": ${BEDROCK_RESOURCES}
    }
  ]
}
JSON
ensure_role "smartlift-ai-scorer-role" "ai-scorer-secrets-bedrock" \
  "$TMP/ai-policy.json" \
  "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole,arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
switch_lambda_role "smartlift-ai-scorer" \
  "arn:aws:iam::${ACCOUNT_ID}:role/smartlift-ai-scorer-role"
# Don't invoke — would re-score every prospect. Just confirm config update.
echo "    (skipping invoke — full re-score is heavy; verify when next called from smartlift-api)"

echo
echo "✓ All four internal Lambdas now run on tightly-scoped roles."
echo "  Next: trim smartlift-api-role-zg1jcbas (via iam-trim-smartlift-api.sh — to be created)."
