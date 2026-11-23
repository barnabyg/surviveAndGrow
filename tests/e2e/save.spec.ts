import { expect, test, type Page } from '@playwright/test';
import {
  approval,
  decisions,
  endQuarters,
  foodReserve,
  openApp,
  reports,
  startGame,
  tavaraWith,
  treasury,
  openTab,
} from './app';

const map = (page: Page) => page.getByRole('group', { name: 'Map of Republic of Tavara' });
const savedGame = (page: Page) => page.getByRole('region', { name: 'Saved game' });
const resume = (page: Page) => page.getByRole('button', { name: 'Resume saved game' });
const startNew = (page: Page) => page.getByRole('button', { name: 'Start new game' });
const date = (page: Page) => page.getByRole('banner').getByText(/^Year \d+ · Quarter \d/);

/**
 * Every saved game in the browser's storage, as text, by the key it is kept under. Storage
 * holds other things too, such as which panels are collapsed, which are not saves.
 */
async function storedSaves(page: Page): Promise<Record<string, string>> {
  return page.evaluate(() =>
    Object.fromEntries(
      Object.entries(window.localStorage).filter(([key]) =>
        key.startsWith('survive-and-grow/save/'),
      ),
    ),
  );
}

/** Plays two quarters with a project begun, relief directed and a budget change committed. */
async function playTwoQuarters(page: Page): Promise<void> {
  await map(page)
    .getByRole('button', { name: /^Lowmere irrigation/ })
    .click();
  await page
    .getByRole('region', { name: 'Lowmere irrigation' })
    .getByRole('button', { name: 'Start building' })
    .click();
  await (await openTab(page, 'Relief')).getByLabel('Send food relief to').selectOption('dry-east');
  await openTab(page, 'Budget');
  await decisions(page).getByRole('slider', { name: 'Health' }).fill('9');
  await decisions(page).getByRole('button', { name: 'Commit budget' }).click();
  await endQuarters(page, 2);
}

test('a new player is offered no saved game', async ({ page }) => {
  await openApp(page);

  await expect(startNew(page)).toBeVisible();
  await expect(resume(page)).toHaveCount(0);
  await expect(savedGame(page)).toHaveCount(0);
});

test('a game is saved as each quarter ends and resumed after the page is reloaded', async ({
  page,
}) => {
  await startGame(page);
  expect(await storedSaves(page)).toEqual({});

  await playTwoQuarters(page);
  await expect(date(page)).toHaveText('Year 1 · Quarter 3 · Growing season');
  // A change left on the sliders is not part of the save.
  await decisions(page).getByRole('slider', { name: 'Tax rate' }).fill('35');
  const figures = {
    treasury: await treasury(page).innerText(),
    food: await foodReserve(page).innerText(),
    approval: await approval(page).innerText(),
    reports: await reports(page).innerText(),
  };

  await page.reload();

  await expect(savedGame(page)).toContainText('Republic of Tavara, Year 1, Quarter 3');
  await resume(page).click();

  // The same date, the same figures with what moved them, and the same reports.
  await expect(date(page)).toHaveText('Year 1 · Quarter 3 · Growing season');
  expect(await treasury(page).innerText()).toBe(figures.treasury);
  expect(await foodReserve(page).innerText()).toBe(figures.food);
  expect(await approval(page).innerText()).toBe(figures.approval);
  expect(await reports(page).innerText()).toBe(figures.reports);
  await expect(treasury(page)).toContainText('this quarter');

  // The project is still being built, relief still goes where it was sent, and the budget
  // is the one last committed.
  await expect(map(page).getByRole('button', { name: /^Lowmere irrigation/ })).toHaveAccessibleName(
    'Lowmere irrigation, irrigation scheme, under construction, 2 of 3 quarters built',
  );
  await expect((await openTab(page, 'Relief')).getByLabel('Send food relief to')).toHaveValue(
    'dry-east',
  );
  await openTab(page, 'Budget');
  await expect(decisions(page).getByRole('slider', { name: 'Health' })).toHaveValue('9');
  await expect(decisions(page).getByRole('slider', { name: 'Tax rate' })).toHaveValue('18');
  await expect(decisions(page).getByText('not committed')).toHaveCount(0);

  // It plays on from there.
  await endQuarters(page, 1);
  await expect(date(page)).toHaveText('Year 1 · Quarter 4 · Harvest season');
  await expect(reports(page).getByText('Finished: Lowmere irrigation')).toBeVisible();
});

test('starting a new game in place of a saved one begins afresh and then replaces it', async ({
  page,
}) => {
  await startGame(page);
  await playTwoQuarters(page);
  const kept = await storedSaves(page);

  await page.reload();
  await expect(savedGame(page)).toContainText(
    'Starting a new game replaces it when the new game’s first quarter ends.',
  );
  await startNew(page).click();

  await expect(date(page)).toHaveText('Year 1 · Quarter 1 · Dry season');
  await expect(treasury(page)).toContainText('$42.0m');
  await expect(treasury(page)).toContainText('Opening position');
  // Nothing is replaced until the new game has something to save.
  expect(await storedSaves(page)).toEqual(kept);

  await endQuarters(page, 1);
  expect(await storedSaves(page)).not.toEqual(kept);
  await page.reload();
  await expect(savedGame(page)).toContainText('Republic of Tavara, Year 1, Quarter 2');
});

test('a finished game is saved and opens again on how it ended', async ({ page }) => {
  await startGame(page, { countryFile: tavaraWith({ drought: ['dry-east'] }) });
  // Left alone, the drought ends the game in famine when the eighth quarter is resolved.
  await endQuarters(page, 8);
  await expect(page.getByRole('dialog', { name: 'The state has collapsed' })).toBeVisible();

  await page.reload();
  await expect(savedGame(page)).toContainText('The state has collapsed');
  await resume(page).click();

  await expect(page.getByRole('dialog', { name: 'The state has collapsed' })).toBeVisible();
});

test('a save from a newer release is refused, left untouched and never written over', async ({
  page,
}) => {
  await startGame(page);
  await playTwoQuarters(page);
  // The save as a later release of the game would have stamped it.
  await page.evaluate(() => {
    for (const [key, text] of Object.entries(window.localStorage)) {
      if (!key.startsWith('survive-and-grow/save/')) continue;
      const save = JSON.parse(text as string) as { formatVersion: number };
      window.localStorage.setItem(key, JSON.stringify({ ...save, formatVersion: 12 }));
    }
  });
  const newer = await storedSaves(page);

  await page.reload();

  await expect(savedGame(page)).toContainText(
    'The saved game was written by a newer release of the game (save format 12; this release reads format 11). Open it with that release.',
  );
  await expect(savedGame(page)).toContainText('It has been left as it is');
  await expect(resume(page)).toHaveCount(0);

  // A new game can still be played, but it is not saved over the one that was refused.
  await startNew(page).click();
  await expect(page.getByRole('status')).toContainText('This game is not being saved');
  await endQuarters(page, 2);
  await expect(date(page)).toHaveText('Year 1 · Quarter 3 · Growing season');
  expect(await storedSaves(page)).toEqual(newer);

  await page.reload();
  await expect(savedGame(page)).toContainText('written by a newer release');
  expect(await storedSaves(page)).toEqual(newer);
});

test('a refused save is discarded only when the player says so, and saving then resumes', async ({
  page,
}) => {
  await startGame(page);
  await endQuarters(page, 1);
  await page.evaluate(() => {
    for (const key of Object.keys(window.localStorage)) {
      window.localStorage.setItem(key, 'not a saved game');
    }
  });
  const damaged = await storedSaves(page);
  await page.reload();
  await expect(savedGame(page)).toContainText(
    'The saved game is damaged and cannot be opened: it is not a saved game.',
  );

  await savedGame(page).getByRole('button', { name: 'Discard the saved game' }).click();
  const question = page.getByRole('dialog', { name: 'Discard the saved game?' });
  await question.getByRole('button', { name: 'Keep it' }).click();
  expect(await storedSaves(page)).toEqual(damaged);

  await savedGame(page).getByRole('button', { name: 'Discard the saved game' }).click();
  await question.getByRole('button', { name: 'Discard it' }).click();
  await expect(savedGame(page)).toHaveCount(0);
  expect(await storedSaves(page)).toEqual({});

  await startNew(page).click();
  await endQuarters(page, 1);
  await page.reload();
  await expect(savedGame(page)).toContainText('Republic of Tavara, Year 1, Quarter 2');
});

test('a game that cannot be stored says so and plays on', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
    };
  });
  await startGame(page);

  await endQuarters(page, 2);

  await expect(page.getByRole('status')).toContainText('The game could not be saved');
  await expect(date(page)).toHaveText('Year 1 · Quarter 3 · Growing season');
});

test('the country built into the game and one served beside it keep separate saves', async ({
  page,
}) => {
  // A country file under test, played for two quarters.
  await startGame(page);
  await endQuarters(page, 2);

  // The built-in country knows nothing of that game, and is saved under a key of its own.
  await openApp(page, { asShipped: true });
  await expect(savedGame(page)).toHaveCount(0);
  await startNew(page).click();
  await endQuarters(page, 1);
  expect(Object.keys(await storedSaves(page))).toHaveLength(2);

  // Each is offered its own game.
  await page.reload();
  await expect(savedGame(page)).toContainText('Year 1, Quarter 2');
  await openApp(page);
  await expect(savedGame(page)).toContainText('Year 1, Quarter 3');
});

test('a seed in the address names the next new game and leaves a saved game on offer', async ({
  page,
}) => {
  await startGame(page, { seed: 5 });
  await endQuarters(page, 1);

  await openApp(page, { seed: 6 });

  await expect(resume(page)).toBeVisible();
  await expect(startNew(page)).toBeVisible();
});
