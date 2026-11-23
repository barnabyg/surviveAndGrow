/** `balance.budget`: how far the tax rate and the spending on each area may be set. */
export const budgetBalance = {
  budget: {
    /** The tax rate, as a whole percentage of each region's output. */
    taxRatePercent: { min: 5, max: 40 },
    /** What may be spent on one area in a quarter, in Money units ($100,000). */
    spending: { min: 0, max: 200, step: 10 },
  },
} as const;
