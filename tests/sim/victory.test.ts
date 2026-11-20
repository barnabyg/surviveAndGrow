import { describe, expect, it } from 'vitest';
import tavaraFile from '../../src/countries/tavara.json';
import {
  advanceQuarter,
  createGame,
  victoryStatus,
  type Country,
  type Decisions,
  type GameState,
} from '../../src/sim';
import { withChances } from './countries';

interface Wealth {
  regions: { population: number }[];
  start: { treasury: number; budget: { spending: Record<string, number> } };
}

/**
 * Tavara with a tenth of its people, $2.0m a quarter on each of health and education and a
 * treasury that lasts: it starts in Prosperous and stays there. A year's revenue at its
 * budget is $124.0m. No drought or dilemma comes.
 */
function prosperousTavara(): Country {
  const copy = structuredClone(tavaraFile) as unknown as Wealth;
  for (const region of copy.regions) region.population = Math.round(region.population / 10);
  copy.start.treasury = 2000;
  copy.start.budget.spending.health = 20;
  copy.start.budget.spending.education = 20;
  return withChances(copy, {});
}

/** Plays quarters on an unchanged budget, the first with the decisions given. */
function play(start: GameState, quarters: number, first: Partial<Decisions> = {}): GameState[] {
  const states: GameState[] = [];
  let game = start;
  for (let quarter = 0; quarter < quarters && game.outcome.status === 'playing'; quarter += 1) {
    game = advanceQuarter(game, { budget: game.budget, ...(quarter === 0 ? first : {}) }).state;
    states.push(game);
  }
  return states;
}

/** The state a quarter played left, counting the first as 0. */
function quarter(states: readonly GameState[], index: number): GameState {
  const state = states[index];
  if (state === undefined) throw new Error(`Quarter ${index} was not played.`);
  return state;
}

describe('the win’s debt test', () => {
  it('wins on four quarters held in Prosperous with nothing owed', () => {
    const states = play(createGame(prosperousTavara(), 3), 4);

    expect(states.map((state) => victoryStatus(state).held)).toEqual([1, 2, 3, 4]);
    expect(states.at(-1)?.outcome).toMatchObject({ status: 'won', cause: 'prosperity' });
    expect(victoryStatus(quarter(states, 0)).debt).toEqual({
      burden: 0,
      limit: 300,
      holds: true,
    });
  });

  it('withholds the win while the debt burden is over the limit, and gives it once the debt is brought within it', () => {
    // $100.0m borrowed in the first quarter, repaid over three years: 80.6% of a year's revenue.
    const borrow = [
      { kind: 'loan', amount: 500, quarters: 12 },
      { kind: 'loan', amount: 500, quarters: 12 },
    ] as const;
    const states = play(createGame(prosperousTavara(), 3), 20, { borrow });
    const won = states.findIndex((state) => state.outcome.status === 'won');

    // The hold kept counting past four quarters, the win waiting on the debt.
    const fourth = quarter(states, 3);
    expect(victoryStatus(fourth)).toMatchObject({
      held: 4,
      needed: 4,
      debt: { limit: 300, holds: false },
      waitingOnDebt: true,
    });
    expect(fourth.outcome.status).toBe('playing');
    expect(won).toBeGreaterThan(3);
    expect(states.map((state) => victoryStatus(state).held).slice(0, won + 1)).toEqual(
      Array.from({ length: won + 1 }, (_, index) => index + 1),
    );
    states.slice(3, won).forEach((state) => {
      expect(victoryStatus(state).debt.holds).toBe(false);
      expect(state.outcome.status).toBe('playing');
    });

    // It was won as the quarter that brought the burden within the limit ended.
    const winning = quarter(states, won);
    expect(victoryStatus(winning).debt.holds).toBe(true);
    expect(victoryStatus(winning).debt.burden).toBeLessThanOrEqual(300);
    expect(winning.outcome).toMatchObject({
      status: 'won',
      cause: 'prosperity',
      headline: 'The nation is prosperous',
    });
    expect(winning.outcome.status === 'won' && winning.outcome.summary).toContain(
      'within the 30.0% the win allows',
    );
  });
});
