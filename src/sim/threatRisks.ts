import { armyLoyaltyStatus } from './army';
import {
  borderIncidentStatuses,
  borderIncidentTerms,
  couldAnnounce,
  incidentChance,
  incidentHeadline,
  incidentWouldDo,
  type IncidentStatus,
} from './borderIncidents';
import { revenueOf, type Budget } from './budget';
import { quarterNumber } from './calendar';
import { coupStatus } from './coup';
import { deterrenceStatus, hostileBelowIn, intentionOf } from './deterrence';
import { oreRise, oreSlumpRisk } from './financeRisks';
import { likelihoodOf, typicalOf, weigh, when, type Path, type Scope } from './riskScope';
import type { Risk } from './risks';
import type { GameState } from './state';
import { articleFor, formatMoney, formatPercent, formatQuarters } from './text';
import type { Money } from './types';
import { TIER_NAMES } from './vocabulary';

/*
 * The risks of force: a coup, a neighbour turning hostile and a border incident. `risksAhead`
 * in `risks.ts` gathers them with the rest, and each is read off the quarters it played.
 */

/** How many quarters into a path the army takes power, or null if it never does. */
function coupIn(path: Path, watched: number): number | null {
  const quarter = path.slice(0, watched).findIndex((resolved) => {
    const { outcome } = resolved.state;
    return outcome.status === 'lost' && outcome.cause === 'coup';
  });
  return quarter === -1 ? null : quarter;
}

/**
 * A coup comes when the army has plotted for long enough. It is looked for in every quarter
 * the look-ahead plays, so it is listed from the first quarter from which one could come
 * within the horizon: while the count runs, and before it starts when loyalty is on course to
 * fall to plotting and stay there. It ends the game, so it is listed however small the chance.
 * `budget` is the one being decided, which says what is spent on Defence.
 */
export function coupRisk(scope: Scope, budget: Budget): Risk[] {
  const taken = (path: Path) => coupIn(path, scope.watched);
  const stands = armyWords(scope, budget);
  const finding = weigh(scope, taken);
  if (finding === null) {
    // What a mine's chain pays in tax falls with the world ore price, and a treasury that
    // cannot cover the budget cuts Defence with every other area.
    return oreSlumpRisk(scope, taken, (quarter, slump) => ({
      kind: 'coup',
      headline: 'Coup',
      reason: `${slump}, and Defence would be cut with the rest of the budget: the army would take power ${when(quarter)}. ${stands.defence}`,
    }));
  }
  const takes = `the army takes power ${when(finding.soonest)}`;
  const course = finding.sure
    ? `As things stand ${takes}.`
    : `Should unrest spread or the treasury cut Defence, ${takes}.`;
  // A game that the supposed courses all but rule out is still warned of what would end it.
  return [
    {
      kind: 'coup',
      likelihood: likelihoodOf(finding.chance) ?? 'remote',
      headline: 'Coup',
      reason: `${stands.loyalty} ${course} ${stands.defence}`,
      withinQuarters: finding.soonest + 1,
    },
  ];
}

/** Where loyalty and the count stand, and what Defence is against what the army expects. */
function armyWords(scope: Scope, budget: Budget) {
  const { state } = scope;
  const army = armyLoyaltyStatus(state, budget);
  const coup = coupStatus(state);
  const mark = formatPercent(coup.plottingBelow, 0);
  const defence = `Defence is ${formatMoney(army.spent)} a quarter, and the army expects ${formatMoney(army.expected)}.`;
  if (coup.plotting) {
    const counted =
      coup.held === 0 ? '' : `, and has ended ${formatQuarters(coup.held)} running there`;
    return {
      loyalty: `National army loyalty is ${formatPercent(army.loyalty)}, below the ${mark} where the army plots${counted}; ${formatQuarters(coup.needed)} of it running bring a coup.`,
      defence,
    };
  }
  // When it first plots is read off the course with ordinary weather and no new event.
  const plots = typicalOf(scope.courses).findIndex(
    (resolved) => resolved.state.plottingQuarters > 0,
  );
  const from = plots === -1 ? '' : ` ${when(plots)}`;
  return {
    loyalty: `National army loyalty, now ${formatPercent(army.loyalty)}, is on course to fall below the ${mark} where the army plots${from}; ${formatQuarters(coup.needed)} of that running bring a coup.`,
    defence,
  };
}

/**
 * A neighbour turns hostile when deterrence stands below its hostile mark in the tier in
 * force (`hostileBelowIn`). Each neighbour not yet hostile is looked for in every quarter the look-ahead
 * plays, so it is listed while there is still time to raise Defence: before deterrence falls
 * that far, and before the country passes the tier that would make it worth taking. `budget`
 * is the one being decided, which says what is spent on Defence.
 */
export function neighbourRisk(scope: Scope, budget: Budget): Risk[] {
  const { state, watched } = scope;
  const status = deterrenceStatus(state, budget);
  return state.country.map.neighbours.flatMap((neighbour): Risk[] => {
    if (intentionOf(neighbour, state.tier, state.deterrence) === 'hostile') return [];
    const turnsIn = (path: Path) => {
      const quarter = path
        .slice(0, watched)
        .findIndex(
          (resolved) =>
            intentionOf(neighbour, resolved.state.tier, resolved.state.deterrence) === 'hostile',
        );
      return quarter === -1 ? null : quarter;
    };
    const finding = weigh(scope, turnsIn);
    const likelihood = finding === null ? null : likelihoodOf(finding.chance);
    const defence = `Defence is ${formatMoney(status.spent)} a quarter, which settles deterrence at ${formatPercent(status.settles)}.`;
    if (finding === null || likelihood === null) {
      // The quarters played leave the world prices be. A mine's chain earns more as the ore
      // price rises, and that alone may carry the country past a tier.
      const risen = oreRise(scope, turnsIn);
      const rare = risen === null ? null : likelihoodOf(risen.chance);
      if (risen === null || rare === null) return [];
      const reached = scope.oreRise[risen.quarter]?.state.tier ?? state.tier;
      return [
        {
          kind: 'neighbour',
          likelihood: rare,
          headline: `${neighbour.name} turning hostile`,
          reason: `${risen.rise}, and the country would reach ${TIER_NAMES[reached]} ${when(risen.quarter)}, where ${neighbour.name} is hostile while deterrence is below ${formatPercent(hostileBelowIn(neighbour, reached))}. Deterrence is now ${formatPercent(state.deterrence)}. ${defence}`,
          neighbourId: neighbour.id,
          withinQuarters: risen.quarter + 1,
        },
      ];
    }
    // Why is read off the first course that shows it, in the quarter it turns.
    const turned = scope.courses
      .flatMap((course) => course.paths)
      .flatMap((path) => path[turnsIn(path) ?? -1]?.state ?? [])
      .at(0);
    const tier = turned?.tier ?? state.tier;
    const mark = formatPercent(hostileBelowIn(neighbour, tier));
    // A tier is why when passing it would turn the neighbour with deterrence as it stands.
    const byTier =
      tier !== state.tier && intentionOf(neighbour, tier, state.deterrence) === 'hostile';
    const course = byTier
      ? `The country is on course to reach ${TIER_NAMES[tier]} ${when(finding.soonest)}, where ${neighbour.name} is hostile while deterrence is below ${mark}. Deterrence is now ${formatPercent(state.deterrence)}.`
      : `Deterrence, now ${formatPercent(state.deterrence)}, is on course to fall below the ${mark} under which ${neighbour.name} is hostile ${when(finding.soonest)}.`;
    return [
      {
        kind: 'neighbour',
        likelihood,
        headline: `${neighbour.name} turning hostile`,
        reason: `${course} ${defence}`,
        neighbourId: neighbour.id,
        withinQuarters: finding.soonest + 1,
      },
    ];
  });
}

/**
 * A border incident: one announced, until it begins, with whether it is on course to begin or
 * to be called off; one in force, while it lasts; and one not yet announced that a neighbour
 * hostile in time could announce, and that would begin within the horizon. What an incident
 * does is certain if it comes, so each is listed however unlikely it is, with what it costs.
 * What it then does to the treasury and to approval is read off the quarters played, which
 * live through every incident announced. `budget` is the one being decided.
 */
export function incidentRisk(scope: Scope, budget: Budget): Risk[] {
  const { state, watched } = scope;
  const statuses = borderIncidentStatuses(state);
  const announced = statuses.map((status): Risk => {
    const costs = taxCost(state, budget, status.neighbourId);
    if (status.inForce) {
      return {
        kind: 'borderIncident',
        likelihood: 'almostCertain',
        headline: status.headline,
        reason: `${status.description} That costs ${costs}.`,
        neighbourId: status.neighbourId,
        withinQuarters: 1,
      };
    }
    // Whether it begins is read off each course: it does where the quarter before leaves it
    // standing, which it does only if the neighbour is then still hostile.
    const begins = (path: Path) =>
      path[status.beginsIn - 1]?.state.borderIncidents.some((incident) =>
        sameIncident(incident, status),
      ) === true
        ? status.beginsIn
        : null;
    const finding = weigh(scope, begins);
    const told = `${status.description.charAt(0).toLowerCase()}${status.description.slice(1)}`;
    const course =
      finding === null
        ? `On your decisions as they are ${status.name} will no longer be hostile by then, and it is on course to be called off.`
        : `On your decisions as they are ${status.name} is ${finding.sure ? '' : 'likely '}still hostile by then. It would cost ${costs}.`;
    return {
      kind: 'borderIncident',
      likelihood: finding === null ? 'remote' : (likelihoodOf(finding.chance) ?? 'remote'),
      headline: `${status.headline} ahead`,
      reason: `Announced: ${told} ${course}`,
      neighbourId: status.neighbourId,
      withinQuarters: status.beginsIn + 1,
    };
  });

  // An incident announced as the quarter `ahead` quarters from now ends begins once its notice
  // has run, `ahead + 1 + notice` quarters from now. It is a risk here while that is among the
  // quarters watched, the last of which is `watched - 1` from now: so the last quarter whose
  // end can announce one that counts is the notice and one more before that.
  const now = quarterNumber(state.date);
  const notice = borderIncidentTerms.noticeQuarters;
  const lastWatched = watched - 1;
  const last = lastWatched - (notice + 1);
  const possible = state.country.map.neighbours.flatMap((neighbour): Risk[] => {
    const hostileIn = (path: Path) => {
      const quarter = path
        .slice(0, Math.max(0, last + 1))
        .findIndex(
          (resolved, ahead) =>
            couldAnnounce(state, neighbour.id, now + ahead + 1) &&
            intentionOf(neighbour, resolved.state.tier, resolved.state.deterrence) === 'hostile',
        );
      return quarter === -1 ? null : quarter;
    };
    // Hostile on the quarters as they are supposed, or failing that only should the world ore
    // price rise, which may carry the country past a tier.
    const weighed = weigh(scope, hostileIn);
    const risen = weighed === null ? oreRise(scope, hostileIn) : null;
    const finding =
      weighed ?? (risen === null ? null : { chance: risen.chance, soonest: risen.quarter });
    if (finding === null) return [];
    const draws = last - finding.soonest + 1;
    const chance = (finding.chance / 1000) * (1 - (1 - incidentChance) ** draws);
    const percent = Math.round(incidentChance * 100);
    const hostile = intentionOf(neighbour, state.tier, state.deterrence) === 'hostile';
    const stands =
      risen !== null
        ? `${risen.rise}, and ${neighbour.name} would turn hostile`
        : hostile
          ? `${neighbour.name} is hostile`
          : `${neighbour.name} is on course to turn hostile`;
    const soonest = finding.soonest + 1 + notice;
    return [
      {
        kind: 'borderIncident',
        likelihood: likelihoodOf(Math.round(chance * 1000)) ?? 'remote',
        headline: incidentHeadline(state.country, neighbour.id),
        reason: `${stands}, and each quarter it is so it may announce a border incident, ${articleFor(percent)} ${percent}% chance. One announced ${finding.soonest === 0 ? 'as this quarter ends' : when(finding.soonest)} would begin ${when(soonest)}. ${incidentWouldDo(state.country, neighbour.id)} It would cost about ${taxCost(state, budget, neighbour.id)}.`,
        neighbourId: neighbour.id,
        withinQuarters: soonest + 1,
      },
    ];
  });
  return [...announced, ...possible];
}

const sameIncident = (
  incident: { readonly neighbourId: string; readonly begins: GameState['date'] },
  status: Pick<IncidentStatus, 'neighbourId' | 'begins'>,
) =>
  incident.neighbourId === status.neighbourId &&
  quarterNumber(incident.begins) === quarterNumber(status.begins);

/**
 * What an incident on a neighbour's border costs in tax each quarter it lasts, as the country
 * stands and at the budget given: what the regions on the border would pay with it in force
 * against what they would without.
 */
export function incidentTaxCost(state: GameState, budget: Budget, neighbourId: string): Money {
  const others = state.borderIncidents.filter((incident) => incident.neighbourId !== neighbourId);
  const without = revenueOf({ ...state, borderIncidents: others }, budget);
  const withIt = revenueOf(
    {
      ...state,
      borderIncidents: [...others, { neighbourId, announced: state.date, begins: state.date }],
    },
    budget,
  );
  return without - withIt;
}

/** The same, as a risk says it: "$1.2m a quarter in tax". */
function taxCost(state: GameState, budget: Budget, neighbourId: string): string {
  return `${formatMoney(incidentTaxCost(state, budget, neighbourId))} a quarter in tax`;
}
