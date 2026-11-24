import { existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect, it } from 'vitest';
import tavaraFile from '../../src/countries/tavara.json';
import {
  advanceQuarter,
  borderIncidentStatuses,
  createGame,
  loadCountry,
  pendingDilemma,
  SAVE_FORMAT_VERSION,
  saveGame,
  startFault,
  tradeCapacity,
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
  // and then. Format 16 added border incidents. The game is the one kept from format 15 played
  // three quarters on: on seed 2026 it halves Defence to $1.0m from its first quarter, taxes at
  // 30% and each quarter starts the first site it can. Voskar turned hostile as the country
  // reached Developing, announced an incident as Year 2 · Quarter 4 began, and began it in
  // Year 3 · Quarter 2. It is saved as Year 3 · Quarter 3 begins: the incident has lived one of
  // its three quarters, Korr Pass is closed for two more, and the last report has the tax the
  // regions on Voskar's border lost to it.
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
  let report: TurnReport | null = null;
  for (let quarter = 0; quarter < 10; quarter += 1) {
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
  expect(game.date).toEqual({ year: 3, quarter: 3 });
  expect(game.borderIncidents).toEqual([
    {
      neighbourId: 'voskar',
      announced: { year: 2, quarter: 4 },
      begins: { year: 3, quarter: 2 },
    },
  ]);
  expect(borderIncidentStatuses(game)).toMatchObject([{ inForce: true, quartersLeft: 2 }]);
  expect(tradeCapacity(game).links.find((link) => link.id === 'korr-pass')).toMatchObject({
    tonnes: 0,
    closed: { name: 'Voskar', quartersLeft: 2 },
  });
  expect(
    report?.treasury.contributions.filter((line) =>
      line.label.startsWith('Lost to the border incident with Voskar'),
    ),
  ).toHaveLength(3);

  writeFileSync(file, `${JSON.stringify(saveGame(game, report), null, 2)}\n`);
});
