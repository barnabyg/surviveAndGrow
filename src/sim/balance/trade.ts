import type { Good } from '../vocabulary';

/**
 * How the world price of one good moves. Prices are in whole dollars a tonne. Each quarter the
 * price closes `revertPermillePerQuarter` thousandths of the gap to its usual level, and world
 * markets then move it by up to `swingPermillePerQuarter` thousandths of the usual level either
 * way, by the seed; it never leaves the range from `lowest` to `highest`.
 */
export interface GoodBalance {
  readonly usualDollarsPerTonne: number;
  readonly lowestDollarsPerTonne: number;
  readonly highestDollarsPerTonne: number;
  readonly swingPermillePerQuarter: number;
  readonly revertPermillePerQuarter: number;
}

/**
 * `balance.trade`: how the world price of each good moves, how grain is ordered and sold, and
 * what a border crossing may carry.
 */
export const tradeBalance = {
  /**
   * Trade with the world. Each good has a world price that moves every quarter. Grain can be
   * ordered for the national reserve: it arrives, and is paid for at the price of the quarter
   * it was ordered in, as that quarter ends. Grain can be sold from the reserve at that price
   * less the export margin. Ore is sold abroad by a mine's chain, at the world ore price.
   */
  trade: {
    goods: {
      // The usual price is what the neighbour's grain cost when its price was fixed: $2.4m for
      // a fifth of what a million people eat in a quarter.
      grain: {
        usualDollarsPerTonne: 240,
        lowestDollarsPerTonne: 150,
        highestDollarsPerTonne: 420,
        swingPermillePerQuarter: 125,
        revertPermillePerQuarter: 250,
      },
      // Ore is what a mine's chain ships abroad. Its usual price makes a chain's capacities,
      // which are counted in Money at that price, a round number of tonnes. It swings further
      // than grain, so a country that lives on its mine lives with a riskier income.
      ore: {
        usualDollarsPerTonne: 100,
        lowestDollarsPerTonne: 45,
        highestDollarsPerTonne: 190,
        swingPermillePerQuarter: 150,
        revertPermillePerQuarter: 200,
      },
    } satisfies Record<Good, GoodBalance>,
    /** An order is for a whole number of these tonnes. */
    orderStepTonnes: 1000,
    /**
     * Grain sold abroad fetches the world price less this many thousandths of it, for the
     * shipping and the traders' cut, so that selling fetches less than buying costs.
     */
    exportMarginPermille: 200,
    /** How many quarters ahead the forecast range of a price looks, counting the next. */
    forecastQuarters: 4,
    /**
     * Border crossings, which a country file names, each with the grain it carries across the
     * border in a quarter: a whole number of order steps from `leastTonnes` to `mostTonnes`,
     * small beside a port. A file of a format older than 5 cannot name them, and is read as
     * having one crossing on each neighbour carrying `unlistedTonnes`.
     */
    crossings: {
      leastTonnes: 1000,
      mostTonnes: 100_000,
      unlistedTonnes: 45_000,
    },
  },
} as const;
