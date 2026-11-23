import { nationalApproval } from './approval';
import { sum } from './arithmetic';
import { withinAusterity } from './austerity';
import { balance } from './balance';
import { nextDate } from './calendar';
import { regionName } from './country';
import { defeatChancePermille, electionStatus } from './election';
import { damagesSites, eventName, eventsThatMayBegin, harvestCutBy, holdsIn } from './events';
import { bailoutRisk, bondsAhead, creditRisk, maturityRisk, treasuryRisk } from './financeRisks';
import { checkDecisions } from './decisions';
import { resolveQuarter } from './game';
import {
  likelihoodOf,
  typicalOf,
  weigh,
  when,
  type Finding,
  type Path,
  type Scope,
  type Supposed,
} from './riskScope';
import type { Decisions, GameState, QuarterResolved, RegionState } from './state';
import { siteEffects, sitesInUse } from './projects';
import {
  shockCalled,
  shockName,
  shocksThatMayCome,
  shockStatuses,
  shockWouldDo,
} from './priceShocks';
import { prosperityStatus } from './prosperity';
import { articleFor, formatIndex, formatPercent, formatPoints, formatQuarters } from './text';
import { tierBelow, tierLostBelow, tierRank } from './tiers';
import { belowSafeAfterExport, FULL_SWING_PERMILLE } from './trade';
import { UPKEEP_ORDER_RULE } from './upkeep';
import {
  FOOD_STAGES,
  GOODS,
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
 * The dangers of the coming quarters: famine in a region, grain sold below the reserve's safe
 * level, strikes, a treasury that runs out, a missed payment on a debt that brings a bailout, a
 * bond's maturity that cannot be met, and a lost election. It plays the quarters ahead with the
 * real rules, holding the decisions as they are, once for each course the weather could take and
 * each event that could still begin, and weighs how many of those lead to each danger. The most
 * likely comes first, and a danger too unlikely to matter is left out, unless it would end the
 * game. It changes nothing and draws nothing from the random generator.
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
  const whole: Scope = {
    state,
    watched,
    possible,
    courses,
    bonds: bondsAhead(state, courses),
    oreSlump: play(state, decisions, played, 0, [], ORE_SLUMP),
  };

  const risks = [
    ...state.regions.flatMap((region, index) => famineRisk(whole, region, index)),
    ...eventRisk(whole),
    ...priceShockRisk(state, watched),
    ...reserveRisk(state, decisions),
    ...treasuryRisk(whole),
    ...bailoutRisk(whole),
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

/**
 * How far world markets move each good's price in a quarter played, in thousandths of its
 * swing. Unless supposed otherwise they leave the prices be: the pull towards the usual
 * price alone moves them.
 */
type PriceCourse = (quarter: number) => readonly number[];

const STEADY: PriceCourse = () => [];

/** The world ore price slumping as far as its forecast allows, and then left be. */
const ORE_SLUMP: PriceCourse = (quarter) =>
  quarter < balance.trade.forecastQuarters
    ? GOODS.map((good) => (good === 'ore' ? -FULL_SWING_PERMILLE : 0))
    : [];

/** Plays the quarters ahead with the weather at one share of its swing throughout. */
function play(
  start: GameState,
  decisions: Decisions,
  quarters: number,
  swingSharePermille: number,
  events: readonly Supposed[],
  prices: PriceCourse = STEADY,
): Path {
  const shock = Math.trunc(
    (balance.food.weatherSwingPermillePerQuarter * swingSharePermille) / 1000,
  );
  const path: QuarterResolved[] = [];
  let state = start;
  for (let quarter = 0; quarter < quarters && state.outcome.status === 'playing'; quarter += 1) {
    const resolved = resolveQuarter(
      state,
      // Projects are started, money borrowed, goods bought and a dilemma answered in the
      // quarter being decided alone. A bailout on the way holds the budget within the
      // austerity it brings.
      quarter === 0
        ? decisions
        : {
            ...decisions,
            budget: withinAusterity(state, decisions.budget),
            startProjects: [],
            startResearch: null,
            borrow: [],
            trade: [],
            dilemmaChoice: null,
          },
      {
        weatherShocks: state.regions.map(() => shock),
        struck: events.filter((event) => event.afterQuarters === quarter + 1),
        swing: 0,
        // Markets are supposed to leave the world prices be, unless the course says otherwise.
        // Nothing is bought after the quarter being decided, but a mine's chain earns at the
        // world ore price every quarter.
        priceShocks: prices(quarter),
        shocksAnnounced: [],
        // No dilemma is supposed to arise: what one does is the player's to choose.
        dilemmaRolls: [],
      },
    );
    path.push(resolved);
    ({ state } = resolved);
  }
  return path;
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

/**
 * An event that could begin within the horizon and damage the sites in its region. What it
 * takes of the harvest is weighed by the famine it could bring, but the damage it does to
 * sites is certain if it comes, so it is listed however unlikely it is.
 */
function eventRisk(scope: Scope): Risk[] {
  const { state, watched, possible } = scope;
  const sites = siteEffects(state);
  return possible
    .filter((event) => damagesSites(event.type) && event.afterQuarters < watched)
    .map((event) => {
      const index = state.country.regions.findIndex((region) => region.id === event.regionId);
      const name = eventName(event.type);
      const cut = harvestCutBy(event.type, holdsIn(sites, index)[event.type]);
      const percent = Math.round(event.chance * 100);
      const names = sitesInUse(state)
        .filter((inUse) => inUse.site.regionId === event.regionId)
        .map((inUse) => inUse.site.name);
      const damage =
        names.length === 0
          ? 'any site in use there decaying until its upkeep is paid'
          : `${listedSites(names)} decaying until ${names.length === 1 ? 'its' : 'their'} upkeep is paid`;
      return {
        kind: 'event',
        likelihood: likelihoodOf(Math.round(event.chance * 1000)) ?? 'remote',
        headline: `${name} in ${regionName(state.country, event.regionId)}`,
        reason: `A ${name.toLowerCase()} there ${when(event.afterQuarters)}, ${articleFor(percent)} ${percent}% chance, would take ${cut}% of its harvest and set ${damage}.`,
        regionId: event.regionId,
        withinQuarters: event.afterQuarters + 1,
      };
    });
}

/**
 * World price shocks: one announced, certain to come, or still in force with quarters to run;
 * and one not yet announced that could be, and move its price within the horizon. What a shock
 * does to the price is certain if it comes, so it is listed however unlikely it is. What the
 * price then does to the treasury is read off the quarters played, which move the prices as
 * the shocks announced push them.
 */
function priceShockRisk(state: GameState, watched: number): Risk[] {
  const announced = GOODS.flatMap((good) => shockStatuses(state, good)).flatMap((status): Risk[] =>
    status.nextPushIn === null
      ? []
      : [
          {
            kind: 'priceShock',
            likelihood: 'almostCertain',
            headline: status.inForce ? status.name : `${status.name} ahead`,
            reason: status.inForce
              ? status.description
              : `Announced: ${status.description.charAt(0).toLowerCase()}${status.description.slice(1)}`,
            // The price it pushes is the one the quarter after the push begins with.
            withinQuarters: status.inForce ? 1 : status.nextPushIn + 1,
          },
        ],
  );
  const possible = shocksThatMayCome(state, watched).map((shock): Risk => {
    const percent = Math.round(shock.chance * 100);
    return {
      kind: 'priceShock',
      likelihood: likelihoodOf(Math.round(shock.chance * 1000)) ?? 'remote',
      headline: shockName(shock.type),
      reason: `Should ${shockCalled(shock.type)} be announced ${shock.drawsLeft === 1 && shock.soonest === shock.noticeQuarters + 1 ? 'as this quarter ends' : 'in time'}, ${articleFor(percent)} ${percent}% chance, ${shockWouldDo(shock.type)}, the first time ${when(shock.soonest)}.`,
      withinQuarters: shock.soonest + 1,
    };
  });
  return [...announced, ...possible];
}

/**
 * Grain sold abroad that takes the national reserve below its safe level leaves less to fall
 * back on. The sale is the player's own, so it is certain once ordered.
 */
function reserveRisk(state: GameState, decisions: Decisions): Risk[] {
  const reason = belowSafeAfterExport(state, decisions.trade ?? []);
  if (reason === null) return [];
  return [
    {
      kind: 'reserve',
      likelihood: 'almostCertain',
      headline: 'Grain sold below the safe reserve',
      reason,
      withinQuarters: 1,
    },
  ];
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
