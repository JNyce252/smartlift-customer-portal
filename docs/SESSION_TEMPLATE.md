# Smarterlift — Session Start Template

Paste the block below into a new Claude conversation to skip 30 minutes of re-exploration. It points Claude at the artifacts already on disk so it doesn't re-pull them. Update the **"Where I left off"** section before pasting.

---

## Copy from here ↓

I'm continuing work on **Smarterlift** (smarterlift.app), my AI-powered lead-gen + CRM SaaS for elevator service companies. Built by The Golden Signature LLC. Founding customer: Southwest Cabs Elevator Services (Texas).

You've already done deep work on this project in prior sessions. Don't rediscover; **read these files first** in order, then ask me what to work on:

1. `~/Documents/smartlift-customer-portal/docs/ARCHITECTURE.md` — full architecture map (frontend, 6 Lambdas, API Gateway, Aurora, Cognito, schema). Verified facts.
2. `~/Documents/smartlift-customer-portal/docs/SECURITY.md` — severity-ranked findings (5 CRITICAL, 8 HIGH, 10 MEDIUM, 10 LOW) with file:line citations. State of each is tracked at the top. After H-5+H-6+M-8a closure: 5/5 + 8/8 + 6/10 + 4/10.
3. `~/Documents/smartlift-customer-portal/docs/CUSTOMER_PORTAL_REVIEW.md` — customer-portal-specific audit (3 HIGH, 9 MEDIUM, 10 LOW). All findings file:line-grounded.
4. `~/Documents/smartlift-customer-portal/db/schema.md` — live introspection of the `hotelleads` Aurora DB (37 tables after H-5 cleanup, columns, row counts, multi-tenancy audit).
5. `~/Documents/smartlift-customer-portal/infra/` — saved AWS configs as JSON (Cognito, Aurora SG, IAM role, Lambda env vars).
6. `~/Documents/smartlift-customer-portal/lambda/` — local mirror of all 6 deployed Lambdas (`smartlift-api` is the 2,200-LOC monolith).
7. `~/Documents/smartlift-customer-portal/scripts/` — orchestration scripts: `deploy-lambda.sh`, `attach-cognito-authorizer.sh`, `rotate-db-password.sh`, `h5-drop-dead-tables.sh`, `h6-harden-cognito-pool.sh`, `vpc-phase-{a,b0,b,d}-*.sh`.

> **Note on paths in the docs below:** all file:line references inside `docs/*.md` are relative to the **repo root**, not the `docs/` directory. So `lambda/smartlift-api/index.mjs:63` means `~/Documents/smartlift-customer-portal/lambda/smartlift-api/index.mjs:63`.

**Workflow conventions** (already learned):
- AWS CLI is configured locally on my Mac (`aws sts get-caller-identity` → user `nyceguy`, account `416142471465`, us-east-1).
- You have the AWS API MCP and can read/list AWS state, but **mutating commands with JSON arguments often fail** through the MCP due to shell-quoting; for those, write a script under `scripts/` and have me run it. Use `file://` for `--cli-input-json` and `--policy-document` to avoid quoting hell.
- The `deploy-lambda.sh` script handles per-Lambda zipping correctly (uses node_modules where committed, just `index.mjs` otherwise).
- Files I write through Cowork get a `com.apple.provenance` xattr — Terminal needs Full Disk Access (granted) to read them. If a fresh deploy command fails with "Operation not permitted", remind me to clear xattrs.
- Frontend is on AWS Amplify Hosting → smarterlift.app via Cloudflare. `git push` triggers a rebuild.
- Auth: Cognito User Pool `us-east-1_n7bsroYdL` (groups: Owners, Technicians, SalesOffice, CompanyUsers, Customers). API Gateway `4cc23kla34` has a Cognito Authorizer (`cuw6d5`) on every route except `/health`.
- Multi-tenancy: `getAuthContext()` in `lambda/smartlift-api/index.mjs` resolves `{ companyId, customerId, role }` — internal users via `company_users.email`, portal customers via `customers.cognito_user_id`. Throws `AuthError` (→ 401) on any failure.
- DB credentials: in AWS Secrets Manager at `arn:aws:secretsmanager:us-east-1:416142471465:secret:smartlift/aurora/hotelapp-cAsWga`. Lambdas read it via top-level await at cold-start.

**Where I left off** (update this each time):

```
Last session date: 2026-04-27 (evening, second pass — continuation)
Last actions:      Three closures back-to-back this session:

                   (1) Step 5C-redo: VPC migration + close Aurora SG. Last CRITICAL is done.
                   (2) H-5: dropped dead tables `activities`, `contacts`, `service_requests`
                       via Aurora RDS Data API (HTTPS path; no SG ingress needed). Cross-tenant
                       leak vectors removed at the schema level. db/schema.md updated.
                   (3) H-6: hardened Cognito pool us-east-1_n7bsroYdL in place — sandbox tag
                       removed, DeletionProtection ACTIVE, MFA OPTIONAL (TOTP), group precedence
                       fixed (Owners=1, Sales=2, Tech=3, Staff=10, Customers=20). No user
                       migration, no frontend redeploy. Script: scripts/h6-harden-cognito-pool.sh.

                   Step 5C-redo details:
                   - Created private subnets smartlift-private-1a (172.31.96.0/20,
                     subnet-0a4eb0fd5b55ef324) and smartlift-private-1b (172.31.112.0/20,
                     subnet-0556c8d00aa1f99ff) in vpc-06cec9c7bd56c515d.
                   - NAT Gateway nat-07c5a41250bccf625 with EIP eipalloc-045f2e977c1e13573
                     in public subnet subnet-0fc3605ad04dca501 (1a). ~$32/mo flat.
                   - Route table rtb-0b767a35d2459cdd3: 0.0.0.0/0 -> NAT, attached to both
                     private subnets.
                   - Lambda SG sg-05ad862bc8fe7fc3c (smartlift-lambda-sg, no inbound, default
                     egress).
                   - Aurora SG sg-0a10102c1e09c540e new ingresses: tcp/5432 from Lambda SG +
                     tcp/443 from Lambda SG (the latter for VPC endpoint reach — Bedrock and
                     Lambda VPC interface endpoints are attached to the Aurora SG).
                   - Attached AWSLambdaVPCAccessExecutionRole to the 4 Lambda roles missing it
                     (ai-scorer's role already had it).
                   - Migrated all 5 DB-using Lambdas to {private subnets, Lambda SG} in this
                     order: tdlr-refresh, maintenance-reminder, review-analyzer, ai-scorer,
                     smartlift-api (last). Each verified before the next.
                   - Revoked 0.0.0.0/0:5432 from Aurora SG at 2026-04-27T21:16Z. Pre- and
                     post-revoke /health both green; logged-in dashboard load all 2xx.
                   - BONUS app fix: smartlift-tdlr-refresh referenced table `tdlr_elevators` in
                     5 places; live table is `building_registry`. Renamed and re-deployed; full
                     ingest now succeeds (74,052 rows + 365 contractors + 208 inspectors). The
                     daily cron had been silently failing; it now works.
                   - Scripts (idempotent): scripts/vpc-phase-{a-infra,b0-iam-vpc,b-lambdas,
                     d-close-aurora-sg}.sh. State in scripts/.vpc-phase-a-state.json.

Next action:       No CRITICALs or HIGHs left. The next chunk by priority is Step 7 / M-8a
                   (within-tenant customer scoping) — the customer portal frontend hits
                   internal routes filtered only by company_id, so a Customer-role user sees
                   the entire fleet their service company services rather than just their own.
                   Lambda fix in 6 routes: /elevators, /tickets, /maintenance, /invoices,
                   /documents, /profile. Add `WHERE customer_id = $customerId` when role is
                   'customer'. Or if you'd rather: M-3 (Aurora deletion protection + Multi-AZ
                   prep) is a 5-min cheap insurance.

State of original SECURITY.md findings:
   CRITICAL:  5/5 closed
   HIGH:     8/8 closed
   MEDIUM:   5/10 closed  (M-3 deletion protect / multi-AZ, M-4 PI, M-7 per-tenant SES,
                          M-8 bundle keys, M-8a customer scoping, M-9 cross-tenant scorer,
                          M-10 cosmetic)
   LOW:      4/10 closed  (assorted cleanups)

Open items by priority:
  - Step 7 / M-8a (MEDIUM)              — within-tenant customer scoping (Customer-role users
                                          currently see all data for their service company)
  - M-3 (MEDIUM)                        — Aurora DeletionProtection=true + Multi-AZ; if you
                                          go Multi-AZ, also add a second NAT in 1b for HA
  - Optional H-6 follow-up (LOW)        — step up MFA from OPTIONAL to REQUIRED for Owners-
                                          only via admin-set-user-mfa-preference. Strongly
                                          recommended before tenant 2 onboards.
  - L-2..L-4 (LOW)                      — repo cleanup: stale index.mjs at root, orphan
                                          Documents.jsx / Support.jsx / TDLRIntelligence.jsx
  - Step 1.2 (LOW)                      — tighten OPTIONS preflight CORS on the 80 routes
                                          (cosmetic; real responses are origin-locked)
  - Cleanup (LOW)                       — `tcp/22 from 52.95.4.19/32` ingress on Aurora SG
                                          is leftover, not in use; remove. Also: split VPC
                                          interface endpoints onto a dedicated endpoint SG
                                          rather than reusing the Aurora SG.
```

After you've read the docs above and confirmed the state, ask: "What do you want to tackle next?" — don't speculatively start work. If I respond with a Step number or feature, look it up in `SECURITY.md` for context and proceed.

## End copy ↑

---

## How to keep this template current

After every meaningful session, run this in your terminal to update the "Where I left off" block:

```bash
nano ~/Documents/smartlift-customer-portal/SESSION_TEMPLATE.md
# Update Last action / Next action / Open items
```

Or ask Claude at session-end: "Update SESSION_TEMPLATE.md with what we just did and what's next."

---

## Tips for getting the most out of a session

- **Pin the docs first.** Claude does its best work when it knows the verified state. Pasting just "continue" without the template forces 10+ rediscovery tool calls.
- **HAR files are gold for debugging.** If the frontend is acting up, hit DevTools → Network → right-click → Save all as HAR with content, drop it in the chat. Claude can parse 100+ requests in seconds and pinpoint regressions.
- **AWS mutations through MCP are flaky for JSON.** Trust Claude when it asks to write a local script — it's because the MCP corrupts the policy/JSON arguments.
- **One step at a time, with verification.** This codebase has 5 CRITICAL findings stacked. Each fix has shipped successfully because we verified end-to-end (HAR or curl) before moving on. Keep that rhythm.
- **The post-mortem habit.** When a bug is fixed, ask Claude to add a one-line entry to `SECURITY.md` so the next session knows what was learned. We've already used that pattern for the SQL column bug, the OPTIONS quoting, and the headers-at-component-top regression.
