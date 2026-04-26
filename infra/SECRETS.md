# Secrets — DO NOT COMMIT

This file documents what secrets exist and where, but does NOT contain the values themselves.

| Secret | Where it lives | Risk |
|---|---|---|
| Aurora DB password (`hotelapp` user) | env vars on 5 Lambdas; `/Users/jeremywilson/Library/.../memory.md` | HIGH — single password protecting prod DB |
| Google Maps key (server-side) | `smartlift-api` env var `GOOGLE_MAPS_KEY` | MEDIUM — needs referrer/IP restrictions in GCP console |
| Google Places key (browser-side) | `.env.local` `REACT_APP_GOOGLE_PLACES_API_KEY` (shipped in bundle) | MEDIUM — needs HTTP-referrer restriction in GCP |
| Google CSE key (browser-side) | hard-coded in `src/pages/internal/ProspectDetails.jsx:9-10` | MEDIUM — same |
| Hunter API key | `smartlift-api` env (server-side); also unused in `.env.local` | LOW (server-side only) — remove from `.env.local` |
| PDL API key | `smartlift-api` env (server-side) | LOW (server-side only) |

**Action items:**
1. **Rotate the DB password.** It's in code, in memory, and in 5 Lambdas. Move to AWS Secrets Manager.
2. **Remove `REACT_APP_HUNTER_API_KEY` from `.env.local`** — frontend doesn't use it.
3. **Verify HTTP-referrer restriction** on the Google Places + CSE keys in GCP console.
4. **Audit `.gitignore`** to make sure `.env*`, `infra/SECRETS.*`, and any IAM/Cognito JSON exports never get committed.
