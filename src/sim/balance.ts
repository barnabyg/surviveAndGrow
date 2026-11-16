/**
 * Every value that tunes the game lives here as data. The rules in the rest of the
 * simulation read these values and hold none of their own.
 */
export const balance = {
  calendar: {
    /** The season of each quarter. */
    seasons: { 1: 'Dry season', 2: 'Planting season', 3: 'Growing season', 4: 'Harvest season' },
  },
  budget: {
    /** The tax rate, as a whole percentage of each region's output. */
    taxRatePercent: { min: 5, max: 40 },
    /** What may be spent on one area in a quarter, in Money units ($100,000). */
    spending: { min: 0, max: 200, step: 10 },
  },
} as const;
