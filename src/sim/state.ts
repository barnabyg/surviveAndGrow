import type { Budget } from './budget';
import type { Country } from './country';
import type { ActiveEvent } from './events';
import type { Harvest } from './food';
import type { ReportEntry } from './report';
import type { RngState } from './rng';
import type { Figure, GameDate, Money, Range } from './types';
import type { FoodStage } from './vocabulary';

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
  /** The region's food situation, which worsens by stages while its people go hungry. */
  readonly foodStage: FoodStage;
  /** How many quarters running the region has been in famine. */
  readonly famineQuarters: number;
}

/** Whether the game is still being played, and if not, how it ended. */
export type Outcome =
  | { readonly status: 'playing' }
  | {
      readonly status: 'lost';
      readonly cause: 'famine';
      /** The region where the famine took hold. */
      readonly regionId: string;
      /** Why the game ended, in words for the player. */
      readonly summary: string;
    };

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
  /** The events now in force, each in one region. */
  readonly events: readonly ActiveEvent[];
  readonly outcome: Outcome;
}

/** What the player has decided for the quarter being resolved. */
export interface Decisions {
  readonly budget: Budget;
  /**
   * The region food relief is sent to this quarter. Relief makes up what the region is
   * short of, as far as food relief spending and the national reserve allow. Leaving it
   * out, or null, sends relief nowhere.
   */
  readonly reliefRegionId?: string | null;
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
  /**
   * What the player is told about the quarter, the most serious first. There is always at
   * least the budget outcome, and a quarter in which nothing notable happened says so.
   */
  readonly entries: readonly ReportEntry[];
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
  /** What each hungry region will be short of this quarter before any relief, in tonnes. */
  readonly shortfalls: readonly RegionShortfall[];
  /** What food relief will do this quarter. */
  readonly relief: ReliefDelivery;
}

/** What food relief does in a quarter, in tonnes. */
export interface ReliefDelivery {
  /** The most that food relief spending can move in the quarter. */
  readonly capacity: number;
  /** What the chosen region is short of, or 0 when no region is chosen. */
  readonly shortfall: number;
  /** What actually reaches it, given the capacity and the national reserve. */
  readonly delivered: number;
}

export interface RegionShortfall {
  readonly regionId: string;
  readonly shortfall: number;
}
