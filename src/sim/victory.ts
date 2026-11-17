import { balance } from './balance';
import type { ReportEntry } from './report';
import type { Outcome } from './state';
import { formatIndex } from './text';
import { tierFrom } from './tiers';
import type { Money } from './types';
import { TIER_NAMES, TIERS, type Tier } from './vocabulary';

/**
 * The win. The design wins the game on prosperity held at the target, the top tier, for
 * several quarters running, with debt at a sustainable level. Both tests are here and
 * nowhere else.
 */

/** The tier the game is won in: the top one. */
export const TARGET_TIER: Tier = TIERS[TIERS.length - 1] ?? 'prosperous';

/** How the game stands towards the win. */
export interface VictoryStatus {
  /** The tier prosperity must be held in. */
  readonly tier: Tier;
  /** How many quarters running prosperity has ended in it. */
  readonly held: number;
  /** How many it must be held for. */
  readonly needed: number;
}

export function victoryStatus(game: { readonly prosperousQuarters: number }): VictoryStatus {
  return {
    tier: TARGET_TIER,
    held: game.prosperousQuarters,
    needed: balance.victory.quartersToHold,
  };
}

/** The quarters held in the top tier once a quarter has left the nation in a tier. */
export function heldAfter(held: number, tier: Tier): number {
  return tier === TARGET_TIER ? held + 1 : 0;
}

/**
 * Whether the nation's debt stands at a level it can sustain, as the win requires: it blocks
 * a win bought with a one-off borrowing binge.
 *
 * Phase 3 enforces this test. Until then there is no borrowing, so there is no debt, and the
 * test always passes. It is given the position the quarter leaves, so that the test can be
 * written here without changing anything that calls it.
 */
export function debtSustainable(_position: { readonly treasury: Money }): boolean {
  return true;
}

/** How a game won on prosperity ended. */
export type Victory = Extract<Outcome, { readonly cause: 'prosperity' }>;

/**
 * The win, once a quarter has ended with prosperity held long enough in the top tier and the
 * debt sustainable, or null.
 */
export function victoryOf(
  held: number,
  position: { readonly treasury: Money },
): { readonly outcome: Victory; readonly entry: ReportEntry } | null {
  const { quartersToHold } = balance.victory;
  if (held < quartersToHold || !debtSustainable(position)) return null;
  const name = TIER_NAMES[TARGET_TIER];
  const outcome: Victory = {
    status: 'won',
    cause: 'prosperity',
    headline: 'The nation is prosperous',
    summary: `National prosperity has stood in ${name}, from ${formatIndex(tierFrom(TARGET_TIER), 0)} up, for ${quartersToHold} quarters running. You have won.`,
  };
  return {
    outcome,
    entry: {
      kind: 'victory',
      seriousness: 'notable',
      headline: outcome.headline,
      cause: outcome.summary,
    },
  };
}
