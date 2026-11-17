import { existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect, it } from 'vitest';
import tavaraFile from '../../src/countries/tavara.json';
import {
  advanceQuarter,
  createGame,
  loadCountry,
  pendingDilemma,
  SAVE_FORMAT_VERSION,
  saveGame,
  type TurnReport,
} from '../../src/sim';

/**
 * Writes the kept save for the current save format: `npm run save:fixture`. It is not part
 * of the test suite. Run it once when a release raises the save format version, commit the
 * file it writes, and add a test that the new file loads. It will not write over a file that
 * is already there, because a kept save is a record of what a release really wrote.
 */
it(`writes the kept save for save format ${SAVE_FORMAT_VERSION}`, () => {
  const file = path.join(import.meta.dirname, `format-${SAVE_FORMAT_VERSION}.json`);
  expect(existsSync(file), `${file} is already kept and must never be written again`).toBe(false);

  // Tavara as it ships, with chance pinned: no drought, and the merchants calling each new
  // year. Format 3 added terms of office and the win on prosperity. So that the game reaches
  // both within a few years, the country has a tenth of the people, which makes every region
  // rich per head, and a treasury to last; it starts on $1.0m each for health and education.
  // Spent on generously, those build up until prosperity passes into Prosperous early in the
  // second term, after the government is re-elected, and the game is saved two quarters in.
  const country = loadCountry({
    ...tavaraFile,
    regions: tavaraFile.regions.map((region) => ({
      ...region,
      population: Math.round(region.population / 10),
      eventLikelihood: { drought: 0 },
    })),
    dilemmaLikelihood: { merchantOffer: 1 },
    start: {
      ...tavaraFile.start,
      treasury: 2000,
      budget: {
        ...tavaraFile.start.budget,
        spending: { ...tavaraFile.start.budget.spending, health: 1, education: 1 },
      },
    },
  });
  let game = createGame(country, 2026);
  let report: TurnReport | null = null;
  while (game.prosperousQuarters < 2) {
    // Each dilemma is answered with its last option, which costs neither money nor food.
    const dilemmaChoice = pendingDilemma(game)?.options.at(-1)?.id ?? null;
    const result = advanceQuarter(game, {
      // Low tax, and as much on health and education as the budget allows.
      budget: {
        taxRatePercent: 10,
        spending: { ...game.budget.spending, health: 200, education: 200 },
      },
      startProjects: game.history.length === 1 ? ['lowmere-store', 'lowmere-road'] : [],
      dilemmaChoice,
    });
    game = result.state;
    report = result.report;
    if (game.outcome.status !== 'playing')
      throw new Error(`The game ended: ${game.outcome.headline}`);
  }

  writeFileSync(file, `${JSON.stringify(saveGame(game, report), null, 2)}\n`);
});
