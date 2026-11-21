import { describe, expect, it } from 'vitest';
import tavaraFile from '../../src/countries/tavara.json';
import {
  advanceQuarter,
  createGame,
  importTerms,
  pendingDilemma,
  previewQuarter,
  priceStatus,
  risksAhead,
  type Decisions,
  type GameState,
  type TradeOrder,
  type TurnReport,
  withinAusterity,
} from '../../src/sim';
import testlandFile from '../countries/testland.json';
import { bothCountries, tavara, withChances, withDroughtChance } from './countries';

/** An order for tonnes of grain from abroad. */
function grain(tonnes: number): TradeOrder {
  return { good: 'grain', direction: 'import', tonnes };
}

const keep = (game: GameState): Decisions => ({ budget: game.budget });

/** Plays quarters, each decided by the function given, and keeps every state and report. */
function play(start: GameState, quarters: number, decide: (game: GameState) => Decisions) {
  const states = [start];
  const reports: TurnReport[] = [];
  for (let quarter = 0; quarter < quarters; quarter += 1) {
    const game = states.at(-1);
    if (game?.outcome.status !== 'playing') break;
    const result = advanceQuarter(game, decide(game));
    states.push(result.state);
    reports.push(result.report);
  }
  return { states, reports, state: states.at(-1) ?? start };
}

const pathOf = (country: () => ReturnType<typeof tavara>, seed: number, quarters = 20) =>
  play(createGame(country(), seed), quarters, keep).state.worldPrices.grain;

describe.each(bothCountries)('the world grain price in %s', (_name, country) => {
  it('opens at its usual price, $240 a tonne', () => {
    expect(createGame(country(), 1).worldPrices.grain).toEqual([240]);
  });

  it('moves each quarter, and the same seed always moves it the same way', () => {
    const path = pathOf(country, 7, 10);

    expect(path).toHaveLength(11);
    expect(new Set(path).size).toBeGreaterThan(5);
    expect(pathOf(country, 7, 10)).toEqual(path);
    expect(pathOf(country, 8, 10)).not.toEqual(path);
  });

  it('stays from $150 to $420 a tonne, and never moves more than $90 in a quarter', () => {
    // A game may end before the quarters are up; its prices are checked as far as it went.
    for (const seed of [1, 2, 3, 4, 5]) {
      const path = pathOf(country, seed, 40);
      expect(Math.min(...path)).toBeGreaterThanOrEqual(150);
      expect(Math.max(...path)).toBeLessThanOrEqual(420);
      for (const [index, price] of path.slice(1).entries()) {
        expect(Math.abs(price - (path[index] ?? price))).toBeLessThanOrEqual(90);
      }
    }
  });

  it('leaves the weather and events of a seed as they were', () => {
    // The price is drawn from the seed and the quarter alone, so the generator moves as before.
    const game = createGame(country(), 3);
    const moved = advanceQuarter(game, keep(game)).state;
    const frozen = advanceQuarter({ ...game, worldPrices: { grain: [400] } }, keep(game)).state;

    expect(moved.rng).toBe(frozen.rng);
    expect(moved.regions).toEqual(frozen.regions);
  });

  it('is explained by the pull towards its usual price and by world markets', () => {
    const { state } = play(createGame(country(), 4), 6, keep);
    const status = priceStatus(state, 'grain');
    const [before, now] = state.worldPrices.grain.slice(-2);

    expect(status.price).toBe(now);
    expect(status.figure?.change).toBe((now ?? 0) - (before ?? 0));
    expect(status.figure?.contributions.map((line) => line.label)).toEqual([
      'Pull towards the usual price',
      'World markets',
    ]);
    const parts = status.figure?.contributions.reduce((total, line) => total + line.amount, 0);
    expect(parts).toBe(status.figure?.change);
  });

  it('falls inside the forecast range over the next four quarters', () => {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const played = play(createGame(country(), seed), 8, keep);
      const { forecast } = priceStatus(played.states[2] ?? played.state, 'grain');
      const ahead = played.state.worldPrices.grain.slice(3, 7);

      expect(forecast.min).toBeLessThan(forecast.max);
      for (const price of ahead) {
        expect(price).toBeGreaterThanOrEqual(forecast.min);
        expect(price).toBeLessThanOrEqual(forecast.max);
      }
    }
  });
});

describe.each(bothCountries)('an import of grain in %s', (_name, country) => {
  const start = () => createGame(country(), 2);
  const order = { ...keep(start()), trade: [grain(5000)] };

  it('is costed at this quarter’s world price before it is ordered', () => {
    const terms = importTerms(start(), 'grain', 5000);

    // 5,000 tonnes at $240 a tonne is $1.2m.
    expect(terms).toEqual({
      good: 'grain',
      tonnes: 5000,
      dollarsPerTonne: 240,
      cost: 12,
      unavailable: null,
    });
  });

  it('reaches the national reserve and is paid for as the quarter ends, at the cost shown', () => {
    const game = start();
    const without = advanceQuarter(game, keep(game));
    const { state, report } = advanceQuarter(game, order);

    expect(state.foodReserve - without.state.foodReserve).toBe(5000);
    expect(state.treasury - without.state.treasury).toBe(-12);
    expect(report.treasury.contributions).toContainEqual({ label: 'Grain imported', amount: -12 });
    expect(report.food.contributions).toContainEqual({ label: 'Grain imported', amount: 5000 });
    expect(report.entries).toContainEqual({
      kind: 'trade',
      seriousness: 'notable',
      headline: 'Grain imported',
      cause: '5,000 t reached the national reserve, bought for $1.2m at $240 a tonne.',
    });
  });

  it('is in the preview: the treasury after it, and the reserve after the harvest', () => {
    const game = start();
    const without = previewQuarter(game, keep(game));
    const preview = previewQuarter(game, order);
    const { state } = advanceQuarter(game, order);

    expect(preview.trade).toEqual({ imported: 5000, paid: 12 });
    expect(preview.treasury.min).toBe(without.treasury.min - 12);
    expect(preview.treasury).toEqual({ min: state.treasury, max: state.treasury });
    // What reaches the reserve before the harvest loses its share to spoilage on the way.
    expect(preview.foodReserveAfterHarvest.min).toBeGreaterThan(
      without.foodReserveAfterHarvest.min,
    );
    expect(preview.foodReserveAfterHarvest.max).toBeGreaterThan(
      without.foodReserveAfterHarvest.max,
    );
  });

  it('is no part of the budget’s balance', () => {
    const game = start();

    expect(previewQuarter(game, order).balance).toEqual(previewQuarter(game, keep(game)).balance);
  });

  it('can be ordered during austerity', () => {
    const game = { ...start(), austerity: { quartersLeft: 3 } };
    const austere = { budget: withinAusterity(game, game.budget) };

    expect(importTerms(game, 'grain', 5000).unavailable).toBeNull();
    expect(
      advanceQuarter(game, { ...austere, trade: [grain(5000)] }).state.foodReserve -
        advanceQuarter(game, austere).state.foodReserve,
    ).toBe(5000);
  });

  it('is refused when the treasury does not hold its cost', () => {
    const game = { ...start(), treasury: 11 };

    expect(importTerms(game, 'grain', 5000).unavailable).toBe(
      'The treasury holds only $1.1m, and the grain ordered would cost $1.2m.',
    );
    expect(() => advanceQuarter(game, order)).toThrow(
      'The treasury holds only $1.1m, and the grain ordered would cost $1.2m.',
    );
  });

  it('is refused for anything but whole thousands of tonnes, and more than once a quarter', () => {
    const game = start();

    expect(() => advanceQuarter(game, { ...keep(game), trade: [grain(1500)] })).toThrow(
      'An order must be for a whole number of 1,000 t, but is for 1,500 t.',
    );
    expect(() => advanceQuarter(game, { ...keep(game), trade: [grain(0)] })).toThrow(
      'An order must be for a whole number of 1,000 t, but is for 0 t.',
    );
    expect(() =>
      advanceQuarter(game, { ...keep(game), trade: [grain(1000), grain(2000)] }),
    ).toThrow('Each good may be ordered only once a quarter.');
  });
});

describe('an import the treasury can no longer pay for in full as the quarter ends', () => {
  it('is cut to the thousands of tonnes it can pay for, and the report says so', () => {
    const country = tavara();
    // The treasury holds the cost as the quarter begins, but a lavish budget spends it first.
    const game = { ...createGame(country, 1), treasury: 100 };
    const lavish = {
      taxRatePercent: 5,
      spending: { ...game.budget.spending, health: 200, education: 200, security: 200 },
    };
    const { state, report } = advanceQuarter(game, { budget: lavish, trade: [grain(40_000)] });

    const line = report.food.contributions.find((entry) => entry.label === 'Grain imported');
    expect(state.treasury).toBeGreaterThanOrEqual(0);
    expect(line?.amount).toBeLessThan(40_000);
    expect(report.entries.find((entry) => entry.kind === 'trade')).toMatchObject({
      seriousness: 'warning',
      headline: 'Grain import cut short',
    });
  });
});

/**
 * A drought in a lean year: one region's harvest fails every year, nothing is spent on
 * agriculture, and the reserve starts empty. Relief goes to the stricken region throughout.
 */
const lean = [
  {
    name: 'Tavara',
    file: tavaraFile,
    regionId: 'arden-vale',
    seed: 1,
    foodRelief: 100,
    tonnes: 20_000,
  },
  {
    name: 'Testland',
    file: testlandFile,
    regionId: 'northfield',
    seed: 2,
    foodRelief: 20,
    tonnes: 3000,
  },
] as const;

describe.each(lean)('a drought in a lean year in $name', (scenario) => {
  const { file, regionId, seed, foodRelief, tonnes } = scenario;
  const country = () => withDroughtChance(file, { [regionId]: 1 }, 0);
  const decide =
    (importing: boolean) =>
    (game: GameState): Decisions => ({
      budget: {
        ...game.country.start.budget,
        spending: { ...game.country.start.budget.spending, agriculture: 0, foodRelief },
      },
      reliefRegionId: regionId,
      // Grain is bought every quarter from the one in which the failed harvest comes in.
      trade: importing && game.history.length >= 4 ? [grain(tonnes)] : [],
    });

  it('ends in famine left to the national reserve alone', () => {
    const { state } = play(createGame(country(), seed), 16, decide(false));

    expect(state.outcome).toMatchObject({ status: 'lost', cause: 'famine' });
  });

  it('is lived through without famine on grain bought abroad', () => {
    const played = play(createGame(country(), seed), 16, decide(true));

    expect(played.states).toHaveLength(17);
    expect(played.state.outcome).toEqual({ status: 'playing' });
    expect(
      played.states.every((state) => state.regions.every((r) => r.foodStage !== 'famine')),
    ).toBe(true);
    expect(
      played.reports.filter((report) => report.entries.some((e) => e.kind === 'trade')),
    ).not.toHaveLength(0);
  });

  it('is warned of as famine, and the warning goes once grain is ordered', () => {
    // Find a quarter in which the risks ahead warn of famine in the game without imports.
    const { states } = play(createGame(country(), seed), 16, decide(false));
    const warned = states.find(
      (game) =>
        game.outcome.status === 'playing' &&
        risksAhead(game, decide(false)(game)).some((risk) => risk.kind === 'famine'),
    );
    if (warned === undefined) throw new Error('No famine was ever warned of');
    const famines = (decisions: Decisions) =>
      risksAhead(warned, decisions).filter((risk) => risk.kind === 'famine');

    const ordered = { ...decide(false)(warned), trade: [grain(tonnes * 4)] };
    expect(famines(decide(false)(warned)).length).toBeGreaterThan(0);
    expect(famines(ordered).length).toBeLessThan(famines(decide(false)(warned)).length);
  });
});

describe('the neighbour’s offer of grain', () => {
  const offered = (seed: number) => {
    const country = withChances(tavaraFile, { dilemmas: { grainOffer: 1 }, reserve: 0 });
    const { state } = play(createGame(country, seed), 1, keep);
    return state;
  };

  it('is priced at the world price', () => {
    for (const seed of [1, 2, 3]) {
      const game = offered(seed);
      const buy = game.dilemma?.options.find((option) => option.id === 'buy');
      const price = game.worldPrices.grain.at(-1) ?? 0;
      const tonnes = buy?.effects.find((effect) => effect.kind === 'reserve');
      const paid = buy?.effects.find((effect) => effect.kind === 'treasury');
      if (tonnes?.kind !== 'reserve' || paid?.kind !== 'treasury') throw new Error('No offer');

      // Tavara eats 260,000 tonnes a quarter, and the whole shipment is a fifth of that.
      expect(tonnes.tonnes).toBe(52_000);
      expect(paid.amount).toBe(-Math.round((52_000 * price) / 100_000));
      expect(pendingDilemma(game)?.options[0]?.effects[0]).toBe(
        `Costs $${(Math.round((52_000 * price) / 100_000) / 10).toFixed(1)}m`,
      );
    }
  });

  it('costs more when the world price is higher', () => {
    const costs = [1, 2, 3, 4, 5, 6].map((seed) => {
      const game = offered(seed);
      const paid = game.dilemma?.options[0]?.effects.find((effect) => effect.kind === 'treasury');
      return [game.worldPrices.grain.at(-1) ?? 0, paid?.kind === 'treasury' ? -paid.amount : 0];
    });
    const sorted = [...costs].sort((a, b) => (a[0] ?? 0) - (b[0] ?? 0));

    expect(new Set(costs.map(([price]) => price)).size).toBeGreaterThan(1);
    expect(sorted.map(([, cost]) => cost)).toEqual(
      [...sorted.map(([, cost]) => cost ?? 0)].sort((a, b) => a - b),
    );
  });
});
