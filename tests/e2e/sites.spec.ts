import { expect, test, type Page } from '@playwright/test';
import { startGame, testlandFile } from './app';

const map = (page: Page, country: string) => page.getByRole('group', { name: `Map of ${country}` });
const legend = (page: Page) => page.getByRole('list', { name: 'Map legend' });

test('selecting an empty site opens a card with its cost, build time and effect', async ({
  page,
}) => {
  await startGame(page);
  const site = map(page, 'Republic of Tavara').getByRole('button', {
    name: 'Lowmere grain store, grain store, empty site',
  });
  await expect(site).toHaveAttribute('aria-pressed', 'false');

  await site.click();

  await expect(site).toHaveAttribute('aria-pressed', 'true');
  const card = page.getByRole('region', { name: 'Lowmere grain store' });
  await expect(card).toContainText('Grain store · empty site');
  await expect(card.getByRole('group', { name: 'Cost' })).toContainText('$6.0m');
  await expect(card.getByRole('group', { name: 'Build time' })).toContainText('2 quarters');
  await expect(card.getByRole('group', { name: 'Upkeep' })).toContainText('$0.2m a quarter');
  await expect(card.getByRole('group', { name: 'Region' })).toContainText('Lowmere Plains');
  await expect(card).toContainText('25% less of the national reserve spoils each quarter.');

  await card.getByRole('button', { name: 'Close' }).click();
  await expect(card).toBeHidden();
  await expect(site).toHaveAttribute('aria-pressed', 'false');
});

test('hovering a site that could be built tells its cost without opening the card', async ({
  page,
}) => {
  await startGame(page);
  const tavara = map(page, 'Republic of Tavara');
  const store = tavara.getByRole('button', { name: /^Lowmere grain store/ });
  const route = tavara.getByRole('button', { name: /^Farm road, Arden to Lowmere/ });

  await expect(store.locator(':scope > title')).toHaveText('Lowmere grain store · $6.0m');
  await expect(store).toHaveAccessibleName('Lowmere grain store, grain store, empty site, $6.0m');
  await expect(route.locator(':scope > title')).toHaveText('Farm road, Arden to Lowmere · $10.0m');
});

test('a possible route is a site too, and can be selected from the keyboard', async ({ page }) => {
  await startGame(page);
  const route = map(page, 'Republic of Tavara').getByRole('button', {
    name: 'Farm road, Arden to Lowmere, farm road, possible route',
  });

  await route.focus();
  await page.keyboard.press('Enter');

  await expect(route).toHaveAttribute('aria-pressed', 'true');
  const card = page.getByRole('region', { name: 'Farm road, Arden to Lowmere' });
  await expect(card).toContainText('Farm road · possible route');
  await expect(card.getByRole('group', { name: 'Cost' })).toContainText('$10.0m');
  await expect(card.getByRole('group', { name: 'Build time' })).toContainText('3 quarters');
});

test('the map shows one card at a time, for a site or for a region', async ({ page }) => {
  await startGame(page);
  const tavara = map(page, 'Republic of Tavara');
  const site = tavara.getByRole('button', { name: /^Dustwell irrigation/ });
  const region = tavara.getByRole('button', { name: /^Salt Coast/ });

  await site.click();
  await expect(page.getByRole('region', { name: 'Dustwell irrigation' })).toBeVisible();

  await region.click();
  await expect(page.getByRole('region', { name: 'Salt Coast' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Dustwell irrigation' })).toBeHidden();
  await expect(site).toHaveAttribute('aria-pressed', 'false');

  await site.click();
  await expect(page.getByRole('region', { name: 'Dustwell irrigation' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Salt Coast' })).toBeHidden();
  await expect(region).toHaveAttribute('aria-pressed', 'false');
});

test('a legend explains the marks for sites and routes', async ({ page }) => {
  await startGame(page);

  await expect(legend(page).getByRole('listitem')).toHaveText([
    'Empty site',
    'Under construction',
    'Operating',
    'Decaying',
    'Closed by an alternative',
    'Possible route',
    'Road',
    '✕ Missing link in a chain',
  ]);
});

test('the sites of a second country are drawn and selected through the same code', async ({
  page,
}) => {
  await startGame(page, { countryFile: testlandFile() });
  const testland = map(page, 'Testland');

  await expect(
    testland.getByRole('button', { name: 'North irrigation, irrigation scheme, empty site' }),
  ).toBeVisible();
  await expect(
    testland.getByRole('button', { name: 'Farm road, Alpha to Beta, farm road, possible route' }),
  ).toBeVisible();

  await testland.getByRole('button', { name: /^Alpha grain store/ }).click();

  const card = page.getByRole('region', { name: 'Alpha grain store' });
  await expect(card.getByRole('group', { name: 'Cost' })).toContainText('$6.0m');
  await expect(card.getByRole('group', { name: 'Region' })).toContainText('Northfield');
});
