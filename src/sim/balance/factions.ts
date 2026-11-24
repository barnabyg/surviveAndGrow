import type { CivilFaction, FactionLever } from '../vocabulary';

/**
 * How one lever moves a standing. The lever's measure (see `FACTION_LEVERS`) is read against
 * three marks: at `neutral` it leaves the standing alone, at `best` or beyond it settles the
 * standing the whole weight higher, at `worst` or beyond the whole weight lower, and in
 * between in proportion. `best` may lie below `neutral`, as a tax rate's does. A mark equal
 * to `neutral` means the lever does nothing on that side.
 */
export interface LeverBalance {
  /** The most the lever settles a standing up or down, in thousandths. */
  readonly weightPermille: number;
  readonly worst: number;
  readonly neutral: number;
  readonly best: number;
}

/** `balance.factions`: what each faction answers to, how its standing moves and is read. */
export const factionsBalance = {
  factions: {
    /** Where a standing rests when every lever is neutral, in thousandths. */
    neutralPermille: 500,
    /**
     * A standing does not jump. Each quarter, the effect of each lever closes this share, in
     * thousandths, of the gap to where that lever would settle it.
     */
    adjustPermillePerQuarter: 200,
    /**
     * What each civil faction answers to. No budget settles all three at their best: farmers
     * and workers each judge their share of what the budget spends, and the two shares at
     * their best come to more than the whole of it. Business answers to money instead: every
     * dollar spent to please the others deepens the deficit, or raises the tax, that it
     * resents. Which levers a faction answers to may change with these values; a save holds
     * every lever's effect for every faction, so it does not turn on them.
     */
    levers: {
      farmers: {
        agricultureShare: { weightPermille: 300, worst: 0, neutral: 240, best: 480 },
        harvest: { weightPermille: 200, worst: 500, neutral: 1000, best: 1000 },
      },
      workers: {
        servicesShare: { weightPermille: 300, worst: 0, neutral: 370, best: 740 },
        tax: { weightPermille: 150, worst: 28, neutral: 18, best: 8 },
      },
      business: {
        tax: { weightPermille: 200, worst: 28, neutral: 18, best: 8 },
        // A balanced budget is all business asks: a surplus earns nothing more.
        budgetBalance: { weightPermille: 150, worst: -400, neutral: 0, best: 0 },
        debtBurden: { weightPermille: 100, worst: 1500, neutral: 500, best: 0 },
        works: { weightPermille: 150, worst: 0, neutral: 0, best: 4 },
      },
    } satisfies Record<CivilFaction, Partial<Record<FactionLever, LeverBalance>>>,
    /**
     * The marks a standing's mood is read by, in thousandths: a faction is pleased from the
     * first up, uneasy below the second and angry below the third. In between it is content.
     */
    moods: { pleasedFromPermille: 600, uneasyBelowPermille: 400, angryBelowPermille: 250 },
    /**
     * The scale of the Factions effect on a region's approval: thousandths of approval for
     * each thousand thousandths its people's standings, weighted by the region's faction mix,
     * stand above or below neutral.
     */
    approvalScalePermille: 300,
    /**
     * A standing moves approval noticeably, and the first-time tip explains factions, once
     * the Factions effect in any region is at least this many thousandths either way.
     */
    noticeablePermille: 20,
  },
} as const;
