import { balance } from './balance';
import type { Country } from './country';
import { seedGenerator, type RngState } from './rng';
import type { GameDate, Money, Quarter } from './types';

/** Everything about a game in progress. It is never changed in place. */
export interface GameState {
  readonly country: Country;
  /** The seed the game was started from, kept so the same game can be played again. */
  readonly seed: number;
  readonly rng: RngState;
  readonly date: GameDate;
  readonly treasury: Money;
}

/** What the player has decided for the quarter being resolved. */
export type Decisions = Readonly<Record<string, never>>;

/** What happened in a quarter, and why. */
export interface TurnReport {
  /** The quarter that was resolved. */
  readonly date: GameDate;
}

export interface TurnResult {
  readonly state: GameState;
  readonly report: TurnReport;
}

/** Starts a game. The same country and seed always start the same game. */
export function createGame(country: Country, seed: number): GameState {
  return {
    country,
    seed,
    rng: seedGenerator(seed),
    date: { year: 1, quarter: 1 },
    treasury: country.start.treasury,
  };
}

/** Resolves the current quarter with the player's decisions and moves the date on. */
export function advanceQuarter(state: GameState, _decisions: Decisions): TurnResult {
  return {
    state: { ...state, date: nextDate(state.date) },
    report: { date: state.date },
  };
}

export function seasonOf(date: GameDate): string {
  return balance.calendar.seasons[date.quarter];
}

function nextDate(date: GameDate): GameDate {
  return date.quarter === 4
    ? { year: date.year + 1, quarter: 1 }
    : { year: date.year, quarter: (date.quarter + 1) as Quarter };
}
