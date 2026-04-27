#!/usr/bin/env bash
# One-off fix: the OPTIONS preflight on /proposals returns 500 because the MOCK
# integration's requestTemplates and integration-response responseParameters
# didn't persist when set via the AWS MCP earlier. Set them correctly via local CLI.
set -euo pipefail

API_ID="4cc23kla34"
RESOURCE_ID="116dd5"
STAGE="prod"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# 1. requestTemplates — passed as JSON map via file://
cat > "$TMP/req-templates.json" <<'JSON'
{"application/json": "{\"statusCode\": 200}"}
JSON

echo "→ Updating MOCK integration request template..."
aws apigateway put-integration \
  --rest-api-id "$API_ID" \
  --resource-id "$RESOURCE_ID" \
  --http-method OPTIONS \
  --type MOCK \
  --request-templates "file://$TMP/req-templates.json" \
  --output text >/dev/null

# 2. responseParameters — also passed as JSON via file://
cat > "$TMP/resp-params.json" <<'JSON'
{
  "method.response.header.Access-Control-Allow-Origin": "'https://smarterlift.app'",
  "method.response.header.Access-Control-Allow-Headers": "'Content-Type,Authorization'",
  "method.response.header.Access-Control-Allow-Methods": "'GET,OPTIONS'"
}
JSON

echo "→ Updating integration response with CORS headers..."
aws apigateway put-integration-response \
  --rest-api-id "$API_ID" \
  --resource-id "$RESOURCE_ID" \
  --http-method OPTIONS \
  --status-code 200 \
  --response-parameters "file://$TMP/resp-params.json" \
  --output text >/dev/null

echo "→ Deploying to stage: $STAGE"
aws apigateway create-deployment \
  --rest-api-id "$API_ID" \
  --stage-name "$STAGE" \
  --description "Fix /proposals OPTIONS preflight" \
  --query "{id:id,date:createdDate}" --output table

echo "✓ Done."
