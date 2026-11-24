import { existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect, it } from 'vitest';
import tavaraFile from '../../src/countries/tavara.json';
import {
  advanceQuarter,
  createGame,
  factionStandings,
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
  // and then. Format 17 added the factions: each region has a faction mix (country file format
  // 13), farmers, workers and business each have a standing, and every region's approval
  // carries a Factions effect. On seed 2026 the game spends $5.0m more on agriculture from its
  // first quarter and keeps the rest of the budget it starts with, for three quarters. It is
  // saved as Year 1 · Quarter 4 begins: the farmers have risen from 56.1% to 61.3% and are
  // pleased, the workers and business have each lost ground, and the last report has the
  // Factions line of approval split by faction.
  const country = loadCountry({
    ...tavaraFile,
    regions: tavaraFile.regions.map((region) => ({ ...region, eventLikelihood: { drought: 0 } })),
    dilemmaLikelihood: { teachersPay: 0.3 },
  });
  const budget = {
    taxRatePercent: country.start.budget.taxRatePercent,
    spending: {
      ...country.start.budget.spending,
      agriculture: country.start.budget.spending.agriculture + 50,
    },
  };
  let game = createGame(country, 2026);
  let report: TurnReport | null = null;
  for (let quarter = 0; quarter < 3; quarter += 1) {
    // Each dilemma is answered with its last option, which costs neither money nor food.
    const dilemmaChoice = pendingDilemma(game)?.options.at(-1)?.id ?? null;
    const decisions: Decisions = { budget, dilemmaChoice };
    const result = advanceQuarter(game, decisions);
    game = result.state;
    report = result.report;
    if (game.outcome.status !== 'playing')
      throw new Error(`The game ended: ${game.outcome.headline}`);
  }
  expect(game.date).toEqual({ year: 1, quarter: 4 });
  expect(game.history.map((record) => record.standings?.farmers)).toEqual([561, 582, 599, 613]);
  expect(factionStandings(game).standings.map((each) => each.word)).toEqual([
    'Pleased',
    'Content',
    'Content',
    'Loyal',
  ]);
  expect(
    report?.approval.contributions
      .find((line) => line.label === 'Factions')
      ?.parts?.map((part) => part.label),
  ).toEqual(['Farmers', 'Workers', 'Business']);

  writeFileSync(file, `${JSON.stringify(saveGame(game, report), null, 2)}\n`);
});
