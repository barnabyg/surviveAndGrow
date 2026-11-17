/**
 * The simulation. Everything outside this folder uses it through this file alone. It has
 * three operations: create a game from a country and a seed, advance one quarter given the
 * player's decisions, and preview a set of decisions without changing the game. Looking
 * further ahead for danger (`risksAhead`) is a preview too: it changes and draws nothing.
 * `saveGame` and `loadSave` turn a game into plain data and back. They store nothing: where
 * a save is kept is the business of whoever calls them.
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
  type Site,
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
export {
  pendingDilemma,
  type AnsweredDilemma,
  type DilemmaOptionView,
  type DilemmaView,
  type PendingDilemma,
} from './dilemmas';
export { electionStatus, type ElectionStatus } from './election';
export { type ActiveEvent } from './events';
export {
  foodStatus,
  monthsOfFood,
  type FoodStatus,
  type Harvest,
  type RegionHarvest,
} from './food';
export { dateOfQuarter, seasonOf } from './calendar';
export { drawAt } from './rng';
export { type VitalSigns } from './history';
export { type ReportEntry } from './report';
export { siteStatus, startFault, type Project, type SiteStatus } from './projects';
export {
  livingStandards,
  prosperityStatus,
  type LivingStandard,
  type ProsperityScores,
  type ProsperityStatus,
} from './prosperity';
export { settlementLook, settlementLooks, type SettlementLook } from './settlements';
export { expectationsIn, nextTier, tierAt, tierFrom, tierStatus, type TierStatus } from './tiers';
export { termRecords, type TermRecord } from './terms';
export { victoryStatus, type VictoryStatus } from './victory';
export { riskHorizonQuarters, risksAhead, type Risk } from './risks';
export {
  loadSave,
  SAVE_FORMAT_VERSION,
  SaveError,
  saveGame,
  type RestoredGame,
  type SavedGame,
  type SaveMigration,
} from './save';
export { siteTerms, type SiteTerms } from './sites';
export {
  siteSchedule,
  termCalendar,
  type SiteSchedule,
  type TermCalendar,
  type TermQuarter,
} from './timeline';
export { advanceQuarter, budgetLimits, createGame, describeEvent, previewQuarter } from './game';
export {
  type Decisions,
  type ElectionResult,
  type GameState,
  type Outcome,
  type Preview,
  type RegionShortfall,
  type RegionState,
  type ReliefDelivery,
  type TurnReport,
  type TurnResult,
} from './state';
export {
  formatCount,
  formatIndex,
  formatSignedIndex,
  formatMoney,
  formatPercent,
  formatPoints,
  formatQuarters,
  formatSignedPoints,
  formatTonnes,
  quartersWord,
} from './text';
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
  DILEMMA_TYPES,
  FOOD_STAGE_NAMES,
  FOOD_STAGES,
  LIKELIHOOD_NAMES,
  LIKELIHOODS,
  MAP_FRAME,
  PROSPERITY_PART_NAMES,
  PROSPERITY_PARTS,
  REPORT_KINDS,
  SERIOUSNESS_LEVELS,
  SERIOUSNESS_NAMES,
  SITE_STATE_NAMES,
  SITE_TYPE_NAMES,
  SPENDING_AREA_NAMES,
  SPENDING_AREAS,
  TIER_NAMES,
  TIERS,
  UNREST_KINDS,
  UNREST_NAMES,
  type ApprovalDriver,
  type DecorationKind,
  type DilemmaType,
  type EventType,
  type FoodStage,
  type LabelSide,
  type Likelihood,
  type ProjectStatus,
  type ProsperityPart,
  type ReportKind,
  type RiskKind,
  type Seriousness,
  type SettlementSize,
  type SiteForm,
  type SiteState,
  type SiteType,
  type SpendingArea,
  type Terrain,
  type Tier,
  type Unrest,
} from './vocabulary';
