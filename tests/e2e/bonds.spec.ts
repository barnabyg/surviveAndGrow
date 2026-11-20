import { expect, test, type Page } from '@playwright/test';
import { decisions, endQuarters, reports, startGame, tavaraWith } from './app';

const finance = (page: Page) => decisions(page).getByRole('region', { name: 'Finance' });
const timeline = (page: Page) => page.getByRole('region', { name: 'This term' });
const credit = (page: Page) => finance(page).getByRole('group', { name: 'Credit rating' });

test('bonds are earned by repaying a loan on time to AA, then issued and marked on the timeline', async ({
  page,
}) => {
  // Tavara without drought, so nothing but the loan moves the rating.
  await startGame(page, { countryFile: tavaraWith({ drought: [] }) });

  // The game opens rated A, below the AA that bonds need, and the panel says so.
  await expect(credit(page)).toContainText('Credit rating A');
  await expect(finance(page).getByRole('note', { name: 'Bonds' })).toContainText(
    'Bonds can be issued only at a credit rating of AA or better. The nation is rated A.',
  );
  await expect(finance(page).getByRole('button', { name: 'Plan bond' })).toHaveCount(0);
  await expect(credit(page)).toContainText('One step up, AA');
  await expect(credit(page)).toContainText('bonds at 3.5% to 4.5%');

  // A small loan, repaid on time, adds 25 points a quarter to the payment record: from 700
  // to 900 in the eight quarters of repayments after the one it is taken in, and AA.
  await finance(page).getByLabel('Borrow').selectOption({ label: '$10.0m' });
  await finance(page).getByLabel('Over').selectOption({ label: '12 quarters' });
  await finance(page).getByRole('button', { name: 'Plan loan' }).click();
  await endQuarters(page, 8);
  await expect(finance(page).getByRole('note', { name: 'Bonds' })).toContainText(
    'The nation is rated A.',
  );
  await endQuarters(page, 1);
  await expect(credit(page)).toContainText('Credit rating AA');
  await expect(finance(page).getByRole('note', { name: 'Bonds' })).toHaveCount(0);

  // In Year 3 · Quarter 2, a bond over sixteen quarters falls due after the term's vote.
  await finance(page).getByLabel('Raise').selectOption({ label: '$20.0m' });
  await finance(page).getByLabel('Maturing in').selectOption({ label: '16 quarters' });
  const terms = finance(page).getByRole('group', { name: 'Bond terms' });
  // 4.5% a year on $20.0m is $0.2m a quarter, to the nearest $0.1m.
  await expect(terms).toContainText('$0.2m');
  await expect(terms).toContainText('at 4.5% a year');
  await expect(terms).toContainText('In one payment, Year 7, Quarter 2');
  await expect(terms).toContainText('$3.2m');
  await finance(page).getByRole('button', { name: 'Plan bond' }).click();

  // Planned, it can be taken back, and the timeline already marks when it would fall due.
  const planned = finance(page).getByRole('group', { name: 'Bond of $20.0m over 16 quarters' });
  await expect(planned).toContainText('Planned');
  await expect(timeline(page).getByRole('row', { name: /Planned bond/ })).toContainText(
    'If issued now · Matures Year 7, Quarter 2, after the vote',
  );
  await planned.getByRole('button', { name: /Cancel/ }).click();
  await expect(planned).toHaveCount(0);
  await expect(timeline(page).getByRole('row', { name: /Planned bond/ })).toHaveCount(0);
  await finance(page).getByRole('button', { name: 'Plan bond' }).click();

  await endQuarters(page, 1);

  await expect(reports(page).getByText('Issued $20.0m in bonds: Bond 2')).toBeVisible();
  const row = timeline(page).getByRole('row', { name: /Bond 2/ });
  await expect(row).toContainText('Matures Year 7, Quarter 2, after the vote');
  await expect(row).toContainText('$20.0m due Year 7, Quarter 2');
  const owed = finance(page).getByRole('list', { name: 'What is owed' });
  await expect(owed).toContainText('Bond 2 · $20.0m at 4.5%');
  await expect(owed).toContainText('matures Year 7, Quarter 2');
});
