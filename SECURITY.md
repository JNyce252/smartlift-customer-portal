# Smarterlift — Security Review

_Generated 2026-04-26 from a complete pull of the live AWS account, all 6 Lambda sources, the React frontend, and a live introspection of the production Postgres schema. Every finding is grounded in a file:line, a configuration value, or a verified live test._

> **Bottom line:** the application is a functional MVP whose **production data is currently reachable from the open internet** without authentication. I confirmed this empirically — I connected to the Aurora cluster from a sandbox using only the credentials present in the codebase, with no IP allowlist required. The most urgent items below should be fixed before adding the second tenant or any further production usage. Most fixes are small.

---

## Severity-ranked findings

### CRITICAL — fix today

#### C-1. Aurora's security group is open to the internet on port 5432

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

#### H-5. Inconsistent / missing `company_id` on key tables

`db/schema.md`

Tables **without** `company_id` (14 of 40):
- `activities` — has `prospect_id` and `user_id` but no `company_id`. **Cross-tenant leak vector** — if not strictly cascaded by `prospect_id`, a tenant-2 user could query tenant-1 activity. (Currently empty — fix before populating.)
- `service_requests` — customer-facing. (Currently empty.) `service_tickets` does have `company_id`. Pick one.
- `contacts` — appears legacy; `prospect_contacts` is the live one (37 rows).
- `news_mentions`, `lead_scores`, `high_priority_leads`, `customer_elevator_summary` — likely views/derived; verify.
- `building_registry`, `elevator_contractors`, `elevator_inspectors`, `hotels`, `buildings`, `hotel_contacts` — reference / public TDLR data, intentionally global. Document this explicitly.
- `companies` — root; intentional.

**Fix:**
1. Add `company_id NOT NULL` + index to `activities`, `service_requests`, `contacts` (or drop if dead).
2. For confirmed-global tables (`building_registry`, contractors, inspectors), add a one-line comment in `db/schema.md` saying **"global reference data; intentionally not tenant-scoped."**
3. Add a CI check: any new table must declare `company_id` or be on an explicit allowlist.

#### H-6. Cognito user pool is a sandbox deployment in production

`infra/cognito/user-pool-main.json`

The pool tags include `amplify:deployment-type: sandbox`. `DeletionProtection: INACTIVE`. `MfaConfiguration: OFF`. Five real users live in this pool; an `amplify sandbox delete` could remove them.

Group precedence is also inverted: `CompanyUsers` has precedence=1 (highest), `Owners`=10. In Cognito, **lower number wins.** A user in both Owners and CompanyUsers will be evaluated as `staff`, not `owner`. The role decoder in `AuthContext.jsx:14-27` and `authService.js:21-27` happens to check Owners first regardless of precedence so the bug doesn't bite at runtime — but the precedence numbers are misleading and will trip whoever fixes a related bug later.

**Fix:**
1. Promote the pool to a non-sandbox stack (Amplify Gen 2 `amplify push --branch prod` or migrate users to a fresh pool). Set `DeletionProtection: ACTIVE`.
2. Enable MFA — at minimum optional for Customers, **required for Owners**. This is the role with full DB-mutating power in the app.
3. Re-set group precedence: Owners=1, Sales=2, Technicians=3, Staff=10, Customers=20.

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

| # | Item | Time | Why first |
|---|---|---|---|
| 1 | C-1 close port 5432 to internet | 30 min | Removes the worst attack surface |
| 2 | C-2 rotate DB password + Secrets Manager | 2 h | Removes plaintext-in-source risk |
| 3 | C-3 add Cognito Authorizer to API Gateway | 2 h | Re-imposes auth boundary |
| 4 | C-4 + C-5 fix `getCompanyId` and frontend token key | 2 h | Without C-3 these are catastrophic; with C-3 they're still important |
| 5 | H-1 CORS lockdown | 30 min | Trivial, removes browser-side amplification |
| 6 | H-3 split IAM roles | 2 h | Reduces blast radius of any future RCE |
| 7 | H-7 + H-8 prompt-injection + rate limits | 3 h | Cost protection on Bedrock + email |
| 8 | M-2 deletion protection on Aurora + Cognito | 5 min | Cheap insurance |

Total to clear all CRITICAL + HIGH: roughly one focused day.

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
