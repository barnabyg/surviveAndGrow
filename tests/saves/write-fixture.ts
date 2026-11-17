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

  // Tavara as it ships, with chance pinned so that the game meets a drought and dilemmas.
  const country = loadCountry({
    ...tavaraFile,
    regions: tavaraFile.regions.map((region) => ({
      ...region,
      eventLikelihood: { drought: region.id === 'dry-east' ? 1 : 0 },
    })),
    dilemmaLikelihood: { grainOffer: 1, teachersPay: 1, emergencyWorks: 1 },
  });
  const plans: readonly (readonly string[])[] = [
    ['lowmere-store', 'lowmere-road'],
    ['lowmere-irrigation'],
    [],
  ];
  let game = createGame(country, 2026);
  let report: TurnReport | null = null;
  for (const startProjects of plans) {
    // Each dilemma is answered with its last option, which costs neither money nor food.
    const dilemmaChoice = pendingDilemma(game)?.options.at(-1)?.id ?? null;
    const result = advanceQuarter(game, {
      budget: game.budget,
      reliefRegionId: 'dry-east',
      startProjects,
      dilemmaChoice,
    });
    game = result.state;
    report = result.report;
  }

  writeFileSync(file, `${JSON.stringify(saveGame(game, report), null, 2)}\n`);
});
