import { expect, test, type Page } from '@playwright/test';
import { debt, decisions, endQuarters, reports, startGame } from './app';

const finance = (page: Page) => decisions(page).getByRole('region', { name: 'Finance' });
const timeline = (page: Page) => page.getByRole('region', { name: 'This term' });

test('below the rating bonds need, the finance panel says what rating is needed', async ({
  page,
}) => {
  await startGame(page);
  await expect(finance(page).getByRole('group', { name: 'Credit rating' })).toContainText(
    'bonds at 4% to 5%',
  );

  // A heavy loan cuts the rating to BBB, below the A that bonds need.
  await finance(page).getByLabel('Borrow').selectOption({ label: '$50.0m' });
  await finance(page).getByLabel('Over').selectOption({ label: '4 quarters' });
  await finance(page).getByRole('button', { name: 'Plan loan' }).click();
  await endQuarters(page, 1);

  await expect(finance(page).getByRole('note', { name: 'Bonds' })).toContainText(
    'Bonds can be issued only at a credit rating of A or better. The nation is rated BBB.',
  );
  await expect(finance(page).getByRole('button', { name: 'Plan bond' })).toHaveCount(0);
});

test('at the rating needed a bond is issued, and its maturity is marked beyond the vote', async ({
  page,
}) => {
  // The game opens rated A, the rating bonds need. A year on, a bond over sixteen quarters
  // falls due after the vote that closes the term.
  await startGame(page);
  await expect(finance(page).getByRole('group', { name: 'Credit rating' })).toContainText(
    'Credit rating A',
  );
  await endQuarters(page, 4);

  await finance(page).getByLabel('Raise').selectOption({ label: '$20.0m' });
  await finance(page).getByLabel('Maturing in').selectOption({ label: '16 quarters' });
  const terms = finance(page).getByRole('group', { name: 'Bond terms' });
  // 5% a year on $20.0m is $0.3m a quarter, to the nearest $0.1m.
  await expect(terms).toContainText('$0.3m');
  await expect(terms).toContainText('at 5% a year');
  await expect(terms).toContainText('In one payment, Year 6, Quarter 1');
  await expect(terms).toContainText('$4.8m');
  await finance(page).getByRole('button', { name: 'Plan bond' }).click();

  // Planned, it can be taken back, and the timeline already marks when it would fall due.
  const planned = finance(page).getByRole('group', { name: 'Bond of $20.0m over 16 quarters' });
  await expect(planned).toContainText('Planned');
  await expect(timeline(page).getByRole('row', { name: /Planned bond/ })).toContainText(
    'If issued now · Matures Year 6, Quarter 1, after the vote',
  );
  await planned.getByRole('button', { name: /Cancel/ }).click();
  await expect(planned).toHaveCount(0);
  await expect(timeline(page).getByRole('row', { name: /Planned bond/ })).toHaveCount(0);
  await finance(page).getByRole('button', { name: 'Plan bond' }).click();

  await endQuarters(page, 1);

  await expect(reports(page).getByText('Issued $20.0m in bonds: Bond 1')).toBeVisible();
  await expect(debt(page)).toContainText('$20.0m');
  const row = timeline(page).getByRole('row', { name: /Bond 1/ });
  await expect(row).toContainText('Matures Year 6, Quarter 1, after the vote');
  await expect(row).toContainText('$20.0m due Year 6, Quarter 1');
  await expect(finance(page).getByRole('list', { name: 'What is owed' })).toContainText(
    'Bond 1 · $20.0m at 5%',
  );
  await expect(finance(page).getByRole('list', { name: 'What is owed' })).toContainText(
    'matures Year 6, Quarter 1',
  );
});
