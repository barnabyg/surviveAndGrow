import { expect, test, type Page } from '@playwright/test';
import { debt, decisions, endQuarters, reports, startGame, testlandFile } from './app';

const finance = (page: Page) => decisions(page).getByRole('region', { name: 'Finance' });
const rating = (page: Page) =>
  page.getByRole('banner').getByRole('group', { name: 'Credit rating' });

test('the credit rating is shown with its breakdown, and a loan’s rate follows it', async ({
  page,
}) => {
  await startGame(page);
  await expect(rating(page)).toContainText('A');
  await expect(rating(page)).toContainText('Loans at 6% to 10%');

  await rating(page)
    .getByRole('button', { name: /Credit rating/ })
    .click();
  const madeOf = rating(page).getByRole('table', { name: 'What the rating is made of' });
  await expect(madeOf.getByRole('row', { name: /Payment record/ })).toContainText('700');
  await expect(madeOf.getByRole('row', { name: /Score now/ })).toContainText('700');
  const steps = rating(page).getByRole('table', { name: 'Credit ratings' });
  await expect(steps.getByRole('row', { name: /BBB/ })).toContainText('7.5% to 11.5%');

  // The finance panel says what the rating gets, and what a step either way would mean.
  const credit = finance(page).getByRole('group', { name: 'Credit rating' });
  await expect(credit).toContainText('Credit rating A');
  await expect(credit).toContainText('One step up, AA');
  await expect(credit).toContainText('One step down, BBB');

  // A heavy loan, at A's rate. Planned, the finance panel and the budget's outlook both
  // show it cutting the rating.
  await finance(page).getByLabel('Borrow').selectOption({ label: '$50.0m' });
  await finance(page).getByLabel('Over').selectOption({ label: '4 quarters' });
  const terms = finance(page).getByRole('group', { name: 'Loan terms' });
  await expect(terms).toContainText('At 6% a year');
  await finance(page).getByRole('button', { name: 'Plan loan' }).click();
  await expect(credit).toContainText('the rating is cut to BBB when this quarter ends');
  await expect(
    decisions(page).getByRole('group', { name: 'Credit rating next quarter' }),
  ).toContainText('BBB');

  await endQuarters(page, 1);

  await expect(rating(page).getByRole('button', { name: /Credit rating/ })).toContainText('BBB');
  await expect(reports(page).getByText('Credit rating cut to BBB')).toBeVisible();

  // The next loan is offered at BBB's dearer rate.
  await finance(page).getByLabel('Borrow').selectOption({ label: '$10.0m' });
  await finance(page).getByLabel('Over').selectOption({ label: '4 quarters' });
  await expect(terms).toContainText('At 7.5% a year');
});

test('a country that starts in debt opens owing it, at the rating the debt implies', async ({
  page,
}) => {
  // Testland starts owing $7.0m and $4.0m, against a year's revenue of $20.0m.
  await startGame(page, { countryFile: testlandFile() });

  await expect(debt(page)).toContainText('$11.0m');
  await expect(debt(page)).toContainText('Burden 55.0%');
  await debt(page).getByRole('button', { name: /Debt/ }).click();
  const owed = debt(page).getByRole('table', { name: 'What is owed' });
  await expect(owed.getByRole('row', { name: /Loan 1/ })).toContainText('8 quarters');
  await expect(owed.getByRole('row', { name: /Loan 2/ })).toContainText('12 quarters');

  // A record of 700 less 220 points for the burden: BBB, where a new loan costs more.
  await expect(rating(page)).toContainText('BBB');
  await expect(rating(page)).toContainText('Loans at 7.5% to 11.5%');
  await rating(page)
    .getByRole('button', { name: /Credit rating/ })
    .click();
  const madeOf = rating(page).getByRole('table', { name: 'What the rating is made of' });
  await expect(madeOf.getByRole('row', { name: /Debt burden/ })).toContainText('220');
  await expect(madeOf.getByRole('row', { name: /Score now/ })).toContainText('480');
});
