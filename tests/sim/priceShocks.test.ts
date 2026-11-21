import { describe, expect, it } from 'vitest';
import tavaraFile from '../../src/countries/tavara.json';
import {
  advanceQuarter,
  createGame,
  loadCountry,
  priceStatus,
  type Decisions,
  type GameState,
  type TurnReport,
} from '../../src/sim';
import testlandFile from '../countries/testland.json';
import { tavaraAsShipped, testlandAsShipped, testlandFormat5File, withChances } from './countries';
import { faultsOf, withValue } from './files';

const asItIs = (game: GameState): Decisions => ({ budget: game.budget });

/** Plays quarters as they are, and keeps every state, the first among them, and every report. */
function play(start: GameState, quarters: number) {
  const states = [start];
  const reports: TurnReport[] = [];
  for (let quarter = 0; quarter < quarters; quarter += 1) {
    const game = states.at(-1) ?? start;
    if (game.outcome.status !== 'playing') break;
    const result = advanceQuarter(game, asItIs(game));
    states.push(result.state);
    reports.push(result.report);
  }
  return { states, reports };
}

const files = [
  ['Tavara', tavaraFile],
  ['Testland', testlandFile],
] as const;

/** Each shock: the good it moves, its name, and which way and how far it pushes each quarter. */
const shocks = [
  { type: 'failedHarvestsAbroad', good: 'grain', name: 'Failed harvests abroad', push: 36 },
  { type: 'oreGlut', good: 'ore', name: 'Ore glut', push: -20 },
] as const;

describe.each(files)('world price shocks in %s', (_country, file) => {
  describe.each(shocks)('$name', ({ type, good, name, push }) => {
    // Certain every quarter it can be announced, and no other shock.
    const certain = () => withChances(file, { shocks: { [type]: 1 } });
    const never = () => withChances(file, { shocks: {} });

    it('is announced two quarters before it moves the price, and says so in the report', () => {
      const { states, reports } = play(createGame(certain(), 3), 1);

      expect(states[1]?.priceShocks).toEqual([
        { type, announced: { year: 1, quarter: 2 }, begins: { year: 1, quarter: 4 } },
      ]);
      const entry = reports[0]?.entries.find((each) => each.kind === 'priceShock');
      expect(entry).toMatchObject({ seriousness: 'warning', headline: `${name} ahead` });
      expect(entry?.cause).toContain(
        `From Year 1 · Quarter 4 the world ${good} price will be pushed ${push > 0 ? 'up' : 'down'} by $${Math.abs(push)} a tonne each quarter for 3 quarters.`,
      );
    });

    it('moves the price for a set time, beyond what markets do, then ends with a report', () => {
      const shocked = play(createGame(certain(), 3), 6);
      const calm = play(createGame(never(), 3), 6);
      const gap = shocked.states.map(
        (state, index) =>
          (state.worldPrices[good].at(-1) ?? 0) -
          (calm.states[index]?.worldPrices[good].at(-1) ?? 0),
      );

      // Untouched until Year 1 · Quarter 4; then pushed each quarter for three quarters, while
      // the pull towards the usual price takes back part of what it has pushed.
      expect(gap.slice(0, 3)).toEqual([0, 0, 0]);
      expect(gap[3]).toBe(push);
      expect(Math.abs(gap[4] ?? 0)).toBeGreaterThan(Math.abs(push));
      expect(Math.abs(gap[5] ?? 0)).toBeGreaterThan(Math.abs(gap[4] ?? 0));
      expect(Math.abs(gap[6] ?? 0)).toBeLessThan(Math.abs(gap[5] ?? 0));

      const begun = shocked.reports[2]?.entries.find((each) => each.kind === 'priceShock');
      expect(begun?.headline).toBe(
        `${name} pushes the world ${good} price ${push > 0 ? 'up' : 'down'}`,
      );
      const ended = shocked.reports[5]?.entries.find(
        (each) => each.kind === 'priceShock' && each.headline === `${name} has ended`,
      );
      expect(ended?.seriousness).toBe('notable');
      // The next may be announced as soon as one ends.
      expect(shocked.states[6]?.priceShocks).toEqual([
        { type, announced: { year: 2, quarter: 3 }, begins: { year: 3, quarter: 1 } },
      ]);
    });

    it('widens the price’s forecast that way once it is announced, and is shown beside it', () => {
      const { states } = play(createGame(certain(), 3), 1);
      const coming = states[1] ?? createGame(certain(), 3);
      const unannounced = { ...coming, priceShocks: [] };
      const forecastOf = (game: GameState) => priceStatus(game, good).forecast;
      // The end of the forecast the shock pushes towards.
      const near = (game: GameState) =>
        push > 0 ? forecastOf(game).max : 0 - forecastOf(game).min;

      expect(near(coming)).toBeGreaterThan(near(unannounced));
      expect(priceStatus(coming, good).shocks).toEqual([
        {
          type,
          name,
          inForce: false,
          description: `From Year 1 · Quarter 4 the world ${good} price will be pushed ${push > 0 ? 'up' : 'down'} by $${Math.abs(push)} a tonne each quarter for 3 quarters.`,
        },
      ]);
    });

    it('never takes the price outside a forecast made once it was announced', () => {
      for (const seed of [1, 2, 3, 4, 5, 6]) {
        const { states } = play(createGame(certain(), seed), 16);
        const path = states.at(-1)?.worldPrices[good] ?? [];
        for (const [index, state] of states.slice(0, -4).entries()) {
          const { forecast } = priceStatus(state, good);
          // A shock announced later moves the price two quarters after it is announced, by
          // when the forecast has been made again with it.
          const later = states
            .slice(index + 1)
            .findIndex((each) =>
              each.priceShocks.some((shock) => !state.priceShocks.includes(shock)),
            );
          const known = later === -1 ? 4 : Math.min(4, later + 2);
          for (const price of path.slice(index + 1, index + 1 + known)) {
            expect(price).toBeGreaterThanOrEqual(forecast.min);
            expect(price).toBeLessThanOrEqual(forecast.max);
          }
        }
      }
    });

    it('is shown in what moved the price', () => {
      const { states } = play(createGame(certain(), 3), 3);
      const status = priceStatus(states[3] ?? createGame(certain(), 3), good);

      expect(status.figure?.contributions).toContainEqual({ label: name, amount: push });
      const parts = status.figure?.contributions.reduce((total, line) => total + line.amount, 0);
      expect(parts).toBe(status.figure?.change);
    });
  });
});

describe('how likely each world price shock is, in a country file', () => {
  it('is given by Tavara and Testland as they ship, a few in a hundred each quarter', () => {
    for (const country of [tavaraAsShipped(), testlandAsShipped()]) {
      expect(country.formatVersion).toBe(7);
      for (const chance of Object.values(country.priceShockLikelihood)) {
        expect(chance).toBeGreaterThan(0);
        expect(chance).toBeLessThanOrEqual(0.1);
      }
    }
  });

  it('is none for a shock the file does not name, and for a file of an earlier format', () => {
    const silent = withValue(testlandFile, ['priceShockLikelihood'], { oreGlut: 0.5 });
    expect(loadCountry(silent).priceShockLikelihood).toEqual({
      failedHarvestsAbroad: 0,
      oreGlut: 0.5,
    });
    expect(loadCountry(testlandFormat5File()).priceShockLikelihood).toEqual({
      failedHarvestsAbroad: 0,
      oreGlut: 0,
    });
  });

  it('cannot be given in a file of format 6', () => {
    const older = withValue(testlandFile, ['formatVersion'], 6);

    expect(faultsOf(older)).toEqual(['priceShockLikelihood needs country file format 7 or later.']);
  });

  it('is rejected for a shock the game does not have, or a chance outside 0 to 1', () => {
    const file = withValue(testlandFile, ['priceShockLikelihood'], {
      locusts: 0.1,
      oreGlut: 1.5,
    });

    expect(faultsOf(file)).toEqual([
      'priceShockLikelihood.locusts is not a world price shock this game has (failedHarvestsAbroad, oreGlut).',
      'priceShockLikelihood.oreGlut is 1.5, but must be a chance from 0 to 1.',
    ]);
  });
});
