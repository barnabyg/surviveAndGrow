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

/**
 * Where the budget can be spent. Each area costs money; what it buys is that area's own rule.
 * Upkeep is spent only as far as the sites in use need it: what is set beyond that stays in
 * the treasury.
 */
export const SPENDING_AREAS = [
  'agriculture',
  'foodRelief',
  'health',
  'education',
  'security',
  'upkeep',
] as const;
export type SpendingArea = (typeof SPENDING_AREAS)[number];

export const SPENDING_AREA_NAMES: Readonly<Record<SpendingArea, string>> = {
  agriculture: 'Agriculture',
  foodRelief: 'Food relief',
  health: 'Health',
  education: 'Education',
  security: 'Security',
  upkeep: 'Upkeep',
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

/** The kinds of effect a dilemma's option can have on the country. */
export const DILEMMA_EFFECT_KINDS = ['treasury', 'reserve', 'regionGrain', 'approval'] as const;

/** How a game stands: still being played, or ended in a win or a loss. */
export const OUTCOME_STATUSES = ['playing', 'won', 'lost'] as const;

/** The ways a game can end. */
export const ENDING_CAUSES = ['famine', 'election', 'prosperity'] as const;

/** The kinds of thing that can be built. A country file says where each could stand. */
export const SITE_TYPES = [
  'irrigation',
  'farmRoad',
  'grainStore',
  'mine',
  'trunkRoad',
  'port',
  'shallowPort',
] as const;
export type SiteType = (typeof SITE_TYPES)[number];

/** A site either stands in one place or runs along a route. Its type decides which. */
export type SiteForm = 'place' | 'route';

/**
 * The part a site plays in a chain. A source produces output, but only while every site it
 * depends on, directly or through others, is in use; a link carries that output on; an
 * outlet ships it out. A source's chain must lead to an outlet. What each can produce or
 * carry is a balance value (`capacity`), and the least of them is what the chain yields.
 */
export const CHAIN_ROLES = ['source', 'link', 'outlet'] as const;
export type ChainRole = (typeof CHAIN_ROLES)[number];

/**
 * What the engine knows of each type of site: its name, how it is laid out and the part it
 * plays in a chain, if any. What it costs and what it does are balance values
 * (`balance.sites`), so a type is added here and there and in no rule.
 */
export const SITE_TYPE_DEFINITIONS: Readonly<
  Record<
    SiteType,
    { readonly name: string; readonly form: SiteForm; readonly chainRole: ChainRole | null }
  >
> = {
  irrigation: { name: 'Irrigation scheme', form: 'place', chainRole: null },
  farmRoad: { name: 'Farm road', form: 'route', chainRole: null },
  grainStore: { name: 'Grain store', form: 'place', chainRole: null },
  mine: { name: 'Mine', form: 'place', chainRole: 'source' },
  trunkRoad: { name: 'Trunk road', form: 'route', chainRole: 'link' },
  port: { name: 'Port', form: 'place', chainRole: 'outlet' },
  shallowPort: { name: 'Shallow port', form: 'place', chainRole: 'outlet' },
};

/**
 * What a site in each part of a chain does, in a sentence the player can be shown.
 * `{money}` is what it produces or carries a quarter.
 */
export const CHAIN_ROLE_SENTENCES: Readonly<Record<ChainRole, string>> = {
  source:
    'Adds {money} a quarter to its region’s output, but only while its chain to a port is complete.',
  link: 'Carries up to {money} a quarter of a mine’s output along its chain.',
  outlet: 'Ships up to {money} a quarter of a mine’s output.',
};

export const SITE_TYPE_NAMES: Readonly<Record<SiteType, string>> = Object.fromEntries(
  SITE_TYPES.map((type) => [type, SITE_TYPE_DEFINITIONS[type].name]),
) as Record<SiteType, string>;

export const SITE_FORMS: Readonly<Record<SiteType, SiteForm>> = Object.fromEntries(
  SITE_TYPES.map((type) => [type, SITE_TYPE_DEFINITIONS[type].form]),
) as Record<SiteType, SiteForm>;

export const SITE_CHAIN_ROLES: Readonly<Record<SiteType, ChainRole | null>> = Object.fromEntries(
  SITE_TYPES.map((type) => [type, SITE_TYPE_DEFINITIONS[type].chainRole]),
) as Record<SiteType, ChainRole | null>;

/**
 * The things a site in use can lessen. A site's effect leaves a share, in thousandths, of
 * one of them; several sites bearing on the same thing multiply together.
 */
export const SITE_EFFECTS = ['harvestWeather', 'transportLoss', 'reserveSpoilage'] as const;
export type SiteEffect = (typeof SITE_EFFECTS)[number];

/**
 * Where each effect falls: on the region the site belongs to, or on the whole nation, and
 * the sentence that tells the player what it does. `{percent}` is what the site takes off.
 */
export const SITE_EFFECT_DEFINITIONS: Readonly<
  Record<SiteEffect, { readonly reach: 'region' | 'nation'; readonly sentence: string }>
> = {
  harvestWeather: {
    reach: 'region',
    sentence: 'Weather and drought move its region’s harvest {percent}% less.',
  },
  transportLoss: {
    reach: 'region',
    sentence: '{percent}% less of its region’s surplus is lost on the way to the national reserve.',
  },
  reserveSpoilage: {
    reach: 'nation',
    sentence: '{percent}% less of the national reserve spoils each quarter.',
  },
};

/**
 * How a project stands: being built, held up for want of money, or built and in use. A site
 * in use is operating while its upkeep is paid and decaying while it is not.
 */
export const PROJECT_STATUSES = ['building', 'paused', 'operating', 'decaying'] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

/**
 * How a site stands: empty until a project is started on it, and then as the project stands.
 * A site no project has been started on is closed once one has been started on one of its
 * alternatives, and can then never be built.
 */
export const SITE_STATES = ['empty', 'closed', ...PROJECT_STATUSES] as const;
export type SiteState = (typeof SITE_STATES)[number];

export const SITE_STATE_NAMES: Readonly<Record<SiteState, string>> = {
  empty: 'Empty',
  closed: 'Closed',
  building: 'Under construction',
  paused: 'Paused',
  operating: 'Operating',
  decaying: 'Decaying',
};

/**
 * The parts a region's living standard is built from. National prosperity is the regions'
 * living standards averaged by population, and is built from the same parts.
 */
export const PROSPERITY_PARTS = [
  'food',
  'income',
  'health',
  'education',
  'infrastructure',
] as const;
export type ProsperityPart = (typeof PROSPERITY_PARTS)[number];

export const PROSPERITY_PART_NAMES: Readonly<Record<ProsperityPart, string>> = {
  food: 'Food security',
  income: 'Income per head',
  health: 'Health',
  education: 'Education',
  infrastructure: 'Infrastructure access',
};

/** The tiers prosperity is divided into, from the lowest. The last is the win target. */
export const TIERS = ['subsistence', 'developing', 'industrialising', 'prosperous'] as const;
export type Tier = (typeof TIERS)[number];

export const TIER_NAMES: Readonly<Record<Tier, string>> = {
  subsistence: 'Subsistence',
  developing: 'Developing',
  industrialising: 'Industrialising',
  prosperous: 'Prosperous',
};

/** The public services whose level in each region lasts, built up by spending over time. */
export const LASTING_SERVICES = ['health', 'education'] as const;
export type LastingService = (typeof LASTING_SERVICES)[number];

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

/** The kinds of unrest a region can be in, the milder first. */
export const UNREST_KINDS = ['strikes', 'protests'] as const;

/** How far a region's discontent has gone, from none to the worst. */
export const UNREST_LEVELS = ['calm', ...UNREST_KINDS] as const;
export type Unrest = (typeof UNREST_LEVELS)[number];

export const UNREST_NAMES: Readonly<Record<Unrest, string>> = {
  calm: 'Calm',
  strikes: 'Strikes',
  protests: 'Protests',
};

/** The dangers the game looks ahead for. A list of risks is in this order where nothing else decides. */
export const RISK_KINDS = ['famine', 'treasury', 'upkeep', 'strikes', 'tier', 'election'] as const;
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
  'siteDecaying',
  'siteRestored',
  'dilemma',
  'tier',
  'election',
  'collapse',
  'victory',
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
