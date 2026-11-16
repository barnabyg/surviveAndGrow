import type { Page } from '@playwright/test';

/** Opens the app and starts a new game from a fixed seed, so every run plays the same game. */
export async function startGame(page: Page, seed = 1): Promise<void> {
  await page.goto(`/?seed=${seed}`);
  await page.getByRole('button', { name: 'Start new game' }).click();
}
