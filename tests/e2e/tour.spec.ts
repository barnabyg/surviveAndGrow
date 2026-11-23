import { expect, test, type Locator, type Page } from '@playwright/test';
import { TOUR_STEPS } from '../../src/ui/tourSteps';
import { decisions, dilemma, startGame, tavaraWith } from './app';

const tour = (page: Page) => page.locator('dialog.tour');
const spotlight = (page: Page) => page.locator('.tour__spotlight');

/** The tour's steps in a game with no dilemma waiting, which passes the dilemma panel over. */
const shownSteps = TOUR_STEPS.filter((step) => step.target !== 'dilemma-panel');

/** The top bar's button that opens the tour. */
const tourButton = (page: Page) => page.getByRole('banner').getByRole('button', { name: 'Tour' });

/**
 * Sees the tour's outline drawn round an element, and no wider than to pick it out, once it
 * has finished moving there.
 */
async function expectOutlined(page: Page, element: Locator): Promise<void> {
  await expect(async () => {
    const target = await element.boundingBox();
    const outline = await spotlight(page).boundingBox();
    expect(target).not.toBeNull();
    expect(outline).not.toBeNull();
    if (target !== null && outline !== null) {
      expect(outline.x).toBeLessThanOrEqual(target.x);
      expect(outline.y).toBeLessThanOrEqual(target.y);
      expect(outline.x + outline.width).toBeGreaterThanOrEqual(target.x + target.width);
      expect(outline.y + outline.height).toBeGreaterThanOrEqual(target.y + target.height);
      expect(outline.width).toBeLessThan(target.width + 40);
      expect(outline.height).toBeLessThan(target.height + 40);
    }
  }).toPass();
}

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
      // The outline is drawn round the part of the screen the step is about.
      await expectOutlined(page, page.locator(`[data-tour="${step.target}"]`));
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

test('the tour opens from the top bar, works from the keyboard and shows the tab it points at', async ({
  page,
}) => {
  await startGame(page);
  const budgetTab = decisions(page).getByRole('tab', { name: 'Budget', exact: true });
  const projectsTab = decisions(page).getByRole('tab', { name: 'Projects', exact: true });
  await expect(budgetTab).toHaveAttribute('aria-selected', 'true');

  const opener = tourButton(page);
  await opener.click();
  await expect(tour(page).getByRole('heading', { name: 'Welcome to office' })).toBeVisible();

  await page.keyboard.press('ArrowRight');
  await expect(tour(page).getByRole('heading', { name: 'Vital signs' })).toBeVisible();
  await page.keyboard.press('ArrowLeft');
  await expect(tour(page).getByRole('heading', { name: 'Welcome to office' })).toBeVisible();

  // On to the projects panel, whose tab is shown while the tour points at it.
  const projectsStep = shownSteps.findIndex((step) => step.target === 'projects');
  for (let step = 0; step < projectsStep; step += 1) await page.keyboard.press('ArrowRight');
  await expect(tour(page).getByRole('heading', { name: 'Projects' })).toBeVisible();
  await expect(projectsTab).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#projects-panel')).toBeVisible();

  // Once the tour is over, the tab the player chose comes back.
  await page.keyboard.press('Escape');
  await expect(tour(page)).toHaveCount(0);
  await expect(opener).toBeFocused();
  await expect(budgetTab).toHaveAttribute('aria-selected', 'true');
});

test('the tour explains surveys on the map and research in its tab, in screen order', async ({
  page,
}) => {
  await startGame(page);
  const next = tour(page).getByRole('button', { name: 'Next' });
  const heading = (name: string) => tour(page).getByRole('heading', { name, exact: true });
  const walkTo = async (title: string) => {
    for (let step = 0; step < TOUR_STEPS.length && !(await heading(title).isVisible()); step += 1) {
      await next.click();
    }
    await expect(heading(title)).toBeVisible();
  };
  await tourButton(page).click();

  // Surveys come straight after the map they are started from, at the first magnifying glass
  // on it: Salt Coast is the first region of Tavara that may hide a deposit.
  await walkTo('The map');
  await next.click();
  await expect(heading('Surveys')).toBeVisible();
  await expect(tour(page)).toContainText('A magnifying glass marks a region that may hide');
  const map = page.getByRole('group', { name: 'Map of Republic of Tavara' });
  await expectOutlined(page, map.getByRole('img', { name: /^Salt Coast: not yet surveyed/ }));
  await next.click();
  await expect(heading('The term')).toBeVisible();

  // Research comes between the projects and the borrowing tabs, as its tab does, and the tab
  // is shown while the tour points at it.
  await walkTo('Projects');
  await next.click();
  await expect(heading('Research')).toBeVisible();
  await expect(tour(page)).toContainText('The technology tree.');
  const researchTab = decisions(page).getByRole('tab', { name: 'Research', exact: true });
  await expect(researchTab).toHaveAttribute('aria-selected', 'true');
  await expectOutlined(page, page.locator('#research-panel'));
  await expect(page.locator('#research-panel')).toContainText('Drought-resistant seed');
  await next.click();
  await expect(heading('Borrowing')).toBeVisible();
});

test('the tour passes surveys over where no region is left to survey', async ({ page }) => {
  await startGame(page, { countryFile: { ...tavaraWith({}), deposits: [] } });
  await tourButton(page).click();

  // Neither the dilemma panel nor a magnifying glass is on screen.
  await expect(tour(page)).toContainText(`1 of ${TOUR_STEPS.length - 2}`);
  const mapStep = shownSteps.findIndex((step) => step.target === 'map');
  for (let step = 0; step < mapStep; step += 1) await page.keyboard.press('ArrowRight');
  await expect(tour(page).getByRole('heading', { name: 'The map' })).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(tour(page).getByRole('heading', { name: 'The term' })).toBeVisible();
});

test('the tour points at a dilemma waiting to be answered', async ({ page }) => {
  await startGame(page, { countryFile: tavaraWith({ drought: [], dilemmas: { teachersPay: 1 } }) });
  await page.getByRole('banner').getByRole('button', { name: 'End quarter' }).click();
  const teachers = dilemma(page, 'Teachers demand a pay rise');
  await teachers.getByRole('button', { name: /later/i }).click();

  await tourButton(page).click();
  await expect(tour(page)).toContainText(`1 of ${TOUR_STEPS.length}`);
});
