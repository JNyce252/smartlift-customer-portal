#!/usr/bin/env bash
# apigw-add-admin-routes.sh
#
# Registers the platform-admin endpoints in API Gateway 4cc23kla34. Same
# pattern as apigw-add-feature-routes.sh — Cognito authorizer cuw6d5 + Lambda
# AWS_PROXY integration + CORS preflight on each leaf, then deploy to /prod.
#
# Routes added:
#   GET /admin/dashboard
#   GET /admin/tenants
#   GET /admin/activity
#
# The Lambda enforces SuperAdmin Cognito group membership; API Gateway just
# requires a valid JWT. Returns 403 super_admin_required for non-admins.
#
# Idempotent.

set -euo pipefail

API_ID="4cc23kla34"
AUTHORIZER_ID="cuw6d5"
STAGE="prod"
ACCOUNT_ID="416142471465"
LAMBDA_FN="smartlift-api"
LAMBDA_INTEGRATION_URI="arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:${ACCOUNT_ID}:function:${LAMBDA_FN}/invocations"

# Find /. Root resource id is needed because /admin's parent is the API root.
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

add_lambda_method() {
  local resource_id="$1" http_method="$2" path_label="$3"
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
say "Step 1/3: Create resources"
ADMIN_ID=$(    ensure_child_resource "$ROOT_ID"  "admin"     "/admin")
DASHBOARD_ID=$(ensure_child_resource "$ADMIN_ID" "dashboard" "/admin/dashboard")
TENANTS_ID=$(  ensure_child_resource "$ADMIN_ID" "tenants"   "/admin/tenants")
ACTIVITY_ID=$( ensure_child_resource "$ADMIN_ID" "activity"  "/admin/activity")

# ---- Methods ----------------------------------------------------------------
say "Step 2/3: Configure methods"

ok "/admin/dashboard"
add_lambda_method "$DASHBOARD_ID" GET /admin/dashboard
add_options_cors  "$DASHBOARD_ID"     /admin/dashboard

ok "/admin/tenants"
add_lambda_method "$TENANTS_ID"   GET /admin/tenants
add_options_cors  "$TENANTS_ID"       /admin/tenants

ok "/admin/activity"
add_lambda_method "$ACTIVITY_ID"  GET /admin/activity
add_options_cors  "$ACTIVITY_ID"      /admin/activity

# ---- Deploy -----------------------------------------------------------------
say "Step 3/3: Deploy to /$STAGE"
aws apigateway create-deployment \
  --rest-api-id "$API_ID" --stage-name "$STAGE" \
  --description "Admin console: /admin/dashboard, /admin/tenants, /admin/activity" \
  --query "{id:id,createdDate:createdDate}" --output table

cat >&2 <<EOF

\033[1;32mDone.\033[0m The 3 admin endpoints are now registered:
  GET /admin/dashboard
  GET /admin/tenants
  GET /admin/activity

Lambda enforces SuperAdmin group membership; non-admins get 403.
EOF
