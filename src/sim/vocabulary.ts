/**
 * The engine's closed vocabulary. A country file picks from these lists and cannot add to them.
 */

/** Every country's map is drawn in this fixed frame, which has a 3:2 aspect ratio. */
export const MAP_FRAME = { width: 1080, height: 720 } as const;

export const TERRAINS = ['plains', 'highlands', 'coast', 'arid', 'delta', 'valley'] as const;
export type Terrain = (typeof TERRAINS)[number];

export const DECORATION_KINDS = ['mountain', 'dune', 'field'] as const;
export type DecorationKind = (typeof DECORATION_KINDS)[number];

export const SETTLEMENT_SIZES = ['town', 'village'] as const;
export type SettlementSize = (typeof SETTLEMENT_SIZES)[number];

export const LABEL_SIDES = ['right', 'left', 'above', 'below'] as const;
export type LabelSide = (typeof LABEL_SIDES)[number];

/** Where the budget can be spent. Each area costs money; what it buys is that area's own rule. */
export const SPENDING_AREAS = [
  'agriculture',
  'foodRelief',
  'health',
  'education',
  'security',
] as const;
export type SpendingArea = (typeof SPENDING_AREAS)[number];

export const SPENDING_AREA_NAMES: Readonly<Record<SpendingArea, string>> = {
  agriculture: 'Agriculture',
  foodRelief: 'Food relief',
  health: 'Health',
  education: 'Education',
  security: 'Security',
};

/** The kinds of event the engine knows. A country file says how likely each is, region by region. */
export const EVENT_TYPES = ['drought'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

/**
 * The dilemmas the engine knows: events that put a choice to the player. A country file
 * says how likely each is to arise.
 */
export const DILEMMA_TYPES = [
  'grainOffer',
  'merchantOffer',
  'emergencyWorks',
  'strikeTalks',
  'teachersPay',
  'donorGrant',
] as const;
export type DilemmaType = (typeof DILEMMA_TYPES)[number];

/**
 * The kinds of place a dilemma can concern. The region is chosen from the state of the game
 * by the kind, never by name: one an event has struck, or one that is striking or protesting.
 */
export const DILEMMA_PLACES = ['struckByEvent', 'inUnrest'] as const;
export type DilemmaPlace = (typeof DILEMMA_PLACES)[number];

/** The kinds of thing that can be built. A country file says where each could stand. */
export const SITE_TYPES = ['irrigation', 'farmRoad', 'grainStore'] as const;
export type SiteType = (typeof SITE_TYPES)[number];

export const SITE_TYPE_NAMES: Readonly<Record<SiteType, string>> = {
  irrigation: 'Irrigation scheme',
  farmRoad: 'Farm road',
  grainStore: 'Grain store',
};

/** A site either stands in one place or runs along a route. Its type decides which. */
export type SiteForm = 'place' | 'route';

export const SITE_FORMS: Readonly<Record<SiteType, SiteForm>> = {
  irrigation: 'place',
  farmRoad: 'route',
  grainStore: 'place',
};

/** How a project stands: being built, held up for want of money, or built and in use. */
export const PROJECT_STATUSES = ['building', 'paused', 'operating'] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

/** How a site stands: empty until a project is started on it, and then as the project stands. */
export const SITE_STATES = ['empty', ...PROJECT_STATUSES] as const;
export type SiteState = (typeof SITE_STATES)[number];

export const SITE_STATE_NAMES: Readonly<Record<SiteState, string>> = {
  empty: 'Empty',
  building: 'Under construction',
  paused: 'Paused',
  operating: 'Operating',
};

/** The stages of a region's food situation, from the best to the worst. */
export const FOOD_STAGES = ['adequate', 'tight', 'shortage', 'famine'] as const;
export type FoodStage = (typeof FOOD_STAGES)[number];

export const FOOD_STAGE_NAMES: Readonly<Record<FoodStage, string>> = {
  adequate: 'Adequate',
  tight: 'Tight',
  shortage: 'Shortage',
  famine: 'Famine',
};

/**
 * What moves approval. Food is each region's own; the tax rate and the spending areas that
 * serve the public bear on every region alike; events are one-off pushes that fade.
 */
export const APPROVAL_DRIVERS = [
  'food',
  'tax',
  'health',
  'education',
  'security',
  'events',
] as const;
export type ApprovalDriver = (typeof APPROVAL_DRIVERS)[number];

export const APPROVAL_DRIVER_NAMES: Readonly<Record<ApprovalDriver, string>> = {
  food: 'Food',
  tax: 'Tax rate',
  health: 'Health spending',
  education: 'Education spending',
  security: 'Security spending',
  events: 'Events',
};

/** How far a region's discontent has gone, from none to the worst. */
export const UNREST_LEVELS = ['calm', 'strikes', 'protests'] as const;
export type Unrest = (typeof UNREST_LEVELS)[number];

export const UNREST_NAMES: Readonly<Record<Unrest, string>> = {
  calm: 'Calm',
  strikes: 'Strikes',
  protests: 'Protests',
};

/** The dangers the game looks ahead for. A list of risks is in this order where nothing else decides. */
export const RISK_KINDS = ['famine', 'treasury', 'strikes'] as const;
export type RiskKind = (typeof RISK_KINDS)[number];

/** How likely a risk is, from the least to the most. A risk less likely than remote is not listed. */
export const LIKELIHOODS = ['remote', 'unlikely', 'possible', 'likely', 'almostCertain'] as const;
export type Likelihood = (typeof LIKELIHOODS)[number];

export const LIKELIHOOD_NAMES: Readonly<Record<Likelihood, string>> = {
  remote: 'Remote',
  unlikely: 'Unlikely',
  possible: 'Possible',
  likely: 'Likely',
  almostCertain: 'Almost certain',
};

/**
 * The kinds of thing a turn report can tell the player. Each kind has its own icon in the
 * interface, so a new kind is added here and given an icon there.
 */
export const REPORT_KINDS = [
  'budget',
  'spendingCut',
  'harvest',
  'hunger',
  'event',
  'strike',
  'protest',
  'projectStarted',
  'projectPaused',
  'projectCompleted',
  'dilemma',
  'election',
  'collapse',
  'quiet',
] as const;
export type ReportKind = (typeof REPORT_KINDS)[number];

/** How serious a report is, from the least to the most. A turn report leads with the most serious. */
export const SERIOUSNESS_LEVELS = ['routine', 'notable', 'warning', 'serious', 'critical'] as const;
export type Seriousness = (typeof SERIOUSNESS_LEVELS)[number];

export const SERIOUSNESS_NAMES: Readonly<Record<Seriousness, string>> = {
  routine: 'Routine',
  notable: 'Notable',
  warning: 'Warning',
  serious: 'Serious',
  critical: 'Critical',
};
