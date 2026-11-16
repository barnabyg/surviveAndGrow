import { expect, test, type Page } from '@playwright/test';
import {
  approval,
  decisions,
  endQuarters,
  outlook,
  reports,
  startGame,
  tavaraWithDroughtIn,
  treasury,
} from './app';

const map = (page: Page) => page.getByRole('group', { name: 'Map of Republic of Tavara' });

/** Raises tax to the top rate and commits it. */
async function taxAtTheTopRate(page: Page): Promise<void> {
  await decisions(page).getByRole('slider', { name: 'Tax rate' }).fill('40');
  await decisions(page).getByRole('button', { name: 'Commit budget' }).click();
}

test('approval is a vital sign, with the strike threshold stated', async ({ page }) => {
  await startGame(page, { countryFile: tavaraWithDroughtIn([]) });

  await expect(approval(page).getByRole('button')).toContainText('54.3%');
  await expect(approval(page)).toContainText('Opening position');
  await expect(approval(page)).toContainText('Strikes below 40%');
});

test('the budget panel shows what a tax rise would do to approval before it is committed', async ({
  page,
}) => {
  await startGame(page, { countryFile: tavaraWithDroughtIn([]) });
  const nextQuarter = outlook(page).getByRole('group', { name: 'Approval next quarter' });
  const heading = outlook(page).getByRole('group', { name: 'Approval is heading for' });
  await expect(nextQuarter).toHaveText('Approval next quarter54.3%');

  await decisions(page).getByRole('slider', { name: 'Tax rate' }).fill('40');

  // 22 points of tax above the 18% people accept cost 26.4 points in the end, and 8.0 of
  // them in the first quarter.
  await expect(nextQuarter).toHaveText('Approval next quarter54.3% → 46.3%');
  await expect(heading).toHaveText('Approval is heading for54.3% → 27.9%');
  // Nothing has happened to approval itself.
  await expect(approval(page).getByRole('button')).toContainText('54.3%');
});

test('raising tax sharply makes approval fall, and the figure opens to say why', async ({
  page,
}) => {
  await startGame(page, { countryFile: tavaraWithDroughtIn([]) });
  await taxAtTheTopRate(page);

  await endQuarters(page, 1);

  await expect(approval(page).getByRole('button')).toContainText('46.3%');
  await expect(approval(page)).toContainText('▼ 8.0 points this quarter');

  await approval(page).getByRole('button').click();
  const breakdown = page.getByRole('region', { name: 'What moved approval' });
  const moved = breakdown.getByRole('table', { name: 'What moved approval' });
  await expect(moved.getByRole('row', { name: 'Tax rate' })).toContainText('−8.0 points');
  await expect(moved.getByRole('row', { name: 'Food' })).toContainText('0.0 points');
  await expect(moved.getByRole('row', { name: 'Health spending' })).toContainText('0.0 points');
  await expect(moved.getByRole('row', { name: 'Change this quarter' })).toContainText(
    '−8.0 points',
  );

  const madeOf = breakdown.getByRole('table', { name: 'What approval is made of' });
  await expect(madeOf.getByRole('row', { name: 'Baseline' })).toContainText('54.0%');
  await expect(madeOf.getByRole('row', { name: 'Tax rate' })).toContainText('−8.0 points');
  await expect(madeOf.getByRole('row', { name: 'Health spending' })).toContainText('+0.7 points');
  await expect(madeOf.getByRole('row', { name: 'Approval now' })).toContainText('46.3%');

  // It goes on falling in the quarters that follow.
  await endQuarters(page, 1);
  await expect(approval(page).getByRole('button')).toContainText('40.7%');
  await expect(approval(page)).toContainText('▼ 5.6 points this quarter');
});

test('strikes begin when approval falls below the threshold, and cost the treasury revenue', async ({
  page,
}) => {
  await startGame(page, { countryFile: tavaraWithDroughtIn([]) });
  await taxAtTheTopRate(page);

  // The panel warns one quarter before they begin.
  await endQuarters(page, 2);
  await expect(outlook(page)).toContainText('▲ When the quarter ends, strikes in Korr Highlands');

  await endQuarters(page, 1);
  await expect(approval(page).getByRole('button')).toContainText('36.8%');
  await expect(approval(page)).toContainText('▲ Unrest in 6 regions');
  const strike = reports(page).getByRole('listitem').filter({ hasText: 'Strikes in Arden Vale' });
  await expect(strike).toContainText(
    'Approval there has fallen to 36.8%, below the 40% at which strikes begin. While they last the region produces 15% less.',
  );
  await expect(strike.getByRole('img', { name: 'Strike report' })).toBeVisible();

  // The map marks every striking region, and the region's card says where it stands.
  await expect(map(page).getByText('▲ Strikes · output −15%')).toHaveCount(6);
  await strike.getByRole('button').click();
  const card = page.getByRole('region', { name: 'Arden Vale' });
  await expect(card).toContainText('36.8%');
  await expect(card).toContainText('▲ Strikes · output −15%');

  // The next quarter's tax is paid on what the strikers still produce.
  await endQuarters(page, 1);
  await treasury(page).getByRole('button').click();
  const moved = page.getByRole('region', { name: 'What moved the treasury' });
  await expect(moved.getByRole('row', { name: 'Tax from Arden Vale' })).toContainText('+$20.8m');
  await expect(moved.getByRole('row', { name: 'Lost to strikes in Arden Vale' })).toContainText(
    '−$3.1m',
  );
});
