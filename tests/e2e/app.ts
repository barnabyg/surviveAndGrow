import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, type Locator, type Page } from '@playwright/test';

interface CountryFile extends Record<string, unknown> {
  formatVersion: number;
  regions: { id: string; eventLikelihood?: Record<string, number>; populationGrowth?: number }[];
  dilemmaLikelihood?: Record<string, number>;
}

function read(...file: string[]): CountryFile {
  return JSON.parse(readFileSync(path.join(import.meta.dirname, ...file), 'utf8')) as CountryFile;
}

/**
 * A country file whose people do not grow in number, unless the test asks for growth.
 * Growth moves every figure worked out per head, so a test meets it only when it is about it.
 * Saying so needs format 2 of the country file.
 */
function holdingPopulation(country: CountryFile, growing = false): CountryFile {
  if (growing) return country;
  country.formatVersion = Math.max(country.formatVersion, 2);
  for (const region of country.regions) region.populationGrowth = 0;
  return country;
}

/**
 * The crude second country as its author wrote it, except that no dilemma arises in it and
 * its people do not grow. A dilemma stops the game until it is answered, so a test meets one
 * only when it asks for it.
 */
export function testlandFile(): Record<string, unknown> {
  return { ...holdingPopulation(read('..', 'countries', 'testland.json')), dilemmaLikelihood: {} };
}

/**
 * Tavara as it ships, with its people not growing and chance pinned down where the test
 * says: drought, and flood, strike the named regions every year and no other region ever,
 * and each dilemma named arises with the chance given, each quarter that it can, and no other
 * dilemma ever. Events left unsaid stay as the country file has them; once either is named,
 * the other strikes nowhere unless it is named too. Each world price shock named is announced
 * with the chance given, each quarter that it can be, and no other ever.
 */
export function tavaraWith(chances: {
  readonly drought?: readonly string[];
  readonly flood?: readonly string[];
  readonly dilemmas?: Record<string, number>;
  readonly shocks?: Record<string, number>;
  /** Whether its people grow in number, as they do in the country that ships. */
  readonly growing?: boolean;
}): CountryFile {
  const country = holdingPopulation(
    read('..', '..', 'src', 'countries', 'tavara.json'),
    chances.growing,
  );
  const { drought, flood } = chances;
  if (drought !== undefined || flood !== undefined) {
    for (const region of country.regions) {
      region.eventLikelihood = {
        drought: drought?.includes(region.id) === true ? 1 : 0,
        flood: flood?.includes(region.id) === true ? 1 : 0,
      };
    }
  }
  country.dilemmaLikelihood = chances.dilemmas ?? {};
  country.priceShockLikelihood = chances.shocks ?? {};
  return country;
}

/**
 * Tavara with no drought and every region producing six times as much, which leaves its
 * prosperity just short of Developing: a quarter of generous health and education spending
 * passes it.
 */
export function tavaraPoisedBelowDeveloping(): CountryFile {
  const country = tavaraWith({ drought: [] }) as CountryFile & { regions: { output: number }[] };
  for (const region of country.regions) region.output = Math.round(region.output * 60) / 10;
  return country;
}

/**
 * Tavara with no drought, a tenth of its people, $2.0m a quarter on each of health and
 * education, and a treasury of $200.0m: it starts in Prosperous, the tier the game is won
 * in, and stays there. A year's revenue at its budget is $124.0m.
 */
export function tavaraProsperous(): CountryFile {
  const country = tavaraWith({ drought: [] }) as CountryFile & {
    regions: { population: number }[];
    start: { treasury: number; budget: { spending: Record<string, number> } };
  };
  for (const region of country.regions) region.population = Math.round(region.population / 10);
  country.start.treasury = 2000;
  country.start.budget.spending.health = 20;
  country.start.budget.spending.education = 20;
  return country;
}

/**
 * Tavara as it ships, except that drought strikes the named regions every year and no
 * other region ever, and no dilemma arises.
 */
export function tavaraWithDroughtIn(regionIds: readonly string[]): CountryFile {
  return tavaraWith({ drought: regionIds });
}

interface StartOptions {
  /** A fixed seed, so every run plays the same game. */
  readonly seed?: number;
  /** A country file to play in place of the one that ships, as if an author were serving it. */
  readonly countryFile?: unknown;
  /**
   * Play the country built into the game exactly as it ships, dilemmas and all. Left out,
   * and with no country file given, the game is served Tavara without its dilemmas.
   */
  readonly asShipped?: boolean;
  /**
   * Show the first-time tips, as a new player sees them. Left out, they are turned off: a tip's
   * card stands beside the screen and could cover what a test means to click.
   */
  readonly tips?: boolean;
}

/** Opens the app, which loads the country and offers to start a game. */
export async function openApp(page: Page, options: StartOptions = {}) {
  const { seed = 1, asShipped = false, tips = false } = options;
  if (!tips) {
    await page.addInitScript(() => {
      window.localStorage.setItem('survive-and-grow/tips-off', 'true');
    });
  }
  if (asShipped) {
    await page.goto(`/?seed=${seed}`);
    return;
  }
  const countryFile = options.countryFile ?? tavaraWith({});
  await page.route(
    (url) => url.pathname === '/countries/under-test.json',
    (route) => route.fulfill({ json: countryFile }),
  );
  await page.goto(`/?seed=${seed}&country=/countries/under-test.json`);
}

/** Opens the app and starts a new game. */
export async function startGame(page: Page, options: StartOptions = {}): Promise<void> {
  await openApp(page, options);
  await page.getByRole('button', { name: 'Start new game' }).click();
}

/** The parts of the main screen, as the player finds them. */
export const situation = (page: Page): Locator =>
  page.getByRole('complementary', { name: 'Situation' });
export const decisions = (page: Page): Locator =>
  page.getByRole('complementary', { name: 'Decisions' });
export const treasury = (page: Page): Locator =>
  page.getByRole('banner').getByRole('group', { name: 'Treasury' });
export const debt = (page: Page): Locator =>
  page.getByRole('banner').getByRole('group', { name: 'Debt' });
export const foodReserve = (page: Page): Locator =>
  page.getByRole('banner').getByRole('group', { name: 'Food reserve' });
export const approval = (page: Page): Locator =>
  page.getByRole('banner').getByRole('group', { name: 'Approval' });
export const prosperity = (page: Page): Locator =>
  page.getByRole('banner').getByRole('group', { name: 'Prosperity' });
/** This quarter's reports, in the left column. */
export const reports = (page: Page): Locator =>
  situation(page).getByRole('region', { name: 'This quarter' });
/** The dilemma put to the player, while it is open. */
export const dilemma = (page: Page, title: string | RegExp): Locator =>
  page.getByRole('dialog', { name: title });
/** The dangers of the coming quarters, in the left column. */
export const risks = (page: Page): Locator =>
  situation(page).getByRole('region', { name: 'Risks ahead' });
/** The projection card in the budget panel, whichever of its two headings it carries. */
export const outlook = (page: Page): Locator =>
  decisions(page).getByRole('region', { name: /Outlook|If you commit/ });

/** Ends the given number of quarters, one click each. */
export async function endQuarters(page: Page, count: number): Promise<void> {
  for (let quarter = 0; quarter < count; quarter += 1) {
    await page.getByRole('banner').getByRole('button', { name: 'End quarter' }).click();
  }
}

/** The decision tabs, by name: Budget, Projects, Finance, Trade and Relief. */
export type DecisionTabName = 'Budget' | 'Projects' | 'Research' | 'Finance' | 'Trade' | 'Relief';

/** Opens one of the decision tabs, as the player would, and gives its panel. */
export async function openTab(page: Page, name: DecisionTabName): Promise<Locator> {
  await decisions(page).getByRole('tab', { name, exact: true }).click();
  return decisions(page).getByRole('tabpanel', { name, exact: true });
}

/** Opens the catalogue of projects the treasury can cover now, from the projects tab. */
export async function openCatalogue(page: Page): Promise<Locator> {
  const projects = await openTab(page, 'Projects');
  await projects.getByRole('button', { name: 'Browse projects…' }).click();
  return page.getByRole('dialog', { name: 'Affordable now' });
}

/** Plans a project from the catalogue, which closes it. */
export async function planProject(page: Page, name: string): Promise<void> {
  await (await openCatalogue(page)).getByRole('button', { name: `Plan ${name}` }).click();
}

/**
 * Sees an outline drawn round an element, and no wider than to pick it out, once it has
 * finished moving there: the tour's outline, or a tip's.
 */
export async function expectDrawnRound(outline: Locator, element: Locator): Promise<void> {
  await expect(async () => {
    const target = await element.boundingBox();
    const drawn = await outline.boundingBox();
    expect(target).not.toBeNull();
    expect(drawn).not.toBeNull();
    if (target !== null && drawn !== null) {
      expect(drawn.x).toBeLessThanOrEqual(target.x);
      expect(drawn.y).toBeLessThanOrEqual(target.y);
      expect(drawn.x + drawn.width).toBeGreaterThanOrEqual(target.x + target.width);
      expect(drawn.y + drawn.height).toBeGreaterThanOrEqual(target.y + target.height);
      expect(drawn.width).toBeLessThan(target.width + 40);
      expect(drawn.height).toBeLessThan(target.height + 40);
    }
  }).toPass();
}
