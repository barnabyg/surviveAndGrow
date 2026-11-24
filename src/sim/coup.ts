import { armyStageAt, nationalLoyalty } from './army';
import { balance } from './balance';
import type { ReportEntry } from './report';
import type { Outcome, RegionState } from './state';
import { formatPercent, formatQuarters } from './text';

/**
 * The coup: the third way to lose. The army takes power when national army loyalty has ended
 * at plotting for a set number of quarters running. Nothing is rolled, so the same seed and
 * decisions always bring the same coup, and the count is there to be watched, as famine's is.
 * The count, the test and what the report says of them are here and nowhere else.
 */

export type Coup = Extract<Outcome, { readonly cause: 'coup' }>;

/** How many quarters of plotting running bring a coup. */
export const coupAfterPlottingQuarters = balance.army.coup.afterPlottingQuarters;

/** How the game stands towards a coup. */
export interface CoupStatus {
  /** Whether the army is plotting now. While it is not, nothing is counted. */
  readonly plotting: boolean;
  /** How many quarters running national army loyalty has ended at plotting. */
  readonly held: number;
  /** How many bring a coup. */
  readonly needed: number;
  /**
   * How many more quarters must end with the army plotting before it takes power, counting
   * the one being decided: 1 means the coup comes as this quarter ends, unless loyalty rises.
   */
  readonly left: number;
  /** The army is plotting while national loyalty is below this, in thousandths. */
  readonly plottingBelow: number;
}

export function coupStatus(game: {
  readonly regions: readonly RegionState[];
  readonly plottingQuarters: number;
}): CoupStatus {
  const needed = balance.army.coup.afterPlottingQuarters;
  return {
    plotting: armyStageAt(nationalLoyalty(game.regions)) === 'plotting',
    held: game.plottingQuarters,
    needed,
    left: Math.max(0, needed - game.plottingQuarters),
    plottingBelow: balance.army.loyalty.stages.plottingBelowPermille,
  };
}

/**
 * The quarters the army has plotted running, once a quarter has left national army loyalty
 * where it is, in thousandths: one more while it plots, and none as soon as it does not.
 */
export function plottingAfter(held: number, loyalty: number): number {
  return armyStageAt(loyalty) === 'plotting' ? held + 1 : 0;
}

/** The coup, once the army has plotted for long enough, or null. */
export function coupOf(held: number, loyalty: number): Coup | null {
  const needed = balance.army.coup.afterPlottingQuarters;
  if (held < needed) return null;
  return {
    status: 'lost',
    cause: 'coup',
    loyalty,
    quarters: held,
    headline: 'The army has taken power',
    summary: `National army loyalty stood below ${plottingMark()}, where the army plots, for ${formatQuarters(held)} running, and ended at ${formatPercent(loyalty)}. The army has taken power.`,
  };
}

/** What the turn report says when the army takes power. */
export function coupEntry(outcome: Coup): ReportEntry {
  return {
    kind: 'coup',
    seriousness: 'critical',
    headline: outcome.headline,
    cause: outcome.summary,
  };
}

/**
 * What the turn report says of the count while no coup has come: how long is left in each
 * quarter that ends with the army plotting, from the first, and that the count has started
 * afresh in the quarter that ends it. `was` and `now` are the count before and after the
 * quarter, and `loyalty` national army loyalty as it ends, in thousandths.
 */
export function countEntries(was: number, now: number, loyalty: number): ReportEntry[] {
  const needed = balance.army.coup.afterPlottingQuarters;
  if (now >= needed) return [];
  if (now > 0) {
    const left = needed - now;
    return [
      {
        kind: 'coup',
        seriousness: 'serious',
        headline: `The army plots: ${formatQuarters(left)} to a coup`,
        cause: `National army loyalty has ended ${formatQuarters(now)} running below ${plottingMark()}, where the army plots, and stands at ${formatPercent(loyalty)}. ${left === 1 ? 'One more quarter' : `${left} more quarters`} of it and the army takes power. Loyalty back at ${plottingMark()} or above ends the count.`,
      },
    ];
  }
  if (was === 0) return [];
  return [
    {
      kind: 'coup',
      seriousness: 'notable',
      headline: 'The coup is off',
      cause: `National army loyalty is back at ${formatPercent(loyalty)}, no longer below the ${plottingMark()} where the army plots, after ${formatQuarters(was)} of plotting. The count towards a coup is ended, and would start afresh if the army plotted again.`,
    },
  ];
}

/** The mark below which the army plots, as a percentage: "30%". */
function plottingMark(): string {
  return formatPercent(balance.army.loyalty.stages.plottingBelowPermille, 0);
}
