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
always give the same game.

What is in the game so far:

- Set the tax rate and the spending for each area in the right column. The panel shows what a
  change would do before you commit it. End the quarter with the button in the top bar.
- Each region feeds itself from its own harvest, which comes in quarter 4, and sends its surplus
  to the national food reserve. The harvest forecast is a range that narrows through the year.
- A drought cuts a region's harvest and is announced two quarters ahead. A region that runs short
  goes from adequate to tight, to shortage, to famine. Pick the region on the map, or in the food
  relief panel, to send it relief from the national reserve.
- A famine that lasts two quarters running collapses the state and ends the game.
- Click the treasury or the food reserve in the top bar to see what moved it.

## Write a country

A country is one data file; the engine contains no country-specific code. The country that ships
is [src/countries/tavara.json](src/countries/tavara.json), and it is the best guide to the format.
All positions are coordinates in a fixed map frame 1080 wide and 720 high.

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
