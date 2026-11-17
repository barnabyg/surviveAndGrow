import { balance } from './balance';
import type { ReportEntry } from './report';
import { formatIndex, formatPoints } from './text';
import { TIER_NAMES, TIERS, type Tier } from './vocabulary';

/** How the nation stands among the tiers of prosperity. */
export interface TierStatus {
  /** The tier in force. */
  readonly tier: Tier;
  /** The tier above, where it begins and how far prosperity is from it; null at the top. */
  readonly next: { readonly tier: Tier; readonly from: number; readonly distance: number } | null;
  /** The prosperity below which the tier in force is lost, or null in the lowest tier. */
  readonly lostBelow: number | null;
  /** How far the public's expectations now lower the approval baseline, in thousandths. */
  readonly expectations: number;
}

/** A tier's place among the tiers: 0 for the lowest. */
export function tierRank(tier: Tier): number {
  return TIERS.indexOf(tier);
}

/** The tier below one, or the lowest tier itself. */
export function tierBelow(tier: Tier): Tier {
  return TIERS[tierRank(tier) - 1] ?? TIERS[0];
}

/** Where a tier begins, in thousandths of prosperity. */
export function tierFrom(tier: Tier): number {
  return balance.prosperity.tiers[tier].fromPermille;
}

/** The tier a prosperity figure reaches, with no regard for the tier it came from. */
export function tierAt(prosperity: number): Tier {
  return TIERS.findLast((tier) => prosperity >= tierFrom(tier)) ?? TIERS[0];
}

/** The prosperity below which a tier is lost, or null for the lowest, which cannot be. */
export function tierLostBelow(tier: Tier): number | null {
  return tierRank(tier) === 0 ? null : tierFrom(tier) - balance.prosperity.fallBackMarginPermille;
}

/**
 * The tier in force once prosperity stands at a figure. A higher tier is passed as soon as
 * prosperity reaches it; one in force is lost only when prosperity falls past its margin.
 */
export function nextTier(current: Tier, prosperity: number): Tier {
  const reached = tierAt(prosperity);
  if (tierRank(reached) >= tierRank(current)) return reached;
  let tier = current;
  for (
    let lost = tierLostBelow(tier);
    lost !== null && prosperity < lost;
    lost = tierLostBelow(tier)
  ) {
    tier = tierBelow(tier);
  }
  return tier;
}

/**
 * How far the public's expectations lower the approval baseline in a tier, in thousandths.
 * People expect what the tier they live in brings, beyond what they had when the game began;
 * a country that falls below the tier it started in leaves them expecting no less than then.
 */
export function expectationsIn(tier: Tier, startingTier: Tier): number {
  const { tiers } = balance.prosperity;
  return Math.max(0, tiers[tier].expectationsPermille - tiers[startingTier].expectationsPermille);
}

export function tierStatus(position: {
  readonly tier: Tier;
  readonly startingTier: Tier;
  readonly prosperity: number;
}): TierStatus {
  const { tier, startingTier, prosperity } = position;
  const above = TIERS[tierRank(tier) + 1];
  return {
    tier,
    next:
      above === undefined
        ? null
        : {
            tier: above,
            from: tierFrom(above),
            distance: Math.max(0, tierFrom(above) - prosperity),
          },
    lostBelow: tierLostBelow(tier),
    expectations: expectationsIn(tier, startingTier),
  };
}

/** What the turn report says when the nation passes a tier or falls back from one. */
export function tierEntry(
  was: Tier,
  now: Tier,
  startingTier: Tier,
  prosperity: number,
): ReportEntry | null {
  if (was === now) return null;
  const rose = tierRank(now) > tierRank(was);
  const shift = expectationsIn(now, startingTier) - expectationsIn(was, startingTier);
  const expectations =
    shift === 0
      ? 'What people expect is unchanged.'
      : shift > 0
        ? `People now expect more: the approval baseline is ${formatPoints(shift)} lower.`
        : `People expect less: the approval baseline is ${formatPoints(-shift)} higher.`;
  if (rose) {
    return {
      kind: 'tier',
      seriousness: 'notable',
      headline: `Prosperity has reached a new tier: ${TIER_NAMES[now]}`,
      cause: `National prosperity has risen to ${formatIndex(prosperity)}, past the ${formatIndex(tierFrom(now), 0)} at which ${TIER_NAMES[now]} begins, and the map takes on its look. ${expectations}`,
    };
  }
  const lost = tierLostBelow(was) ?? 0;
  return {
    kind: 'tier',
    seriousness: 'serious',
    headline: `Prosperity has fallen back to ${TIER_NAMES[now]}`,
    cause: `National prosperity has fallen to ${formatIndex(prosperity)}, below the ${formatIndex(lost)} at which ${TIER_NAMES[was]} is lost, and the map’s look follows it down. ${expectations}`,
  };
}
