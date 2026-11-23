# Balance tickets

A balance run plays every scripted player through whole games over many seeds, and it is the most
expensive thing an agent does here: Phase 3's confirmation took about 45 minutes on 20 processors.
These rules keep a phase's balance work to a known size. They apply when writing balance tickets
and when working one.

## Three tickets per phase, not one

1. **Players and reporting.** New scripted players and new columns in the report, with their
   unit tests. No values change. It ends with one short run (Tavara, seeds 1-100, the players the
   targets name) to show the new players play whole games, and the targets proposed for the owner.
2. **Tuning.** Values only, no change to the simulation's logic. Blocked by 1, and by the owner
   confirming the targets.
3. **Confirmation and record.** One confirmation run, the write-up in `docs/balance/phase-N.md`,
   and the status line in `docs/design.md`. Blocked by 2. It also rechecks the play-through in
   `docs/playing.md`: replay its seed (`BALANCE_SEEDS` set to that seed, with the players it
   names) and correct every outcome it states, or replace it with the new phase's play-through
   and move the old one to its `docs/balance/phase-N.md` as historical.

## Run sizes

| Run | Country | Seeds | Players |
| --- | --- | --- | --- |
| A tuning attempt | `tavara` | `1-100` | Those the targets name, with `Does nothing` and `Popularity` |
| The last tuning attempt, before stopping | `tavara` | `1-300` | The same |
| Confirmation | `tavara` | `1001-1400` | `all` |
| Testland's check that every game ends | `testland` | `1001-1050` | `all` |

400 confirmation seeds put a win rate within about 2.5 points either way, which is enough for
every target the phases have set. Run a one-term pass only when a target is about one term. Do not
rerun the earlier phases' tuning runs.

## The attempt budget

A tuning ticket gets **six attempts**: six runs of `1-100` with different values. If the targets
are not all met by then, stop. Record the attempt log and the closest candidate, and leave the
choice to the owner: a target that values cannot reach needs a change to the logic, which is a
ticket of its own, not more tuning. Change one or two values per attempt, and give the reason for
each change in the attempt log.

## Running

- Run every balance run through the machine-wide lock, in the background, with a timeout:

  ```bash
  pwsh -NoProfile -File ~/.claude/scripts/run-exclusive.ps1 -TimeoutSec 3600 npm run balance </dev/null >balance.log 2>&1
  ```

  Set the `BALANCE_*` variables before the call. The workers already run at below-normal priority
  on half the processors; do not raise `BALANCE_WORKERS` above that.
- Never run two balance runs at once, from one session or from parallel ones.
- The report depends only on the country, players, seeds and values, so a run whose inputs have
  not changed does not need running again. Keep its tables rather than replaying it.

## The record

`docs/balance/phase-N.md` holds the targets and whether each was met, the confirmation tables,
the values changed and why, the attempt log, and the commands with their seeds. The tables of
each tuning attempt stay out of it: give the one figure each attempt was judged by.
