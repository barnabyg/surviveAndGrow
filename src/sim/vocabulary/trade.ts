/** Trade: the goods the world trades in, and the ways an order can go. */

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
