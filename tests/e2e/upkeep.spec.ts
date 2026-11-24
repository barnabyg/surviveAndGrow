import { expect, test, type Page } from '@playwright/test';
import { decisions, endQuarters, reports, risks, startGame } from './app';

const map = (page: Page) => page.getByRole('group', { name: 'Map of Republic of Tavara' });
const upkeep = (page: Page) => decisions(page).getByRole('group', { name: 'Upkeep needed' });

/** Sets upkeep on its slider, in millions, and commits the budget. */
async function setUpkeep(page: Page, millions: number): Promise<void> {
  await decisions(page).getByRole('slider', { name: 'Upkeep' }).fill(String(millions));
  await decisions(page).getByRole('button', { name: 'Commit budget' }).click();
}

test('a site whose upkeep is cut decays, and paying its upkeep again restores it', async ({
  page,
}) => {
  await startGame(page);
  // $2.0m less on food relief, which nothing here needs, so that the treasury covers the
  // budget for the year the risks ahead look over, and upkeep is all that can fall short.
  await decisions(page).getByRole('slider', { name: 'Food relief' }).fill('5');
  await decisions(page).getByRole('button', { name: 'Commit budget' }).click();
  const site = map(page).getByRole('button', { name: /^Lowmere grain store/ });
  await site.click();
  const card = page.getByRole('region', { name: 'Lowmere grain store' });
  await expect(card.getByRole('group', { name: 'Upkeep' })).toContainText('$0.2m a quarter');
  await card.getByRole('button', { name: 'Start building' }).click();

  // Nothing needs upkeep until the store is in use.
  await expect(upkeep(page).getByRole('group', { name: 'Sites in use need' })).toContainText(
    '$0.0m',
  );
  await endQuarters(page, 2);
  await expect(site).toHaveAccessibleName('Lowmere grain store, grain store, operating');
  await expect(upkeep(page).getByRole('group', { name: 'Sites in use need' })).toContainText(
    '$0.2m',
  );
  await expect(upkeep(page).getByRole('group', { name: 'Upkeep spent' })).toContainText('$0.2m');

  // Cut upkeep: the budget and the risks ahead both warn that the store will decay.
  await setUpkeep(page, 0);
  await expect(upkeep(page).getByRole('group', { name: 'Upkeep spent' })).toContainText('$0.0m');
  await expect(upkeep(page)).toContainText(
    '▲ Upkeep falls short, and Lowmere grain store will decay from next quarter.',
  );
  await expect(risks(page).getByText('Upkeep falls short', { exact: true })).toBeVisible();
  await expect(card).toContainText('it will decay from next quarter');

  await endQuarters(page, 1);

  await expect(reports(page).getByText('Decaying: Lowmere grain store')).toBeVisible();
  await expect(site).toHaveAccessibleName('Lowmere grain store, grain store, decaying');
  await expect(map(page).getByText('▲ Decaying')).toBeVisible();
  await expect(site.locator('.map__site-warning')).toBeVisible();
  await expect(card).toContainText('Grain store · decaying');
  await expect(card).toContainText('▲ Decaying: upkeep fell short');
  await expect(card).toContainText('13% less of the national reserve spoils each quarter.');

  // Paying upkeep again restores it.
  await setUpkeep(page, 1);
  await expect(card).toContainText('which restores it from next quarter');
  await expect(risks(page).getByText('Upkeep falls short', { exact: true })).toHaveCount(0);

  await endQuarters(page, 1);

  await expect(reports(page).getByText('Restored: Lowmere grain store')).toBeVisible();
  await expect(site).toHaveAccessibleName('Lowmere grain store, grain store, operating');
  await expect(map(page).getByText('▲ Decaying')).toHaveCount(0);
});
