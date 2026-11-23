import type { FoodStage, SpendingArea } from '../vocabulary';

/**
 * `balance.approval`, `balance.unrest` and `balance.election`: what moves approval, when a
 * region strikes or protests, and how the vote is held.
 */
export const politicsBalance = {
  approval: {
    /** Where a region's approval stands when nothing pushes it either way, in thousandths. */
    baselinePermille: 515,
    /**
     * Approval does not jump. Each quarter, the effect of each thing that moves it closes
     * this share, in thousandths, of the gap to where that thing would settle it.
     */
    adjustPermillePerQuarter: 100,
    /** Where a region's food situation settles its approval, in thousandths. */
    food: { adequate: 0, tight: -120, shortage: -300, famine: -600 } satisfies Record<
      FoodStage,
      number
    >,
    tax: {
      /** The tax rate people accept without complaint, as a whole percentage. */
      neutralPercent: 18,
      /** Thousandths of approval lost for each point of tax above that, or won for each below. */
      permillePerPoint: 12,
    },
    /**
     * The spending that serves the public. People expect a certain amount per head: spend
     * nothing and approval settles the whole weight lower, spend double what is expected
     * or more and it settles the whole weight higher, and in between in proportion.
     */
    services: {
      /** Expected spending is in Money units ($100,000) a quarter for each million people. */
      health: { expectedPerMillionPeople: 12, weightPermille: 60 },
      education: { expectedPerMillionPeople: 12, weightPermille: 40 },
      security: { expectedPerMillionPeople: 10, weightPermille: 40 },
    } satisfies Partial<
      Record<SpendingArea, { expectedPerMillionPeople: number; weightPermille: number }>
    >,
  },
  unrest: {
    /**
     * A region strikes while its approval is below `belowPermille`, and protests while it
     * is below the lower mark. While either lasts the region produces only `outputPermille`
     * thousandths of its output, which is what it pays tax on.
     */
    strikes: { belowPermille: 400, outputPermille: 700 },
    protests: { belowPermille: 300, outputPermille: 400 },
  },
  election: {
    /**
     * A term of office, in quarters. The vote is held when the last of them ends, and a
     * government that wins it begins another term of the same length. There is no limit
     * on the number of terms.
     */
    termQuarters: 20,
    /** The share of the vote the government needs to stay in office, in thousandths. */
    winSharePermille: 500,
    /**
     * People vote as they approve, and the campaign then moves the result by up to this
     * many thousandths either way, by the seed.
     */
    swingPermille: 30,
  },
} as const;
