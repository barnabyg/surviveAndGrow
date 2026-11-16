import type { Budget } from './budget';
import type { Country } from './country';
import type { Harvest } from './food';
import type { RngState } from './rng';
import type { Figure, GameDate, Money, Range } from './types';

/** What is true of one region at one moment. National figures are derived from the regions. */
export interface RegionState {
  readonly id: string;
  readonly population: number;
  /** What the region produces in a quarter, before tax. */
  readonly output: Money;
  /** The food the region holds for its own people, in tonnes. */
  readonly foodStock: number;
  /**
   * How far this growing year's weather has moved the coming harvest so far, in thousandths.
   * It builds up quarter by quarter and starts afresh after each harvest.
   */
  readonly weather: number;
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
  /** The national food reserve, in tonnes. */
  readonly foodReserve: number;
  /** Agriculture spending since the last harvest. It sets how much the next harvest yields. */
  readonly agricultureSpentThisYear: Money;
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
  /** The national food reserve after the quarter, in tonnes, with everything that moved it. */
  readonly food: Figure;
  /** The harvest, in quarter 4, and null in every other quarter. */
  readonly harvest: Harvest | null;
  readonly notices: readonly Notice[];
}

export interface TurnResult {
  readonly state: GameState;
  readonly report: TurnReport;
}

/**
 * What a set of decisions would do in the quarter being decided. Every figure is a range,
 * so uncertainty is shown wherever it exists and nowhere else.
 */
export interface Preview {
  readonly revenue: Range;
  /** What would actually be spent, after any cuts the treasury forces. */
  readonly spending: Range;
  readonly balance: Range;
  /** The treasury once the quarter is over. */
  readonly treasury: Range;
  /** True when the treasury could not cover the budget and every area would be cut. */
  readonly spendingCut: boolean;
  /**
   * What the coming harvest will bring in across the country, in tonnes, if agriculture
   * spending stays as decided. The weather still to come makes it a range.
   */
  readonly harvest: Range;
  /** The national reserve once the coming harvest is in, in tonnes, on the same footing. */
  readonly foodReserveAfterHarvest: Range;
}
