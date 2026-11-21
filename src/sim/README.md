# The simulation

`src/sim/` is a pure function of the game state, the player's decisions and a seeded random
generator. The README's "How the code is laid out" says what it may and may not depend on, and
[docs/rules.md](../../docs/rules.md) states the rules. This page says where things live, so a change finds
every file it needs.

## How a quarter is resolved

`advanceQuarter` in `game.ts` draws everything chance decides, in this fixed order and nowhere
else: the weather, the world prices (`trade.ts`), the events that strike and the campaign swing
in an election quarter. The world prices and the dilemma rolls come from the seed and the quarter
alone, and leave the generator untouched.
`resolveQuarter` takes all of these as given, so the risks look-ahead (`risks.ts`) runs it on
supposed chance. It lives the quarter through `liveQuarter`, which the preview
(`previewQuarter`) shares, so turn and preview cannot come to differ:

1. The answer to a dilemma (`dilemmas.ts`).
2. Money (`resolveMoney`): repayments on debts, oldest first, out of the treasury and the
   quarter's revenue (`debt.ts`), a bond's interest each quarter and its whole sum at
   maturity. A payment missed on any of them brings a bailout: everything owed is
   consolidated into one bailout loan (`debt.ts`). Then the budget (`budget.ts`) with what is
   left; then project instalments, oldest first (`projects.ts`); then upkeep and decay
   (`upkeep.ts`). What is borrowed arrives as the quarter ends (`debt.ts`), unless a
   bailout has stopped it, and last of all grain sold abroad is paid for and grain bought
   abroad is paid for (`trade.ts`); grain sold is set aside from the reserve as it stands
   after the dilemma's answer.
3. Food (`food.ts`), with the sites in use as the quarter began (`sites.ts`, `chains.ts`,
   `power.ts`) and the events in force (`events.ts`), from the reserve less the grain sold
   abroad. Grain bought abroad then reaches the national reserve.
4. Health and education levels (`resolveServices` in `prosperity.ts`).
5. Prosperity (`prosperity.ts`) and the tier it reaches (`tiers.ts`), which sets expectations.
6. Approval (`approval.ts`), which decides who strikes next quarter. A bailout's blow lands
   here (`bailout.ts`).
7. The credit rating (`credit.ts`), reassessed from the payment record the repayments left, the
   debt burden the quarter leaves and its deficit. What was borrowed this quarter was taken at
   the rating in force as it began. A missed payment puts it at the lowest step.
8. Austerity (`bailout.ts`): a bailout imposes it and brings the budget in force within it, a
   missed payment during it extends it, and otherwise a quarter of it is spent. What it
   allows is in `austerity.ts`, which `checkDecisions` and the menus of loans and projects
   consult.

`resolveQuarter` then moves the world prices on (`trade.ts`), moves the calendar (`calendar.ts`,
`terms.ts`), ends and begins events, checks for collapse, holds the election (`election.ts`),
checks for victory (`victory.ts`), may put a new dilemma, records the vital signs
(`history.ts`), and compiles the report (`report.ts`), whose entries keep the order written
there.

## Adding a mechanic

A new mechanic usually touches most of these:

- `state.ts`: what the game remembers between quarters.
- `game.ts`: where it is resolved in the quarter, and what the preview projects.
- A module of its own for its rules, called from `game.ts`.
- `balance.ts`: its tuning values. No rule hard-codes a number.
- `vocabulary.ts`: the names the player sees, and any new kind of site, event or spending.
- `report.ts` and the entries it compiles: what the turn report says about it.
- `risks.ts`: the warning ahead, if it can hurt the player. Every loss must be foreseeable.
  A danger of money (the treasury, a missed payment, a bond's maturity, the credit rating)
  goes in `financeRisks.ts`. Both read the quarters played and weigh each danger with
  `riskScope.ts`.
- `approval.ts` or `prosperity.ts`, if it moves either.
- `country.ts`: what a country file may say about it, and how that is checked. The file is
  read through `countryReader.ts`; the starting treasury, budget and loans are read in
  `countryStart.ts`; and the checks between sites, their dependencies and alternatives, are in
  `siteChecks.ts`.
- `index.ts`: anything the interface needs.
- `save.ts` and `migrations.ts`: a new field in the state is a save-format change. Follow
  [ADR 0001](../../docs/adr/0001-save-format.md): raise the format, add a migration, and keep a
  save of the old format under `tests/saves/`.

On the interface side, `src/ui/TopBar.tsx`, `ReportList.tsx`, `RisksPanel.tsx`, `MapView.tsx`
and `LensBar.tsx` are the usual places it shows. `docs/rules.md` gains a
bullet for it, under its own heading if it is a new mechanic.
