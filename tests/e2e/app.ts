import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Locator, Page } from '@playwright/test';

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
 * Tavara as it ships, with its people not growing and chance pinned down where the test says: drought strikes the
 * named regions every year and no other region ever, and each dilemma named arises with
 * the chance given, each quarter that it can, and no other dilemma ever. Drought left
 * unsaid stays as the country file has it.
 */
export function tavaraWith(chances: {
  readonly drought?: readonly string[];
  readonly dilemmas?: Record<string, number>;
  /** Whether its people grow in number, as they do in the country that ships. */
  readonly growing?: boolean;
}): CountryFile {
  const country = holdingPopulation(
    read('..', '..', 'src', 'countries', 'tavara.json'),
    chances.growing,
  );
  const { drought } = chances;
  if (drought !== undefined) {
    for (const region of country.regions) {
      region.eventLikelihood = { drought: drought.includes(region.id) ? 1 : 0 };
    }
  }
  country.dilemmaLikelihood = chances.dilemmas ?? {};
  return country;
}

/**
 * Tavara with no drought and every region producing 30% more, which leaves its prosperity
 * just short of Developing: a quarter of generous health and education spending passes it.
 */
export function tavaraPoisedBelowDeveloping(): CountryFile {
  const country = tavaraWith({ drought: [] }) as CountryFile & { regions: { output: number }[] };
  for (const region of country.regions) region.output = Math.round(region.output * 13) / 10;
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
}

/** Opens the app, which loads the country and offers to start a game. */
export async function openApp(page: Page, options: StartOptions = {}) {
  const { seed = 1, asShipped = false } = options;
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
