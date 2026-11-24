import { armyLoyaltyStatus } from './army';
import type { Budget } from './budget';
import { coupStatus } from './coup';
import { oreSlumpRisk } from './financeRisks';
import { likelihoodOf, typicalOf, weigh, when, type Path, type Scope } from './riskScope';
import type { Risk } from './risks';
import { formatMoney, formatPercent, formatQuarters } from './text';

/*
 * The risks of force: a coup. `risksAhead` in `risks.ts` gathers them with the rest, and each
 * is read off the quarters it played.
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
