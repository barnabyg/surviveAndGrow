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

This starts the game and opens it in your browser. It is designed for a 2560 x 1440 display.

Add `?seed=7` to the address to replay a known game: the same seed and the same decisions
always give the same game. The summary at the end of a game gives its seed and offers to replay it.

What is in the game so far:

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
  education and security spending per head, and it moves a part of the way each quarter towards
  where those would settle it. The budget panel shows what a change would do to approval next
  quarter and where it is heading.
- A region whose approval falls below 40% goes on strike and produces 15% less, which costs the
  treasury tax. Below 30% it protests and produces 30% less. Both end when approval recovers.
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
- The left column lists the risks ahead: famine in a region, strikes, and a treasury that runs
  out. The game plays the next four quarters with your committed decisions held as they are, once
  for each course the weather could take and each drought that could still begin, and lists each
  danger with how likely it is, as a five-step meter and in words, and a line saying why. Hunger
  shows a quarter after the harvest that causes it, so famine alone is looked for one quarter
  further. A danger too unlikely to matter is left out, and a risk to one region picks that
  region out on the map. Famine cannot end the game without having been listed first.
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

Both test suites run in parallel. They stop at the first failure in continuous integration and
report every failure locally. Set `E2E_PORT` to run the browser tests from two checkouts at once.
