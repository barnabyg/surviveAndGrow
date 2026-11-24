/** The budget: the areas it can be spent on. */

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
  'defence',
  'upkeep',
] as const;
export type SpendingArea = (typeof SPENDING_AREAS)[number];

export const SPENDING_AREA_NAMES: Readonly<Record<SpendingArea, string>> = {
  agriculture: 'Agriculture',
  foodRelief: 'Food relief',
  health: 'Health',
  education: 'Education',
  security: 'Security',
  defence: 'Defence',
  upkeep: 'Upkeep',
};
