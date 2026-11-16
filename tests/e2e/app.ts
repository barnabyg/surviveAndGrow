import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';

/** The crude second country, as its author wrote it. */
export function testlandFile(): Record<string, unknown> {
  const file = path.join(import.meta.dirname, '..', 'countries', 'testland.json');
  return JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
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
