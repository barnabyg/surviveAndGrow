/**
 * The simulation. Everything outside this folder uses it through this file alone:
 * load a country, create a game from it and a seed, and advance one quarter at a time.
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
export { type Budget, type BudgetOutcome } from './budget';
export { advanceQuarter, budgetLimits, budgetOutlook, createGame, seasonOf } from './game';
export {
  type Decisions,
  type GameState,
  type Notice,
  type RegionState,
  type TurnReport,
  type TurnResult,
} from './state';
export { formatMoney } from './text';
export {
  MONEY_PER_MILLION,
  type Contribution,
  type Figure,
  type GameDate,
  type Money,
  type Quarter,
} from './types';
export {
  MAP_FRAME,
  SPENDING_AREA_NAMES,
  SPENDING_AREAS,
  type DecorationKind,
  type LabelSide,
  type SettlementSize,
  type SpendingArea,
  type Terrain,
} from './vocabulary';
