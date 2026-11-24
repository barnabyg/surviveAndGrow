# Survive and Grow

A turn-based economics and politics survival game that runs in the browser. You lead a small
developing country: raise its living standards, and stay in office long enough to see it done.
The game is won on prosperity held, and lost at the vote, to famine, or to a coup by an army
left to plot.

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

New to the game? Choose **Tutorial** on the start screen. It plays your first year with you, a
lesson at a time, each asking you to do one thing; the lessons are listed in
[docs/screen.md](docs/screen.md). The **Tour** button in the top bar shows what every part of the
screen is for, at any time. In any game, a short tip explains each mechanic the first time it
appears; **Tips on** in the top bar turns them off, and back on to see them again.

Add `?seed=7` to the address to replay a known game: the same seed and the same decisions
always give the same game. The summary at the end of a game gives its seed and offers to replay it.

The game saves itself in your browser as each quarter ends. Open it again and it offers to resume
the saved game or to start a new one.

[docs/playing.md](docs/playing.md) is the player's guide: how saved games behave, how to get
through your first term, and a play-through on a known seed. What each part of the screen shows
is in [docs/screen.md](docs/screen.md), and the rules as built, one heading per mechanic, in
[docs/rules.md](docs/rules.md).

## Write a country

A country is one data file; the engine contains no country-specific code. The format, and how to
try a country of your own with `?country=`, are in [docs/countries.md](docs/countries.md). A
country can hide deposits of ore for surveys to find, lock a site until a technology is known,
and say what it starts by spending on Defence, which holds its army loyal or does not.

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
| Simulation and UI tests | Vitest | `npm run test:unit` |
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

The forewarning sweeps in `tests/sim/forewarning-*.test.ts` play a fixed sample of 30 seeds in
the unit run. `npm run forewarning` plays all 300 seeds of each, for a balance ticket that needs
the whole sweep; it is not one of the gates.

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
office when its terms are up, and what the others lose to: the vote, by term, famine, by
region, or a coup. It also gives the terms served, the quarter of each win, and the prosperity and tier each
game reached, and what each player borrowed: how many games a bailout struck, how often the debt
test held back a win and whether it was won later, and the debt burden; and what each traded:
the grain bought and sold abroad, what it brought in and cost, and the world price shocks,
droughts and floods each game met; and what each researched and surveyed: the technologies it
came to know and the quarter each became known, the regions surveyed, the deposits found and how
many of them were mined. It prints the tables and writes them to `balance-results.md`. It is not one of the
checks and gates nothing; a short run of the same players over a few seeds is part of the
simulation tests. The games are shared out among worker processes at below-normal priority, on half the
processors by default; 300 seeds of every player take a few minutes. How large a balance ticket's
runs should be is in [docs/agents/balance-tickets.md](docs/agents/balance-tickets.md).

Eleven players are what the balance is judged by: one that does nothing, one that spends
everything on popularity, one that plays sensibly but builds no large site, one that builds
power and the mine's chain and saves up for each site, one that builds the same sites but
borrows for them within limits of its own, one that borrows recklessly, one that plays as the
chain builder does and trades grain with timing, one that relies on the mine alone and never
trades, and three that play as the chain builder does and also research or survey: one that
researches the improvements to the sites it has built, one that chases the sites research
unlocks, and one that surveys early and builds what it finds. They are in `tests/balance/players.ts`, with a handful of one-lever players that probe
for a trick that wins on its own, two that build only part of the chain, one that borrows all it
can to build everything at once, a trader blind to world price shocks, a borrower wary of ore
gluts and an unlocker that holds off whatever would rule a locked site out.

The runs the values were tuned to, with their seeds, the values changed and what they showed, are
recorded in [docs/balance/phase-1.md](docs/balance/phase-1.md) for Phase 1,
[docs/balance/phase-2.md](docs/balance/phase-2.md) for Phase 2,
[docs/balance/phase-3.md](docs/balance/phase-3.md) for Phase 3,
[docs/balance/phase-4.md](docs/balance/phase-4.md) for Phase 4 and
[docs/balance/phase-5.md](docs/balance/phase-5.md) for Phase 5.

Set these before the command to change the run:

| Variable | Meaning | Default |
| --- | --- | --- |
| `BALANCE_SEEDS` | The seeds to play, as `from-to` | `1-300` |
| `BALANCE_COUNTRY` | `tavara`, `testland` or `both` | `both` |
| `BALANCE_PLAYERS` | `all` adds the one-lever and partial players; or the players' names, separated by commas | the eleven |
| `BALANCE_TERMS` | The most terms each game is played for | `4` |
| `BALANCE_SHOCKS` | `none` plays the same games without world price shocks | `shipped` |
| `BALANCE_WORKERS` | How many games are played at once, each at below-normal priority | half the processors |
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
  two components that draw charts and the four map cards. `main.tsx` imports `styles.css`
  before the components, so their rules come after it.
- `tests/sim/` tests the game rules through the simulation's public interface, and checks the
  figures the docs restate against `src/sim/balance/`. It imports nothing from `src/ui/`.
- `tests/ui/` tests the interface's own logic without a browser: the infrastructure lens's
  wording, the first-time tips and the tutorial game's seed.
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
