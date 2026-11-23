/** `balance.calendar`: the seasons of the year and the quarter of the harvest. */
export const calendarBalance = {
  calendar: {
    /** The season of each quarter. */
    seasons: { 1: 'Dry season', 2: 'Planting season', 3: 'Growing season', 4: 'Harvest season' },
    /** The quarter at the end of which every region brings its harvest in. */
    harvestQuarter: 4,
  },
} as const;
