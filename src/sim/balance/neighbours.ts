import type { Tier } from '../vocabulary';

/**
 * `balance.neighbours`: how Defence spending builds deterrence, how much a neighbour's ambition
 * weighs as the country prospers, and where its intention changes.
 */
export const neighboursBalance = {
  neighbours: {
    deterrence: {
      /**
       * Deterrence does not jump. Each quarter it closes this share, in thousandths, of the
       * gap to where the Defence spent would settle it: slower than army loyalty moves, so it
       * has to be bought ahead and is not lost at once.
       */
      adjustPermillePerQuarter: 150,
      /**
       * Where Defence spending settles deterrence, judged per head against what the army
       * expects (`balance.army.loyalty.defence`). Spending this many thousandths of what is
       * expected settles it at half; each dollar more buys less than the last, so no spending
       * reaches the whole: nothing spent settles it at nothing, and three times this at three
       * quarters.
       */
      halfAtPermilleOfExpected: 1500,
    },
    /**
     * A state worth taking. What a neighbour's ambition weighs against deterrence in each
     * prosperity tier, as a share of the ambition in thousandths: nothing while the country
     * has nothing to take, and the whole of it at the top.
     */
    worthTakingPermille: {
      subsistence: 0,
      developing: 550,
      industrialising: 800,
      prosperous: 1000,
    } satisfies Record<Tier, number>,
    /**
     * The marks a neighbour's intention is read by, as shares in thousandths of what its
     * ambition weighs in the tier in force: it is watchful while deterrence is below the first
     * and hostile while deterrence is below the second. An ambition that weighs nothing leaves
     * it peaceful whatever deterrence is.
     */
    intentions: { watchfulBelowPermilleOfWeight: 1250, hostileBelowPermilleOfWeight: 1000 },
    /** The most ambition a country file may give a neighbour, as a whole percentage. */
    mostAmbitionPercent: 100,
  },
} as const;
