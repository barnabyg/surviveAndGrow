import { expect, test, type Page } from '@playwright/test';
import { endQuarters, startGame, tavaraWith, testlandFile, openTab, planProject } from './app';

const map = (page: Page, country = 'Republic of Tavara') =>
  page.getByRole('group', { name: `Map of ${country}` });
const route = (page: Page, name: string, country?: string) =>
  map(page, country).getByRole('button', { name: new RegExp(`^${name},`) });
const lens = (page: Page, name: string) =>
  page
    .getByRole('main', { name: 'Country' })
    .getByRole('group', { name: 'Map lens' })
    .getByRole('button', { name, exact: true });

/** Tavara with no drought and a treasury that can pay for a whole chain at once. */
function tavaraWithTreasury(millions: number) {
  const country = tavaraWith({ drought: [] }) as ReturnType<typeof tavaraWith> & {
    start: { treasury: number };
  };
  country.start.treasury = millions;
  return country;
}

test('a shipping lane appears once a port is in use, with what it carried against its capacity', async ({
  page,
}) => {
  await startGame(page, { countryFile: tavaraWithTreasury(300) });

  // The border crossings are drawn from the start, each with what it carried last quarter:
  // nothing, before the first quarter is played.
  await expect(route(page, 'Korr Pass')).toHaveAccessibleName(
    'Korr Pass, border crossing to Voskar, carried 0 t of 50,000 t last quarter',
  );
  await expect(route(page, 'Selama bridge')).toHaveAccessibleName(
    'Selama bridge, border crossing to Selama, carried 0 t of 40,000 t last quarter',
  );
  await expect(map(page).getByText('0 t of 50,000 t', { exact: true })).toBeVisible();
  await expect(route(page, 'Shipping lane from Saltmouth port')).toHaveCount(0);

  // The infrastructure lens marks the ports not yet built as missing trade links.
  await lens(page, 'Infrastructure').click();
  await expect(map(page).getByText('✕ Missing trade link')).toHaveCount(2);
  await expect(route(page, 'Shipping lane from Saltmouth port')).toHaveAccessibleName(
    'Shipping lane from Saltmouth port, missing trade link: it would carry 900,000 t a quarter once the port is in use',
  );
  await lens(page, 'Country').click();
  await expect(map(page).getByText('✕ Missing trade link')).toHaveCount(0);

  // Build the whole chain: the mine, the road and the port.
  for (const site of [
    'Korrgate mine',
    'Trunk road, Korrgate mine to Saltmouth',
    'Saltmouth port',
  ]) {
    await planProject(page, site);
  }
  await endQuarters(page, 8);
  // Planning the port picked it out; its card is closed to see the map.
  await page
    .getByRole('region', { name: 'Saltmouth port' })
    .getByRole('button', { name: 'Close' })
    .click();

  // The port has just come into use: its lane runs out to sea, but has carried nothing yet.
  const lane = route(page, 'Shipping lane from Saltmouth port');
  await expect(lane).toHaveAccessibleName(
    'Shipping lane from Saltmouth port, carried 0 t of 900,000 t last quarter',
  );

  // Grain ordered fills the border crossings first, then goes by sea: the lane's card shows
  // it this quarter, beside the mine's ore.
  const trade = await openTab(page, 'Trade');
  await trade.getByLabel('Tonnes to buy').fill('100000');
  await trade.getByRole('button', { name: 'Order grain' }).click();
  await lane.getByText('0 t of 900,000 t').click();
  await expect(lane).toHaveAttribute('aria-pressed', 'true');
  const card = page.getByRole('region', { name: 'Shipping lane from Saltmouth port' });
  const figures = card.getByRole('table', { name: 'What the route carries' });
  const cells = (row: RegExp) => figures.getByRole('row', { name: row }).getByRole('cell');
  await expect(cells(/Mines’ ore/)).toHaveText(['0 t', '600,000 t']);
  await expect(cells(/Grain/)).toHaveText(['0 t', '10,000 t']);
  await expect(card).toContainText(
    'Capacity 900,000 t a quarter: 290,000 t of it free this quarter',
  );
  await card.getByRole('button', { name: 'Close' }).click();
  await expect(card).toHaveCount(0);

  // Once the quarter is played, the lane shows what it carried in it.
  await endQuarters(page, 1);
  await expect(lane).toHaveAccessibleName(
    'Shipping lane from Saltmouth port, carried 610,000 t of 900,000 t last quarter',
  );
  await expect(map(page).getByText('610,000 t of 900,000 t', { exact: true })).toBeVisible();
  await expect(map(page).getByText('50,000 t of 50,000 t', { exact: true })).toBeVisible();
  await lane.getByText('610,000 t of 900,000 t').click();
  await expect(cells(/Mines’ ore/)).toHaveText(['600,000 t', '600,000 t']);
  await expect(cells(/Grain/)).toHaveText(['10,000 t', '0 t']);
  await expect(cells(/Carried/)).toHaveText(['610,000 t', '600,000 t']);
  await card.getByRole('button', { name: 'Close' }).click();

  // A border crossing opens its own card.
  await route(page, 'Korr Pass').getByText('50,000 t of 50,000 t').click();
  const crossing = page.getByRole('region', { name: 'Korr Pass' });
  await expect(crossing).toContainText('Border crossing to Voskar');
  await expect(
    crossing
      .getByRole('table', { name: 'What the route carries' })
      .getByRole('row', { name: /Grain/ })
      .getByRole('cell'),
  ).toHaveText(['50,000 t', '0 t']);
});

test('a second country’s trade routes are drawn from its own file', async ({ page }) => {
  await startGame(page, { countryFile: testlandFile() });

  await expect(route(page, 'Elsewhere gate', 'Testland')).toHaveAccessibleName(
    'Elsewhere gate, border crossing to Elsewhere, carried 0 t of 15,000 t last quarter',
  );
  await lens(page, 'Infrastructure').click();
  await expect(route(page, 'Shipping lane from Alpha port', 'Testland')).toBeVisible();
  await expect(route(page, 'Shipping lane from Alpha quay', 'Testland')).toBeVisible();
});
