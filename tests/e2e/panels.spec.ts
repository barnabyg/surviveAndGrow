import { expect, test } from '@playwright/test';
import { decisions, openTab, startGame } from './app';

test('the decisions column shows one tab at a time and remembers the one chosen', async ({
  page,
}) => {
  await startGame(page);
  const tabs = decisions(page).getByRole('tablist', { name: 'Decisions' });
  await expect(tabs.getByRole('tab')).toHaveText([
    /^Budget/,
    /^Projects/,
    /^Research/,
    /^Finance/,
    /^Trade/,
    /^Relief/,
  ]);
  await expect(decisions(page).getByRole('tabpanel', { name: 'Budget' })).toBeVisible();
  await expect(decisions(page).getByRole('slider', { name: 'Health' })).toBeVisible();

  const projects = await openTab(page, 'Projects');
  await expect(projects).toBeVisible();
  await expect(decisions(page).getByRole('slider', { name: 'Health' })).toBeHidden();

  await page.reload();
  // No quarter has ended, so there is no saved game: the tab is remembered on its own.
  await page.getByRole('button', { name: 'Start new game' }).click();
  await expect(tabs.getByRole('tab', { name: 'Projects' })).toHaveAttribute(
    'aria-selected',
    'true',
  );

  // The arrow keys move along the tabs, as in any tab list.
  await tabs.getByRole('tab', { name: 'Projects' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(tabs.getByRole('tab', { name: 'Research' })).toBeFocused();
  await expect(decisions(page).getByRole('tabpanel', { name: 'Research' })).toBeVisible();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await expect(decisions(page).getByRole('tabpanel', { name: 'Budget' })).toBeVisible();
});

test('a tab out of sight still says what is pending in it', async ({ page }) => {
  await startGame(page);
  const budgetTab = decisions(page).getByRole('tab', { name: 'Budget' });

  await decisions(page).getByRole('slider', { name: 'Health' }).fill('9');
  await openTab(page, 'Finance');

  await expect(decisions(page).getByRole('slider', { name: 'Health' })).toBeHidden();
  await expect(budgetTab).toHaveAccessibleDescription('1 uncommitted');
});

test('the quarter ahead stays in view whichever tab is open', async ({ page }) => {
  await startGame(page);
  const summary = decisions(page).getByRole('region', { name: 'Quarter ahead' });
  await expect(summary.getByRole('group', { name: 'Treasury' })).toContainText('$35.0m');
  await expect(summary.getByRole('group', { name: 'Vote share forecast' })).toBeVisible();

  await openTab(page, 'Trade');
  await expect(summary).toBeVisible();
});

test('every tab’s note can be read in full at common screen widths', async ({ page }) => {
  await startGame(page);
  const tabs = decisions(page).getByRole('tablist', { name: 'Decisions' });
  // A change not yet committed gives the budget tab its longer note.
  await decisions(page).getByRole('slider', { name: 'Health' }).fill('9');
  for (const width of [1280, 1920, 2560]) {
    await page.setViewportSize({ width, height: 900 });
    const cut = await tabs.evaluate((list) =>
      [list, ...list.querySelectorAll('.tab__title, .tab__note')]
        .filter((element) => element.scrollWidth > element.clientWidth)
        .map((element) => element.textContent),
    );
    expect(cut, `cut short at ${width} px`).toEqual([]);
  }
});
