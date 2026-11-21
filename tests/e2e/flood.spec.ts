import { expect, test, type Page } from '@playwright/test';
import { endQuarters, reports, risks, situation, startGame, tavaraWith } from './app';

const map = (page: Page) => page.getByRole('group', { name: 'Map of Republic of Tavara' });

/** Tavara with a flood in Lowmere Plains every year, no drought, and money to build with. */
function tavaraFloodingLowmere() {
  const country = tavaraWith({ flood: ['lowmere-plains'] }) as ReturnType<typeof tavaraWith> & {
    start: { treasury: number };
  };
  country.start.treasury = 300;
  return country;
}

test('a flood is warned of, appears on the map and sets the region’s sites decaying', async ({
  page,
}) => {
  await startGame(page, { countryFile: tavaraFloodingLowmere() });

  // The risks ahead warn of the flood before it can begin.
  const warning = risks(page).getByRole('button', { name: /Flood in Lowmere Plains/ });
  await expect(warning).toContainText(
    'A flood there next quarter, a 100% chance, would take 30% of its harvest and set any site in use there decaying until its upkeep is paid.',
  );
  await expect(warning).toContainText('Almost certain');

  const site = map(page).getByRole('button', { name: /^Lowmere grain store/ });
  await site.click();
  const card = page.getByRole('region', { name: 'Lowmere grain store' });
  await card.getByRole('button', { name: 'Start building' }).click();

  // The flood comes with the planting season, and is drawn on the map like a drought.
  await endQuarters(page, 1);
  await expect(situation(page).getByText('Flood in Lowmere Plains')).toBeVisible();
  await expect(map(page).getByText('Flood · harvest −30%')).toBeVisible();
  await expect(
    map(page).getByRole('button', {
      name: 'Lowmere Plains, food adequate, Flood · harvest −30%',
    }),
  ).toBeVisible();

  // The store is finished after the flood has begun, so this year's flood leaves it be.
  await endQuarters(page, 1);
  await expect(site).toHaveAccessibleName('Lowmere grain store, grain store, operating');

  // Next year's flood is warned of by name, and damages the store when it comes.
  await endQuarters(page, 2);
  await expect(warning).toContainText(
    'would take 30% of its harvest and set Lowmere grain store decaying until its upkeep is paid.',
  );
  await endQuarters(page, 1);
  await expect(reports(page).getByText('Decaying: Lowmere grain store')).toBeVisible();
  await expect(site).toHaveAccessibleName('Lowmere grain store, grain store, decaying');
  // The store's card has stayed open since building began on it.
  await expect(card).toContainText('▲ Decaying: the flood in Lowmere Plains damaged it');
  await expect(card).toContainText('This quarter’s upkeep pays its $0.2m');
  await expect(page.getByRole('rowheader', { name: /^Lowmere grain store/ })).toContainText(
    '▲ Decaying: the flood in Lowmere Plains damaged it',
  );

  // Its upkeep is paid, so it is in good repair again from the next quarter.
  await endQuarters(page, 1);
  await expect(reports(page).getByText('Restored: Lowmere grain store')).toBeVisible();
  await expect(site).toHaveAccessibleName('Lowmere grain store, grain store, operating');
});
