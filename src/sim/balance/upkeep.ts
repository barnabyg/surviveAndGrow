/** `balance.upkeep`: what a site that goes without its upkeep still does. */
export const upkeepBalance = {
  /**
   * Upkeep. Each quarter the upkeep spending keeps the sites in use in good repair one by
   * one, in the order building began on them, until what is left will not cover the next:
   * that site and every one started after it go without, so the newest decay first. A site
   * that goes without is decaying from the next quarter, and does only
   * `decayingEffectPermille` thousandths of what it does in good repair, until a quarter in
   * which its upkeep is paid restores it.
   */
  upkeep: {
    decayingEffectPermille: 500,
  },
} as const;
