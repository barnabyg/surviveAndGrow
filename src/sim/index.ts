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
export { missedPaymentMeans } from './bailout';
export {
  austerityStatus,
  borrowingBarred,
  budgetBounds,
  buildingBarred,
  withinAusterity,
  type Austerity,
  type AusterityStatus,
  type BudgetBounds,
} from './austerity';
export {
  pendingDilemma,
  type AnsweredDilemma,
  type DilemmaOptionView,
  type DilemmaView,
  type PendingDilemma,
} from './dilemmas';
export {
  creditRules,
  creditStatus,
  bondRateSpan,
  loanRateSpan,
  ratedAtLeast,
  ratingRank,
  type Credit,
  type CreditStatus,
  type CreditStep,
} from './credit';
export {
  bondOffers,
  bondsClosedBecause,
  bondsOpenTo,
  debtName,
  debtStatus,
  formatRate,
  loanOffers,
  maturityOf,
  maturityOfTaking,
  paysAtMaturity,
  type Borrowing,
  type Debt,
  type DebtStatus,
  type LoanOffer,
  type LoanTerms,
  type StartingLoan,
} from './debt';
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
export {
  chainOf,
  chains,
  chainsThrough,
  oreEarnings,
  type Chain,
  type ChainLink,
  type OreEarnings,
} from './chains';
export { oreTonnesOf } from './sites';
export { siteStatus, startFault, type Project, type SiteStatus } from './projects';
export { regionPower, type RegionPower } from './power';
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
export { victoryStatus, type DebtTest, type VictoryStatus } from './victory';
export { riskHorizonQuarters, risksAhead, type Risk } from './risks';
export { SAVE_FORMAT_VERSION, type SaveMigration } from './migrations';
export { loadSave, saveGame, type RestoredGame, type SavedGame } from './save';
export { SaveError } from './saveChecks';
export { siteTerms, type SiteTerms } from './sites';
export { DECAYING_SHARE, isInUseState, UPKEEP_ORDER_RULE } from './upkeep';
export {
  bondMaturities,
  siteSchedule,
  termCalendar,
  type Maturity,
  type SiteSchedule,
  type TermCalendar,
  type TermQuarter,
} from './timeline';
export {
  belowSafeAfterExport,
  costOf,
  EXPORT_MARGIN_PERMILLE,
  exportTerms,
  forecastSpan,
  formatPrice,
  importTerms,
  ORDER_STEP_TONNES,
  plannedExport,
  plannedImport,
  priceStatus,
  type ExportTerms,
  type ImportTerms,
  type PriceStatus,
  type TradeOrder,
  type WorldPrices,
} from './trade';
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
  type TradePreview,
  type TurnReport,
  type TurnResult,
  type UpkeepPreview,
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
  CHAIN_ROLES,
  CREDIT_RATING_NAMES,
  CREDIT_RATINGS,
  DEBT_KIND_NAMES,
  DEBT_KINDS,
  DEBT_SCHEDULES,
  DILEMMA_TYPES,
  FOOD_STAGE_NAMES,
  FOOD_STAGES,
  GOOD_NAMES,
  GOODS,
  ORDERED_GOODS,
  LIKELIHOOD_NAMES,
  LIKELIHOODS,
  MAP_FRAME,
  PROSPERITY_PART_NAMES,
  PROSPERITY_PARTS,
  REPORT_KINDS,
  SERIOUSNESS_LEVELS,
  SERIOUSNESS_NAMES,
  SITE_CHAIN_ROLES,
  SITE_POWER_ROLES,
  SITE_STATE_NAMES,
  SITE_TYPE_NAMES,
  SPENDING_AREA_NAMES,
  SPENDING_AREAS,
  TIER_NAMES,
  TIERS,
  UNREST_KINDS,
  UNREST_NAMES,
  type ApprovalDriver,
  type ChainRole,
  type CreditRating,
  type DebtKind,
  type DebtSchedule,
  type DecorationKind,
  type DilemmaType,
  type EventType,
  type FoodStage,
  type Good,
  type LabelSide,
  type Likelihood,
  type PowerRole,
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
  type TradeDirection,
  type Unrest,
} from './vocabulary';
