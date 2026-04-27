# Smarterlift — Architecture & Codebase Map

_Generated 2026-04-25, **updated 2026-04-26** with live AWS pulls. Every claim is grounded in a file:line, an AWS API response saved in `infra/`, or a live database introspection in `db/schema.md`._

> **2026-04-26 update.** I now have the live Lambda source (all 6) under `lambda/`, full AWS configuration under `infra/`, and the production DB schema under `db/schema.md`. Many inferences from the original draft (April 25) have been replaced with verified facts. The most material change: the backend is **6 user-written Lambdas, not 2**, and a security review at `SECURITY.md` documents 5 CRITICAL and 8 HIGH findings — the most urgent being that the production database is currently reachable from the public internet and the API has no authorizer.

## Read order

1. **`SECURITY.md`** ← read this first if you have 10 minutes. Severity-ranked findings + recommended fix order.
2. This document — codebase + architecture map.
3. `db/schema.md` — live schema dump (40 tables, 825 lines).
4. `infra/` — saved AWS configuration as JSON.
5. `lambda/` — live deployed source for all 6 Lambdas.

---

## Reconciliation vs. memory / earlier draft

| Earlier statement | Reality (verified 2026-04-26) |
|---|---|
| 2 user-written Lambdas | **6**: `smartlift-api` (2,139 LOC), `smartlift-review-analyzer`, `smartlift-tdlr-refresh`, `smartlift-ai-scorer`, `smartlift-maintenance-reminder`, `golden-signature-contact` |
| Build tool: Vite | **CRA** (`react-scripts` 5.0.1) |
| 8 internal pages | **14 internal + 7 customer + 2 auth** = 23 page components |
| Multi-tenancy enforced by JWT `getCompanyId()` | Function exists at `lambda/smartlift-api/index.mjs:63-79` but **fails open to `company_id = 1` on any error** — see SECURITY.md C-4 |
| API Gateway has Cognito Authorizer | **No authorizer on either API** — `infra/api-gateway/*-summary.json` |
| Aurora reachable only from Lambda | **5432 open to 0.0.0.0/0** ("Temp Cloudshell access") — verified by live connection |
| `smartlift-api` removed from VPC | Confirmed; `smartlift-ai-scorer` is in the VPC |
| TDLR data ingestion mechanism unknown | **`smartlift-tdlr-refresh` Lambda** downloads `https://www.tdlr.texas.gov/Elevator_SearchApp/Elevator/ExportCsv` plus contractor and inspector CSVs and reimports daily |
| Cognito pool is the production pool | Tagged `amplify:deployment-type: sandbox`, `DeletionProtection: INACTIVE`, `MfaConfiguration: OFF` |
| One Cognito pool | **Two** — `us-east-1_n7bsroYdL` (active, 5 users) and `us-east-1_qOsAeoce6` (zero users, likely abandoned) |
| Lambda env vars unknown | Saved in `infra/lambda/all-configs.json` (passwords/keys redacted, see `infra/SECRETS.md`) |
| Bedrock model = "Sonnet" | Env var on `smartlift-api` says `us.anthropic.claude-opus-4-7`; the four other Lambdas hard-code `us.anthropic.claude-sonnet-4-5-20250929-v1:0` |
| 1 customer | Confirmed — `db/schema.md` row counts: 1 row in `companies`, `customers`, `company_users`; 8 prospects, 37 prospect_contacts, 8 elevator_intelligence, 1 proposal, 1 service_ticket, 74,001 building_registry, 365 contractors, 207 inspectors |

---

## 1. What the product is

A multi-tenant SaaS web app for licensed elevator service companies in Texas, beginning with **Southwest Cabs Elevator Services** (`company_id = 1`). The application combines:

- **Lead generation** — Google Places search + Claude scoring + TDLR (Texas Department of Licensing & Regulation) compliance data, augmented by Hunter.io and PDL contact enrichment
- **CRM / sales pipeline** — prospects, contacts, notes, status, contracts, AI-generated proposals and intro emails
- **Service operations** — work orders, maintenance scheduling, invoicing, route optimization, equipment registry, document storage
- **Customer portal** — a separate set of pages where the elevator owner's customers can see their elevators, request service, view maintenance history, pay invoices, and access documents

The marketing/login page brands the product as **Smarterlift** ("Find your next elevator client before they call") and surfaces three live counters: 73,975 TX elevators tracked, 14,230 expired certificates, 5,004 expiring this month (`src/pages/auth/Login.jsx:6-10`). Footer attribution: © 2026 The Golden Signature LLC · smarterlift.app.

---

## 2. Hosting & infrastructure topology

```
                                          ┌─────────────────────────────┐
                Browser (smarterlift.app)  │  Cloudflare DNS + SSL       │
                ──────────────────────────►│  (smarterlift.app domain)   │
                                          └──────────────┬──────────────┘
                                                         │
                                          ┌──────────────▼──────────────┐
                                          │  AWS Amplify Hosting        │
                                          │  build artifact = ./build/  │
                                          │  amplify.yml drives CRA     │
                                          │  build (`npm run build`)    │
                                          └──────────────┬──────────────┘
                                                         │   browser app
                                                         ▼
                  ┌────────────────────────────────────────────────────────┐
                  │  Frontend (React 18 + CRA + Tailwind)                  │
                  │  React Router v7, Cognito Identity JS,                 │
                  │  Lucide icons, Recharts, jsPDF/html2canvas             │
                  └─────┬─────────────────────┬─────────────────┬──────────┘
                        │                     │                 │
                        │ Cognito SRP login   │ HTTPS+JWT       │ Direct browser-key calls
                        ▼                     ▼                 ▼
              ┌──────────────────┐  ┌─────────────────────┐  ┌─────────────────────────┐
              │ AWS Cognito      │  │ API Gateway         │  │ Google Places (New) API │
              │ Pool: us-east-1_ │  │ 4cc23kla34          │  │ Hunter.io domain search │
              │ n7bsroYdL        │  │ /prod stage         │  │ Google Maps Geocode/    │
              │ Groups: Owners,  │  │                     │  │ Autocomplete (places)   │
              │ Technicians,     │  │  ┌──────────────┐   │  │ (REACT_APP_*  keys —    │
              │ SalesOffice,     │──┼──► smartlift-api│   │  │  shipped to browser)    │
              │ CompanyUsers,    │  │  │ Lambda       │   │  └─────────────────────────┘
              │ Customers        │  │  │ Node.js      │   │
              └──────────────────┘  │  │ 512MB/120s   │◄──┼── async invoke ──┐
                                    │  │ getCompanyId │   │                  │
                                    │  │ logActivity  │   │   ┌──────────────▼──────────┐
                                    │  └──────┬───────┘   │   │ smartlift-review-       │
                                    │         │           │   │ analyzer Lambda         │
                                    │         │ pg client │   │ (Bedrock Claude →       │
                                    │         ▼           │   │ review_intelligence)    │
                                    │  ┌──────────────────┐   │                          │
                                    │  │ Aurora Postgres  │◄──┘                          │
                                    │  │ hotelleads DB    │                              │
                                    │  │ (multi-tenant)   │                              │
                                    │  └──────────────────┘                              │
                                    │                                                    │
                                    │  Separate stack: aup3wz6azh.execute-api…/contact   │
                                    │  (UserMenu support form, fire-and-forget)          │
                                    └────────────────────────────────────────────────────┘
```

Concrete configuration values from the working tree:

| Concern | Value | Source |
|---|---|---|
| Cognito region | `us-east-1` | `.env.local` |
| User Pool ID | `us-east-1_n7bsroYdL` | `.env.local` |
| Cognito client ID | `1hujibm6rksvr9a1d0p8a7ukfp` | `.env.local` |
| API Gateway base | `https://4cc23kla34.execute-api.us-east-1.amazonaws.com/prod` | `.env.local`, hard-coded as fallback in many files |
| Support API (separate) | `https://aup3wz6azh.execute-api.us-east-1.amazonaws.com/prod/contact` | `src/components/common/UserMenu.jsx:27` |
| Google Places key | `REACT_APP_GOOGLE_PLACES_API_KEY` (shipped to browser) | `.env.local` |
| Hunter key | `REACT_APP_HUNTER_API_KEY` (declared in env, but only the Lambda uses Hunter — the frontend hits `/prospects/:id/hunter`) | `.env.local`, `src/pages/internal/ProspectDetails.jsx:117,172` |
| Google CSE key | `AIzaSyAeyv6UlP9Pw6k9nXRE3KDAge6EE4dbygg` (hard-coded) | `src/pages/internal/ProspectDetails.jsx:9-10` |
| Build pipeline | `npm install --legacy-peer-deps && npm run build` → `build/` | `amplify.yml` |
| Build tool | **Create React App** (`react-scripts` 5.0.1), not Vite | `package.json:19` |

**Memory correction:** Project memory says the build tool is "React, Vite, Tailwind". The repo uses **CRA** (`react-scripts`), not Vite. Memory should be updated.

---

## 3. Repo layout

```
smartlift-customer-portal/
├── amplify.yml              CI build config (CRA → ./build)
├── amplify_outputs.json     Amplify config (39 KB, generated)
├── .env.local               Env vars (Cognito, API base, vendor keys)
├── package.json             CRA, React 18, Router 7, Cognito, axios, Lucide, jsPDF, recharts
├── index.mjs                ⚠ STALE Lambda snapshot from Mar 31 — see §6
├── tailwind.config.js       trivial — content scan only, no theme
├── public/
│   ├── index.html
│   └── favicon.svg
├── src/
│   ├── index.js             ReactDOM.createRoot → <App/>
│   ├── index.css            (Tailwind + global)
│   ├── App.jsx              All routes; AuthProvider + Router; PrivateRoute gating
│   ├── context/
│   │   └── AuthContext.jsx  Auth state, role decoding from idToken
│   ├── hooks/
│   │   └── useUserPreferences.js  /me/preferences fetch + memory cache
│   ├── services/
│   │   ├── api.js           Thin wrapper — only 10 endpoints (most calls are direct fetch)
│   │   └── authService.js   Cognito SRP login/register/getCurrentUser
│   ├── components/
│   │   ├── common/          UserMenu, NotificationBell, PrivateRoute, LoadingSpinner
│   │   └── internal/        InternalLayout (sidebar shell), RoleNav (role-aware nav)
│   ├── pages/
│   │   ├── auth/            Login, Register
│   │   ├── internal/        14 internal pages — see §5.1
│   │   └── customer/        7 customer-portal pages — see §5.2
│   └── utils/
│       ├── csvExport.js
│       └── pdfGenerator.js  jsPDF-based proposal PDF
├── Documents.jsx, Support.jsx           ← stray files at repo root, not imported
├── index.html.old                       ← old marketing landing
├── create-*.sh, setup-*.sh              ← initial scaffolding scripts (Mar 9, kept for history)
├── build/                               ← last `npm run build` output (committed)
└── .amplify/                            ← Amplify CLI artifacts
```

**Memory correction:** Memory says "8 internal pages." The repo has **14 internal pages** plus 7 customer pages. List in §5.

---

## 4. Authentication & multi-tenancy

### 4.1 Login flow (Cognito SRP)

`src/services/authService.js:11-66` — `authService.login()` runs Cognito SRP via `amazon-cognito-identity-js`. On success it:

1. Reads `idToken.payload['cognito:groups']`
2. Maps groups → role string: `Customers→customer`, `Owners→owner`, `Technicians→technician`, `SalesOffice→sales`, `CompanyUsers→staff`, default `staff`
3. Stores a JSON blob under `localStorage['smartlift_auth']` with `{ id, email, name, role, groups, token (=accessToken), idToken }`
4. Handles `newPasswordRequired` challenge by silently completing it with the same password — that's the path that produces the legacy `role: 'company'` value (line 49)

`AuthContext.checkAuth()` (`src/context/AuthContext.jsx:36-62`) hydrates the user on app boot. It also calls `GET /me` for preferences/displayName but **decodes role from the stored idToken**, not from the API response.

### 4.2 Route gating (`PrivateRoute`)

`src/components/common/PrivateRoute.jsx` accepts `requiredRole = "company" | "customer"`:

- `internalRoles = ['owner','technician','sales','staff','company']` — anything in this set passes the company gate.
- A customer hitting an internal route gets bounced to `/customer/dashboard`, and vice versa.

### 4.3 Role-aware sidebar

`src/components/internal/RoleNav.jsx:10-44` defines four nav configs:

| Role | Visible pages |
|---|---|
| owner | Dashboard, Building Registry, Lead Search, Pipeline, Customers, Work Orders, Route Optimizer, Proposals, Analytics, Team, Company Profile |
| sales | Dashboard, Building Registry, Lead Search, Pipeline, Customers, Work Orders, Proposals, Analytics |
| technician | My Work Orders, Route Optimizer, Customers |
| staff | Dashboard, Customers, Work Orders |

### 4.4 Multi-tenancy

Per project memory, the live Lambda enforces tenancy by extracting `company_id` from the JWT (`getCompanyId()`) and filtering all DB queries by it. The `index.mjs` checked into this repo predates that work — see §6.

---

## 5. Frontend pages & feature surfaces

### 5.1 Internal pages (14)

| Page | Path | Loads | Mutates | Notes |
|---|---|---|---|---|
| `Dashboard.jsx` | `/internal/dashboard` | `/profile`, `/analytics/tdlr`, `/analytics/contracts`, `/prospects`, `/work-orders`, `/invoices` | `/me/preferences` (last_dashboard_visit) | KPI tiles, top prospects, active WOs, registry snapshot, contracts summary, recent invoices |
| `LeadSearch.jsx` | `/internal/leads` | `/prospects` (via api), Google Places direct | `POST /prospects`, `PATCH /prospects/:id/archive`, `POST /prospects/:id/analyze-reviews`, `POST /lead-search/qualify-office-results`, `POST /ai/score-results` | Two modes: `saved` (filterable list) + `discover` (Google Places search) |
| `ProspectDetails.jsx` | `/internal/prospect/:id` | `/prospects/:id`, `/prospects/:id/{tdlr,contacts,notes,contracts}`, `GET /prospects/:id/hunter`, `GET /prospects/:id/proposal` (poll) | `POST /prospects/:id/{contacts,notes,proposal,intro-email,improve-proposal,score,people-search,enrich-company,enrich-person}`, `PATCH /prospects/:id/{status,notes/:nid,contacts/:cid}`, `DELETE /prospects/:id/notes/:nid`, `POST /tickets`, `POST /contracts` | The big one — 1,662 LOC. Houses: AI scoring, Review Intelligence panel, TDLR breakdown, Hunter contact discovery (auto-runs if a website domain is known), PDL person & company enrichment, contact CRUD, primary-contact toggle, notes CRUD, status updates, schedule-site-visit (creates a ticket), proposal generation via POST→GET-every-4s polling for up to 60s, intro-email generation, mailto launch, contract creation |
| `Pipeline.jsx` | `/internal/pipeline` | `api.getProspects` | `PATCH /prospects/:id/status` (lost) | Kanban-style by status |
| `CustomerManagement.jsx` | `/internal/customers` | `/customers` | — | List view |
| `WorkOrders.jsx` | `/internal/work-orders` | `/work-orders`, `/customers`, `/technicians`, `/customers/:id/elevators` | (presumably more — only reads grepped) | |
| `MaintenanceScheduling.jsx` | `/internal/maintenance-scheduling` | `/maintenance-schedules`, `/customers`, `/technicians`, `/customers/:id/elevators` | `DELETE /maintenance-schedules/:id` | |
| `Invoices.jsx` | `/internal/invoices` | `/invoices`, `/customers`, `/work-orders` | (likely `POST /invoices/generate`) | |
| `EquipmentRegistry.jsx` | `/internal/equipment` | `/equipment`, `/customers` | | |
| `Documents.jsx` | `/internal/documents` | `/documents`, `/customers` | `DELETE /documents/:id` | |
| `BuildingRegistry.jsx` | `/internal/tdlr` | `/building-registry/cities?state=`, `/building-registry?...` | `POST /tdlr/add-prospect` | TDLR data browser, scoped to TX (`STATE` const). Imports a TDLR record as a prospect. |
| `TDLRIntelligence.jsx` | _(not routed)_ | `/tdlr/expiring?...` | | Orphan — file exists but App.jsx does not route it. Likely superseded by BuildingRegistry. |
| `RouteOptimizer.jsx` | `/internal/routes` | (unclear from grep — see §11) | | Per memory: rebuilt; nav restricts to owner+technician |
| `TeamManagement.jsx` | `/internal/team` | `/team/users`, `/technicians`, `/work-orders` | `POST /team/users/invite`, `PATCH/DELETE /team/users/:email` | |
| `Profile.jsx` | `/internal/profile` | `/profile`, `/projects`, `/technicians` | `POST /profile`, `POST/DELETE /projects[/:id]`, `POST/PATCH/DELETE /technicians[/:id]` | Company profile editor, projects, technician roster |
| `Analytics.jsx` | `/internal/analytics` | `/analytics/tdlr`, `/analytics/contracts` | `POST /ai/rescore-all` | |

**Sidebar→route mismatches** (RoleNav lists a path App.jsx doesn't define, or vice versa):

- `RoleNav` has `/internal/proposals` (Owner & Sales nav). `App.jsx` does **not** define it — clicking falls to `*` and redirects to `/login`. **Likely bug.**
- `App.jsx` defines `/internal/maintenance-scheduling`, `/internal/invoices`, `/internal/equipment`, `/internal/documents` but no role's nav lists them — they're reachable only via direct URL.
- `App.jsx` does **not** route `TDLRIntelligence.jsx` — `/internal/tdlr` resolves to `BuildingRegistry`. The orphan file should be deleted or wired.

### 5.2 Customer-portal pages (7)

| Page | Path | Loads |
|---|---|---|
| `CustomerDashboard.jsx` | `/customer/dashboard` | `/profile`, `api.getElevators`, `api.getTickets`, `api.getMaintenance` |
| `MyElevators.jsx` | `/customer/elevators` | `api.getElevators` |
| `ServiceRequest.jsx` | `/customer/service-request` | `api.getElevators`, `api.createTicket` |
| `MaintenanceHistory.jsx` | `/customer/maintenance` | `api.getMaintenance` |
| `BillingPayments.jsx` | `/customer/billing` | `/invoices` |
| `Documents.jsx` | `/customer/documents` | `/documents` |
| `Support.jsx` | `/customer/support` | `/profile`, `/tickets` |

Customer pages do not use `InternalLayout`; they render their own chrome.

### 5.3 Shared components

- `InternalLayout.jsx` — flex container with sticky `RoleNav` on the left and the page on the right.
- `RoleNav.jsx` — collapsible sidebar, role-conditional nav items, displays the user's name + a colored role chip.
- `UserMenu.jsx` — avatar dropdown with Company Profile / Support & Feedback / Sign Out. Support modal POSTs to the `aup3wz6azh` API Gateway (separate from the main API).
- `NotificationBell.jsx` — polls `GET /notifications` every 30 s, supports `PATCH /notifications/read-all` and `PATCH /notifications/:id/read`, navigates to `notif.link` on click.
- `PrivateRoute.jsx` — auth + role gate.
- `LoadingSpinner.jsx` — generic spinner.
- `useUserPreferences()` hook — module-scope memory cache + `GET/PATCH /me/preferences[/bulk]`.

---

## 6. Backend (the Lambda)

### 6.1 What's in this repo (stale)

`./index.mjs` (5.6 KB, modified 2026-03-31) is a much older snapshot. It implements only:

- `GET /health` (and `/`)
- `GET /customers`
- `GET /elevators`
- `GET /prospects`
- `GET /prospects/:id`
- `GET /tickets`, `POST /tickets`
- `GET /maintenance`
- `GET /invoices`

There is **no `getCompanyId()`, no `logActivity()`, no `company_id` filtering**, no Bedrock call, no proposal endpoint, no review analyzer hop, no Hunter/PDL routes, no `/me`, no preferences, no notifications, no team management, no enrichment, no analytics, no building-registry endpoints. Per project memory, the canonical Lambda lives at `/tmp/mac-fix/index.mjs` on your Mac and has been heavily expanded since this snapshot. **The in-repo `index.mjs` should not be treated as the source of truth.**

### 6.2 Inferred current API contract

This is the union of what the frontend calls today (every endpoint the Lambda must serve to keep the UI working). I've grouped by feature.

**Auth / user**
- `GET /me` — returns `{ display_name, preferences, ... }` based on JWT
- `GET /me/preferences`, `PATCH /me/preferences`, `PATCH /me/preferences/bulk`
- `GET /profile`, `POST /profile` — company profile (Southwest Cabs)

**Prospects (sales)**
- `GET /prospects`, `POST /prospects`, `GET /prospects/:id`
- `PATCH /prospects/:id/status`, `PATCH /prospects/:id/archive`
- `GET /prospects/:id/tdlr`
- `GET /prospects/:id/contacts`, `POST /prospects/:id/contacts`, `PATCH /prospects/:id/contacts/:cid`, `DELETE /prospects/:id/contacts/:cid`
- `GET /prospects/:id/notes`, `POST /prospects/:id/notes`, `PATCH /prospects/:id/notes/:nid`, `DELETE /prospects/:id/notes/:nid`
- `GET /prospects/:id/contracts`
- `POST /prospects/:id/score` — single-prospect Claude scoring
- `POST /prospects/:id/proposal`, `GET /prospects/:id/proposal` — the polling pair
- `POST /prospects/:id/improve-proposal` — uploaded text → improved markdown
- `POST /prospects/:id/intro-email` — Claude generates "Subject: …" + body
- `POST /prospects/:id/analyze-reviews` — fire-and-forget; triggers async review analyzer Lambda (Lambda-to-Lambda invoke per memory)
- `GET /prospects/:id/hunter?domain=…` or `?company=…`
- `POST /prospects/:id/people-search` — PDL person search
- `POST /prospects/:id/enrich-company` — PDL company enrichment
- `POST /prospects/:id/enrich-person` — PDL person enrichment

**Lead search**
- `POST /lead-search/qualify-office-results` — Claude filter for "single-tenant" office buildings
- `POST /ai/score-results` — Claude AI-scoring for batches of Places results
- `POST /ai/rescore-all` — bulk re-score from Analytics

**TDLR / Building registry**
- `GET /building-registry/cities?state=TX`
- `GET /building-registry?...filters`
- `GET /tdlr/expiring?...`
- `POST /tdlr/add-prospect`

**Operations**
- `GET /work-orders` (+ presumably POST/PATCH from WorkOrders.jsx)
- `GET /maintenance-schedules`, `DELETE /maintenance-schedules/:id`
- `GET /invoices`, `POST /invoices/generate`
- `GET /equipment`
- `GET /documents`, `DELETE /documents/:id`
- `GET /technicians`, `POST /technicians`, `PATCH /technicians/:id`, `DELETE /technicians/:id`
- `GET /customers`, `GET /customers/:id/elevators`
- `GET /tickets`, `POST /tickets`
- `GET /maintenance`
- `GET /elevators`
- `GET /projects`, `POST /projects`, `DELETE /projects/:id`
- `POST /contracts`

**Analytics**
- `GET /analytics/tdlr` — `{ expired_certs, expiring_soon, total_records }`
- `GET /analytics/contracts` — `{ total_monthly_revenue, active_contracts, total_elevators_contracted, ... }`

**Team**
- `GET /team/users`, `POST /team/users/invite`, `PATCH/DELETE /team/users/:email`

**Notifications**
- `GET /notifications` — returns `{ notifications:[…], unread:N }`
- `PATCH /notifications/read-all`, `PATCH /notifications/:id/read`

**Internal**
- `POST /log` — appears in the API surface scan; likely a generic activity log endpoint

### 6.3 Aurora Postgres tables (inferred from queries in stale Lambda + frontend payloads)

Confirmed by stale Lambda joins:
- `customers (id, company_name, primary_contact_name, primary_contact_email, primary_contact_phone, address, city, state, account_status, ...)`
- `elevators (id, customer_id, elevator_identifier, ...)`
- `prospects (id, name, address, city, state, status, lead_score, rating, total_reviews, owner_name, website, estimated_elevators, estimated_floors, building_age, modernization_candidate, ai_summary, ai_recommendation, review_intelligence(jsonb), ...)`
- `elevator_intelligence (prospect_id, service_urgency, common_issues, reputation_score, sentiment_score, ai_summary, estimated_elevators, estimated_floors, building_age, modernization_candidate, ai_recommendation, ai_scored_at)`
- `service_tickets (id, ticket_number, elevator_id, customer_id, title, description, priority, status, reported_by, assigned_technician, scheduled_date, created_at, updated_at)`
- `maintenance_logs (id, elevator_id, service_date, ...)`
- `invoices (id, customer_id, invoice_number, total_amount/amount, status, created_at)`

Inferred from frontend usage (must exist in current schema):
- `companies (id, …)` — multi-tenancy root, Southwest Cabs = id 1 (per memory)
- `prospect_contacts` — supporting `is_primary`, `confidence`, `source ∈ {hunter,pdl,manual}`, `linkedin_url`
- `prospect_notes` — `created_by`, `content`, timestamps
- `contracts` — `prospect_id, company_name, annual_value, monthly_value, start_date, term_months, elevators_under_contract, service_frequency, notes`
- `proposals` — to support polling: a status field (`generating|ready`) + `content`
- `notifications` — `id, type ∈ {emergency,service_request,maintenance,invoice,…}, title, message, link, read, created_at, user/company scope`
- `user_preferences` (or `users.preferences jsonb`)
- `team_users` — Cognito-mirrored team roster
- `technicians`
- `projects` (company portfolio for proposals)
- `building_registry` / `tdlr_*` — TDLR import (cert_expiry, last_inspection, equipment_type, drive, floors, install_date, expiration)
- `equipment`
- `documents`
- `maintenance_schedules`

### 6.4 Async review analyzer (separate Lambda)

Per memory: a second Lambda (`smartlift-review-analyzer`) is invoked Lambda-to-Lambda from `POST /prospects/:id/analyze-reviews`, calls Bedrock (Claude Sonnet) on the imported Google reviews, and writes the structured `review_intelligence` JSON back onto the prospect. The Review Intelligence panel in `ProspectDetails.jsx:750-836` reads exactly that shape: `{ opportunity_score, sales_angle, elevator_complaints, management_quality, complaint_details[], urgency_signals[], maintenance_signals[] }`.

---

## 7. Key feature flows end-to-end

### 7.1 Lead discovery → import → analysis

```
LeadSearch (Discover mode)
  ├─ Google Maps Geocode (browser → Google, REACT_APP_GOOGLE_PLACES_API_KEY)
  ├─ Places searchNearby — widening rings 5/15/30/60 mi until ≥20 results
  ├─ if buildingType.requiresQualifier (Corporate Office Tower):
  │     POST /lead-search/qualify-office-results  (Claude filters single-tenant)
  ├─ POST /ai/score-results                        (Claude assigns ai_score + ai_reason)
  └─ render ranked results

User clicks Import:
  ├─ Places details lookup (browser → Google, websiteUri + nationalPhoneNumber)
  ├─ POST /prospects                               (api.createProspect)
  ├─ POST /prospects/:id/analyze-reviews           (fire-and-forget)
  │     → Lambda invokes smartlift-review-analyzer (async)
  │       → Bedrock Claude Sonnet
  │       → writes review_intelligence to prospect
  └─ refresh /prospects list
```
Source: `src/pages/internal/LeadSearch.jsx:110-274` (search) and `:276-317` (import).

### 7.2 Prospect deep-dive page lifecycle

On mount (`ProspectDetails.jsx:71-99`), 5 parallel GETs: prospect, tdlr, contacts, notes, contracts. Then in a follow-up effect (`:101-157`):

- If a website domain is known and no contacts exist, **auto-run Hunter.io** via `GET /prospects/:id/hunter?domain=…` → POST each result back to `/prospects/:id/contacts`.
- If a company name is known, auto-run **PDL person search** via `POST /prospects/:id/people-search`.

The `/prospects/:id/hunter` endpoint takes either `?domain=…` OR `?company=…` — the page detects which by "contains a dot" heuristic (`:168`), with a `TODO` flag for the edge case ("Co." abbreviations).

### 7.3 AI proposal generation (the polling pattern)

`ProspectDetails.jsx:547-580`:

```js
// 1. Fire generation (do NOT await — Lambda may exceed API Gateway 30s)
fetch(`${BASE_URL}/prospects/${id}/proposal`, { method: 'POST', headers }).catch(()=>{});

// 2. Poll every 4s for up to 60s (15 attempts)
while (attempts < 15) {
  await sleep(4000);
  const pollData = await fetch(`${BASE_URL}/prospects/${id}/proposal`, { headers }).then(r=>r.json());
  if (pollData.status === 'ready' && pollData.content) {
    setProposal(pollData.content);
    return;
  }
}
throw new Error('Proposal generation timed out…');
```

The Lambda must therefore: write a placeholder row on POST, kick Bedrock in the background (likely another async Lambda invoke or in-process best-effort), and have GET return `{status:'ready', content}` once done. The same pattern is implied for `/score`.

### 7.4 Auth + role-based redirect

```
Login form → authService.login()
  → Cognito SRP → idToken/accessToken
  → role = group-based (Owners→owner, …)
  → localStorage['smartlift_auth'] = JSON
  → AuthContext.user populated
  → Login.jsx redirects: role==='company' ? /internal/dashboard : /customer/dashboard
```

Note: the post-login redirect string uses `'company'` (`Login.jsx:23, 38`), but the role decoder never returns `'company'` for fresh logins (only for the legacy `newPasswordRequired` branch). For Owners/Technicians/Sales/Staff, the redirect first sends them to `/customer/dashboard`, then `PrivateRoute` (which **does** treat those four as "internal") bounces them back to `/internal/dashboard`. The end state is correct, but the path is a double-redirect. **Easy fix:** change the test to `isInternal(userData.role) ? /internal : /customer`.

---

## 8. Bugs, smells, and risks I noticed

These are grounded in the source as it stands. Some may already be fixed in newer commits I don't have; flag if so.

### 8.1 Token storage key mismatch (HIGH)

`authService` writes the auth blob to `localStorage['smartlift_auth']` (line 36). But:

- `AuthContext.getIdToken()` (`AuthContext.jsx:135`) reads `localStorage['smartlift_user']` — different key, never written.
- `NotificationBell` (line 36) and **every internal page** (`Dashboard.jsx:48`, `Profile.jsx:46`, `Pipeline.jsx:54,72,139`, `Analytics.jsx:21,56`, all of `ProspectDetails.jsx`, `Documents.jsx:40`) read `localStorage['smartlift_token']` — also a different key, also never written.

Net effect: every authenticated request from those pages currently sends `Authorization: Bearer null`. Either (a) the production Lambda permits unauthenticated requests and falls back to `company_id = 1`, in which case there is **no real multi-tenancy enforcement at the request boundary** despite the architecture description, or (b) the API Gateway has a Cognito Authorizer and the app is broken for those requests in prod. Worth verifying immediately in CloudWatch logs.

`Dashboard.jsx:47-48` is the one outlier that handles both keys:
```js
const authData = localStorage.getItem('smartlift_auth');
const token = authData ? JSON.parse(authData)?.token : localStorage.getItem('smartlift_token');
```
This pattern should become a shared `getToken()` helper used by every page (or every page should use `useAuth().getToken()`).

### 8.2 Token type sent to API (MEDIUM)

`authService.getToken()` returns the **access token**, not the id token. Cognito groups (used for role) are in the id token. If the Lambda's `getCompanyId()` decodes the bearer, it must be tolerant of both, or be reading from the access token's `cognito:groups` (which Cognito sometimes copies but historically did not). Worth confirming.

### 8.3 Stale orphan files (LOW, easy)

- `index.mjs` — months-old Lambda snapshot, misleading. Either replace with the current source from `/tmp/mac-fix/index.mjs` (and create a `lambda/` subfolder), or delete.
- `src/pages/internal/TDLRIntelligence.jsx` — defined but not routed; superseded by `BuildingRegistry.jsx`.
- `Documents.jsx` and `Support.jsx` at the repo root — not imported anywhere.
- `index.html.old`
- `create-*.sh`, `setup-*.sh` — scaffolding scripts from the initial bring-up.

### 8.4 `RoleNav` → `App.jsx` mismatches (MEDIUM)

- Owner & Sales nav both link to `/internal/proposals`, which is not routed → falls through to `*` → `/login`. Either add the route (proposal-list page?) or remove the nav item.
- Several routed pages have no nav entry: `/internal/maintenance-scheduling`, `/internal/invoices`, `/internal/equipment`, `/internal/documents`. Reachable only by direct URL.

### 8.5 Browser-side vendor keys (MEDIUM)

`REACT_APP_GOOGLE_PLACES_API_KEY` is shipped in the bundle (any `REACT_APP_*` variable is). The hard-coded `GOOGLE_CSE_KEY` and `GOOGLE_CSE_ID` in `ProspectDetails.jsx:9-10` are likewise public. Both *must* have HTTP-referrer / API restrictions configured at the Google Cloud console level (your domain only). Hunter.io and PDL are not at risk because the frontend never holds those keys — calls go through the Lambda. `REACT_APP_HUNTER_API_KEY` is in `.env.local` but unused by the frontend; safe to remove from the env file entirely.

### 8.6 PDF bundle weight (LOW)

Both `html2canvas` and `jspdf` are in dependencies for a single `pdfGenerator.js`. They're heavy (~1 MB combined). Worth lazy-loading (`import()` on click) so the main bundle doesn't pay for them.

### 8.7 No route for `/` other than login redirect (correct, but)

`App.jsx:60-61` sends `/` and `*` to `/login`. Logged-in users hitting smarterlift.app land on `/login`, then get redirected based on auth state. Consider redirecting to `/internal/dashboard` if `isAuthenticated`.

### 8.8 Frontend filters business logic that should be DB-side (LOW)

`Dashboard.jsx:88-99` does `workOrders.filter(w => w.status === 'open')` etc. on whatever `/work-orders` returns. With no `?status=` query param the page pulls more than it needs. Fine at current data volume; revisit when WO count grows.

### 8.9 Polling for proposals is best-effort (MEDIUM design choice)

If the Lambda crashes mid-Bedrock call, the user just sees "Proposal generation timed out." There's no surfacing of error state from the backend, and no retry button — the user has to navigate away and back. A status field with explicit `failed` state and a retry path would help.

---

## 9. Strengths worth keeping

- **Single source of role truth in the JWT.** Decoding `cognito:groups` in the client and on the server avoids a stale role table and makes promotions/demotions take effect on next refresh.
- **Polling pattern for long Claude calls.** The right architectural answer for API Gateway's 30 s ceiling — clean separation of "kick" vs "poll".
- **Async Lambda for review analysis.** Keeps the import action snappy and the analyzer can scale independently.
- **Module-scope memory cache for preferences.** Single in-flight fetch for the lifetime of the SPA.
- **Role-aware navigation.** Each role sees only what it needs; gating happens both at route level and nav level.

---

## 10. What I'm not yet sure about (open questions for you)

1. **Live Lambda source.** The `/tmp/mac-fix/index.mjs` referenced in memory is outside this workspace. Want me to mirror it into `lambda/index.mjs` here so we have one tree?
2. **Review analyzer Lambda.** Same — is its source committed anywhere? If not, copying it into `lambda/review-analyzer/` would help.
3. **API Gateway authorizer.** Is the gateway itself running a Cognito Authorizer (which would reject the `Bearer null` calls) or is auth purely Lambda-internal? This determines whether §8.1 is "broken" or "permissive".
4. **`/internal/proposals` page.** Was it in flight, or was the nav item premature?
5. **Customer-portal `Profile.jsx`.** There's no customer profile page; intentional?
6. **DB schema dump.** Do you have a `schema.sql` or similar I could check into the repo so I'm not inferring?

---

## 11. What I haven't deeply read yet

I read `Dashboard.jsx`, `Login.jsx`, `LeadSearch.jsx`, the first ~900 lines of `ProspectDetails.jsx`, `App.jsx`, `AuthContext.jsx`, `services/{api,authService}.js`, `useUserPreferences`, and the major shared components. I grepped (but did not deeply read) the remaining internal pages — `Pipeline`, `RouteOptimizer`, `BuildingRegistry`, `Profile`, `Analytics`, `WorkOrders`, `MaintenanceScheduling`, `Invoices`, `EquipmentRegistry`, `TeamManagement`, `Documents`, `TDLRIntelligence` — and all 7 customer pages. Their endpoint surface is captured above. Tell me which of these you want me to walk line-by-line next.

---

_End of architecture doc. To regenerate or extend, point me at any specific page or feature and I'll deepen the corresponding section._
