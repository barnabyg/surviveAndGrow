/** Prosperity: the parts of a living standard, the tiers, and the lasting services. */

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

/** What each lasting service is called, in the middle of a sentence. */
export const LASTING_SERVICE_NAMES: Readonly<Record<LastingService, string>> = {
  health: 'health',
  education: 'education',
};

/** What spending on each lasting service is called, as a line of a breakdown. */
export const LASTING_SERVICE_SPENDING: Readonly<Record<LastingService, string>> = {
  health: 'Health spending',
  education: 'Education spending',
};

/**
 * What a site that raises a lasting service does, in a sentence the player can be shown:
 * `{service}` is the service and `{points}` how much higher its region's level settles.
 */
export const SERVICE_SITE_SENTENCE =
  'Its region’s {service} level builds up to {points} higher than {service} spending alone holds it, over the quarters it is in use.';
