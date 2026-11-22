import { expect, test, type Page } from '@playwright/test';
import {
  decisions,
  endQuarters,
  startGame,
  tavaraWithDroughtIn,
  testlandFile,
  planProject,
  openTab,
} from './app';

const map = (page: Page, country = 'Republic of Tavara') =>
  page.getByRole('group', { name: `Map of ${country}` });
/** The strip under the map that shows the whole term. */
const timeline = (page: Page) =>
  page.getByRole('main', { name: 'Country' }).getByRole('region', { name: 'This term' });
/** A year or a quarter in the head of the timeline, by its full name or a pattern. */
const quarter = (page: Page, name: string | RegExp) =>
  timeline(page).getByRole('columnheader', { name, exact: true });
const bars = (page: Page, site: string) => timeline(page).getByRole('row', { name: site });

test('the timeline lays out the term, with now, each harvest and the vote marked', async ({
  page,
}) => {
  await startGame(page);

  await expect(timeline(page)).toContainText('Quarter 1 of 20');
  for (const year of [1, 2, 3, 4, 5]) {
    await expect(quarter(page, `Year ${year}`)).toBeVisible();
  }
  await expect(quarter(page, 'Year 1, Quarter 1, now')).toHaveText('Now');
  await expect(quarter(page, 'Year 1, Quarter 2')).toHaveText('2');
  await expect(quarter(page, /harvest/)).toHaveCount(5);
  await expect(quarter(page, 'Year 1, Quarter 4, harvest')).toHaveText('4');
  await expect(quarter(page, 'Year 5, Quarter 4, harvest, the vote')).toHaveText('Vote');
  await expect(quarter(page, /past$/)).toHaveCount(0);
  // The marks are explained in words, so none of them rests on its colour.
  await expect(timeline(page)).toContainText('An underlined quarter brings in the harvest');
  await expect(timeline(page)).toContainText('Nothing is being built.');

  await endQuarters(page, 2);

  await expect(timeline(page)).toContainText('Quarter 3 of 20');
  await expect(quarter(page, 'Year 1, Quarter 1, past')).toHaveText('1');
  await expect(quarter(page, 'Year 1, Quarter 2, past')).toHaveText('2');
  await expect(quarter(page, 'Year 1, Quarter 3, now')).toHaveText('Now');
  await expect(quarter(page, /past$/)).toHaveCount(2);
});

test('a project is a bar on the timeline, followed by its quarters in use before the vote', async ({
  page,
}) => {
  await startGame(page);
  const store = bars(page, 'Lowmere grain store');
  await expect(store).toHaveCount(0);

  // Picking out an empty site shows what building there would mean, as if it began now.
  await map(page)
    .getByRole('button', { name: /^Lowmere grain store/ })
    .click();
  await expect(store).toContainText('If started now · 2 quarters, $6.0m');
  await expect(store.getByRole('cell', { name: 'If started now' })).toBeVisible();
  await expect(store).toContainText('In use for 18 quarters before the vote');

  const card = page.getByRole('region', { name: 'Lowmere grain store' });
  await card.getByRole('button', { name: 'Start building' }).click();
  await expect(store).toContainText('Planned · 2 quarters, $6.0m');
  await expect(store.getByRole('cell', { name: 'Planned' })).toBeVisible();

  await endQuarters(page, 1);
  await expect(store).toContainText('Building · opens next quarter');
  await expect(store.getByRole('cell', { name: 'Building', exact: true })).toBeVisible();
  await expect(store).toContainText('In use for 18 quarters before the vote');

  // The bar stays when the site is no longer picked out.
  await card.getByRole('button', { name: 'Close' }).click();
  await endQuarters(page, 1);
  await expect(store).toContainText('In use since Year 1, Quarter 3');
  await expect(store.getByRole('cell', { name: 'Built' })).toBeVisible();
  await expect(store).toContainText('In use for 18 quarters before the vote');

  // Another empty site, considered two quarters later, has two quarters fewer in use.
  await map(page)
    .getByRole('button', { name: /^Lowmere irrigation/ })
    .click();
  const irrigation = bars(page, 'Lowmere irrigation');
  await expect(irrigation).toContainText('If started now · 3 quarters, $12.0m');
  await expect(irrigation).toContainText('In use for 15 quarters before the vote');

  await page
    .getByRole('region', { name: 'Lowmere irrigation' })
    .getByRole('button', { name: 'Close' })
    .click();
  await expect(irrigation).toHaveCount(0);
  await expect(store).toBeVisible();
});

test('picking a project on the timeline picks its site out on the map', async ({ page }) => {
  await startGame(page);
  await planProject(page, 'Lowmere grain store');
  await page
    .getByRole('region', { name: 'Lowmere grain store' })
    .getByRole('button', { name: 'Close' })
    .click();
  const site = map(page).getByRole('button', { name: /^Lowmere grain store/ });
  await expect(site).toHaveAttribute('aria-pressed', 'false');

  await bars(page, 'Lowmere grain store')
    .getByRole('button', { name: 'Lowmere grain store' })
    .click();

  await expect(site).toHaveAttribute('aria-pressed', 'true');
});

test('a project the treasury cannot pay for opens later, and the timeline says so', async ({
  page,
}) => {
  await startGame(page);
  const budget = decisions(page);
  await planProject(page, 'Lowmere grain store');
  await openTab(page, 'Budget');
  const store = bars(page, 'Lowmere grain store');
  await expect(store).toContainText('In use for 18 quarters before the vote');

  // A budget that takes everything leaves nothing for the instalment.
  await budget.getByRole('slider', { name: 'Tax rate' }).fill('5');
  for (const name of ['Agriculture', 'Food relief', 'Health', 'Education', 'Security']) {
    await budget.getByRole('slider', { name }).fill('20');
  }
  await budget.getByRole('button', { name: 'Commit budget' }).click();

  await expect(store).toContainText('▲ Cannot be paid for this quarter');
  await expect(store).toContainText('In use for 17 quarters before the vote');

  await endQuarters(page, 1);
  await expect(store.getByRole('cell', { name: '▲ Paused' })).toBeVisible();
  await expect(store).toContainText('In use for 16 quarters before the vote');
});

test('late in the term the timeline says a site would not be finished before the vote', async ({
  page,
}) => {
  await startGame(page, { countryFile: tavaraWithDroughtIn([]) });
  await endQuarters(page, 17);

  // In quarter 18 a grain store would open for the election quarter alone.
  await map(page)
    .getByRole('button', { name: /^Lowmere grain store/ })
    .click();
  const store = bars(page, 'Lowmere grain store');
  await expect(store).toContainText('In use for 1 quarter before the vote');

  await endQuarters(page, 1);
  await expect(store).toContainText('▲ Would not be finished before the vote');
  await expect(store).not.toContainText('In use for');
});

test('a second country’s projects are drawn on the timeline through the same code', async ({
  page,
}) => {
  await startGame(page, { countryFile: testlandFile() });
  await map(page, 'Testland')
    .getByRole('button', { name: /^Alpha grain store/ })
    .click();
  await page
    .getByRole('region', { name: 'Alpha grain store' })
    .getByRole('button', { name: 'Start building' })
    .click();
  await endQuarters(page, 1);

  await expect(bars(page, 'Alpha grain store')).toContainText('Building · opens next quarter');
  await expect(bars(page, 'Alpha grain store')).toContainText(
    'In use for 18 quarters before the vote',
  );
  await expect(quarter(page, 'Year 1, Quarter 2, now')).toHaveText('Now');
});

test('a large project that will be finished only after the vote shows when it opens', async ({
  page,
}) => {
  const country = tavaraWithDroughtIn([]) as ReturnType<typeof tavaraWithDroughtIn> & {
    start: { treasury: number };
  };
  country.start.treasury = 300;
  await startGame(page, { countryFile: country });
  await endQuarters(page, 14);

  // In quarter 15 a port, eight quarters in the building, would open in the next term.
  await map(page)
    .getByRole('button', { name: /^Saltmouth port/ })
    .click();
  const port = bars(page, 'Saltmouth port');
  await expect(quarter(page, 'After the vote')).toBeVisible();
  await expect(port).toContainText(
    '▲ Would not be finished before the vote · opens Year 6, Quarter 3',
  );
  await expect(port.getByRole('cell', { name: '▶ Opens Year 6, Quarter 3' })).toBeVisible();
  await expect(port).not.toContainText('In use for');

  await page
    .getByRole('region', { name: 'Saltmouth port' })
    .getByRole('button', { name: 'Start building' })
    .click();
  await endQuarters(page, 1);
  await expect(port).toContainText(
    '▲ Will not be finished before the vote · opens Year 6, Quarter 3',
  );
  await expect(port.getByRole('cell', { name: 'Building', exact: true })).toBeVisible();
  await expect(port.getByRole('cell', { name: '▶ Opens Year 6, Quarter 3' })).toBeVisible();
});
