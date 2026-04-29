#!/usr/bin/env bash
# iam-update-bedrock-policy.sh
#
# Updates the smartlift-api role's inline Bedrock-InvokeModel policy to permit
# Sonnet 4.6 and Haiku 4.5 in addition to the existing Sonnet 4.5 + Opus 4.7.
#
# Why: the customer-facing AI Q&A chat handler reads CLAUDE_SONNET_MODEL env
# var (currently set to claude-sonnet-4-6) but the IAM policy only had 4.5.
# Result: chat was silently failing — the handler caught the AccessDenied,
# returned a generic "I'm sorry, I couldn't generate an answer" placeholder.
# Adds Haiku 4.5 ahead of tier-aware model selection work.
#
# Idempotent. Safe to run multiple times.

set -euo pipefail

ROLE_NAME="smartlift-api-role-zg1jcbas"
POLICY_NAME="Bedrock-InvokeModel"
POLICY_FILE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/infra/iam/bedrock-invoke-model-v2.json"

if [[ ! -f "$POLICY_FILE" ]]; then
  echo "✗ Policy file not found: $POLICY_FILE" >&2
  exit 1
fi

caller="$(aws sts get-caller-identity --query 'Arn' --output text)"
[[ "$caller" == *"nyceguy"* ]] || { echo "✗ Expected nyceguy IAM user, got: $caller" >&2; exit 1; }
echo "✓ Caller: $caller"

echo "→ Putting policy from $POLICY_FILE"
aws iam put-role-policy \
  --role-name "$ROLE_NAME" \
  --policy-name "$POLICY_NAME" \
  --policy-document "file://$POLICY_FILE"

echo "→ Verifying"
aws iam get-role-policy \
  --role-name "$ROLE_NAME" \
  --policy-name "$POLICY_NAME" \
  --query "PolicyDocument.Statement[0].Resource" \
  --output table

echo "✓ Bedrock-InvokeModel policy updated. Sonnet 4.6 + Haiku 4.5 are now invokable."
