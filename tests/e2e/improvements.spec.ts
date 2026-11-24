import { expect, test, type Page } from '@playwright/test';
import {
  advanceQuarter,
  createGame,
  loadCountry,
  onTechnology,
  saveGame,
  siteStatus,
  technologyTerms,
  type GameState,
  type TurnReport,
} from '../../src/sim';
import { endQuarters, openApp, openTab, reports, tavaraWith } from './app';

/** Where the game on the country file served under test is kept in the browser. */
const SAVE_KEY = 'survive-and-grow/save/file/countries/under-test.json';

/** Puts a prepared game in the browser's storage before the page loads, once. */
async function prepare(page: Page, save: unknown): Promise<void> {
  await page.addInitScript(
    ([key, text]) => {
      if (window.localStorage.getItem(key) === null) window.localStorage.setItem(key, text);
    },
    [SAVE_KEY, JSON.stringify(save)] as const,
  );
}

/**
 * A game played in the simulation until the Lowmere grain store is in use, with
 * drought-resistant seed known, so cold storage can be researched next.
 */
function storeBuiltSeedKnown(file: unknown): { game: GameState; report: TurnReport } {
  const start = createGame(loadCountry(file), 1);
  // $2.0m less on food relief, which no one here needs, so that the treasury sees the
  // research through.
  const budget = {
    ...start.budget,
    spending: { ...start.budget.spending, foodRelief: start.budget.spending.foodRelief - 20 },
  };
  let { state: game, report }: { state: GameState; report: TurnReport } = advanceQuarter(start, {
    budget,
    startProjects: ['lowmere-store'],
  });
  while (siteStatus(game, 'lowmere-store').state !== 'operating') {
    ({ state: game, report } = advanceQuarter(game, { budget: game.budget }));
  }
  const seed = 'droughtResistantSeed';
  const known = {
    target: onTechnology(seed),
    began: game.date,
    quartersPaid: technologyTerms(seed).researchQuarters,
    status: 'known' as const,
    opened: game.date,
  };
  return { game: { ...game, projects: [...game.projects, known] }, report };
}

test('researching cold storage improves the grain store in use, and its card names it', async ({
  page,
}) => {
  const countryFile = tavaraWith({ drought: [] });
  const { game, report } = storeBuiltSeedKnown(countryFile);
  await prepare(page, saveGame(game, report));
  await openApp(page, { countryFile });
  await page.getByRole('button', { name: 'Resume saved game' }).click();

  const map = page.getByRole('group', { name: 'Map of Republic of Tavara' });
  const storeCard = async () => {
    await map.getByRole('button', { name: /^Lowmere grain store/ }).click();
    return page.getByRole('region', { name: 'Lowmere grain store' });
  };
  await expect(await storeCard()).toContainText(
    '25% less of the national reserve spoils each quarter.',
  );
  await (await storeCard()).getByRole('button', { name: 'Close' }).click();

  // The research tab says what cold storage would improve in this game, and by how much.
  const coldStorage = (await openTab(page, 'Research')).getByRole('group', {
    name: 'Cold storage',
  });
  const gains = coldStorage.getByRole('region', {
    name: 'What Cold storage improves in this game',
  });
  await expect(gains).toContainText('In this game it would improve');
  await expect(gains).toContainText(
    'Lowmere grain store: 40% (25% now) less of the national reserve spoils each quarter.',
  );
  // Grid efficiency is not yet researchable, and no power station is in use for it to improve.
  await expect(
    (await openTab(page, 'Research')).getByRole('group', { name: 'Grid efficiency' }),
  ).toContainText(
    'No power station, power line or dam is in use yet, so it improves nothing until one is built.',
  );

  await coldStorage.getByRole('button', { name: 'Research Cold storage' }).click();
  await endQuarters(page, 3);
  await expect(reports(page).getByText('Research finished: Cold storage')).toBeVisible();

  // The site card's figure moves, and names the technology behind it.
  await expect(await storeCard()).toContainText(
    '40% (25% without Cold storage) less of the national reserve spoils each quarter.',
  );
});
