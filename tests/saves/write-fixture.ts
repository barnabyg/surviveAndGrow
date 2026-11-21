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

  // Tavara as it ships, with chance pinned: no drought, and the teachers asking for a rise
  // now and then. Format 8 added ore to the goods, with a world ore price that a mine's chain
  // earns at. The game keeps the budget it starts with, starts building Korrgate mine in its
  // first quarter, buys 10,000 tonnes of grain for the national reserve in its first quarter
  // and 20,000 in its third, and is saved as Year 1 · Quarter 4 begins: the world grain and ore
  // prices have each moved three times, and the last report has the second import in it.
  const country = loadCountry({
    ...tavaraFile,
    regions: tavaraFile.regions.map((region) => ({ ...region, eventLikelihood: { drought: 0 } })),
    dilemmaLikelihood: { teachersPay: 0.3 },
  });
  const imports = [10_000, 0, 20_000];
  let game = createGame(country, 2026);
  let report: TurnReport | null = null;
  for (const tonnes of imports) {
    // Each dilemma is answered with its last option, which costs neither money nor food.
    const dilemmaChoice = pendingDilemma(game)?.options.at(-1)?.id ?? null;
    const result = advanceQuarter(game, {
      budget: game.budget,
      startProjects: game.date.quarter === 1 ? ['korr-mine'] : [],
      trade: tonnes === 0 ? [] : [{ good: 'grain', direction: 'import', tonnes }],
      dilemmaChoice,
    });
    game = result.state;
    report = result.report;
    if (game.outcome.status !== 'playing')
      throw new Error(`The game ended: ${game.outcome.headline}`);
  }
  expect(game.date).toEqual({ year: 1, quarter: 4 });
  expect(game.worldPrices.grain).toHaveLength(4);
  expect(game.worldPrices.ore).toHaveLength(4);
  expect(game.projects.map((project) => project.siteId)).toEqual(['korr-mine']);
  expect(report?.food.contributions).toContainEqual({ label: 'Grain imported', amount: 20_000 });

  writeFileSync(file, `${JSON.stringify(saveGame(game, report), null, 2)}\n`);
});
