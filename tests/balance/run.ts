import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect, it } from 'vitest';
import tavaraFile from '../../src/countries/tavara.json';
import { loadCountry, type Country } from '../../src/sim';
import testlandFile from '../countries/testland.json';
import { playGame, summarise } from './batch';
import { DEGENERATE_PLAYERS, SCRIPTED_PLAYERS } from './players';
import { writeUp, type Row } from './report';

/**
 * The balance run: `npm run balance`. It plays every scripted player through whole games on
 * the countries as they ship, over a range of seeds, and reports how often each wins and
 * what the others lose to. It is not part of the test suite and gates nothing.
 *
 *   BALANCE_SEEDS    the seeds to play, as `from-to` (default `1-300`)
 *   BALANCE_COUNTRY  `tavara`, `testland` or `both` (default `both`)
 *   BALANCE_OUT      where the results are written (default `balance-results.md`)
 *   BALANCE_PLAYERS  `all` adds the one-lever players that probe for a winning trick
 *   BALANCE_TERMS    the most terms each game is played for (default 1: Phase 1's single term)
 */
const countries: Readonly<Record<string, () => Country>> = {
  tavara: () => loadCountry(tavaraFile),
  testland: () => loadCountry(testlandFile),
};

function seedsFrom(range: string): number[] {
  const match = /^(\d+)-(\d+)$/.exec(range);
  const from = Number(match?.[1]);
  const to = Number(match?.[2]);
  if (match === null || from > to) {
    throw new Error(`BALANCE_SEEDS must be a range such as 1-300, but is "${range}".`);
  }
  return Array.from({ length: to - from + 1 }, (_, index) => from + index);
}

it('plays the scripted players and reports the balance', () => {
  const range = process.env.BALANCE_SEEDS ?? '1-300';
  const terms = Number(process.env.BALANCE_TERMS ?? '1');
  if (!Number.isInteger(terms) || terms < 1) {
    throw new Error(
      `BALANCE_TERMS must be a whole number from 1, but is "${process.env.BALANCE_TERMS}".`,
    );
  }
  const wanted = process.env.BALANCE_COUNTRY ?? 'both';
  const out = path.resolve(process.env.BALANCE_OUT ?? 'balance-results.md');
  const seeds = seedsFrom(range);
  const names = wanted === 'both' ? Object.keys(countries) : [wanted];
  const players =
    process.env.BALANCE_PLAYERS === 'all'
      ? [...SCRIPTED_PLAYERS, ...DEGENERATE_PLAYERS]
      : SCRIPTED_PLAYERS;

  const sections = names.map((name) => {
    const load = countries[name];
    if (load === undefined) {
      throw new Error(`BALANCE_COUNTRY must be tavara, testland or both, but is "${name}".`);
    }
    const country = load();
    const rows = players.map((player): Row => ({
      player: player.name,
      summary: summarise(seeds.map((seed) => playGame(country, seed, player.decide, terms))),
    }));
    // Every game must reach an ending: a game that throws fails the run here.
    for (const row of rows) expect(row.summary.games).toBe(seeds.length);
    return writeUp(country, range, rows);
  });

  const report = sections.join('\n');
  console.log(`\n${report}`);
  writeFileSync(out, report);
  console.log(`Written to ${out}`);
});
