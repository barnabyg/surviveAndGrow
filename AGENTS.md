# Survive and Grow

A turn-based economics and politics survival game. Before changing the simulation, read
`src/sim/README.md`: the order a quarter is resolved in, and the files a new mechanic touches.

The other docs are long. Read the part a ticket needs, not the whole file:

- `docs/rules.md`: the rules as built, with their figures, one heading per mechanic. Read the
  heading for the mechanic in hand (`grep -n '^## ' docs/rules.md` lists them).
- `docs/screen.md`: what each part of the screen shows, for a ticket that changes the interface.
- `docs/design.md`: the design intent. Section 4 is the systems, section 8 the phase plan.
- `docs/playing.md`: the player's guide and a play-through on a known seed, for manual testing.
- `docs/balance/phase-N.md`: a phase's balance record. Read the section a balance ticket names.

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
