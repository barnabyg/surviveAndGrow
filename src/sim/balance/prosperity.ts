import type { FoodStage, LastingService, ProsperityPart, Tier } from '../vocabulary';

/**
 * `balance.prosperity`: how living standards are scored, how health and education levels
 * build and wear, and where each tier begins.
 */
export const prosperityBalance = {
  /**
   * Living standards and prosperity. Every score is in thousandths: a region's living
   * standard is its five parts' scores weighted by `weightsPermille`, which add up to 1000.
   * National prosperity is the regions' living standards averaged by population.
   */
  prosperity: {
    weightsPermille: {
      food: 150,
      income: 150,
      health: 150,
      education: 150,
      infrastructure: 400,
    } satisfies Record<ProsperityPart, number>,
    /** Food security by the region's food situation. */
    food: { adequate: 1000, tight: 600, shortage: 250, famine: 0 } satisfies Record<
      FoodStage,
      number
    >,
    /** Income per head scores in full at this many dollars per person a quarter, and in proportion below. */
    fullIncomeDollarsPerPersonPerQuarter: 250,
    /**
     * Health and education are levels in each region. Spending sets where a level is
     * heading: this many thousandths for each Money unit ($100,000) spent a quarter on each
     * million people, up to the whole. Each quarter the level closes a share of the gap, in
     * thousandths: `buildPermillePerQuarter` while it rises, `wearPermillePerQuarter` while it
     * falls. A game starts with each level where its starting budget would hold it.
     */
    services: {
      health: {
        permillePerMoneyPerMillionPeople: 11,
        buildPermillePerQuarter: 50,
        wearPermillePerQuarter: 50,
      },
      education: {
        permillePerMoneyPerMillionPeople: 11,
        buildPermillePerQuarter: 40,
        wearPermillePerQuarter: 40,
      },
    } satisfies Record<
      LastingService,
      {
        permillePerMoneyPerMillionPeople: number;
        buildPermillePerQuarter: number;
        wearPermillePerQuarter: number;
      }
    >,
    /**
     * Where each tier begins, in thousandths of prosperity, and how far the public's
     * expectations in it lower the approval baseline compared with the lowest tier.
     */
    tiers: {
      subsistence: { fromPermille: 0, expectationsPermille: 0 },
      developing: { fromPermille: 300, expectationsPermille: 30 },
      industrialising: { fromPermille: 380, expectationsPermille: 60 },
      // The last tier is the target the country is aiming for.
      prosperous: { fromPermille: 420, expectationsPermille: 90 },
    } satisfies Record<Tier, { fromPermille: number; expectationsPermille: number }>,
    /**
     * A tier once reached is lost only when prosperity falls this many thousandths below
     * where it begins, so that a figure hovering at the line does not pass it every quarter.
     */
    fallBackMarginPermille: 20,
  },
} as const;
