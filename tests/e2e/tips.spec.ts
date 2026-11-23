import { expect, test, type Page } from '@playwright/test';
import { dilemma, endQuarters, openTab, startGame, tavaraWith } from './app';

const tipCard = (page: Page) => page.locator('.lessons__card', { hasText: 'First-time tip' });
const tipsButton = (page: Page) =>
  page.getByRole('banner').getByRole('button', { name: /^Tips (on|off)$/ });

/** Tavara with no weather or price shocks to warn of, and one dilemma, as often as it may arise. */
const quietButForTeachers = () =>
  tavaraWith({ drought: [], flood: [], dilemmas: { teachersPay: 1 } });

/** Ends quarters, answering each dilemma, until one is put to the player; returns its dialog. */
async function playToNextDilemma(page: Page) {
  const put = dilemma(page, /./);
  for (let quarter = 0; quarter < 16; quarter += 1) {
    await endQuarters(page, 1);
    if (await put.isVisible()) return put;
  }
  throw new Error('No dilemma arose in 16 quarters.');
}

/** Sees the dilemma tip on the first dilemma, dismisses it, and does not see it on the next. */
async function seeTheDilemmaTipOnce(page: Page): Promise<void> {
  await expect(tipCard(page)).toHaveCount(0);

  const first = await playToNextDilemma(page);
  await first.getByRole('button', { name: 'Decide later' }).click();
  await expect(tipCard(page).getByRole('heading', { name: 'A dilemma' })).toBeVisible();
  await tipCard(page).getByRole('button', { name: 'Got it' }).click();
  await expect(tipCard(page)).toHaveCount(0);

  // Answered, so the quarter can end and the game go on to the next dilemma.
  await page.getByRole('banner').getByRole('button', { name: 'End quarter' }).click();
  await first.getByRole('button').first().click();
  const next = await playToNextDilemma(page);
  await next.getByRole('button', { name: 'Decide later' }).click();
  await expect(tipCard(page)).toHaveCount(0);
}

test('a tip explains the first dilemma once, and not the next', async ({ page }) => {
  await startGame(page, { countryFile: quietButForTeachers(), tips: true });
  await seeTheDilemmaTipOnce(page);
});

test('research and surveys are explained the first time the player meets them', async ({
  page,
}) => {
  await startGame(page, { countryFile: quietButForTeachers(), tips: true });
  await expect(tipCard(page)).toHaveCount(0);

  await openTab(page, 'Research');
  await expect(tipCard(page).getByRole('heading', { name: 'Research' })).toBeVisible();
  await tipCard(page).getByRole('button', { name: 'Got it' }).click();
  await expect(tipCard(page)).toHaveCount(0);

  // A region that hides nothing offers no survey; one that may hide a deposit does.
  const map = page.getByRole('group', { name: 'Map of Republic of Tavara' });
  await map.getByRole('button', { name: /^Arden Vale/ }).click();
  await expect(tipCard(page)).toHaveCount(0);
  await map.getByRole('button', { name: /^Salt Coast/ }).click();
  await expect(tipCard(page).getByRole('heading', { name: 'Surveys' })).toBeVisible();
});

test('tips can be turned off, and on again to show them afresh', async ({ page }) => {
  await startGame(page, { countryFile: quietButForTeachers(), tips: true });
  await expect(tipsButton(page)).toHaveAttribute('aria-pressed', 'true');

  const put = await playToNextDilemma(page);
  await put.getByRole('button', { name: 'Decide later' }).click();
  await tipCard(page).getByRole('button', { name: 'Turn tips off' }).click();
  await expect(tipCard(page)).toHaveCount(0);
  await expect(tipsButton(page)).toHaveText('Tips off');
  await expect(tipsButton(page)).toHaveAttribute('aria-pressed', 'false');

  await tipsButton(page).click();
  await expect(tipsButton(page)).toHaveText('Tips on');
  await expect(tipCard(page).getByRole('heading', { name: 'A dilemma' })).toBeVisible();
  await tipCard(page).getByRole('button', { name: 'Got it' }).click();

  // Seen tips are remembered across a reload.
  await page.reload();
  await page.getByRole('button', { name: 'Start new game' }).click();
  await playToNextDilemma(page).then((again) =>
    again.getByRole('button', { name: 'Decide later' }).click(),
  );
  await expect(tipCard(page)).toHaveCount(0);
});

test('a browser that will not store anything still shows each tip once', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('Blocked', 'SecurityError');
    };
  });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await startGame(page, { countryFile: quietButForTeachers(), tips: true });
  await seeTheDilemmaTipOnce(page);
  expect(errors).toEqual([]);
});
