import { armyLoyaltyStatus } from './army';
import type { Budget } from './budget';
import { coupStatus } from './coup';
import { ambitionWeighs, deterrenceStatus, intentionOf } from './deterrence';
import { oreSlumpRisk } from './financeRisks';
import { likelihoodOf, typicalOf, weigh, when, type Path, type Scope } from './riskScope';
import type { Risk } from './risks';
import { formatMoney, formatPercent, formatQuarters } from './text';
import { TIER_NAMES } from './vocabulary';

/*
 * The risks of force: a coup, and a neighbour turning hostile. `risksAhead` in `risks.ts`
 * gathers them with the rest, and each is read off the quarters it played.
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
  const stands = standing(scope, budget);
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
function standing(scope: Scope, budget: Budget) {
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
 * A neighbour turns hostile when deterrence stands below what its ambition weighs in the tier
 * in force. Each neighbour not yet hostile is looked for in every quarter the look-ahead
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
    if (finding === null || likelihood === null) return [];
    // Why is read off the first course that shows it, in the quarter it turns.
    const turned = scope.courses
      .flatMap((course) => course.paths)
      .flatMap((path) => path[turnsIn(path) ?? -1]?.state ?? [])
      .at(0);
    const tier = turned?.tier ?? state.tier;
    const weighs = ambitionWeighs(neighbour, tier);
    // A tier is why when passing it would turn the neighbour with deterrence as it stands.
    const byTier =
      tier !== state.tier && intentionOf(neighbour, tier, state.deterrence) === 'hostile';
    const course = byTier
      ? `The country is on course to reach ${TIER_NAMES[tier]} ${when(finding.soonest)}, where ${neighbour.name}’s ambition weighs ${formatPercent(weighs)} against deterrence, now ${formatPercent(state.deterrence)}.`
      : `Deterrence, now ${formatPercent(state.deterrence)}, is on course to fall below the ${formatPercent(weighs)} that ${neighbour.name}’s ambition weighs ${when(finding.soonest)}.`;
    return [
      {
        kind: 'neighbour',
        likelihood,
        headline: `${neighbour.name} turning hostile`,
        reason: `${course} Defence is ${formatMoney(status.spent)} a quarter, which settles deterrence at ${formatPercent(status.settles)}.`,
        neighbourId: neighbour.id,
        withinQuarters: finding.soonest + 1,
      },
    ];
  });
}
