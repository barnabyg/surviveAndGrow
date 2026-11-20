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
  // now and then. Format 6 added the bailout. The game borrows $50.0m over four quarters in
  // its first quarter on the lowest tax, and spends on everything at the most. In its second
  // it starts an irrigation scheme in Lowmere with what is left of the loan. In its third the
  // treasury and the low tax cannot cover the repayment: the bailout consolidates the debt
  // into a bailout loan, cuts the rating to B and imposes austerity for eight quarters, which
  // brings the budget within its floor and caps. It plays one quarter of austerity on that
  // budget, the scheme still being built, and is saved as Year 2 · Quarter 1 begins.
  const country = loadCountry({
    ...tavaraFile,
    regions: tavaraFile.regions.map((region) => ({ ...region, eventLikelihood: { drought: 0 } })),
    dilemmaLikelihood: { teachersPay: 0.3 },
  });
  const lavish = {
    taxRatePercent: 5,
    spending: {
      agriculture: 200,
      foodRelief: 0,
      health: 200,
      education: 200,
      security: 200,
      upkeep: 200,
    },
  };
  let game = createGame(country, 2026);
  let report: TurnReport | null = null;
  for (let quarter = 0; quarter < 4; quarter += 1) {
    // Each dilemma is answered with its last option, which costs neither money nor food.
    const dilemmaChoice = pendingDilemma(game)?.options.at(-1)?.id ?? null;
    const result = advanceQuarter(game, {
      budget: game.austerity === null ? lavish : game.budget,
      startProjects: quarter === 1 ? ['lowmere-irrigation'] : [],
      borrow: quarter === 0 ? [{ kind: 'loan', amount: 500, quarters: 4 }] : [],
      dilemmaChoice,
    });
    game = result.state;
    report = result.report;
    if (game.outcome.status !== 'playing')
      throw new Error(`The game ended: ${game.outcome.headline}`);
  }
  expect(game.date).toEqual({ year: 2, quarter: 1 });
  expect(game.austerity).toEqual({ quartersLeft: 7 });
  expect(game.credit.rating).toBe('b');
  expect(game.debts.map((debt) => [debt.kind, debt.quartersLeft])).toEqual([['bailout', 15]]);
  expect(game.projects.map((project) => [project.siteId, project.status])).toEqual([
    ['lowmere-irrigation', 'building'],
  ]);

  writeFileSync(file, `${JSON.stringify(saveGame(game, report), null, 2)}\n`);
});
