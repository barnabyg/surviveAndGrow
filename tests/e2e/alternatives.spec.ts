import { expect, test, type Page } from '@playwright/test';
import { decisions, endQuarters, startGame, tavaraWith } from './app';

const map = (page: Page) => page.getByRole('group', { name: 'Map of Republic of Tavara' });
const site = (page: Page, name: string) =>
  map(page).getByRole('button', { name: new RegExp(`^${name},`) });

/** Tavara with no drought and a treasury that can pay for either port. */
function tavaraWithTreasury(millions: number) {
  const country = tavaraWith({ drought: [] }) as ReturnType<typeof tavaraWith> & {
    start: { treasury: number };
  };
  country.start.treasury = millions;
  return country;
}

test('a site card warns that starting it closes its alternative, which is then closed', async ({
  page,
}) => {
  await startGame(page, { countryFile: tavaraWithTreasury(300) });

  // Before anything is started, the quay's card says what starting it rules out.
  await site(page, 'Saltmouth quay').click();
  const quay = page.getByRole('region', { name: 'Saltmouth quay' });
  await expect(quay).toContainText('Shallow port · empty site');
  await expect(quay.getByRole('group', { name: 'Cost' })).toContainText('$25.0m');
  await expect(quay).toContainText('Ships up to $36.0m a quarter of a mine’s output.');
  await expect(quay).toContainText(
    '▲ Starting it closes Saltmouth port for good: they are alternatives, and only one of them can be built.',
  );
  await quay.getByRole('button', { name: 'Start building' }).click();

  // While the quay is planned, the port cannot be planned with it.
  await expect(decisions(page).getByRole('button', { name: 'Plan Saltmouth port' })).toHaveCount(0);
  await site(page, 'Saltmouth port').click();
  const port = page.getByRole('region', { name: 'Saltmouth port' });
  await expect(port).toContainText(
    '▲ Saltmouth quay and Saltmouth port are alternatives: only one of them can be built.',
  );
  await expect(port.getByRole('button', { name: 'Start building' })).toBeDisabled();

  // Once building has begun, the port is closed, drawn as such, and says why.
  await endQuarters(page, 1);
  await expect(site(page, 'Saltmouth port')).toHaveAccessibleName(
    'Saltmouth port, port, closed, ruled out by Saltmouth quay',
  );
  await expect(site(page, 'Saltmouth port').locator('.map__site-closed')).toHaveCount(1);
  await expect(port).toContainText('Port · closed');
  await expect(port).toContainText(
    '✕ Closed: building began on Saltmouth quay, its alternative, so Saltmouth port can no longer be built.',
  );
  await expect(port.getByRole('button', { name: 'Start building' })).toHaveCount(0);
  // The timeline does not suppose that building on it could begin.
  await expect(
    page
      .getByRole('main', { name: 'Country' })
      .getByRole('region', { name: 'This term' })
      .getByRole('row', { name: /Saltmouth port/ }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('list', { name: 'Map legend' }).getByText('Closed by an alternative'),
  ).toBeVisible();

  // The mine's chain now runs to the quay.
  await site(page, 'Korrgate mine').click();
  const links = page
    .getByRole('region', { name: 'Korrgate mine' })
    .getByRole('region', { name: 'Chain to a port' })
    .getByRole('list', { name: 'Links' })
    .getByRole('listitem');
  await expect(links.nth(2)).toContainText('Saltmouth quay');
  await expect(links.nth(2)).toContainText('Under construction · ✕ Missing');
});
