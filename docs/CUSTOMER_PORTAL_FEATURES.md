# Smarterlift — Customer Portal Feature Roadmap

_Generated 2026-04-27. Brainstorm of value-adding features that turn the customer portal from a table-stakes service tool into a genuinely differentiated product. Every idea here is evaluated against (a) what data we already have, (b) what's actually unique about Smarterlift's stack, (c) realistic implementation effort._

---

## The thesis

Most elevator service portals show the customer their own data. That's table-stakes. Smarterlift's differentiator is **context**: showing the customer their data positioned against the rest of the Texas elevator population.

We have three assets competitors don't:

| Asset | What it enables |
|---|---|
| **74,001 TDLR rows** in `building_registry` (every elevator in Texas with cert dates, equipment type, drive, floors, install year, building info) | Peer benchmarking, cohort predictions, market context |
| **365 contractors + 207 inspectors** in TDLR | Inspector quality profiles, market-share insights |
| **Bedrock + Claude** ready in production | AI-powered Q&A, defect predictions, narrative insights |

Most customer-portal features in this doc lean on at least one of those assets. Generic "show the customer their data" features (history lists, basic dashboards) are cheap commodity work and not where the leverage is.

---

## Feature catalog

Grouped by theme. Each feature has: what it shows, what data it needs, rough effort.

### Theme 1: Benchmarking — "Where do I stand?"

#### B1. Compliance Health Score (**SHIPPED 2026-04-27**)
**What it shows.** A 0–100 score per elevator, composite of cert-expiration headroom, time since last inspection, equipment age, and active-ticket urgency. Displayed as a gauge per elevator + a fleet average. "Your fleet: 87. Excellent."

**Data needed.** Customer's elevators row + open service_tickets count. (Already have.)

**Why it works.** Building owners care intensely about compliance — a single visual that says "you're on top of it" is the kind of thing they screenshot for their boss.

**Effort.** 2–3 hours. New `GET /me/compliance` Lambda endpoint, new gauge widget on CustomerDashboard.jsx.

#### B2. Certification Cliff Chart (**SHIPPED 2026-04-27**)
**What it shows.** Stacked timeline of the next 12 months: when each of the customer's elevator certs is up for renewal, overlaid against the TDLR-wide expiration distribution. "23% of TX elevators have an expired cert. Yours: 0%."

**Data needed.** Customer's elevator inspection dates + `building_registry.expiration` aggregated by month. (Already have.)

**Why it works.** Context — "I'm not just current, I'm ahead of the average" — is emotionally resonant and screenshot-worthy.

**Effort.** 2 hours. Same endpoint as B1 returns the cliff data; Recharts stacked bar chart on the frontend.

#### B3. Peer Benchmark Card
**What it shows.** "Among 1,847 office buildings in DFW with 15–25 floors and traction elevators, you rank #X for compliance." Cohort defined dynamically based on building registry attributes.

**Data needed.** TDLR `building_registry` filtered to similar buildings; the customer's relative position.

**Why it works.** Specificity is the hook. "Among similar buildings in your city" is far more interesting than a generic average.

**Effort.** 3 hours. SQL cohort query + ranking math; a card component.

#### B4. Inspector Quality Profile
**What it shows.** For the customer's assigned TDLR inspector, show how many elevators they've inspected statewide, average inspection rhythm, and any patterns observable from public records.

**Data needed.** TDLR `elevator_inspectors` joined to `building_registry`. (Already have 207 inspectors.)

**Why it works.** Building owners often don't know who their inspector even is. Surface it.

**Effort.** 2 hours.

---

### Theme 2: AI-powered prediction (Bedrock leverage)

#### A1. "Hidden Defect" Cohort Predictions (**SHIPPED 2026-04-28**)
**What it shows.** "Otis Gen2 elevators installed 2001–2005 in TX have a 3.2× higher rate of door sensor failures by year 22. Your elevator is 22 years old — recommended targeted inspections: door operator, light curtain alignment, leveling sensors."

**Data needed.** TDLR cohort query (similar elevators) + Bedrock prompt that summarizes failure patterns from cohort statistics. Can be augmented with public-record incident data over time.

**Why it works.** This is the moat play. No competitor can match it because no one else has 74k TX elevators in their database. Customer feels like they have a Bloomberg Terminal for their elevator.

**Effort.** 6–8 hours. SQL cohort query + Bedrock prompt engineering + a "Predicted Maintenance Focus" card on the elevator detail page.

#### A2. AI Service Q&A Chat (**SHIPPED 2026-04-28**)
**What it shows.** "Ask Smarterlift" widget. Natural-language queries against the customer's own data + TDLR context. Backed by Claude with the customer's data injected as context.

Example queries:
- "When was my last inspection?"
- "How much did I spend on maintenance Q3?"
- "What's typical for an elevator my age?"
- "When does my cert expire?"

**Data needed.** Bedrock invoke (already wired). System prompt assembled per-request from the customer's elevators / tickets / invoices / TDLR cohort.

**Why it works.** It's the "wow" factor demo for sales calls and the kind of feature that gets written about in trade press.

**Effort.** 4–5 hours for a skeleton. Significantly more if you add tool-use (function-calling) so Claude can issue arbitrary scoped queries.

#### A3. Modernization ROI Calculator
**What it shows.** "Your 22-year-old Otis Gen2: modernization would reduce operating cost ~$X/year (extrapolated from TDLR fleet age data), increase reliability Y%, payback in Z years."

**Data needed.** TDLR install_date distribution + a heuristic cost model (or cohort-derived estimates).

**Why it works.** Modernization upsell is a real revenue lever for the service company; quantifying ROI moves the needle.

**Effort.** 3 hours.

---

### Theme 3: Operational delight

#### O1. Service History Timeline (**SHIPPED 2026-04-28**)
**What it shows.** One unified visual timeline per elevator: tickets, inspections, maintenance logs, modernizations, payments. Filterable, exportable to PDF for insurance / compliance audits.

**Data needed.** Already have all of it; just need a timeline component.

**Why it works.** Less flashy but heavily used over time. Compliance auditors, insurance renewals, lawsuits — building owners need this. Turns a future fire-drill into a 30-second download.

**Effort.** 3 hours.

#### O2. Renewal Calendar (.ics export) (**SHIPPED 2026-04-28** — snapshot download; subscribable URL deferred to v2)
**What it shows.** Auto-generated `.ics` file of every upcoming inspection deadline, cert renewal, and scheduled maintenance. Customer subscribes once in Google/Outlook; updates flow automatically.

**Data needed.** Customer elevators + a deterministic .ics generator.

**Why it works.** Boring but high-value. Building owners are calendar-driven. Every other portal makes them log in to check; we sync into their existing workflow.

**Effort.** 2 hours.

#### O3. Tenant Outage Communication Templates
**What it shows.** When a customer logs a service ticket, a "Notify your tenants" button generates a pre-filled email/SMS template with elevator ID, expected duration, alternate access guidance.

**Data needed.** Ticket data + a template engine.

**Why it works.** Building owners hate writing outage notices. Save them the work.

**Effort.** 2 hours; +Twilio later for SMS broadcast.

#### O4. Pre-Inspection Checklist Generator
**What it shows.** Three days before inspection, send the customer an AI-generated checklist of "what TDLR inspectors typically check on elevators of your type and age" — sourced from inspectors' historical patterns.

**Data needed.** Bedrock + scheduled Lambda + customer's elevator metadata.

**Why it works.** Reduces inspection-day surprises. Customer feels prepared.

**Effort.** 3 hours.

---

### Theme 4: Engagement / stickiness

#### E1. Building Reputation Badge
**What it shows.** A scorecard the property manager can display in lobbies / leasing materials: "Top 10% elevator compliance in Dallas — verified by Smarterlift."

**Data needed.** Computed compliance score (B1) + city ranking (B3).

**Why it works.** Marketing asset for the customer = engagement asset for us. They'll embed it on their website and link back.

**Effort.** 3 hours + design of the badge.

#### E2. Anonymous Owner Network Insights
**What it shows.** Aggregated, no-PII benchmarks: "Building owners in your zip code spent an average of $4,200 on elevator maintenance last year. You: $3,800."

**Data needed.** Aggregate `invoices.total` across customers in a region. Requires care — only show when sample size is high enough to be anonymous (k ≥ 5).

**Why it works.** Customers love comparative cost data. Builds trust.

**Effort.** 2 hours.

#### E3. Sustainability Report
**What it shows.** For LEED-certified buildings: estimated kWh consumption based on elevator type, age, and traffic. Modernization energy-savings projections. Exportable PDF.

**Data needed.** Heuristic energy model + customer elevator metadata.

**Why it works.** LEED-pursuing building owners care a lot. This is a wedge into a specific high-value segment.

**Effort.** 3 hours.

---

## Prioritization

If I were the PM ranking these by (impact × ease) for shipping in order:

| Rank | Feature | Effort | Reasoning |
|---|---|---|---|
| 1 | **B1 + B2** Compliance Score & Cert Cliff | 4–5 hr | Fastest wow-per-hour. Pure data we already have. Customer screenshots it. |
| 2 | **A1** Hidden Defect Cohort Predictions | 6–8 hr | The moat play. Differentiated. |
| 3 | **O2** Renewal Calendar .ics | 2 hr | Boring, high-value, customers love calendar integrations. |
| 4 | **A2** AI Q&A Chat | 4–5 hr | Wow factor. Demo for sales calls. |
| 5 | **O1** Service History Timeline | 3 hr | Compliance/audit utility. Heavily used over time. |
| 6 | **B3** Peer Benchmark Card | 3 hr | Layers nicely on top of B1+B2. |
| 7 | **A3** Modernization ROI | 3 hr | Revenue-lever for the service company. |
| 8 | **O3** Tenant Outage Templates | 2 hr | Practical convenience. |
| 9 | **E1** Building Reputation Badge | 3 hr | Engagement + organic marketing. |
| 10 | **E2** Owner Network Insights | 2 hr | Cost-comparison data; needs k-anonymity care. |
| 11 | **B4** Inspector Quality Profile | 2 hr | Niche but cool. |
| 12 | **O4** Pre-Inspection Checklist | 3 hr | Adds prep time before inspections. |
| 13 | **E3** Sustainability Report | 3 hr | Specific to LEED-pursuing customers. |

Total to ship the top 5: ~20 hours. Top 8: ~30 hours.

---

## What's NOT on the list (and why)

- **Real-time technician GPS tracking** — requires hardware/app infrastructure on the technician side that doesn't exist. Big build for a single feature.
- **Full Stripe payment integration** — already in `CUSTOMER_PORTAL_REVIEW.md` as CM-1. Financial integration is its own arc; not bundled here.
- **Tenant-facing portal** — Smarterlift is B2B (service company → building owner). Adding a tenant tier fragments product focus.
- **IoT cycle-count integration** — would be transformative but requires sensors. Multi-quarter project.
- **Native mobile apps** — the web portal is mobile-responsive. Native apps don't unlock new capabilities for this user segment.
- **Multi-elevator-company aggregation** — Smarterlift is each tenant's elevator portal; building owners with multiple service providers would need a separate product surface, not in scope.

---

## Implementation conventions for any feature here

When implementing any feature in this doc:

1. **Customer-side scoping.** Every new GET endpoint that exposes customer data must filter by `customer_id` when `authRole === 'customer'` (per M-8a closure). New patterns should match the `CUSTOMER_COLUMNS` model already in `lambda/smartlift-api/index.mjs`.
2. **Frontend through `api.js`.** New endpoints should be wrapped in `src/services/api.js` and consumed from there. (Per CM-2 in `CUSTOMER_PORTAL_REVIEW.md`, we should normalize the existing direct-fetch sites along the way.)
3. **TDLR queries** are read-mostly and large — prefer aggregation in Postgres over fetching rows to the Lambda. Index hints if a query gets slow.
4. **Bedrock-backed features** should use the existing `smartlift-review-analyzer` and `smartlift-ai-scorer` patterns: async invoke for long calls, polling pattern for proposal-generation-style flows. New triggers should ride the existing IAM roles where possible (per H-3 closure).
5. **Update `docs/CUSTOMER_PORTAL_REVIEW.md`** as features close — they often resolve open MEDIUM/LOW items.

---

_This doc is a living plan, not a commitment. Move features in/out as priorities change. Each feature should get a brief "shipped" note here when it lands, with a link to the implementation._
