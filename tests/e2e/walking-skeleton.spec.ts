import { expect, test } from '@playwright/test';
import { startGame } from './app';

test('a player starts a game and ends a quarter', async ({ page }) => {
  // The country built into the game, exactly as it ships.
  await startGame(page, { asShipped: true });

  const topBar = page.getByRole('banner');
  await expect(topBar.getByRole('heading', { name: 'Republic of Tavara' })).toBeVisible();
  await expect(topBar.getByText('Year 1 · Quarter 1 · Dry season')).toBeVisible();
  await expect(topBar.getByRole('group', { name: 'Treasury' })).toContainText('$42.0m');

  await topBar.getByRole('button', { name: 'End quarter' }).click();

  await expect(topBar.getByText('Year 1 · Quarter 2 · Planting season')).toBeVisible();
});

test('the fourth quarter rolls over to the next year', async ({ page }) => {
  await startGame(page);
  const topBar = page.getByRole('banner');

  for (let quarter = 1; quarter <= 4; quarter += 1) {
    await topBar.getByRole('button', { name: 'End quarter' }).click();
  }

  await expect(topBar.getByText('Year 2 · Quarter 1 · Dry season')).toBeVisible();
});

test('the main screen is a top bar above three columns', async ({ page }) => {
  await startGame(page);

  const topBar = await page.getByRole('banner').boundingBox();
  const situation = await page.getByRole('complementary', { name: 'Situation' }).boundingBox();
  const country = await page.getByRole('main').boundingBox();
  const decisions = await page.getByRole('complementary', { name: 'Decisions' }).boundingBox();
  if (!topBar || !situation || !country || !decisions)
    throw new Error('A part of the screen is missing');

  // The top bar spans the screen, and the three columns sit side by side beneath it.
  expect(topBar.width).toBe(2560);
  for (const column of [situation, country, decisions]) {
    expect(column.y).toBeGreaterThanOrEqual(topBar.y + topBar.height);
  }
  expect(situation.x + situation.width).toBeLessThanOrEqual(country.x);
  expect(country.x + country.width).toBeLessThanOrEqual(decisions.x);
  expect(country.width).toBeGreaterThan(situation.width);
  expect(country.width).toBeGreaterThan(decisions.width);
});
