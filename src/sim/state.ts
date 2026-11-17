import type { ApprovalEffects, RegionUnrest } from './approval';
import type { Budget } from './budget';
import type { Country } from './country';
import type { AnsweredDilemma, PendingDilemma } from './dilemmas';
import type { ActiveEvent } from './events';
import type { Harvest } from './food';
import type { Project } from './projects';
import type { VitalSigns } from './history';
import type { ReportEntry } from './report';
import type { RngState } from './rng';
import type { SiteSchedule } from './timeline';
import type { Figure, GameDate, Money, Range } from './types';
import type { FoodStage, Unrest } from './vocabulary';

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
  /**
   * How far the region's people approve of the government, in thousandths. It is the
   * baseline plus the effects below, held between nothing and everyone.
   */
  readonly approval: number;
  /** What each driver now adds to or takes from the region's approval, in thousandths. */
  readonly approvalEffects: ApprovalEffects;
  /**
   * Whether the region is striking or protesting. It is read off approval when a quarter
   * ends and holds through the next, cutting what the region produces.
   */
  readonly unrest: Unrest;
  /**
   * The level of health care in the region, in thousandths. Spending builds it up over
   * quarters and it wears down without it.
   */
  readonly health: number;
  /** The level of education in the region, in thousandths, built and worn like health. */
  readonly education: number;
}

/** How a finished game ended, in words the player can be shown whatever the cause. */
interface Ending {
  /** What happened, in a few words: "You won the election". */
  readonly headline: string;
  /** Why the game ended as it did. */
  readonly summary: string;
}

/**
 * Whether the game is still being played, and if not, how it ended. The game is won by
 * winning the election at the end of the term, and lost by losing it or by famine.
 */
export type Outcome =
  | { readonly status: 'playing' }
  | (Ending & {
      readonly status: 'lost';
      readonly cause: 'famine';
      /** The region where the famine took hold. */
      readonly regionId: string;
    })
  | (Ending & {
      readonly status: 'won' | 'lost';
      readonly cause: 'election';
      /** The share of the vote the government took, in thousandths. */
      readonly voteShare: number;
      /** The share it needed to stay in office, in thousandths. */
      readonly needed: number;
    });

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
  /**
   * Where food relief stands directed: the region the last quarter's decisions sent it to,
   * or null for nowhere. Like the budget in force, it is what the next quarter starts from.
   */
  readonly reliefRegionId: string | null;
  /** The national food reserve, in tonnes. */
  readonly foodReserve: number;
  /** Agriculture spending since the last harvest. It sets how much the next harvest yields. */
  readonly agricultureSpentThisYear: Money;
  /** One entry for each region of the country, in the country file's order. */
  readonly regions: readonly RegionState[];
  /** The events now in force, each in one region. */
  readonly events: readonly ActiveEvent[];
  /** Every project started, in the order they were started: those being built and those in use. */
  readonly projects: readonly Project[];
  /**
   * The vital signs as each quarter began, from the start of the game to the quarter now
   * being decided, in order. The last record is the position now.
   */
  readonly history: readonly VitalSigns[];
  /**
   * The dilemma put to the player as this quarter began, or null. The quarter cannot be
   * resolved until the decisions answer it.
   */
  readonly dilemma: PendingDilemma | null;
  /** Every dilemma the player has answered, in order. */
  readonly dilemmasAnswered: readonly AnsweredDilemma[];
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
  /**
   * The sites to start building on this quarter. Each must be empty, and the treasury must
   * hold the whole cost of them all. The first instalment is paid as the quarter ends.
   */
  readonly startProjects?: readonly string[];
  /**
   * The answer to the dilemma put to the player this quarter: the id of one of its options.
   * A quarter with a dilemma pending cannot be resolved without one, though it can be
   * previewed, and the preview then shows the quarter as it stands with nothing chosen.
   */
  readonly dilemmaChoice?: string | null;
}

/** What happened in a quarter, and why. */
export interface TurnReport {
  /** The quarter that was resolved. */
  readonly date: GameDate;
  /** The treasury after the quarter, with everything that moved it. */
  readonly treasury: Figure;
  /** The national food reserve after the quarter, in tonnes, with everything that moved it. */
  readonly food: Figure;
  /**
   * National approval after the quarter, in thousandths, with everything that moved it.
   */
  readonly approval: Figure;
  /**
   * National prosperity after the quarter, in thousandths, with what each of its parts did
   * to it. A report carried over from a save written before prosperity existed has none.
   */
  readonly prosperity: Figure | null;
  /**
   * The country's people after the quarter, with what moved their number in each region:
   * growth, and deaths in famine. A report carried over from a save written before the
   * population grew has none.
   */
  readonly population: Figure | null;
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
  /**
   * What would actually be spent, after any cuts the treasury forces. It counts the
   * instalments on projects, which are a fixed cost beyond the budget's own spending.
   */
  readonly spending: Range;
  /** The part of spending that goes on instalments for projects under way or starting. */
  readonly projectSpending: Range;
  /** The sites where building will pause this quarter because the treasury cannot pay. */
  readonly pausedSites: readonly string[];
  /**
   * When each project is built and comes into use: those there are and those about to be
   * started, in the order they were started. A site that will pause this quarter opens a
   * quarter later for it.
   */
  readonly schedule: readonly SiteSchedule[];
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
  /** National approval once the quarter is over, in thousandths. */
  readonly approval: Range;
  /**
   * Where national approval settles, in thousandths, if the decisions and the food
   * situation stay as they will be when the quarter ends. Approval moves there over
   * several quarters, so this is further off than the figure above.
   */
  readonly approvalHeading: Range;
  /**
   * National prosperity once the quarter is over, in thousandths. Nothing left to chance
   * this quarter bears on it, so the two ends are equal.
   */
  readonly prosperity: Range;
  /** The regions that will be striking or protesting once the quarter is over. */
  readonly unrest: readonly RegionUnrest[];
  /**
   * The share of the vote an election would give, in thousandths, if it were held on
   * approval as this quarter will leave it. The campaign's swing makes it a range.
   */
  readonly voteShare: Range;
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
