import { describe, expect, it } from 'vitest';
import { advanceQuarter, createGame, seasonOf, type GameState } from '../../src/sim';
import { bothCountries, tavara, testland } from './countries';
import { steward } from './players';

function play(state: GameState, quarters: number): GameState {
  let current = state;
  for (let i = 0; i < quarters; i += 1) {
    current = advanceQuarter(current, steward(current)).state;
  }
  return current;
}

describe.each(bothCountries)('a new game in %s', (_name, country) => {
  it('starts in the first quarter of year 1 with the treasury from the country file', () => {
    const game = createGame(country(), 7);

    expect(game.date).toEqual({ year: 1, quarter: 1 });
    expect(game.country.name).toBe(country().name);
    expect(game.treasury).toBe(country().start.treasury);
  });

  it('moves on one quarter each time a quarter is ended', () => {
    const game = createGame(country(), 7);

    expect(play(game, 1).date).toEqual({ year: 1, quarter: 2 });
    expect(play(game, 3).date).toEqual({ year: 1, quarter: 4 });
  });

  it('rolls quarter 4 over to quarter 1 of the next year', () => {
    const game = createGame(country(), 7);

    expect(play(game, 4).date).toEqual({ year: 2, quarter: 1 });
    expect(play(game, 9).date).toEqual({ year: 3, quarter: 2 });
  });

  it('reports which quarter was just resolved', () => {
    const game = play(createGame(country(), 7), 3);

    expect(advanceQuarter(game, { budget: game.budget }).report.date).toEqual({
      year: 1,
      quarter: 4,
    });
  });

  it('leaves the earlier state untouched', () => {
    const game = createGame(country(), 7);
    const before = structuredClone(game);

    advanceQuarter(game, { budget: game.budget });

    expect(game).toEqual(before);
  });

  it('gives an identical game for the same seed and decisions', () => {
    const first = play(createGame(country(), 2026), 12);
    const second = play(createGame(country(), 2026), 12);

    expect(second).toEqual(first);
  });

  it('gives a different game for a different seed', () => {
    const first = play(createGame(country(), 1), 12);
    const second = play(createGame(country(), 2), 12);

    expect(second).not.toEqual(first);
  });
});

describe.each(bothCountries)('a careful player in %s', (_name, country) => {
  it.each([1, 2, 3, 4, 5, 6])(
    'can play a whole term without the engine failing (seed %i)',
    (seed) => {
      let game = createGame(country(), seed);
      // A solvent budget with money for food relief.
      const budget = {
        taxRatePercent: 30,
        spending: { ...game.budget.spending, foodRelief: 70, security: 0 },
      };

      for (let quarter = 0; quarter < 20 && game.outcome.status === 'playing'; quarter += 1) {
        game = advanceQuarter(game, steward(game, budget)).state;

        expect(game.treasury).toBeGreaterThanOrEqual(0);
        expect(game.foodReserve).toBeGreaterThanOrEqual(0);
        for (const region of game.regions) {
          expect(region.population).toBeGreaterThan(0);
          expect(region.foodStock).toBeGreaterThanOrEqual(0);
        }
      }

      // Five years on, the term has run its course: nothing but the election ended it.
      expect(game.date).toEqual({ year: 6, quarter: 1 });
      expect(game.history).toHaveLength(21);
      expect(game.outcome).toMatchObject({ cause: 'election' });
    },
  );
});

describe('the country files', () => {
  it('hold the money the country starts with, in units of $100,000', () => {
    expect(tavara().start.treasury).toBe(420);
    expect(testland().start.treasury).toBe(100);
  });
});

describe('the seasons', () => {
  it('name each quarter of the year', () => {
    expect(
      [1, 2, 3, 4].map((quarter) => seasonOf({ year: 1, quarter: quarter as 1 | 2 | 3 | 4 })),
    ).toEqual(['Dry season', 'Planting season', 'Growing season', 'Harvest season']);
  });
});
