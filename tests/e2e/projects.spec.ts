import { expect, test, type Page } from '@playwright/test';
import { decisions, endQuarters, reports, startGame, testlandFile, treasury } from './app';

const map = (page: Page, country = 'Republic of Tavara') =>
  page.getByRole('group', { name: `Map of ${country}` });
const projects = (page: Page) => decisions(page).getByRole('region', { name: 'Projects' });
const affordable = (page: Page) => projects(page).getByRole('list', { name: 'Affordable now' });
const spending = (page: Page) =>
  decisions(page)
    .getByRole('group', { name: 'Budget totals' })
    .getByRole('group', { name: 'Spending' });

test('a project started from a site’s card is paid for, built and then operates', async ({
  page,
}) => {
  await startGame(page);
  const site = map(page).getByRole('button', { name: /^Lowmere grain store/ });

  await site.click();
  const card = page.getByRole('region', { name: 'Lowmere grain store' });
  await card.getByRole('button', { name: 'Start building' }).click();

  // It is planned until the quarter ends, and its first instalment is already in the budget.
  await expect(site).toHaveAccessibleName('Lowmere grain store, grain store, planned');
  await expect(card).toContainText('Grain store · planned');
  await expect(projects(page).getByRole('group', { name: 'Lowmere grain store' })).toContainText(
    'Planned',
  );
  await expect(decisions(page).getByRole('group', { name: 'Fixed costs' })).toContainText('$3.0m');
  await expect(spending(page)).toContainText('$39.0m');

  await endQuarters(page, 1);

  // $42.0m and $31.0m of revenue, less $36.0m of spending and the $3.0m instalment.
  await expect(treasury(page)).toContainText('$34.0m');
  await expect(reports(page).getByText('Building begins: Lowmere grain store')).toBeVisible();
  await expect(site).toHaveAccessibleName(
    'Lowmere grain store, grain store, under construction, 1 of 2 quarters built',
  );
  await expect(map(page).getByText('1 of 2', { exact: true })).toBeVisible();
  await expect(projects(page)).toContainText('1 underway · $3.0m a quarter');
  const underway = projects(page).getByRole('group', { name: 'Lowmere grain store' });
  await expect(underway.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  await expect(underway.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '2');
  await expect(underway).toContainText('Opens next quarter.');
  await expect(card).toContainText('Grain store · under construction');

  await endQuarters(page, 1);

  await expect(reports(page).getByText('Finished: Lowmere grain store')).toBeVisible();
  await expect(site).toHaveAccessibleName('Lowmere grain store, grain store, operating');
  await expect(card).toContainText('Grain store · operating');
  await expect(card).toContainText('In use since Year 1, Quarter 3.');
  await expect(underway).toHaveCount(0);
  await expect(projects(page)).toContainText('In use: Lowmere grain store');

  await treasury(page)
    .getByRole('button', { name: /Treasury/ })
    .click();
  await expect(
    page
      .getByRole('region', { name: 'What moved the treasury' })
      .getByRole('row', { name: 'Building Lowmere grain store' }),
  ).toContainText('−$3.0m');
});

test('a project planned from the affordable list can be taken back before the quarter ends', async ({
  page,
}) => {
  await startGame(page);
  const site = map(page).getByRole('button', { name: /^Lowmere irrigation/ });
  const offer = affordable(page).getByRole('listitem').filter({ hasText: 'Lowmere irrigation' });
  await expect(offer).toContainText(
    '$12.0m · 3 quarters · Weather and drought move its region’s harvest 50% less.',
  );

  await offer.getByRole('button', { name: 'Plan Lowmere irrigation' }).click();

  // Planning it picks the site out on the map and opens its card.
  await expect(site).toHaveAttribute('aria-pressed', 'true');
  await expect(site).toHaveAccessibleName('Lowmere irrigation, irrigation scheme, planned');
  await expect(offer).toHaveCount(0);
  await expect(spending(page)).toContainText('$40.0m');

  const card = page.getByRole('region', { name: 'Lowmere irrigation' });
  await card.getByRole('button', { name: 'Cancel building' }).click();

  await expect(site).toHaveAccessibleName('Lowmere irrigation, irrigation scheme, empty site');
  await expect(offer).toBeVisible();
  await expect(spending(page)).toContainText('$36.0m');
  await expect(decisions(page).getByRole('group', { name: 'Fixed costs' })).toHaveCount(0);
});

test('only what the treasury can cover is offered, and a site says why it cannot be started', async ({
  page,
}) => {
  await startGame(page);
  await expect(affordable(page).getByRole('listitem')).toHaveCount(7);

  // $34.0m of the $42.0m is spoken for: two irrigation schemes and a road.
  for (const name of ['Lowmere irrigation', 'Dustwell irrigation', 'Farm road, Arden to Lowmere']) {
    await affordable(page)
      .getByRole('button', { name: `Plan ${name}` })
      .click();
  }

  await expect(affordable(page).getByRole('listitem')).toHaveText([
    /Lowmere grain store/,
    /Southbank grain store/,
  ]);

  const road = map(page).getByRole('button', { name: /^Farm road, Westhaven to Arden/ });
  await road.focus();
  await page.keyboard.press('Enter');
  const card = page.getByRole('region', { name: 'Farm road, Westhaven to Arden' });
  await expect(card.getByRole('button', { name: 'Start building' })).toBeDisabled();
  await expect(card).toContainText(
    'The treasury holds $42.0m, which does not cover the $44.0m needed to start 4 projects.',
  );
});

test('a road is built along its route, and the legend explains every state', async ({ page }) => {
  await startGame(page);
  const road = map(page).getByRole('button', { name: /^Farm road, Arden to Lowmere/ });
  await affordable(page).getByRole('button', { name: 'Plan Farm road, Arden to Lowmere' }).click();

  await endQuarters(page, 2);

  await expect(road).toHaveAccessibleName(
    'Farm road, Arden to Lowmere, farm road, under construction, 2 of 3 quarters built',
  );
  await expect(map(page).getByText('2 of 3', { exact: true })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Map legend' }).getByRole('listitem')).toHaveText([
    'Empty site',
    'Under construction',
    'Operating',
    'Possible route',
    'Road',
  ]);

  await endQuarters(page, 1);
  await expect(road).toHaveAccessibleName('Farm road, Arden to Lowmere, farm road, operating');
});

test('building pauses when the treasury cannot pay, and the player is warned first', async ({
  page,
}) => {
  await startGame(page);
  const budget = decisions(page);
  await budget.getByRole('slider', { name: 'Tax rate' }).fill('5');
  for (const name of ['Agriculture', 'Food relief', 'Health', 'Education', 'Security']) {
    await budget.getByRole('slider', { name }).fill('20');
  }
  await budget.getByRole('button', { name: 'Commit budget' }).click();
  await affordable(page).getByRole('button', { name: 'Plan Lowmere grain store' }).click();

  await expect(budget.getByRole('group', { name: 'Fixed costs' })).toContainText(
    '▲ Building will pause at Lowmere grain store: the treasury cannot cover its instalment.',
  );

  await endQuarters(page, 1);

  await expect(reports(page).getByText('Paused: Lowmere grain store')).toBeVisible();
  await expect(
    map(page).getByRole('button', { name: /^Lowmere grain store/ }),
  ).toHaveAccessibleName('Lowmere grain store, grain store, paused, 0 of 2 quarters built');
  await expect(projects(page).getByRole('group', { name: 'Lowmere grain store' })).toContainText(
    '▲ Paused',
  );
});

test('a second country builds its sites through the same code', async ({ page }) => {
  await startGame(page, { countryFile: testlandFile() });
  const site = map(page, 'Testland').getByRole('button', { name: /^Alpha grain store/ });

  await site.click();
  await page
    .getByRole('region', { name: 'Alpha grain store' })
    .getByRole('button', { name: 'Start building' })
    .click();
  await endQuarters(page, 2);

  await expect(site).toHaveAccessibleName('Alpha grain store, grain store, operating');
  await expect(reports(page).getByText('Finished: Alpha grain store')).toBeVisible();
});

test('the side columns scroll on their own, so the page never does', async ({ page }) => {
  await startGame(page);
  await endQuarters(page, 1);

  const heights = await page.evaluate(() => ({
    page: document.documentElement.scrollHeight,
    window: window.innerHeight,
  }));
  expect(heights.page).toBeLessThanOrEqual(heights.window);
  // The projects panel sits at the foot of the right column and can be brought into view.
  await projects(page).scrollIntoViewIfNeeded();
  await expect(projects(page)).toBeInViewport();
});
