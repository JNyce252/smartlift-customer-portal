# Contributing to Smarterlift

This doc captures the operating principles behind Smarterlift's development. It's as much a note to future-self as to collaborators.

## Build for production, not for demo

Every feature we ship should actually work for real users, not just look like it works during a 30-minute demo. When deciding between a fast-feeling shortcut and a slower-but-honest build, we pick the honest one.

Practical implications:
- Don't ship features that claim functionality they don't deliver
- Don't label something "done" just because the demo path works
- If the real feature takes 3 weeks and the demo is in 1 week, ship no feature rather than a fake one
- If we ship a stepping-stone toward a real feature, label it honestly (e.g. "beta" or "uses X, will upgrade to Y")
- No "revisit later" — if we can't do it now, name exactly when we will

## Review before execute

Large changes (schema migrations, new endpoints, data deletes) get a two-step process:
1. Propose what you'll do and why — file paths, query params, request bodies, API signatures
2. Apply only after explicit approval

## Investigate before proposing

Before proposing changes, read the actual code that's there. Grep for relevant strings. Read the full function. Confirm param names and types against the Lambda spec, not from memory.

## Data quality beats data completeness

Users trust data that's accurate. Better to say "we don't have this data yet" than to surface a guessed or hallucinated value and have the user make a decision on it.
