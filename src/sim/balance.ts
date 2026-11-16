/**
 * Every value that tunes the game lives here as data. The rules in the rest of the
 * simulation read these values and hold none of their own.
 */
export const balance = {
  calendar: {
    /** The season of each quarter. */
    seasons: { 1: 'Dry season', 2: 'Planting season', 3: 'Growing season', 4: 'Harvest season' },
  },
} as const;
