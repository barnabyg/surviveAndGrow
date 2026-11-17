import { expect, test, type Page } from '@playwright/test';
import { decisions, endQuarters, risks, startGame, tavaraWithDroughtIn } from './app';

const map = (page: Page) => page.getByRole('group', { name: 'Map of Republic of Tavara' });

test('a country in no danger says so', async ({ page }) => {
  await startGame(page, { countryFile: tavaraWithDroughtIn([]) });

  await expect(risks(page)).toContainText('Next 4 quarters');
  await expect(risks(page)).toContainText('No danger is in sight.');
  await expect(risks(page).getByRole('listitem')).toHaveCount(0);
});

test('a famine risk is listed during a drought, and relief sent to the region lifts it', async ({
  page,
}) => {
  await startGame(page, { countryFile: tavaraWithDroughtIn(['dry-east']) });

  // The drought begins as the planting season opens.
  await endQuarters(page, 1);
  await expect(map(page).getByText('Drought · harvest −40%')).toBeVisible();

  const famine = risks(page).getByRole('button', { name: /Famine in The Dry East/ });
  await expect(risks(page).getByRole('listitem')).toHaveCount(1);
  await expect(famine).toContainText(
    'The drought has cut its harvest. It runs short of food in 3 quarters, and left alone that is famine 2 quarters later.',
  );
  // The likelihood is a meter and a word, so it does not rest on colour.
  await expect(famine).toContainText('Almost certain');
  await expect(famine.getByRole('img', { name: 'Likelihood 5 of 5' })).toBeVisible();

  // Selecting the risk picks its region out on the map, where the player can act on it.
  await famine.click();
  await expect(famine).toHaveAttribute('aria-pressed', 'true');
  await expect(map(page).getByRole('img', { name: 'The Dry East is picked out' })).toBeVisible();
  await page
    .getByRole('region', { name: 'The Dry East' })
    .getByRole('button', { name: 'Send food relief here' })
    .click();

  await expect(risks(page)).toContainText('No danger is in sight.');
});

test('the risks answer to the budget once it is committed', async ({ page }) => {
  await startGame(page, { countryFile: tavaraWithDroughtIn([]) });
  const budget = decisions(page);

  await budget.getByRole('slider', { name: 'Tax rate' }).fill('40');
  await expect(risks(page)).toContainText('No danger is in sight.');

  await budget.getByRole('button', { name: 'Commit budget' }).click();

  const strikes = risks(page).getByRole('listitem').filter({ hasText: 'Strikes' });
  await expect(strikes).toContainText(
    'Approval in every region is on course to fall below 40% in 2 quarters.',
  );
  await expect(strikes).toContainText('Almost certain');
  // A danger to the whole country has no one place to show.
  await expect(risks(page).getByRole('button')).toHaveCount(0);
});
