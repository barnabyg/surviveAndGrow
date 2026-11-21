import { expect, test, type Page } from '@playwright/test';
import { decisions, endQuarters, startGame, tavaraWith, testlandFile } from './app';

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

test('a shipping lane appears once a port is in use, with what it carries against its capacity', async ({
  page,
}) => {
  await startGame(page, { countryFile: tavaraWithTreasury(300) });

  // The border crossings are drawn from the start, each with what it carries this quarter.
  await expect(route(page, 'Korr Pass')).toHaveAccessibleName(
    'Korr Pass, border crossing to Voskar, carrying 0 t of 50,000 t this quarter',
  );
  await expect(route(page, 'Selama bridge')).toHaveAccessibleName(
    'Selama bridge, border crossing to Selama, carrying 0 t of 40,000 t this quarter',
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
    await decisions(page)
      .getByRole('button', { name: `Plan ${site}` })
      .click();
  }
  await endQuarters(page, 8);
  // Planning the port picked it out; its card is closed to see the map.
  await page
    .getByRole('region', { name: 'Saltmouth port' })
    .getByRole('button', { name: 'Close' })
    .click();

  // The port is in use: its lane runs out to sea, carrying the mine's ore.
  const lane = route(page, 'Shipping lane from Saltmouth port');
  await expect(lane).toHaveAccessibleName(
    'Shipping lane from Saltmouth port, carrying 600,000 t of 900,000 t this quarter',
  );
  await expect(map(page).getByText('600,000 t of 900,000 t', { exact: true })).toBeVisible();

  // Grain ordered fills the border crossings first, then goes by sea.
  const trade = decisions(page).getByRole('region', { name: 'Trade' });
  await trade.getByLabel('Tonnes to buy').fill('100000');
  await trade.getByRole('button', { name: 'Order grain' }).click();
  await expect(map(page).getByText('610,000 t of 900,000 t', { exact: true })).toBeVisible();
  await expect(map(page).getByText('50,000 t of 50,000 t', { exact: true })).toBeVisible();

  // Selecting the lane opens a card with the breakdown.
  await lane.getByText('610,000 t of 900,000 t').click();
  await expect(lane).toHaveAttribute('aria-pressed', 'true');
  const card = page.getByRole('region', { name: 'Shipping lane from Saltmouth port' });
  const figures = card.getByRole('table', { name: 'What the route carries this quarter' });
  await expect(figures.getByRole('row', { name: /Mines’ ore/ })).toContainText('600,000 t');
  await expect(figures.getByRole('row', { name: /Grain/ })).toContainText('10,000 t');
  await expect(figures.getByRole('row', { name: /Free/ })).toContainText('290,000 t');
  await expect(figures.getByRole('row', { name: /Capacity/ })).toContainText('900,000 t');
  await card.getByRole('button', { name: 'Close' }).click();
  await expect(card).toHaveCount(0);

  // A border crossing opens its own card.
  await route(page, 'Korr Pass').getByText('50,000 t of 50,000 t').click();
  const crossing = page.getByRole('region', { name: 'Korr Pass' });
  await expect(crossing).toContainText('Border crossing to Voskar');
  await expect(
    crossing
      .getByRole('table', { name: 'What the route carries this quarter' })
      .getByRole('row', { name: /Grain/ }),
  ).toContainText('50,000 t');
});

test('a second country’s trade routes are drawn from its own file', async ({ page }) => {
  await startGame(page, { countryFile: testlandFile() });

  await expect(route(page, 'Elsewhere gate', 'Testland')).toHaveAccessibleName(
    'Elsewhere gate, border crossing to Elsewhere, carrying 0 t of 15,000 t this quarter',
  );
  await lens(page, 'Infrastructure').click();
  await expect(route(page, 'Shipping lane from Alpha port', 'Testland')).toBeVisible();
  await expect(route(page, 'Shipping lane from Alpha quay', 'Testland')).toBeVisible();
});
