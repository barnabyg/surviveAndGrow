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

test('a mine shows its missing links, and once its road and port are built it earns at the world ore price', async ({
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

  // The card shows the world ore price the mine would sell at, and what it would earn.
  const ore = card.getByRole('region', { name: 'Earnings at the world ore price' });
  const orePrice = ore.getByRole('group', { name: 'World ore price' });
  await expect(orePrice).toContainText('$100');
  await expect(orePrice).toContainText('Forecast $55 to $145 a tonne over the next 4 quarters');
  await expect(ore).toContainText(
    'Once its chain is complete, its 600,000 t of ore a quarter would earn $60.0m at $100 a tonne, and from $33.0m to $87.0m within the forecast over the next 4 quarters.',
  );

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
  // The world ore price has moved to $110 a tonne, and the mine earns at it.
  await expect(chain).toContainText(
    'Earning: Korrgate mine ships 600,000 t of ore a quarter, which at $110 a tonne adds $66.0m to its region’s output.',
  );
  await expect(orePrice).toContainText('$110');
  await expect(orePrice.getByRole('img')).toHaveAccessibleName(
    /^World ore price over the last 8 quarters: rose from \$100 a tonne to \$110 a tonne/,
  );
  await expect(ore).toContainText(
    'Its 600,000 t of ore a quarter earn $66.0m at $110 a tonne, and from $35.4m to $88.8m within the forecast over the next 4 quarters.',
  );
  await expect(links.nth(0)).toContainText('Operating · carries 600,000 t · source · ◆ Bottleneck');
  await expect(links.nth(2)).toContainText('Operating · carries 900,000 t');
  await expect(map(page).getByText('✕ Missing link')).toHaveCount(0);
  await expect(map(page).getByText('▲ Earning nothing')).toHaveCount(0);
  await expect(site(page, 'Korrgate mine')).toHaveAccessibleName('Korrgate mine, mine, operating');

  // Its output is taxed: 18% of the $60.0m it adds at the usual ore price, and $1.1m more for
  // the ore price at $110 a tonne.
  await endQuarters(page, 1);
  await treasury(page)
    .getByRole('button', { name: /Treasury/ })
    .click();
  const breakdown = page.getByRole('region', { name: 'What moved the treasury' });
  await expect(breakdown.getByRole('row', { name: /^Tax from Korrgate mine \+/ })).toContainText(
    '+$10.8m',
  );
  await expect(
    breakdown.getByRole('row', { name: /^Tax from Korrgate mine: ore at \$110 a tonne/ }),
  ).toContainText('+$1.1m');
});
