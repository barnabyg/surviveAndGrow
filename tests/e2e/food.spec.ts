import { expect, test, type Locator, type Page } from '@playwright/test';
import { startGame } from './app';

const foodReserve = (page: Page) =>
  page.getByRole('banner').getByRole('group', { name: 'Food reserve' });
const decisions = (page: Page) => page.getByRole('complementary', { name: 'Decisions' });
const outlook = (page: Page) =>
  decisions(page).getByRole('region', { name: /Outlook|If you commit/ });

async function endQuarters(page: Page, count: number): Promise<void> {
  for (let quarter = 0; quarter < count; quarter += 1) {
    await page.getByRole('banner').getByRole('button', { name: 'End quarter' }).click();
  }
}

/** The reserve as the top bar states it, in months. */
async function monthsShown(vital: Locator): Promise<number> {
  const text = await vital.getByRole('button').innerText();
  const months = /(\d+\.\d) months/.exec(text.replace(/\s+/g, ' '))?.[1];
  if (months === undefined) throw new Error(`No reserve in months in "${text}"`);
  return Number(months);
}

test('the food reserve is a vital sign in months, and says when it is below the safe level', async ({
  page,
}) => {
  await startGame(page);

  await expect(foodReserve(page).getByRole('button')).toContainText('2.1 months');
  await expect(foodReserve(page)).toContainText('Below the 3-month safe level');
});

test('playing through a harvest raises the reserve', async ({ page }) => {
  await startGame(page);

  // Three quarters of spoilage wear the reserve down.
  await endQuarters(page, 3);
  await expect(
    page.getByRole('banner').getByText('Year 1 · Quarter 4 · Harvest season'),
  ).toBeVisible();
  await expect(foodReserve(page)).toContainText(/▼ 0\.\d months this quarter/);
  const before = await monthsShown(foodReserve(page));

  // The harvest comes in at the end of quarter 4.
  await endQuarters(page, 1);
  await expect(page.getByRole('banner').getByText('Year 2 · Quarter 1')).toBeVisible();
  await expect(foodReserve(page)).toContainText(/▲ \d\.\d months this quarter/);
  const after = await monthsShown(foodReserve(page));

  expect(after).toBeGreaterThan(before);
  await expect(foodReserve(page)).not.toContainText('safe level');
  await expect(
    page.getByRole('complementary', { name: 'Situation' }).getByText('The harvest is in'),
  ).toBeVisible();
});

test('opening the food figure lists what moved the reserve', async ({ page }) => {
  await startGame(page);
  await endQuarters(page, 1);

  await foodReserve(page).getByRole('button').click();
  const breakdown = page.getByRole('region', { name: 'What moved the food reserve' });
  await expect(breakdown.getByRole('row', { name: 'Spoiled in store' })).toContainText('−14,560 t');
  await expect(breakdown.getByRole('row', { name: 'Change this quarter' })).toContainText(
    '−14,560 t',
  );

  await endQuarters(page, 3);
  await expect(breakdown.getByRole('row', { name: 'Surplus from Lowmere Plains' })).toContainText(
    /\+\d+,\d{3} t/,
  );
  await expect(breakdown.getByRole('row', { name: 'Lost in transport' })).toContainText(
    /−\d+,\d{3} t/,
  );
});

test('the harvest forecast is a range, and agriculture spending moves it and the reserve', async ({
  page,
}) => {
  await startGame(page);
  const forecast = outlook(page).getByRole('group', { name: 'Harvest forecast' });
  const reserve = outlook(page).getByRole('group', { name: 'Food reserve after harvest' });

  // With a year of weather still to come, and droughts that could yet begin in the two
  // regions prone to them, the range is wide.
  await expect(forecast).toHaveText('Harvest forecast0.98 to 1.46 Mt');
  await expect(reserve).toHaveText('Food reserve after harvest2.2 to 5.7 months');

  await decisions(page).getByRole('slider', { name: 'Agriculture' }).fill('20');

  await expect(forecast).toHaveText('Harvest forecast0.98 to 1.46 Mt → 1.11 to 1.66 Mt');
  await expect(reserve).toHaveText(
    /Food reserve after harvest2\.2 to 5\.7 months → \d\.\d to \d\.\d months/,
  );

  // The range narrows as the harvest approaches.
  await decisions(page).getByRole('button', { name: 'Reset' }).click();
  await endQuarters(page, 3);
  const text = await forecast.innerText();
  const [low, high] = [...text.matchAll(/\d\.\d\d/g)].map((match) => Number(match[0]));
  expect((high ?? 9) - (low ?? 0)).toBeLessThan(0.15);
});
