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
  type Decisions,
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

  // Tavara as it ships, with chance pinned: no drought and the teachers asking for a rise now
  // and then. Format 11 let a project research a technology. The game starts Lowmere grain
  // store and research into drought-resistant seed in its first quarter, on the budget it
  // starts with, and plays two more. It is saved as Year 1 · Quarter 4 begins, with the grain
  // store in use and the seed three of its four quarters researched.
  const country = loadCountry({
    ...tavaraFile,
    regions: tavaraFile.regions.map((region) => ({ ...region, eventLikelihood: { drought: 0 } })),
    dilemmaLikelihood: { teachersPay: 0.3 },
  });
  const quarters: Partial<Decisions>[] = [
    { startProjects: ['lowmere-store'], startResearch: 'droughtResistantSeed' },
    {},
    {},
  ];
  let game = createGame(country, 2026);
  let report: TurnReport | null = null;
  for (const decisions of quarters) {
    // Each dilemma is answered with its last option, which costs neither money nor food.
    const dilemmaChoice = pendingDilemma(game)?.options.at(-1)?.id ?? null;
    const result = advanceQuarter(game, { budget: game.budget, ...decisions, dilemmaChoice });
    game = result.state;
    report = result.report;
    if (game.outcome.status !== 'playing')
      throw new Error(`The game ended: ${game.outcome.headline}`);
  }
  expect(game.date).toEqual({ year: 1, quarter: 4 });
  expect(
    game.projects.map((project) => [project.target, project.status, project.quartersPaid]),
  ).toEqual([
    [{ kind: 'site', siteId: 'lowmere-store' }, 'operating', 2],
    [{ kind: 'technology', technology: 'droughtResistantSeed' }, 'building', 3],
  ]);

  writeFileSync(file, `${JSON.stringify(saveGame(game, report), null, 2)}\n`);
});
