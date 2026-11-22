import { expect, test, type Page } from '@playwright/test';
import { LESSONS } from '../../src/ui/tourSteps';
import { decisions, dilemma, endQuarters, openApp } from './app';

/** The lesson card, which stands beside the screen without holding it. */
const lessonCard = (page: Page) => page.locator('.lessons__card');
const map = (page: Page) => page.getByRole('group', { name: 'Map of Republic of Tavara' });

async function expectLesson(page: Page, title: string): Promise<void> {
  await expect(lessonCard(page).getByRole('heading', { name: title })).toBeVisible();
  const index = LESSONS.findIndex((lesson) => lesson.title === title);
  await expect(lessonCard(page)).toContainText(`Lesson ${index + 1} of ${LESSONS.length}`);
}

/** Opens the country exactly as it ships, dilemmas and all, and starts the tutorial. */
async function startTutorial(page: Page): Promise<void> {
  await openApp(page, { asShipped: true });
  await page.getByRole('button', { name: 'Tutorial' }).click();
}

/** Plays the lessons as they ask, up to the dilemma the second quarter brings. */
async function playToTheDilemma(page: Page): Promise<void> {
  await expectLesson(page, 'Learn by doing');
  await lessonCard(page).getByRole('button', { name: 'Next' }).click();

  await expectLesson(page, 'Set the budget');
  await decisions(page).getByRole('slider', { name: 'Health' }).fill('8');
  await decisions(page).getByRole('button', { name: 'Commit budget' }).click();

  await expectLesson(page, 'Look at food');
  await expect(lessonCard(page)).toContainText('✓ Committed.');
  await page.getByRole('group', { name: 'Map lens' }).getByRole('button', { name: 'Food' }).click();

  await expectLesson(page, 'Pick out a region');
  // The outline has moved on to the part of the screen the lesson is about.
  await expect(async () => {
    const outline = await page.locator('.lessons__outline').boundingBox();
    const shown = await page.locator('[data-tour="map"]').boundingBox();
    expect(outline?.x).toBeLessThan(shown?.x ?? 0);
    expect(outline?.width).toBeGreaterThan(shown?.width ?? Infinity);
  }).toPass();
  await map(page)
    .getByRole('button', { name: /^Arden Vale,/ })
    .click();

  await expectLesson(page, 'Plan a project');
  await decisions(page).getByRole('button', { name: 'Browse projects…' }).click();
  await page
    .getByRole('dialog', { name: 'Affordable now' })
    .getByRole('button', { name: /^Plan / })
    .first()
    .click();

  await expectLesson(page, 'End the quarter');
  await expect(lessonCard(page)).toContainText('✓ Planned.');
  await endQuarters(page, 1);
}

test('the tutorial plays the first year through, a lesson at a time', async ({ page }) => {
  await startTutorial(page);
  await playToTheDilemma(page);

  // The tutorial game's second quarter brings a dilemma, which the next lesson covers.
  await expectLesson(page, 'Answer a dilemma');
  const put = page.getByRole('dialog');
  await expect(put).toBeVisible();
  await put.getByRole('button').first().click();

  for (const title of ['Read the report', 'Look ahead', 'The term', 'Borrowing']) {
    await expectLesson(page, title);
    await lessonCard(page).getByRole('button', { name: 'Next' }).click();
  }

  await expectLesson(page, 'Finish the year');
  await endQuarters(page, 3);
  await expect(page.getByRole('banner')).toContainText('Year 2 · Quarter 1');

  await expectLesson(page, 'Now and later');
  await expect(lessonCard(page)).toContainText('✓ A year in office is behind you.');
  await lessonCard(page).getByRole('button', { name: 'Finish' }).click();
  await expect(lessonCard(page)).toHaveCount(0);
});

test('a lesson can be skipped, and the tutorial ended for an ordinary game', async ({ page }) => {
  await startTutorial(page);
  await lessonCard(page).getByRole('button', { name: 'Next' }).click();
  await expectLesson(page, 'Set the budget');

  await lessonCard(page).getByRole('button', { name: 'Skip lesson' }).click();
  await expectLesson(page, 'Look at food');

  await lessonCard(page).getByRole('button', { name: 'End tutorial' }).click();
  await expect(lessonCard(page)).toHaveCount(0);
  await endQuarters(page, 1);
  await expect(page.getByRole('banner')).toContainText('Quarter 2');

  // The game is saved as any other, and comes back without the lessons.
  await page.reload();
  await page.getByRole('button', { name: 'Resume saved game' }).click();
  await expect(page.getByRole('banner')).toContainText('Quarter 2');
  await expect(lessonCard(page)).toHaveCount(0);
});

test('a reload during the tutorial picks up at the lesson it was on', async ({ page }) => {
  await startTutorial(page);
  await playToTheDilemma(page);
  await expectLesson(page, 'Answer a dilemma');

  await page.reload();
  await page.getByRole('button', { name: 'Resume saved game' }).click();
  await expectLesson(page, 'Answer a dilemma');
  await expect(dilemma(page, /./)).toBeVisible();
});
