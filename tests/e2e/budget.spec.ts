import { expect, test, type Page } from '@playwright/test';
import { SPENDING_AREA_NAMES, SPENDING_AREAS } from '../../src/sim';
import { decisions, endQuarters, startGame, treasury } from './app';

const totals = (page: Page) => decisions(page).getByRole('group', { name: 'Budget totals' });

test('the budget shows a slider for tax and each spending area, with the totals', async ({
  page,
}) => {
  await startGame(page);
  const budget = decisions(page);

  for (const name of ['Tax rate', ...SPENDING_AREAS.map((area) => SPENDING_AREA_NAMES[area])]) {
    await expect(budget.getByRole('slider', { name })).toBeVisible();
  }
  await expect(budget.getByRole('slider', { name: 'Tax rate' })).toHaveValue('18');
  // Enough upkeep to keep every site in good repair, though nothing is built yet to need it.
  await expect(budget.getByRole('slider', { name: 'Upkeep' })).toHaveValue('5');
  await expect(budget.getByRole('group', { name: 'Upkeep needed' })).toContainText(
    'No site is in use yet, so upkeep costs nothing',
  );
  await expect(totals(page).getByRole('group', { name: 'Revenue' })).toContainText('$31.0m');
  await expect(totals(page).getByRole('group', { name: 'Spending' })).toContainText('$38.0m');
  await expect(totals(page).getByRole('group', { name: 'Balance' })).toContainText('−$7.0m');
});

test('changing a slider, committing and ending the quarter moves the treasury by the balance', async ({
  page,
}) => {
  await startGame(page);
  const budget = decisions(page);

  await budget.getByRole('slider', { name: 'Agriculture' }).fill('13');

  await expect(budget.getByRole('tab', { name: 'Budget' })).toHaveAccessibleDescription(
    '1 uncommitted',
  );
  await expect(totals(page).getByRole('group', { name: 'Balance' })).toContainText('−$9.0m');

  await budget.getByRole('button', { name: 'Commit budget' }).click();

  await expect(budget.getByRole('tab', { name: 'Budget' })).toHaveAccessibleDescription(
    'Committed',
  );
  await expect(treasury(page)).toContainText('$42.0m');

  await endQuarters(page, 1);

  // $42.0m less the $9.0m the panel stated.
  await expect(treasury(page)).toContainText('$33.0m');
  await expect(treasury(page)).toContainText('▼ $9.0m this quarter');
});

test('reset discards changes that have not been committed', async ({ page }) => {
  await startGame(page);
  const budget = decisions(page);

  await budget.getByRole('slider', { name: 'Tax rate' }).fill('30');
  await budget.getByRole('slider', { name: 'Health' }).fill('2');
  await expect(budget.getByRole('tab', { name: 'Budget' })).toHaveAccessibleDescription(
    '2 uncommitted',
  );

  await budget.getByRole('button', { name: 'Reset' }).click();

  await expect(budget.getByRole('slider', { name: 'Tax rate' })).toHaveValue('18');
  await expect(budget.getByRole('slider', { name: 'Health' })).toHaveValue('7');
  await expect(budget.getByRole('tab', { name: 'Budget' })).toHaveAccessibleDescription(
    'Committed',
  );
});

test('ending the quarter with uncommitted changes warns first', async ({ page }) => {
  await startGame(page);
  await decisions(page).getByRole('slider', { name: 'Tax rate' }).fill('30');

  await endQuarters(page, 1);

  const warning = page.getByRole('dialog', { name: 'You have changes you have not committed' });
  await expect(warning).toBeVisible();

  // Going back ends nothing.
  await warning.getByRole('button', { name: 'Go back' }).click();
  await expect(warning).toBeHidden();
  await expect(page.getByRole('banner').getByText('Year 1 · Quarter 1')).toBeVisible();

  // Carrying on resolves the quarter with the committed budget, not the pending one.
  await endQuarters(page, 1);
  await warning.getByRole('button', { name: 'End quarter anyway' }).click();
  await expect(page.getByRole('banner').getByText('Year 1 · Quarter 2')).toBeVisible();
  await expect(treasury(page)).toContainText('$35.0m');
});

test('opening the treasury figure lists what moved it', async ({ page }) => {
  await startGame(page);
  await endQuarters(page, 1);

  await treasury(page)
    .getByRole('button', { name: /Treasury/ })
    .click();

  const breakdown = page.getByRole('region', { name: 'What moved the treasury' });
  await expect(breakdown.getByRole('row', { name: 'Tax from Arden Vale' })).toContainText('+$9.4m');
  await expect(breakdown.getByRole('row', { name: 'Tax from The Dry East' })).toContainText(
    '+$2.2m',
  );
  await expect(breakdown.getByRole('row', { name: 'Agriculture' })).toContainText('−$11.0m');
  await expect(breakdown.getByRole('row', { name: 'Security' })).toContainText('−$5.0m');
  await expect(breakdown.getByRole('row', { name: 'Defence' })).toContainText('−$2.0m');
  await expect(breakdown.getByRole('row', { name: 'Change this quarter' })).toContainText('−$7.0m');
});

test('the turn report says when spending had to be cut', async ({ page }) => {
  await startGame(page);
  const budget = decisions(page);
  await budget.getByRole('slider', { name: 'Tax rate' }).fill('5');
  for (const name of ['Agriculture', 'Food relief', 'Health', 'Education', 'Security']) {
    await budget.getByRole('slider', { name }).fill('20');
  }
  await budget.getByRole('button', { name: 'Commit budget' }).click();

  await endQuarters(page, 1);

  const situation = page.getByRole('complementary', { name: 'Situation' });
  await expect(situation.getByText('Spending was cut')).toBeVisible();
  await expect(situation.getByText(/could not cover the \$102\.0m budget/)).toBeVisible();
  await expect(treasury(page)).toContainText('$0.2m');
});
