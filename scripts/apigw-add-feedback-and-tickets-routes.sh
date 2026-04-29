#!/usr/bin/env bash
# apigw-add-feedback-and-tickets-routes.sh
#
# Registers the feedback + cross-tenant service-request endpoints in API Gateway
# 4cc23kla34. Same pattern as apigw-add-admin-routes.sh — Cognito authorizer
# cuw6d5 + Lambda AWS_PROXY integration on smartlift-api + CORS preflight on
# every leaf, then deploy to /prod.
#
# Routes added:
#   POST   /me/feedback                      — any authed user submits feedback
#   GET    /admin/feedback                   — SuperAdmin queue (Lambda enforces)
#   PATCH  /admin/feedback/{id}              — SuperAdmin status/notes update
#   GET    /admin/service-requests           — SuperAdmin cross-tenant tickets
#
# Idempotent — re-running is safe; existing resources are skipped.

set -euo pipefail

API_ID="4cc23kla34"
AUTHORIZER_ID="cuw6d5"
STAGE="prod"
ACCOUNT_ID="416142471465"
LAMBDA_FN="smartlift-api"
LAMBDA_INTEGRATION_URI="arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:${ACCOUNT_ID}:function:${LAMBDA_FN}/invocations"

ROOT_ID=$(aws apigateway get-resources --rest-api-id "$API_ID" --limit 500 \
  --query "items[?path==\`/\`].id | [0]" --output text)

say()  { printf '\n\033[1;36m==>\033[0m %s\n' "$*" >&2; }
ok()   { printf '   \033[1;32m✓\033[0m %s\n' "$*" >&2; }
die()  { printf '\n\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

find_resource_by_path() {
  aws apigateway get-resources --rest-api-id "$API_ID" --limit 500 \
    --query "items[?path==\`$1\`].id | [0]" --output text
}

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

# Skip if the method already exists — put-method on an existing method errors out.
method_exists() {
  local resource_id="$1" http_method="$2"
  aws apigateway get-method --rest-api-id "$API_ID" --resource-id "$resource_id" \
    --http-method "$http_method" >/dev/null 2>&1
}

add_lambda_method() {
  local resource_id="$1" http_method="$2" path_label="$3"
  if method_exists "$resource_id" "$http_method"; then
    ok "  $http_method $path_label already exists — skipping"
    return
  fi
  ok "  $http_method $path_label  (Cognito + Lambda proxy)"
  aws apigateway put-method \
    --rest-api-id "$API_ID" --resource-id "$resource_id" --http-method "$http_method" \
    --authorization-type COGNITO_USER_POOLS --authorizer-id "$AUTHORIZER_ID" \
    --no-api-key-required >/dev/null
  aws apigateway put-integration \
    --rest-api-id "$API_ID" --resource-id "$resource_id" --http-method "$http_method" \
    --type AWS_PROXY --integration-http-method POST --uri "$LAMBDA_INTEGRATION_URI" >/dev/null
}

add_options_cors() {
  local resource_id="$1" path_label="$2"
  if method_exists "$resource_id" OPTIONS; then
    ok "  OPTIONS $path_label already exists — skipping"
    return
  fi
  ok "  OPTIONS $path_label  (MOCK preflight)"
  aws apigateway put-method \
    --rest-api-id "$API_ID" --resource-id "$resource_id" --http-method OPTIONS \
    --authorization-type NONE --no-api-key-required >/dev/null
  local mr_params; mr_params="$(mktemp -t mr.XXXXXX.json)"
  cat > "$mr_params" <<'EOF'
{ "method.response.header.Access-Control-Allow-Origin": false,
  "method.response.header.Access-Control-Allow-Methods": false,
  "method.response.header.Access-Control-Allow-Headers": false,
  "method.response.header.Access-Control-Allow-Credentials": false }
EOF
  aws apigateway put-method-response \
    --rest-api-id "$API_ID" --resource-id "$resource_id" --http-method OPTIONS \
    --status-code 200 --response-parameters "file://$mr_params" >/dev/null
  rm -f "$mr_params"
  local req; req="$(mktemp -t req.XXXXXX.json)"
  cat > "$req" <<'EOF'
{ "application/json": "{\"statusCode\": 200}" }
EOF
  aws apigateway put-integration \
    --rest-api-id "$API_ID" --resource-id "$resource_id" --http-method OPTIONS \
    --type MOCK --request-templates "file://$req" >/dev/null
  rm -f "$req"
  local ir; ir="$(mktemp -t ir.XXXXXX.json)"
  cat > "$ir" <<'EOF'
{ "method.response.header.Access-Control-Allow-Origin":  "'*'",
  "method.response.header.Access-Control-Allow-Methods": "'GET,POST,PATCH,DELETE,OPTIONS'",
  "method.response.header.Access-Control-Allow-Headers": "'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'",
  "method.response.header.Access-Control-Allow-Credentials": "'true'" }
EOF
  aws apigateway put-integration-response \
    --rest-api-id "$API_ID" --resource-id "$resource_id" --http-method OPTIONS \
    --status-code 200 --response-parameters "file://$ir" >/dev/null
  rm -f "$ir"
}

# ---- Preflight --------------------------------------------------------------
say "Preflight"
caller="$(aws sts get-caller-identity --query 'Arn' --output text)"
[[ "$caller" == *"nyceguy"* ]] || die "Expected IAM user nyceguy, got: $caller"
[[ -n "$ROOT_ID" && "$ROOT_ID" != "None" ]] || die "Could not resolve API root resource"
ok "Caller: $caller"
ok "API root: $ROOT_ID"

# ---- Resources --------------------------------------------------------------
# /me and /admin already exist (from earlier scripts). We only need to ensure
# /me/feedback, /admin/feedback, /admin/feedback/{id}, /admin/service-requests.
say "Step 1/3: Create resources"
ME_ID=$(find_resource_by_path "/me")
[[ -n "$ME_ID" && "$ME_ID" != "None" ]] || die "/me resource not found — run apigw-add-feature-routes.sh first"
ADMIN_ID=$(find_resource_by_path "/admin")
[[ -n "$ADMIN_ID" && "$ADMIN_ID" != "None" ]] || die "/admin resource not found — run apigw-add-admin-routes.sh first"
ok "/me resource: $ME_ID"
ok "/admin resource: $ADMIN_ID"

ME_FEEDBACK_ID=$(   ensure_child_resource "$ME_ID"           "feedback"          "/me/feedback")
ADMIN_FB_ID=$(      ensure_child_resource "$ADMIN_ID"        "feedback"          "/admin/feedback")
ADMIN_FB_ITEM_ID=$( ensure_child_resource "$ADMIN_FB_ID"     "{id}"              "/admin/feedback/{id}")
ADMIN_SR_ID=$(      ensure_child_resource "$ADMIN_ID"        "service-requests"  "/admin/service-requests")

# ---- Methods ----------------------------------------------------------------
say "Step 2/3: Configure methods"

ok "/me/feedback"
add_lambda_method "$ME_FEEDBACK_ID"   POST   /me/feedback
add_options_cors  "$ME_FEEDBACK_ID"          /me/feedback

ok "/admin/feedback"
add_lambda_method "$ADMIN_FB_ID"      GET    /admin/feedback
add_options_cors  "$ADMIN_FB_ID"             /admin/feedback

ok "/admin/feedback/{id}"
add_lambda_method "$ADMIN_FB_ITEM_ID" PATCH  /admin/feedback/{id}
add_options_cors  "$ADMIN_FB_ITEM_ID"        /admin/feedback/{id}

ok "/admin/service-requests"
add_lambda_method "$ADMIN_SR_ID"      GET    /admin/service-requests
add_options_cors  "$ADMIN_SR_ID"             /admin/service-requests

# ---- Deploy -----------------------------------------------------------------
say "Step 3/3: Deploy to /$STAGE"
aws apigateway create-deployment \
  --rest-api-id "$API_ID" --stage-name "$STAGE" \
  --description "Feedback + cross-tenant service-requests for SuperAdmin console" \
  --query "{id:id,createdDate:createdDate}" --output table

cat >&2 <<EOF

\033[1;32mDone.\033[0m The 4 endpoints are now registered:
  POST   /me/feedback                  — any authed user submits feedback (Lambda emails Jeremy via SES)
  GET    /admin/feedback                — SuperAdmin queue (status filter via ?status=open|in_review|...)
  PATCH  /admin/feedback/{id}           — SuperAdmin updates status/priority/notes
  GET    /admin/service-requests        — SuperAdmin cross-tenant ticket queue

The Lambda enforces SuperAdmin Cognito group membership on /admin/* — non-admins get 403.
EOF
