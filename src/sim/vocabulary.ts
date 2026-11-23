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

/**
 * The kinds of event the engine knows. A country file says how likely each is, region by
 * region. The events that begin in the same quarter share one roll in each region, taken in
 * this order (`rollEvents`), so a new kind goes at the end and leaves the others' strikes as
 * they were.
 */
export const EVENT_TYPES = ['drought', 'flood'] as const;
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

/**
 * The goods the world trades in, each with a price that moves every quarter. A country file
 * cannot add one: what each costs and how its price moves are balance values
 * (`balance.trade.goods`). Their order is the order their prices are drawn in, so a new good
 * goes at the end and leaves the others' draws as they were.
 */
export const GOODS = ['grain', 'ore'] as const;
export type Good = (typeof GOODS)[number];

export const GOOD_NAMES: Readonly<Record<Good, string>> = {
  grain: 'Grain',
  ore: 'Ore',
};

/**
 * The goods the player can order across the border. Ore is not among them: it is sold abroad
 * only by a mine's chain, at the world ore price.
 */
export const ORDERED_GOODS: readonly Good[] = ['grain'];

/**
 * Which way an order sends a good across the border. Bought abroad, it is imported; sold
 * abroad, it is exported.
 */
export const TRADE_DIRECTIONS = ['import', 'export'] as const;
export type TradeDirection = (typeof TRADE_DIRECTIONS)[number];

/**
 * The world price shocks the engine knows: events abroad that push one good's world price up
 * or down for a set time, announced ahead. A country file says how likely each is to be
 * announced in a quarter. Each is drawn from the seed and the quarter alone, in this order, so
 * a new kind goes at the end and leaves the others' draws as they were.
 */
export const PRICE_SHOCK_TYPES = ['failedHarvestsAbroad', 'oreGlut'] as const;
export type PriceShockType = (typeof PRICE_SHOCK_TYPES)[number];

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
  'powerStation',
  'powerLine',
  'dam',
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
 * The part a site plays in bringing power to the regions. A station makes it; a line carries
 * it to the region the line belongs to, from a station or from another line that leads to
 * one. A region is powered while a line in use links it to a station in use.
 */
export const POWER_ROLES = ['station', 'line'] as const;
export type PowerRole = (typeof POWER_ROLES)[number];

/**
 * What the engine knows of each type of site: its name, how it is laid out, the part it
 * plays in a chain, if any, and in bringing power, if any, and the technology that unlocks
 * it, if one must be known before a site of the type can be started. What it costs and what
 * it does are balance values (`balance.sites`), so a type is added here and there and in no
 * rule.
 */
export const SITE_TYPE_DEFINITIONS: Readonly<
  Record<
    SiteType,
    {
      readonly name: string;
      /** The name of several, as a technology that improves them all speaks of them. */
      readonly plural: string;
      readonly form: SiteForm;
      readonly chainRole: ChainRole | null;
      readonly powerRole: PowerRole | null;
      readonly unlockedBy: Technology | null;
    }
  >
> = {
  irrigation: {
    name: 'Irrigation scheme',
    plural: 'Irrigation schemes',
    form: 'place',
    chainRole: null,
    powerRole: null,
    unlockedBy: null,
  },
  farmRoad: {
    name: 'Farm road',
    plural: 'Farm roads',
    form: 'route',
    chainRole: null,
    powerRole: null,
    unlockedBy: null,
  },
  grainStore: {
    name: 'Grain store',
    plural: 'Grain stores',
    form: 'place',
    chainRole: null,
    powerRole: null,
    unlockedBy: null,
  },
  mine: {
    name: 'Mine',
    plural: 'Mines',
    form: 'place',
    chainRole: 'source',
    powerRole: null,
    unlockedBy: null,
  },
  trunkRoad: {
    name: 'Trunk road',
    plural: 'Trunk roads',
    form: 'route',
    chainRole: 'link',
    powerRole: null,
    unlockedBy: null,
  },
  port: {
    name: 'Port',
    plural: 'Ports',
    form: 'place',
    chainRole: 'outlet',
    powerRole: null,
    unlockedBy: null,
  },
  shallowPort: {
    name: 'Shallow port',
    plural: 'Shallow ports',
    form: 'place',
    chainRole: 'outlet',
    powerRole: null,
    unlockedBy: null,
  },
  powerStation: {
    name: 'Power station',
    plural: 'Power stations',
    form: 'place',
    chainRole: null,
    powerRole: 'station',
    unlockedBy: null,
  },
  powerLine: {
    name: 'Power line',
    plural: 'Power lines',
    form: 'route',
    chainRole: null,
    powerRole: 'line',
    unlockedBy: null,
  },
  // A power station that also steadies its own region's harvest, as irrigation does. It is
  // unlocked by research.
  dam: {
    name: 'Dam',
    plural: 'Dams',
    form: 'place',
    chainRole: null,
    powerRole: 'station',
    unlockedBy: 'hydropower',
  },
};

/**
 * What a site in each part of a chain does, in a sentence the player can be shown.
 * `{tonnes}` is the ore it produces or carries a quarter, and `{money}` what that ore is worth
 * at the usual world ore price.
 */
export const CHAIN_ROLE_SENTENCES: Readonly<Record<ChainRole, string>> = {
  source:
    'Ships {tonnes} of ore a quarter, worth {money} at the usual world ore price, to add to its region’s output, but only while its chain to a port is complete.',
  link: 'Carries up to {tonnes} of a mine’s ore a quarter along its chain.',
  outlet:
    'Ships up to {tonnes} a quarter across the border: a mine’s ore first, and grain bought or sold abroad in what is left.',
};

/**
 * What a site in each part of bringing power does, in a sentence the player can be shown.
 * `{percent}` is what a powered region's output rises by and `{points}` what its
 * infrastructure access gains.
 */
export const POWER_ROLE_SENTENCES: Readonly<Record<PowerRole, string>> = {
  station:
    'Powers each region a power line links to it: the region produces {percent} more and gains {points} of infrastructure access.',
  line: 'Brings power from a power station to its region: the region produces {percent} more and gains {points} of infrastructure access.',
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

export const SITE_POWER_ROLES: Readonly<Record<SiteType, PowerRole | null>> = Object.fromEntries(
  SITE_TYPES.map((type) => [type, SITE_TYPE_DEFINITIONS[type].powerRole]),
) as Record<SiteType, PowerRole | null>;

/**
 * The things a site in use, or a technology known, can lessen. A site's or a technology's
 * effect leaves a share, in thousandths, of one of them; several bearing on the same thing
 * multiply together.
 */
export const SITE_EFFECTS = [
  'harvestWeather',
  'transportLoss',
  'reserveSpoilage',
  'weatherAndDrought',
] as const;
export type SiteEffect = (typeof SITE_EFFECTS)[number];

/**
 * Where each effect falls, and the sentences that tell the player what it does: `sentence`
 * for a site, which bears on the region it belongs to or on the whole nation, and
 * `everywhere` for a technology, which bears on every region at once. `{percent}` is what
 * the site or technology takes off.
 */
export const SITE_EFFECT_DEFINITIONS: Readonly<
  Record<
    SiteEffect,
    {
      readonly reach: 'region' | 'nation';
      readonly sentence: string;
      readonly everywhere: string;
      /**
       * What a technology that improves a type of site's effect does, for `{sites}`, the
       * types it improves, with `{percent}` what it takes off what the site leaves.
       */
      readonly improved: string;
    }
  >
> = {
  harvestWeather: {
    reach: 'region',
    sentence: 'Weather, drought and flood move its region’s harvest {percent}% less.',
    everywhere: 'Weather, drought and flood move every region’s harvest {percent}% less.',
    improved:
      '{sites} hold back a further {percent}% of how far weather, drought and flood move their region’s harvest.',
  },
  transportLoss: {
    reach: 'region',
    sentence: '{percent}% less of its region’s surplus is lost on the way to the national reserve.',
    everywhere:
      '{percent}% less of every region’s surplus is lost on the way to the national reserve.',
    improved:
      '{sites} save a further {percent}% of the surplus their region loses on the way to the national reserve.',
  },
  reserveSpoilage: {
    reach: 'nation',
    sentence: '{percent}% less of the national reserve spoils each quarter.',
    everywhere: '{percent}% less of the national reserve spoils each quarter.',
    improved: '{sites} save a further {percent}% of what spoils in the national reserve.',
  },
  weatherAndDrought: {
    reach: 'region',
    sentence: 'Weather and drought move its region’s harvest {percent}% less.',
    everywhere: 'Weather and drought move every region’s harvest {percent}% less.',
    improved:
      '{sites} hold back a further {percent}% of how far weather and drought move their region’s harvest.',
  },
};

/**
 * What a technology that improves what a type of site carries or brings does, in a sentence
 * the player can be shown: `{sites}` names the types it improves and `{percent}` what it adds.
 * What one that improves a site's effect does is the effect's own (`SITE_EFFECT_DEFINITIONS`).
 */
export const IMPROVEMENT_SENTENCES = {
  capacity:
    '{sites} carry {percent}% more, so a chain they hold back ships more ore and a port carries more across the border.',
  power:
    '{sites} do {percent}% more for each region their power reaches: it gains more output and more infrastructure access.',
} as const;

/**
 * The effects that lessen how far the weather moves a region's harvest. What lessens an
 * event's hold on the harvest is the event's own (`balance.events`).
 */
export const WEATHER_HELD_BY: readonly SiteEffect[] = ['harvestWeather', 'weatherAndDrought'];

/**
 * The technologies the engine knows, in the order the research tab shows them. A country file
 * cannot add one. What each costs, how long it takes to research and what it does once known
 * are balance values (`balance.technologies`); a technology is added here and there and in no
 * rule.
 */
export const TECHNOLOGIES = [
  'droughtResistantSeed',
  'improvedIrrigation',
  'coldStorage',
  'roadEngineering',
  'gridEfficiency',
  'hydropower',
] as const;
export type Technology = (typeof TECHNOLOGIES)[number];

/**
 * What the engine knows of each technology: its name, and the technologies that must be known
 * before it can be researched. Together the prerequisites make the technology tree.
 */
export const TECHNOLOGY_DEFINITIONS: Readonly<
  Record<
    Technology,
    {
      readonly name: string;
      readonly prerequisites: readonly Technology[];
    }
  >
> = {
  droughtResistantSeed: { name: 'Drought-resistant seed', prerequisites: [] },
  improvedIrrigation: { name: 'Improved irrigation', prerequisites: ['droughtResistantSeed'] },
  coldStorage: { name: 'Cold storage', prerequisites: ['droughtResistantSeed'] },
  roadEngineering: { name: 'Road engineering', prerequisites: ['improvedIrrigation'] },
  gridEfficiency: { name: 'Grid efficiency', prerequisites: ['coldStorage'] },
  hydropower: { name: 'Hydropower', prerequisites: ['improvedIrrigation', 'gridEfficiency'] },
};

/**
 * How a technology stands in the tree: known; being researched, or paused for want of money;
 * planned to be started as the quarter ends; available, its prerequisites known; or locked
 * until they are.
 */
export const TECHNOLOGY_STATES = [
  'known',
  'researching',
  'paused',
  'planned',
  'available',
  'locked',
] as const;
export type TechnologyState = (typeof TECHNOLOGY_STATES)[number];

export const TECHNOLOGY_STATE_NAMES: Readonly<Record<TechnologyState, string>> = {
  known: 'Known',
  researching: 'Being researched',
  paused: 'Paused',
  planned: 'Planned',
  available: 'Available',
  locked: 'Locked',
};

/**
 * How a project stands: being built, held up for want of money, or finished. A site, once
 * built, is in use: operating while its upkeep is paid and decaying while it is not. A
 * technology, once researched, is known. A region, once its survey is done, is surveyed.
 */
export const PROJECT_STATUSES = [
  'building',
  'paused',
  'operating',
  'decaying',
  'known',
  'surveyed',
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

/**
 * What a project can be for: a site, built on, a technology, researched, or a region,
 * surveyed. A kind added here is a project's target of its own in `projects.ts`, and a
 * save-format change.
 */
export const PROJECT_TARGET_KINDS = ['site', 'technology', 'survey'] as const;
export type ProjectTargetKind = (typeof PROJECT_TARGET_KINDS)[number];

/**
 * How a finished project of each kind stands: a site operating, from which it may decay, a
 * technology known and a region surveyed.
 */
export const PROJECT_TARGET_FINISHED = {
  site: 'operating',
  technology: 'known',
  survey: 'surveyed',
} as const satisfies Readonly<Record<ProjectTargetKind, ProjectStatus>>;

/**
 * How the report and the treasury's breakdown speak of a project of each kind: the headline
 * of each report entry, the work it is ("2 of its 3 quarters of building"), what it is for
 * ("the site"), what finishing it is ("the 3 quarters it takes to build"), what a quarter
 * without money did, what finishing means, the line it pays in the treasury's breakdown
 * ("Building Lowmere irrigation"), and the kinds of report its entries are.
 */
export interface ProjectWords {
  readonly begins: string;
  readonly resumes: string;
  readonly paused: string;
  readonly finished: string;
  readonly work: string;
  readonly subject: string;
  readonly toFinish: string;
  readonly idle: string;
  readonly finishedCause: string;
  readonly paying: string;
  readonly reportKinds: {
    readonly started: ReportKind;
    readonly paused: ReportKind;
    readonly finished: ReportKind;
  };
}

export const PROJECT_TARGET_WORDS: Readonly<Record<ProjectTargetKind, ProjectWords>> = {
  site: {
    begins: 'Building begins',
    resumes: 'Building resumes',
    paused: 'Paused',
    finished: 'Finished',
    work: 'building',
    subject: 'the site',
    toFinish: 'to build',
    idle: 'nothing was built this quarter',
    finishedCause: 'It is in use from next quarter.',
    paying: 'Building',
    reportKinds: {
      started: 'projectStarted',
      paused: 'projectPaused',
      finished: 'projectCompleted',
    },
  },
  technology: {
    begins: 'Research begins',
    resumes: 'Research resumes',
    paused: 'Research paused',
    finished: 'Research finished',
    work: 'research',
    subject: 'the technology',
    toFinish: 'to research',
    idle: 'no research was done this quarter',
    finishedCause: 'It is known from next quarter.',
    paying: 'Researching',
    reportKinds: {
      started: 'researchStarted',
      paused: 'researchPaused',
      finished: 'researchCompleted',
    },
  },
  survey: {
    begins: 'Survey begins',
    resumes: 'Survey resumes',
    paused: 'Survey paused',
    finished: 'Survey finished',
    work: 'surveying',
    subject: 'the region',
    toFinish: 'to survey',
    idle: 'no surveying was done this quarter',
    finishedCause: 'The surveyors have reported.',
    paying: 'Surveying',
    reportKinds: {
      started: 'surveyStarted',
      paused: 'surveyPaused',
      finished: 'surveyCompleted',
    },
  },
};

/**
 * How a region stands for a survey: no deposit could lie there, so there is nothing to
 * survey; not yet surveyed; planned to be surveyed as the quarter ends; being surveyed, or
 * paused for want of money; or surveyed, once and for all.
 */
export const SURVEY_STATES = [
  'barren',
  'unsurveyed',
  'planned',
  'surveying',
  'paused',
  'surveyed',
] as const;
export type SurveyState = (typeof SURVEY_STATES)[number];

export const SURVEY_STATE_NAMES: Readonly<Record<SurveyState, string>> = {
  barren: 'Nothing to survey',
  unsurveyed: 'Not surveyed',
  planned: 'Planned',
  surveying: 'Being surveyed',
  paused: 'Paused',
  surveyed: 'Surveyed',
};

/**
 * How a site stands: empty until a project is started on it, and then as the project stands.
 * A site no project has been started on is closed once one has been started on one of its
 * alternatives, and can then never be built. One that needs a technology not yet known is
 * locked until it is, and is then empty like any other.
 */
export const SITE_STATES = [
  'empty',
  'locked',
  'closed',
  'building',
  'paused',
  'operating',
  'decaying',
] as const;
export type SiteState = (typeof SITE_STATES)[number];

export const SITE_STATE_NAMES: Readonly<Record<SiteState, string>> = {
  empty: 'Empty',
  locked: 'Locked',
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
export const RISK_KINDS = [
  'famine',
  'event',
  'priceShock',
  'reserve',
  'treasury',
  'bailout',
  'bondMaturity',
  'creditRating',
  'upkeep',
  'strikes',
  'tier',
  'election',
] as const;
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
  'researchStarted',
  'researchPaused',
  'researchCompleted',
  'surveyStarted',
  'surveyPaused',
  'surveyCompleted',
  'siteDecaying',
  'siteRestored',
  'loanTaken',
  'loanRepaid',
  'trade',
  'priceShock',
  'bailout',
  'missedPayment',
  'austerity',
  'creditRating',
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

/**
 * The kinds of debt the nation can owe. A loan is repaid in equal quarterly repayments of
 * interest and principal over its term. A bond pays only interest each quarter, and the
 * whole sum at maturity. A bailout loan is never borrowed: it is what a missed payment turns
 * everything owed into, repaid like a loan on the lenders' terms.
 */
export const DEBT_KINDS = ['loan', 'bond', 'bailout'] as const;
export type DebtKind = (typeof DEBT_KINDS)[number];

/**
 * How a debt is repaid: level, in equal repayments of interest and principal, or interest
 * alone until everything owed falls due at maturity.
 */
export const DEBT_SCHEDULES = ['level', 'atMaturity'] as const;
export type DebtSchedule = (typeof DEBT_SCHEDULES)[number];

export const DEBT_KIND_NAMES: Readonly<Record<DebtKind, string>> = {
  loan: 'Loan',
  bond: 'Bond',
  bailout: 'Bailout loan',
};

/**
 * The steps of the nation's credit rating, from the worst to the best. The rating sets the
 * rate new debt is taken at and the most that may be owed.
 */
export const CREDIT_RATINGS = ['b', 'bb', 'bbb', 'a', 'aa'] as const;
export type CreditRating = (typeof CREDIT_RATINGS)[number];

export const CREDIT_RATING_NAMES: Readonly<Record<CreditRating, string>> = {
  b: 'B',
  bb: 'BB',
  bbb: 'BBB',
  a: 'A',
  aa: 'AA',
};
