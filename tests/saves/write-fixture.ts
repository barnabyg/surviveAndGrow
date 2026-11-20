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
  // now and then. Format 5 added borrowing. The game borrows $25.0m over eight quarters in
  // its first quarter, to start an irrigation scheme in Lowmere, and $10.0m over four
  // quarters in its second. It is saved as Year 2 begins, owing on both loans, with three
  // repayments made on the first and two on the second, and the repayments in the report.
  const country = loadCountry({
    ...tavaraFile,
    regions: tavaraFile.regions.map((region) => ({ ...region, eventLikelihood: { drought: 0 } })),
    dilemmaLikelihood: { teachersPay: 0.3 },
  });
  let game = createGame(country, 2026);
  let report: TurnReport | null = null;
  for (let quarter = 0; quarter < 4; quarter += 1) {
    // Each dilemma is answered with its last option, which costs neither money nor food.
    const dilemmaChoice = pendingDilemma(game)?.options.at(-1)?.id ?? null;
    const result = advanceQuarter(game, {
      budget: game.budget,
      startProjects: quarter === 0 ? ['lowmere-irrigation'] : [],
      borrow:
        quarter === 0
          ? [{ kind: 'loan', amount: 250, quarters: 8 }]
          : quarter === 1
            ? [{ kind: 'loan', amount: 100, quarters: 4 }]
            : [],
      dilemmaChoice,
    });
    game = result.state;
    report = result.report;
    if (game.outcome.status !== 'playing')
      throw new Error(`The game ended: ${game.outcome.headline}`);
  }
  expect(game.debts.map((debt) => [debt.number, debt.quartersLeft])).toEqual([
    [1, 5],
    [2, 2],
  ]);
  expect(game.debts.every((debt) => debt.owed < debt.borrowed)).toBe(true);

  writeFileSync(file, `${JSON.stringify(saveGame(game, report), null, 2)}\n`);
});
