import { existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect, it } from 'vitest';
import tavaraFile from '../../src/countries/tavara.json';
import {
  advanceQuarter,
  createGame,
  deterrenceStatus,
  loadCountry,
  pendingDilemma,
  SAVE_FORMAT_VERSION,
  saveGame,
  startFault,
  type Decisions,
  type GameState,
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
  // and then. Format 15 added deterrence against the neighbours, and their ambitions with
  // country file format 12. The game, on seed 2026, halves Defence to $1.0m from its first
  // quarter, taxes at 30% and each quarter starts the first site it can. It is saved as Year 2 ·
  // Quarter 3 begins: deterrence has fallen from 39.0% to 29.5%, the country has just reached
  // Developing, and with that Voskar has turned hostile and Selama watchful, as the last report
  // says.
  const country = loadCountry({
    ...tavaraFile,
    regions: tavaraFile.regions.map((region) => ({ ...region, eventLikelihood: { drought: 0 } })),
    dilemmaLikelihood: { teachersPay: 0.3 },
  });
  const budget = {
    taxRatePercent: 30,
    spending: { ...country.start.budget.spending, defence: 10 },
  };
  let game = createGame(country, 2026);
  expect(game.deterrence).toBe(390);
  let report: TurnReport | null = null;
  for (let quarter = 0; quarter < 6; quarter += 1) {
    // Each dilemma is answered with its last option, which costs neither money nor food.
    const dilemmaChoice = pendingDilemma(game)?.options.at(-1)?.id ?? null;
    const state: GameState = game;
    const first = country.sites.find((site) => startFault(state, [site.id]) === null);
    const decisions: Decisions = {
      budget,
      dilemmaChoice,
      startProjects: first === undefined ? [] : [first.id],
    };
    const result = advanceQuarter(game, decisions);
    game = result.state;
    report = result.report;
    if (game.outcome.status !== 'playing')
      throw new Error(`The game ended: ${game.outcome.headline}`);
  }
  expect(game.date).toEqual({ year: 2, quarter: 3 });
  expect(game.tier).toBe('developing');
  expect(game.deterrence).toBe(295);
  expect(
    deterrenceStatus(game).neighbours.map((neighbour) => [neighbour.name, neighbour.intention]),
  ).toEqual([
    ['Voskar', 'hostile'],
    ['Selama', 'watchful'],
  ]);
  expect(report?.entries.map((entry) => entry.headline)).toEqual(
    expect.arrayContaining(['Voskar has turned hostile', 'Selama has turned watchful']),
  );

  writeFileSync(file, `${JSON.stringify(saveGame(game, report), null, 2)}\n`);
});
