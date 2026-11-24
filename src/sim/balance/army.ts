import type { Unrest } from '../vocabulary';

/** `balance.army`: what the army expects, how its loyalty moves and where its stages change. */
export const armyBalance = {
  army: {
    loyalty: {
      /**
       * Where a region's army loyalty stands, in thousandths, when Defence is spent as the army
       * expects and the region is calm.
       */
      baselinePermille: 600,
      /**
       * Loyalty does not jump. Each quarter, the effect of each thing that moves it closes
       * this share, in thousandths, of the gap to where that thing would settle it.
       */
      adjustPermillePerQuarter: 200,
      /**
       * Defence spending, judged per head as the public services are. Expected spending is in
       * Money units ($100,000) a quarter for each million people: spend nothing and loyalty
       * settles the whole weight lower, spend double what is expected or more and it settles
       * the whole weight higher, and in between in proportion.
       */
      defence: { expectedPerMillionPeople: 4, weightPermille: 400 },
      /** Where a region's own unrest settles the loyalty of the army there, in thousandths. */
      unrest: { calm: 0, strikes: -100, protests: -250 } satisfies Record<Unrest, number>,
      /**
       * The marks the stages are read by, in thousandths: the army is restless while its
       * loyalty is below the first, and plotting while it is below the second.
       */
      stages: { restlessBelowPermille: 450, plottingBelowPermille: 300 },
    },
  },
} as const;
