#!/usr/bin/env bash
# h6-harden-cognito-pool.sh — closes SECURITY.md finding H-6
#
# Hardens the existing Cognito User Pool us-east-1_n7bsroYdL in place:
#
#   1. Remove the `amplify:deployment-type: sandbox` tag — closes the
#      "amplify sandbox delete" foot-gun.
#   2. Set DeletionProtection: ACTIVE — protects against accidental
#      delete-user-pool calls.
#   3. Set MfaConfiguration: OPTIONAL — users can self-enroll TOTP from
#      their profile. Forwards-compatible: easy to upgrade Owners-only-required
#      later.
#   4. Fix group precedence — currently inverted (CompanyUsers=1, Owners=10).
#      Set to Owners=1, SalesOffice=2, Technicians=3, CompanyUsers=10,
#      Customers=20.
#
# Why in-place rather than migrating to a fresh pool: every issue H-6 raised
# is correctable via existing Cognito APIs. Creating a new pool would require
# moving 5 users (with password resets), updating the API Gateway authorizer,
# and redeploying the frontend with a new client ID — all for the same end
# state. In-place is one script, zero downtime, no UX disruption.
#
# Idempotent: re-running is a no-op.

set -euo pipefail

REGION="us-east-1"
POOL_ID="us-east-1_n7bsroYdL"
POOL_ARN="arn:aws:cognito-idp:us-east-1:416142471465:userpool/$POOL_ID"

# Group → desired precedence
declare -a GROUP_PRECEDENCE=(
  "Owners=1"
  "SalesOffice=2"
  "Technicians=3"
  "CompanyUsers=10"
  "Customers=20"
)

say()  { printf '\n\033[1;36m==>\033[0m %s\n' "$*" >&2; }
ok()   { printf '   \033[1;32m✓\033[0m %s\n' "$*" >&2; }
warn() { printf '   \033[1;33m!\033[0m %s\n' "$*" >&2; }
die()  { printf '\n\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

# ---------- preflight ---------------------------------------------------
say "Preflight"
caller="$(aws sts get-caller-identity --query 'Arn' --output text)"
[[ "$caller" == *"nyceguy"* ]] || die "Expected IAM user nyceguy, got: $caller"
ok "Caller: $caller"
ok "Pool:   $POOL_ID"

# ---------- 1. untag sandbox -------------------------------------------
say "Step 1/4: Remove amplify:deployment-type sandbox tag"
existing=$(aws cognito-idp --region "$REGION" list-tags-for-resource --resource-arn "$POOL_ARN" \
  --query 'Tags."amplify:deployment-type"' --output text 2>/dev/null || echo "None")
if [[ "$existing" == "None" || -z "$existing" ]]; then
  ok "Tag already absent"
else
  ok "Current value: $existing — removing"
  aws cognito-idp --region "$REGION" untag-resource \
    --resource-arn "$POOL_ARN" \
    --tag-keys "amplify:deployment-type"
  ok "Tag removed"
fi

# ---------- 2. DeletionProtection ACTIVE -------------------------------
say "Step 2/4: DeletionProtection: ACTIVE"
current=$(aws cognito-idp --region "$REGION" describe-user-pool --user-pool-id "$POOL_ID" \
  --query 'UserPool.DeletionProtection' --output text)
if [[ "$current" == "ACTIVE" ]]; then
  ok "DeletionProtection already ACTIVE"
else
  ok "Current: $current — flipping to ACTIVE"
  # update-user-pool overwrites unset fields to defaults on this API. So we
  # have to pass everything through. Pipe describe-user-pool JSON through
  # python stdin (avoids bash heredoc interpolation fragility), keep only
  # the fields update-user-pool actually accepts, override DeletionProtection.
  payload="$(mktemp -t pool-update.XXXXXX.json)"
  aws cognito-idp --region "$REGION" describe-user-pool --user-pool-id "$POOL_ID" --output json \
    | python3 -c "
import json, sys
up = json.load(sys.stdin)['UserPool']
# Whitelist of fields that update-user-pool accepts; anything else (Id, Arn,
# CreationDate, etc.) gets dropped.
allowed = {'Policies','LambdaConfig','AutoVerifiedAttributes',
           'VerificationMessageTemplate','SmsAuthenticationMessage',
           'UserAttributeUpdateSettings','MfaConfiguration',
           'DeviceConfiguration','EmailConfiguration','SmsConfiguration',
           'UserPoolTags','AdminCreateUserConfig','UserPoolAddOns',
           'AccountRecoverySetting'}
out = {k: v for k, v in up.items() if k in allowed and v not in (None, {}, [])}
out['UserPoolId'] = up['Id']
out['DeletionProtection'] = 'ACTIVE'
print(json.dumps(out))
" > "$payload"
  aws cognito-idp --region "$REGION" update-user-pool \
    --cli-input-json "file://$payload" >/dev/null
  rm -f "$payload"
  ok "DeletionProtection: ACTIVE"
fi

# ---------- 3. MFA OPTIONAL --------------------------------------------
say "Step 3/4: MfaConfiguration: OPTIONAL (TOTP self-enroll)"
mfa=$(aws cognito-idp --region "$REGION" get-user-pool-mfa-config --user-pool-id "$POOL_ID" \
  --query 'MfaConfiguration' --output text)
if [[ "$mfa" == "OPTIONAL" ]]; then
  ok "MFA already OPTIONAL"
else
  ok "Current: $mfa — setting OPTIONAL with TOTP enabled"
  aws cognito-idp --region "$REGION" set-user-pool-mfa-config \
    --user-pool-id "$POOL_ID" \
    --mfa-configuration OPTIONAL \
    --software-token-mfa-configuration '{"Enabled":true}' >/dev/null
  ok "MFA: OPTIONAL (TOTP)"
fi

# ---------- 4. Group precedence -----------------------------------------
say "Step 4/4: Fix group precedence (lower = higher priority in Cognito)"
for spec in "${GROUP_PRECEDENCE[@]}"; do
  group="${spec%=*}"
  desired="${spec#*=}"
  current=$(aws cognito-idp --region "$REGION" get-group --user-pool-id "$POOL_ID" --group-name "$group" \
    --query 'Group.Precedence' --output text 2>/dev/null || echo "missing")
  if [[ "$current" == "missing" ]]; then
    warn "Group $group does not exist — skipping"
    continue
  fi
  if [[ "$current" == "$desired" ]]; then
    ok "$group: already $desired"
    continue
  fi
  aws cognito-idp --region "$REGION" update-group \
    --user-pool-id "$POOL_ID" \
    --group-name "$group" \
    --precedence "$desired" >/dev/null
  ok "$group: $current -> $desired"
done

# ---------- final state ------------------------------------------------
say "Final state"
echo >&2
aws cognito-idp --region "$REGION" describe-user-pool --user-pool-id "$POOL_ID" \
  --query 'UserPool.{Id:Id,DeletionProtection:DeletionProtection,MfaConfiguration:MfaConfiguration,Tags:UserPoolTags}' \
  --output table
echo >&2
aws cognito-idp --region "$REGION" list-groups --user-pool-id "$POOL_ID" \
  --query 'Groups[*].{Group:GroupName,Precedence:Precedence}' \
  --output table

cat >&2 <<EOF

\033[1;32mH-6 closed.\033[0m

What changed: the pool is now production-grade. No new pool, no user migration,
no frontend redeploy, no API Gateway authorizer change. The 5 users keep their
existing passwords and sessions; tokens minted before this change continue to
work until normal expiry.

Optional follow-up (later): if you want to step up to MfaConfiguration: ON
with TOTP REQUIRED for Owners only, that's a per-user opt-in flip via
admin-set-user-mfa-preference. Out of scope for tonight.
EOF
