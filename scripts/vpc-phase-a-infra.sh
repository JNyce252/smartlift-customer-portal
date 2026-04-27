#!/usr/bin/env bash
# vpc-phase-a-infra.sh — Step 5C-redo Phase A
#
# Creates the VPC infrastructure needed to move the 5 DB-using Lambdas off the
# public internet without breaking outbound API calls (Bedrock / Hunter / PDL /
# Google Maps / SES / Secrets Manager).
#
# What this script creates (in vpc-06cec9c7bd56c515d, us-east-1):
#   1. Two new PRIVATE subnets:
#        smartlift-private-1a  172.31.96.0/20   us-east-1a
#        smartlift-private-1b  172.31.112.0/20  us-east-1b
#   2. One Elastic IP for the NAT Gateway.
#   3. One NAT Gateway in the existing PUBLIC subnet in 1a
#      (subnet-0fc3605ad04dca501).
#   4. One new route table (smartlift-private-rtb) with default route
#      0.0.0.0/0 -> NAT, associated to BOTH new private subnets.
#   5. One new security group sg-smartlift-lambda (no inbound).
#   6. One new ingress rule on the Aurora SG sg-0a10102c1e09c540e:
#        tcp/5432 from sg-smartlift-lambda
#
# It does NOT touch any Lambda function. It does NOT revoke the existing
# 0.0.0.0/0:5432 inbound. Both happen in Phases B and D.
#
# Idempotent: safe to re-run. Existing resources are detected by Name tag and
# reused. The script writes its outputs to scripts/.vpc-phase-a-state.json so
# Phase B can read them.
#
# Cost added when this completes:
#   NAT Gateway            $0.045/hr (~$32/mo) + $0.045/GB processed
#   Elastic IP (in use)    $0.00/hr (free while attached to running NAT)
#   Total flat:            ~$32/mo

set -euo pipefail

REGION="us-east-1"
VPC_ID="vpc-06cec9c7bd56c515d"
AURORA_SG="sg-0a10102c1e09c540e"
PUBLIC_1A_SUBNET="subnet-0fc3605ad04dca501"   # NAT Gateway lives here
STATE_FILE="$(cd "$(dirname "$0")" && pwd)/.vpc-phase-a-state.json"

PRIVATE_1A_CIDR="172.31.96.0/20"
PRIVATE_1B_CIDR="172.31.112.0/20"
PRIVATE_1A_NAME="smartlift-private-1a"
PRIVATE_1B_NAME="smartlift-private-1b"
RTB_NAME="smartlift-private-rtb"
LAMBDA_SG_NAME="smartlift-lambda-sg"  # EC2 disallows names with the sg- prefix
EIP_TAG="smartlift-nat-eip"
NAT_TAG="smartlift-nat-gw"

# All progress helpers write to stderr so they don't pollute command-substitution
# captures (e.g. PRIVATE_1A_ID=$(create_or_find_subnet ...)).
say()  { printf '\n\033[1;36m==>\033[0m %s\n' "$*" >&2; }
ok()   { printf '   \033[1;32m✓\033[0m %s\n' "$*" >&2; }
warn() { printf '   \033[1;33m!\033[0m %s\n' "$*" >&2; }
die()  { printf '\n\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

aws_ec2() { aws ec2 --region "$REGION" "$@"; }

# ---------- preflight ----------------------------------------------------
say "Preflight"
caller="$(aws sts get-caller-identity --query 'Arn' --output text)"
[[ "$caller" == *"nyceguy"* ]] || die "Expected IAM user nyceguy, got: $caller"
ok "Caller: $caller"

# ---------- 1. private subnets -------------------------------------------
create_or_find_subnet() {
  local name="$1" cidr="$2" az="$3"
  local existing
  existing=$(aws_ec2 describe-subnets \
    --filters "Name=vpc-id,Values=$VPC_ID" "Name=tag:Name,Values=$name" \
    --query 'Subnets[0].SubnetId' --output text)
  if [[ "$existing" != "None" && -n "$existing" ]]; then
    ok "Subnet $name already exists: $existing"
    echo "$existing"
    return
  fi
  local sid
  sid=$(aws_ec2 create-subnet \
    --vpc-id "$VPC_ID" \
    --cidr-block "$cidr" \
    --availability-zone "$az" \
    --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=$name},{Key=smartlift,Value=private}]" \
    --query 'Subnet.SubnetId' --output text)
  # Belt-and-braces: ensure no auto-assign public IP on these private subnets.
  aws_ec2 modify-subnet-attribute --subnet-id "$sid" --no-map-public-ip-on-launch
  ok "Created subnet $name: $sid ($cidr in $az)"
  echo "$sid"
}

say "Step 1/6: Private subnets"
PRIVATE_1A_ID=$(create_or_find_subnet "$PRIVATE_1A_NAME" "$PRIVATE_1A_CIDR" "us-east-1a")
PRIVATE_1B_ID=$(create_or_find_subnet "$PRIVATE_1B_NAME" "$PRIVATE_1B_CIDR" "us-east-1b")

# ---------- 2. Elastic IP -------------------------------------------------
say "Step 2/6: Elastic IP for NAT"
EIP_ALLOC_ID=$(aws_ec2 describe-addresses \
  --filters "Name=tag:Name,Values=$EIP_TAG" \
  --query 'Addresses[0].AllocationId' --output text)
if [[ "$EIP_ALLOC_ID" == "None" || -z "$EIP_ALLOC_ID" ]]; then
  EIP_ALLOC_ID=$(aws_ec2 allocate-address \
    --domain vpc \
    --tag-specifications "ResourceType=elastic-ip,Tags=[{Key=Name,Value=$EIP_TAG}]" \
    --query 'AllocationId' --output text)
  ok "Allocated EIP: $EIP_ALLOC_ID"
else
  ok "EIP already exists: $EIP_ALLOC_ID"
fi

# ---------- 3. NAT Gateway ------------------------------------------------
say "Step 3/6: NAT Gateway in $PUBLIC_1A_SUBNET"
NAT_ID=$(aws_ec2 describe-nat-gateways \
  --filter "Name=vpc-id,Values=$VPC_ID" "Name=tag:Name,Values=$NAT_TAG" "Name=state,Values=available,pending" \
  --query 'NatGateways[0].NatGatewayId' --output text)
if [[ "$NAT_ID" == "None" || -z "$NAT_ID" ]]; then
  NAT_ID=$(aws_ec2 create-nat-gateway \
    --subnet-id "$PUBLIC_1A_SUBNET" \
    --allocation-id "$EIP_ALLOC_ID" \
    --tag-specifications "ResourceType=natgateway,Tags=[{Key=Name,Value=$NAT_TAG}]" \
    --query 'NatGateway.NatGatewayId' --output text)
  ok "Created NAT Gateway: $NAT_ID (waiting for available...)"
else
  ok "NAT Gateway already exists: $NAT_ID"
fi

aws_ec2 wait nat-gateway-available --nat-gateway-ids "$NAT_ID"
ok "NAT Gateway is available"

# ---------- 4. Route table -----------------------------------------------
say "Step 4/6: Private route table + associations"
RTB_ID=$(aws_ec2 describe-route-tables \
  --filters "Name=vpc-id,Values=$VPC_ID" "Name=tag:Name,Values=$RTB_NAME" \
  --query 'RouteTables[0].RouteTableId' --output text)
if [[ "$RTB_ID" == "None" || -z "$RTB_ID" ]]; then
  RTB_ID=$(aws_ec2 create-route-table \
    --vpc-id "$VPC_ID" \
    --tag-specifications "ResourceType=route-table,Tags=[{Key=Name,Value=$RTB_NAME},{Key=smartlift,Value=private}]" \
    --query 'RouteTable.RouteTableId' --output text)
  ok "Created route table: $RTB_ID"
else
  ok "Route table already exists: $RTB_ID"
fi

# Default route -> NAT
existing_route=$(aws_ec2 describe-route-tables --route-table-ids "$RTB_ID" \
  --query 'RouteTables[0].Routes[?DestinationCidrBlock==`0.0.0.0/0`].NatGatewayId' --output text)
if [[ -z "$existing_route" || "$existing_route" == "None" ]]; then
  aws_ec2 create-route --route-table-id "$RTB_ID" \
    --destination-cidr-block "0.0.0.0/0" --nat-gateway-id "$NAT_ID" >/dev/null
  ok "Added default route 0.0.0.0/0 -> $NAT_ID"
else
  [[ "$existing_route" == "$NAT_ID" ]] || die "Existing default route on $RTB_ID points to $existing_route, not $NAT_ID. Investigate."
  ok "Default route already points to NAT"
fi

# Associate both private subnets
for sid in "$PRIVATE_1A_ID" "$PRIVATE_1B_ID"; do
  assoc=$(aws_ec2 describe-route-tables --route-table-ids "$RTB_ID" \
    --query "RouteTables[0].Associations[?SubnetId=='$sid'].RouteTableAssociationId" --output text)
  if [[ -z "$assoc" || "$assoc" == "None" ]]; then
    aws_ec2 associate-route-table --route-table-id "$RTB_ID" --subnet-id "$sid" >/dev/null
    ok "Associated $sid with $RTB_ID"
  else
    ok "$sid already associated with $RTB_ID"
  fi
done

# ---------- 5. Lambda SG --------------------------------------------------
say "Step 5/6: Lambda security group"
LAMBDA_SG_ID=$(aws_ec2 describe-security-groups \
  --filters "Name=vpc-id,Values=$VPC_ID" "Name=group-name,Values=$LAMBDA_SG_NAME" \
  --query 'SecurityGroups[0].GroupId' --output text)
if [[ "$LAMBDA_SG_ID" == "None" || -z "$LAMBDA_SG_ID" ]]; then
  LAMBDA_SG_ID=$(aws_ec2 create-security-group \
    --vpc-id "$VPC_ID" \
    --group-name "$LAMBDA_SG_NAME" \
    --description "Smartlift Lambdas - egress only, source for Aurora SG ingress" \
    --tag-specifications "ResourceType=security-group,Tags=[{Key=Name,Value=$LAMBDA_SG_NAME}]" \
    --query 'GroupId' --output text)
  ok "Created SG: $LAMBDA_SG_ID"
else
  ok "SG already exists: $LAMBDA_SG_ID"
fi
# AWS auto-creates an "all egress to 0.0.0.0/0" rule — leave it.
# No inbound rules: Lambda ENIs initiate traffic, never receive it.

# ---------- 6. Aurora SG ingress -----------------------------------------
# Two rules required:
#   tcp/5432 — Lambdas reach Aurora directly.
#   tcp/443  — Lambdas reach the Bedrock + Lambda Interface VPC endpoints,
#              whose ENIs are also attached to this SG. Without this rule the
#              Lambdas resolve bedrock-runtime.* via Private DNS to the
#              endpoint ENI's private IP and then get blocked here on 443.
add_aurora_ingress() {
  # Idempotent via AWS's own duplicate detection. Cleaner than a JMESPath
  # describe-then-decide because IpPermissions on a SG can split a "single"
  # rule across multiple permission objects depending on Description, and
  # querying that reliably is fiddly.
  local port="$1" desc="$2" out rc=0
  out=$(aws_ec2 authorize-security-group-ingress \
    --group-id "$AURORA_SG" \
    --ip-permissions "IpProtocol=tcp,FromPort=$port,ToPort=$port,UserIdGroupPairs=[{GroupId=$LAMBDA_SG_ID,Description=$desc}]" 2>&1) || rc=$?
  if [[ $rc -eq 0 ]]; then
    ok "Added ingress: $AURORA_SG <- tcp/$port from $LAMBDA_SG_ID ($desc)"
  elif echo "$out" | grep -q "InvalidPermission.Duplicate"; then
    ok "Ingress already present: $AURORA_SG <- tcp/$port from $LAMBDA_SG_ID"
  else
    die "authorize-security-group-ingress failed: $out"
  fi
}
say "Step 6/6: Aurora SG ingress (5432 + 443 from $LAMBDA_SG_ID)"
add_aurora_ingress 5432 "Lambdas via VPC"
add_aurora_ingress 443  "Lambdas to VPC endpoints (Bedrock/Lambda)"

# ---------- write state file ---------------------------------------------
cat > "$STATE_FILE" <<JSON
{
  "region": "$REGION",
  "vpc_id": "$VPC_ID",
  "private_subnets": ["$PRIVATE_1A_ID", "$PRIVATE_1B_ID"],
  "private_subnet_1a": "$PRIVATE_1A_ID",
  "private_subnet_1b": "$PRIVATE_1B_ID",
  "lambda_sg": "$LAMBDA_SG_ID",
  "aurora_sg": "$AURORA_SG",
  "nat_gateway": "$NAT_ID",
  "nat_eip_alloc": "$EIP_ALLOC_ID",
  "route_table": "$RTB_ID",
  "created_utc": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
JSON
ok "Wrote $STATE_FILE"

cat <<EOF

\033[1;32mPhase A complete.\033[0m

Next: run scripts/vpc-phase-b-lambdas.sh <lambda-name>
Order (lowest blast radius first):
  1. smartlift-tdlr-refresh        (daily cron, easy to retry)
  2. smartlift-maintenance-reminder (daily cron, easy to retry)
  3. smartlift-review-analyzer     (async, fire-and-forget)
  4. smartlift-ai-scorer           (already in VPC; switches SG + subnets)
  5. smartlift-api                 (LAST - the customer-facing one)

Verify each before moving to the next:
  aws lambda invoke --function-name <name> /tmp/out.json
  cat /tmp/out.json   # should NOT contain ETIMEDOUT or pg connection errors
EOF
