import type { PriceShockDefinition } from '../priceShocks';
import type { PriceShockType } from '../vocabulary';

/** `balance.priceShocks`: each world price shock, its push on a price and its timing. */
export const priceShocksBalance = {
  /**
   * World price shocks: events abroad that push one good's world price each quarter they are
   * in force, on top of what markets do, by a share of its usual price in thousandths. Each is
   * announced `noticeQuarters` before it first moves the price, and is in force for
   * `lastsQuarters`. How likely each is to be announced in a quarter is the country file's
   * business. The notice is shorter than the risks' horizon, so a shock that could still be
   * announced is looked for there as a risk of its own. The forecast of the price allows only
   * for shocks already announced.
   */
  priceShocks: {
    failedHarvestsAbroad: {
      name: 'Failed harvests abroad',
      called: 'failed harvests abroad',
      good: 'grain',
      // $36 a tonne a quarter: with markets and the pull towards the usual price the grain
      // price stays within $90 of where it was, and three quarters of it raise it by about a
      // third.
      pushPermillePerQuarter: 150,
      noticeQuarters: 2,
      lastsQuarters: 3,
      announcement: {
        coming:
          'Harvests have failed across the grain-growing world, and buyers are bidding for what is left.',
        ends: 'A new harvest abroad is in, and grain is easier to buy again.',
      },
    },
    oreGlut: {
      name: 'Ore glut',
      called: 'an ore glut',
      good: 'ore',
      // $20 a tonne a quarter: three quarters of it take the ore price down by about two fifths,
      // and a mine's earnings with it.
      pushPermillePerQuarter: -200,
      noticeQuarters: 2,
      lastsQuarters: 3,
      announcement: {
        coming:
          'New mines abroad have flooded the world with ore, and buyers are paying less for it.',
        ends: 'The glut of ore abroad has been taken up, and buyers pay as they did.',
      },
    },
  } satisfies Record<PriceShockType, PriceShockDefinition>,
} as const;
