# Smarterlift

> AI-powered lead-gen + CRM SaaS for elevator service companies. Built by The Golden Signature LLC.
> Founding customer: Southwest Cabs Elevator Services (Texas).

[smarterlift.app](https://smarterlift.app)

## What it is

A multi-tenant web app for licensed elevator service companies in Texas. Combines:

- **Lead generation** — Google Places search + Claude scoring + TDLR (Texas Department of Licensing & Regulation) compliance data, augmented by Hunter.io and PDL contact enrichment.
- **CRM / sales pipeline** — prospects, contacts, notes, status, contracts, AI-generated proposals and intro emails.
- **Service operations** — work orders, maintenance scheduling, invoicing, route optimization, equipment registry, document storage.
- **Customer portal** — a separate set of pages where the elevator owner's customers can see their elevators, request service, view maintenance history, pay invoices, and access documents.

## Architecture (one-liner)

React 18 + CRA frontend on AWS Amplify Hosting; Cognito for auth; API Gateway → 6 Node.js Lambdas in a private VPC; Aurora Serverless v2 PostgreSQL; Bedrock (Claude Sonnet 4.5 / Opus 4.7) for AI scoring & proposal generation. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full map.

## Repository layout

```
smartlift-customer-portal/
├── README.md                 ← you are here
├── CONTRIBUTING.md           ← contribution guidelines
├── package.json              ← CRA + dependencies
├── amplify.yml               ← CI build config (Amplify Hosting)
├── .env.local                ← env vars (gitignored)
├── tailwind.config.js
│
├── src/                      ← React frontend
│   ├── App.jsx               ← all routes; AuthProvider + Router
│   ├── pages/auth/           ← Login, Register
│   ├── pages/internal/       ← 14 internal/management pages
│   ├── pages/customer/       ← 7 customer-portal pages
│   ├── components/common/    ← UserMenu, NotificationBell, PrivateRoute
│   ├── components/internal/  ← InternalLayout, RoleNav
│   ├── context/AuthContext.jsx
│   ├── services/api.js       ← thin HTTP wrapper for the API
│   └── services/authService.js  ← Cognito SRP login
│
├── lambda/                   ← live deployed source for all 6 Lambdas
│   ├── smartlift-api/                  (the 2,200-LOC monolith)
│   ├── smartlift-tdlr-refresh/         (daily TDLR ingest cron)
│   ├── smartlift-maintenance-reminder/ (daily reminders)
│   ├── smartlift-review-analyzer/      (async Bedrock review scoring)
│   ├── smartlift-ai-scorer/            (Bedrock prospect scoring)
│   └── golden-signature-contact/       (public contact form)
│
├── infra/                    ← saved AWS configs (Cognito, Aurora, IAM, Lambda)
├── db/                       ← live Aurora schema introspection (db/schema.md)
│
├── scripts/                  ← operational scripts (deploy, infra ops)
│   ├── deploy-lambda.sh
│   ├── attach-cognito-authorizer.sh
│   ├── rotate-db-password.sh
│   ├── h5-drop-dead-tables.sh
│   ├── h6-harden-cognito-pool.sh
│   └── vpc-phase-{a,b,b0,d}-*.sh    (VPC migration phases)
│
├── docs/                     ← all major project documentation
│   ├── ARCHITECTURE.md
│   ├── SECURITY.md           ← severity-ranked findings, current status
│   ├── CUSTOMER_PORTAL_REVIEW.md
│   └── SESSION_TEMPLATE.md   ← paste at start of new Claude sessions
│
└── archive/                  ← historical / orphan files (see archive/README.md)
```

## Getting started

```bash
npm install --legacy-peer-deps
npm start          # dev server at http://localhost:3000
npm run build      # production build to ./build
```

The frontend reads `REACT_APP_*` variables from `.env.local`; copy `.env.local.example` (when one exists) or pull current values from a teammate. The API base URL, Cognito User Pool ID, and Cognito Client ID all live there.

## For Claude / agentic sessions

When starting a new Claude session, paste the block from [docs/SESSION_TEMPLATE.md](docs/SESSION_TEMPLATE.md) — it points the agent at the verified-state docs (`docs/ARCHITECTURE.md`, `docs/SECURITY.md`, `db/schema.md`, `infra/`, `lambda/`, `scripts/`) so it doesn't re-rediscover them. Every doc in `docs/` is a fact-based snapshot grounded in file:line citations and live AWS pulls.

After meaningful changes, update [docs/SESSION_TEMPLATE.md](docs/SESSION_TEMPLATE.md)'s "Where I left off" block.

## Security state (snapshot — see docs/SECURITY.md for current)

As of 2026-04-27 evening:

- **CRITICAL:** 5/5 closed
- **HIGH:** 8/8 closed
- **MEDIUM:** 5/10 closed
- **LOW:** 4/10 closed

The 5 originally-CRITICAL findings (open SG, plaintext password, no API authorizer, fail-open multi-tenancy, broken token storage) are all closed. Customer-portal review is in [docs/CUSTOMER_PORTAL_REVIEW.md](docs/CUSTOMER_PORTAL_REVIEW.md).

## License

Proprietary — © 2026 The Golden Signature LLC. All rights reserved.
