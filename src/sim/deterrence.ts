import { populationOf, stepTowards } from './arithmetic';
import { armyExpects } from './army';
import { balance } from './balance';
import type { Budget } from './budget';
import { neighbourOf, type Country, type Neighbour } from './country';
import type { ReportEntry } from './report';
import type { RegionState } from './state';
import { formatMoney, formatPercent } from './text';
import type { Figure, Money } from './types';
import {
  INTENTION_NAMES,
  INTENTIONS,
  LOYALTY_DRIVER_NAMES,
  TIER_NAMES,
  TIERS,
  type Intention,
  type Tier,
} from './vocabulary';

/*
 * Neighbours with ambitions, and the deterrence Defence spending buys against them. There is
 * no combat: deterrence is one national figure, a neighbour's ambition weighs more against it
 * as the country prospers, and what the neighbour intends is read from the two. Nothing but
 * deterrence is kept: an intention is worked out afresh wherever it is wanted, from the tier
 * in force and deterrence as it stands.
 */

/** How one neighbour stands towards the country. All figures are in thousandths. */
export interface NeighbourStatus {
  readonly neighbourId: string;
  readonly name: string;
  /** Its ambition, as the country file gives it. */
  readonly ambition: number;
  /** What its ambition weighs against deterrence in the tier in force. */
  readonly weighs: number;
  /** What it would weigh in each tier: more as the country prospers. */
  readonly weighsIn: Readonly<Record<Tier, number>>;
  readonly intention: Intention;
  /** It is watchful while deterrence is below this, and peaceful from it up. */
  readonly watchfulBelow: number;
  /** It is hostile while deterrence is below this. */
  readonly hostileBelow: number;
  /** What it would intend, in the tier in force, with deterrence where the budget settles it. */
  readonly settlesIntention: Intention;
}

/** How deterrence stands, and what each neighbour makes of it. All figures are in thousandths. */
export interface DeterrenceStatus {
  readonly deterrence: number;
  /** Where deterrence settles if Defence spending stays as the budget judged has it. */
  readonly settles: number;
  /** What is spent on Defence a quarter under the budget judged. */
  readonly spent: Money;
  /** What the army expects to be spent a quarter, for the people the country now has. */
  readonly expected: Money;
  /** The prosperity tier in force, which says how much the country is worth taking. */
  readonly tier: Tier;
  /** The share of each neighbour's ambition that weighs against deterrence in that tier. */
  readonly worthTaking: number;
  /** Each neighbour, in the country file's order. */
  readonly neighbours: readonly NeighbourStatus[];
}

/** What a neighbour will intend once a quarter is over, and where that is heading. */
export interface NeighbourOutlook {
  readonly neighbourId: string;
  /** What it intends as the quarter ends. */
  readonly intention: Intention;
  /** What it would intend, in the tier the quarter leaves, with deterrence where it settles. */
  readonly heading: Intention;
}

export interface DeterrenceOutcome {
  /** Deterrence after the quarter, in thousandths, with what moved it. */
  readonly deterrence: Figure;
  /** Where deterrence settles if the same is spent on Defence for the same people. */
  readonly heading: number;
  /** Each neighbour as the quarter leaves it, in the country file's order. */
  readonly neighbours: readonly NeighbourOutlook[];
  readonly entries: readonly ReportEntry[];
}

/** What of a game says what its neighbours intend. */
export interface Deterred {
  readonly country: Country;
  readonly tier: Tier;
  readonly deterrence: number;
}

/**
 * Where a sum spent on Defence each quarter settles deterrence, in thousandths, for a number
 * of people. It is judged per head against what the army expects, and each dollar more buys
 * less than the last: `halfAtPermilleOfExpected` of what is expected settles it at half.
 */
export function deterrenceSettled(spent: Money, people: number): number {
  if (spent <= 0) return 0;
  const { halfAtPermilleOfExpected } = balance.neighbours.deterrence;
  const { expectedPerMillionPeople } = balance.army.loyalty.defence;
  // Both sides of the fraction are scaled by a thousand million, which keeps them whole.
  const scaled = spent * 1_000_000_000;
  return Math.floor(
    (1000 * scaled) / (scaled + halfAtPermilleOfExpected * expectedPerMillionPeople * people),
  );
}

/** Deterrence as a game starts: settled where the starting budget holds it. */
export function startingDeterrence(country: Country): number {
  return deterrenceSettled(country.start.budget.spending.defence, populationOf(country.regions));
}

/** What a neighbour's ambition weighs against deterrence in a tier, in thousandths. */
export function ambitionWeighs(neighbour: Neighbour, tier: Tier): number {
  return Math.floor((neighbour.ambition * balance.neighbours.worthTakingPermille[tier]) / 1000);
}

/** The deterrence below which a neighbour is watchful and below which it is hostile. */
function marksOf(weighs: number): { watchfulBelow: number; hostileBelow: number } {
  const { watchfulBelowPermilleOfWeight, hostileBelowPermilleOfWeight } =
    balance.neighbours.intentions;
  return {
    watchfulBelow: Math.ceil((weighs * watchfulBelowPermilleOfWeight) / 1000),
    hostileBelow: Math.ceil((weighs * hostileBelowPermilleOfWeight) / 1000),
  };
}

/** The deterrence below which a neighbour is hostile in a tier, in thousandths. */
export function hostileBelowIn(neighbour: Neighbour, tier: Tier): number {
  return marksOf(ambitionWeighs(neighbour, tier)).hostileBelow;
}

/** What a neighbour intends in a tier, with deterrence at a figure. */
export function intentionOf(neighbour: Neighbour, tier: Tier, deterrence: number): Intention {
  const { watchfulBelow, hostileBelow } = marksOf(ambitionWeighs(neighbour, tier));
  if (deterrence < hostileBelow) return 'hostile';
  return deterrence < watchfulBelow ? 'watchful' : 'peaceful';
}

/**
 * Whether a neighbour could still turn hostile on the country growing richer: one with an
 * ambition is not yet hostile, and there is a tier above the one in force.
 */
export function couldStillTurn(game: Deterred): boolean {
  return (
    game.tier !== TIERS.at(-1) &&
    game.country.map.neighbours.some(
      (neighbour) =>
        neighbour.ambition > 0 && intentionOf(neighbour, game.tier, game.deterrence) !== 'hostile',
    )
  );
}

/** What one neighbour, by its id, intends as a game stands. One the country has not is peaceful. */
export function intentionIn(game: Deterred, neighbourId: string): Intention {
  const neighbour = neighbourOf(game.country, neighbourId);
  return neighbour === undefined ? 'peaceful' : intentionOf(neighbour, game.tier, game.deterrence);
}

/**
 * How deterrence stands and what each neighbour makes of it, and where the budget given, the
 * one in force unless another is, would settle both. The quarter's own reckoning
 * (`resolveDeterrence`) reads the same sums.
 */
export function deterrenceStatus(
  game: Deterred & { readonly regions: readonly RegionState[]; readonly budget: Budget },
  budget: Budget = game.budget,
): DeterrenceStatus {
  const people = populationOf(game.regions);
  const spent = budget.spending.defence;
  const settles = deterrenceSettled(spent, people);
  return {
    deterrence: game.deterrence,
    settles,
    spent,
    expected: armyExpects(people),
    tier: game.tier,
    worthTaking: balance.neighbours.worthTakingPermille[game.tier],
    neighbours: game.country.map.neighbours.map((neighbour) => {
      const weighs = ambitionWeighs(neighbour, game.tier);
      return {
        neighbourId: neighbour.id,
        name: neighbour.name,
        ambition: neighbour.ambition,
        weighs,
        weighsIn: Object.fromEntries(
          TIERS.map((tier) => [tier, ambitionWeighs(neighbour, tier)]),
        ) as Record<Tier, number>,
        intention: intentionOf(neighbour, game.tier, game.deterrence),
        ...marksOf(weighs),
        settlesIntention: intentionOf(neighbour, game.tier, settles),
      };
    }),
  };
}

/**
 * One quarter of deterrence, and what the neighbours make of how it leaves the country.
 *
 * `before` is the game as the quarter began; `spent` is what was really spent on Defence,
 * `regions` the regions as the quarter leaves them and `tier` the tier it leaves in force.
 * Deterrence closes part of the gap to where the spending would settle it. Each neighbour is
 * then read afresh, and one whose intention has changed is reported with why: a tier passed,
 * which makes the country more worth taking, or deterrence moved.
 */
export function resolveDeterrence(
  before: Deterred,
  spent: Money,
  regions: readonly RegionState[],
  tier: Tier,
): DeterrenceOutcome {
  const people = populationOf(regions);
  const heading = deterrenceSettled(spent, people);
  const change = stepTowards(
    before.deterrence,
    heading,
    balance.neighbours.deterrence.adjustPermillePerQuarter,
  );
  const value = before.deterrence + change;
  const defence = `Defence spending is ${formatMoney(spent)} a quarter, against the ${formatMoney(armyExpects(people))} the army expects, which settles deterrence at ${formatPercent(heading)}.`;
  const turned = before.country.map.neighbours.map((neighbour) => ({
    neighbour,
    was: intentionOf(neighbour, before.tier, before.deterrence),
    now: intentionOf(neighbour, tier, value),
    settled: intentionOf(neighbour, tier, heading),
  }));
  return {
    deterrence: {
      value,
      change,
      contributions: [{ label: LOYALTY_DRIVER_NAMES.defence, amount: change }],
    },
    heading,
    neighbours: turned.map(({ neighbour, now, settled }) => ({
      neighbourId: neighbour.id,
      intention: now,
      heading: settled,
    })),
    entries: turned.flatMap(({ neighbour, was, now }) =>
      was === now
        ? []
        : [turnEntry(neighbour, { was, now }, { before, tier, deterrence: value }, defence)],
    ),
  };
}

/** What the turn report says when a neighbour's intention changes, and why it did. */
function turnEntry(
  neighbour: Neighbour,
  turn: { readonly was: Intention; readonly now: Intention },
  left: { readonly before: Deterred; readonly tier: Tier; readonly deterrence: number },
  defence: string,
): ReportEntry {
  const { was, now } = turn;
  const { before, tier, deterrence } = left;
  const { name } = neighbour;
  const worse = INTENTIONS.indexOf(now) > INTENTIONS.indexOf(was);
  const weighs = ambitionWeighs(neighbour, tier);
  const weighed = ambitionWeighs(neighbour, before.tier);
  const { watchfulBelow, hostileBelow } = marksOf(weighs);
  // The tier is why when it alone would have turned the neighbour, with deterrence as it was.
  const tierTurnedIt =
    tier !== before.tier && intentionOf(neighbour, tier, before.deterrence) !== was;
  const rose = weighs > weighed;
  const byTier = tierTurnedIt
    ? `The country has ${rose ? 'reached' : 'fallen back to'} ${TIER_NAMES[tier]}, a state ${rose ? 'more' : 'less'} worth taking: ${name}’s ambition now weighs ${formatPercent(weighs)} against deterrence, ${rose ? 'up' : 'down'} from ${formatPercent(weighed)}. `
    : '';
  const stands = tierTurnedIt
    ? `Deterrence is ${formatPercent(deterrence)}`
    : `Deterrence has ${deterrence < before.deterrence ? 'fallen' : 'risen'} to ${formatPercent(deterrence)}`;
  const against: Record<Intention, string> = {
    hostile: `below the ${formatPercent(hostileBelow)} under which ${name} is hostile`,
    watchful: worse
      ? `below the ${formatPercent(watchfulBelow)} under which ${name} is watchful`
      : `no longer below the ${formatPercent(hostileBelow)} under which ${name} is hostile, though still below the ${formatPercent(watchfulBelow)} under which it is watchful`,
    peaceful:
      weighs === 0
        ? `and ${name}’s ambition weighs nothing against it`
        : `no longer below the ${formatPercent(watchfulBelow)} under which ${name} is watchful`,
  };
  const seriousness: ReportEntry['seriousness'] = !worse
    ? 'notable'
    : now === 'hostile'
      ? 'serious'
      : 'warning';
  return {
    kind: 'neighbour',
    seriousness,
    headline: worse
      ? `${name} has turned ${INTENTION_NAMES[now].toLowerCase()}`
      : `${name} is ${INTENTION_NAMES[now].toLowerCase()} again`,
    cause: `${byTier}${stands}, ${against[now]}. ${defence}`,
    neighbourId: neighbour.id,
  };
}
