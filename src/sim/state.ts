import type { Budget } from './budget';
import type { Country } from './country';
import type { RngState } from './rng';
import type { Figure, GameDate, Money } from './types';

/** What is true of one region at one moment. National figures are derived from the regions. */
export interface RegionState {
  readonly id: string;
  readonly population: number;
  /** What the region produces in a quarter, before tax. */
  readonly output: Money;
}

/** Everything about a game in progress. It is never changed in place. */
export interface GameState {
  readonly country: Country;
  /** The seed the game was started from, kept so the same game can be played again. */
  readonly seed: number;
  readonly rng: RngState;
  readonly date: GameDate;
  readonly treasury: Money;
  /** The budget in force: the one the last quarter was resolved with. */
  readonly budget: Budget;
  /** One entry for each region of the country, in the country file's order. */
  readonly regions: readonly RegionState[];
}

/** What the player has decided for the quarter being resolved. */
export interface Decisions {
  readonly budget: Budget;
}

/** Something the player should be told about a quarter. */
export interface Notice {
  readonly title: string;
  readonly detail: string;
  readonly tone: 'info' | 'warning' | 'danger';
  /** The region it happened in, when it belongs to one place. */
  readonly regionId?: string;
}

/** What happened in a quarter, and why. */
export interface TurnReport {
  /** The quarter that was resolved. */
  readonly date: GameDate;
  /** The treasury after the quarter, with everything that moved it. */
  readonly treasury: Figure;
  readonly notices: readonly Notice[];
}

export interface TurnResult {
  readonly state: GameState;
  readonly report: TurnReport;
}
