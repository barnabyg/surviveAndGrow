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
 * The kinds of thing a turn report can tell the player. Each kind has its own icon in the
 * interface, so a new kind is added here and given an icon there.
 */
export const REPORT_KINDS = [
  'budget',
  'spendingCut',
  'harvest',
  'hunger',
  'event',
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
