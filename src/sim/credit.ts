import { balance } from './balance';
import { annualRateFor, debtBurden, type Owing } from './debt';
import type { ReportEntry } from './report';
import { formatPercent } from './text';
import type { Contribution, Figure, Money } from './types';
import { CREDIT_RATING_NAMES, CREDIT_RATINGS, type CreditRating } from './vocabulary';

/**
 * The credit rating: how far lenders trust the nation, which sets the rate new debt is taken
 * at and the most that may be owed. It is reassessed as each quarter ends from a score: the
 * payment record, less a share of the debt burden and a share of the quarter's deficit. A
 * missed payment takes a great deal off the payment record; each quarter whose repayments
 * are all made on time puts a little back.
 */

/** The rules of the rating, as the player is told them. */
export const creditRules = balance.finance.credit;

/** What the game remembers of the nation's credit between quarters. */
export interface Credit {
  /** The rating in force, reassessed as the last quarter ended. */
  readonly rating: CreditRating;
  /** The payment record, in points. */
  readonly record: number;
  /**
   * The deficit of the quarter last ended: what was spent beyond its revenue, less what went
   * to repaying principal, in thousandths of its revenue. It is 0 when revenue covered it.
   */
  readonly deficit: number;
}

/** What the rating is worked out from, and what it comes to. */
export interface CreditAssessment {
  /** The score, in points: the parts added together. */
  readonly score: number;
  /** The step the score reaches. */
  readonly rating: CreditRating;
  readonly record: number;
  /** The debt burden, in thousandths of a year's revenue. */
  readonly burden: number;
  /** The quarter's deficit, in thousandths of its revenue. */
  readonly deficit: number;
  /** What each part adds to the score, or takes off it. */
  readonly parts: readonly Contribution[];
}

/** One step of the rating and what it means for borrowing. */
export interface CreditStep {
  readonly rating: CreditRating;
  readonly name: string;
  /** The score the step begins at. */
  readonly from: number;
  /** The rate a loan over each term on the menu is offered at, at this step. */
  readonly loanRates: readonly {
    readonly quarters: number;
    readonly annualRateBasisPoints: number;
  }[];
  /**
   * The rate a bond over each term on the menu is offered at, at this step: none where the
   * rating is too poor to issue bonds.
   */
  readonly bondRates: readonly {
    readonly quarters: number;
    readonly annualRateBasisPoints: number;
  }[];
  /** The most the nation may owe at this step, in thousandths of a year's revenue. */
  readonly debtLimitPermille: number;
}

/** The rating as the player is shown it: what it is made of, and the steps around it. */
export interface CreditStatus extends CreditAssessment {
  /** The name of the rating in force. */
  readonly name: string;
  /** Every step, the best first. */
  readonly steps: readonly CreditStep[];
  readonly current: CreditStep;
  /** The step above the rating in force, or null at the best. */
  readonly above: CreditStep | null;
  /** The step below it, or null at the worst. */
  readonly below: CreditStep | null;
}

interface Rated extends Owing {
  readonly credit: Credit;
}

/** Where a rating stands among the steps: 0 is the worst, and a higher rank is better. */
export function ratingRank(rating: CreditRating): number {
  return CREDIT_RATINGS.indexOf(rating);
}

/** Whether a rating is the one given or better. */
export function ratedAtLeast(rating: CreditRating, least: CreditRating): boolean {
  return ratingRank(rating) >= ratingRank(least);
}

/** The best step a score reaches. */
export function ratingOfScore(score: number): CreditRating {
  const { ratings } = balance.finance.credit;
  return CREDIT_RATINGS.findLast((rating) => score >= ratings[rating].fromScore) ?? 'b';
}

/** One step of the rating, with the rates a loan on the menu is offered at there. */
export function creditStep(rating: CreditRating): CreditStep {
  const step = balance.finance.credit.ratings[rating];
  return {
    rating,
    name: CREDIT_RATING_NAMES[rating],
    from: step.fromScore,
    loanRates: balance.finance.loans.terms.map(({ quarters }) => ({
      quarters,
      annualRateBasisPoints: annualRateFor('loan', quarters, rating) ?? 0,
    })),
    bondRates: balance.finance.bonds.terms.flatMap(({ quarters }) => {
      const rate = annualRateFor('bond', quarters, rating);
      return rate === null ? [] : [{ quarters, annualRateBasisPoints: rate }];
    }),
    debtLimitPermille: step.debtLimitPermille,
  };
}

/** Works out the score and the rating from the payment record, debt burden and deficit. */
export function assessCredit(record: number, burden: number, deficit: number): CreditAssessment {
  const { burdenWeightPermille, deficitWeightPermille, deficitCapPermille } =
    balance.finance.credit;
  const burdenPoints = Math.floor((burden * burdenWeightPermille) / 1000);
  const deficitPoints = Math.floor(
    (Math.min(deficit, deficitCapPermille) * deficitWeightPermille) / 1000,
  );
  const score = record - burdenPoints - deficitPoints;
  return {
    score,
    rating: ratingOfScore(score),
    record,
    burden,
    deficit,
    parts: [
      { label: 'Payment record', amount: record },
      // Taken from nothing, so that a part that costs nothing reads 0 and never −0.
      { label: `Debt burden of ${formatPercent(burden)}`, amount: 0 - burdenPoints },
      {
        label: deficit === 0 ? 'No deficit' : `Deficit of ${formatPercent(deficit)} of revenue`,
        amount: 0 - deficitPoints,
      },
    ],
  };
}

/** The credit a game starts with: the opening payment record, and no deficit yet. */
export function openingCredit(position: Owing): Credit {
  const record = balance.finance.credit.startingRecord;
  return { rating: assessCredit(record, debtBurden(position), 0).rating, record, deficit: 0 };
}

/** The nation's credit as it stands, and what the steps either side of it would mean. */
export function creditStatus(game: Rated): CreditStatus {
  const assessment = assessCredit(game.credit.record, debtBurden(game), game.credit.deficit);
  const { rating } = game.credit;
  const rank = ratingRank(rating);
  const above = CREDIT_RATINGS[rank + 1];
  const below = CREDIT_RATINGS[rank - 1];
  return {
    ...assessment,
    rating,
    name: CREDIT_RATING_NAMES[rating],
    steps: [...CREDIT_RATINGS].reverse().map(creditStep),
    current: creditStep(rating),
    above: above === undefined ? null : creditStep(above),
    below: below === undefined ? null : creditStep(below),
  };
}

/**
 * The deficit of a quarter, in thousandths of its revenue: what was spent beyond revenue,
 * not counting what went to repaying principal, which only turns money owed into money paid.
 */
export function deficitOf(revenue: Money, balanceOfQuarter: Money, principal: Money): number {
  const shortfall = -(balanceOfQuarter + principal);
  if (shortfall <= 0) return 0;
  return Math.floor((shortfall * 1000) / Math.max(1, revenue));
}

/**
 * The payment record after a quarter's repayments: a missed payment takes a great deal off
 * it, and a quarter whose repayments were all made puts a little back, up to the best there is.
 */
export function recordAfter(
  record: number,
  service: { readonly due: Money; readonly missed: Money },
): number {
  const { missedPaymentPoints, onTimePoints, bestRecord } = balance.finance.credit;
  if (service.missed > 0) return Math.max(0, record - missedPaymentPoints);
  if (service.due > 0) return Math.min(bestRecord, record + onTimePoints);
  return record;
}

/** What reassessing the rating as a quarter ends did. */
export interface CreditReassessed {
  readonly credit: Credit;
  readonly before: CreditAssessment;
  readonly after: CreditAssessment;
  /** The score, with what each part did to it. */
  readonly figure: Figure;
  /** What the report says when the rating changed. */
  readonly entries: readonly ReportEntry[];
}

/**
 * Reassesses the rating as a quarter ends, from the payment record and deficit the quarter
 * left and the debt burden as it now stands.
 */
export function reassessCredit(
  given: Rated,
  now: { readonly record: number; readonly burden: number; readonly deficit: number },
  missedOn: readonly string[],
): CreditReassessed {
  const before = assessCredit(given.credit.record, debtBurden(given), given.credit.deficit);
  const after = assessCredit(now.record, now.burden, now.deficit);
  const changes = scoreChanges(before, after);
  return {
    credit: { rating: after.rating, record: now.record, deficit: now.deficit },
    before,
    after,
    figure: {
      value: after.score,
      change: after.score - before.score,
      contributions: changes.filter((change) => change.amount !== 0),
    },
    entries:
      after.rating === given.credit.rating
        ? []
        : [ratingEntry(given.credit.rating, after, ratingCause(before, after, missedOn))],
  };
}

/** What each part did to the score between two assessments. */
function scoreChanges(before: CreditAssessment, after: CreditAssessment): Contribution[] {
  const labels = ['Payment record', 'Debt burden', 'Deficit'];
  return labels.map((label, index) => ({
    label,
    amount: (after.parts[index]?.amount ?? 0) - (before.parts[index]?.amount ?? 0),
  }));
}

/**
 * Why the score moved, in a sentence: the part that moved it most in the direction it went.
 * The debts a payment was missed on are named, when there were any.
 */
export function ratingCause(
  before: CreditAssessment,
  after: CreditAssessment,
  missedOn: readonly string[],
): string {
  const falling = after.score < before.score;
  const changes = scoreChanges(before, after);
  const [record, burden, deficit] = changes.map((change) => change.amount);
  const sign = falling ? -1 : 1;
  const largest = Math.max(sign * (record ?? 0), sign * (burden ?? 0), sign * (deficit ?? 0));
  if (largest === sign * (record ?? 0)) {
    return falling
      ? `A missed payment${missedOn.length === 0 ? '' : ` on ${missedOn.join(' and ')}`} cut the payment record by ${-(record ?? 0)} points.`
      : `Repayments made on time raised the payment record to ${after.record} points.`;
  }
  if (largest === sign * (burden ?? 0)) {
    return `The debt burden ${falling ? 'rose' : 'fell'} to ${formatPercent(after.burden)} of a year’s revenue.`;
  }
  if (falling) {
    return `The deficit came to ${formatPercent(after.deficit)} of the quarter’s revenue.`;
  }
  return after.deficit === 0
    ? 'The budget no longer ran a deficit.'
    : `The deficit narrowed to ${formatPercent(after.deficit)} of the quarter’s revenue.`;
}

/** The loan rates at a step, from the shortest term to the longest: "7.5% to 11.5%". */
export function loanRateSpan(step: CreditStep): string {
  return rateSpan(step.loanRates);
}

/** The bond rates at a step, "4% to 5%", or null where bonds cannot be issued. */
export function bondRateSpan(step: CreditStep): string | null {
  return step.bondRates.length === 0 ? null : rateSpan(step.bondRates);
}

function rateSpan(terms: readonly { readonly annualRateBasisPoints: number }[]): string {
  const rates = terms.map((each) => each.annualRateBasisPoints / 100);
  const low = Math.min(...rates);
  const high = Math.max(...rates);
  return low === high ? `${low}%` : `${low}% to ${high}%`;
}

function ratingEntry(was: CreditRating, after: CreditAssessment, cause: string): ReportEntry {
  const fell = ratingRank(after.rating) < ratingRank(was);
  const step = creditStep(after.rating);
  return {
    kind: 'creditRating',
    seriousness: fell ? 'warning' : 'notable',
    headline: `Credit rating ${fell ? 'cut' : 'raised'} to ${step.name}`,
    cause: `${cause} New loans are offered at ${loanRateSpan(step)} a year, and the nation may owe up to ${formatPercent(step.debtLimitPermille, 0)} of a year’s revenue.${bondsNote(was, step)}`,
  };
}

/** What a change of rating did to issuing bonds, when it crossed the least rating they need. */
function bondsNote(was: CreditRating, now: CreditStep): string {
  const { leastRating } = balance.finance.bonds;
  const could = ratedAtLeast(was, leastRating);
  const can = ratedAtLeast(now.rating, leastRating);
  if (could === can) return '';
  if (!can) return ' Bonds can no longer be issued.';
  const rates = bondRateSpan(now);
  return ` Bonds can now be issued${rates === null ? '' : `, at ${rates} a year`}.`;
}
