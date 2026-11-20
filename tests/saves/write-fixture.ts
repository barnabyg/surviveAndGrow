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
  // quarters in its second. The first loan and the scheme's instalments together cut the
  // credit rating to BBB, so the second loan is taken at BBB's dearer rate. Repaying both on
  // time raises it, quarter by quarter, to AA, the rating bonds need: in that quarter, the
  // ninth, the first loan's last repayment is made, and the game borrows $10.0m over four
  // quarters and issues a $20.0m bond maturing in eight, both at AA's rates. It is saved as
  // the next quarter begins, owing on both, with the rating back at A for the debt it took on.
  const country = loadCountry({
    ...tavaraFile,
    regions: tavaraFile.regions.map((region) => ({ ...region, eventLikelihood: { drought: 0 } })),
    dilemmaLikelihood: { teachersPay: 0.3 },
  });
  let game = createGame(country, 2026);
  let report: TurnReport | null = null;
  let issued = false;
  for (let quarter = 0; !issued; quarter += 1) {
    if (quarter >= 16) throw new Error('The game never reached AA to issue its bond.');
    // Each dilemma is answered with its last option, which costs neither money nor food.
    const dilemmaChoice = pendingDilemma(game)?.options.at(-1)?.id ?? null;
    issued = game.credit.rating === 'aa';
    const result = advanceQuarter(game, {
      budget: game.budget,
      startProjects: quarter === 0 ? ['lowmere-irrigation'] : [],
      borrow:
        quarter === 0
          ? [{ kind: 'loan', amount: 250, quarters: 8 }]
          : quarter === 1
            ? [{ kind: 'loan', amount: 100, quarters: 4 }]
            : issued
              ? [
                  { kind: 'loan', amount: 100, quarters: 4 },
                  { kind: 'bond', amount: 200, quarters: 8 },
                ]
              : [],
      dilemmaChoice,
    });
    game = result.state;
    report = result.report;
    if (game.outcome.status !== 'playing')
      throw new Error(`The game ended: ${game.outcome.headline}`);
  }
  expect(game.date).toEqual({ year: 3, quarter: 2 });
  expect(
    game.debts.map((debt) => [debt.kind, debt.number, debt.quartersLeft, debt.schedule]),
  ).toEqual([
    ['loan', 1, 4, 'level'],
    ['bond', 2, 8, 'atMaturity'],
  ]);
  expect(game.debts.map((debt) => debt.annualRateBasisPoints)).toEqual([500, 350]);

  writeFileSync(file, `${JSON.stringify(saveGame(game, report), null, 2)}\n`);
});
