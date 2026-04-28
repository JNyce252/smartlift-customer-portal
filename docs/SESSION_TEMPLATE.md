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
Last actions:      MARATHON session — closed every remaining CRITICAL + HIGH AND
                   shipped the entire customer-portal feature top-5:

                   (1) Step 5C-redo: VPC migration + close Aurora SG. Last CRITICAL done.
                   (2) H-5: dropped dead tables `activities`, `contacts`, `service_requests`
                       via Aurora RDS Data API. Cross-tenant leak vectors removed at schema level.
                   (3) H-6: hardened Cognito pool us-east-1_n7bsroYdL in place — sandbox tag
                       removed, DeletionProtection ACTIVE, MFA OPTIONAL (TOTP), group precedence
                       corrected. Script: scripts/h6-harden-cognito-pool.sh.
                   (4) M-8a: customer-role within-tenant scoping in smartlift-api. /elevators,
                       /tickets, /maintenance, /invoices, /documents now filter customer_id
                       when role='customer'. POST /tickets force-binds customer_id and verifies
                       elevator ownership. PATCH /profile 403s for customers. Verified via
                       customer browser dashboard load.
                   (5) Customer portal review: docs/CUSTOMER_PORTAL_REVIEW.md generated
                       (3 HIGH, 9 MEDIUM, 10 LOW findings).
                   (6) CH-1: server-side priority whitelist + customer-emergency rate-limit
                       (3 per 24h, 4th+ silently downgrades to 'high' with activity_log audit).
                   (7) CH-2: de-hardcoded derald@swcabs.com / phone in 3 customer pages
                       (BillingPayments, Support, ServiceRequest). Now sourced from
                       company_profile via GET /profile. Tenant-2 ready.
                   (8) CH-3: customer-role queries enumerate columns instead of SELECT *.
                       Drops risk_score, resolution_notes, internal cost, internal user emails,
                       etc. CUSTOMER_COLUMNS constant near auth helpers in smartlift-api.
                   (9) Repo organization: docs moved to docs/, scaffolding to archive/,
                       expanded .gitignore + README.md.

                   Customer-portal feature roadmap top-5 — all backend-deployed:
                   (10) B1+B2: Compliance Health Score (gauge + per-elevator breakdown) +
                        Certification Cliff Chart (Recharts ComposedChart, your inspections
                        vs TX % monthly distribution). Endpoint: GET /me/compliance.
                        Component: src/components/customer/ComplianceCard.jsx.
                   (11) A1: Hidden Defect Cohort Predictions. SQL cohort against TDLR
                        building_registry (148k rows) + Bedrock Claude Sonnet 4.5 with
                        cohort-grounded prompt. 30-day cache in elevator_insights table.
                        Endpoint: GET /me/elevator/:id/insights. Component:
                        src/components/customer/ElevatorInsightsPanel.jsx.
                   (12) O2: Renewal Calendar .ics export (snapshot download). Endpoint:
                        GET /me/calendar.ics returning text/calendar. Frontend trigger:
                        api.downloadCalendar() blob handler + button on dashboard header.
                        Subscribable URL deferred to v2 (needs auth-NONE on API Gateway).
                   (13) A2: AI Q&A Chat ("Ask Smarterlift"). Customer-data-grounded system
                        prompt + Claude with 20-msg / 2000-char-each guardrails.
                        Endpoint: POST /me/chat. Page: src/pages/customer/AskSmarterlift.jsx
                        at /customer/ask. Hero card on the dashboard.
                   (14) O1: Service History Timeline. Unified per-elevator event timeline
                        (install + modernization + inspections + maintenance_logs +
                        tickets created/completed + scheduled maintenance). PDF export via
                        jsPDF. Endpoint: GET /me/elevator/:id/timeline. Page:
                        src/pages/customer/ElevatorHistory.jsx at /customer/elevator/:id/history.
                        MyElevators "View Service History" button now points here.

                   Schema migrations this session (via Aurora RDS Data API):
                   - DROP TABLE activities, contacts, service_requests (H-5).
                   - CREATE TABLE elevator_insights (A1 cache, 30-day TTL).

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

Next action:       PUSH THE WHOLE BAG. There's a substantial undeployed frontend pile
                   waiting on `git push`. Everything backend-side is already live.

                   What's pending push (ships in one Amplify rebuild):
                     - Frontend code: CH-2 customer pages (BillingPayments, Support,
                       ServiceRequest); ComplianceCard widget + dashboard mount;
                       ElevatorInsightsPanel on MyElevators; Calendar download button on
                       dashboard; AskSmarterlift page + dashboard hero card; ElevatorHistory
                       page + redirected "View Service History" button.
                     - Repo reorganization: docs/, archive/, expanded .gitignore, real README.
                     - Doc updates: SECURITY.md, CUSTOMER_PORTAL_REVIEW.md (new),
                       CUSTOMER_PORTAL_FEATURES.md (new), SESSION_TEMPLATE.md.
                   Single commit, single push.

                   After the push lands and Amplify rebuilds (~3 min), test loop is:
                     1. Sign in as testcustomer@smarterlift.app at smarterlift.app
                     2. Dashboard renders with: Compliance gauge widget, Ask Smarterlift
                        hero card, "Calendar" button in header.
                     3. Click "Ask Smarterlift" → chat page with 6 suggested questions
                        → ask one → Claude answers (~5-8s).
                     4. Back to /customer/elevators → expand an elevator → AI Insights
                        Panel auto-loads (~10s first time, instant after thanks to cache)
                     5. Click "View Service History" → unified timeline + PDF export.

                   Open work AFTER the push, all MEDIUM or below:
                     - CM-1 Stripe wiring (or remove "Pay Now" stub in BillingPayments).
                     - CM-5 Customer profile editor (no /me/customer GET+PATCH today).
                     - M-3 Aurora DeletionProtection=true + Multi-AZ.
                     - O2 v2 Subscribable calendar URL (token-auth public endpoint).
                     - Other features in docs/CUSTOMER_PORTAL_FEATURES.md (B3, B4, A3, O3,
                       O4, E1-E3) — pick by ROI when you're ready.

State of original SECURITY.md findings (management portal):
   CRITICAL:  5/5 closed
   HIGH:     8/8 closed
   MEDIUM:   6/10 closed  (M-1 errors, M-2 deletion protect, M-3 multi-AZ open,
                          M-4 PI, M-7 per-tenant SES, M-8 bundle keys,
                          M-8a customer scoping CLOSED, M-9 cross-tenant scorer, M-10 cosmetic)
   LOW:      4/10 closed  (assorted cleanups)

State of CUSTOMER_PORTAL_REVIEW.md findings (customer portal):
   CRITICAL:  0/0
   HIGH:     3/3 closed   (CH-1 priority cap, CH-2 contact info, CH-3 column enumeration)
   MEDIUM:   0/9 closed   (CM-1 Stripe stub, CM-2 fetch-to-api.js, CM-3 file_url validation,
                          CM-4 JSON.parse hardening, CM-5 customer profile editor,
                          CM-6 Support category whitelist, CM-7 /tickets ?limit=,
                          CM-8 PrivateRoute redirect, CM-9 / catch-all)
   LOW:      0/10 closed  (assorted polish)

Open items by priority:
  - CM-1 (MEDIUM)                       — Stripe wiring OR remove "Pay Now" stub from
                                          BillingPayments. ~5 min remove vs ~1 day wire.
  - CM-5 (MEDIUM)                       — customer profile editor (no /me/customer GET+PATCH
                                          today; customer can't update own contact info).
  - M-3 (MEDIUM)                        — Aurora DeletionProtection=true + Multi-AZ; if you
                                          go Multi-AZ, also add a second NAT in 1b for HA.
  - CM-2 (MEDIUM)                       — normalize 4 direct fetch() calls in customer pages
                                          to api.js wrapper. Mechanical.
  - CM-3, CM-4, CM-6..CM-9              — see docs/CUSTOMER_PORTAL_REVIEW.md
  - Optional H-6 follow-up (LOW)        — step up MFA from OPTIONAL to REQUIRED for Owners-
                                          only via admin-set-user-mfa-preference. Strongly
                                          recommended before tenant 2 onboards.
  - Step 1.2 (LOW)                      — tighten OPTIONS preflight CORS on the 80 routes
                                          (cosmetic; real responses are origin-locked)
  - Customer-portal LOWs (CL-1..CL-10)  — see docs/CUSTOMER_PORTAL_REVIEW.md
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
