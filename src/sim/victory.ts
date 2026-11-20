import { balance } from './balance';
import { debtBurden, type Owing } from './debt';
import type { ReportEntry } from './report';
import type { Outcome } from './state';
import { formatIndex, formatPercent } from './text';
import { tierFrom } from './tiers';
import { TIER_NAMES, TIERS, type Tier } from './vocabulary';

/**
 * The win. The game is won on prosperity held at the target, the top tier, for several
 * quarters running, with the debt burden within a sustainable limit as the hold completes.
 * Both tests are here and nowhere else.
 */

/** The tier the game is won in: the top one. */
export const TARGET_TIER: Tier = TIERS[TIERS.length - 1] ?? 'prosperous';

/** How the debt stands against the win's debt test. */
export interface DebtTest {
  /** The debt burden: what is owed against a year's revenue, in thousandths. */
  readonly burden: number;
  /** The most debt burden the win allows, in thousandths. */
  readonly limit: number;
  /** Whether the burden is within the limit. */
  readonly holds: boolean;
}

/** How the game stands towards the win. */
export interface VictoryStatus {
  /** The tier prosperity must be held in. */
  readonly tier: Tier;
  /** How many quarters running prosperity has ended in it. */
  readonly held: number;
  /** How many it must be held for. */
  readonly needed: number;
  /** The debt test, as the debt stands now. */
  readonly debt: DebtTest;
  /**
   * True when prosperity has been held long enough and the debt test is all that stands
   * between the nation and the win.
   */
  readonly waitingOnDebt: boolean;
}

export function victoryStatus(
  game: Owing & { readonly prosperousQuarters: number },
): VictoryStatus {
  const needed = balance.victory.quartersToHold;
  const debt = debtTest(game);
  return {
    tier: TARGET_TIER,
    held: game.prosperousQuarters,
    needed,
    debt,
    waitingOnDebt: game.prosperousQuarters >= needed && !debt.holds,
  };
}

/** The quarters held in the top tier once a quarter has left the nation in a tier. */
export function heldAfter(held: number, tier: Tier): number {
  return tier === TARGET_TIER ? held + 1 : 0;
}

/**
 * Whether the nation's debt stands at a level it can sustain, as the win requires: the debt
 * burden within the limit in balance data. It blocks a win bought with a borrowing binge.
 */
export function debtTest(position: Owing): DebtTest {
  return debtTestOf(debtBurden(position));
}

/** The win's debt test of a debt burden already worked out, in thousandths. */
function debtTestOf(burden: number): DebtTest {
  const limit = balance.victory.debtBurdenLimitPermille;
  return { burden, limit, holds: burden <= limit };
}

/** How a game won on prosperity ended. */
export type Victory = Extract<Outcome, { readonly cause: 'prosperity' }>;

/**
 * The win, once a quarter has ended with prosperity held long enough in the top tier and the
 * debt burden the quarter leaves, in thousandths, within the limit; or null. A burden over
 * the limit does not end the hold: the win waits until a quarter ends with it passed.
 */
export function victoryOf(
  held: number,
  burden: number,
): { readonly outcome: Victory; readonly entry: ReportEntry } | null {
  const { quartersToHold } = balance.victory;
  const debt = debtTestOf(burden);
  if (held < quartersToHold || !debt.holds) return null;
  const name = TIER_NAMES[TARGET_TIER];
  const stood = `National prosperity has stood in ${name}, from ${formatIndex(tierFrom(TARGET_TIER), 0)} up, for ${held} quarters running`;
  // A win that waited on the debt says that the debt test has now passed.
  const summary =
    held === quartersToHold
      ? `${stood}. You have won.`
      : `${stood}, and the debt burden is now ${formatPercent(debt.burden)}, within the ${formatPercent(debt.limit)} the win allows. You have won.`;
  const outcome: Victory = {
    status: 'won',
    cause: 'prosperity',
    headline: 'The nation is prosperous',
    summary,
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
