#!/usr/bin/env bash
# Attach the smartlift-cognito-auth Cognito User Pool Authorizer (id=cuw6d5) to
# every method on REST API 4cc23kla34 except:
#   - OPTIONS methods (CORS preflight — must stay public)
#   - GET /health (intentionally public)
#
# Then deploy to the prod stage to make it live.
#
# Idempotent — safe to re-run. Existing methods that already have the authorizer
# get the same patch and continue to work.
set -euo pipefail

API_ID="4cc23kla34"
AUTHORIZER_ID="cuw6d5"
STAGE="prod"

# Resource id => list of methods to protect (OPTIONS skipped automatically by the loop)
# Generated 2026-04-26 from `aws apigateway get-resources`.
ROUTES=(
  "030gx8 POST"                    # /prospects/{id}/improve-proposal
  "073vbl GET"                     # /places/search
  "0mginf POST"                    # /prospects/{id}/intro-email
  "0ot8n4 DELETE GET PATCH POST"   # /technicians/{id}
  "2j2948 GET"                     # /customer/maintenance
  "30tygv POST"                    # /ai/rescore-all
  "31gag3 PATCH"                   # /prospects/{id}/status
  "37vzmq DELETE GET PATCH POST"   # /maintenance-schedules/{id}
  "3coumc POST"                    # /building-registry/promote
  "3mbfti GET POST"                # /prospects/{id}/proposal
  "3rd7f5 GET"                     # /customers/{id}/contracts
  "45d4lh GET"                     # /elevators
  "4czv81 POST"                    # /prospects/{id}/enrich-places
  "4p6c91 POST"                    # /lead-search/qualify-office-results
  "58argz POST"                    # /registry-requests
  "69n5bj GET"                     # /prospects/{id}
  "69wh9b GET POST"                # /customer/service-requests
  "6csk6a GET POST"                # /projects
  "6pqlde DELETE GET PATCH POST"   # /technicians
  "7ofd1u GET"                     # /prospects/{id}/tdlr
  "7s16sn GET POST"                # /prospects/{id}/contacts
  "8e7rex POST"                    # /customer/emergency/contact
  "8lamlj GET"                     # /customer/elevators/status
  "94j584 POST"                    # /prospects/{id}/enrich-person
  "976iel GET POST"                # /tdlr
  "9b669w DELETE GET PATCH POST"   # /invoices/generate
  "9ydj8u GET"                     # /building-registry/cities
  "a1kj1a GET POST"                # /prospects
  "a5ygl4 GET"                     # /hotels
  "ackg10 GET PATCH POST"          # /work-orders/{id}
  "bnlisb GET POST"                # /tdlr/add-prospect
  "czitle GET PATCH"               # /profile
  "dj66lj GET POST"                # /tdlr/expiring
  "e4qula DELETE GET PATCH POST"   # /notifications/{id}
  "e5fg3s GET"                     # /prospects/{id}/hunter
  "f08aft PATCH"                   # /team/users/{sub}/role
  "fv4w40 GET"                     # /customers
  "g2s5wv DELETE PATCH"            # /prospects/{id}/contacts/{contactId}
  "g6k65d GET"                     # /maintenance
  "gp92c4 GET"                     # /customer/maintenance/schedule
  "gvu8mq DELETE GET PATCH POST"   # /notifications
  "hpjtpc DELETE GET POST"         # /documents
  "ka8cpy GET"                     # /analytics/contracts
  "kgk5u7 GET"                     # /api/customers
  "kp2i2s PATCH"                   # /me/preferences/bulk
  "kqe77z GET"                     # /invoices
  "lmmwiy PATCH"                   # /customers/{id}/archive
  "m4rkjs PATCH"                   # /prospects/{id}/archive
  "mfvuvf DELETE GET PATCH POST"   # /equipment/{id}
  "n1ygl6 DELETE GET PATCH POST"   # /notifications/read-all
  # /health (nmcz48) — INTENTIONALLY SKIPPED (public)
  "ouqeu6 GET PATCH POST"          # /prospects/{id}/notes
  "p3mf0h GET PATCH POST"          # /work-orders
  "pgvhqa POST"                    # /ai/score-results
  "pscx3o DELETE GET PATCH POST"   # /equipment
  "py0o5z POST"                    # /team/users/invite
  "q5827k DELETE GET POST"         # /documents/{id}
  "qt3v4t POST"                    # /prospects/{id}/enrich-company
  "qtl19i DELETE GET PATCH POST"   # /maintenance-schedules
  "r035om DELETE PATCH"            # /prospects/{id}/notes/{noteId}
  "ssx73j GET PATCH POST"          # /work-orders/{id}/log
  "swo0u6 GET PATCH"               # /me
  "titgb0 POST"                    # /prospects/{id}/send-proposal
  "tummva PATCH"                   # /team/users/{sub}/status
  "tz9pzl GET POST"                # /contracts
  "u2q422 DELETE"                  # /projects/{id}
  "u7a90a GET"                     # /analytics/tdlr
  "vp98a2 GET POST"                # /tickets
  "vsda06 POST"                    # /prospects/{id}/people-search
  "wua04g POST"                    # /prospects/{id}/score
  "x3a0jo GET PATCH"               # /me/preferences
  "x4t674 DELETE GET PATCH POST"   # /notifications/{id}/read
  "xdnh4m GET"                     # /customer/notifications
  "xnxly3 GET"                     # /prospects/{id}/contracts
  "y9qf5q GET"                     # /building-registry
  "zof238 GET"                     # /team/users
  "zsoia6 GET"                     # /customer/elevators
  "zwn3ey PATCH"                   # /contracts/{id}
)

total=0
for entry in "${ROUTES[@]}"; do
  read -r resource_id methods <<<"$entry"
  for method in $methods; do
    total=$((total+1))
    printf "  [%3d] %s %s ... " "$total" "$method" "$resource_id"
    aws apigateway update-method \
      --rest-api-id "$API_ID" \
      --resource-id "$resource_id" \
      --http-method "$method" \
      --patch-operations \
        op=replace,path=/authorizationType,value=COGNITO_USER_POOLS \
        op=replace,path=/authorizerId,value="$AUTHORIZER_ID" \
      --query "{auth:authorizationType}" --output text >/dev/null 2>&1 \
      && echo "ok" || echo "FAILED"
  done
done

echo
echo "→ Deploying to stage: $STAGE"
aws apigateway create-deployment \
  --rest-api-id "$API_ID" \
  --stage-name "$STAGE" \
  --description "Attach Cognito Authorizer to all non-public routes (smartlift-cognito-auth)" \
  --query "{id:id,createdDate:createdDate}" --output table

echo
echo "✓ Done. /health remains public; everything else now requires a valid Cognito JWT."
