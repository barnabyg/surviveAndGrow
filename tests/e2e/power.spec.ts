import { expect, test, type Page } from '@playwright/test';
import { endQuarters, situation, startGame, tavaraWith } from './app';

const map = (page: Page) => page.getByRole('group', { name: 'Map of Republic of Tavara' });
const site = (page: Page, name: string) =>
  map(page).getByRole('button', { name: new RegExp(`^${name},`) });
const LINE = 'Power line, Korr Falls to Arden';
const STATION = 'Korr Falls power station';

/** Tavara with no drought and a treasury that can pay for a station and a line at once. */
function tavaraWithTreasury(millions: number) {
  const country = tavaraWith({ drought: [] }) as ReturnType<typeof tavaraWith> & {
    start: { treasury: number };
  };
  country.start.treasury = millions;
  return country;
}

/** Opens Arden Vale's card from the list of regions. */
async function ardenVale(page: Page) {
  await situation(page)
    .getByRole('region', { name: 'Regions' })
    .getByRole('button', { name: /Arden Vale/ })
    .click();
  return page.getByRole('region', { name: 'Arden Vale' });
}

/**
 * Whether every stroke drawn for the power line is dashed, leaving aside the wide unseen line
 * that makes it easy to hit, the halo it wears while picked out, and the thin dark line under
 * its dashes once built.
 */
async function drawnDashed(page: Page): Promise<boolean> {
  const strokes = site(page, LINE).locator(
    '.map__power-line polyline:not([stroke="transparent"]):not(.map__route-halo):not(.map__power-casing)',
  );
  const dashes = await strokes.evaluateAll((drawn) =>
    drawn.map((polyline) => polyline.getAttribute('stroke-dasharray')),
  );
  return dashes.length > 0 && dashes.every((dash) => dash !== null);
}

test('a power station and a line power a region, which produces more and gains access', async ({
  page,
}) => {
  await startGame(page, { countryFile: tavaraWithTreasury(300) });

  // Before anything is built, the region has no power, and the line is a fine dashed route.
  let card = await ardenVale(page);
  await expect(card.getByRole('status', { name: 'Power' })).toHaveText(
    'Not powered: no power line in use links it to a power station.',
  );
  expect(await drawnDashed(page)).toBe(true);
  await card.getByRole('button', { name: 'Close' }).click();

  // The station's card says what power gives; both are started together.
  await site(page, STATION).click();
  const station = page.getByRole('region', { name: STATION });
  await expect(station).toContainText(
    'Powers each region a power line links to it: the region produces 20% more and gains 15.0 points of infrastructure access.',
  );
  await expect(station.getByRole('group', { name: 'Cost' })).toContainText('$30.0m');
  await station.getByRole('button', { name: 'Start building' }).click();
  await site(page, LINE).click();
  const line = page.getByRole('region', { name: LINE });
  await line.getByRole('button', { name: 'Start building' }).click();
  expect(await drawnDashed(page)).toBe(true);

  // The line is built first, and carries nothing while the station is still being built.
  await endQuarters(page, 3);
  expect(await drawnDashed(page)).toBe(true);
  await expect(site(page, LINE)).toHaveAccessibleName(/operating/);
  await site(page, LINE).click();
  await expect(page.getByRole('region', { name: LINE })).toContainText('▲ Powering no region');
  card = await ardenVale(page);
  await expect(card.getByRole('status', { name: 'Power' })).toContainText('Not powered');

  // Once the station is in use too, Arden Vale is powered: it produces more and gains access.
  await endQuarters(page, 2);
  await site(page, LINE).click();
  await expect(page.getByRole('region', { name: LINE })).toContainText('Powering Arden Vale.');
  card = await ardenVale(page);
  await expect(card.getByRole('status', { name: 'Power' })).toHaveText(
    `Powered from ${STATION}, along ${LINE}.`,
  );
  const output = card.getByRole('table', { name: 'Output a quarter' });
  // A fifth more of Arden Vale's own $52.0m.
  await expect(output.getByRole('row', { name: `Power from ${STATION}` })).toContainText('$10.4m');
  await expect(output.getByRole('row', { name: 'Total' })).toContainText('$62.4m');
  const access = card.getByRole('table', { name: 'Infrastructure access' });
  await expect(access.getByRole('row', { name: `Power from ${STATION}` })).toContainText('15.0');
  expect(await drawnDashed(page)).toBe(true);
});
