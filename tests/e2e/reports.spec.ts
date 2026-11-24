import { expect, test, type Page } from '@playwright/test';
import { decisions, endQuarters, reports, startGame, tavaraWithDroughtIn } from './app';

const map = (page: Page) => page.getByRole('group', { name: 'Map of Republic of Tavara' });

test('reports arrive only once a quarter has ended', async ({ page }) => {
  await startGame(page, { countryFile: tavaraWithDroughtIn([]) });

  await expect(reports(page)).toContainText('Reports arrive when a quarter ends.');
  await expect(reports(page).getByRole('listitem')).toHaveCount(0);
});

test('ending a quarter in deficit reports the shrinking treasury, with an icon and the cause', async ({
  page,
}) => {
  await startGame(page, { countryFile: tavaraWithDroughtIn([]) });

  await endQuarters(page, 1);

  await expect(reports(page)).toContainText('1 report');
  const entries = reports(page).getByRole('listitem');
  await expect(entries).toHaveCount(1);
  await expect(entries.first()).toContainText('The treasury is shrinking');
  await expect(entries.first()).toContainText(
    'Spending of $38.0m outran revenue of $31.0m. At this deficit the treasury lasts 5 more quarters.',
  );
  // The icon says what kind of report it is, and the words say how serious.
  await expect(entries.first().getByRole('img', { name: 'Budget report' })).toBeVisible();
  await expect(entries.first()).toContainText('Warning');
});

test('a quarter in which nothing notable happened says so', async ({ page }) => {
  await startGame(page, { countryFile: tavaraWithDroughtIn([]) });
  const budget = decisions(page);
  await budget.getByRole('slider', { name: 'Tax rate' }).fill('40');
  await budget.getByRole('button', { name: 'Commit budget' }).click();

  await endQuarters(page, 1);

  const entries = reports(page).getByRole('listitem');
  await expect(entries).toHaveCount(2);
  await expect(entries.nth(0)).toContainText('A quiet quarter');
  await expect(entries.nth(0)).toContainText('Nothing notable happened.');
  await expect(entries.nth(1)).toContainText('The treasury is growing');
});

test('the most serious report comes first, and selecting it picks out its region on the map', async ({
  page,
}) => {
  await startGame(page, { countryFile: tavaraWithDroughtIn(['dry-east']) });

  await endQuarters(page, 1);

  await expect(reports(page)).toContainText('2 reports');
  const entries = reports(page).getByRole('listitem');
  await expect(entries.nth(0)).toContainText('Drought in The Dry East');
  await expect(entries.nth(0)).toContainText('Serious');
  await expect(entries.nth(1)).toContainText('The treasury is shrinking');

  const region = map(page).getByRole('button', { name: /^The Dry East/ });
  const drought = reports(page).getByRole('button', { name: /Drought in The Dry East/ });
  await expect(region).toHaveAttribute('aria-pressed', 'false');
  await expect(drought).toHaveAttribute('aria-pressed', 'false');
  await expect(drought).toContainText('On the map ›');

  await drought.click();

  // A mark and words say which report is picked out, so it does not rest on colour.
  await expect(drought).toHaveAttribute('aria-pressed', 'true');
  await expect(drought).toContainText('◆ Picked out on the map');
  await expect(region).toHaveAttribute('aria-pressed', 'true');
  await expect(map(page).getByRole('img', { name: 'The Dry East is picked out' })).toBeVisible();
  // The region's card opens too, so the player can act on what the report says.
  await expect(page.getByRole('region', { name: 'The Dry East' })).toBeVisible();

  // A report about the whole country has no place to show.
  await expect(
    reports(page).getByRole('button', { name: /The treasury is shrinking/ }),
  ).toHaveCount(0);

  // Picking another region on the map leaves the report behind. It is picked from the
  // keyboard: the open card stands over the middle of the Salt Coast.
  await map(page)
    .getByRole('button', { name: /^Salt Coast/ })
    .press('Enter');
  await expect(drought).toHaveAttribute('aria-pressed', 'false');

  // Selecting the report a second time lets go of the region.
  await drought.click();
  await expect(region).toHaveAttribute('aria-pressed', 'true');
  await drought.click();
  await expect(drought).toHaveAttribute('aria-pressed', 'false');
  await expect(drought).not.toContainText('Picked out');
  await expect(region).toHaveAttribute('aria-pressed', 'false');
});
