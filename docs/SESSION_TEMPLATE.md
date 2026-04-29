# Smarterlift — Session Start Template

Paste the block below into a new Claude conversation to skip 30 minutes of re-exploration. It points Claude at the artifacts already on disk so it doesn't re-pull them. Update the **"Where I left off"** section before pasting.

---

## Copy from here ↓

I'm continuing work on **Smarterlift** (smarterlift.app), my AI-powered lead-gen + CRM SaaS for elevator service companies. Built by The Golden Signature LLC. Founding customer: Southwest Cabs Elevator Services (Texas).

You've already done deep work on this project in prior sessions. Don't rediscover; **read these files first** in order, then ask me what to work on:

1. `~/Documents/smartlift-customer-portal/docs/ARCHITECTURE.md` — full architecture map (frontend, 6 Lambdas, API Gateway, Aurora, Cognito, schema). Verified facts.
2. `~/Documents/smartlift-customer-portal/docs/SECURITY.md` — severity-ranked findings (5 CRITICAL, 8 HIGH, 10 MEDIUM, 10 LOW) with file:line citations. State of each is tracked at the top. After H-5+H-6+M-8a closure: 5/5 + 8/8 + 6/10 + 4/10.
3. `~/Documents/smartlift-customer-portal/docs/CUSTOMER_PORTAL_REVIEW.md` — customer-portal-specific audit (3 HIGH, 9 MEDIUM, 10 LOW). All findings file:line-grounded.
3a. `~/Documents/smartlift-customer-portal/docs/ADMIN_REVIEW.md` — admin/demo/feedback surface audit (1 HIGH, 5 MEDIUM, 7 LOW), generated 2026-04-29. Covers the SuperAdmin console, public /demo intake, tenant provisioning via /admin/demo-requests/:id/approve, and the /me/feedback → platform_feedback path.
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
Last session date: 2026-04-29

Last actions (everything since the 2026-04-27 customer-portal-v1 ship — 8 commits on main):

  362765f Ship customer portal v1 — pushed; the "MARATHON" pile (C-1 VPC migration,
          H-5 dead-table drops, H-6 Cognito hardening, M-8a customer scoping, CH-1
          priority cap, CH-2 contact-info de-hardcode, CH-3 column enumeration, plus
          features B1+B2 ComplianceCard, A1 ElevatorInsights, O2 calendar .ics, A2
          AskSmarterlift, O1 ElevatorHistory). Repo reorg into docs/+archive/.

  0cc56d2 Fix Wrench import in Dashboard.

  62c836e feat: real Proposals list page. Closed the dead /internal/proposals nav
          link. New page src/pages/internal/Proposals.jsx (table + status filter +
          search, click-through to ProspectDetails). New endpoint GET /proposals
          (latest proposal per prospect, joined with prospects + ei.estimated_elevators,
          scoped by company_id). API Gateway: new /proposals resource + Cognito
          authorizer + OPTIONS CORS. Login.jsx: also fixed the on-mount redirect
          (line 23 — same role==='company' bug as the post-login redirect).

  694615a Admin Console v1: SuperAdmin auth, /admin/* endpoints + 3 pages.
          - getAuthContext now checks groups.includes('SuperAdmin') first and returns
            { companyId: null, customerId: null, role: 'super_admin' } — no tenant row
            required. /admin/* routes gated explicitly with authRole !== 'super_admin' →
            403 (lambda/smartlift-api/index.mjs:3307).
          - New endpoints: GET /admin/dashboard, GET /admin/tenants, GET /admin/activity.
          - Pages: AdminDashboard, AdminTenants, AdminActivity. AdminLayout shell.
          - Bootstrap script: scripts/admin-bootstrap-superadmin.sh.
          - API Gateway: scripts/apigw-add-admin-routes.sh.

  9c75650 Fix AuthContext role decoder: SuperAdmin was being overwritten back to 'staff'
          on every page load (decoder ran on idToken refresh and missed the SuperAdmin
          group). Lambda also affected.

  dcef427 Admin dashboard redesign: 14-day sparklines, per-tenant health cards, system
          pulse strip. /admin/dashboard endpoint expanded to return the trend arrays.

  01ac1dd feat(admin): cross-tenant tickets + feedback queue + platform_feedback table.
          - New endpoints: POST /me/feedback (any auth user → SES email + DB row),
            GET /admin/feedback, PATCH /admin/feedback/{id}, GET /admin/service-requests
            (cross-tenant ticket view, emergency-first sort).
          - DB: platform_feedback table (status: new/triaged/in_progress/resolved/wont_fix,
            priority, admin_notes).
          - Frontend: AdminFeedback.jsx (status tabs + inline editor),
            AdminServiceRequests.jsx (cross-tenant list), reusable FeedbackModal mounted
            in UserMenu (mgmt) + Support.jsx (customer).
          - AdminDashboard: triage cards (tickets + feedback) above KPI grid.
          - AdminLayout: nav adds Tickets + Feedback tabs.
          - AI cost cache shipped same commit: prospects.ai_input_hash and
            reviews_input_hash columns; opus-4-7 + sonnet-4-6 selected via env vars.

  e032395 feat(demo): public /demo page + admin queue + one-click tenant provisioning.
          - Public POST /demo-requests (no auth, honeypot field website_url|fax|url,
            per-IP rate-limit 5/24h, 320-char email cap, 4000-char message cap, SES
            email to nyceguy@thegoldensignature.com).
          - GET /admin/demo-requests, PATCH /admin/demo-requests/:id,
            POST /admin/demo-requests/:id/approve (creates companies row status='trialing'
            with 14-day trial; AdminCreateUser in Cognito Owners group; sends welcome
            email + Cognito invite-with-temp-pw; rolls back the company row if Cognito
            fails).
          - DB: demo_requests table self-bootstraps (CREATE IF NOT EXISTS in
            ensureDemoRequestsSchema, fires once per cold start).
          - Frontend: marketing/RequestDemo.jsx (public /demo) with off-screen honeypot.
            AdminDemoRequests.jsx two-pane queue with status tabs + inline notes +
            ApproveModal.
          - AdminLayout: Demos tab between Dashboard and Tickets.
          - Login: 'Request a demo' link now points to /demo (was thegoldensignature.com).

  22691df feat(prompts): audit + rewrite of 6 highest-leverage Claude prompts.
          (1) Lead scoring: rubric-driven, allow nulls for unknowns, expanded inputs,
              prompt-injection guard, fingerprint hash bumped to v2 → re-scores all
              prospects. (2) Proposal improver: explicit preserve-fact rules, ±20%
              length cap, 4 focus modes, wrapped in <proposal> tags. (3) Stale-model
              cleanup: 4 dead Sonnet 4.5 fallbacks bumped to 4.6; gs-contact moved to
              env-driven model. New IAM policy permits Sonnet 4.6 + Haiku 4.5 — chat
              had been silently failing on Sonnet 4.6 AccessDenied. (4) Cohort
              predictions: user-controlled inputs in tags + injection guard, threaded
              service company name through. (5) Review intelligence: explicit rubric,
              'unknown' enum value, empty-array-is-valid guidance, fingerprint v2 →
              re-analyzes all prospects. (6) Cold outreach email: signal-aware opener,
              voice constraints, CAN-SPAM unsubscribe footer, 120-word cap.
              Also: deploy-lambda.sh empty-array bug fix under set -u.

Schema state since last template update (Aurora hotelleads, 39 tables now vs. 37):
  + platform_feedback   (cross-tenant feedback inbox; row count not pulled this session)
  + demo_requests       (CREATE IF NOT EXISTS, self-bootstraps; row count not pulled)
  + columns: prospects.ai_input_hash, prospects.reviews_input_hash (cost cache)
  Companies.status now actively used; allowed values: active, trialing, past_due
  (cancelled/paused/suspended throw AuthError → 401 at request boundary).

Models in production (hard-coded fallbacks updated, env-driven preferred):
  - Lead scoring + per-prospect re-score: us.anthropic.claude-sonnet-4-6 (env CLAUDE_MODEL)
  - Proposal generation, intro email, chat, contact form: same family, env-driven
  - Customer "Ask Smarterlift" chat: us.anthropic.claude-haiku-4-5 (chat tier)
  - Review analyzer + ai-scorer: us.anthropic.claude-sonnet-4-6
  - IAM bedrock-invoke-model-v2 policy permits Sonnet 4.6 + Haiku 4.5

Next action:       Audit the new admin/demo/feedback surface for security and write
                   findings into docs (severity-ranked, file:line-cited). Specifically:
                     - /admin/* role gating + IDOR (tenants, feedback, service-requests,
                       demo-requests).
                     - POST /demo-requests public endpoint (honeypot, rate-limit, email
                       enumeration risk, stored-payload XSS in admin display path).
                     - POST /admin/demo-requests/:id/approve tenant provisioning
                       (Cognito AdminCreateUser, role assignment, password handling,
                       race conditions, idempotency, rollback path).
                     - POST /me/feedback (auth'd, all roles): input caps, escape in SES
                       email body, escape in admin display, cross-tenant info disclosure
                       in /admin/feedback queue.
                   Then knock down the remaining open MEDIUMs from SECURITY.md:
                   M-1 errors leak, M-2 deletion protection, M-7 per-tenant SES,
                   M-9 cross-tenant scorer, M-10 cosmetic, plus M-3/M-4/M-8 cost-or-GCP-
                   bound items. Then start CUSTOMER_PORTAL_REVIEW MEDIUMs (CM-1..CM-9).

State of SECURITY.md findings (management portal):
   CRITICAL:  5/5 closed
   HIGH:     8/8 closed
   MEDIUM:   ?/10 closed — needs verification this session as part of the audit pass.
                          Confirmed closed: M-5 (token-key, via C-4/C-5), M-6 (path
                          stripper now /^\/(prod|staging)(?=\/|$)/), M-8a customer
                          scoping. Likely open: M-1, M-2, M-3, M-4, M-7, M-8, M-9, M-10.
   LOW:      4/10 closed  (assorted cleanups)

State of CUSTOMER_PORTAL_REVIEW.md findings (customer portal):
   CRITICAL:  0/0
   HIGH:     3/3 closed   (CH-1 priority cap, CH-2 contact info, CH-3 column enumeration)
   MEDIUM:   0/9 closed   (CM-1..CM-9 all open)
   LOW:      0/10 closed  (CL-1..CL-10 all open)

State of admin/demo/feedback surface (added since last template update):
   AUDIT:    not yet performed — this session's primary security objective.

Open items by priority (post-audit):
  - Admin/demo/feedback findings (TBD this session) — file:line-cited results to
                                          land in SECURITY.md or new ADMIN_REVIEW.md.
  - M-1 (MEDIUM)                        — generic 500 errors with request_id; stop
                                          leaking pg.message via internalError().
  - M-2 (MEDIUM)                        — Aurora DeletionProtection=true. ~5 min via
                                          aws rds modify-db-cluster.
  - M-9 (MEDIUM)                        — ai-scorer "all prospects" path missing
                                          company_id filter (lambda/smartlift-ai-scorer).
                                          Verify upstream caller passes company_id, or
                                          enforce here.
  - M-7 (MEDIUM)                        — SES From hardcoded to derald@swcabs.com in
                                          maintenance-reminder. Tenant-2 blocker.
  - M-10 (MEDIUM, cosmetic)             — gs-contact SES Source uses nyceguy252@gmail.
  - M-3 (MEDIUM)                        — Aurora Multi-AZ + dual-AZ NAT (cost decision).
  - M-4 (MEDIUM)                        — Performance Insights enable.
  - M-8 (MEDIUM)                        — GCP key restrictions (HTTP-referrer);
                                          you in GCP console, not me.
  - CM-1..CM-9 (customer-portal MEDIUM) — see docs/CUSTOMER_PORTAL_REVIEW.md.
  - CL-1..CL-10 (customer-portal LOW)   — polish, after MEDIUMs clear.
  - Optional H-6 follow-up (LOW)        — MFA REQUIRED for Owners-only before tenant 2
                                          via admin-set-user-mfa-preference.
  - Cleanup (LOW)                       — Aurora SG `tcp/22 from 52.95.4.19/32` (unused);
                                          split VPC interface endpoints onto dedicated SG.
  - Step 1.2 (LOW)                      — tighten OPTIONS preflight CORS on all routes.

Repo state (verified 2026-04-29):
  - Branch: main, 0 ahead / 0 behind origin/main.
  - HEAD: 22691df (feat(prompts): audit + rewrite of 6 highest-leverage Claude prompts).
  - Working tree: clean.
  - Stashes: none.
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
