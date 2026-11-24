import { sum } from './arithmetic';
import { balance } from './balance';
import { missedPaymentMeans } from './bailout';
import { creditStatus, loanRateSpan, ratingCause, ratingRank } from './credit';
import { debtName, debtStatus, dueAtMaturity, maturityOf, paysAtMaturity, type Debt } from './debt';
import { pausedProjects, projectTerms, type Project, type ProjectTerms } from './projects';
import {
  likelihoodOf,
  typicalOf,
  weigh,
  when,
  type BondAhead,
  type Path,
  type Scope,
} from './riskScope';
import type { GameState, QuarterResolved } from './state';
import { formatMoney } from './text';
import { forecastSpan, formatPrice, priceStatus } from './trade';
import type { Money } from './types';
import type { Risk } from './risks';

/*
 * The risks of money: a treasury that runs out, a missed payment that brings a bailout, a
 * bond's maturity that cannot be met and a cut in the credit rating. `risksAhead` in
 * `risks.ts` gathers them with the rest.
 */

/**
 * The bonds owed, and those to be issued as the quarter being decided ends, each with how
 * far off its maturity is. A bond whose missed maturity turned it into level repayments
 * has no maturity left to fall due.
 */
export function bondsAhead(state: GameState, courses: Scope['courses']): BondAhead[] {
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

/**
 * A danger that only a slump in the world ore price inside its forecast would bring, when the
 * quarters ahead as they are supposed otherwise do not bring it: what a mine's chain earns
 * falls with the price, and the tax it pays with it.
 */
export function oreSlumpRisk(
  scope: Scope,
  shows: (path: Path) => number | null,
  risk: (quarter: number, slump: string) => Pick<Risk, 'kind' | 'headline' | 'reason'>,
): Risk[] {
  const quarter = shows(scope.oreSlump);
  const likelihood = likelihoodOf(balance.risks.oreSlumpChancePermille);
  if (quarter === null || likelihood === null) return [];
  const { forecast } = priceStatus(scope.state, 'ore');
  const slump = `Should the world ore price slump to ${formatPrice(forecast.min)}, the low end of its forecast ${forecastSpan()}, the mines would earn less and pay less in tax`;
  return [{ ...risk(quarter, slump), likelihood, withinQuarters: quarter + 1 }];
}

/**
 * What gives way in a quarter the treasury runs out in, and when: the budget, whose every area
 * is cut, or failing that the oldest project left unpaid, named in the words of its kind,
 * whether it is building on a site, research or a survey. It is said as it stands, or as
 * something supposed would have it.
 */
function givesWay(
  resolved: QuarterResolved | undefined,
  quarter: number,
  supposed = false,
): string {
  const [cannot, will] = supposed ? ['could not', 'would'] : ['cannot', 'will'];
  const unpaid = resolved === undefined || resolved.spendingCut ? null : firstUnpaid(resolved);
  if (unpaid === null) {
    return `the treasury ${cannot} cover the budget ${when(quarter)}, and every area ${will} be cut.`;
  }
  const { instalmentOn, pauses } = unpaid.words;
  const on = instalmentOn === '' ? unpaid.name : `${instalmentOn} ${unpaid.name}`;
  return `the treasury ${cannot} cover the instalment on ${on} ${when(quarter)}, and ${pauses} ${will} pause.`;
}

/** The projects whose instalment a quarter could not cover, the oldest first. */
function unpaidIn(resolved: QuarterResolved): Project[] {
  return pausedProjects(resolved.state.projects);
}

/** The oldest project a quarter left unpaid, by its terms, or null when it paid for them all. */
function firstUnpaid(resolved: QuarterResolved): ProjectTerms | null {
  const [first] = unpaidIn(resolved);
  return first === undefined ? null : projectTerms(resolved.state.country, first.target);
}

/**
 * The treasury runs out when it cannot cover the budget, or an instalment on a project,
 * whatever the project is for.
 */
export function treasuryRisk(scope: Scope): Risk[] {
  const { state, watched } = scope;
  const emptied = (path: Path) => {
    const quarter = path
      .slice(0, watched)
      .findIndex((resolved) => resolved.spendingCut || unpaidIn(resolved).length > 0);
    return quarter === -1 ? null : quarter;
  };
  const finding = weigh(scope, emptied);
  const likelihood = finding === null ? null : likelihoodOf(finding.chance);
  if (finding === null || likelihood === null) {
    return oreSlumpRisk(scope, emptied, (quarter, slump) => ({
      kind: 'treasury',
      headline: 'Empty treasury',
      reason: `${slump}: ${givesWay(scope.oreSlump[quarter], quarter, true)}`,
    }));
  }

  // What gives way first is read off the course with ordinary weather and no new event.
  const typical = typicalOf(scope.courses);
  const quarter = emptied(typical) ?? finding.soonest;
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
      reason: `As things stand ${givesWay(typical[quarter], finding.soonest)}${firstNote}`,
      withinQuarters: finding.soonest + 1,
    },
  ];
}

/**
 * A payment on a debt is missed when the treasury and the quarter's revenue together cannot
 * cover it. That brings a bailout, or during austerity extends it.
 */
export function bailoutRisk(scope: Scope): Risk[] {
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
  if (finding === null || likelihood === null) {
    return oreSlumpRisk(scope, misses, (quarter, slump) => {
      const which =
        scope.oreSlump[quarter]?.missedOn.find((name) => !maturing(quarter).includes(name)) ??
        'a debt';
      const austere =
        (quarter === 0 ? scope.state : scope.oreSlump[quarter - 1]?.state)?.austerity ?? null;
      return {
        kind: 'bailout',
        headline: austere === null ? 'Bailout' : 'Austerity extended',
        reason: `${slump}: the treasury and revenue could not cover the repayment on ${which} ${when(quarter)}. ${missedPaymentMeans({ country: scope.state.country, austerity: austere })}`,
      };
    });
  }

  // Which debt goes unpaid is read off the course with ordinary weather and no new event.
  const typical = typicalOf(scope.courses);
  const quarter = misses(typical) ?? finding.soonest;
  const first = typical[quarter];
  const which = first?.missedOn.find((name) => !maturing(quarter).includes(name)) ?? 'a debt';
  const austere = (quarter === 0 ? scope.state : typical[quarter - 1]?.state)?.austerity ?? null;
  const cannot = `As things stand the treasury and revenue cannot cover the repayment on ${which} ${when(finding.soonest)}.`;
  return [
    {
      kind: 'bailout',
      likelihood,
      headline: austere === null ? 'Bailout' : 'Austerity extended',
      reason: `${cannot} ${missedPaymentMeans({ country: scope.state.country, austerity: austere })}`,
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
export function maturityRisk(scope: Scope, bond: BondAhead): Risk[] {
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
      reason: `${falls} ${course} ${missedPaymentMeans(state)}`,
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
 * The credit rating falls when the payment record, the debt burden or the deficit the
 * quarters ahead leave takes its score below the step in force. Why is read off the course
 * with ordinary weather and no new event, or the first that falls where that one does not.
 */
export function creditRisk(scope: Scope): Risk[] {
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
