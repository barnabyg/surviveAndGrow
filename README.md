# Survive and Grow

A turn-based economics and politics survival game that runs in the browser. You lead a small
developing country: raise its living standards, and stay in office long enough to see it done.

The design is in [docs/design.md](docs/design.md).

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

The game is the first phase of the design, "Survive a term": 20 quarters, ending in an election.
It is meant to be hard. You take office with approval near 46%, a budget that loses $5.0m a
quarter, and a food reserve below its safe level. Left alone, the country votes you out, if a
drought does not starve a region first.

- **Feed people first.** Watch the risks in the left column. When a region runs short, pick it
  on the map and send it relief, and pay for relief only while someone needs it.
- **Stay solvent.** The treasury cannot go below nothing: spending is cut, and building pauses.
- **Earn the vote over the whole term.** Approval moves slowly towards where your tax and
  spending would settle it, and the election forecast in the right column says where you stand.
  Below 40% a region strikes, which costs far more revenue than the tax that provoked it.
- **If you build, build early.** The timeline under the map shows how long a site would be in
  use before the vote.

What is in the game:

- Set the tax rate and the spending for each area in the right column. The panel shows what a
  change would do before you commit it. End the quarter with the button in the top bar.
- Each region feeds itself from its own harvest, which comes in quarter 4, and sends its surplus
  to the national food reserve. The harvest forecast is a range that narrows through the year.
- A drought cuts a region's harvest and is announced two quarters ahead. A region that runs short
  goes from adequate to tight, to shortage, to famine. Pick the region on the map, or in the food
  relief panel, to send it relief from the national reserve.
- A famine that lasts two quarters running collapses the state and ends the game.
- The term is 20 quarters, and the election is held when the last of them ends. The vote share is
  national approval on polling day, moved up to 3 points either way by the campaign. With 50% or
  more you win the game; with less you lose it. The top bar counts down to the election, and the
  right column forecasts the vote as a range against the 50% needed.
- However the game ends, a summary gives the outcome, its cause and the treasury, food reserve
  and approval over the term. From it you can replay the same game or start a new one.
- Approval is the third vital sign. Each region has its own, and the national figure is their
  average by population. It answers to the region's food situation, the tax rate, and health,
  education and security spending per head, and it moves a tenth of the way each quarter towards
  where those would settle it, so the public remembers: a last-minute giveaway moves the vote
  little, and a hard year is not forgotten by polling day. The budget panel shows what a change would do to approval next
  quarter and where it is heading.
- A region whose approval falls below 40% goes on strike and produces 30% less, which costs the
  treasury tax. Below 30% it protests and produces 60% less. Both end when approval recovers.
- Click the treasury, the food reserve or approval in the top bar to see what moved it. Approval
  also lists what it is made of.
- A short trend line beside the treasury, the food reserve and approval shows the last eight
  quarters, with the food reserve's safe level and the strike threshold drawn as dashed lines. The
  left column has a larger approval chart with the strike threshold and the 50% line marked.
- After each quarter the left column reports what happened and why, the most serious first: the
  budget outcome, forced spending cuts, the harvest, hunger and events. A report about one region
  is a button: select it to pick that region out on the map and open its card. A quarter in which
  nothing notable happened says so.
- The map marks the sites where something could be built: an irrigation scheme, a farm road or a
  grain store. An empty site is a dashed round marker with the symbol of its type, and a possible
  road is a dashed line. Select one to open a card with its cost, build time and effect. The
  legend under the map explains the marks.
- Start a project from a site's card, or from the list of what the treasury can afford in the
  right column. The treasury must hold the whole cost, which is then paid in instalments over the
  build time, as a fixed cost shown apart from the budget's sliders. Building starts when the
  quarter ends, so until then the plan can be taken back.
- The budget's own spending is paid first and instalments out of what is left, the oldest project
  first. A project the treasury cannot pay for pauses for the quarter and carries on when it can
  be paid. The map shows how far each has got, and a road is drawn along the part that is built.
- A finished site is in use from the next quarter. Irrigation halves how far the weather and
  drought move its region's harvest; a farm road halves the share of its region's surplus lost on
  the way to the reserve; a grain store cuts what spoils in the national reserve by a quarter.
  Several of one type multiply together.
- Under the map a timeline shows the whole term: every quarter to the election, with the past
  hatched, each harvest underlined and the vote marked. Each project is a bar over the quarters
  it is built in, followed by a bar that says how many quarters it will be in use before the
  vote. Pick out an empty site on the map and the timeline shows, dashed, what building there
  would mean if it began now, or says that it would not be finished before the vote. A project
  the treasury cannot pay for opens a quarter later for each quarter it waits.
- Buttons above the map choose what it shows. The country view is the land as it looks. The food
  lens colours each region by its food situation, and the approval lens by its approval, with
  hatching over a region on strike and cross-hatching over one in protest. Each lens has a scale
  beside the buttons, its steps differ in lightness, and every region also carries its value as
  text. The lens stays as you chose it from quarter to quarter, and sites, routes, events and
  relief are drawn the same under all of them.
- The left column lists the risks ahead: famine in a region, strikes, a treasury that runs out,
  and, in the term's last four quarters, losing the vote. The game plays the next four quarters with your committed decisions held as they are, once
  for each course the weather could take and each drought that could still begin, and lists each
  danger with how likely it is, as a five-step meter and in words, and a line saying why. Hunger
  shows a quarter after the harvest that causes it, so famine alone is looked for one quarter
  further. A danger too unlikely to matter is left out, unless it would end the game, and a risk
  to one region picks that region out on the map. Neither famine nor a lost election can end the
  game without having been listed first.
- Some quarters open with a dilemma: a neighbour offering grain, merchants wanting to buy from
  the reserve, a region in drought asking for emergency works, strikers asking for talks,
  teachers demanding a pay rise, a donor offering a grant with conditions. Each has two or three
  options, and each option states everything it will do, in money, food and approval, before you
  choose. You can put the dilemma aside to look at the country, but the quarter cannot end until
  you choose, and you can change your choice until it does. An option the treasury or the reserve
  cannot cover is shown and cannot be chosen. The choice takes effect when the quarter ends, the
  outlook and the risks count it at once, and the next report says what you chose and what it did.
- Which dilemmas arise, and when, is fixed by the seed, and they leave the weather a seed brings
  as it was. The risks ahead suppose that no new dilemma arises, since what one does is your choice.
- The side columns scroll on their own when they run long, and the map gives up height to the
  timeline, so the whole screen stays in view.

## Write a country

A country is one data file; the engine contains no country-specific code. The country that ships
is [src/countries/tavara.json](src/countries/tavara.json), and it is the best guide to the format.
All positions are coordinates in a fixed map frame 1080 wide and 720 high.

`sites` lists where things can be built. Each site has an `id`, a `name`, the `region` it belongs
to and a `type` from the game's own list: `irrigation`, `farmRoad` or `grainStore`. What a type
costs, how long it takes and what it does are the game's, not the country's.

- An irrigation scheme and a grain store stand in one place, given by `at`, which must lie inside
  the site's region.
- A farm road runs along a line, given by `route` as two or more positions. Every position must
  lie inside the country, and the route must start or end in the site's region, which is the
  region the road serves.

`dilemmaLikelihood` says how likely each dilemma is: the chance, from 0 to 1, that it arises as a
quarter begins, provided the conditions it needs hold. The dilemmas are the game's own:
`grainOffer` (the reserve is below its safe level), `merchantOffer` (the first quarter of a year,
with the reserve above its safe level), `emergencyWorks` (a region is in drought), `strikeTalks`
(a region is striking or protesting), `teachersPay` (any time) and `donorGrant` (the treasury is
low). One the file leaves out never arises, and the whole entry may be left out. What each
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
| Dependency vulnerabilities | `npm audit` | `npm run audit` |
| Build | Vite | `npm run build` (run by the next gate) |
| Browser tests | Playwright, against the production build | `npm run test:e2e` |

`npm run format` rewrites files to the house format.

Gates that do not apply:

- **Secret scanning** has no local tool. The game has no server and holds no credentials;
  GitHub's push protection covers the repository.
- **Packaging** is the Vite build. Nothing is published to a registry.

## Balance it

```powershell
npm run balance
```

This plays scripted players through whole games with no screen, on the countries as they ship,
and reports how often each wins and what the others lose to: famine, by region, or the vote. It
prints a table and writes it to `balance-results.md`. It is not one of the checks and gates
nothing; a short run of the same players over a few seeds is part of the simulation tests.

Three players are what the balance is judged by: one that does nothing, one that spends
everything on popularity, and one that plays sensibly. They are in `tests/balance/players.ts`,
with a handful of one-lever players that probe for a trick that wins on its own.

The run the Phase 1 values were tuned to, with its seeds, the values changed and what it showed,
is recorded in [docs/balance/phase-1.md](docs/balance/phase-1.md).

Set these before the command to change the run:

| Variable | Meaning | Default |
| --- | --- | --- |
| `BALANCE_SEEDS` | The seeds to play, as `from-to` | `1-300` |
| `BALANCE_COUNTRY` | `tavara`, `testland` or `both` | `both` |
| `BALANCE_PLAYERS` | `all` adds the one-lever players | the three |
| `BALANCE_OUT` | Where the table is written | `balance-results.md` |

```powershell
$env:BALANCE_SEEDS = '1001-2200'; $env:BALANCE_PLAYERS = 'all'; npm run balance
```

## How the code is laid out

- `src/sim/` is the simulation. It is a pure function of the game state, the player's decisions
  and a seeded random generator, and it knows nothing about the interface, the clock or storage.
  The lint rules and `tsconfig.sim.json` enforce this. Everything else reaches it through
  `src/sim/index.ts`.
- `src/countries/` holds the countries that ship, as data files. The engine contains no
  country-specific code.
- `src/ui/` is the interface.
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
report every failure locally. Set `E2E_PORT` to run the browser tests from two checkouts at once.
Each browser test has storage of its own, so one test's saved game never reaches another.
