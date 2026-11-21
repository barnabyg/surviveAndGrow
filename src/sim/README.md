# The simulation

`src/sim/` is a pure function of the game state, the player's decisions and a seeded random
generator. The README's "How the code is laid out" says what it may and may not depend on, and
[docs/rules.md](../../docs/rules.md) states the rules. This page says where things live, so a change finds
every file it needs.

## How a quarter is resolved

`advanceQuarter` in `game.ts` draws everything chance decides, in this fixed order and nowhere
else: the weather, the world prices (`trade.ts`), the world price shocks announced
(`priceShocks.ts`), the events that strike and the campaign swing in an election quarter. The
world prices, the shocks and the dilemma rolls come from the seed and the quarter alone, and leave
the generator untouched. Shocks are national, not regional, so they are not among the events each
region rolls for: a kind added at the end of `PRICE_SHOCK_TYPES` has its own draw and leaves the
others as they were. Each good's price has its own draw, in the order of
`GOODS`, so a good added at the end leaves the others' prices as they were. `resolveQuarter`
takes all of these as given, so the risks look-ahead (`risks.ts`) runs it on supposed chance,
among it a slump in the world ore price. It lives the quarter through `liveQuarter`, which the
preview (`previewQuarter`) shares, so turn and preview cannot come to differ:

1. The answer to a dilemma (`dilemmas.ts`).
2. Money (`resolveMoney`): repayments on debts, oldest first, out of the treasury and the
   quarter's revenue (`debt.ts`), a bond's interest each quarter and its whole sum at
   maturity. A payment missed on any of them brings a bailout: everything owed is
   consolidated into one bailout loan (`debt.ts`). Then the budget (`budget.ts`) with what is
   left; then project instalments, oldest first (`projects.ts`); then upkeep and decay
   (`upkeep.ts`). Revenue taxes what each mine's chain earns at the world ore price as the
   quarter began (`chains.ts`). What is borrowed arrives as the quarter ends (`debt.ts`),
   unless a bailout has stopped it, and last of all grain sold abroad is paid for and grain bought
   abroad is paid for (`trade.ts`), within what the trade links carry once the mines' ore has
   its share (`tradeLinks.ts`), as they stood when the quarter began; grain sold is set aside from the reserve as it stands
   after the dilemma's answer. What each link carried, the ore and the grain really bought and
   sold, is kept for the map to show next quarter (`tradeRoutes.ts`).
3. Food (`food.ts`), with the sites in use as the quarter began (`sites.ts`, `chains.ts`,
   `power.ts`) and the events in force (`events.ts`), from the reserve less the grain sold
   abroad. Grain bought abroad then reaches the national reserve.
4. Health and education levels (`resolveServices` in `prosperity.ts`).
5. Prosperity (`prosperity.ts`) and the tier it reaches (`tiers.ts`), which sets expectations.
   Prosperity, and the debt burden the quarter leaves, are judged at the world prices once
   they have moved.
6. Approval (`approval.ts`), which decides who strikes next quarter. A bailout's blow lands
   here (`bailout.ts`).
7. The credit rating (`credit.ts`), reassessed from the payment record the repayments left, the
   debt burden the quarter leaves and its deficit. What was borrowed this quarter was taken at
   the rating in force as it began. A missed payment puts it at the lowest step.
8. Austerity (`bailout.ts`): a bailout imposes it and brings the budget in force within it, a
   missed payment during it extends it, and otherwise a quarter of it is spent. What it
   allows is in `austerity.ts`, which `checkDecisions` and the menus of loans and projects
   consult.

`resolveQuarter` moves the world prices on (`trade.ts`), pushed by any world price shock in force
(`priceShocks.ts`), before it lives the quarter. Once it is lived, it moves the calendar
(`calendar.ts`, `terms.ts`), ends and begins events (`events.ts`), ends the shocks whose time is
up and starts the notice of those announced (`priceShocks.ts`),
sets decaying the sites in use where an event that damages them has begun (`upkeep.ts`), checks
for collapse, holds the election (`election.ts`), checks for victory (`victory.ts`), may put a new
dilemma, records the vital signs (`history.ts`), and compiles the report (`report.ts`), whose
entries keep the order written there.

## Adding a mechanic

A new mechanic usually touches most of these:

- `state.ts`: what the game remembers between quarters.
- `game.ts`: where it is resolved in the quarter, and what the preview projects.
- A module of its own for its rules, called from `game.ts`.
- `balance.ts`: its tuning values. No rule hard-codes a number.
- `vocabulary.ts`: the names the player sees, and any new kind of site, event or spending. A
  new kind of event goes at the end of `EVENT_TYPES`: the events that begin in the same quarter
  share one roll in each region, taken in that order, so the others' strikes stay as they were.
  `country.ts` says which country file format first lets a file name it. A world price shock
  is not such an event: it goes at the end of `PRICE_SHOCK_TYPES`, with its sizes in
  `balance.priceShocks`.
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
