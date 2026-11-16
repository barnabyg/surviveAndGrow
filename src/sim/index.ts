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
export {
  advanceQuarter,
  createGame,
  seasonOf,
  type Decisions,
  type GameState,
  type TurnReport,
  type TurnResult,
} from './game';
export { MONEY_PER_MILLION, type GameDate, type Money, type Quarter } from './types';
export {
  MAP_FRAME,
  type DecorationKind,
  type LabelSide,
  type SettlementSize,
  type Terrain,
} from './vocabulary';
