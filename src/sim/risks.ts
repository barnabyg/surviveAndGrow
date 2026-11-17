import { nationalApproval } from './approval';
import { sum } from './arithmetic';
import { balance } from './balance';
import { nextDate } from './calendar';
import { regionName } from './country';
import { defeatChancePermille, electionStatus } from './election';
import { eventName, eventsThatMayBegin, type PossibleEvent } from './events';
import { checkDecisions, resolveQuarter, type QuarterResolved } from './game';
import type { Decisions, GameState, RegionState } from './state';
import { prosperityStatus } from './prosperity';
import { articleFor, formatIndex, formatPercent, formatPoints, formatQuarters } from './text';
import { tierBelow, tierLostBelow, tierRank } from './tiers';
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
 * out, and a lost election. It plays the quarters ahead with the real rules, holding the decisions as they are,
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
  const whole: Scope = { state, watched, possible, courses };

  const risks = [
    ...state.regions.flatMap((region, index) => famineRisk(whole, region, index)),
    ...treasuryRisk(whole),
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
      // Projects are started, and a dilemma answered, in the quarter being decided alone.
      quarter === 0 ? decisions : { ...decisions, startProjects: [], dilemmaChoice: null },
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
  const typical = scope.courses[Math.floor(scope.courses.length / 2)]?.paths[0] ?? [];
  const first = typical[emptied(typical) ?? finding.soonest];
  const site =
    first === undefined || first.spendingCut
      ? undefined
      : state.country.sites.find((candidate) => candidate.id === first.pausedSites[0]);
  return [
    {
      kind: 'treasury',
      likelihood,
      headline: 'Empty treasury',
      reason:
        site === undefined
          ? `As things stand the treasury cannot cover the budget ${when(finding.soonest)}, and every area will be cut.`
          : `As things stand the treasury cannot cover the instalment on ${site.name} ${when(finding.soonest)}, and building there will pause.`,
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
  const typical = courses[Math.floor(courses.length / 2)]?.paths[0] ?? [];
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

/** Names in a line: "A", "A and B", "A, B and 2 other regions". */
function listed(names: readonly string[]): string {
  const [first = '', second = '', ...rest] = names;
  if (names.length === 1) return first;
  if (names.length === 2) return `${first} and ${second}`;
  return `${first}, ${second} and ${rest.length} other ${rest.length === 1 ? 'region' : 'regions'}`;
}
