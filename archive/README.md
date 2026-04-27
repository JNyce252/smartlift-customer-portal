# archive/

Historical artifacts from the Smarterlift bring-up that aren't part of the current build but are kept here for reference rather than deleted outright. Nothing in this directory is imported, executed, or referenced by any current code path. If you're reading this trying to understand the project, **start at the repo root `README.md` instead**.

## Contents

### Initial scaffolding scripts (Mar 9, 2026)

These shell scripts were run once at project bring-up to scaffold the React app structure. They are NOT idempotent and should NOT be re-run — doing so would clobber current files.

- `setup-smartlift.sh` — initial CRA + Tailwind + dependencies setup
- `setup-all-files.sh` — wrote initial `App.jsx`, `index.js`, base components
- `create-all-pages.sh` — wrote first internal-page stubs
- `create-dashboards.sh` — wrote initial dashboard pages
- `create-customer-portal.sh` — wrote initial customer-portal layout
- `create-customer-pages-part2.sh`, `-part3.sh` — wrote remaining customer-portal pages

### Stale code (orphans the audit confirmed nothing imports)

- `Documents.jsx` — empty stub at repo root from initial scaffolding; superseded by `src/pages/internal/Documents.jsx` and `src/pages/customer/Documents.jsx`
- `Support.jsx` — same shape, superseded by `src/pages/customer/Support.jsx`
- `index.mjs.stale` — Lambda snapshot from Mar 31, 2026, predating the multi-tenancy and `getAuthContext` refactors. Superseded by `lambda/smartlift-api/index.mjs`. Useful only as a "before" reference.
- `index.html.old` — old marketing landing page (pre-Amplify deployment).

## When to delete

Once the project has shipped to a second tenant and the team has a clean reference for "the project structure", this directory can be removed in a single git commit. Until then, keeping it costs nothing and preserves a useful audit trail of how the project evolved.
