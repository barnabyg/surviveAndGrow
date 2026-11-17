import { expect, test } from '@playwright/test';
import { endQuarters, situation, startGame, tavaraWith } from './app';

test('a region’s people grow each quarter, and its card says by how many', async ({ page }) => {
  await startGame(page, { countryFile: tavaraWith({ drought: [], growing: true }) });
  await endQuarters(page, 1);

  await situation(page)
    .getByRole('region', { name: 'Regions' })
    .getByRole('button', { name: /Lowmere Plains/ })
    .click();

  const card = page.getByRole('region', { name: 'Lowmere Plains' });
  // 0.3% of 1,400,000 people.
  await expect(card).toContainText('1,404,200');
  await expect(card).toContainText('Grew last quarter+4,200');
});
