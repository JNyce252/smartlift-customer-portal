# Smarterlift — Customer Portal Review

_Generated 2026-04-27 from a deep read of the 7 customer-portal pages, the auth/services/routing surface that supports them, and the corresponding `lambda/smartlift-api` route handlers. Findings are file:line-grounded._

> **Bottom line (updated 2026-04-27, CH-3 done):** post the recent C-1..C-5 + H-1..H-8 + M-8a closures plus this session's customer-portal work (CH-1 priority cap + CH-2 contact-info de-hardcode + CH-3 column enumeration), **the customer portal has no CRITICAL or HIGH findings remaining.** Remaining work is a MEDIUM list of consistency / info-disclosure / unfinished-feature items, plus LOW polish. The Stripe/billing flow is the single largest unfinished feature.

---

## Pre-existing closures relevant to the customer portal

The original `SECURITY.md` closures already harden the customer side substantially, and that's important context:

| Item | Effect on customer portal |
|---|---|
| C-3 (API Gateway authorizer) | Customer JWTs required on every protected route |
| C-4/C-5 (auth context + token-key fix) | `getAuthContext()` now returns `{ companyId, customerId, role }`; `authService` writes single source of truth at `localStorage['smartlift_auth']` (verified — no stale `'smartlift_token'`/`'smartlift_user'` reads remain anywhere in `src/`) |
| H-1 (CORS lockdown) | Customer-portal origin allowlist enforced server-side |
| H-2 (TLS verify) | Aurora connections from the API now validate the RDS root CA |
| **M-8a (within-tenant scoping)** | `GET /elevators`, `/tickets`, `/invoices`, `/maintenance`, `/documents` now `WHERE customer_id = $X` when role is `'customer'`; `POST /tickets` forces `customer_id` to authenticated id and verifies `elevator_id` ownership; `PATCH /profile` 403s for customers |

So the audit boundary is sound. What's left is mostly application-layer hygiene and a few real abuse vectors.

---

## Severity-ranked findings

### CRITICAL — fix today

_None._

---

### HIGH — fix this week

#### CH-1. `POST /tickets` accepts customer-controlled `priority` ('emergency' is amplified) (**CLOSED 2026-04-27**)

**Closure:** Server-side priority whitelist (`{low,medium,high,emergency}`) plus customer-emergency rate-limit at 3/24h. The 4th+ emergency from the same `customer_id` within 24h silently downgrades to `'high'` and writes an `activity_log` row (`action='emergency_downgraded'`) carrying the original priority, applied priority, count-in-window, and reason — so staff have an audit trail for abuse pattern analysis. Internal users (Owner/Sales/Tech) skip the rate-limit entirely; their emergency tickets remain uncapped. Notification re-reads from the stored row so a downgraded ticket fires `🔔 New Service Request`, not `🚨 Emergency Service Request`. Real customer emergencies (stuck elevator, safety hazard) under the cap are unimpaired. Implementation: `lambda/smartlift-api/index.mjs` POST /tickets handler.

#### CH-2. Hardcoded internal staff email in customer-facing UI (**CLOSED 2026-04-27**)

**Closure:** All three customer pages now source contact info from the `company_profile` row that `GET /profile` returns:
- `BillingPayments.jsx` — added `/profile` fetch alongside `/invoices`. The Pay Now CTA's `mailto:` uses `profile.email`. CTA is hidden entirely if `profile.email` is unset (avoids a broken link).
- `Support.jsx` — Email Us button gates on `profile.email` being present; falls back to non-clickable "Contact your service provider" copy if missing. No more `'derald@swcabs.com'` literal in the fallback.
- `ServiceRequest.jsx` — added `/profile` fetch. Emergency banner phone uses `profile.phone` (raw for display, digits-only for the `tel:` scheme). Banner button is conditional on the phone existing — if it's not set, the warning text shows without a clickable number rather than a stale one.

For tenant 1 (Southwest Cabs), the customer-visible behavior is identical (the `company_profile` row already had `email = derald@swcabs.com` and `phone = 972-974-7005`). The fix is structural — when tenant 2 onboards, *their* `company_profile` row drives *their* customers' UI.

#### CH-3. Within-tenant data over-exposure: customer-callable routes return `SELECT *` (**CLOSED 2026-04-27**)

**Closure:** Customer-role callers on the 5 affected GET handlers now receive a curated column list instead of `SELECT *`. Internal users (Owner/Sales/Tech/Staff) still see `*` — the change is gated on `authRole === 'customer'`. Centralized in a `CUSTOMER_COLUMNS` constant near the auth helpers in `lambda/smartlift-api/index.mjs`, so adding/removing customer-visible fields is a one-line edit per table.

| Table | Columns dropped for Customer-role callers |
|---|---|
| `elevators` | `risk_score`, `notes`, `created_at`, `updated_at`, `company_id` |
| `service_tickets` | `resolution_notes`, `assigned_technician_id`, `company_id` |
| `maintenance_logs` | `cost`, `company_id` |
| `invoices` | `notes`, `company_id` |
| `documents` | `notes`, `created_by`, `prospect_id`, `company_id` |

Kept for customers (deliberate product decisions worth flagging):
- `service_tickets.assigned_technician` (name) — most service businesses show the customer who their tech is. Toggle to drop if product disagrees.
- `invoices.line_items` — required for itemized invoice display.
- `elevators.modernization_needed`, `parts_history` — informational; customers benefit from seeing modernization signals.

Verified via Data API: the customer-column SELECT against ELV-001 (Otis Gen2) returns the curated row with no `risk_score` in the response.

---

### MEDIUM

#### CM-1. BillingPayments is a read-only stub — no actual payment integration

`src/pages/customer/BillingPayments.jsx:203` carries a comment promising Stripe support ("Pay Now button — Stripe ready"). There is no Stripe SDK loaded anywhere in the bundle, no client-side Payment Intent, no public Stripe key in `.env.local`, and the actual CTA at line 209 opens a `mailto:` to Derald.

Customer impact: building owners click "Ready to pay online?" and get an email composer. Confusing and unprofessional. Two paths:

- **Wire Stripe properly** — public key in env (HTTPS-restricted), server-side `POST /invoices/:id/payment-intent` endpoint, Stripe Elements card form. ~1 day of work plus Stripe account setup.
- **Remove the stub** — change the section to "Online payments coming soon" until you're ready. ~5 minutes, removes false advertising.

I recommend the second option until tenant 2 timing is clearer, then revisit.

#### CM-2. Direct `fetch()` calls bypass `src/services/api.js` in 4 customer pages

`CustomerDashboard.jsx:24`, `BillingPayments.jsx:24`, `Documents.jsx:27`, `Support.jsx:48–49` all use raw `fetch(BASE_URL + '/...')` with manual auth header construction. The api.js wrapper (`src/services/api.js`) is the canonical place for that, and it correctly handles token retrieval via `authService`. The direct-fetch pattern duplicates auth-header logic and risks divergence if the token storage scheme ever changes again (we just had to fix that exact bug in C-5).

**Fix:** add the missing endpoints to `api.js`:
```js
getProfile: () => request('/profile'),
getInvoices: () => request('/invoices'),
getDocuments: () => request('/documents'),
getCustomerTickets: () => request('/tickets'),
```
Then replace each direct `fetch` site with the wrapper. Mechanical change, ~20 minutes.

#### CM-3. `Documents.jsx` renders un-validated `file_url` as `target="_blank"`

`src/pages/customer/Documents.jsx:175` renders document links with `target="_blank" rel="noopener noreferrer"` (good — `noopener` is in place), but doesn't validate the URL scheme or domain. If an internal user (or a future bug) writes a `javascript:` or `file://` URL into `documents.file_url`, the customer's browser will execute it.

**Fix:** validate scheme on render:
```jsx
const safeUrl = /^https:\/\//i.test(doc.file_url) ? doc.file_url : null;
return safeUrl ? <a href={safeUrl} target="_blank" rel="noopener noreferrer">{doc.name}</a> : <span>{doc.name} (invalid link)</span>;
```
Or validate at write-time on `POST /documents` server-side.

#### CM-4. Unguarded `JSON.parse()` on API response fields

Two locations parse JSON inline without try/catch:
- `MaintenanceHistory.jsx:158` — `JSON.parse(log.parts_replaced)` if API stores parts as a JSON string
- `BillingPayments.jsx:116` — `JSON.parse(invoice.line_items)` if line_items is a JSON string column

If the underlying column is malformed, the entire page throws and React unmounts the route to a blank screen. (This is the same flavor of bug as the in-flight `tdlr_elevators` rename — a latent bug becomes a hard failure.)

**Fix:** wrap in try/catch with a fallback:
```js
let parsed = [];
try { parsed = typeof line_items === 'string' ? JSON.parse(line_items) : (line_items || []); } catch { parsed = []; }
```

#### CM-5. No customer profile editor

The customer-portal frontend has no page for the customer to view or edit their OWN record (the row in `customers` keyed by their `cognito_user_id`). `GET /profile` returns the SERVICE company's profile (Southwest Cabs), which is intentional — customers should see their service provider's info — but there's no page where a customer can update *their own* contact phone, billing address, or designated point-of-contact name. They'd have to call Derald to ask.

**Fix:** add `GET /me/customer` and `PATCH /me/customer` Lambda routes that return/update the caller's own row in `customers` (scoped by `customerId` from `getAuthContext`). Add a `CustomerProfile.jsx` page at `/customer/profile`. Modest scope.

#### CM-6. Support form's category field is customer-controlled, no server-side whitelist

`src/pages/customer/Support.jsx:62-63` submits a `category` field. The Lambda accepts it and stores it directly. Same shape of issue as CH-1 (priority): a customer can submit any string, and an attacker could log noise. Lower-impact than priority because there's no notification amplification, but still worth a server-side whitelist.

#### CM-7. `Support.jsx` fetches all tickets, slices to 5 client-side

Line 49 calls `GET /tickets` (which returns up to 100 rows post-M-8a's customer scoping), then `slice(0, 5)` to display 5 recent ones. Wasteful at scale; once a heavy-using customer has hundreds of tickets, every Support page load drags the full list across the wire.

**Fix:** add `?limit=5` to the Lambda and respect it server-side in `GET /tickets`.

#### CM-8. PrivateRoute customer→internal redirect can loop

`src/components/common/PrivateRoute.jsx:15` — when a Customer-role user lands on an internal-only route, the redirect target is `/internal/dashboard`, which `PrivateRoute` then bounces back. With `react-router-dom v7`, this should consolidate to one navigation, but the intent is wrong: a customer hitting `/internal/...` should land on `/customer/dashboard`, not be invited to retry an internal page.

**Fix:** make the bounce role-symmetric — internal→customer should send to `/internal/dashboard`, customer→internal should send to `/customer/dashboard`.

#### CM-9. `App.jsx` catch-all redirects to `/login` for authenticated users

`src/App.jsx:62-63` sends `/` and `*` to `/login`. A logged-in customer who hits `smarterlift.app` lands on the login page first, then the `Login` component redirects based on auth state — works, but it's a double-redirect that flickers. Trivial to fix:

```jsx
<Route path="/" element={<NavigateToHome />} />  // checks isAuthenticated, sends to /customer/dashboard or /internal/dashboard
```

---

### LOW

- **CL-1.** `derald@swcabs.com` and the `(972) 974-7005` phone number are also hardcoded in `ServiceRequest.jsx:175,177` (emergency contact). Same fix as CH-2 — pull from `company_profile`.
- **CL-2.** Phone-number-to-tel: sanitization (`.replace(/\D/g,'')`) is duplicated inline 3 times across CustomerDashboard, ServiceRequest, Support. Extract to `src/utils/phone.js`.
- **CL-3.** `Support.jsx` FAQ section (lines 9–34) is hardcoded. Move to a CMS-able config (or even a JSON file in `public/`) so it can change without redeploy.
- **CL-4.** `BillingPayments` "Ready to pay online?" mailto button has confusing CTA text given there's no online payment yet — fix in concert with CM-1.
- **CL-5.** `CustomerDashboard.jsx:123` displays raw `error.message` in the error state. Use a generic "Something went wrong" with a retry button; log details to console for debugging.
- **CL-6.** `MyElevators.jsx:241` renders `elevator.notes` raw — currently an internal field per CH-3, but if/when a customer-visible notes field is added, it should be sanitized for HTML.
- **CL-7.** `Documents.jsx`: page title implies upload capability, but only download is wired. Either add upload or rename to "Documents library" / "Your documents" to set expectations.
- **CL-8.** ServiceRequest.jsx common-issue buttons (line 261) **replace** the title field instead of appending. UX papercut.
- **CL-9.** Empty-state copy is unclear in MaintenanceHistory.jsx and Documents.jsx — reads the same whether the underlying list is empty vs. filtered to zero.
- **CL-10.** `MaintenanceHistory.jsx:134` — `cost` field rendering uses `toLocaleString()` without a guard for null/NaN. Either format with `Intl.NumberFormat` or coerce-then-fallback.

---

## Recommended fix order (by ROI)

| # | Item | Severity | Time | Why this position |
|---|---|---|---|---|
| 1 | CH-1 cap customer-submitted `priority` server-side | HIGH | 15 min | One Lambda edit, eliminates a real abuse vector. Ship first. |
| 2 | CH-2 + CL-1 stop hardcoding `derald@swcabs.com` / phone | HIGH | 30 min | Single change pulls from `profile`. Tenant-2 blocker. |
| 3 | CM-1 either wire Stripe or remove the stub UI | MEDIUM | 5 min (remove) – 1 day (wire) | Stop the false advertising. |
| 4 | CH-3 enumerate column lists for customer-scoped responses | HIGH | 30 min | Trims info disclosure within tenant. |
| 5 | CM-4 wrap inline `JSON.parse` with try/catch | MEDIUM | 15 min | Defense against bad data → blank screens. |
| 6 | CM-3 validate `file_url` scheme in Documents.jsx | MEDIUM | 10 min | Cheap XSS-vector defense. |
| 7 | CM-2 normalize the 4 direct-fetch sites to api.js | MEDIUM | 20 min | Consistency; protects against future token-key drift. |
| 8 | CM-5 add `/me/customer` GET+PATCH and a profile page | MEDIUM | 2-3 h | Real feature gap, single biggest UX win. |
| 9 | CM-6 server-side whitelist for `/tickets` category | MEDIUM | 10 min | Same shape as CH-1; do them together. |
| 10 | CL-2..CL-10 polish | LOW | 1-2 h total | After everything else. |

Total to clear all HIGH + MEDIUM: roughly half a day if Stripe is deferred; full day if Stripe is wired.

---

## What I'm not yet sure about (open questions)

1. **What does `documents.file_url` currently point at?** S3 (presigned), a public CDN, a third-party Drive link, or none-of-the-above? CM-3's fix depends on the answer. If S3 presigned, there's a TTL question too.
2. **Does `maintenance_logs.cost` represent customer-billed cost or internal cost?** Determines whether it stays in or comes out of the customer-scoped column list (CH-3).
3. **Is there an intent to give Customer-role users a way to manage payment methods on file (Stripe SetupIntent), separate from one-off invoice payments?** Affects the Stripe wiring scope.
4. **Should customers be able to see the `assigned_technician` name on their open tickets?** Some service businesses expose it ("Your technician today is Mark") and some keep it internal. Product call.

---

_End. To regenerate, point me at any specific page / route and I'll deepen the corresponding section._
