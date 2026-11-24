import type { ApprovalEffects, RegionUnrest } from './approval';
import type { ArmyLoyaltyEffects } from './army';
import type { Austerity } from './austerity';
import type { Budget } from './budget';
import type { Country } from './country';
import type { Credit } from './credit';
import type { Borrowing, Debt } from './debt';
import type { AnsweredDilemma, PendingDilemma } from './dilemmas';
import type { ActiveEvent, EventStrike } from './events';
import type { Harvest } from './food';
import type { PriceShock } from './priceShocks';
import type { Project } from './projects';
import type { VitalSigns } from './history';
import type { ReportEntry } from './report';
import type { RngState } from './rng';
import type { SiteSchedule } from './timeline';
import type { TradeOrder, WorldPrices } from './trade';
import type { RouteCarriage } from './tradeRoutes';
import type { Figure, GameDate, Money, Range } from './types';
import type {
  CreditRating,
  FoodStage,
  PriceShockType,
  Technology,
  Tier,
  Unrest,
} from './vocabulary';

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
  /**
   * How loyal the army in the region is, in thousandths. It is the baseline plus the effects
   * below, held between nothing and the whole, and is read in stages (see `army.ts`).
   */
  readonly armyLoyalty: number;
  /** What each driver now adds to or takes from the region's army loyalty, in thousandths. */
  readonly armyLoyaltyEffects: ArmyLoyaltyEffects;
}

/** How a finished game ended, in words the player can be shown whatever the cause. */
interface Ending {
  /** What happened, in a few words: "You won the election". */
  readonly headline: string;
  /** Why the game ended as it did. */
  readonly summary: string;
}

/**
 * Whether the game is still being played, and if not, how it ended. The game runs over as
 * many terms as the government keeps winning. It is won by holding prosperity in the top
 * tier for long enough (see `victory.ts`), and lost by losing an election or by famine.
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
      readonly status: 'lost';
      readonly cause: 'election';
      /** The share of the vote the government took, in thousandths. */
      readonly voteShare: number;
      /** The share it needed to stay in office, in thousandths. */
      readonly needed: number;
    })
  | (Ending & {
      readonly status: 'won';
      readonly cause: 'prosperity';
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
  /** Every debt still owed, in the order it was taken. */
  readonly debts: readonly Debt[];
  /** The credit rating in force and what it is reassessed from as each quarter ends. */
  readonly credit: Credit;
  /**
   * The world price of each good, in dollars a tonne, as each quarter began. The last is the
   * price goods are bought at this quarter.
   */
  readonly worldPrices: WorldPrices;
  /** The world price shocks announced and not yet ended: those to come and those in force. */
  readonly priceShocks: readonly PriceShock[];
  /**
   * What each trade link carried across the border in the quarter last played: the mines' ore
   * and the grain that was really bought and sold, by the links that carried any. None before
   * the first quarter is played.
   */
  readonly tradeCarried: readonly RouteCarriage[];
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
  /** The tier of prosperity in force. */
  readonly tier: Tier;
  /**
   * The tier the game began in. The public's expectations, which lower the approval
   * baseline, are what tiers passed since then have raised.
   */
  readonly startingTier: Tier;
  /**
   * How many quarters running national prosperity has ended in the top tier. It goes back
   * to nothing in any quarter that ends below it, and the game is won when it reaches
   * `balance.victory.quartersToHold`.
   */
  readonly prosperousQuarters: number;
  /**
   * The austerity a bailout imposed, while it holds, or null. Neither a bailout nor a missed
   * payment during austerity ends the game.
   */
  readonly austerity: Austerity | null;
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
   * hold the whole cost of them all. The first instalment is paid as the quarter ends. None
   * may be started during austerity.
   */
  readonly startProjects?: readonly string[];
  /**
   * The technology to start researching this quarter, or null for none. Its prerequisites
   * must be known, nothing else may be being researched, and the treasury must hold its whole
   * cost beside that of the sites started. Its first instalment is paid as the quarter ends,
   * after those of the sites. It may not be started during austerity.
   */
  readonly startResearch?: Technology | null;
  /**
   * The regions to start surveying this quarter, each once and only where the country file
   * hides a deposit, never one surveyed before. The treasury must hold their whole cost beside
   * that of the sites and the research started. Their first instalments are paid as the
   * quarter ends, after the research's. None may be started during austerity.
   */
  readonly startSurveys?: readonly string[];
  /**
   * What to borrow this quarter, each from the menu of loans. The money arrives as the
   * quarter ends, and repayments begin the quarter after. Together with what is owed it must
   * stay within the most that may be owed. Nothing may be borrowed during austerity.
   */
  readonly borrow?: readonly Borrowing[];
  /**
   * What to buy or sell abroad this quarter, at this quarter's world price, less the export
   * margin for what is sold. Goods bought arrive, and are paid for, as the quarter ends; the
   * treasury must hold the cost as the quarter begins. Grain sold is set aside from the
   * national reserve, which must hold it as the quarter begins, and is paid for as the quarter
   * ends. A good may not be both bought and sold in one quarter. Austerity bars neither.
   */
  readonly trade?: readonly TradeOrder[];
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
   * National army loyalty after the quarter, in thousandths, with everything that moved it. A
   * report carried over from a save written before format 13, when no army was kept, has none.
   */
  readonly armyLoyalty: Figure | null;
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
  /**
   * What the nation owes after the quarter, with what borrowing and repayments did to it. A
   * report carried over from a save written before format 5, when nothing could be
   * borrowed, has none.
   */
  readonly debt: Figure | null;
  /**
   * The credit score after the quarter, in points, with what each of its parts did to it. A
   * report carried over from a save written before format 5 has none.
   */
  readonly credit: Figure | null;
  /** The harvest, in quarter 4, and null in every other quarter. */
  readonly harvest: Harvest | null;
  /**
   * The election held as the quarter ended, in the last quarter of a term, and null in every
   * other quarter. A report carried over from a save written before format 3 has none.
   */
  readonly election: ElectionResult | null;
  /**
   * What the player is told about the quarter, the most serious first. There is always at
   * least the budget outcome, and a quarter in which nothing notable happened says so.
   */
  readonly entries: readonly ReportEntry[];
}

/** How an election went. */
export interface ElectionResult {
  /** The share of the vote the government took, in thousandths. */
  readonly voteShare: number;
  /** The share it needed to stay in office, in thousandths. */
  readonly needed: number;
  /** Whether it stays in office for another term. */
  readonly won: boolean;
}

export interface TurnResult {
  readonly state: GameState;
  readonly report: TurnReport;
}

/**
 * What chance decides in a quarter. A turn draws it from the game's generator; a projection
 * supposes it, which is how the game looks ahead without drawing anything.
 */
export interface Chance {
  /** How far the quarter's weather moves each region's coming harvest, in thousandths. */
  readonly weatherShocks: readonly number[];
  /** The events that strike as the calendar moves into the next quarter. */
  readonly struck: readonly EventStrike[];
  /** How far the campaign moves the vote, in thousandths, if an election is held. */
  readonly swing: number;
  /**
   * How far world markets move each good's price this quarter, as a share of its full swing
   * in thousandths, in the goods' order. A good with none given does not move but for the
   * pull back towards its usual price.
   */
  readonly priceShocks: readonly number[];
  /**
   * The world price shocks announced as the calendar moves into the next quarter. One of a
   * kind already announced or in force is not announced again.
   */
  readonly shocksAnnounced: readonly PriceShockType[];
  /**
   * The roll for each kind of dilemma, from 0 up to 1, in the vocabulary's order. One
   * arises when its roll falls under its chance. A kind with no roll does not arise.
   */
  readonly dilemmaRolls: readonly number[];
}

/** A quarter resolved, with the signs of trouble a projection looks for. */
export interface QuarterResolved extends TurnResult {
  /** True when the treasury could not cover the budget and every area was cut. */
  readonly spendingCut: boolean;
  /** The sites where building paused because the treasury could not pay. */
  readonly pausedSites: readonly string[];
  /** The sites in use that went without upkeep, and are decaying from the next quarter. */
  readonly upkeepShort: readonly string[];
  /** What fell due on debts and could not be paid. */
  readonly missedPayment: Money;
  /** The debts a payment was missed on, by name. */
  readonly missedOn: readonly string[];
  /** True when a missed payment brought a bailout, outside austerity. */
  readonly bailedOut: boolean;
  /** What the quarter's payments on debts took off the principal owed. */
  readonly principalRepaid: Money;
  /** What borrowing brought into the treasury as the quarter ended. */
  readonly borrowed: Money;
  /** What was paid for goods bought abroad as the quarter ended. */
  readonly tradePaid: Money;
  /** What goods sold abroad brought in as the quarter ended. */
  readonly tradeEarned: Money;
  /** The share of their needs each region's people ate, in thousandths, in the regions' order. */
  readonly fedPermille: readonly number[];
  readonly electionHeld: boolean;
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
  /**
   * The part of spending that goes on repaying debts, interest and principal. It is paid
   * before anything else.
   */
  readonly repayments: Range;
  /**
   * What falls due on debts and cannot be paid. Any at all brings a bailout, or during
   * austerity extends it.
   */
  readonly missedPayment: Money;
  /** What borrowing brings into the treasury as the quarter ends. */
  readonly borrowed: Money;
  /**
   * What trade does as the quarter ends: the grain that reaches the reserve and its cost, and
   * the grain that leaves it and what it brings in.
   */
  readonly trade: TradePreview;
  /** What the nation will owe once the quarter is over. */
  readonly debt: Range;
  /**
   * The debt burden once the quarter is over: debt against a year's revenue, in thousandths.
   * What a mine's chain earns, and so pays in tax, follows the world ore price, which world
   * markets move as the quarter ends: the range is what their limits allow.
   */
  readonly debtBurden: Range;
  /** The credit rating once the quarter is over, which sets the terms of the next loan. */
  readonly creditRating: CreditRating;
  /** The credit score once the quarter is over, in points. */
  readonly creditScore: Range;
  /** The sites where building will pause this quarter because the treasury cannot pay. */
  readonly pausedSites: readonly string[];
  /**
   * What the sites in use need for their upkeep this quarter, what would be spent on it, and
   * the sites that would go without and decay from next quarter.
   */
  readonly upkeep: UpkeepPreview;
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
  /** National army loyalty once the quarter is over, in thousandths. */
  readonly armyLoyalty: Range;
  /**
   * Where national army loyalty settles, in thousandths, if Defence spending and each region's
   * unrest stay as they will be when the quarter ends. Loyalty moves there over several
   * quarters, as approval does.
   */
  readonly armyLoyaltyHeading: Range;
  /**
   * National prosperity once the quarter is over, in thousandths. Only the world ore price,
   * which world markets move as the quarter ends, is left to chance: with no mine's chain
   * earning, the two ends are equal.
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

/** A quarter's trade as the preview sees it. */
export interface TradePreview {
  /** The grain that reaches the national reserve as the quarter ends, in tonnes. */
  readonly imported: number;
  /** What is paid for it out of the treasury. */
  readonly paid: Money;
  /** The grain sold abroad that leaves the national reserve, in tonnes. */
  readonly exported: number;
  /** What it brings into the treasury. */
  readonly earned: Money;
}

/** A quarter's upkeep as the preview sees it. */
export interface UpkeepPreview {
  readonly needed: Money;
  readonly spent: Money;
  /** The sites in use that would go without, in the order building began on them. */
  readonly short: readonly string[];
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
