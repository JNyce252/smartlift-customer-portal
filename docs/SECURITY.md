# Smarterlift — Security Review

_Generated 2026-04-26 from a complete pull of the live AWS account, all 6 Lambda sources, the React frontend, and a live introspection of the production Postgres schema. Every finding is grounded in a file:line, a configuration value, or a verified live test._

> **Bottom line (updated 2026-04-30):** **all 5 originally-CRITICAL, all 8 originally-HIGH, and 7 of 10 MEDIUM findings are CLOSED.** Recent closures: M-2 (Aurora deletion protection — `aws rds modify-db-cluster --deletion-protection`, 2026-04-30), M-7 (per-tenant SES sender in maintenance-reminder via display-name pattern, 2026-04-30), M-9 (ai-scorer requires `company_id` and scopes all SELECTs by tenant, verified live, 2026-04-30). Earlier closures verified this session: M-1 (`internalError` returns generic 500 + request_id), M-5 (token-key fixed via C-4/C-5), M-6 (path stripper regex now matches `/^\/(prod|staging)(?=\/|$)/`).
>
> Remaining open MEDIUMs: M-3 Aurora Multi-AZ + dual-AZ NAT (cost decision, ~$30/mo extra), M-4 Performance Insights enable (1 CLI call), M-8 ProspectDetails CSE keys → env vars (downgraded to LOW since GCP-side HTTP-referrer + API restrictions + IP-allowlist are now applied to all 3 GCP keys), M-10 cosmetic gs-contact gmail SES Source.
>
> See docs/ADMIN_REVIEW.md for the admin/demo/feedback surface (all 1 HIGH + 5 MEDIUM closed) and docs/CUSTOMER_PORTAL_REVIEW.md for the customer portal (3 HIGH + 4 of 9 MEDIUM closed; 2 stale-closed; 3 deferred).

---

## Severity-ranked findings

### CRITICAL — fix today

#### C-1. Aurora's security group is open to the internet on port 5432 (**CLOSED 2026-04-27**)

**Closure (2026-04-27 evening):** All 5 DB-using Lambdas migrated into the default VPC `vpc-06cec9c7bd56c515d` with NAT Gateway egress, on a dedicated Lambda SG, and the `0.0.0.0/0:5432` ingress on `sg-0a10102c1e09c540e` was revoked at 2026-04-27T21:16Z. Aurora is no longer reachable from the public internet.

Final architecture (verified live + via end-to-end test):

| Resource | ID | Notes |
|---|---|---|
| New private subnet 1a | `subnet-0a4eb0fd5b55ef324` | `172.31.96.0/20`, MapPublicIp=false |
| New private subnet 1b | `subnet-0556c8d00aa1f99ff` | `172.31.112.0/20`, MapPublicIp=false |
| Elastic IP            | `eipalloc-045f2e977c1e13573` | NAT Gateway EIP |
| NAT Gateway           | `nat-07c5a41250bccf625` | in public subnet `subnet-0fc3605ad04dca501` (1a) |
| Private route table   | `rtb-0b767a35d2459cdd3` | `0.0.0.0/0 → NAT`, attached to both new subnets |
| Lambda SG             | `sg-05ad862bc8fe7fc3c` | no inbound; default egress |
| Aurora SG ingress     | `sgr-0827292773d505083` | tcp/5432 from Lambda SG |
| Aurora SG ingress     | (added during phase A) | tcp/443 from Lambda SG (for VPC endpoint reach) |
| Bedrock VPC endpoint  | `vpce-05d0471881d3b686d` | Interface, PrivateDNS=true, on Aurora SG |
| Lambda  VPC endpoint  | `vpce-076eb482b98292308` | Interface, PrivateDNS=true, on Aurora SG |
| State file            | `scripts/.vpc-phase-a-state.json` | written by Phase A; consumed by Phase B |

Verification proof:
- `smartlift-tdlr-refresh` ingested 74,052 TDLR rows + 365 contractors + 208 inspectors via NAT egress + SG-to-SG (also fixed the latent `tdlr_elevators → building_registry` table-name bug in 5 places).
- `smartlift-ai-scorer` scored all 8 prospects via the Bedrock VPC interface endpoint (Bedrock InvokeModel × 8 from new private subnets, lead_scores 72–96).
- `smartlift-api` /health returns 2xx; logged-in dashboard load returned 2xx for /profile, /prospects, /work-orders, /invoices, /analytics/*.
- Pre- and post-revoke /health both clean.

Scripts (idempotent, in `scripts/`):
- `vpc-phase-a-infra.sh` — provisions all VPC infra and writes the state file.
- `vpc-phase-b0-iam-vpc.sh` — attaches `AWSLambdaVPCAccessExecutionRole` to the 4 per-Lambda roles missing it.
- `vpc-phase-b-lambdas.sh <name>` — per-Lambda VPC attach (also supports `rollback` and `status`).
- `vpc-phase-d-close-aurora-sg.sh` — pre-flight health check, revoke 0.0.0.0/0:5432, post-revoke verify.

Cost added: ~$32/mo flat for the NAT Gateway + ~$0.045/GB processed.

Known caveats / orthogonal cleanup:
- `tcp/22 from 52.95.4.19/32` ingress on the Aurora SG is still present; it's an AWS IP, not in active use.
- VPC interface endpoints are attached to the Aurora SG (`sg-0a10102c1e09c540e`) rather than a dedicated endpoint SG; that's why the Lambda SG needs port-443 ingress on the Aurora SG. Future hardening: split into a dedicated VPC endpoint SG.
- Single NAT (1a only); deliberate, matches single-AZ Aurora today. Dual-AZ NAT becomes worthwhile when Aurora goes Multi-AZ (M-3 / future).



`infra/aurora/security-group-sg-0a10102c1e09c540e.json`

Inbound rules on the SG attached to `hotel-leads-aurora` and `smartlift-ai-scorer`:

| Port | From | Description |
|---|---|---|
| 80 | 0.0.0.0/0 | (none) |
| **5432** | **0.0.0.0/0** | **"Temp Cloudshell access"** |
| ALL | self (intra-SG) | |
| 22 | 52.95.4.19/32 | (AWS IP) |

Aurora Postgres is reachable from any IPv4 host on the planet. **Verified** — I just connected from this analysis sandbox.

**Fix (today):**
1. Either move `smartlift-api`, `smartlift-review-analyzer`, `smartlift-tdlr-refresh`, and `smartlift-maintenance-reminder` back into the VPC (they used to be), or
2. Replace 0.0.0.0/0 with the specific Lambda egress prefix list (`com.amazonaws.us-east-1.lambda` ... actually use a NAT Gateway and pin one EIP), or
3. (Cleanest) Use **RDS Proxy** with IAM auth so Lambdas auth without a password and the proxy is the only thing in the SG.
4. Remove the port-80 rule entirely.
5. Tighten the port-22 rule to a known IP or remove if not used.

#### C-2. Aurora master credentials are everywhere in plaintext

The same password — `SmartLift2024!` — appears in:

| Location | Risk |
|---|---|
| `lambda/smartlift-tdlr-refresh/index.mjs:13` (hard-coded fallback) | Anyone with read access to the Lambda code/repo has full DB access |
| `lambda/smartlift-maintenance-reminder/index.mjs:8` (hard-coded fallback) | Same |
| Env vars on `smartlift-api`, `smartlift-review-analyzer`, `smartlift-tdlr-refresh`, `smartlift-ai-scorer`, `smartlift-maintenance-reminder` | Lambda console reveals it to anyone with `lambda:GetFunctionConfiguration` |
| Project memory file (`memory.md`) | Anyone with the Mac has it |

It's also the master username (`hotelapp`), so this single string controls the entire database — not a least-privileged app user.

**Fix:**
1. **Rotate the password now.**
2. Move it to **AWS Secrets Manager** (or SSM Parameter Store w/ KMS); Lambdas fetch at cold-start. RDS Proxy + IAM auth removes the password problem entirely.
3. Create a **least-privilege application role** in Postgres (no `DROP TABLE`, no `CREATE ROLE`); have Lambdas use that role, not `hotelapp`.
4. Strip the hard-coded fallback from `tdlr-refresh:13` and `maintenance-reminder:8`.
5. Remove the password from `memory.md`.

#### C-3. API Gateway has no authorizers — every route is publicly callable

`infra/api-gateway/smartlift-intelligence-summary.json`

I called `aws apigateway get-authorizers` on both `4cc23kla34` (SmartLift-Intelligence-API) and `aup3wz6azh` (GoldenSignature-API). Both returned an empty array. There is no Cognito Authorizer, no Lambda authorizer, nothing. **Every one of the 88 routes can be hit by anyone with the URL.**

Combined with C-4 below, this means an attacker doesn't need a token at all to read or mutate Southwest Cabs's data.

**Fix:**
1. Add a **Cognito User Pool Authorizer** to API Gateway and attach it to every non-public route. The few public routes (`/health`, the contact form on `aup3wz6azh`) should be tagged `auth=NONE` deliberately.
2. Add API Gateway **rate limiting** (usage plans) — at least on `/contact` (Bedrock+SES amplification target) and on the AI scoring endpoints (each call is $$$).

#### C-4. `getCompanyId()` silently fails open to `company_id = 1`

`lambda/smartlift-api/index.mjs:63-79`

```js
const getCompanyId = async (event, pool) => {
  try {
    const auth = event.headers?.Authorization || event.headers?.authorization;
    if (!auth) return 1;            // ← unauthenticated request
    const token = auth.replace('Bearer ', '');
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    const email = payload.email || payload['cognito:username'];
    if (!email) return 1;            // ← missing email claim
    const result = await pool.query('SELECT company_id FROM company_users WHERE email = $1 AND status = $2 LIMIT 1', [email, 'active']);
    return result.rows[0]?.company_id || 1;   // ← unknown user
  } catch(e) { return 1; }           // ← any error
};
```

Every "no auth / bad auth / unknown user" path returns `1` — Southwest Cabs's `company_id`. Combined with C-3 (no API Gateway auth), this is the path through which **the production app currently has no real multi-tenancy**: any unauthenticated request lands on company 1's data and can read/write it.

It also means that **once the second tenant is added**, a broken/forged token from a tenant-2 user lands on tenant-1's data — a write would silently corrupt company-1 records under company-2 user's name.

**Fix:**
1. Reject unauthenticated requests at API Gateway (C-3) so this code path is never reached.
2. Change the function to **throw** instead of returning 1 when auth is missing or the user is unknown:
    ```js
    if (!auth) throw new Error('UNAUTHENTICATED');
    if (!email) throw new Error('INVALID_TOKEN');
    if (!result.rows.length) throw new Error('UNKNOWN_USER');
    return result.rows[0].company_id;
    ```
3. Catch in the handler and return `401`.

#### C-5. Frontend sends `Bearer null` — but the API still serves the response

`src/components/common/NotificationBell.jsx:36`, `src/pages/internal/{Dashboard,Profile,Pipeline,Analytics,Documents,ProspectDetails}.jsx`, all reads of `localStorage.getItem('smartlift_token')`.

The auth service writes the token to `localStorage['smartlift_auth']` (line 36 of `authService.js`). But every internal page reads `'smartlift_token'`, and `AuthContext.getIdToken()` reads `'smartlift_user'`. Neither key is ever written. So every authenticated frontend call is effectively `Authorization: Bearer null` — and per C-4, the Lambda happily treats those calls as company_id=1.

**Fix:**
1. Replace every direct `localStorage.getItem('smartlift_token')` and `'smartlift_user'` with `useAuth().getToken()` (or a single helper exported from `authService`).
2. Confirm in CloudWatch that the token bug is the dominant code path right now (`logActivity` rows with `user_email = null`).

---

### HIGH — fix this week

#### H-1. CORS `Access-Control-Allow-Origin: *` on every Lambda

`smartlift-api/index.mjs:25`, `review-analyzer`, `golden-signature-contact`, etc.

Combined with the lack of API Gateway auth, **any website on the internet can make XHR calls to the API and read responses** (browser will deliver them because of `*`). A user logged into smarterlift.app who clicks a malicious link, or just visits a site running an attack page, is at risk if/when proper auth is added (and currently the API serves company-1 data with no token, so the risk is even more direct).

**Fix:** restrict to known origins:
```js
const ALLOWED_ORIGINS = new Set(['https://smarterlift.app','https://www.smarterlift.app','http://localhost:3000']);
const origin = event.headers?.origin || event.headers?.Origin;
const allowOrigin = ALLOWED_ORIGINS.has(origin) ? origin : 'https://smarterlift.app';
// ... 'Access-Control-Allow-Origin': allowOrigin
```

#### H-2. SSL cert validation disabled on every Lambda's DB connection

Every Lambda that connects to Aurora uses:
```js
ssl: { rejectUnauthorized: false }
```

This means TLS is on the wire but the server certificate isn't validated — vulnerable to a forged-cert MitM. Low practical risk inside the same AWS region but easy to fix.

**Fix:** Bundle the AWS RDS root CA bundle (`global-bundle.pem`) and pass `ssl: { ca: rdsCa, rejectUnauthorized: true }`.

#### H-3. Single shared IAM role for all 6 Lambdas, including the public contact form

`infra/iam/role-smartlift-api.json`

`smartlift-api`, `smartlift-review-analyzer`, `smartlift-tdlr-refresh`, `smartlift-ai-scorer`, `smartlift-maintenance-reminder`, **and `golden-signature-contact`** all assume the same role. Permissions on that role:

- `AmazonBedrockFullAccess` (managed) — model creation/deletion, not just InvokeModel
- `AWSLambdaRole` — `lambda:InvokeFunction *`
- `cognito-user-management` — admin create/disable/set-password users in the user pool
- `SES-SendEmail` Resource `*`
- VPC, basic execution

The public contact form Lambda has Cognito-admin-create-user, Bedrock-full-access, and the ability to invoke any Lambda. RCE in `gs-contact.mjs` = full account takeover.

Plus there are duplicate policies (`Bedrock-InvokeModel` AND `BedrockInvokePolicy`, `ses-send-email` AND `SES-SendEmail`, `AWSLambdaVPCAccessExecutionRole-47e0f2b3` AND the AWS-managed `AWSLambdaVPCAccessExecutionRole`) — sloppy.

**Fix:**
1. **Per-Lambda roles.** Each Lambda gets only what it needs. The contact form needs only `ses:SendEmail` (for one verified identity) and `bedrock:InvokeModel` for one model.
2. Replace `AmazonBedrockFullAccess` with `bedrock:InvokeModel` scoped to specific model ARNs.
3. Scope `cognito-idp:Admin*` to just the actions actually used (the policy is correct here in scope but only `smartlift-api` should have it).
4. Remove duplicate policies.

#### H-4. Hard-coded Google Maps API key in Lambda source

`lambda/smartlift-review-analyzer/index.mjs:16`

```js
const reviewRes = await fetch('...&key=AIzaSyDmTnd7Q4K9YZ_uwF7bKKU42_kDHrlwG5E');
```

Same key is also in `.env.local` (`REACT_APP_GOOGLE_PLACES_API_KEY`) and shipped in the React bundle.

**Fix:**
1. Move this key to the Lambda's env var (`GOOGLE_MAPS_KEY` already exists on `smartlift-api` — pass to review-analyzer too) and read with `process.env`.
2. Verify in GCP console that the key has **HTTP-referrer restrictions** (for the bundled key) or **server IP allowlist** (for the server key).
3. Rotate the key now; it's been in source for a while.

#### H-5. Inconsistent / missing `company_id` on key tables (**CLOSED 2026-04-27**)

**Closure (2026-04-27):** All three concrete cross-tenant leak vectors (`activities`, `contacts`, `service_requests`) are now dropped. Pre-flight verified zero rows live and zero SQL references in any Lambda or frontend file. Live multi-tenant counterparts already enforce `company_id`:

| Dropped (dead) | Live counterpart (in use, has `company_id`) |
|---|---|
| `activities` | `activity_log` (107 rows) |
| `contacts` | `prospect_contacts` (37 rows) |
| `service_requests` | `service_tickets` (1 row) |

The remaining tables without `company_id` in `db/schema.md` are now annotated explicitly: `building_registry` / `elevator_contractors` / `elevator_inspectors` are global TDLR reference data (intentional); `companies` is the root tenant table (intentional); `customer_elevator_summary`, `high_priority_leads`, `lead_scores` are derived views; `buildings` / `hotels` / `hotel_contacts` / `news_mentions` are flagged as legacy pending future audit.

Migration via Aurora RDS Data API (HTTPS, no VPC ingress required) — script `scripts/h5-drop-dead-tables.sh` is idempotent and pre-flight-aborts if any of the three are non-empty.

Deferred to future hygiene pass: a CI check that any new table must declare `company_id` or be on an explicit allowlist. Low priority — there are no schema-migration PRs in flight.

#### H-6. Cognito user pool is a sandbox deployment in production (**CLOSED 2026-04-27**)

**Closure (2026-04-27):** All four sub-issues fixed in place on the existing pool `us-east-1_n7bsroYdL` (no new pool, no user migration, no frontend redeploy, no API Gateway authorizer change — the original "promote or migrate" framing in this finding was over-prescribed; in-place modification gets to the same end state).

| Sub-issue | Fix |
|---|---|
| `amplify:deployment-type: sandbox` tag | Removed — closes the `amplify sandbox delete` foot-gun |
| `DeletionProtection: INACTIVE` | Now **ACTIVE** |
| `MfaConfiguration: OFF` | Now **OPTIONAL** with TOTP enabled (users self-enroll from profile) |
| Group precedence inverted (CompanyUsers=1, Owners=10) | Now **Owners=1, SalesOffice=2, Technicians=3, CompanyUsers=10, Customers=20** |

Existing users kept their passwords and active sessions — zero disruption. Pool tier is `ESSENTIALS`, which supports OPTIONAL MFA without upgrade. Script: `scripts/h6-harden-cognito-pool.sh` (idempotent; uses pass-through update-user-pool to avoid the documented quirk where unset fields reset to defaults).

**Optional future hardening:** step up to `MfaConfiguration: ON` with TOTP **required** for Owners-only via per-user `admin-set-user-mfa-preference`. Strongly recommended before tenant 2.

#### H-7. Bedrock prompt injection on the public contact form

`lambda/golden-signature-contact/gs-contact.mjs:7-68`

The `message` field from the public POST is interpolated directly into the Claude prompt that Jeremy receives by email:
```js
CLIENT INTAKE:
${intakeData}
```
A submitter can override the system instruction, exfiltrate the embedded pricing tiers (which are pasted verbatim in the prompt at lines 41-45 — these are now leaked to anyone curious enough to test prompt-injection), or generate offensive HTML that lands in your inbox.

**Fix:**
1. Treat the input as untrusted text — wrap it in a clear delimiter (e.g., `<intake>...</intake>`) and instruct the model to ignore any instructions inside. Use Bedrock guardrails if available.
2. Move the pricing tiers out of the prompt into a config file the model is told about by reference, not inclusion.
3. Validate the input length (server-side cap on `message.length`) to bound Bedrock cost.
4. Add per-IP rate limiting on the API Gateway.

#### H-8. No rate limiting / abuse protection on AI endpoints

`/ai/score-results`, `/ai/rescore-all`, `/prospects/:id/score`, `/prospects/:id/proposal`, `/prospects/:id/intro-email`, `/prospects/:id/improve-proposal`, `/prospects/:id/people-search`, `/prospects/:id/enrich-*`, `/contact`, `/customer/emergency/contact`.

Each call invokes Bedrock and/or PDL/Hunter (which cost real money). With C-3 (no auth), an attacker can drain the AWS bill or third-party credits in minutes.

**Fix:** API Gateway usage plans + per-API-key throttling, plus a per-IP/per-user budget in the Lambda.

---

### MEDIUM

#### M-1. Detailed Postgres errors leak to clients
`smartlift-api/index.mjs` returns `respond(500, { error: error.message })` in catch-alls. This leaks table/column names to anyone hitting the API.
**Fix:** log the real error, return a generic `{error: "Internal error", request_id: ...}`.

#### M-2. Aurora deletion protection is OFF
`infra/aurora/cluster.json` — `DeletionProtection: false`. A `terraform destroy` or console mistake wipes 74,001 TDLR rows + customer data.
**Fix:** turn on deletion protection.

#### M-3. Aurora is single-AZ
`MultiAZ: false`. AZ outage = downtime. With Aurora Serverless v2 and `MaxCapacity: 16`, an Aurora replica in another AZ costs little and gives you HA failover.

#### M-4. No Performance Insights / no slow-query log review process
PI is disabled. Without it, slow queries and anomalous traffic (e.g., someone abusing the open SG to scan tables) are invisible.

#### M-5. Token type mismatch in frontend
`authService.getToken()` returns the **access** token but role/groups live in the **id** token. The Lambda (`smartlift-api:42-54`) extracts `cognito:groups` from whatever bearer it gets — it'll work if access tokens carry groups (they do in Cognito by default for "openid profile" scopes), but inconsistent.
**Fix:** standardize on the id token in the Authorization header (it's also what API Gateway Cognito Authorizer expects by default).

#### M-6. `path.replace(/^\/prod/, '')` is a fragile route stripper
`smartlift-api/index.mjs:96`. If a future route starts with `/prod` (e.g. `/products`), it gets corrupted.
**Fix:** match `/^\/(prod|staging)\//` instead, with the trailing slash.

#### M-7. SES `From` is hardcoded
`maintenance-reminder/index.mjs:161` — `Source: 'derald@swcabs.com'`. Hard-coded to Southwest Cabs. Fine for now (1 tenant), blocking once tenant 2 onboards.
**Fix:** read from `companies.email_from` (add column) and use that.

#### M-8. `.env.local` exposes vendor keys to the bundle
The frontend ships `REACT_APP_GOOGLE_PLACES_API_KEY` and the hard-coded `GOOGLE_CSE_KEY/CSE_ID` in `ProspectDetails.jsx:9-10`. These are shipped in the bundle and harvestable.
**Fix:** these keys are usable from the browser anyway, so they need **GCP-side restrictions** (HTTP-referrer = smarterlift.app only). Verify and tighten in the GCP console.

#### M-8a. Within-tenant customer scoping is missing (NEW — discovered 2026-04-26)

The customer portal frontend (`src/pages/customer/*.jsx`) calls **internal** routes like `/elevators`, `/tickets`, `/profile`, `/invoices`, `/maintenance`. The Lambda filters those by `company_id` only. So a Customer-role user sees the **entire fleet** their service company services, not just their own elevators / tickets / invoices.

After the auth fix (Step 2) the right user-id is resolvable: `getAuthContext()` returns `{ companyId, customerId, role }`. The follow-up is to update the customer-callable handlers so when `role === 'customer'`, queries also `WHERE customer_id = $customerId` (or via the elevator → customer FK).

Routes affected (when called with a Customer-role JWT): `/elevators`, `/tickets`, `/maintenance`, `/invoices`, `/documents`, `/profile`. Tracked as Step 7 in the fix plan. Not blocking the API auth boundary work but fixes a real privacy bug.

#### M-9. ai-scorer can rescore across tenants when called without `prospect_id`
`smartlift-ai-scorer/index.mjs:71-73`:
```js
const prospectsResult = singleProspectId
  ? await pool.query('SELECT * FROM prospects WHERE id = $1', [singleProspectId])
  : await pool.query('SELECT * FROM prospects ORDER BY lead_score DESC NULLS LAST');
```
The "all prospects" path doesn't filter by `company_id`. Currently called from `/ai/rescore-all` in the main API — verify upstream that the caller's `company_id` is being passed, or filter by it here.

#### M-10. `golden-signature-contact` SES Source uses Gmail; ReplyTo is the submitter
`gs-contact.mjs:165-167`. Source is `nyceguy252@gmail.com` — works via SES verified identity, but personal Gmail address is the visible "from" on internal mail. Cosmetic.

---

### LOW

- **L-1.** Two Cognito user pools (`us-east-1_n7bsroYdL` active, `us-east-1_qOsAeoce6` zero users, created 2026-03-24). Delete the unused one.
- **L-2.** Stale `index.mjs` from March 31 in repo root — superseded by `lambda/smartlift-api/index.mjs`. Remove or replace.
- **L-3.** Stale `Documents.jsx` and `Support.jsx` at repo root, not imported. Remove.
- **L-4.** `TDLRIntelligence.jsx` defined but not routed; superseded by `BuildingRegistry.jsx`. Remove.
- **L-5.** `RoleNav.jsx` lists `/internal/proposals` for Owners and Sales but `App.jsx` has no such route — clicking falls to `*` → `/login`. Either add the route or remove the nav entry.
- **L-6.** Login redirect uses `userData.role === 'company'` but role decoder never returns that string — double-redirect through `PrivateRoute` masks it.
- **L-7.** `html2canvas` + `jspdf` (1 MB combined) bundled eagerly — lazy-load on click.
- **L-8.** `.gitignore` is 71 bytes; almost certainly under-covered. Verify `.env*`, `infra/`, `db/`, `node_modules/`, `build/`, `.amplify/` are excluded.
- **L-9.** Memory file `memory.md` still says "Vite" and "8 internal pages" — actually CRA + 14 internal pages + 7 customer pages.
- **L-10.** Unused `REACT_APP_HUNTER_API_KEY` in `.env.local` — frontend never reads it; delete from frontend env.

---

## Recommended fix order (by ROI)

Original order is preserved here as a historical record. As of 2026-04-27 evening, items 1–7 are CLOSED; only the optional M-2/M-3 work remains in this list.

| # | Item | Status |
|---|---|---|
| 1 | C-1 close port 5432 to internet | **CLOSED 2026-04-27** (VPC + NAT migration) |
| 2 | C-2 rotate DB password + Secrets Manager | **CLOSED** |
| 3 | C-3 add Cognito Authorizer to API Gateway | **CLOSED** |
| 4 | C-4 + C-5 fix `getCompanyId` and frontend token key | **CLOSED** |
| 5 | H-1 CORS lockdown | **CLOSED** at Lambda layer |
| 6 | H-3 split IAM roles | **CLOSED** (per-Lambda roles) |
| 7 | H-7 + H-8 prompt-injection + rate limits | **CLOSED** |
| 8 | M-2 deletion protection on Aurora + Cognito | open — 5-min cleanup |
| 9 | M-3 Aurora multi-AZ (HA + warrants dual-AZ NAT) | open — cost decision |

---

## What the auditor saw vs. what's documented

| Memory says | Reality |
|---|---|
| 2 user-written Lambdas | 6 (added: `smartlift-tdlr-refresh`, `smartlift-ai-scorer`, `smartlift-maintenance-reminder`, `golden-signature-contact`) |
| Build = Vite | CRA (`react-scripts` 5.0.1) |
| 8 internal pages | 14 internal + 7 customer + 2 auth = 23 page components |
| Multi-tenancy enforced via `getCompanyId()` from JWT | Function exists but **fails open to company_id=1** on any error path |
| `smartlift-api` removed from VPC | Confirmed — but `smartlift-ai-scorer` IS in the VPC |
| Single founding client (Southwest Cabs) | Confirmed — DB shows 1 row in `companies`, `customers`, `company_users`, 8 prospects, 37 prospect_contacts |
| TDLR data in Postgres | Confirmed — 74,001 rows in `building_registry`, 365 contractors, 207 inspectors |

---

_End. To re-run any check, the raw configs are saved in `infra/`, the schema is in `db/schema.md`, and the Lambda source is in `lambda/`._
