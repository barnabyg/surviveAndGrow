import { existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect, it } from 'vitest';
import tavaraFile from '../../src/countries/tavara.json';
import {
  advanceQuarter,
  armyLoyaltyStatus,
  coupStatus,
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
  // and then. Format 14 added the coup, and the count of quarters the army has plotted running.
  // The game, on seed 2026, cuts Defence to nothing from its first quarter and keeps the rest
  // of the budget it starts with. It is saved as Year 2 · Quarter 4 begins: the army has
  // plotted for two quarters running, two more bring a coup, and the last report says so.
  const country = loadCountry({
    ...tavaraFile,
    regions: tavaraFile.regions.map((region) => ({ ...region, eventLikelihood: { drought: 0 } })),
    dilemmaLikelihood: { teachersPay: 0.3 },
  });
  const undefended = {
    ...country.start.budget,
    spending: { ...country.start.budget.spending, defence: 0 },
  };
  const quarters: Partial<Decisions>[] = Array.from({ length: 7 }, () => ({ budget: undefended }));
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
  expect(game.date).toEqual({ year: 2, quarter: 4 });
  expect(game.budget.spending.defence).toBe(0);
  expect(armyLoyaltyStatus(game).stage).toBe('plotting');
  expect(game.plottingQuarters).toBe(2);
  expect(coupStatus(game)).toMatchObject({ plotting: true, held: 2, needed: 4, left: 2 });
  expect(report?.entries.map((entry) => entry.headline)).toContain(
    'The army plots: 2 quarters to a coup',
  );

  writeFileSync(file, `${JSON.stringify(saveGame(game, report), null, 2)}\n`);
});
