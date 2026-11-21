# Survive and Grow

A turn-based economics and politics survival game that runs in the browser. You lead a small
developing country: raise its living standards, and stay in office long enough to see it done.

The design is in [docs/design.md](docs/design.md), and the rules as built in
[docs/rules.md](docs/rules.md).

## Requirements

- Node.js 24 or later.
- `npm ci` once after cloning.
- `npx playwright install chromium` once, for the browser tests.

## Play it

```powershell
npm run play
```

Or double-click `run.bat`, which also installs the dependencies if they are missing.

This starts the game at http://localhost:41730 and opens it in your browser. It is designed for a
2560 x 1440 display.

Add `?seed=7` to the address to replay a known game: the same seed and the same decisions
always give the same game. The summary at the end of a game gives its seed and offers to replay it.

The game saves itself in your browser as each quarter ends. Open it again and it offers to resume
the saved game or to start a new one:

- A new game replaces the saved one when its own first quarter ends, and not before.
- Resuming opens the start of the quarter you had reached: the budget last committed, relief
  still going where you last sent it, and last quarter's reports. Budget changes you had not
  committed, projects you had planned and a dilemma you had answered were never part of the
  quarter, so they are not saved.
- A finished game is saved too, and opens again on its summary.
- A seed in the address is the seed of the next new game. It does not hide or discard a saved game.
- A save the game cannot open, such as one written by a newer release, is refused with the
  reason and left exactly as it is. While it is there nothing is saved, even a new game, until
  you choose to discard it.
- If the browser will not store the game (storage full or blocked, or a private window), the
  game says so and plays on.
- A country file you are trying out with `?country=` keeps its own save, apart from the game on
  the built-in country.

### Your first term

The first term is 20 quarters, ending in an election. Win it and you govern on into another term;
the game itself is won on prosperity, held in the top tier.
It is meant to be hard. You take office with approval near 52%, a budget that loses $5.0m a
quarter, and a food reserve below its safe level. Left alone, the country votes you out, if a
drought or a flood does not starve a region first.

- **Feed people first.** Watch the risks in the left column. When a region runs short, pick it
  on the map and send it relief, and pay for relief only while someone needs it.
- **Stay solvent.** The treasury cannot go below nothing: spending is cut, and building pauses.
- **Earn the vote over the whole term.** Approval moves slowly towards where your tax and
  spending would settle it, and the election forecast in the right column says where you stand.
  Below 40% a region strikes, which costs far more revenue than the tax that provoked it.
- **Buy grain when the harvest fails.** The trade panel in the right column orders grain for the
  national reserve at the world price, which moves every quarter. Money can stand in for a bad
  season, and austerity does not stop it.
- **Sell a surplus after a good harvest.** The same panel sells grain from the reserve at the
  world price less a margin. Keep the reserve above its safe level: the panel and the risks
  ahead warn when a sale would take it below.
- **Trade needs links.** Grain crosses the border only as far as the crossings and ports carry,
  after the mine's ore. The trade panel shows what is free; a port widens it, and one left to
  decay carries half.
- **Don't bank on the mine.** A mine's ore sells at a world ore price that swings further than
  grain's. Its card shows the price, its forecast and what the mine earns across it, and the
  risks ahead warn when a slump would empty the treasury or miss a repayment.
- **Prepare for shocks abroad.** Failed harvests abroad push the grain price up, and an ore glut
  pushes the ore price down, for three quarters. Each is announced two quarters ahead, in the
  report, under the price and among the risks: stock the reserve before grain grows dear, and don't
  borrow against the mine before its ore cheapens.
- **If you build, build early.** The timeline under the map shows how long a site would be in
  use before the vote. What you build has to be kept up, so leave room for upkeep.

### A Phase 2 play-through

To play the finished Phase 2 game from the start on a seed the balance run knows well:

```powershell
Set-Location C:\docs\git\surviveAndGrow; npm.cmd run dev -- --open '/?seed=8'
```

This starts the game at http://localhost:41730/?seed=8 and opens it in your browser. On seed 8
the scripted chain builder wins in quarter 37, early in its second term; the scripted player who
builds only small sites loses the vote in its third term, and one who builds only power in its
second. Try to win the same way:

1. In the first year, build the Korr Falls power station and then its three power lines, and
   send relief wherever the risks show hunger. Expect Developing, and a 3-point drop in the
   approval baseline, soon after the lines open.
2. Keep the budget a little in surplus and save: the treasury must hold a site's whole cost
   before it can start. Start Saltmouth port (or the cheaper quay), then the trunk road, then the
   Korrgate mine, each as soon as the treasury can pay for it. Use the infrastructure lens to see
   which links of the chain are still missing.
3. Spend your savings on approval in the last year before each vote. The second vote is the
   hard one: the chain costs most then, and pays off after it.
4. Once the mine earns, build the small sites and spend on health and education. The game is won
   when prosperity has stood at 42 or more, Prosperous, for four quarters running; the top bar
   counts them.

Expected: the mine adds $60.0m a quarter to the Korr Highlands once its road and port are in use,
the prosperity breakdown is led by infrastructure access, and a win shows the end-of-game summary
with each term served. Losing the second vote while the chain is still being built is common: it
is the risk the game is about.

### A Phase 3 play-through

To play the finished Phase 3 game, with borrowing, from the start on a seed the balance run
knows well:

```powershell
Set-Location C:\docs\git\surviveAndGrow; npm.cmd run dev -- --open '/?seed=6'
```

This starts the game at http://localhost:41730/?seed=6 and opens it in your browser. On seed 6
the scripted chain builder, which saves up for each site, loses the vote at the end of its
second term; the scripted sensible borrower wins in quarter 36, late in its second term; and the
reckless borrower is bailed out and loses its first vote. Try to win the way the sensible
borrower does:

1. Borrow for the mine's chain rather than save for it. In the first year a loan of $10.0m with
   the treasury's $42.0m pays for Saltmouth port, then a $50.0m loan over 12 quarters for the
   trunk road; in the second year a $10.0m loan tops up the savings for the Korrgate mine. The
   money arrives as the quarter ends: start the site the quarter after. Keep the repayments
   within 15% of a quarter's revenue.
2. Keep the budget balanced with the repayments in it. Expect the tax near 27% while the loans
   run, approval to sag in the second and third years, and the credit rating to rise to AA as
   the repayments are made on time.
3. Once the mine earns, in the fourth year, the loans are soon repaid and the tax can come down.
   Build the power station from savings, spend on approval in the last year before the vote, and
   win it.
4. In the second term build the power lines and the small sites. Each tier passed lowers
   approval for a while. The game is won when prosperity has stood at 42 or more for four
   quarters running with the debt burden no more than 30% of a year's revenue; the top bar
   counts the quarters and says whether the debt test is passed.

Expected: the finance panel offers loans at 6% to 10% while the nation is rated A; the debt and
its burden sit beside the treasury in the top bar; the rating is raised to AA in the third year.
To see the other side, borrow everything the finance panel allows and spend it: the treasury
cannot cover a repayment, a bailout consolidates the debt, approval takes a 12-point blow and
austerity holds for 8 quarters.

The rules as built, one heading per mechanic, are in [docs/rules.md](docs/rules.md).

## Write a country

A country is one data file; the engine contains no country-specific code. The country that ships
is [src/countries/tavara.json](src/countries/tavara.json), and it is the best guide to the format.
All positions are coordinates in a fixed map frame 1080 wide and 720 high.

`sites` lists where things can be built. Each site has an `id`, a `name`, the `region` it belongs
to and a `type` from the game's own list: `irrigation`, `farmRoad`, `grainStore`, `mine`,
`trunkRoad`, `port`, `shallowPort`, `powerStation` or `powerLine`. What a type costs, how long it takes and what it does are
the game's, not the country's.

- An irrigation scheme, a grain store, a mine, a port, a shallow port and a power station stand
  in one place, given by `at`, which must lie inside the site's region.
- A farm road, a trunk road and a power line run along a line, given by `route` as two or more positions. Every position must
  lie inside the country, and the route must start or end in the site's region, which is the
  region the road serves or the line powers.
- In a file of `"formatVersion": 2`, a site may list the `id`s of the sites it depends on in
  `dependsOn`. Each must be another site in the file, and the dependencies must not go round in a
  circle. A file of format 1 cannot say this, and still loads as it is.
- A mine earns only through its chain, so it must depend, directly or through other sites, on a
  port or shallow port: in Tavara the mine depends on a trunk road and the trunk road on a port. A
  mine therefore needs format 2.
- A power line carries power only from a station, so it must depend on a power station, directly
  or through other power lines: in Tavara each line depends on Korr Falls power station. A power
  line therefore needs format 2. Any site may depend on a power line or station, as a mine may
  to need power for its chain.
- In a file of `"formatVersion": 3`, a site may list the `id`s of the sites it is an alternative
  to in `alternatives`. Saying so on one side is enough: building on either closes the other. Each
  must be another site in the file that plays the same part in a chain (a port and a shallow port
  are both outlets) and in bringing power, and a site may not depend on its own alternative. A site that depends on a
  site with alternatives depends on whichever of them is chosen: in Tavara the trunk road depends
  on Saltmouth port, and Saltmouth quay, its alternative, serves as well. Files of formats 1 and 2
  cannot say this, and still load as they are.

The starting budget in `start.budget` may leave out `upkeep`: the game then starts with enough
upkeep to keep in good repair every one of the file's sites that can stand together, choosing the
costlier of alternatives, rounded up to the next $1.0m.

In a file of format 2, a region may also set `populationGrowth`, its people's growth in percent a
year, from 0 to 10. A region that leaves it out grows at the game's own rate.

In a file of `"formatVersion": 4`, a country can start in debt. `start.loans` lists the loans it
owes as the game begins, each with its `amount` in millions, its yearly `rate` in percent (to at
most two decimal places, from 0 to 25) and the `quarters` left to repay it (1 to 40):

```json
"loans": [
  { "amount": 7, "rate": 7, "quarters": 8 },
  { "amount": 4, "rate": 9.5, "quarters": 12 }
]
```

They are owed as Loan 1, Loan 2 and so on, in the file's order, and repaid like any other loan,
in level repayments of interest and principal, the first in the game's first quarter. The game
opens at the credit rating its debt burden leads to under the usual rules; the file does not
state it. A country may start with at most five loans, owing between them no more than half a
year's output from its regions, and their first repayments must be payable from the starting
treasury and the first quarter's tax, so that the game cannot open on a missed payment. Testland,
the test country, starts owing $11.0m, which opens it at BBB. A file of an earlier format starts
owing nothing, and still loads as it is.

In a file of `"formatVersion": 5`, `crossings` names the border crossings, the trade links open
from the start. Each has an `id`, a `name`, the `neighbour` it leads to (the `id` of one of
`map.neighbours`) and the `tonnes` it carries across the border a quarter, in whole thousands from
1,000 to 100,000:

```json
"crossings": [
  { "id": "korr-pass", "name": "Korr Pass", "neighbour": "voskar", "tonnes": 50000 }
]
```

Ports in use add their own capacity. A file of format 5 that lists no crossings trades only
through its ports. A file of an earlier format cannot name crossings, and is read as having one on
each neighbour carrying 45,000 tonnes; it still loads as it is.

The map draws the trade routes from the file alone, so no country needs artwork for them. A
crossing stands on the country's border with its neighbour, at the point nearest the
neighbour's `label`, so place the label where the crossing should be. A port's shipping lane runs
straight from the port to whichever edge of the map it reaches over the least land, the
country's own or a neighbour's: give a port a stretch of open sea between it and the edge.
Each route is tagged with what it carried last quarter against what it can carry.

Each region's `eventLikelihood` says how likely each of the game's events is to strike it in a
year: the chance, from 0 to 1, of a `drought` (40% off its harvest) and, in a file of
`"formatVersion": 6`, of a `flood` (30% off its harvest, and every site in use there decaying
until its upkeep is paid). Both begin with the planting season, and they share one roll in each
region, so a region's chances of the two may come to at most 1 between them. An event the region
leaves out never strikes it. A file of an earlier format cannot name floods, and still loads as it
is, with none:

```json
"eventLikelihood": { "drought": 0, "flood": 0.1 }
```

In a file of `"formatVersion": 7`, `priceShockLikelihood` says how likely each world price shock
is: the chance, from 0 to 1, that it is announced as a quarter begins, unless one of its kind is
already announced or in force. The shocks are the game's own: `failedHarvestsAbroad` (the world
grain price pushed up by $36 a tonne a quarter) and `oreGlut` (the world ore price pushed down by
$20 a tonne a quarter), each announced two quarters before it first moves the price and in force
for three. One the file leaves out never comes, and the whole entry may be left out. A file of an
earlier format cannot name them, and still loads as it is, with none. Tavara gives failed harvests
abroad 4% a quarter and an ore glut 5%:

```json
"priceShockLikelihood": { "failedHarvestsAbroad": 0.04, "oreGlut": 0.05 }
```

`dilemmaLikelihood` says how likely each dilemma is: the chance, from 0 to 1, that it arises as a
quarter begins, provided the conditions it needs hold. The dilemmas are the game's own:
`grainOffer` (the reserve is below its safe level), `merchantOffer` (the first quarter of a year,
with the reserve above its safe level), `emergencyWorks` (a region is in drought or flood),
`strikeTalks` (a region is striking or protesting), `teachersPay` (any time) and `donorGrant` (the
treasury is low). One the file leaves out never arises, and the whole entry may be left out. What each
dilemma offers scales with the country's population, so the same dilemma suits a country of any
size.

To try a country of your own, put the file in `public/countries/` and name it in the address:
`?country=/countries/mine.json`. The game checks the file as it loads and lists everything that
is wrong with it.

A saved game carries the country file it was started on, so it goes on being played on that
country even after you edit the file. Start a new game to play your changes.

## Check it

```powershell
npm run verify
```

This one command runs every check, in this order, and fails on any error or warning. Continuous
integration runs the same command on every push and pull request.

| Gate | Tool | Script |
| --- | --- | --- |
| Formatting | Prettier | `npm run format:check` |
| Lint and static bug analysis | ESLint with the strict, type-checked typescript-eslint rules | `npm run lint` |
| Type check | TypeScript in strict mode | `npm run typecheck` |
| Simulation tests | Vitest | `npm run test:unit` |
| Dependency vulnerabilities | `npm audit`, less the dated exceptions in `scripts/audit.ts` | `npm run audit` |
| Build | Vite | `npm run build` (run by the next gate) |
| Browser tests | Playwright, against the production build | `npm run test:e2e` |

`npm run format` rewrites files to the house format.

### Run one test

One simulation test, by file and, optionally, by name:

```powershell
npx vitest run tests/sim/loans.test.ts -t "is paid before the budget"
```

One browser test. The browser tests serve the production build in `dist/`, not the source, so
build first, and build again after every change to `src/`, or the test runs against the old
build:

```powershell
npm run build && npx playwright test tests/e2e/loans.spec.ts -g "a loan is planned"
```

`npm run test:e2e` builds for you. Set `E2E_PORT` to run the browser tests from two checkouts at
once without their servers colliding.

[tests/e2e/app.ts](tests/e2e/app.ts) is where a browser test starts a game in a known state:
`startGame` and `openApp` with a seed or a country file of the test's own; `tavaraWith`,
`tavaraWithDroughtIn` and `testlandFile` for a country with chance pinned (which dilemmas arise,
where droughts and floods strike, and people who do not grow); and `tavaraPoisedBelowDeveloping`
and `tavaraProsperous` for one prepared near a tier. Add a new prepared country there.

Gates that do not apply:

- **Secret scanning** has no local tool. The game has no server and holds no credentials;
  GitHub's push protection covers the repository.
- **Packaging** is the Vite build. Nothing is published to a registry.

## Balance it

```powershell
npm run balance
```

This plays scripted players through whole games with no screen, on the countries as they ship,
for up to four terms each, and reports how often each wins on prosperity, how often it is still in
office when its terms are up, and what the others lose to: the vote, by term, or famine, by
region. It also gives the terms served, the quarter of each win, and the prosperity and tier each
game reached, and what each player borrowed: how many games a bailout struck, how often the debt
test held back a win and whether it was won later, and the debt burden. It prints the tables and writes them to `balance-results.md`. It is not one of the
checks and gates nothing; a short run of the same players over a few seeds is part of the
simulation tests. The games are shared out among worker processes, so a run uses most of the
machine; 300 seeds of every player take a few minutes.

Six players are what the balance is judged by: one that does nothing, one that spends
everything on popularity, one that plays sensibly but builds no large site, one that builds
power and the mine's chain and saves up for each site, one that builds the same sites but
borrows for them within limits of its own, and one that borrows recklessly. They are in
`tests/balance/players.ts`, with a handful of one-lever players that probe for a trick that wins
on its own, two that build only part of the chain and one that borrows all it can to build
everything at once.

The runs the values were tuned to, with their seeds, the values changed and what they showed, are
recorded in [docs/balance/phase-1.md](docs/balance/phase-1.md) for Phase 1,
[docs/balance/phase-2.md](docs/balance/phase-2.md) for Phase 2 and
[docs/balance/phase-3.md](docs/balance/phase-3.md) for Phase 3.

Set these before the command to change the run:

| Variable | Meaning | Default |
| --- | --- | --- |
| `BALANCE_SEEDS` | The seeds to play, as `from-to` | `1-300` |
| `BALANCE_COUNTRY` | `tavara`, `testland` or `both` | `both` |
| `BALANCE_PLAYERS` | `all` adds the one-lever and partial players; or the players' names, separated by commas | the six |
| `BALANCE_TERMS` | The most terms each game is played for | `4` |
| `BALANCE_WORKERS` | How many games are played at once | all but two processors |
| `BALANCE_OUT` | Where the tables are written | `balance-results.md` |

```powershell
$env:BALANCE_SEEDS = '1001-2200'; $env:BALANCE_PLAYERS = 'all'; npm run balance
```

## How the code is laid out

- `src/sim/` is the simulation. It is a pure function of the game state, the player's decisions
  and a seeded random generator, and it knows nothing about the interface, the clock or storage.
  The lint rules and `tsconfig.sim.json` enforce this. Everything else reaches it through
  `src/sim/index.ts`. [src/sim/README.md](src/sim/README.md) gives the order a quarter is
  resolved in and the files a new mechanic touches.
- `src/countries/` holds the countries that ship, as data files. The engine contains no
  country-specific code.
- `src/ui/` is the interface. Each component imports its own stylesheet, named after it
  (`MapView.css` beside `MapView.tsx`). `styles.css` holds the colours, the base elements and
  the rules several components share, and `chart.css` and `map-card.css` are shared by the
  two components that draw charts and the three map cards. `main.tsx` imports `styles.css`
  before the components, so their rules come after it.
- `tests/sim/` tests the game rules through the simulation's public interface.
- `tests/e2e/` drives the real app in a browser at 2560 x 1440.
- `tests/countries/` holds a crude second country, used to prove that nothing is tied to the first.
- `tests/balance/` holds the scripted players and the balance run.
- `tests/saves/` holds a saved game from each save format, kept so that every later release can
  prove it still opens them. They are never regenerated; see its README.
- `docs/adr/` records decisions that are hard to reverse.

The save format and the country file format are compatibility contracts: a later release must
still read what this one writes. The save format, and how to change it, are in
[docs/adr/0001-save-format.md](docs/adr/0001-save-format.md). `npm run save:fixture` writes the
kept save for a new format.

Both test suites run in parallel. They stop at the first failure in continuous integration and
report every failure locally.
Each browser test has storage of its own, so one test's saved game never reaches another.
