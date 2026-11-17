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
  // now and then. Format 4 added upkeep and sites that decay without it. The game is taxed
  // at 25% and starts three projects at once: two irrigation schemes and then a farm road,
  // which are in use from Year 1 · Quarter 4. That quarter upkeep is cut to $1.0m, which keeps
  // up the two schemes, started first, but not the road, which decays. The game is saved as
  // Year 2 begins, with the road decaying and the decay in the report.
  const country = loadCountry({
    ...tavaraFile,
    regions: tavaraFile.regions.map((region) => ({ ...region, eventLikelihood: { drought: 0 } })),
    dilemmaLikelihood: { teachersPay: 0.3 },
  });
  const starts = ['lowmere-irrigation', 'dustwell-irrigation', 'lowmere-road'];
  let game = createGame(country, 2026);
  let report: TurnReport | null = null;
  for (let quarter = 0; quarter < 4; quarter += 1) {
    // Each dilemma is answered with its last option, which costs neither money nor food.
    const dilemmaChoice = pendingDilemma(game)?.options.at(-1)?.id ?? null;
    const result = advanceQuarter(game, {
      budget: {
        taxRatePercent: 25,
        spending: { ...game.budget.spending, upkeep: quarter === 3 ? 10 : 30 },
      },
      startProjects: quarter === 0 ? starts : [],
      dilemmaChoice,
    });
    game = result.state;
    report = result.report;
    if (game.outcome.status !== 'playing')
      throw new Error(`The game ended: ${game.outcome.headline}`);
  }
  expect(game.projects.map((project) => project.status)).toEqual([
    'operating',
    'operating',
    'decaying',
  ]);

  writeFileSync(file, `${JSON.stringify(saveGame(game, report), null, 2)}\n`);
});
