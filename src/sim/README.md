# The simulation

`src/sim/` is a pure function of the game state, the player's decisions and a seeded random
generator. The README's "How the code is laid out" says what it may and may not depend on, and
[docs/rules.md](../../docs/rules.md) states the rules. This page says where things live, so a change finds
every file it needs.

## How a quarter is resolved

`createGame` in `newGame.ts` starts a game. `advanceQuarter` in `game.ts` first checks the
decisions (`checkDecisions` in `decisions.ts`), then draws everything chance decides, in this
fixed order and nowhere else: the weather (`rollWeather` in `events.ts`), the world prices (`trade.ts`), the world price shocks announced
(`priceShocks.ts`), the events that strike and the campaign swing in an election quarter. The
world prices, the shocks and the dilemma rolls come from the seed and the quarter alone, and leave
the generator untouched. Shocks are national, not regional, so they are not among the events each
region rolls for: a kind added at the end of `PRICE_SHOCK_TYPES` has its own draw and leaves the
others as they were. Each good's price has its own draw, in the order of
`GOODS`, so a good added at the end leaves the others' prices as they were. `resolveQuarter`
takes all of these as given (the `Chance` it is handed, and the `QuarterResolved` it returns,
are declared in `state.ts`), so the risks look-ahead (`risks.ts`) runs it on supposed chance,
among it a slump in the world ore price. It lives the quarter through `liveQuarter`, which the
preview (`previewQuarter`) shares, so turn and preview cannot come to differ:

1. The answer to a dilemma (`dilemmas.ts`).
2. Money (`resolveMoney` in `money.ts`, which also projects the quarters to the harvest for
   the preview's food forecast): repayments on debts, oldest first, out of the treasury and the
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
for collapse (`collapse.ts`), holds the election (`election.ts`), checks for victory (`victory.ts`), may put a new
dilemma, records the vital signs (`history.ts`), and compiles the report (`report.ts`), whose
entries keep the order written there.

## Projects and their targets

A project names its target, what it is for (`ProjectTarget` in `projects.ts`): a site, built
on, a technology, researched, or a region, surveyed. What a project
shares is written once and takes no notice of the target: `projectStartFault` bars any new
project during austerity and when the treasury does not hold the whole cost of everything started
together, and `resolveProjects` pays the instalments after the budget, the oldest project first,
pauses a project the treasury cannot pay for, and puts a finished one in use from the next
quarter. Taking a plan back is the interface's: a plan is not a project until the quarter ends.

Only what depends on the target is written for each kind: its name, region, cost, build time,
effect, the status it finishes with (`PROJECT_TARGET_FINISHED` in `vocabulary.ts`, which
`siteStateOf`, `standsAs` and a save's check read) and the words the report and the treasury's
breakdown use for it (`projectTerms`, with the words in `PROJECT_TARGET_WORDS`), what else
stops it being started (`targetFault`), and how a save holds it (`readTarget` in `save.ts`). A
quarter's decisions start sites (`startProjects`), research (`startResearch`) and surveys
(`startSurveys`); `startsOf` turns them into targets in that order. The interface checks a
plan against everything else planned with `planFault` (`surveys.ts`), so that the treasury
covers them all. A project on no site is resolved like any other: it takes
its turn for instalments in the order it was started and pauses in the same way, but it has no
site, so `siteOf` gives null for it. Everything that reads the sites in use (`siteStatus`,
`sitesInUse`, `siteEffects`, upkeep, chains, power, trade links and the timeline) passes over
it, it needs no upkeep and nothing decays it, and its report entries name no region. Its
lasting effect is for its own kind to say. A new kind of target is added to `ProjectTarget` and
to `PROJECT_TARGET_KINDS` in `vocabulary.ts`, and is a save-format change.

## Technologies and research

The technology tree is the engine's, like its site types. A technology's name and
prerequisites are in `TECHNOLOGY_DEFINITIONS` (`vocabulary.ts`), and its cost, research time and
effects in `balance.technologies`; `technology.ts` reads them (`technologyTerms`), says which
are known (`knownTechnologies`) and what stops research starting (`technologyFault`: one at a
time, prerequisites known). `research.ts` gives the interface the whole tree as it stands
(`researchStatuses`). Research into a technology is a project whose target is that technology:
it is paid for, paused and barred like any other, and once its last instalment is paid it is
`known` rather than in use.

A technology's effects use the same vocabulary as a site's (`SITE_EFFECTS`): each leaves a
share, in thousandths, of what it bears on, in every region or once across the nation.
`siteEffects` folds the technologies known into what the sites in use do, so everything that
reads it counts them: the harvest, the preview's forecast, the risks ahead and the map. How far
the weather moves a harvest answers to the effects in `WEATHER_HELD_BY`, and each event's hold
to the effects its definition lists (`heldBy` in `balance.events`), which is how
drought-resistant seed softens drought but not flood. A technology that improves something new
everywhere adds an effect there; one that unlocks a type of site is named by the type
(`unlockedBy` in `SITE_TYPE_DEFINITIONS`).

A technology can instead improve a type of site (`improves` in `balance.technologies`, a
`SiteImprovement`): leave less of what the site's effect bears on, raise what it carries in a
chain, or, for a power station, raise what its power gives a region. It pays off only where
such a site is in use. The rules that read a site take the technologies known
(`siteEffectsOf`, `capacityOf`, `powerGain` in `sites.ts`, through `siteEffects`, `chainOf`,
`regionPower` and `tradeLinks`, each of which reads them from the projects), so the turn, the
preview and the risks ahead count them alike. Each of those also says what the figure would be
without them (`unimproved`) and which technologies moved it (`improvedBy`), so that every
breakdown splits the figure and names them: `earningLines` and `powerLines` for the region
and treasury breakdowns, the spoilage line in `food.ts`, and the site's own sentence
(`siteTerms` with the technologies known). `technologyGains` (`research.ts`) says what a
technology does in this game, from the sites in use, for the research tab.

## Locked sites

A site may need technologies known before it can be started (`technologiesNeeded` in
`sites.ts`): the one that unlocks its type, such as hydropower for a dam, and the one its country
file names in `needs` (format 9). Until they are known it is `locked` (`siteStatus`, whose
`lockedBy` names them), and `targetFault` refuses to start it, so the turn, the plan and the
interface refuse alike. Nothing about a lock is kept: once the technologies are known the site
is empty like any other. A closed site stays closed whatever it needs. The opening budget's
upkeep, when the file leaves it out, does not count locked sites (`countryStart.ts`), and
`technologyGains` names the sites a technology unlocks for the research tab. A dam is a power
station by its power role, so everything that reads stations counts it; its harvest steadying
is its `harvestWeather` effect, and `weatherHold` lists what lessens the weather's hold on a
region's harvest for the region's card.

## Surveys and deposits

A country file may hide deposits (`Deposit` in `country.ts`, read by `readDeposits` and
checked by `checkDeposits` in `siteChecks.ts`): a mine and the trunk road that serves it, in a
region, with a likelihood and a range of sizes. A deposit's sites are not among the country's
`sites` until a survey of its region finds it. A survey is a project whose target is a region
(`SurveyTarget`); it finishes `surveyed`, and the report says what it found
(`surveyFindings`, in `resolveProjects`).

Whether a deposit is there and how large it is come from the seed and the deposit's id alone
(`depositFind` in `deposits.ts`, keyed with `drawAt`), so the generator is untouched and the
same seed always finds the same. Nothing about the find is kept in the state: `withFinds` adds
the found deposits' sites to the country from the surveys finished and the seed, as a quarter
ends (`game.ts`) and as a save is loaded (`save.ts`), and a found mine carries the size found
as its own `capacity`, which `siteCapacity` (`sites.ts`) gives the chain in place of the type's.
`surveys.ts` gives the interface each region as it stands for a survey (`surveyStatuses`).

## Adding a mechanic

A new mechanic usually touches most of these:

- `state.ts`: what the game remembers between quarters.
- `game.ts`: where it is resolved in the quarter, and what the preview projects. Money it
  moves goes through `money.ts`, a decision it adds is checked in `decisions.ts`, and a new
  field in the opening state is set in `newGame.ts`.
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
