/**
 * The simulation. Everything outside this folder uses it through this file alone. It has
 * three operations: create a game from a country and a seed, advance one quarter given the
 * player's decisions, and preview a set of decisions without changing the game.
 */
export {
  COUNTRY_FORMAT_VERSION,
  CountryFileError,
  loadCountry,
  type Country,
  type Decoration,
  type Neighbour,
  type Point,
  type Region,
  type River,
  type Sea,
  type Settlement,
} from './country';
export { type Budget } from './budget';
export { describeEvent, type ActiveEvent } from './events';
export { foodStatus, type FoodStatus, type Harvest, type RegionHarvest } from './food';
export { seasonOf } from './calendar';
export { advanceQuarter, budgetLimits, createGame, previewQuarter } from './game';
export {
  type Decisions,
  type GameState,
  type Notice,
  type Outcome,
  type Preview,
  type RegionShortfall,
  type RegionState,
  type TurnReport,
  type TurnResult,
} from './state';
export { formatCount, formatMoney, formatTonnes } from './text';
export {
  MONEY_PER_MILLION,
  type Contribution,
  type Figure,
  type GameDate,
  type Money,
  type Quarter,
  type Range,
} from './types';
export {
  FOOD_STAGE_NAMES,
  FOOD_STAGES,
  MAP_FRAME,
  SPENDING_AREA_NAMES,
  SPENDING_AREAS,
  type DecorationKind,
  type EventType,
  type FoodStage,
  type LabelSide,
  type SettlementSize,
  type SpendingArea,
  type Terrain,
} from './vocabulary';
