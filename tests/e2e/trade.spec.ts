import { expect, test, type Page } from '@playwright/test';
import { decisions, endQuarters, foodReserve, reports, startGame, treasury } from './app';

const trade = (page: Page) => decisions(page).getByRole('region', { name: 'Trade' });

test('grain is ordered with its cost shown, and reaches the reserve as the quarter ends', async ({
  page,
}) => {
  await startGame(page);
  const price = trade(page).getByRole('group', { name: 'World grain price' });
  await expect(price).toContainText('$240');
  await expect(price).toContainText('a tonne');
  await expect(price).toContainText(/Forecast \$\d+ to \$\d+ a tonne over the next 4 quarters/);

  // 10,000 tonnes at $240 a tonne.
  await trade(page).getByLabel('Tonnes').fill('10000');
  const terms = trade(page).getByRole('group', { name: 'Import terms' });
  await expect(terms).toContainText('At $240 a tonne');
  await expect(terms).toContainText('$2.4m');
  await trade(page).getByRole('button', { name: 'Order grain' }).click();

  // Ordered, it can be taken back until the quarter ends.
  const planned = trade(page).getByRole('group', { name: 'Grain import' });
  await expect(planned).toContainText('Grain import of 10,000 t');
  await expect(planned).toContainText('$2.4m leaves the treasury');
  await planned.getByRole('button', { name: 'Cancel the grain import' }).click();
  await expect(planned).toHaveCount(0);
  await trade(page).getByLabel('Tonnes').fill('10000');
  await trade(page).getByRole('button', { name: 'Order grain' }).click();
  await expect(planned).toBeVisible();

  await endQuarters(page, 1);

  await expect(reports(page).getByText('Grain imported')).toBeVisible();
  await treasury(page)
    .getByRole('button', { name: /Treasury/ })
    .click();
  const paid = treasury(page).getByRole('table', { name: 'What moved the treasury' });
  await expect(paid.getByRole('row', { name: /Grain imported/ })).toContainText('−$2.4m');
  await foodReserve(page)
    .getByRole('button', { name: /Food reserve/ })
    .click();
  const stored = foodReserve(page).getByRole('table', { name: 'What moved the food reserve' });
  await expect(stored.getByRole('row', { name: /Grain imported/ })).toContainText('+10,000 t');

  // The price has moved, and says what moved it.
  await price.getByRole('button', { name: /World grain price/ }).click();
  const moved = price.getByRole('table', { name: 'What moved the world grain price' });
  await expect(moved.getByRole('row', { name: /World markets/ })).toBeVisible();
  await expect(moved.getByRole('row', { name: /Pull towards the usual price/ })).toBeVisible();
});
