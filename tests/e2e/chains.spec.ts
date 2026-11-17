import { expect, test, type Page } from '@playwright/test';
import { decisions, endQuarters, startGame, tavaraWith, treasury } from './app';

const map = (page: Page) => page.getByRole('group', { name: 'Map of Republic of Tavara' });
const site = (page: Page, name: string) =>
  map(page).getByRole('button', { name: new RegExp(`^${name},`) });

/** Tavara with no drought and a treasury that can pay for a whole chain at once. */
function tavaraWithTreasury(millions: number) {
  const country = tavaraWith({ drought: [] }) as ReturnType<typeof tavaraWith> & {
    start: { treasury: number };
  };
  country.start.treasury = millions;
  return country;
}

test('a mine shows its missing links, and once its road and port are built it earns', async ({
  page,
}) => {
  await startGame(page, { countryFile: tavaraWithTreasury(300) });

  // The mine's card lists the chain it needs, and the map marks the missing links.
  await site(page, 'Korrgate mine').click();
  const card = page.getByRole('region', { name: 'Korrgate mine' });
  const chain = card.getByRole('region', { name: 'Chain to a port' });
  await expect(chain).toContainText(
    '▲ Korrgate mine earns nothing: its chain is missing Trunk road, Korrgate mine to Saltmouth, Saltmouth port',
  );
  const links = chain.getByRole('list', { name: 'Links' }).getByRole('listitem');
  await expect(links).toHaveCount(3);
  await expect(links.nth(1)).toContainText('Trunk road, Korrgate mine to Saltmouth');
  await expect(links.nth(1)).toContainText('Empty · ✕ Missing · ◆ Bottleneck');
  await expect(links.nth(2)).toContainText('Saltmouth port');
  await expect(links.nth(2)).toContainText('Empty · ✕ Missing');
  await expect(chain).toContainText(
    'Bottleneck: Trunk road, Korrgate mine to Saltmouth, which is missing.',
  );
  await expect(map(page).getByText('✕ Missing link')).toHaveCount(2);
  await expect(site(page, 'Saltmouth port')).toHaveAccessibleName(/missing link/);
  await expect(site(page, 'Trunk road, Korrgate mine to Saltmouth')).toHaveAccessibleName(
    /missing link/,
  );
  await expect(map(page).locator('.map__missing-link')).toHaveCount(1);

  // Build the whole chain: the mine here, the road and the port from the projects list.
  await card.getByRole('button', { name: 'Start building' }).click();
  await decisions(page)
    .getByRole('button', { name: 'Plan Trunk road, Korrgate mine to Saltmouth' })
    .click();
  await decisions(page).getByRole('button', { name: 'Plan Saltmouth port' }).click();
  // Planning the port picked it out, so the mine is picked out again.
  await site(page, 'Korrgate mine').click();

  // The road and the mine are done first; the port, the slowest, holds the chain back.
  await endQuarters(page, 6);
  await expect(site(page, 'Korrgate mine')).toHaveAccessibleName(
    /operating, earning nothing: its chain is not complete/,
  );
  await expect(map(page).getByText('▲ Earning nothing')).toBeVisible();
  await expect(links.nth(2)).toContainText('Under construction · ✕ Missing · ◆ Bottleneck');
  await expect(map(page).getByText('✕ Missing link')).toHaveCount(1);

  await endQuarters(page, 2);
  await expect(chain).toContainText(
    'Earning: Korrgate mine adds $60.0m a quarter to its region’s output.',
  );
  await expect(links.nth(0)).toContainText('Operating · carries $60.0m · source · ◆ Bottleneck');
  await expect(links.nth(2)).toContainText('Operating · carries $90.0m');
  await expect(map(page).getByText('✕ Missing link')).toHaveCount(0);
  await expect(map(page).getByText('▲ Earning nothing')).toHaveCount(0);
  await expect(site(page, 'Korrgate mine')).toHaveAccessibleName('Korrgate mine, mine, operating');

  // Its output is taxed: 18% of the $60.0m it adds.
  await endQuarters(page, 1);
  await treasury(page)
    .getByRole('button', { name: /Treasury/ })
    .click();
  const breakdown = page.getByRole('region', { name: 'What moved the treasury' });
  await expect(breakdown.getByRole('row', { name: 'Tax from Korrgate mine' })).toContainText(
    '+$10.8m',
  );
});
