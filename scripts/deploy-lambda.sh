#!/usr/bin/env bash
# Deploy a single Smarterlift Lambda from local source.
#
# Usage:
#   ./scripts/deploy-lambda.sh smartlift-api
#   ./scripts/deploy-lambda.sh smartlift-review-analyzer
#   ./scripts/deploy-lambda.sh smartlift-tdlr-refresh
#   ./scripts/deploy-lambda.sh smartlift-ai-scorer
#   ./scripts/deploy-lambda.sh smartlift-maintenance-reminder
#   ./scripts/deploy-lambda.sh golden-signature-contact
#
# Notes:
#   - smartlift-api uses a `pg-postgres-driver` Lambda layer; no node_modules.
#   - golden-signature-contact bundles only its handler file.
#   - The other Lambdas have committed package.json + node_modules and ship them.
#
# Prerequisites:
#   - AWS CLI configured (aws sts get-caller-identity)
#   - `zip` available
#
# Exit codes:
#   0 on successful deploy, non-zero on any failure.
set -euo pipefail

NAME="${1:-}"
if [[ -z "$NAME" ]]; then
  echo "usage: $0 <lambda-function-name>" >&2
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC_DIR="$REPO_ROOT/lambda/$NAME"

if [[ ! -d "$SRC_DIR" ]]; then
  echo "error: $SRC_DIR not found" >&2
  exit 1
fi

ZIP_PATH="$(mktemp -t "${NAME}.XXXXXX").zip"
trap 'rm -f "$ZIP_PATH"' EXIT

cd "$SRC_DIR"

# Pick handler file
HANDLER_FILE=""
case "$NAME" in
  golden-signature-contact) HANDLER_FILE="gs-contact.mjs" ;;
  *)                        HANDLER_FILE="index.mjs"     ;;
esac

if [[ ! -f "$HANDLER_FILE" ]]; then
  echo "error: handler $HANDLER_FILE not found in $SRC_DIR" >&2
  exit 1
fi

# Build zip. If node_modules is committed, include it; otherwise just the handler
# plus any small data files in the directory (e.g. rds-ca.pem for SSL validation).
if [[ -d "node_modules" ]]; then
  echo "→ Zipping handler + node_modules (excluding dev junk)..."
  zip -qr "$ZIP_PATH" "$HANDLER_FILE" package.json node_modules \
    -x "node_modules/*/test/*" \
    -x "node_modules/*/tests/*" \
    -x "node_modules/*/.github/*" \
    -x "node_modules/*/*.md" \
    -x "*.DS_Store"
  # Include extra .pem and .mjs siblings (e.g. rds-ca.pem) without double-zipping the handler.
  for f in *.pem *.mjs; do
    [[ -f "$f" && "$f" != "$HANDLER_FILE" ]] && zip -qg "$ZIP_PATH" "$f"
  done
else
  echo "→ Zipping handler + sibling data files (Lambda uses layer for deps)..."
  EXTRA_FILES=()
  for f in *.pem *.mjs; do
    [[ -f "$f" && "$f" != "$HANDLER_FILE" ]] && EXTRA_FILES+=("$f")
  done
  zip -qj "$ZIP_PATH" "$HANDLER_FILE" "${EXTRA_FILES[@]}"
fi

SIZE_BYTES="$(stat -f%z "$ZIP_PATH" 2>/dev/null || stat -c%s "$ZIP_PATH")"
echo "→ Zip: $ZIP_PATH ($SIZE_BYTES bytes)"

echo "→ Uploading to AWS Lambda: $NAME"
aws lambda update-function-code \
  --function-name "$NAME" \
  --zip-file "fileb://$ZIP_PATH" \
  --query "{Status:LastUpdateStatus,SHA:CodeSha256,Last:LastModified,Size:CodeSize}" \
  --output table

echo "→ Waiting for function to settle..."
aws lambda wait function-updated --function-name "$NAME"

echo "✓ Deployed $NAME"
