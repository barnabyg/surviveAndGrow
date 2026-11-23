/** World price shocks: the kinds the engine knows. */

/**
 * The world price shocks the engine knows: events abroad that push one good's world price up
 * or down for a set time, announced ahead. A country file says how likely each is to be
 * announced in a quarter. Each is drawn from the seed and the quarter alone, in this order, so
 * a new kind goes at the end and leaves the others' draws as they were.
 */
export const PRICE_SHOCK_TYPES = ['failedHarvestsAbroad', 'oreGlut'] as const;
export type PriceShockType = (typeof PRICE_SHOCK_TYPES)[number];
