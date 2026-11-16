import { balance } from './balance';
import { checkBudget, cutNotice, resolveBudget, type Budget, type BudgetOutcome } from './budget';
import type { Country } from './country';
import { seedGenerator } from './rng';
import type { Decisions, GameState, TurnResult } from './state';
import type { GameDate, Quarter } from './types';

/** Starts a game. The same country and seed always start the same game. */
export function createGame(country: Country, seed: number): GameState {
  return {
    country,
    seed,
    rng: seedGenerator(seed),
    date: { year: 1, quarter: 1 },
    treasury: country.start.treasury,
    budget: country.start.budget,
    regions: country.regions.map((region) => ({
      id: region.id,
      population: region.population,
      output: region.output,
    })),
  };
}

/**
 * Resolves the current quarter with the player's decisions and moves the date on.
 * @throws RangeError when a decision is outside what the game allows.
 */
export function advanceQuarter(state: GameState, decisions: Decisions): TurnResult {
  checkBudget(decisions.budget);
  const finances = resolveBudget(state, decisions.budget);

  return {
    state: {
      ...state,
      date: nextDate(state.date),
      treasury: finances.treasury,
      budget: decisions.budget,
    },
    report: {
      date: state.date,
      treasury: {
        value: finances.treasury,
        change: finances.treasury - state.treasury,
        contributions: finances.contributions,
      },
      notices: finances.cut ? [cutNotice(finances)] : [],
    },
  };
}

/** What a budget would do to the treasury this quarter. It changes nothing. */
export function budgetOutlook(state: GameState, budget: Budget): BudgetOutcome {
  return resolveBudget(state, budget);
}

/** The ranges the budget may be set within. */
export const budgetLimits = balance.budget;

export function seasonOf(date: GameDate): string {
  return balance.calendar.seasons[date.quarter];
}

function nextDate(date: GameDate): GameDate {
  return date.quarter === 4
    ? { year: date.year + 1, quarter: 1 }
    : { year: date.year, quarter: (date.quarter + 1) as Quarter };
}
