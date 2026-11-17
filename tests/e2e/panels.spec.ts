import { expect, test } from '@playwright/test';
import { decisions, startGame } from './app';

test('a decision panel collapses to its heading and stays collapsed after a reload', async ({
  page,
}) => {
  await startGame(page);
  const projects = decisions(page).getByRole('region', { name: 'Projects' });
  const toggle = projects.getByRole('button', { name: 'Projects', exact: true });
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(projects.getByText('Affordable now')).toBeVisible();

  await toggle.click();

  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(projects.getByText('Affordable now')).toBeHidden();
  // The heading keeps its summary, so a collapsed panel still says where it stands.
  await expect(projects).toContainText('None underway');

  await page.reload();
  // No quarter has ended, so there is no saved game: the panel is remembered on its own.
  await page.getByRole('button', { name: 'Start new game' }).click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');

  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(projects.getByText('Affordable now')).toBeVisible();
});

test('a collapsed budget still says when changes are not committed', async ({ page }) => {
  await startGame(page);
  const budget = decisions(page).getByRole('region', { name: 'Budget' });

  await decisions(page).getByRole('slider', { name: 'Health' }).fill('9');
  await budget.getByRole('button', { name: 'Budget', exact: true }).click();

  await expect(decisions(page).getByRole('slider', { name: 'Health' })).toBeHidden();
  await expect(budget).toContainText('1 change not committed');
});
