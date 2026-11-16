/**
 * The simulation. Everything outside this folder uses it through this file alone. It has
 * three operations: create a game from a country and a seed, advance one quarter given the
 * player's decisions, and preview a set of decisions without changing the game.
 */
export {
  COUNTRY_FORMAT_VERSION,
  CountryFileError,
  loadCountry,
  regionName,
  type Country,
  type Decoration,
  type Neighbour,
  type Point,
  type Region,
  type River,
  type Sea,
  type Settlement,
} from './country';
export {
  approvalStatus,
  describeUnrest,
  nationalApproval,
  type ApprovalEffects,
  type ApprovalStatus,
  type RegionUnrest,
} from './approval';
export { type Budget } from './budget';
export { describeEvent, type ActiveEvent } from './events';
export {
  foodStatus,
  monthsOfFood,
  type FoodStatus,
  type Harvest,
  type RegionHarvest,
} from './food';
export { seasonOf } from './calendar';
export { type ReportEntry } from './report';
export { advanceQuarter, budgetLimits, createGame, previewQuarter } from './game';
export {
  type Decisions,
  type GameState,
  type Outcome,
  type Preview,
  type RegionShortfall,
  type RegionState,
  type ReliefDelivery,
  type TurnReport,
  type TurnResult,
} from './state';
export { formatCount, formatMoney, formatPercent, formatTonnes } from './text';
export {
  exactly,
  MONEY_PER_MILLION,
  type Contribution,
  type Figure,
  type GameDate,
  type Money,
  type Quarter,
  type Range,
} from './types';
export {
  APPROVAL_DRIVER_NAMES,
  APPROVAL_DRIVERS,
  FOOD_STAGE_NAMES,
  FOOD_STAGES,
  MAP_FRAME,
  REPORT_KINDS,
  SERIOUSNESS_LEVELS,
  SERIOUSNESS_NAMES,
  SPENDING_AREA_NAMES,
  SPENDING_AREAS,
  UNREST_LEVELS,
  UNREST_NAMES,
  type ApprovalDriver,
  type DecorationKind,
  type EventType,
  type FoodStage,
  type LabelSide,
  type ReportKind,
  type Seriousness,
  type SettlementSize,
  type SpendingArea,
  type Terrain,
  type Unrest,
} from './vocabulary';
