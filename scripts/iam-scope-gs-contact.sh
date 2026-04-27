#!/usr/bin/env bash
# Create a tightly-scoped IAM role for golden-signature-contact and switch the
# Lambda to use it.
#
# The contact form is the ONLY Lambda exposed publicly (no Cognito Authorizer).
# It currently shares smartlift-api-role-zg1jcbas which has:
#   - AmazonBedrockFullAccess (managed)
#   - cognito-idp:Admin* on the user pool
#   - ses:SendEmail/SendRawEmail on *
#   - lambda:InvokeFunction *
#   - secretsmanager:GetSecretValue on the Aurora secret
#   - VPC + basic execution
# RCE in this Lambda = account takeover. This script gives it ONLY:
#   - bedrock:InvokeModel on one specific model ARN
#   - ses:SendEmail/SendRawEmail constrained to one verified identity
#   - basic Lambda execution (CloudWatch Logs)
# No Cognito admin, no Lambda invoke, no Secrets Manager, no VPC, no DB.
set -euo pipefail

ROLE_NAME="golden-signature-contact-role"
LAMBDA_NAME="golden-signature-contact"
ACCOUNT_ID="416142471465"
REGION="us-east-1"
# Verified SES identity used as the email From address. Must already be verified in SES.
FROM_EMAIL="nyceguy252@gmail.com"
# Bedrock model the contact form uses (matches lambda/golden-signature-contact/gs-contact.mjs).
MODEL_ARN="arn:aws:bedrock:${REGION}::foundation-model/us.anthropic.claude-sonnet-4-5-20250929-v1:0"
# Inference profile (us.anthropic.* is a profile, the underlying model needs a separate ARN).
INFERENCE_PROFILE_ARN="arn:aws:bedrock:${REGION}:${ACCOUNT_ID}:inference-profile/us.anthropic.claude-sonnet-4-5-20250929-v1:0"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# Trust policy — only Lambda can assume the role.
cat > "$TMP/trust.json" <<JSON
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Service": "lambda.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }
  ]
}
JSON

# Inline policy — minimum permissions to do the job.
cat > "$TMP/inline.json" <<JSON
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "BedrockInvokeOneModel",
      "Effect": "Allow",
      "Action": "bedrock:InvokeModel",
      "Resource": [
        "${MODEL_ARN}",
        "${INFERENCE_PROFILE_ARN}",
        "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-sonnet-4-5-20250929-v1:0",
        "arn:aws:bedrock:us-east-2::foundation-model/anthropic.claude-sonnet-4-5-20250929-v1:0",
        "arn:aws:bedrock:us-west-2::foundation-model/anthropic.claude-sonnet-4-5-20250929-v1:0"
      ]
    },
    {
      "Sid": "SESSendFromVerifiedIdentity",
      "Effect": "Allow",
      "Action": ["ses:SendEmail", "ses:SendRawEmail"],
      "Resource": "arn:aws:ses:${REGION}:${ACCOUNT_ID}:identity/${FROM_EMAIL}"
    }
  ]
}
JSON

echo "→ Step 1/4: Create role '$ROLE_NAME' (or skip if it exists)..."
if aws iam get-role --role-name "$ROLE_NAME" >/dev/null 2>&1; then
  echo "    Role already exists. Updating trust policy to current."
  aws iam update-assume-role-policy \
    --role-name "$ROLE_NAME" \
    --policy-document "file://$TMP/trust.json" \
    --output text >/dev/null
else
  aws iam create-role \
    --role-name "$ROLE_NAME" \
    --description "Scoped role for golden-signature-contact Lambda - Bedrock invoke + SES send only." \
    --assume-role-policy-document "file://$TMP/trust.json" \
    --output text --query "Role.Arn"
fi

echo "→ Step 2/4: Attach AWSLambdaBasicExecutionRole (managed) for CloudWatch Logs..."
aws iam attach-role-policy \
  --role-name "$ROLE_NAME" \
  --policy-arn "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole" \
  --output text 2>/dev/null || true

echo "→ Step 3/4: Put inline policy 'gs-contact-bedrock-ses'..."
aws iam put-role-policy \
  --role-name "$ROLE_NAME" \
  --policy-name "gs-contact-bedrock-ses" \
  --policy-document "file://$TMP/inline.json" \
  --output text >/dev/null

ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/${ROLE_NAME}"

echo "→ Step 4/4: Update Lambda '$LAMBDA_NAME' to use the new role..."
echo "    (this triggers a config update which flushes the warm pool)"
# IAM is eventually consistent — a freshly created role can take 5-30s to be
# visible to the Lambda service principal. Retry up to 6 times (~60s total).
attempt=0
while ! aws lambda update-function-configuration \
  --function-name "$LAMBDA_NAME" \
  --role "$ROLE_ARN" \
  --output text --query "LastUpdateStatus" >/dev/null 2>&1; do
  attempt=$((attempt+1))
  if [[ $attempt -ge 6 ]]; then
    echo "    FAILED after 6 retries. Run the script again in a minute."
    exit 1
  fi
  echo "    role not yet assumable by Lambda; waiting 10s (attempt $attempt/6)..."
  sleep 10
done
aws lambda wait function-updated --function-name "$LAMBDA_NAME"

echo
echo "✓ Done. golden-signature-contact now uses '$ROLE_NAME'."
echo "  Verify with a test POST:"
echo
echo "  curl -sS -X POST -H \"Content-Type: application/json\" -H \"Origin: https://thegoldensignature.com\" \\"
echo "    https://aup3wz6azh.execute-api.us-east-1.amazonaws.com/prod/contact \\"
echo "    -d '{\"name\":\"IAM Test\",\"email\":\"jeremy@thegoldensignature.com\",\"message\":\"role split smoke test\",\"type\":\"project_intake\"}'"
echo
echo "  Expected: {\"success\":true} and you receive the email."
