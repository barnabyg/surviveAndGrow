import { expect, test, type Page } from '@playwright/test';
import {
  advanceQuarter,
  createGame,
  loadCountry,
  onTechnology,
  saveGame,
  siteTerms,
  technologyTerms,
  TECHNOLOGY_DEFINITIONS,
  type GameState,
  type Technology,
  type TurnReport,
} from '../../src/sim';
import { endQuarters, openApp, openTab, reports, situation, tavaraWith } from './app';

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

/** Every technology hydropower needs, directly or through others. */
function prerequisitesOf(technology: Technology): Technology[] {
  return [
    ...new Set(
      TECHNOLOGY_DEFINITIONS[technology].prerequisites.flatMap((needed) => [
        ...prerequisitesOf(needed),
        needed,
      ]),
    ),
  ];
}

/**
 * A game a quarter in, with every technology hydropower needs known and a treasury that
 * covers a dam, so hydropower can be researched next.
 */
function readyForHydropower(file: unknown): { game: GameState; report: TurnReport } {
  const start = createGame(loadCountry(file), 1);
  const { state, report } = advanceQuarter(start, { budget: start.budget });
  const known = prerequisitesOf('hydropower').map((technology) => ({
    target: onTechnology(technology),
    began: state.date,
    quartersPaid: technologyTerms(technology).researchQuarters,
    status: 'known' as const,
    opened: state.date,
  }));
  return { game: { ...state, treasury: 2000, projects: known }, report };
}

test('a locked dam names the research it needs, and can be built once it is done', async ({
  page,
}) => {
  const countryFile = tavaraWith({ drought: [] });
  const { game, report } = readyForHydropower(countryFile);
  await prepare(page, saveGame(game, report));
  await openApp(page, { countryFile });
  await page.getByRole('button', { name: 'Resume saved game' }).click();

  // The map marks the dam locked, and its legend says what the mark means.
  const map = page.getByRole('group', { name: 'Map of Republic of Tavara' });
  await expect(page.getByRole('list', { name: 'Map legend' })).toContainText(
    'Locked: research must unlock it first',
  );
  const damMark = map.getByRole('button', { name: /^Korr Falls dam/ });
  await expect(damMark).toHaveAccessibleName(/locked, needs Hydropower researched first/);

  // Its card names the research and says what the dam would do, and offers no building.
  await damMark.click();
  const card = page.getByRole('region', { name: 'Korr Falls dam' });
  await expect(card.getByRole('status', { name: 'Locked' })).toContainText(
    'Locked: Hydropower must be researched first',
  );
  await expect(card).toContainText('move its region’s harvest 40% less');
  await expect(card).toContainText('Powers each region a power line links to it');
  await expect(card.getByRole('button', { name: 'Start building' })).toHaveCount(0);
  await card.getByRole('button', { name: 'Close' }).click();

  // The projects tab counts it, with the clinics and schools locked as it is, apart from what
  // can be afforded.
  await expect(await openTab(page, 'Projects')).toContainText(
    '5 locked until research unlocks them',
  );

  // The research tab says hydropower unlocks it.
  const hydropower = (await openTab(page, 'Research')).getByRole('group', { name: 'Hydropower' });
  const unlocks = hydropower.getByRole('region', { name: 'What Hydropower unlocks in this game' });
  await expect(unlocks).toContainText('In this game it would unlock');
  await expect(unlocks).toContainText('Korr Falls dam, in Korr Highlands');
  await expect(hydropower).toContainText('Unlocks dams.');
  await hydropower.getByRole('button', { name: 'Research Hydropower' }).click();
  await endQuarters(page, technologyTerms('hydropower').researchQuarters);
  await expect(reports(page).getByText('Research finished: Hydropower')).toBeVisible();

  // Now it is an empty site like any other, and can be planned.
  await map.getByRole('button', { name: /^Korr Falls dam/ }).click();
  const unlocked = page.getByRole('region', { name: 'Korr Falls dam' });
  await expect(unlocked.getByRole('status', { name: 'Locked' })).toHaveCount(0);
  await expect(unlocked).toContainText('Starting it closes Korr Falls power station for good');
  await unlocked.getByRole('button', { name: 'Start building' }).click();
  await expect(unlocked.getByRole('button', { name: 'Cancel building' })).toBeVisible();
  await unlocked.getByRole('button', { name: 'Close' }).click();

  // Built with the line to Korrgate, it powers the Korr Highlands and steadies their harvest,
  // and the region's breakdowns say both.
  const line = 'Power line, Korr Falls to Korrgate';
  await map.getByRole('button', { name: new RegExp(`^${line}`) }).click();
  await page
    .getByRole('region', { name: line })
    .getByRole('button', { name: 'Start building' })
    .click();
  // In use from the quarter after its last instalment.
  await endQuarters(page, siteTerms('dam').buildQuarters + 1);
  await situation(page)
    .getByRole('region', { name: 'Regions' })
    .getByRole('button', { name: /Korr Highlands/ })
    .click();
  const region = page.getByRole('region', { name: 'Korr Highlands' });
  await expect(
    region.getByRole('table', { name: 'Output a quarter' }).getByRole('row', {
      name: /^Power from Korr Falls dam \$/,
    }),
  ).toBeVisible();
  const hold = region.getByRole('table', { name: 'How much less the weather moves its harvest' });
  await expect(hold.getByRole('row', { name: 'Korr Falls dam' })).toContainText('40%');
  await expect(hold.getByRole('row', { name: 'Drought-resistant seed' })).toContainText('30%');
  await expect(hold.getByRole('row', { name: 'Together' })).toContainText('58%');
});
