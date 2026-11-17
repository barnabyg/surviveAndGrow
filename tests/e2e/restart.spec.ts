import { expect, test, type Page } from '@playwright/test';
import { endQuarters, startGame, treasury } from './app';

const date = (page: Page) => page.getByRole('banner').getByText(/^Year \d+ · Quarter \d/);
const restart = (page: Page) => page.getByRole('banner').getByRole('button', { name: 'Restart' });
const restartDialog = (page: Page) => page.getByRole('dialog', { name: 'Restart this game?' });

test('restarting mid-game asks first, and keeping on plays on unchanged', async ({ page }) => {
  await startGame(page);
  await endQuarters(page, 1);

  await restart(page).click();
  await restartDialog(page).getByRole('button', { name: 'Keep playing' }).click();

  await expect(restartDialog(page)).toBeHidden();
  await expect(date(page)).toHaveText('Year 1 · Quarter 2 · Planting season');
});

test('replaying mid-game starts the same game again and forgets the abandoned save', async ({
  page,
}) => {
  await startGame(page, { seed: 7 });
  await endQuarters(page, 2);

  await restart(page).click();
  await restartDialog(page).getByRole('button', { name: 'Replay this game' }).click();

  await expect(date(page)).toHaveText('Year 1 · Quarter 1 · Dry season');
  await expect(treasury(page)).toContainText('Opening position');
  await expect(page).toHaveURL(/[?&]seed=7(&|$)/);

  // Reloading does not bring back the game that was given up.
  await page.reload();
  await expect(page.getByRole('region', { name: 'Saved game' })).toHaveCount(0);
});

test('a new game mid-game goes back to the start screen with no saved game', async ({ page }) => {
  await startGame(page);
  await endQuarters(page, 1);

  await restart(page).click();
  await restartDialog(page).getByRole('button', { name: 'New game' }).click();

  await expect(page.getByRole('button', { name: 'Start new game' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Saved game' })).toHaveCount(0);
  await expect(page).not.toHaveURL(/[?&]seed=/);
});
