import { expect, test, type Page } from '@playwright/test';
import { decisions, endQuarters, foodReserve, reports, risks, startGame, treasury } from './app';

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
  await trade(page).getByLabel('Tonnes to buy').fill('10000');
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
  await trade(page).getByLabel('Tonnes to buy').fill('10000');
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

test('grain is sold with its income and a warning shown, and leaves the reserve as the quarter ends', async ({
  page,
}) => {
  await startGame(page);

  // 10,000 tonnes at $240 a tonne less 20%, $192 a tonne. Tavara starts below its safe level.
  await trade(page).getByLabel('Tonnes to sell').fill('10000');
  const terms = trade(page).getByRole('group', { name: 'Export terms' });
  await expect(terms).toContainText('At $192 a tonne, the world price less 20%');
  await expect(terms).toContainText('$1.9m');
  await expect(terms).toContainText('below its safe level');
  await trade(page).getByRole('button', { name: 'Sell grain' }).click();

  // Planned, it is warned of in the risks ahead and can be taken back until the quarter ends.
  const planned = trade(page).getByRole('group', { name: 'Grain export' });
  await expect(planned).toContainText('Grain export of 10,000 t');
  await expect(planned).toContainText('$1.9m reaches the treasury');
  await expect(risks(page).getByText('Grain sold below the safe reserve')).toBeVisible();
  await planned.getByRole('button', { name: 'Cancel the grain export' }).click();
  await expect(planned).toHaveCount(0);
  await expect(risks(page).getByText('Grain sold below the safe reserve')).toHaveCount(0);
  await trade(page).getByLabel('Tonnes to sell').fill('10000');
  await trade(page).getByRole('button', { name: 'Sell grain' }).click();
  await expect(planned).toBeVisible();

  await endQuarters(page, 1);

  await expect(reports(page).getByText('Grain exported')).toBeVisible();
  await treasury(page)
    .getByRole('button', { name: /Treasury/ })
    .click();
  const earned = treasury(page).getByRole('table', { name: 'What moved the treasury' });
  await expect(earned.getByRole('row', { name: /Grain exported/ })).toContainText('+$1.9m');
  await foodReserve(page)
    .getByRole('button', { name: /Food reserve/ })
    .click();
  const stored = foodReserve(page).getByRole('table', { name: 'What moved the food reserve' });
  await expect(stored.getByRole('row', { name: /Grain exported/ })).toContainText('−10,000 t');
});

test('the trade panel shows what the trade links carry, and refuses grain beyond it', async ({
  page,
}) => {
  await startGame(page);

  // Tavara's two border crossings carry 90,000 t a quarter between them, and no port is built.
  const capacity = trade(page).getByRole('group', { name: 'Trade capacity' });
  await expect(capacity.getByRole('row', { name: /Trade links carry/ })).toContainText('90,000 t');
  await expect(capacity.getByRole('row', { name: /Free/ })).toContainText('90,000 t');
  await expect(capacity.getByRole('listitem').filter({ hasText: 'Korr Pass' })).toContainText(
    'Border crossing to Voskar · 50,000 t',
  );
  await expect(capacity.getByRole('listitem').filter({ hasText: 'Selama bridge' })).toContainText(
    'Border crossing to Selama · 40,000 t',
  );

  await trade(page).getByLabel('Tonnes to buy').fill('100000');
  const terms = trade(page).getByRole('group', { name: 'Import terms' });
  await expect(terms).toContainText(
    'The trade links carry 90,000 t a quarter, so no more than 90,000 t of grain can cross the border, but 100,000 t would.',
  );
  await expect(trade(page).getByRole('button', { name: 'Order grain' })).toBeDisabled();

  // Ordered within it, the grain takes its share of what the links carry.
  await trade(page).getByLabel('Tonnes to buy').fill('30000');
  await trade(page).getByRole('button', { name: 'Order grain' }).click();
  await expect(capacity.getByRole('row', { name: /Grain ordered/ })).toContainText('30,000 t');
  await expect(capacity.getByRole('row', { name: /Free/ })).toContainText('60,000 t');

  // A port would widen it, and its card says so.
  await page
    .getByRole('group', { name: 'Map of Republic of Tavara' })
    .getByRole('button', { name: /^Saltmouth port,/ })
    .click();
  await expect(page.getByRole('region', { name: 'Saltmouth port' })).toContainText(
    'Once in use, it adds 900,000 t a quarter to the 90,000 t the trade links carry now.',
  );
});
