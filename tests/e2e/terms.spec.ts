import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import {
  advanceQuarter,
  createGame,
  loadCountry,
  saveGame,
  type GameState,
  type TurnReport,
} from '../../src/sim';
import { dilemma, endQuarters, openApp, prosperity, reports, tavaraWith } from './app';

const nextElection = (page: Page) =>
  page.getByRole('banner').getByRole('group', { name: 'Next election' });
const timeline = (page: Page) =>
  page.getByRole('main', { name: 'Country' }).getByRole('region', { name: 'This term' });
const date = (page: Page) => page.getByRole('banner').getByText(/^Year \d+ · Quarter \d/);

/** Where the game on the country file served under test is kept in the browser. */
const SAVE_KEY = 'survive-and-grow/save/file/countries/under-test.json';

/**
 * Puts a prepared game in the browser's storage before the page loads, as if it had been
 * played there and saved. It is put there only once: the game the page then saves replaces it.
 */
async function prepare(page: Page, save: unknown): Promise<void> {
  await page.addInitScript(
    ([key, text]) => {
      if (window.localStorage.getItem(key) === null) window.localStorage.setItem(key, text);
    },
    [SAVE_KEY, JSON.stringify(save)] as const,
  );
}

/**
 * Tavara without drought, starting at 11% tax with $500.0m in the treasury and no food
 * relief. Approval starts, and with an unchanged budget stays, at 54.2%: enough to win any
 * election whatever the campaign does.
 */
function tavaraThatApproves(): Record<string, unknown> {
  const country = tavaraWith({ drought: [] });
  const start = country.start as {
    treasury: number;
    budget: { taxRate: number; spending: Record<string, number> };
  };
  start.budget.taxRate = 11;
  start.budget.spending.foodRelief = 0;
  start.treasury = 500;
  return country;
}

/**
 * Plays a game in the simulation, with the budget in force, to the start of a quarter. A
 * grain store is begun in Lowmere in the first quarter.
 */
function playedTo(file: unknown, quarter: number): { game: GameState; report: TurnReport | null } {
  let game = createGame(loadCountry(file), 3);
  let report: TurnReport | null = null;
  while (game.history.length < quarter) {
    const startProjects = game.history.length === 1 ? ['lowmere-store'] : [];
    ({ state: game, report } = advanceQuarter(game, { budget: game.budget, startProjects }));
  }
  return { game, report };
}

test('a prepared game plays through a re-election into a second term', async ({ page }) => {
  const countryFile = tavaraThatApproves();
  const { game, report } = playedTo(countryFile, 20);
  await prepare(page, saveGame(game, report));
  await openApp(page, { countryFile });
  await page.getByRole('button', { name: 'Resume saved game' }).click();

  // The last quarter of the first term, with the vote at its end.
  await expect(date(page)).toHaveText('Year 5 · Quarter 4 · Harvest season');
  await expect(nextElection(page)).toContainText('This quarter');
  await expect(nextElection(page)).toContainText('Term 1 · Year 5, Quarter 4');
  await expect(timeline(page)).toContainText('Term 1 · Quarter 20 of 20');

  await endQuarters(page, 1);

  // Winning the vote does not end the game: a new term begins, and the report says so.
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(date(page)).toHaveText('Year 6 · Quarter 1 · Dry season');
  const vote = reports(page).getByRole('listitem').filter({ hasText: 'You won the election' });
  await expect(vote).toContainText(
    'Your second term begins, and the next election is held at the end of Year 10, Quarter 4.',
  );

  // The countdown and the timeline follow the new term.
  await expect(nextElection(page)).toContainText('19 quarters');
  await expect(nextElection(page)).toContainText('Term 2 · Year 10, Quarter 4');
  await expect(timeline(page)).toContainText('Term 2 · Quarter 1 of 20');
  await expect(
    timeline(page).getByRole('columnheader', { name: 'Year 6', exact: true }),
  ).toBeVisible();
  await expect(
    timeline(page).getByRole('columnheader', { name: 'Year 10', exact: true }),
  ).toBeVisible();
  await expect(
    timeline(page).getByRole('columnheader', { name: 'Year 5', exact: true }),
  ).toHaveCount(0);
  await expect(
    timeline(page).getByRole('columnheader', { name: 'Year 10, Quarter 4, harvest, the vote' }),
  ).toBeVisible();

  // The grain store built in the first term is in use through the whole of the second.
  const store = timeline(page).getByRole('row', { name: /^Lowmere grain store/ });
  await expect(store).toContainText('In use since Year 1, Quarter 3');
  await expect(store).toContainText('In use for 20 quarters before the vote');

  // And it plays on.
  await endQuarters(page, 1);
  await expect(date(page)).toHaveText('Year 6 · Quarter 2 · Planting season');
  await expect(nextElection(page)).toContainText('18 quarters');
  await expect(timeline(page)).toContainText('Term 2 · Quarter 2 of 20');
});

test('holding Prosperous for four quarters wins the game, and the summary tells every term', async ({
  page,
}) => {
  // The game kept from save format 3: in its second term, two quarters into Prosperous.
  const save = JSON.parse(
    readFileSync(path.join(import.meta.dirname, '..', 'saves', 'format-3.json'), 'utf8'),
  ) as { country: { file: unknown } };
  await prepare(page, save);
  await openApp(page, { countryFile: save.country.file });
  await page.getByRole('button', { name: 'Resume saved game' }).click();

  await expect(prosperity(page)).toContainText('Prosperous · held 2 of 4 quarters to win');

  await endQuarters(page, 1);
  await expect(prosperity(page)).toContainText('Prosperous · held 3 of 4 quarters to win');
  // The merchants call with the new year, and are sent away with the grain kept.
  const merchants = dilemma(page, 'Merchants offer to buy grain');
  await merchants.getByRole('button', { name: /^Keep the grain/ }).click();

  await endQuarters(page, 1);

  const summary = page.getByRole('dialog', { name: 'The nation is prosperous' });
  await expect(summary).toBeVisible();
  await expect(summary).toContainText('★ You have won');
  await expect(summary).toContainText(
    'National prosperity has stood in Prosperous, from 70 up, for 4 quarters running. You have won.',
  );
  await expect(summary).toContainText(
    'Your government was in office for 29 quarters, over 2 terms.',
  );
  const terms = summary.getByRole('table', { name: 'Term by term' });
  await expect(terms.getByRole('row', { name: /^Term 1/ })).toContainText(
    'Year 1, Quarter 1Year 5, Quarter 4',
  );
  await expect(terms.getByRole('row', { name: /^Term 1/ })).toContainText('Re-elected');
  await expect(terms.getByRole('row', { name: /^Term 2/ })).toContainText(
    'Year 6, Quarter 1Year 8, Quarter 1',
  );
  await expect(terms.getByRole('row', { name: /^Term 2/ })).toContainText('★ Won on prosperity');
  const figures = summary.getByRole('table', { name: 'The game in figures' });
  await expect(figures.getByRole('row', { name: /^Prosperity/ })).toBeVisible();
  await expect(
    page.getByRole('banner').getByRole('button', { name: 'End quarter' }),
  ).toBeDisabled();
});
