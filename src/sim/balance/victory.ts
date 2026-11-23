/** `balance.victory`: how long the top tier must be held, and the debt test. */
export const victoryBalance = {
  /** How the game is won. */
  victory: {
    /**
     * The game is won once national prosperity has ended this many quarters running in the
     * top tier, with debt at a sustainable level (see `victory.ts`).
     */
    quartersToHold: 4,
    /**
     * The debt test: the most debt burden, owed against a year's revenue in thousandths,
     * that the quarter completing the hold may end with. Above it the hold goes on counting
     * but the win waits. Three tenths of a year's revenue: a nation rated A may owe more than
     * three times that, so a win reached by borrowing up to what lenders allow does not count
     * until most of it is repaid.
     */
    debtBurdenLimitPermille: 300,
  },
} as const;
