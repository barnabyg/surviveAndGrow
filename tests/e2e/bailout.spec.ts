import { expect, test, type Page } from '@playwright/test';
import { debt, decisions, endQuarters, reports, risks, startGame, tavaraWith } from './app';

const finance = (page: Page) => decisions(page).getByRole('region', { name: 'Finance' });
const projects = (page: Page) => decisions(page).getByRole('region', { name: 'Projects' });
const map = (page: Page) => page.getByRole('group', { name: 'Map of Republic of Tavara' });
const austerity = (page: Page) =>
  page.getByRole('banner').getByRole('group', { name: 'Austerity' });

test('over-borrowing brings a bailout, austerity holds the budget and building, and then ends', async ({
  page,
}) => {
  // Tavara without drought, so nothing but the budget and the loan moves the treasury.
  await startGame(page, { countryFile: tavaraWith({ drought: [] }) });
  const budget = decisions(page).getByRole('region', { name: 'Budget' });

  // $50.0m over four quarters, then the lowest tax and the most on four areas: the treasury
  // spends everything it has, and the lowest tax cannot cover a repayment of $13.1m.
  await finance(page).getByLabel('Borrow').selectOption({ label: '$50.0m' });
  await finance(page).getByLabel('Over').selectOption({ label: '4 quarters' });
  await finance(page).getByRole('button', { name: 'Plan loan' }).click();
  await budget.getByRole('slider', { name: 'Tax rate' }).fill('5');
  for (const area of ['Agriculture', 'Health', 'Education', 'Security']) {
    await budget.getByRole('slider', { name: area }).fill('20');
  }
  await budget.getByRole('button', { name: 'Commit budget' }).click();
  await endQuarters(page, 2);

  // The risks ahead see it coming.
  const warned = risks(page).getByRole('listitem').filter({ hasText: 'Bailout' });
  await expect(warned).toContainText(
    'As things stand the treasury and revenue cannot cover the repayment on Loan 1 this quarter. A missed payment brings a bailout',
  );

  await endQuarters(page, 1);

  await expect(reports(page).getByText('Bailout: the nation’s debts taken over')).toBeVisible();
  await expect(debt(page)).not.toContainText('$0.0m');
  await expect(austerity(page)).toContainText('8 quarters left');
  await expect(austerity(page)).toContainText('Ends after Year 3, Quarter 3');

  // The sliders are held to the floor and the caps, and say why.
  await expect(budget.getByRole('note', { name: 'Austerity' })).toContainText(
    'The bailout’s terms hold for 8 quarters more, until Year 3 · Quarter 3 ends.',
  );
  const tax = budget.getByRole('slider', { name: 'Tax rate' });
  await expect(tax).toHaveValue('25');
  await expect(tax).toHaveAttribute('min', '25');
  await expect(tax).toHaveAccessibleDescription('▲ Austerity: no lower than 25%');
  const health = budget.getByRole('slider', { name: 'Health' });
  await expect(health).toHaveValue('5');
  await expect(health).toHaveAttribute('max', '5');
  await expect(health).toHaveAccessibleDescription('▲ Austerity: no more than $5.0m');

  // Nothing can be borrowed, and no project started.
  await expect(finance(page).getByRole('note', { name: 'Loans' })).toContainText(
    'Nothing can be borrowed during austerity',
  );
  await expect(finance(page).getByRole('button', { name: 'Plan loan' })).toHaveCount(0);
  await expect(projects(page).getByRole('note', { name: 'Austerity' })).toContainText(
    'No project can be started during austerity',
  );
  await map(page)
    .getByRole('button', { name: /^Lowmere grain store/ })
    .click();
  const card = page.getByRole('region', { name: 'Lowmere grain store' });
  await expect(card.getByRole('button', { name: 'Start building' })).toBeDisabled();
  await expect(card).toContainText('No project can be started during austerity');
  await card.getByRole('button', { name: 'Close' }).click();

  // Repayments made on time, austerity runs its course and ends.
  await endQuarters(page, 7);
  await expect(austerity(page)).toContainText('1 quarter left');
  await endQuarters(page, 1);

  await expect(reports(page).getByText('Austerity ends')).toBeVisible();
  await expect(austerity(page)).toHaveCount(0);
  await expect(tax).toHaveAttribute('min', '5');
  await expect(budget.getByRole('note', { name: 'Austerity' })).toHaveCount(0);
  await expect(projects(page).getByRole('note', { name: 'Austerity' })).toHaveCount(0);
});
