#!/usr/bin/env bash
# vpc-phase-b0-iam-vpc.sh — Phase B prerequisite
#
# Attaches the AWS-managed AWSLambdaVPCAccessExecutionRole policy to the four
# per-Lambda execution roles that don't already have it. Without this policy
# the Lambda service can't create the ENI it needs to attach to the VPC, so
# update-function-configuration with --vpc-config fails with:
#   "The provided execution role does not have permissions to call
#    CreateNetworkInterface on EC2"
#
# smartlift-ai-scorer-role already has the policy (the Lambda has been in the
# VPC since before the per-Lambda role split); skipped.
#
# Idempotent: attach-role-policy is a no-op if the policy is already attached
# (returns success either way).

set -euo pipefail

POLICY_ARN="arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"

ROLES=(
  smartlift-tdlr-refresh-role
  smartlift-maintenance-reminder-role
  smartlift-review-analyzer-role
  smartlift-api-role-zg1jcbas
)

say()  { printf '\n\033[1;36m==>\033[0m %s\n' "$*" >&2; }
ok()   { printf '   \033[1;32m✓\033[0m %s\n' "$*" >&2; }
die()  { printf '\n\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

say "Preflight"
caller="$(aws sts get-caller-identity --query 'Arn' --output text)"
[[ "$caller" == *"nyceguy"* ]] || die "Expected IAM user nyceguy, got: $caller"
ok "Caller: $caller"

for role in "${ROLES[@]}"; do
  say "Attaching $POLICY_ARN to $role"
  already=$(aws iam list-attached-role-policies --role-name "$role" \
    --query "AttachedPolicies[?PolicyArn=='$POLICY_ARN'].PolicyArn" --output text)
  if [[ -n "$already" && "$already" != "None" ]]; then
    ok "Already attached"
    continue
  fi
  aws iam attach-role-policy --role-name "$role" --policy-arn "$POLICY_ARN"
  ok "Attached"
done

cat >&2 <<EOF

\033[1;32mDone.\033[0m IAM propagation is usually instant for attach-role-policy,
but Lambda may cache the role evaluation for a few seconds. If the next
update-function-configuration still says "no CreateNetworkInterface
permission", wait 10s and re-run.

Next: ./scripts/vpc-phase-b-lambdas.sh smartlift-tdlr-refresh
EOF
