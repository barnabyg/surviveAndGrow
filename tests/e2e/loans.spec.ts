import { expect, test, type Page } from '@playwright/test';
import { debt, decisions, endQuarters, reports, startGame, treasury, openTab } from './app';

const finance = (page: Page) => openTab(page, 'Finance');

test('a loan is planned with its cost shown, arrives as the quarter ends and is repaid', async ({
  page,
}) => {
  await startGame(page);
  await expect(debt(page)).toContainText('$0.0m');

  // $25.0m over eight quarters at 8% a year.
  await (await finance(page)).getByLabel('Borrow').selectOption({ label: '$25.0m' });
  await (await finance(page)).getByLabel('Over').selectOption({ label: '8 quarters' });
  const terms = (await finance(page)).getByRole('group', { name: 'Loan terms' });
  await expect(terms).toContainText('Repayment');
  await expect(terms).toContainText('$3.5m');
  await expect(terms).toContainText('At 8% a year');
  await (await finance(page)).getByRole('button', { name: 'Plan loan' }).click();

  // Planned, it can be taken back, and the money shows in the preview.
  const planned = (await finance(page)).getByRole('group', {
    name: 'Loan of $25.0m over 8 quarters',
  });
  await expect(planned).toContainText('Planned');
  await openTab(page, 'Budget');
  await expect(decisions(page).getByRole('group', { name: 'Loans received' })).toContainText(
    '+$25.0m',
  );
  await openTab(page, 'Finance');
  await planned.getByRole('button', { name: /Cancel/ }).click();
  await expect(planned).toHaveCount(0);
  await (await finance(page)).getByRole('button', { name: 'Plan loan' }).click();

  await endQuarters(page, 1);

  // $42.0m and $31.0m of revenue, less $38.0m of spending, and the $25.0m loan.
  await expect(treasury(page)).toContainText('$60.0m');
  await expect(debt(page)).toContainText('$25.0m');
  // Against a year's revenue of $124.0m.
  await expect(debt(page)).toContainText('Burden 20.1%');
  await expect(reports(page).getByText('Borrowed $25.0m: Loan 1')).toBeVisible();

  await debt(page).getByRole('button', { name: /Debt/ }).click();
  const owed = debt(page).getByRole('table', { name: 'What is owed' });
  await expect(owed.getByRole('row', { name: /Loan 1/ })).toContainText('8 quarters');

  await endQuarters(page, 1);

  // The first repayment: $0.5m of interest and $3.0m off the principal, paid before anything else.
  await expect(treasury(page)).toContainText('$49.5m');
  await expect(debt(page)).toContainText('$22.0m');
  await treasury(page)
    .getByRole('button', { name: /Treasury/ })
    .click();
  const moved = treasury(page).getByRole('table', { name: 'What moved the treasury' });
  await expect(moved.getByRole('row', { name: /Interest on Loan 1/ })).toContainText('−$0.5m');
  await expect(moved.getByRole('row', { name: /Repaying Loan 1/ })).toContainText('−$3.0m');
});
