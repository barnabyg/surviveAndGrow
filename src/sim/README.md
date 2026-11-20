# The simulation

`src/sim/` is a pure function of the game state, the player's decisions and a seeded random
generator. The README's "How the code is laid out" says what it may and may not depend on, and
"What is in the game" states the rules. This page says where things live, so a change finds
every file it needs.

## How a quarter is resolved

`advanceQuarter` in `game.ts` draws everything chance decides, in this fixed order and nowhere
else: the weather, the events that strike and the campaign swing in an election quarter. The
dilemma rolls come from the seed and the quarter alone, and leave the generator untouched.
`resolveQuarter` takes all of these as given, so the risks look-ahead (`risks.ts`) runs it on
supposed chance. It lives the quarter through `liveQuarter`, which the preview
(`previewQuarter`) shares, so turn and preview cannot come to differ:

1. The answer to a dilemma (`dilemmas.ts`).
2. Money (`resolveMoney`): the budget (`budget.ts`), then project instalments, oldest first
   (`projects.ts`), then upkeep and decay (`upkeep.ts`).
3. Food (`food.ts`), with the sites in use as the quarter began (`sites.ts`, `chains.ts`,
   `power.ts`) and the events in force (`events.ts`).
4. Health and education levels (`resolveServices` in `prosperity.ts`).
5. Prosperity (`prosperity.ts`) and the tier it reaches (`tiers.ts`), which sets expectations.
6. Approval (`approval.ts`), which decides who strikes next quarter.

`resolveQuarter` then moves the calendar (`calendar.ts`, `terms.ts`), ends and begins events,
checks for collapse, holds the election (`election.ts`), checks for victory (`victory.ts`), may
put a new dilemma, records the vital signs (`history.ts`), and compiles the report
(`report.ts`), whose entries keep the order written there.

## Adding a mechanic

A new mechanic usually touches most of these:

- `state.ts`: what the game remembers between quarters.
- `game.ts`: where it is resolved in the quarter, and what the preview projects.
- A module of its own for its rules, called from `game.ts`.
- `balance.ts`: its tuning values. No rule hard-codes a number.
- `vocabulary.ts`: the names the player sees, and any new kind of site, event or spending.
- `report.ts` and the entries it compiles: what the turn report says about it.
- `risks.ts`: the warning ahead, if it can hurt the player. Every loss must be foreseeable.
- `approval.ts` or `prosperity.ts`, if it moves either.
- `country.ts`: what a country file may say about it, and how that is checked.
- `index.ts`: anything the interface needs.
- `save.ts` and `migrations.ts`: a new field in the state is a save-format change. Follow
  [ADR 0001](../../docs/adr/0001-save-format.md): raise the format, add a migration, and keep a
  save of the old format under `tests/saves/`.

On the interface side, `src/ui/TopBar.tsx`, `ReportList.tsx`, `RisksPanel.tsx`, `MapView.tsx`
and `LensBar.tsx` are the usual places it shows. The README's "What is in the game" gains a
bullet for it.
