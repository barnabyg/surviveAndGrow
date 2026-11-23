import { expect, test, type Page } from '@playwright/test';
import { endQuarters, reports, startGame } from './app';

const map = (page: Page) => page.getByRole('group', { name: 'Map of Republic of Tavara' });
const card = (page: Page) => page.getByRole('region', { name: /^Salt Coast$|^The Dry East$/ });
const survey = (page: Page) => card(page).getByRole('region', { name: 'Survey' });

test('a survey is planned from the region’s card, finds a deposit and puts its mine on the map', async ({
  page,
}) => {
  // On seed 3 the Salt Coast holds a deposit of 290,000 t of ore a quarter.
  await startGame(page, { seed: 3 });

  const unsurveyed = map(page).getByRole('img', {
    name: 'Salt Coast: not yet surveyed: a deposit of ore may lie here',
  });
  await expect(unsurveyed).toBeVisible();
  await expect(map(page).getByRole('button', { name: /^Westhaven mine/ })).toHaveCount(0);

  await map(page)
    .getByRole('button', { name: /^Salt Coast/ })
    .click();
  // What it costs, takes and may find is shown before the player commits.
  await expect(survey(page)).toContainText('Not surveyed');
  await expect(survey(page)).toContainText(
    '$4.0m over 2 quarters · 60% chance of a find · 150,000 t to 350,000 t of ore a quarter if found.',
  );

  // Planned, it can be taken back until the quarter ends.
  await card(page).getByRole('button', { name: 'Survey Salt Coast' }).click();
  await expect(survey(page)).toContainText('It starts when this quarter ends.');
  await expect(map(page).getByRole('img', { name: 'Salt Coast: survey planned' })).toBeVisible();
  await card(page).getByRole('button', { name: 'Cancel the survey of Salt Coast' }).click();
  await expect(survey(page)).toContainText('Not surveyed');
  await card(page).getByRole('button', { name: 'Survey Salt Coast' }).click();

  await endQuarters(page, 1);
  await expect(reports(page).getByText('Survey begins: Salt Coast')).toBeVisible();
  await expect(map(page).getByRole('img', { name: 'Salt Coast: being surveyed' })).toBeVisible();

  await endQuarters(page, 1);
  await expect(reports(page).getByText('Survey finished: Salt Coast')).toBeVisible();
  await expect(
    reports(page).getByText(/They found a deposit of ore whose mine could yield 290,000 t/),
  ).toBeVisible();
  await expect(map(page).getByRole('img', { name: /^Salt Coast:/ })).toHaveCount(0);
  await expect(map(page).getByRole('button', { name: /^Westhaven mine/ })).toBeVisible();
  await expect(
    map(page).getByRole('button', { name: /^Trunk road, Westhaven mine to Saltmouth/ }),
  ).toBeVisible();

  await map(page)
    .getByRole('button', { name: /^Salt Coast/ })
    .click();
  await expect(survey(page).getByRole('status', { name: 'Survey result' })).toHaveText(
    'Surveyed: a deposit of ore was found. Its mine could yield 290,000 t a quarter.',
  );
  await expect(card(page).getByRole('button', { name: /survey/i })).toHaveCount(0);
});

test('a survey that finds nothing says so, and the region is surveyed', async ({ page }) => {
  // On seed 1 the Dry East holds no deposit.
  await startGame(page, { seed: 1 });

  await map(page)
    .getByRole('button', { name: /^The Dry East/ })
    .click();
  await expect(survey(page)).toContainText('35% chance of a find');
  await card(page).getByRole('button', { name: 'Survey The Dry East' }).click();
  await endQuarters(page, 2);

  await expect(reports(page).getByText('Survey finished: The Dry East')).toBeVisible();
  await expect(
    reports(page).getByText('They found no deposit of ore worth mining.', { exact: false }),
  ).toBeVisible();
  await expect(map(page).getByRole('img', { name: /^The Dry East:/ })).toHaveCount(0);
  await expect(map(page).getByRole('button', { name: /^Dustwell mine/ })).toHaveCount(0);

  await map(page)
    .getByRole('button', { name: /^The Dry East/ })
    .click();
  await expect(survey(page).getByRole('status', { name: 'Survey result' })).toHaveText(
    'Surveyed: no deposit of ore worth mining lies here.',
  );
});
