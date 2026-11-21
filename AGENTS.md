# Survive and Grow

A turn-based economics and politics survival game. The design intent and phase plan are in
`docs/design.md`; the rules as built, with their figures, are in `docs/rules.md`. Before changing
the simulation, read `src/sim/README.md`: the order a quarter is resolved in, and the files a new
mechanic touches.

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
