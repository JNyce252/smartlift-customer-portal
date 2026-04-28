#!/usr/bin/env bash
# apigw-add-feature-routes.sh
#
# Registers the 5 new feature endpoints from this session in API Gateway
# 4cc23kla34, attaches the Cognito authorizer cuw6d5, configures CORS preflight,
# and deploys to /prod. Without this, the Lambda code is live but the gateway
# returns 403 "Missing Authentication Token" because it has no resource for
# the path.
#
# Routes added:
#   GET  /me/compliance                       (B1+B2)
#   GET  /me/calendar.ics                     (O2)
#   POST /me/chat                             (A2)
#   GET  /me/elevator/{id}/insights           (A1)
#   GET  /me/elevator/{id}/timeline           (O1)
#
# Idempotent — `put-method` and `put-integration` overwrite. Resource creation
# checks for existing path before creating.

set -euo pipefail

API_ID="4cc23kla34"
AUTHORIZER_ID="cuw6d5"
STAGE="prod"
ACCOUNT_ID="416142471465"
LAMBDA_FN="smartlift-api"
LAMBDA_INTEGRATION_URI="arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:${ACCOUNT_ID}:function:${LAMBDA_FN}/invocations"
ME_ID="swo0u6"   # /me — verified resource ID

say()  { printf '\n\033[1;36m==>\033[0m %s\n' "$*" >&2; }
ok()   { printf '   \033[1;32m✓\033[0m %s\n' "$*" >&2; }
warn() { printf '   \033[1;33m!\033[0m %s\n' "$*" >&2; }
die()  { printf '\n\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

# ---- Helpers ----------------------------------------------------------------

# Find a resource by exact path; print id or empty.
find_resource_by_path() {
  local path="$1"
  aws apigateway get-resources --rest-api-id "$API_ID" --limit 500 \
    --query "items[?path==\`$path\`].id | [0]" --output text
}

# Ensure a child resource exists under parent. Echo its id.
ensure_child_resource() {
  local parent_id="$1" path_part="$2" full_path="$3"
  local existing
  existing=$(find_resource_by_path "$full_path")
  if [[ -n "$existing" && "$existing" != "None" ]]; then
    ok "Resource $full_path already exists: $existing"
    echo "$existing"; return
  fi
  local new_id
  new_id=$(aws apigateway create-resource \
    --rest-api-id "$API_ID" \
    --parent-id "$parent_id" \
    --path-part "$path_part" \
    --query 'id' --output text)
  ok "Created resource $full_path: $new_id"
  echo "$new_id"
}

# Add a Lambda-backed method (GET/POST/PATCH/...) with Cognito authorizer.
# Idempotent — uses put-* which overwrites existing config.
add_lambda_method() {
  local resource_id="$1" http_method="$2" path_label="$3"
  ok "  $http_method $path_label  (Cognito + Lambda proxy)"
  aws apigateway put-method \
    --rest-api-id "$API_ID" \
    --resource-id "$resource_id" \
    --http-method "$http_method" \
    --authorization-type COGNITO_USER_POOLS \
    --authorizer-id "$AUTHORIZER_ID" \
    --no-api-key-required >/dev/null
  aws apigateway put-integration \
    --rest-api-id "$API_ID" \
    --resource-id "$resource_id" \
    --http-method "$http_method" \
    --type AWS_PROXY \
    --integration-http-method POST \
    --uri "$LAMBDA_INTEGRATION_URI" >/dev/null
}

# Add OPTIONS preflight (MOCK integration). CORS headers are echoed from the
# integration response — matches the existing pattern on this API.
add_options_cors() {
  local resource_id="$1" path_label="$2"
  ok "  OPTIONS $path_label  (MOCK preflight)"

  # Method (no auth — OPTIONS preflight must be public)
  aws apigateway put-method \
    --rest-api-id "$API_ID" \
    --resource-id "$resource_id" \
    --http-method OPTIONS \
    --authorization-type NONE \
    --no-api-key-required >/dev/null

  # Method response — declares which response headers we'll send back
  local mr_params
  mr_params="$(mktemp -t mr-params.XXXXXX.json)"
  cat > "$mr_params" <<'EOF'
{
  "method.response.header.Access-Control-Allow-Origin": false,
  "method.response.header.Access-Control-Allow-Methods": false,
  "method.response.header.Access-Control-Allow-Headers": false,
  "method.response.header.Access-Control-Allow-Credentials": false
}
EOF
  aws apigateway put-method-response \
    --rest-api-id "$API_ID" \
    --resource-id "$resource_id" \
    --http-method OPTIONS \
    --status-code 200 \
    --response-parameters "file://$mr_params" >/dev/null
  rm -f "$mr_params"

  # MOCK integration that returns 200 immediately
  local req_tmpl
  req_tmpl="$(mktemp -t req-tmpl.XXXXXX.json)"
  cat > "$req_tmpl" <<'EOF'
{ "application/json": "{\"statusCode\": 200}" }
EOF
  aws apigateway put-integration \
    --rest-api-id "$API_ID" \
    --resource-id "$resource_id" \
    --http-method OPTIONS \
    --type MOCK \
    --request-templates "file://$req_tmpl" >/dev/null
  rm -f "$req_tmpl"

  # Integration response — emits the actual CORS values
  local ir_params
  ir_params="$(mktemp -t ir-params.XXXXXX.json)"
  cat > "$ir_params" <<'EOF'
{
  "method.response.header.Access-Control-Allow-Origin":  "'*'",
  "method.response.header.Access-Control-Allow-Methods": "'GET,POST,PATCH,DELETE,OPTIONS'",
  "method.response.header.Access-Control-Allow-Headers": "'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'",
  "method.response.header.Access-Control-Allow-Credentials": "'true'"
}
EOF
  aws apigateway put-integration-response \
    --rest-api-id "$API_ID" \
    --resource-id "$resource_id" \
    --http-method OPTIONS \
    --status-code 200 \
    --response-parameters "file://$ir_params" >/dev/null
  rm -f "$ir_params"
}

# ---- Preflight --------------------------------------------------------------
say "Preflight"
caller="$(aws sts get-caller-identity --query 'Arn' --output text)"
[[ "$caller" == *"nyceguy"* ]] || die "Expected IAM user nyceguy, got: $caller"
ok "Caller: $caller"
ok "API:    $API_ID"
ok "Stage:  $STAGE"

# ---- Build the resource tree -----------------------------------------------
say "Step 1/3: Create resources"

COMPLIANCE_ID=$(ensure_child_resource "$ME_ID" "compliance"     "/me/compliance")
CALENDAR_ID=$(  ensure_child_resource "$ME_ID" "calendar.ics"   "/me/calendar.ics")
CHAT_ID=$(      ensure_child_resource "$ME_ID" "chat"           "/me/chat")

ELEVATOR_ID=$(  ensure_child_resource "$ME_ID"     "elevator"   "/me/elevator")
ELEVATOR_X_ID=$(ensure_child_resource "$ELEVATOR_ID" "{id}"     "/me/elevator/{id}")
INSIGHTS_ID=$(  ensure_child_resource "$ELEVATOR_X_ID" "insights" "/me/elevator/{id}/insights")
TIMELINE_ID=$(  ensure_child_resource "$ELEVATOR_X_ID" "timeline" "/me/elevator/{id}/timeline")

# ---- Configure methods ------------------------------------------------------
say "Step 2/3: Configure methods (Lambda integration + Cognito auth + CORS preflight)"

ok "Route /me/compliance"
add_lambda_method "$COMPLIANCE_ID" GET    /me/compliance
add_options_cors  "$COMPLIANCE_ID"        /me/compliance

ok "Route /me/calendar.ics"
add_lambda_method "$CALENDAR_ID"   GET    /me/calendar.ics
add_options_cors  "$CALENDAR_ID"          /me/calendar.ics

ok "Route /me/chat"
add_lambda_method "$CHAT_ID"       POST   /me/chat
add_options_cors  "$CHAT_ID"              /me/chat

ok "Route /me/elevator/{id}/insights"
add_lambda_method "$INSIGHTS_ID"   GET    /me/elevator/{id}/insights
add_options_cors  "$INSIGHTS_ID"          /me/elevator/{id}/insights

ok "Route /me/elevator/{id}/timeline"
add_lambda_method "$TIMELINE_ID"   GET    /me/elevator/{id}/timeline
add_options_cors  "$TIMELINE_ID"          /me/elevator/{id}/timeline

# ---- Deploy -----------------------------------------------------------------
say "Step 3/3: Deploy to /$STAGE"
aws apigateway create-deployment \
  --rest-api-id "$API_ID" \
  --stage-name "$STAGE" \
  --description "Add B1+B2 / A1 / A2 / O1 / O2 customer-portal feature routes" \
  --query "{id:id,createdDate:createdDate}" --output table

cat >&2 <<EOF

\033[1;32mDone.\033[0m The 5 new endpoints are now registered:
  GET  /me/compliance
  GET  /me/calendar.ics
  POST /me/chat
  GET  /me/elevator/{id}/insights
  GET  /me/elevator/{id}/timeline

Reload the customer dashboard at smarterlift.app/customer/dashboard and the
Compliance widget, Calendar button, Ask Smarterlift hero, and AI insights
panels should now render with live data.
EOF
