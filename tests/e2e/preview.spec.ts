import { expect, test } from '@playwright/test';
import { decisions, outlook, startGame, treasury } from './app';

test('with no pending changes the panel shows the outlook at the current settings', async ({
  page,
}) => {
  await startGame(page);

  await expect(outlook(page)).toHaveAccessibleName('Outlook at the current settings');
  await expect(outlook(page).getByRole('group', { name: 'Treasury next quarter' })).toHaveText(
    'Treasury next quarter$35.0m',
  );
  // The budget totals above already give the figures that no change is moving.
  await expect(outlook(page).getByRole('group', { name: 'Balance' })).toHaveCount(0);
});

test('moving a slider shows the projected treasury before anything is committed', async ({
  page,
}) => {
  await startGame(page);
  const projected = outlook(page).getByRole('group', { name: 'Treasury next quarter' });

  await decisions(page).getByRole('slider', { name: 'Agriculture' }).fill('13');

  // Before and after, side by side, while the change is pending.
  await expect(outlook(page)).toHaveAccessibleName('If you commit this change');
  await expect(projected).toHaveText('Treasury next quarter$35.0m → $33.0m');
  await expect(outlook(page).getByRole('group', { name: 'Spending' })).toHaveText(
    'Spending$38.0m → $40.0m',
  );
  // A figure the change does not touch is not listed as affected.
  await expect(outlook(page).getByRole('group', { name: 'Revenue' })).toHaveCount(0);
  // Nothing has happened to the real treasury.
  await expect(treasury(page)).toContainText('$42.0m');

  // The projection follows the slider.
  await decisions(page).getByRole('slider', { name: 'Agriculture' }).fill('20');
  await expect(projected).toHaveText('Treasury next quarter$35.0m → $26.0m');
  await decisions(page).getByRole('slider', { name: 'Tax rate' }).fill('25');
  await expect(projected).toHaveText('Treasury next quarter$35.0m → $38.0m');
});

test('what the preview promised is what the quarter delivers', async ({ page }) => {
  await startGame(page);
  await decisions(page).getByRole('slider', { name: 'Tax rate' }).fill('25');
  await decisions(page).getByRole('slider', { name: 'Education' }).fill('9');
  await expect(outlook(page).getByRole('group', { name: 'Treasury next quarter' })).toHaveText(
    'Treasury next quarter$35.0m → $44.0m',
  );

  await decisions(page).getByRole('button', { name: 'Commit budget' }).click();
  await expect(outlook(page)).toHaveAccessibleName('Outlook at the current settings');
  await page.getByRole('banner').getByRole('button', { name: 'End quarter' }).click();

  await expect(treasury(page)).toContainText('$44.0m');
});
