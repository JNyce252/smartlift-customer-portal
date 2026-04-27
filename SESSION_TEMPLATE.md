# Smarterlift — Session Start Template

Paste the block below into a new Claude conversation to skip 30 minutes of re-exploration. It points Claude at the artifacts already on disk so it doesn't re-pull them. Update the **"Where I left off"** section before pasting.

---

## Copy from here ↓

I'm continuing work on **Smarterlift** (smarterlift.app), my AI-powered lead-gen + CRM SaaS for elevator service companies. Built by The Golden Signature LLC. Founding customer: Southwest Cabs Elevator Services (Texas).

You've already done deep work on this project in prior sessions. Don't rediscover; **read these files first** in order, then ask me what to work on:

1. `~/Documents/smartlift-customer-portal/ARCHITECTURE.md` — full architecture map (frontend, 6 Lambdas, API Gateway, Aurora, Cognito, schema). Verified facts.
2. `~/Documents/smartlift-customer-portal/SECURITY.md` — severity-ranked findings (5 CRITICAL, 8 HIGH, 10 MEDIUM, 10 LOW) with file:line citations. State of each is tracked at the top.
3. `~/Documents/smartlift-customer-portal/db/schema.md` — live introspection of the `hotelleads` Aurora DB (40 tables, columns, row counts, multi-tenancy audit).
4. `~/Documents/smartlift-customer-portal/infra/` — saved AWS configs as JSON (Cognito, Aurora SG, IAM role, Lambda env vars).
5. `~/Documents/smartlift-customer-portal/lambda/` — local mirror of all 6 deployed Lambdas (`smartlift-api` is the 2,200-LOC monolith).
6. `~/Documents/smartlift-customer-portal/scripts/` — orchestration scripts: `deploy-lambda.sh`, `attach-cognito-authorizer.sh`, `rotate-db-password.sh` (phases A/B/C), `fix-proposals-options.sh`.

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
Last session date: 2026-04-27
Last action:       Step 5 Phase A + B complete (DB password rotated, Secrets Manager wired).
Next action:       Run `./scripts/rotate-db-password.sh C` to remove stale DB_PASSWORD env vars
                   and revoke 0.0.0.0/0:5432 from sg-0a10102c1e09c540e.
Open items:        - Step 6: per-Lambda IAM split, prompt-injection hardening on contact form,
                            rate limits on AI endpoints, RDS CA bundle for SSL validation
                  - Step 7: within-tenant customer scoping (customers currently see all data
                            for their service company, not just their own)
                  - Step 1.2: tighten OPTIONS preflight CORS to specific origin (currently '*')
                              on all 80 routes
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
