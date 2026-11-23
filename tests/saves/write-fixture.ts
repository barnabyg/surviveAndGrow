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
  // and then. Format 12 let a project survey a region. The game, on seed 3, starts a survey of
  // the Salt Coast in its first quarter and one of the Dry East in its second, on the budget it
  // starts with. It is saved as Year 1 · Quarter 3 begins: the Salt Coast surveyed, its
  // Westhaven deposit found and on the map, and the Dry East one of its two quarters surveyed.
  const country = loadCountry({
    ...tavaraFile,
    regions: tavaraFile.regions.map((region) => ({ ...region, eventLikelihood: { drought: 0 } })),
    dilemmaLikelihood: { teachersPay: 0.3 },
  });
  const quarters: Partial<Decisions>[] = [
    { startSurveys: ['salt-coast'] },
    { startSurveys: ['dry-east'] },
  ];
  let game = createGame(country, 3);
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
  expect(game.date).toEqual({ year: 1, quarter: 3 });
  expect(
    game.projects.map((project) => [project.target, project.status, project.quartersPaid]),
  ).toEqual([
    [{ kind: 'survey', regionId: 'salt-coast' }, 'surveyed', 2],
    [{ kind: 'survey', regionId: 'dry-east' }, 'building', 1],
  ]);
  expect(game.country.sites.map((site) => site.id)).toContain('westhaven-mine');

  writeFileSync(file, `${JSON.stringify(saveGame(game, report), null, 2)}\n`);
});
