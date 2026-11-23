import { expect, test, type Locator, type Page } from '@playwright/test';
import { decisions, dilemma, endQuarters, openTab, reports, startGame, tavaraWith } from './app';

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

/** Tavara with nothing to warn of and no dilemma, so only what the player does brings a tip. */
const quiet = () => tavaraWith({ drought: [], flood: [] });
const mapOf = (page: Page) => page.getByRole('group', { name: 'Map of Republic of Tavara' });
/** The card of the region picked out on the map: one of the two that may hide a deposit. */
const regionCard = (page: Page) =>
  page.getByRole('region', { name: /^Salt Coast$|^The Dry East$/ });

test('the research tip shows once, however the player meets research again', async ({ page }) => {
  await startGame(page, { countryFile: quiet(), tips: true });
  const research = await openTab(page, 'Research');
  await expect(tipCard(page).getByRole('heading', { name: 'Research' })).toBeVisible();
  await tipCard(page).getByRole('button', { name: 'Got it' }).click();
  await expect(tipCard(page)).toHaveCount(0);

  // Its tab opened again, research planned and research under way would each bring it.
  await openTab(page, 'Budget');
  await openTab(page, 'Research');
  await expect(tipCard(page)).toHaveCount(0);
  await research.getByRole('button', { name: 'Research Drought-resistant seed' }).click();
  await expect(
    research.getByRole('button', { name: 'Cancel research into Drought-resistant seed' }),
  ).toBeVisible();
  await expect(tipCard(page)).toHaveCount(0);
  await endQuarters(page, 1);
  await expect(reports(page).getByText('Research begins: Drought-resistant seed')).toBeVisible();
  await expect(tipCard(page)).toHaveCount(0);

  // Seen once, it is not shown in the next game either.
  await page.reload();
  await page.getByRole('button', { name: 'Start new game' }).click();
  await openTab(page, 'Research');
  await expect(decisions(page).getByRole('tabpanel', { name: 'Research' })).toBeVisible();
  await expect(tipCard(page)).toHaveCount(0);
});

test('the survey tip shows once, however the player meets surveys again', async ({ page }) => {
  await startGame(page, { countryFile: quiet(), tips: true });
  await mapOf(page)
    .getByRole('button', { name: /^Salt Coast/ })
    .click();
  await expect(tipCard(page).getByRole('heading', { name: 'Surveys' })).toBeVisible();
  await tipCard(page).getByRole('button', { name: 'Got it' }).click();
  await expect(tipCard(page)).toHaveCount(0);

  // Another region that may hide a deposit, a survey planned and one under way would each
  // bring it.
  await mapOf(page)
    .getByRole('button', { name: /^The Dry East/ })
    .click();
  await expect(regionCard(page).getByRole('button', { name: 'Survey The Dry East' })).toBeVisible();
  await expect(tipCard(page)).toHaveCount(0);
  await regionCard(page).getByRole('button', { name: 'Survey The Dry East' }).click();
  await expect(
    regionCard(page).getByRole('button', { name: 'Cancel the survey of The Dry East' }),
  ).toBeVisible();
  await expect(tipCard(page)).toHaveCount(0);
  await endQuarters(page, 1);
  await expect(reports(page).getByText('Survey begins: The Dry East')).toBeVisible();
  await expect(tipCard(page)).toHaveCount(0);
});

test('Tips silences the research and survey tips, and turned on again shows both afresh', async ({
  page,
}) => {
  await startGame(page, { countryFile: quiet(), tips: true });
  const research = await openTab(page, 'Research');
  await expect(tipCard(page).getByRole('heading', { name: 'Research' })).toBeVisible();
  await tipCard(page).getByRole('button', { name: 'Turn tips off' }).click();
  await expect(tipCard(page)).toHaveCount(0);
  await expect(tipsButton(page)).toHaveText('Tips off');

  // Turned off, nothing about research or surveys brings a tip.
  await research.getByRole('button', { name: 'Research Drought-resistant seed' }).click();
  await mapOf(page)
    .getByRole('button', { name: /^Salt Coast/ })
    .click();
  await regionCard(page).getByRole('button', { name: 'Survey Salt Coast' }).click();
  await expect(
    regionCard(page).getByRole('button', { name: 'Cancel the survey of Salt Coast' }),
  ).toBeVisible();
  await expect(tipCard(page)).toHaveCount(0);

  // Turned on again, each is shown once more, in the tips' order.
  await tipsButton(page).click();
  await expect(tipsButton(page)).toHaveText('Tips on');
  await expect(tipCard(page).getByRole('heading', { name: 'Research' })).toBeVisible();
  await tipCard(page).getByRole('button', { name: 'Got it' }).click();
  await expect(tipCard(page).getByRole('heading', { name: 'Surveys' })).toBeVisible();
  await tipCard(page).getByRole('button', { name: 'Got it' }).click();
  await expect(tipCard(page)).toHaveCount(0);
});

/** Sees a tip's outline drawn round an element, and no wider than to pick it out. */
async function expectTipDrawnRound(page: Page, element: Locator): Promise<void> {
  await expect(async () => {
    const target = await element.boundingBox();
    const outline = await page.locator('.lessons__outline').boundingBox();
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

test('a tip about a panel behind another tab is drawn round the tab that opens it', async ({
  page,
}) => {
  // Tips are off as the game starts, so research is planned unexplained and its tab left.
  await startGame(page, { countryFile: quiet() });
  const research = await openTab(page, 'Research');
  await research.getByRole('button', { name: 'Research Drought-resistant seed' }).click();
  await openTab(page, 'Budget');
  await tipsButton(page).click();
  await expect(tipCard(page).getByRole('heading', { name: 'Research' })).toBeVisible();

  // The research panel is not on screen, so the tip points at its tab and leaves the budget open.
  const researchTab = decisions(page).getByRole('tab', { name: 'Research', exact: true });
  await expectTipDrawnRound(page, researchTab);
  await expect(decisions(page).getByRole('tab', { name: 'Budget', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );

  // Once its tab is opened, the tip is drawn round the panel.
  await researchTab.click();
  await expectTipDrawnRound(page, research);
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
