import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Locator, Page } from '@playwright/test';

/** The crude second country, as its author wrote it. */
export function testlandFile(): Record<string, unknown> {
  const file = path.join(import.meta.dirname, '..', 'countries', 'testland.json');
  return JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
}

/**
 * Tavara as it ships, except that drought strikes the named regions every year and no
 * other region ever.
 */
export function tavaraWithDroughtIn(regionIds: readonly string[]): unknown {
  const file = path.join(import.meta.dirname, '..', '..', 'src', 'countries', 'tavara.json');
  const country = JSON.parse(readFileSync(file, 'utf8')) as {
    regions: { id: string; eventLikelihood: { drought: number } }[];
  };
  for (const region of country.regions) {
    region.eventLikelihood = { drought: regionIds.includes(region.id) ? 1 : 0 };
  }
  return country;
}

interface StartOptions {
  /** A fixed seed, so every run plays the same game. */
  readonly seed?: number;
  /** A country file to play in place of the one that ships, as if an author were serving it. */
  readonly countryFile?: unknown;
}

/** Opens the app, which loads the country and offers to start a game. */
export async function openApp(page: Page, { seed = 1, countryFile }: StartOptions = {}) {
  if (countryFile === undefined) {
    await page.goto(`/?seed=${seed}`);
    return;
  }
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
/** This quarter's reports, in the left column. */
export const reports = (page: Page): Locator =>
  situation(page).getByRole('region', { name: 'This quarter' });
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
