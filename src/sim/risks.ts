import { nationalApproval } from './approval';
import { sum } from './arithmetic';
import { balance } from './balance';
import { nextDate } from './calendar';
import { regionName } from './country';
import { creditStatus, loanRateSpan, ratingCause, ratingRank } from './credit';
import {
  debtName,
  debtStatus,
  dueAtMaturity,
  maturityOf,
  missedMaturityQuarters,
  paysAtMaturity,
  type Debt,
} from './debt';
import { defeatChancePermille, electionStatus } from './election';
import { eventName, eventsThatMayBegin, type PossibleEvent } from './events';
import { checkDecisions, resolveQuarter, type QuarterResolved } from './game';
import type { Decisions, GameState, RegionState } from './state';
import type { Money } from './types';
import { prosperityStatus } from './prosperity';
import {
  articleFor,
  formatIndex,
  formatMoney,
  formatPercent,
  formatPoints,
  formatQuarters,
} from './text';
import { tierBelow, tierLostBelow, tierRank } from './tiers';
import { UPKEEP_ORDER_RULE } from './upkeep';
import {
  FOOD_STAGES,
  LIKELIHOODS,
  RISK_KINDS,
  TIER_NAMES,
  UNREST_LEVELS,
  type Likelihood,
  type RiskKind,
  type Unrest,
} from './vocabulary';

/** A danger the coming quarters hold if the player's decisions stay as they are. */
export interface Risk {
  readonly kind: RiskKind;
  readonly likelihood: Likelihood;
  /** What the danger is, in a few words: "Famine in The Dry East". */
  readonly headline: string;
  /** Why it threatens and how soon, in a line. */
  readonly reason: string;
  /** The region it threatens, when it threatens one place. */
  readonly regionId?: string;
  /** How soon it could come, in quarters: 1 is the quarter being decided. */
  readonly withinQuarters: number;
}

/** How many quarters ahead the dangers are looked for, counting the one being decided. */
export const riskHorizonQuarters = balance.risks.horizonQuarters;

/**
 * The dangers of the coming quarters: famine in a region, strikes, a treasury that runs
 * out, a missed payment on a debt, a bond's maturity that cannot be met, and a lost
 * election. It plays the quarters ahead with the real rules, holding the decisions as they are,
 * once for each course the weather could take and each event that could still begin, and
 * weighs how many of those lead to each danger. The most likely comes first, and a danger
 * too unlikely to matter is left out, unless it would end the game. It changes nothing and draws nothing from the random
 * generator.
 * @throws RangeError when a decision is outside what the game allows.
 * @throws Error when the game is already over.
 */
export function risksAhead(state: GameState, decisions: Decisions): readonly Risk[] {
  checkDecisions(state, decisions, false);
  const { horizonQuarters, hungerShowsQuartersLater, weatherOutlooks } = balance.risks;
  // A government that wins the election governs on, so the dangers beyond it count too.
  const watched = horizonQuarters;
  const played = horizonQuarters + hungerShowsQuartersLater;

  const possible = eventsAhead(state, played);
  // What is supposed of events: none begin, each begins alone, and all begin together.
  const supposed: (readonly Supposed[])[] = [
    [],
    ...possible.map((event) => [event]),
    ...(possible.length > 1 ? [possible] : []),
  ];
  const courses = weatherOutlooks.map((outlook) => ({
    weight: outlook.weightPermille,
    paths: supposed.map((events) =>
      play(state, decisions, played, outlook.swingSharePermille, events),
    ),
  }));
  const whole: Scope = { state, watched, possible, courses, bonds: bondsAhead(state, courses) };

  const risks = [
    ...state.regions.flatMap((region, index) => famineRisk(whole, region, index)),
    ...treasuryRisk(whole),
    ...missedPaymentRisk(whole),
    ...whole.bonds.flatMap((bond) => maturityRisk(whole, bond)),
    ...creditRisk(whole),
    ...upkeepRisk(whole),
    ...strikeRisk(whole),
    ...tierRisk(whole),
    ...electionRisk(whole),
  ];
  const rank = (risk: Risk) => LIKELIHOODS.indexOf(risk.likelihood);
  const order = (risk: Risk) => RISK_KINDS.indexOf(risk.kind);
  return risks.sort(
    (a, b) => rank(b) - rank(a) || a.withinQuarters - b.withinQuarters || order(a) - order(b),
  );
}

/** An event supposed to begin after a number of the quarters ahead have been played. */
interface Supposed extends PossibleEvent {
  readonly afterQuarters: number;
}

/** The quarters ahead as one course of weather and one set of events would have them. */
type Path = readonly QuarterResolved[];

/** Everything the projection found, from which each risk is read. */
interface Scope {
  readonly state: GameState;
  /** How many of the quarters played count for dangers other than hunger. */
  readonly watched: number;
  readonly possible: readonly Supposed[];
  /**
   * One entry for each course of weather, with the chance it stands for and a path for each
   * supposition about events: none first, then each possible event alone in the order of
   * `possible`, then all together when there is more than one.
   */
  readonly courses: readonly { readonly weight: number; readonly paths: readonly Path[] }[];
  /** Every bond owed or about to be issued that is still to fall due in one payment. */
  readonly bonds: readonly BondAhead[];
}

/** A bond whose whole sum is still to fall due. */
interface BondAhead {
  readonly name: string;
  readonly number: number;
  /** How many quarters are played before the one it falls due in: 0 is the one being decided. */
  readonly matures: number;
}

/**
 * The bonds owed, and those to be issued as the quarter being decided ends, each with how
 * far off its maturity is. A bond whose missed maturity turned it into level repayments
 * has no maturity left to fall due.
 */
function bondsAhead(state: GameState, courses: Scope['courses']): BondAhead[] {
  const owed = state.debts.filter(paysAtMaturity);
  const issued = (typicalOf(courses)[0]?.state.debts ?? []).filter(
    (debt) => paysAtMaturity(debt) && !state.debts.some((other) => other.number === debt.number),
  );
  const ahead = (debt: Debt, from: number): BondAhead => ({
    name: debtName(debt),
    number: debt.number,
    matures: from + debt.quartersLeft - 1,
  });
  return [...owed.map((debt) => ahead(debt, 0)), ...issued.map((debt) => ahead(debt, 1))];
}

/** The course with ordinary weather and no new event. */
function typicalOf(courses: Scope['courses']): Path {
  return courses[Math.floor(courses.length / 2)]?.paths[0] ?? [];
}

/**
 * The events that could begin while the quarters ahead are played. One that begins as the
 * last of them ends is left out, since nothing played would show what it did.
 */
function eventsAhead(state: GameState, played: number): Supposed[] {
  const possible: Supposed[] = [];
  let date = state.date;
  for (let afterQuarters = 1; afterQuarters < played; afterQuarters += 1) {
    date = nextDate(date);
    possible.push(
      ...eventsThatMayBegin(state.country, date).map((event) => ({ ...event, afterQuarters })),
    );
  }
  return possible;
}

/** Plays the quarters ahead with the weather at one share of its swing throughout. */
function play(
  start: GameState,
  decisions: Decisions,
  quarters: number,
  swingSharePermille: number,
  events: readonly Supposed[],
): Path {
  const shock = Math.trunc(
    (balance.food.weatherSwingPermillePerQuarter * swingSharePermille) / 1000,
  );
  const path: QuarterResolved[] = [];
  let state = start;
  for (let quarter = 0; quarter < quarters && state.outcome.status === 'playing'; quarter += 1) {
    const resolved = resolveQuarter(
      state,
      // Projects are started, money borrowed and a dilemma answered in the quarter being
      // decided alone.
      quarter === 0
        ? decisions
        : { ...decisions, startProjects: [], borrow: [], dilemmaChoice: null },
      {
        weatherShocks: state.regions.map(() => shock),
        struck: events.filter((event) => event.afterQuarters === quarter + 1),
        swing: 0,
        // No dilemma is supposed to arise: what one does is the player's to choose.
        dilemmaRolls: [],
      },
    );
    path.push(resolved);
    ({ state } = resolved);
  }
  return path;
}

/** What was found of one danger: how likely it is and how soon it could come. */
interface Finding {
  /** The chance of it, in thousandths. */
  readonly chance: number;
  /** How many quarters are played before it shows, at the soonest: 0 is the one being decided. */
  readonly soonest: number;
  /** True when it comes whatever the weather does, with no new event. */
  readonly sure: boolean;
  /** True when it comes only if an event begins. */
  readonly needsEvent: boolean;
  /** The event that brings it, when it comes with an event and not without. */
  readonly event: PossibleEvent | null;
}

/**
 * Weighs one danger across every path. `shows` says how many quarters into a path the
 * danger first shows, or null if it never does. A danger to one region answers to the
 * events that could strike that region; one to the whole country answers to them all.
 */
function weigh(
  scope: Scope,
  shows: (path: Path) => number | null,
  regionId?: string,
): Finding | null {
  const { possible, courses } = scope;
  const own = possible.flatMap((event, index) =>
    regionId === undefined || event.regionId === regionId ? [{ event, index }] : [],
  );
  const anyOf = (events: readonly PossibleEvent[]) =>
    1 - events.reduce((none, event) => none * (1 - event.chance), 1);

  let chance = 0;
  const shown: number[] = [];
  let sure = true;
  let needsEvent = true;
  let bringer: PossibleEvent | null = null;
  for (const course of courses) {
    const unprompted = shows(course.paths[0] ?? []);
    if (unprompted !== null) {
      chance += course.weight;
      needsEvent = false;
      shown.push(unprompted);
      continue;
    }
    sure = false;
    // With each of its own events alone, and failing those with every event at once.
    const bringing = own.flatMap(({ event, index }) => {
      const quarters = shows(course.paths[index + 1] ?? []);
      return quarters === null ? [] : [{ event, quarters }];
    });
    const together = possible.length > 1 ? shows(course.paths.at(-1) ?? []) : null;
    if (bringing.length > 0) {
      chance += course.weight * anyOf(bringing.map((entry) => entry.event));
      bringer ??= bringing[0]?.event ?? null;
      shown.push(...bringing.map((entry) => entry.quarters));
    } else if (together !== null) {
      chance += course.weight * anyOf(possible);
      shown.push(together);
    }
  }
  if (shown.length === 0) return null;
  return {
    chance: Math.round(chance),
    soonest: Math.min(...shown),
    sure,
    needsEvent,
    event: needsEvent ? bringer : null,
  };
}

/** The likelihood a chance in thousandths amounts to, or null when it is negligible. */
function likelihoodOf(chance: number): Likelihood | null {
  const from = balance.risks.likelihoodFromPermille;
  return LIKELIHOODS.findLast((likelihood) => chance >= from[likelihood]) ?? null;
}

/**
 * Famine threatens a region when its people would eat so little that their hunger deepens
 * by stages to famine. That is looked for a little past the horizon, so that a harvest
 * inside it is judged by what it leaves.
 */
function famineRisk(scope: Scope, region: RegionState, index: number): Risk[] {
  const { famineSharePermille } = balance.hunger;
  const starving = (path: Path) => {
    const quarter = path.findIndex(
      (resolved) => (resolved.fedPermille[index] ?? 1000) < famineSharePermille,
    );
    return quarter === -1 ? null : quarter;
  };
  const finding = weigh(scope, starving, region.id);
  const likelihood = finding === null ? null : likelihoodOf(finding.chance);
  if (finding === null || likelihood === null) return [];
  return [
    {
      kind: 'famine',
      likelihood,
      headline: `Famine in ${regionName(scope.state.country, region.id)}`,
      reason: famineReason(scope.state, region, finding),
      regionId: region.id,
      withinQuarters: finding.soonest + 1,
    },
  ];
}

function famineReason(state: GameState, region: RegionState, finding: Finding): string {
  const stagesToFamine = FOOD_STAGES.indexOf('famine') - FOOD_STAGES.indexOf(region.foodStage);
  if (finding.soonest === 0 && region.foodStage === 'famine') {
    const left = balance.hunger.collapseAfterFamineQuarters - region.famineQuarters;
    return `Famine has hold of it. ${left <= 1 ? 'Another quarter' : `${left} more quarters`} of it and the state collapses.`;
  }
  if (finding.soonest === 0 && region.foodStage !== 'adequate') {
    return `Its people are going hungry. Left alone, that is famine within ${formatQuarters(stagesToFamine)}.`;
  }
  const short = `short of food ${when(finding.soonest)}`;
  if (finding.event !== null) {
    const { type, chance } = finding.event;
    const percent = Math.round(chance * 100);
    return `A ${eventName(type).toLowerCase()} there this year, ${articleFor(percent)} ${percent}% chance, would leave it ${short}.`;
  }
  if (!finding.sure) return `Poor weather before the harvest would leave it ${short}.`;
  const event = state.events.find((active) => active.regionId === region.id);
  const cause =
    event !== undefined
      ? `The ${eventName(event.type).toLowerCase()} has cut its harvest.`
      : finding.soonest === 0
        ? 'It has too little food to last until the harvest.'
        : 'Its harvest will be too small to last the year.';
  return `${cause} It runs ${short}, and left alone that is famine ${formatQuarters(stagesToFamine - 1)} later.`;
}

/** The treasury runs out when it cannot cover the budget, or an instalment on a project. */
function treasuryRisk(scope: Scope): Risk[] {
  const { state, watched } = scope;
  const emptied = (path: Path) => {
    const quarter = path
      .slice(0, watched)
      .findIndex((resolved) => resolved.spendingCut || resolved.pausedSites.length > 0);
    return quarter === -1 ? null : quarter;
  };
  const finding = weigh(scope, emptied);
  const likelihood = finding === null ? null : likelihoodOf(finding.chance);
  if (finding === null || likelihood === null) return [];

  // What gives way first is read off the course with ordinary weather and no new event.
  const typical = typicalOf(scope.courses);
  const quarter = emptied(typical) ?? finding.soonest;
  const first = typical[quarter];
  const site =
    first === undefined || first.spendingCut
      ? undefined
      : state.country.sites.find((candidate) => candidate.id === first.pausedSites[0]);
  // Repayments are paid before anything else, so they are what squeezes the rest: those due
  // in the quarter the treasury runs out, as the course has it begin.
  const begins = quarter === 0 ? state : (typical[quarter - 1]?.state ?? state);
  const { repayments } = debtStatus(begins);
  const firstNote =
    repayments > 0
      ? ` Repayments on debts come first: ${formatMoney(repayments)} ${when(quarter)}.`
      : '';
  return [
    {
      kind: 'treasury',
      likelihood,
      headline: 'Empty treasury',
      reason:
        (site === undefined
          ? `As things stand the treasury cannot cover the budget ${when(finding.soonest)}, and every area will be cut.`
          : `As things stand the treasury cannot cover the instalment on ${site.name} ${when(finding.soonest)}, and building there will pause.`) +
        firstNote,
      withinQuarters: finding.soonest + 1,
    },
  ];
}

/**
 * A payment on a debt is missed when the treasury and the quarter's revenue together cannot
 * cover it. What goes unpaid is added to the debt.
 */
function missedPaymentRisk(scope: Scope): Risk[] {
  const { watched, bonds } = scope;
  // A maturity missed is warned of as such (`maturityRisk`), so it is not counted here.
  const maturing = (quarter: number) =>
    bonds.filter((bond) => bond.matures === quarter).map((bond) => bond.name);
  const misses = (path: Path) => {
    const quarter = path
      .slice(0, watched)
      .findIndex((resolved, index) =>
        resolved.missedOn.some((name) => !maturing(index).includes(name)),
      );
    return quarter === -1 ? null : quarter;
  };
  const finding = weigh(scope, misses);
  const likelihood = finding === null ? null : likelihoodOf(finding.chance);
  if (finding === null || likelihood === null) return [];

  // Which debt goes unpaid is read off the course with ordinary weather and no new event.
  const typical = typicalOf(scope.courses);
  const first = typical[misses(typical) ?? finding.soonest];
  const which =
    first?.missedOn.find((name) => !maturing(misses(typical) ?? finding.soonest).includes(name)) ??
    'a debt';
  return [
    {
      kind: 'missedPayment',
      likelihood,
      headline: 'Missed payment',
      reason: `As things stand the treasury and revenue cannot cover the repayment on ${which} ${when(finding.soonest)}. What goes unpaid is added to the debt, and the repayments still to come rise.`,
      withinQuarters: finding.soonest + 1,
    },
  ];
}

/**
 * A bond's maturity is missed when what the treasury holds and the quarter's revenue cannot
 * cover its whole sum and that quarter's interest. Inside the horizon that is read off the quarters played. Beyond it,
 * where nothing is played, the treasury is supposed to go on as it went over the quarters
 * played: by what they raised beyond what they spent, before any principal was repaid or
 * anything borrowed. From that is taken the principal the other debts will repay before the
 * bond falls due: bonds that mature first, all of it, and a loan the share of what it owes
 * that its quarters left by then make up. The maturity is warned of if what is left would not
 * cover the bond.
 */
function maturityRisk(scope: Scope, bond: BondAhead): Risk[] {
  const { state, watched, courses } = scope;
  const misses = (path: Path) =>
    shortOf(path, bond, watched, state.treasury) === null ? null : bond.matures;
  const finding = weigh(scope, misses);
  const likelihood = finding === null ? null : likelihoodOf(finding.chance);
  if (finding === null || likelihood === null) return [];

  const debt = bondAsItMatures(scope, bond);
  if (debt === undefined) return [];
  const due = dueAtMaturity(debt);
  const date = maturityOf({ quartersLeft: bond.matures + 1 }, state.date);
  const falls = `${bond.name}’s ${formatMoney(due)} falls due in full ${when(bond.matures)}, in Year ${date.year} · Quarter ${date.quarter}.`;
  const held =
    bond.matures < watched ? null : shortOf(typicalOf(courses), bond, watched, state.treasury);
  const course =
    held === null
      ? 'As things stand the treasury and revenue cannot cover it.'
      : `On the course it is on, the treasury will hold about ${formatMoney(Math.max(0, held.available))} by then.`;
  return [
    {
      kind: 'bondMaturity',
      likelihood,
      headline: `${bond.name} cannot be repaid`,
      reason: `${falls} ${course} What goes unpaid is a missed payment: it is added to the debt and repaid over ${formatQuarters(missedMaturityQuarters(debt))}, and the payment record suffers.`,
      withinQuarters: bond.matures + 1,
    },
  ];
}

/**
 * A bond as its maturity quarter begins on the course with ordinary weather and no new event,
 * or, beyond the quarters played, as the last of them leaves it.
 */
function bondAsItMatures(scope: Scope, bond: BondAhead): Debt | undefined {
  const states = [scope.state, ...typicalOf(scope.courses).map((resolved) => resolved.state)];
  return states
    .slice(0, bond.matures + 1)
    .reverse()
    .map((each) => each.debts.find((debt) => debt.number === bond.number))
    .find((debt) => debt !== undefined);
}

/**
 * Whether a path leaves a bond's maturity uncovered, and if it lies beyond the quarters
 * played, what the treasury is supposed to hold for it then: null when it is covered, or a
 * path the game ends on before the bond falls due.
 */
function shortOf(
  path: Path,
  bond: BondAhead,
  watched: number,
  start: Money,
): { readonly available: Money } | null {
  if (bond.matures < watched) {
    const resolved = path[bond.matures];
    return resolved?.missedOn.includes(bond.name) === true ? { available: 0 } : null;
  }
  const played = path.slice(0, watched);
  const end = played.at(-1)?.state;
  if (end?.outcome.status !== 'playing') return null;
  const own = end.debts.find((debt) => debt.number === bond.number);
  if (own === undefined || !paysAtMaturity(own)) return null;

  let underlying = 0;
  played.forEach((resolved, index) => {
    const from = index === 0 ? start : (played[index - 1]?.state.treasury ?? start);
    underlying += resolved.state.treasury - from + resolved.principalRepaid - resolved.borrowed;
  });
  // Played quarters run from the one being decided; the rest are the ones up to maturity.
  const rest = bond.matures - played.length + 1;
  const trend = Math.floor(underlying / played.length);
  const others = end.debts.filter((debt) => debt.number !== bond.number);
  const repaidFirst = sum(
    others.map((debt) => {
      if (paysAtMaturity(debt)) {
        return debt.quartersLeft < rest || (debt.quartersLeft === rest && debt.number < bond.number)
          ? debt.owed
          : 0;
      }
      return Math.floor((debt.owed * Math.min(rest, debt.quartersLeft)) / debt.quartersLeft);
    }),
  );
  const available = end.treasury + trend * rest - repaidFirst;
  return available < dueAtMaturity(own) ? { available } : null;
}

/**
 * Sites decay when upkeep falls short of what the sites in use need, whether because it is
 * set too low, because a site coming into use needs more, or because the treasury cuts it.
 */
function upkeepRisk(scope: Scope): Risk[] {
  const { state, watched } = scope;
  const falls = (path: Path) => {
    const quarter = path.slice(0, watched).findIndex((resolved) => resolved.upkeepShort.length > 0);
    return quarter === -1 ? null : quarter;
  };
  const finding = weigh(scope, falls);
  const likelihood = finding === null ? null : likelihoodOf(finding.chance);
  if (finding === null || likelihood === null) return [];

  // Which sites go without is read off the course with ordinary weather and no new event.
  const typical = typicalOf(scope.courses);
  const first = typical[falls(typical) ?? finding.soonest];
  const names = (first?.upkeepShort ?? []).map(
    (siteId) => state.country.sites.find((site) => site.id === siteId)?.name ?? siteId,
  );
  const which = names.length === 0 ? 'sites in use' : listedSites(names);
  return [
    {
      kind: 'upkeep',
      likelihood,
      headline: 'Upkeep falls short',
      reason: `As things stand upkeep falls short ${when(finding.soonest)}, and ${which} will decay. ${UPKEEP_ORDER_RULE}`,
      withinQuarters: finding.soonest + 1,
    },
  ];
}

/**
 * Strikes threaten wherever a region's unrest would be worse than it is now: strikes where
 * it is calm, protests where it is already striking. The regions are listed together.
 */
function strikeRisk(scope: Scope): Risk[] {
  const { state, watched } = scope;
  const level = (unrest: Unrest) => UNREST_LEVELS.indexOf(unrest);
  const threatened = state.regions.flatMap((region, index) => {
    const worsens = (path: Path) => {
      const quarter = path
        .slice(0, watched)
        .findIndex(
          (resolved) =>
            level(resolved.state.regions[index]?.unrest ?? 'calm') > level(region.unrest),
        );
      return quarter === -1 ? null : quarter;
    };
    const finding = weigh(scope, worsens, region.id);
    const likelihood = finding === null ? null : likelihoodOf(finding.chance);
    return finding === null || likelihood === null ? [] : [{ region, finding, likelihood }];
  });
  const [first] = threatened;
  if (first === undefined) return [];

  const likelihood = threatened
    .map((entry) => entry.likelihood)
    .reduce((most, next) => (LIKELIHOODS.indexOf(next) > LIKELIHOODS.indexOf(most) ? next : most));
  const soonest = Math.min(...threatened.map((entry) => entry.finding.soonest));
  // Where strikes are already on, what threatens is protests.
  const striking = threatened.filter((entry) => entry.region.unrest !== 'calm');
  const what =
    striking.length === 0
      ? 'Strikes'
      : striking.length === threatened.length
        ? 'Protests'
        : 'Strikes and protests';
  const mark =
    striking.length === threatened.length ? balance.unrest.protests : balance.unrest.strikes;
  const names = threatened.map((entry) => regionName(state.country, entry.region.id));
  const where =
    threatened.length === state.regions.length && names.length > 1 ? 'every region' : listed(names);
  return [
    {
      kind: 'strikes',
      likelihood,
      headline: threatened.length === 1 ? `${what} in ${names[0] ?? ''}` : what,
      reason: `Approval in ${where} is on course to fall below ${formatPercent(mark.belowPermille, 0)} ${when(soonest)}. ${what} cut what a region produces.`,
      ...(threatened.length === 1 ? { regionId: first.region.id } : {}),
      withinQuarters: soonest + 1,
    },
  ];
}

/**
 * The credit rating falls when the payment record, the debt burden or the deficit the
 * quarters ahead leave takes its score below the step in force. Why is read off the course
 * with ordinary weather and no new event, or the first that falls where that one does not.
 */
function creditRisk(scope: Scope): Risk[] {
  const { state, watched, courses } = scope;
  const falls = (path: Path) => {
    const quarter = path
      .slice(0, watched)
      .findIndex(
        (resolved) => ratingRank(resolved.state.credit.rating) < ratingRank(state.credit.rating),
      );
    return quarter === -1 ? null : quarter;
  };
  const finding = weigh(scope, falls);
  const likelihood = finding === null ? null : likelihoodOf(finding.chance);
  if (finding === null || likelihood === null) return [];

  const typical = typicalOf(courses);
  const path =
    falls(typical) === null
      ? (courses.flatMap((course) => course.paths).find((each) => falls(each) !== null) ?? [])
      : typical;
  const quarter = falls(path) ?? finding.soonest;
  const fallen = path[quarter]?.state;
  if (fallen === undefined) return [];
  const now = creditStatus(state);
  const then = creditStatus(fallen);
  const missedOn = path.slice(0, quarter + 1).flatMap((resolved) => resolved.missedOn);
  return [
    {
      kind: 'creditRating',
      likelihood,
      headline: `Credit rating cut to ${then.name}`,
      reason: `The credit rating, now ${now.name}, is on course to fall to ${then.name} ${when(quarter)}. ${ratingCause(now, then, missedOn)} New loans would cost ${loanRateSpan(then.current)} a year.`,
      withinQuarters: quarter + 1,
    },
  ];
}

/**
 * The nation falls back a tier when prosperity drops past the margin below where the tier in
 * force begins. Prosperity moves slowly, so this warns of it while there is time to act.
 */
function tierRisk(scope: Scope): Risk[] {
  const { state, watched } = scope;
  const falls = (path: Path) => {
    const quarter = path
      .slice(0, watched)
      .findIndex((resolved) => tierRank(resolved.state.tier) < tierRank(state.tier));
    return quarter === -1 ? null : quarter;
  };
  const finding = weigh(scope, falls);
  const likelihood = finding === null ? null : likelihoodOf(finding.chance);
  if (finding === null || likelihood === null) return [];
  const lost = tierLostBelow(state.tier) ?? 0;
  const below = tierBelow(state.tier);
  return [
    {
      kind: 'tier',
      likelihood,
      headline: `Falling back to ${TIER_NAMES[below]}`,
      reason: `Prosperity, now ${formatIndex(prosperityStatus(state).value)}, is on course to fall below ${formatIndex(lost)} ${when(finding.soonest)}, where ${TIER_NAMES[state.tier]} is lost.`,
      withinQuarters: finding.soonest + 1,
    },
  ];
}

/**
 * The election is lost when approval on polling day, moved by the campaign's swing, falls
 * short of the share needed. It is looked for once the vote is inside the horizon. Losing
 * ends the game, so it is listed whenever any swing could lose, however small the chance.
 */
function electionRisk(scope: Scope): Risk[] {
  const { state, possible, courses } = scope;
  const { quartersAway, needed } = electionStatus(state);
  if (quartersAway + 1 > balance.risks.horizonQuarters) return [];

  // Approval on polling day down each path that reaches it. One that famine ends never votes.
  const pollingDay = (path: Path) => {
    const vote = path.find((resolved) => resolved.electionHeld)?.state;
    return vote === undefined ? null : nationalApproval(vote.regions);
  };
  const defeat = (path: Path) => {
    const approval = pollingDay(path);
    return approval === null ? 0 : defeatChancePermille(approval);
  };
  if (!courses.some((course) => course.paths.some((path) => defeat(path) > 0))) return [];

  // Each course of weather counts for its chance of defeat with no new event, and for the
  // worst that events could make of it by the chance that any of them begins.
  const anyEvent = 1 - possible.reduce((none, event) => none * (1 - event.chance), 1);
  const chance = Math.round(
    sum(
      courses.map((course) => {
        const unprompted = defeat(course.paths[0] ?? []);
        const worst = Math.max(...course.paths.map(defeat));
        return (course.weight * (unprompted + (worst - unprompted) * anyEvent)) / 1000;
      }),
    ),
  );
  // The figure given is the one ordinary weather and no new event lead to, where that
  // course reaches the vote.
  const typical = typicalOf(courses);
  const approval =
    pollingDay(typical) ??
    courses.flatMap((course) => course.paths.flatMap((path) => pollingDay(path) ?? [])).at(0);
  if (approval === undefined) return [];
  return [
    {
      kind: 'election',
      likelihood: likelihoodOf(chance) ?? 'remote',
      headline: 'Election defeat',
      reason: `The vote is held ${when(quartersAway)}. Approval is on course for ${formatPercent(approval)} by then, the campaign can move the vote by ${formatPoints(balance.election.swingPermille)} either way, and ${formatPercent(needed, 0)} is needed to win.`,
      withinQuarters: quartersAway + 1,
    },
  ];
}

/** When something comes, counted in quarters played before it: "this quarter", "in 3 quarters". */
function when(quartersAway: number): string {
  if (quartersAway === 0) return 'this quarter';
  return quartersAway === 1 ? 'next quarter' : `in ${quartersAway} quarters`;
}

/** Site names in a line: "A", "A and B", "A, B and 2 other sites". */
function listedSites(names: readonly string[]): string {
  const [first = '', second = '', ...rest] = names;
  if (names.length === 1) return first;
  if (names.length === 2) return `${first} and ${second}`;
  return `${first}, ${second} and ${rest.length} other ${rest.length === 1 ? 'site' : 'sites'}`;
}

/** Names in a line: "A", "A and B", "A, B and 2 other regions". */
function listed(names: readonly string[]): string {
  const [first = '', second = '', ...rest] = names;
  if (names.length === 1) return first;
  if (names.length === 2) return `${first} and ${second}`;
  return `${first}, ${second} and ${rest.length} other ${rest.length === 1 ? 'region' : 'regions'}`;
}
