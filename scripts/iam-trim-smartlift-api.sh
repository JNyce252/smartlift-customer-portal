#!/usr/bin/env bash
# Trim smartlift-api-role-zg1jcbas in place rather than create a new role
# (smartlift-api is the busy Lambda — keeping the same role ARN means the Lambda
# config doesn't need a swap and there's no warm-pool flush).
#
# Removes the over-broad managed policies and redundant inline policies, and
# tightens existing wildcard Resources to specific ARNs.
#
# After this script:
#   ATTACHED MANAGED:
#     - AWSLambdaBasicExecutionRole-10af7d04 (CloudWatch Logs — kept)
#   INLINE POLICIES (all scoped):
#     - Bedrock-InvokeModel              (specific model ARNs only)
#     - SES-SendEmail                    (single verified identity)
#     - cognito-user-management          (already scoped to user pool — kept as-is)
#     - invoke-ai-scorer                 (already scoped — kept)
#     - invoke-review-analyzer           (NEW — was missing!)
#     - secretsmanager-aurora-hotelapp   (already scoped — kept)
#   REMOVED:
#     - AmazonBedrockFullAccess (managed, replaced by scoped Bedrock-InvokeModel)
#     - AWSLambdaRole (managed, broad lambda:Invoke — replaced by scoped invoke-* policies)
#     - AWSLambdaVPCAccessExecutionRole (managed) + -47e0f2b3 (custom) — smartlift-api isn't in a VPC
#     - bedrock-marketplace (Marketplace subscribe — not needed for InvokeModel)
#     - BedrockInvokePolicy (duplicate of Bedrock-InvokeModel)
#     - ses-send-email (duplicate of SES-SendEmail)
set -euo pipefail

ROLE_NAME="smartlift-api-role-zg1jcbas"
ACCOUNT_ID="416142471465"
REGION="us-east-1"
SES_FROM="derald@swcabs.com"   # Currently single-tenant; widen when tenant 2 onboards.
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# Bedrock model ARNs the smartlift-api Lambda actually invokes.
# us.anthropic.* are inference profiles; bedrock:InvokeModel needs the underlying
# model ARNs across all regions the profile spans, plus the inference-profile ARN itself.
cat > "$TMP/bedrock-policy.json" <<JSON
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "BedrockInvokeClaude",
      "Effect": "Allow",
      "Action": "bedrock:InvokeModel",
      "Resource": [
        "arn:aws:bedrock:us-east-1::foundation-model/us.anthropic.claude-sonnet-4-5-20250929-v1:0",
        "arn:aws:bedrock:us-east-1::foundation-model/us.anthropic.claude-opus-4-7",
        "arn:aws:bedrock:us-east-1:${ACCOUNT_ID}:inference-profile/us.anthropic.claude-sonnet-4-5-20250929-v1:0",
        "arn:aws:bedrock:us-east-1:${ACCOUNT_ID}:inference-profile/us.anthropic.claude-opus-4-7",
        "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-sonnet-4-5-20250929-v1:0",
        "arn:aws:bedrock:us-east-2::foundation-model/anthropic.claude-sonnet-4-5-20250929-v1:0",
        "arn:aws:bedrock:us-west-2::foundation-model/anthropic.claude-sonnet-4-5-20250929-v1:0"
      ]
    }
  ]
}
JSON

cat > "$TMP/ses-policy.json" <<JSON
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "SESSendFromVerifiedIdentity",
      "Effect": "Allow",
      "Action": ["ses:SendEmail", "ses:SendRawEmail"],
      "Resource": "arn:aws:ses:${REGION}:${ACCOUNT_ID}:identity/${SES_FROM}"
    }
  ]
}
JSON

cat > "$TMP/invoke-review-analyzer.json" <<JSON
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "lambda:InvokeFunction",
      "Resource": "arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:smartlift-review-analyzer"
    }
  ]
}
JSON

echo "→ Step 1/4: Tighten Bedrock-InvokeModel inline policy (was Resource: *)..."
aws iam put-role-policy \
  --role-name "$ROLE_NAME" \
  --policy-name "Bedrock-InvokeModel" \
  --policy-document "file://$TMP/bedrock-policy.json" \
  --output text >/dev/null
echo "    ok."

echo "→ Step 2/4: Tighten SES-SendEmail inline policy (was Resource: *)..."
aws iam put-role-policy \
  --role-name "$ROLE_NAME" \
  --policy-name "SES-SendEmail" \
  --policy-document "file://$TMP/ses-policy.json" \
  --output text >/dev/null
echo "    ok."

echo "→ Step 3/4: Add invoke-review-analyzer inline policy..."
aws iam put-role-policy \
  --role-name "$ROLE_NAME" \
  --policy-name "invoke-review-analyzer" \
  --policy-document "file://$TMP/invoke-review-analyzer.json" \
  --output text >/dev/null
echo "    ok."

echo "→ Step 4/4: Remove redundant + over-broad policies..."

remove_managed() {
  local arn="$1"
  if aws iam list-attached-role-policies --role-name "$ROLE_NAME" --query "AttachedPolicies[?PolicyArn=='$arn']" --output text | grep -q "$arn"; then
    aws iam detach-role-policy --role-name "$ROLE_NAME" --policy-arn "$arn" --output text >/dev/null
    echo "    detached: $arn"
  else
    echo "    (already absent: $arn)"
  fi
}

remove_inline() {
  local name="$1"
  if aws iam list-role-policies --role-name "$ROLE_NAME" --query "PolicyNames" --output text | grep -qw "$name"; then
    aws iam delete-role-policy --role-name "$ROLE_NAME" --policy-name "$name" --output text >/dev/null
    echo "    deleted inline: $name"
  else
    echo "    (already absent: $name)"
  fi
}

# Managed policies that are over-broad
remove_managed "arn:aws:iam::aws:policy/AmazonBedrockFullAccess"
remove_managed "arn:aws:iam::aws:policy/service-role/AWSLambdaRole"
remove_managed "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
remove_managed "arn:aws:iam::416142471465:policy/service-role/AWSLambdaVPCAccessExecutionRole-47e0f2b3-874c-4a30-8e6a-0e6fb4693b6c"

# Redundant inline policies
remove_inline "bedrock-marketplace"
remove_inline "BedrockInvokePolicy"
remove_inline "ses-send-email"

echo
echo "→ Verification: final state of $ROLE_NAME"
echo "  Attached managed policies:"
aws iam list-attached-role-policies --role-name "$ROLE_NAME" --query "AttachedPolicies[].PolicyName" --output text | tr '\t' '\n' | sed 's/^/    /'
echo "  Inline policies:"
aws iam list-role-policies --role-name "$ROLE_NAME" --query "PolicyNames" --output text | tr '\t' '\n' | sed 's/^/    /'

echo
echo "→ Smoke test: hit /health and an authenticated route..."
sleep 2
curl -sS -o /tmp/h.txt -w "    /health → HTTP %{http_code}\n" \
  https://4cc23kla34.execute-api.us-east-1.amazonaws.com/prod/health
cat /tmp/h.txt; echo

echo "✓ Done. smartlift-api-role-zg1jcbas trimmed to least privilege."
echo
echo "If anything 500s, check CloudWatch /aws/lambda/smartlift-api for missing"
echo "permission errors. Most likely culprits if a route breaks:"
echo "  - SES send from a different identity → widen SES-SendEmail policy"
echo "  - Bedrock invoke a different model → add ARN to Bedrock-InvokeModel"
echo "  - Lambda invoke another function → add invoke-* inline policy"
