# Survive and Grow

A turn-based economics and politics survival game. The design intent and phase plan are in
`docs/design.md`; the rules as built, with their figures, are in `docs/rules.md`. Before changing
the simulation, read `src/sim/README.md`: the order a quarter is resolved in, and the files a new
mechanic touches.

Domain terms are defined in `GLOSSARY.md`.

## Verify

- `npm run verify` runs every gate: formatting, lint, type check, simulation and UI tests, audit,
  build and browser tests. CI runs the same command. The gate table is in the README's
  [Check it](README.md#check-it).
- One simulation test: `npx vitest run tests/sim/loans.test.ts -t "is paid before the budget"`.
- One browser test: `npm run build && npx playwright test tests/e2e/loans.spec.ts -g "a loan is planned"`.
  Browser tests serve the production build in `dist/`, so rebuild after every change to `src/`.

## Agent skills

### Issue tracker

Issues live in GitHub Issues for `barnabyg/surviveAndGrow` (via the `gh` CLI). See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

### Balance tickets

A phase's balance work is three tickets (players, tuning, confirmation), with fixed run sizes and
an attempt budget. See `docs/agents/balance-tickets.md`.
