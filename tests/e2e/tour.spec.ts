import { expect, test, type Page } from '@playwright/test';
import { TOUR_STEPS } from '../../src/ui/tourSteps';
import { decisions, dilemma, startGame, tavaraWith } from './app';

const tour = (page: Page) => page.locator('dialog.tour');
const spotlight = (page: Page) => page.locator('.tour__spotlight');

/** The tour's steps in a game with no dilemma waiting, which passes the dilemma panel over. */
const shownSteps = TOUR_STEPS.filter((step) => step.target !== 'dilemma-panel');

/** The top bar's button that opens the tour. */
const tourButton = (page: Page) => page.getByRole('banner').getByRole('button', { name: 'Tour' });

test('the tour walks the whole screen, a step at a time', async ({ page }) => {
  await startGame(page);
  await tourButton(page).click();

  const total = shownSteps.length;
  for (const [index, step] of shownSteps.entries()) {
    await expect(tour(page).getByRole('heading', { name: step.title })).toBeVisible();
    await expect(tour(page)).toContainText(`${index + 1} of ${total}`);
    if (step.target === null) {
      await expect(spotlight(page)).toHaveCount(0);
    } else {
      // The outline is drawn round the part of the screen the step is about, once it has
      // finished moving there.
      await expect(async () => {
        const target = await page.locator(`[data-tour="${step.target}"]`).boundingBox();
        const outline = await spotlight(page).boundingBox();
        expect(target).not.toBeNull();
        expect(outline).not.toBeNull();
        if (target !== null && outline !== null) {
          expect(outline.x).toBeLessThanOrEqual(target.x);
          expect(outline.y).toBeLessThanOrEqual(target.y);
          expect(outline.x + outline.width).toBeGreaterThanOrEqual(target.x + target.width);
          expect(outline.y + outline.height).toBeGreaterThanOrEqual(target.y + target.height);
        }
      }).toPass();
    }
    const back = tour(page).getByRole('button', { name: 'Back' });
    if (index === 0) await expect(back).toBeDisabled();
    else await expect(back).toBeEnabled();
    await tour(page)
      .getByRole('button', { name: index === total - 1 ? 'Finish' : 'Next' })
      .click();
  }

  // The tour leaves an ordinary game in play.
  await expect(tour(page)).toHaveCount(0);
  await expect(page.getByRole('banner')).toContainText('Year 1 · Quarter 1');
  await expect(page.getByRole('banner').getByRole('button', { name: 'End quarter' })).toBeEnabled();
});

test('the tour opens from the top bar, works from the keyboard and opens a collapsed panel', async ({
  page,
}) => {
  await startGame(page);
  const projects = decisions(page).getByRole('region', { name: 'Projects' });
  await projects.getByRole('button', { name: 'Projects', exact: true }).click();
  await expect(page.locator('#projects-body')).toBeHidden();

  const opener = tourButton(page);
  await opener.click();
  await expect(tour(page).getByRole('heading', { name: 'Welcome to office' })).toBeVisible();

  await page.keyboard.press('ArrowRight');
  await expect(tour(page).getByRole('heading', { name: 'Vital signs' })).toBeVisible();
  await page.keyboard.press('ArrowLeft');
  await expect(tour(page).getByRole('heading', { name: 'Welcome to office' })).toBeVisible();

  // On to the projects panel, which opens while the tour points at it.
  const projectsStep = shownSteps.findIndex((step) => step.target === 'projects');
  for (let step = 0; step < projectsStep; step += 1) await page.keyboard.press('ArrowRight');
  await expect(tour(page).getByRole('heading', { name: 'Projects' })).toBeVisible();
  await expect(page.locator('#projects-body')).toBeVisible();

  // It closes again when the tour moves on: the player's choice is kept.
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#projects-body')).toBeHidden();

  await page.keyboard.press('Escape');
  await expect(tour(page)).toHaveCount(0);
  await expect(opener).toBeFocused();
});

test('the tour points at a dilemma waiting to be answered', async ({ page }) => {
  await startGame(page, { countryFile: tavaraWith({ drought: [], dilemmas: { teachersPay: 1 } }) });
  await page.getByRole('banner').getByRole('button', { name: 'End quarter' }).click();
  const teachers = dilemma(page, 'Teachers demand a pay rise');
  await teachers.getByRole('button', { name: /later/i }).click();

  await tourButton(page).click();
  await expect(tour(page)).toContainText(`1 of ${TOUR_STEPS.length}`);
});
