#!/usr/bin/env bash
# admin-bootstrap-superadmin.sh
#
# One-time bootstrap for the platform admin console:
#   1. Create the SuperAdmin Cognito group (precedence=0, above Owners=1).
#   2. Provision the platform-owner Cognito user (idempotent — skipped if exists).
#   3. Add user to SuperAdmin group.
#   4. Set MFA preference so they must enroll TOTP on first sign-in.
#
# Idempotent — safe to re-run. Existing group / user / membership are detected
# and skipped.
#
# What this does NOT do:
#   - It does NOT add a row to any DB table. SuperAdmins are platform-level
#     and intentionally have no tenant. The Lambda's getAuthContext will be
#     extended to short-circuit on SuperAdmin group membership.
#   - It does NOT enroll TOTP for you — you do that on first sign-in via the app.
#
# Usage:
#   ./scripts/admin-bootstrap-superadmin.sh [email] [temp-password]
#
# If args omitted, prompts.

set -euo pipefail

POOL_ID="us-east-1_n7bsroYdL"
GROUP_NAME="SuperAdmin"
GROUP_PRECEDENCE=0   # lower than Owners=1 → highest precedence in Cognito

ADMIN_EMAIL="${1:-}"
TEMP_PASSWORD="${2:-}"

say()  { printf '\n\033[1;36m==>\033[0m %s\n' "$*" >&2; }
ok()   { printf '   \033[1;32m✓\033[0m %s\n' "$*" >&2; }
warn() { printf '   \033[1;33m!\033[0m %s\n' "$*" >&2; }
die()  { printf '\n\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

# ---------- preflight ----------------------------------------------------
say "Preflight"
caller="$(aws sts get-caller-identity --query 'Arn' --output text)"
[[ "$caller" == *"nyceguy"* ]] || die "Expected IAM user nyceguy, got: $caller"
ok "Caller: $caller"

if [[ -z "$ADMIN_EMAIL" ]]; then
  read -r -p "Platform-admin email (the account that will own SuperAdmin): " ADMIN_EMAIL
fi
[[ "$ADMIN_EMAIL" =~ ^[^@]+@[^@]+\.[^@]+$ ]] || die "Bad email: $ADMIN_EMAIL"

if [[ -z "$TEMP_PASSWORD" ]]; then
  echo "Temporary password (you'll change it on first sign-in)."
  echo "Must be 8+ chars, with upper, lower, digit, and symbol."
  read -r -s -p "Password: " TEMP_PASSWORD; echo
  read -r -s -p "Confirm:  " CONFIRM; echo
  [[ "$TEMP_PASSWORD" == "$CONFIRM" ]] || die "Passwords do not match"
fi

# ---------- 1. SuperAdmin group ------------------------------------------
say "Step 1/4: Cognito group $GROUP_NAME"
existing=$(aws cognito-idp get-group \
  --user-pool-id "$POOL_ID" \
  --group-name "$GROUP_NAME" \
  --query 'Group.GroupName' --output text 2>/dev/null || true)
if [[ "$existing" == "$GROUP_NAME" ]]; then
  ok "Group already exists"
else
  aws cognito-idp create-group \
    --user-pool-id "$POOL_ID" \
    --group-name "$GROUP_NAME" \
    --description "Platform owners — Smarterlift staff only. Bypasses tenant scope." \
    --precedence "$GROUP_PRECEDENCE" >/dev/null
  ok "Created group SuperAdmin (precedence=$GROUP_PRECEDENCE)"
fi

# ---------- 2. Provision Cognito user ------------------------------------
say "Step 2/4: Cognito user $ADMIN_EMAIL"
user_status=$(aws cognito-idp admin-get-user \
  --user-pool-id "$POOL_ID" \
  --username "$ADMIN_EMAIL" \
  --query 'UserStatus' --output text 2>/dev/null || echo "MISSING")

if [[ "$user_status" == "MISSING" ]]; then
  aws cognito-idp admin-create-user \
    --user-pool-id "$POOL_ID" \
    --username "$ADMIN_EMAIL" \
    --user-attributes Name=email,Value="$ADMIN_EMAIL" Name=email_verified,Value=true \
    --message-action SUPPRESS \
    --temporary-password "$TEMP_PASSWORD" >/dev/null
  ok "Created Cognito user (status: FORCE_CHANGE_PASSWORD)"

  # Promote temp → permanent so they can sign in straight away with this password
  # (otherwise Cognito would force a NEW_PASSWORD_REQUIRED challenge that
  # frontend has to handle differently). They'll change it from the app.
  aws cognito-idp admin-set-user-password \
    --user-pool-id "$POOL_ID" \
    --username "$ADMIN_EMAIL" \
    --password "$TEMP_PASSWORD" \
    --permanent >/dev/null
  ok "Set permanent password (you should change it on first sign-in)"
else
  ok "User already exists (status: $user_status). Skipping create."
  warn "If you need to reset the password, run admin-set-user-password manually."
fi

# ---------- 3. Add to SuperAdmin group -----------------------------------
say "Step 3/4: Group membership"
in_group=$(aws cognito-idp admin-list-groups-for-user \
  --user-pool-id "$POOL_ID" \
  --username "$ADMIN_EMAIL" \
  --query "Groups[?GroupName=='$GROUP_NAME'].GroupName" \
  --output text)
if [[ "$in_group" == "$GROUP_NAME" ]]; then
  ok "Already in $GROUP_NAME"
else
  aws cognito-idp admin-add-user-to-group \
    --user-pool-id "$POOL_ID" \
    --username "$ADMIN_EMAIL" \
    --group-name "$GROUP_NAME" >/dev/null
  ok "Added to $GROUP_NAME"
fi

# ---------- 4. (deferred) MFA preference ---------------------------------
# Setting MFA preference here would fail because Cognito requires the user to
# have already associated a TOTP device (via associateSoftwareToken +
# verifySoftwareToken) before you can set Preferred=true. That requires a UI
# we haven't built yet. Skipping; track as a v2 follow-up.
warn "MFA preference NOT set (deferred until enrollment UI exists)."
warn "Pool is OPTIONAL-MFA, so you can sign in without TOTP for now."
warn "v2 work: enrollment UI on a /admin/profile page + handle"
warn "      authService callbacks softwareTokenMfaRequired and mfaSetup."

cat >&2 <<EOF

\033[1;32mDone.\033[0m

Summary:
  • Group SuperAdmin (precedence=0) exists
  • $ADMIN_EMAIL provisioned in $POOL_ID
  • Membership: SuperAdmin
  • MFA: optional (deferred — see warnings above)

Next steps for you:
  1. Wait for the next deploy (Lambda /admin endpoints + frontend admin pages).
  2. Sign in at smarterlift.app with your email + temp password.
  3. You'll land on /admin/dashboard.
  4. Change your password from a profile page once one exists (or via
     admin-set-user-password if you want to do it now via CLI).
EOF
