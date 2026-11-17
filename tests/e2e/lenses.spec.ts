import { expect, test, type Locator, type Page } from '@playwright/test';
import { decisions, endQuarters, startGame, tavaraWithDroughtIn, testlandFile } from './app';

const map = (page: Page, country = 'Republic of Tavara') =>
  page.getByRole('group', { name: `Map of ${country}` });
const lenses = (page: Page) =>
  page.getByRole('main', { name: 'Country' }).getByRole('group', { name: 'Map lens' });
const lens = (page: Page, name: string) => lenses(page).getByRole('button', { name, exact: true });
/** The key to the chosen lens's colours and marks. */
const scale = (page: Page, name: string) =>
  page.getByRole('main', { name: 'Country' }).getByRole('list', { name: `${name} lens scale` });
const region = (page: Page, name: string, country?: string) =>
  map(page, country).getByRole('button', { name: new RegExp(`^${name},`) });

/** The colour a region is filled with on the map. */
const fillOf = (shape: Locator) => shape.evaluate((element) => getComputedStyle(element).fill);
/** The contrast between two colours written as `rgb(r, g, b)`, as WCAG works it out. */
function contrast(first: string, second: string): number {
  const luminance = (colour: string) => {
    const [r = 0, g = 0, b = 0] = (colour.match(/\d+/g) ?? []).map((channel) => {
      const value = Number(channel) / 255;
      return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return ((lighter ?? 0) + 0.05) / ((darker ?? 0) + 0.05);
}
/** The colour the scale gives for one of its steps. */
const swatchOf = (steps: Locator, step: string) =>
  steps
    .getByRole('listitem')
    .filter({ hasText: step })
    .locator('span')
    .first()
    .evaluate((element) => getComputedStyle(element).backgroundColor);

test('lens buttons sit above the map, and the country view is the one chosen first', async ({
  page,
}) => {
  await startGame(page);

  await expect(lenses(page).getByRole('button')).toHaveText([
    'Country',
    'Food',
    'Approval',
    'Living standards',
    'Infrastructure',
  ]);
  await expect(lens(page, 'Country')).toHaveAttribute('aria-pressed', 'true');
  for (const name of ['Food', 'Approval', 'Living standards', 'Infrastructure']) {
    await expect(lens(page, name)).toHaveAttribute('aria-pressed', 'false');
  }

  const buttons = await lenses(page).boundingBox();
  const drawn = await map(page).boundingBox();
  if (!buttons || !drawn) throw new Error('The lens buttons or the map are missing');
  expect(buttons.y + buttons.height).toBeLessThanOrEqual(drawn.y);

  // The country view explains its colours too: they are the kinds of land.
  await expect(scale(page, 'Country').getByRole('listitem')).toHaveText([
    'Highlands',
    'Coast',
    'Plains',
    'Arid',
    'Delta',
    'Valley',
  ]);
  expect(await fillOf(region(page, 'Korr Highlands'))).toBe(
    await swatchOf(scale(page, 'Country'), 'Highlands'),
  );
});

test('the food lens colours each region by its food situation and labels it with the stage', async ({
  page,
}) => {
  await startGame(page, { countryFile: tavaraWithDroughtIn(['dry-east']) });
  // A drought left alone: by the sixth quarter the Dry East is in shortage.
  await endQuarters(page, 6);
  const landColour = await fillOf(region(page, 'The Dry East'));

  await lens(page, 'Food').click();

  await expect(lens(page, 'Food')).toHaveAttribute('aria-pressed', 'true');
  await expect(lens(page, 'Country')).toHaveAttribute('aria-pressed', 'false');
  const steps = scale(page, 'Food');
  await expect(steps.getByRole('listitem')).toHaveText(['Adequate', 'Tight', 'Shortage', 'Famine']);

  // Every region carries its stage as text, and its colour is the one the scale gives it.
  await expect(map(page).getByText('Food: Adequate', { exact: true })).toHaveCount(5);
  await expect(map(page).getByText('▲ Food: Shortage', { exact: true })).toBeVisible();
  const shortage = await swatchOf(steps, 'Shortage');
  const adequate = await swatchOf(steps, 'Adequate');
  expect(await fillOf(region(page, 'The Dry East'))).toBe(shortage);
  expect(await fillOf(region(page, 'Salt Coast'))).toBe(adequate);
  expect(await fillOf(region(page, 'Korr Highlands'))).toBe(adequate);
  expect(shortage).not.toBe(adequate);
  expect(shortage).not.toBe(landColour);

  // The colours follow the game: a quarter later the shortage has become famine.
  await endQuarters(page, 1);
  expect(await fillOf(region(page, 'The Dry East'))).toBe(await swatchOf(steps, 'Famine'));

  // Back in the country view the land has its own colour again.
  await lens(page, 'Country').click();
  expect(await fillOf(region(page, 'The Dry East'))).toBe(landColour);
});

test('the approval lens colours each region by approval, labels it with the figure and marks strikes', async ({
  page,
}) => {
  await startGame(page, { countryFile: tavaraWithDroughtIn([]) });

  await lens(page, 'Approval').click();

  const steps = scale(page, 'Approval');
  await expect(steps.getByRole('listitem')).toHaveText([
    'Under 30%',
    '30% to 40%',
    '40% to 50%',
    '50% to 60%',
    '60% and over',
    'Hatched: strikes',
    'Cross-hatched: protests',
  ]);
  await expect(map(page).getByText('Approval: 45.8%', { exact: true })).toHaveCount(6);
  await expect(region(page, 'Arden Vale')).toHaveAccessibleName('Arden Vale, approval 45.8%');
  expect(await fillOf(region(page, 'Arden Vale'))).toBe(await swatchOf(steps, '40% to 50%'));
  await expect(map(page).getByRole('img', { name: /^Strikes in/ })).toHaveCount(0);

  // The top rate of tax drives every region below 40% within three quarters.
  await decisions(page).getByRole('slider', { name: 'Tax rate' }).fill('40');
  await decisions(page).getByRole('button', { name: 'Commit budget' }).click();
  await endQuarters(page, 3);

  await expect(map(page).getByText('Approval: 38.5%', { exact: true })).toHaveCount(6);
  await expect(region(page, 'Arden Vale')).toHaveAccessibleName(
    'Arden Vale, approval 38.5%, Strikes · output −30%',
  );
  expect(await fillOf(region(page, 'Arden Vale'))).toBe(await swatchOf(steps, '30% to 40%'));
  await expect(map(page).getByRole('img', { name: 'Strikes in Arden Vale' })).toBeVisible();
  await expect(map(page).getByRole('img', { name: /^Strikes in/ })).toHaveCount(6);
  await expect(map(page).getByText('▲ Strikes · output −30%')).toHaveCount(6);

  // The hatching belongs to the approval lens; the words stay under every lens.
  await lens(page, 'Country').click();
  await expect(map(page).getByRole('img', { name: /^Strikes in/ })).toHaveCount(0);
  await expect(map(page).getByText('▲ Strikes · output −30%')).toHaveCount(6);
});

test('the living-standards lens colours each region by its living standard, and settlements dim as it falls', async ({
  page,
}) => {
  await startGame(page, { countryFile: tavaraWithDroughtIn(['dry-east']) });

  await lens(page, 'Living standards').click();

  await expect(lens(page, 'Living standards')).toHaveAttribute('aria-pressed', 'true');
  const steps = scale(page, 'Living standards');
  await expect(steps.getByRole('listitem')).toHaveText([
    'Under 20',
    '20 to 25',
    '25 to 35',
    '35 to 45',
    '45 to 70',
    '70 and over',
  ]);
  // Every region carries its living standard as text, and its colour is the one the scale gives it.
  await expect(map(page).getByText(/^Living standard: /)).toHaveCount(6);
  await expect(region(page, 'Arden Vale')).toHaveAccessibleName('Arden Vale, living standard 26.2');
  await expect(map(page).getByText('Living standard: 22.4', { exact: true })).toBeVisible();
  expect(await fillOf(region(page, 'Arden Vale'))).toBe(await swatchOf(steps, '25 to 35'));
  expect(await fillOf(region(page, 'The Dry East'))).toBe(await swatchOf(steps, '20 to 25'));

  // The richest region's town is more built up and better lit than a poorer region's village.
  const settlement = (name: string) =>
    map(page).getByRole('img', { name: new RegExp(`^${name}:`) });
  await expect(settlement('Arden')).toHaveAccessibleName('Arden: 9 buildings, 3 lit');
  await expect(settlement('Dustwell')).toHaveAccessibleName('Dustwell: 4 buildings, 1 lit');
  await expect(settlement('Westhaven')).toHaveAccessibleName('Westhaven: 4 buildings, 1 lit');

  // A drought left alone: by the sixth quarter the Dry East is in shortage, its living
  // standard has fallen, and Dustwell's lights have gone out while Westhaven's stay on.
  await endQuarters(page, 6);
  await expect(map(page).getByText('▲ Food: Shortage', { exact: true })).toBeVisible();
  expect(await fillOf(region(page, 'The Dry East'))).toBe(await swatchOf(steps, 'Under 20'));
  await expect(settlement('Dustwell')).toHaveAccessibleName('Dustwell: 3 buildings, 0 lit');
  await expect(settlement('Westhaven')).toHaveAccessibleName('Westhaven: 4 buildings, 1 lit');

  // Every region's lettering stands out from its lens colour at 4.5 to 1 or better.
  for (const name of [
    ...['Korr Highlands', 'Salt Coast', 'Lowmere Plains'],
    ...['The Dry East', 'South Delta', 'Arden Vale'],
  ]) {
    const ink = await map(page)
      .getByText(name, { exact: true })
      .evaluate((element) => getComputedStyle(element).fill);
    expect(contrast(ink, await fillOf(region(page, name)))).toBeGreaterThanOrEqual(4.5);
  }
});

test('the infrastructure lens colours each region by its access and rings every missing link', async ({
  page,
}) => {
  await startGame(page, { countryFile: tavaraWithDroughtIn([]) });
  const ringed = map(page).locator('.map__missing-ring');
  const site = (name: string) => map(page).getByRole('button', { name: new RegExp(`^${name},`) });

  // Elsewhere a missing link is marked only while a site of its chain is picked out.
  await expect(ringed).toHaveCount(0);
  await expect(map(page).getByText('✕ Missing link')).toHaveCount(0);

  await lens(page, 'Infrastructure').click();

  await expect(lens(page, 'Infrastructure')).toHaveAttribute('aria-pressed', 'true');
  const steps = scale(page, 'Infrastructure');
  await expect(steps.getByRole('listitem')).toHaveText([
    'None',
    'Under 10',
    '10 to 20',
    '20 to 35',
    '35 to 50',
    '50 and over',
    '✕ Ringed: missing link in a chain',
  ]);
  // Nothing is built yet: every region has no access, and says so in words.
  await expect(map(page).getByText('Infrastructure: 0.0', { exact: true })).toHaveCount(6);
  await expect(region(page, 'Lowmere Plains')).toHaveAccessibleName(
    'Lowmere Plains, infrastructure access 0.0',
  );
  const none = await swatchOf(steps, 'None');
  expect(await fillOf(region(page, 'Lowmere Plains'))).toBe(none);

  // Every link missing from a chain is ringed, tagged and named, with nothing picked out.
  await expect(ringed).toHaveCount(2);
  await expect(map(page).getByText('✕ Missing link')).toHaveCount(2);
  await expect(site('Saltmouth port')).toHaveAccessibleName(/missing link/);
  await expect(site('Trunk road, Korrgate mine to Saltmouth')).toHaveAccessibleName(/missing link/);

  // A grain store built in Lowmere Plains gives it access, and the region changes colour.
  await site('Lowmere grain store').click();
  await page
    .getByRole('region', { name: 'Lowmere grain store' })
    .getByRole('button', { name: 'Start building' })
    .click();
  await endQuarters(page, 2);
  await expect(site('Lowmere grain store')).toHaveAccessibleName(/operating/);
  await expect(map(page).getByText('Infrastructure: 10.0', { exact: true })).toBeVisible();
  await expect(region(page, 'Lowmere Plains')).toHaveAccessibleName(
    'Lowmere Plains, infrastructure access 10.0',
  );
  const built = await fillOf(region(page, 'Lowmere Plains'));
  expect(built).toBe(await swatchOf(steps, '10 to 20'));
  expect(built).not.toBe(none);
  expect(await fillOf(region(page, 'Salt Coast'))).toBe(none);

  // Every region's lettering stands out from its lens colour at 4.5 to 1 or better.
  for (const name of [
    ...['Korr Highlands', 'Salt Coast', 'Lowmere Plains'],
    ...['The Dry East', 'South Delta', 'Arden Vale'],
  ]) {
    const ink = await map(page)
      .getByText(name, { exact: true })
      .evaluate((element) => getComputedStyle(element).fill);
    expect(contrast(ink, await fillOf(region(page, name)))).toBeGreaterThanOrEqual(4.5);
  }
});

test('the chosen lens stays from quarter to quarter, with sites, events and relief still shown', async ({
  page,
}) => {
  await startGame(page, { countryFile: tavaraWithDroughtIn(['dry-east']) });
  await lens(page, 'Approval').click();

  await endQuarters(page, 2);

  await expect(lens(page, 'Approval')).toHaveAttribute('aria-pressed', 'true');
  await expect(map(page).getByText('Approval: 45.8%', { exact: true })).toHaveCount(6);
  await expect(page.getByRole('banner').getByText('Year 1 · Quarter 3')).toBeVisible();

  // Relief sent to a region is tagged on the map whichever lens is chosen.
  await region(page, 'The Dry East').click();
  await page
    .getByRole('region', { name: 'The Dry East' })
    .getByRole('button', { name: 'Send food relief here' })
    .click();

  for (const name of ['Approval', 'Food']) {
    await lens(page, name).click();
    // The drought is still marked on its region, and so is the relief.
    await expect(map(page).getByText('Drought · harvest −40%')).toBeVisible();
    await expect(map(page).getByText('Food relief on its way')).toBeVisible();
    // The region picked out keeps its outline.
    await expect(map(page).getByRole('img', { name: 'The Dry East is picked out' })).toBeVisible();
    // Sites and routes can still be seen and picked.
    await expect(
      map(page).getByRole('button', { name: /^Farm road, Arden to Lowmere/ }),
    ).toBeVisible();
    const site = map(page).getByRole('button', { name: /^Lowmere grain store/ });
    await site.click();
    await expect(site).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('region', { name: 'Lowmere grain store' })).toBeVisible();
    await region(page, 'The Dry East').click();
  }
});

test('a second country is seen through the same lenses', async ({ page }) => {
  await startGame(page, { countryFile: testlandFile() });

  await expect(scale(page, 'Country').getByRole('listitem')).toHaveText(['Plains', 'Arid']);

  await lens(page, 'Approval').click();
  await expect(map(page, 'Testland').getByText('Approval: 57.1%', { exact: true })).toHaveCount(2);
  expect(await fillOf(region(page, 'Northfield', 'Testland'))).toBe(
    await swatchOf(scale(page, 'Approval'), '50% to 60%'),
  );

  await lens(page, 'Food').click();
  await expect(map(page, 'Testland').getByText('Food: Adequate', { exact: true })).toHaveCount(2);
  expect(await fillOf(region(page, 'Sandreach', 'Testland'))).toBe(
    await swatchOf(scale(page, 'Food'), 'Adequate'),
  );

  await lens(page, 'Living standards').click();
  await expect(
    map(page, 'Testland').getByText('Living standard: 32.6', { exact: true }),
  ).toBeVisible();
  expect(await fillOf(region(page, 'Northfield', 'Testland'))).toBe(
    await swatchOf(scale(page, 'Living standards'), '25 to 35'),
  );
  await expect(map(page, 'Testland').getByRole('img', { name: /^Alpha:/ })).toHaveAccessibleName(
    'Alpha: 9 buildings, 4 lit',
  );

  await lens(page, 'Infrastructure').click();
  await expect(map(page, 'Testland').getByText('Infrastructure: 0.0', { exact: true })).toHaveCount(
    2,
  );
  expect(await fillOf(region(page, 'Northfield', 'Testland'))).toBe(
    await swatchOf(scale(page, 'Infrastructure'), 'None'),
  );
});
