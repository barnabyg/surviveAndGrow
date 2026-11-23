import { expect, test, type Locator } from '@playwright/test';
import { balance, siteTerms, technologyTerms } from '../../src/sim';
import { endQuarters, openTab, reports, situation, startGame, tavaraWith } from './app';

/** Tavara with no drought and a treasury that covers the research and a school. */
function tavaraWithMoney() {
  const country = tavaraWith({ drought: [] }) as ReturnType<typeof tavaraWith> & {
    start: { treasury: number };
  };
  country.start.treasury = 600;
  return country;
}

/** A level on a region's card, as the figure it shows. */
async function levelOn(card: Locator, name: 'Health' | 'Education'): Promise<number> {
  const figure = card
    .locator('dl > div')
    .filter({ has: card.page().locator('dt', { hasText: new RegExp(`^${name}$`) }) })
    .locator('dd');
  return Number(await figure.innerText());
}

test('a school is unlocked by research, built, and raises its region’s education level', async ({
  page,
}) => {
  await startGame(page, { countryFile: tavaraWithMoney() });
  const map = page.getByRole('group', { name: 'Map of Republic of Tavara' });
  const regionButton = situation(page)
    .getByRole('region', { name: 'Regions' })
    .getByRole('button', { name: /South Delta/ });
  const region = page.getByRole('region', { name: 'South Delta' });
  const settles = region.getByRole('table', { name: 'Where its education level settles' });

  // The school is locked, and its card says what it needs and what it would do.
  const mark = map.getByRole('button', { name: /^Southbank school/ });
  await expect(mark).toHaveAccessibleName(/locked, needs Teacher training researched first/);
  await mark.click();
  const locked = page.getByRole('region', { name: 'Southbank school' });
  await expect(locked.getByRole('status', { name: 'Locked' })).toContainText(
    'Locked: Teacher training must be researched first',
  );
  await expect(locked).toContainText(
    'Its region’s education level builds up to 15.0 points higher than education spending alone holds it',
  );
  await expect(locked.getByRole('button', { name: 'Start building' })).toHaveCount(0);
  await locked.getByRole('button', { name: 'Close' }).click();

  // Its region's card shows the education level, with no breakdown while no school is in use.
  await regionButton.click();
  const before = await levelOn(region, 'Education');
  expect(before).toBeGreaterThan(0);
  await expect(settles).toHaveCount(0);
  await region.getByRole('button', { name: 'Close' }).click();

  // The research tab says teacher training unlocks it, and it needs nothing first.
  const training = (await openTab(page, 'Research')).getByRole('group', {
    name: 'Teacher training',
  });
  await expect(training).toContainText('Unlocks schools.');
  await expect(
    training.getByRole('region', { name: 'What Teacher training unlocks in this game' }),
  ).toContainText('Southbank school, in South Delta');
  await training.getByRole('button', { name: 'Research Teacher training' }).click();
  await endQuarters(page, technologyTerms('teacherTraining').researchQuarters);
  await expect(reports(page).getByText('Research finished: Teacher training')).toBeVisible();

  // Now the school can be built. It is in use from the quarter after its last instalment, and
  // the quarter after that has raised the level.
  await map.getByRole('button', { name: /^Southbank school/ }).click();
  const card = page.getByRole('region', { name: 'Southbank school' });
  await expect(card.getByRole('status', { name: 'Locked' })).toHaveCount(0);
  await card.getByRole('button', { name: 'Start building' }).click();
  await card.getByRole('button', { name: 'Close' }).click();
  await endQuarters(page, siteTerms('school').buildQuarters + 2);

  // The region's education level has risen, and its breakdown names the school.
  await regionButton.click();
  expect(await levelOn(region, 'Education')).toBeGreaterThan(before);
  const points = (balance.sites.school.services.education / 10).toFixed(1);
  await expect(settles.getByRole('row', { name: /^Education spending/ })).toBeVisible();
  await expect(settles.getByRole('row', { name: 'Southbank school' })).toContainText(points);
  await expect(settles.getByRole('row', { name: 'Total' })).toBeVisible();
  // Health has no clinic there, so it has no breakdown.
  await expect(region.getByRole('table', { name: 'Where its health level settles' })).toHaveCount(
    0,
  );
  await expect(
    region.getByRole('table', { name: 'Infrastructure access' }).getByRole('row', {
      name: /^Southbank school/,
    }),
  ).toBeVisible();
});
