import type { Likelihood } from '../vocabulary';

/** `balance.risks`: how far ahead dangers are looked for, and how likely each is called. */
export const risksBalance = {
  /** How the game looks ahead for danger, holding the player's decisions as they are. */
  risks: {
    /** How many quarters ahead the dangers are looked for, counting the one being decided. */
    horizonQuarters: 4,
    /**
     * A harvest that fails leaves its region hungry from the quarter after it. So that a
     * harvest inside the horizon is judged by what it leaves, hunger alone is looked for
     * this many quarters further on.
     */
    hungerShowsQuartersLater: 1,
    /**
     * The weather that is supposed, from the worst to the best: each quarter's weather as a
     * share of its full swing, in thousandths, and how much of the chance that course of
     * weather stands for, in thousandths that add up to 1000. The two ends are the limits of
     * what can happen, so nothing possible is left out, and they are given more weight than
     * a run of such weather really has: the list errs towards warning.
     */
    weatherOutlooks: [
      { swingSharePermille: -1000, weightPermille: 100 },
      { swingSharePermille: -500, weightPermille: 200 },
      { swingSharePermille: 0, weightPermille: 400 },
      { swingSharePermille: 500, weightPermille: 200 },
      { swingSharePermille: 1000, weightPermille: 100 },
    ],
    /**
     * A risk is given a likelihood when its chance, in thousandths, is at least this much.
     * A chance below the first is negligible, and the risk is not listed.
     */
    /**
     * The chance, in thousandths, given to a danger that only a slump in the world ore price
     * to the low end of its forecast would bring. A slump that deep is rare, but it is what a
     * country that lives on its mine must be ready for, so it errs towards warning.
     */
    oreSlumpChancePermille: 100,
    /**
     * The chance, in thousandths, given to what only a rise in the world ore price to the high
     * end of its forecast would bring: a richer country passes a tier sooner, and is worth
     * more to a neighbour. A rise that steep is as rare as the slump, and is weighed the same.
     */
    oreRiseChancePermille: 100,
    likelihoodFromPermille: {
      remote: 20,
      unlikely: 100,
      possible: 300,
      likely: 600,
      almostCertain: 900,
    } satisfies Record<Likelihood, number>,
  },
} as const;
