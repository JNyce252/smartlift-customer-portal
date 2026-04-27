#!/usr/bin/env bash
# h5-drop-dead-tables.sh — closes SECURITY.md finding H-5
#
# Drops three dead tables that are not referenced from any Lambda or frontend
# code, are confirmed empty in the live DB, and have a live counterpart that
# already enforces multi-tenancy:
#
#   activities       (0 rows) → live: activity_log    (has company_id NOT NULL)
#   contacts         (0 rows) → live: prospect_contacts (37 rows)
#   service_requests (0 rows) → live: service_tickets (has company_id)
#
# Why drop instead of "add company_id NOT NULL": no code path writes to these
# tables, so adding a column adds no value and keeps the cross-tenant leak
# vector latent. Dropping eliminates the vector at the schema level.
#
# Uses the Aurora RDS Data API (HTTPS endpoint, no VPC ingress required) — the
# only way to run ad-hoc SQL now that the Aurora SG is closed (Phase D).
#
# Idempotent: the pre-flight count uses information_schema and gracefully
# handles tables already dropped. DROP TABLE IF EXISTS is used so re-runs
# don't error.

set -euo pipefail

REGION="us-east-1"
CLUSTER_ARN="arn:aws:rds:us-east-1:416142471465:cluster:hotel-leads-aurora"
SECRET_ARN="arn:aws:secretsmanager:us-east-1:416142471465:secret:smartlift/aurora/hotelapp-cAsWga"
DATABASE="hotelleads"

TABLES=(activities contacts service_requests)

say()  { printf '\n\033[1;36m==>\033[0m %s\n' "$*" >&2; }
ok()   { printf '   \033[1;32m✓\033[0m %s\n' "$*" >&2; }
warn() { printf '   \033[1;33m!\033[0m %s\n' "$*" >&2; }
die()  { printf '\n\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

run_sql() {
  local sql="$1"
  aws rds-data execute-statement \
    --region "$REGION" \
    --resource-arn "$CLUSTER_ARN" \
    --secret-arn "$SECRET_ARN" \
    --database "$DATABASE" \
    --sql "$sql"
}

# Returns the long value at records[0][0]. Errors if the response shape is
# unexpected (e.g., the DDL was rejected).
single_long() {
  local sql="$1"
  run_sql "$sql" \
    | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['records'][0][0]['longValue'])"
}

table_exists() {
  local t="$1"
  local n
  n=$(single_long "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='$t'")
  [[ "$n" == "1" ]]
}

# ---------- preflight ----------------------------------------------------
say "Preflight"
caller="$(aws sts get-caller-identity --query 'Arn' --output text)"
[[ "$caller" == *"nyceguy"* ]] || die "Expected IAM user nyceguy, got: $caller"
ok "Caller: $caller"
ok "Cluster: $CLUSTER_ARN"
ok "DB:      $DATABASE"

# ---------- row-count check ---------------------------------------------
say "Row counts (must all be 0 to proceed)"
nonzero=0
for t in "${TABLES[@]}"; do
  if ! table_exists "$t"; then
    ok "$t — already dropped"
    continue
  fi
  n=$(single_long "SELECT COUNT(*) FROM $t")
  if [[ "$n" != "0" ]]; then
    warn "$t has $n rows — NOT dropping. Investigate."
    nonzero=$((nonzero + 1))
  else
    ok "$t — 0 rows"
  fi
done
[[ $nonzero -eq 0 ]] || die "Aborting: $nonzero table(s) had rows. The premise of H-5 (these are dead) is wrong; revisit before dropping."

# ---------- drop ---------------------------------------------------------
say "Dropping tables"
for t in "${TABLES[@]}"; do
  if ! table_exists "$t"; then
    ok "$t — already gone"
    continue
  fi
  run_sql "DROP TABLE IF EXISTS $t" >/dev/null
  if table_exists "$t"; then
    die "$t still exists after DROP — investigate"
  fi
  ok "Dropped $t (and its sequence + pkey)"
done

# ---------- verify -------------------------------------------------------
say "Post-drop verification"
remaining=$(single_long "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('activities','contacts','service_requests')")
[[ "$remaining" == "0" ]] || die "Expected 0 of the three to exist post-drop; found $remaining."
ok "All three tables are gone."

cat >&2 <<EOF

\033[1;32mH-5 closed.\033[0m

Cross-tenant leak vector at schema level: removed.
Live multi-tenant counterparts (already in use):
  activity_log       — has company_id NOT NULL
  prospect_contacts  — has company_id NOT NULL (37 rows)
  service_tickets    — has company_id NOT NULL

Next: update db/schema.md (drop the 3 sections, table count 40 → 37) and
SECURITY.md to mark H-5 CLOSED.
EOF
