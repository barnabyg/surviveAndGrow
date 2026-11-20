import { sum } from './arithmetic';
import { balance } from './balance';
import { revenueOf, type Budget } from './budget';
import { dateOfQuarter, quarterNumber } from './calendar';
import type { Country } from './country';
import { ratedAtLeast } from './credit';
import type { Project } from './projects';
import type { ReportEntry } from './report';
import type { RegionState } from './state';
import { formatMoney, formatPercent, formatQuarters } from './text';
import type { Contribution, GameDate, Money } from './types';
import {
  CREDIT_RATING_NAMES,
  DEBT_KIND_NAMES,
  DEBT_KINDS,
  type CreditRating,
  type DebtKind,
  type DebtSchedule,
} from './vocabulary';

/**
 * Debt: what the nation has borrowed and still owes. Every kind of debt is a `Debt` in one
 * list, paid in the order it was taken, before anything else each quarter. What falls due
 * each quarter answers to the kind of debt: a loan's level repayment, or a bond's interest
 * and, at maturity, its whole sum. How heavy the debt is, the debt burden, answers to all of
 * it together.
 */

/** One debt the nation owes. It is never changed in place. */
export interface Debt {
  readonly kind: DebtKind;
  /** Names it while it is owed: "Loan 2". No two debts owed at once share a number. */
  readonly number: number;
  /** The quarter it was taken in. Its money arrived as that quarter ended. */
  readonly taken: GameDate;
  /** The sum borrowed. */
  readonly borrowed: Money;
  /** The rate it was taken at, in hundredths of a percent a year. It never changes. */
  readonly annualRateBasisPoints: number;
  /** The quarters it was taken over. */
  readonly termQuarters: number;
  /** The principal still owed. Interest that went unpaid has been added to it. */
  readonly owed: Money;
  /**
   * What falls due each quarter, interest and principal together. The last quarter's is
   * whatever then clears the debt, which may be a little less, or, for a bond, more: a bond
   * pays only its interest until the last quarter, its maturity, when everything owed falls
   * due.
   */
  readonly repayment: Money;
  /** How many repayments are still to come. */
  readonly quartersLeft: number;
  /**
   * How it is repaid: `level`, in equal repayments of interest and principal, as a loan is;
   * or `atMaturity`, interest alone until the last quarter, when everything owed falls due,
   * as a bond is until a maturity it missed turns what is left into level repayments.
   */
  readonly schedule: DebtSchedule;
}

/** A sum the player means to borrow this quarter. */
export interface Borrowing {
  readonly kind: DebtKind;
  readonly amount: Money;
  /** The quarters it is to be repaid over, or, for a bond, until it matures. */
  readonly quarters: number;
}

/** What a debt costs, as the player is shown before taking it. */
export interface LoanTerms {
  readonly kind: DebtKind;
  readonly amount: Money;
  readonly quarters: number;
  readonly annualRateBasisPoints: number;
  /**
   * What falls due each quarter from the quarter after the money arrives. For a bond it is
   * the interest alone, and the whole sum falls due besides at maturity.
   */
  readonly repayment: Money;
  /** The interest paid over the whole term, if every repayment is made. */
  readonly totalInterest: Money;
}

/** A loan or bond on the menu, and why it cannot be taken now, or null when it can. */
export interface LoanOffer extends LoanTerms {
  readonly unavailable: string | null;
}

/** What the debt burden needs of the game: what it owes, and what its revenue is. */
export interface Owing {
  readonly country: Country;
  readonly regions: readonly RegionState[];
  readonly projects: readonly Project[];
  readonly budget: Budget;
  readonly debts: readonly Debt[];
}

/** What borrowing needs of the game: what it owes, its revenue, and its credit rating. */
interface Borrower extends Owing {
  readonly credit: { readonly rating: CreditRating };
}

/** What a debt is called: "Loan 2". */
export function debtName(debt: Pick<Debt, 'kind' | 'number'>): string {
  return `${DEBT_KIND_NAMES[debt.kind]} ${debt.number}`;
}

/** A yearly rate as the player reads it: "6%", "7.5%". */
export function formatRate(annualRateBasisPoints: number): string {
  return `${annualRateBasisPoints / 100}%`;
}

/** Everything still owed. */
export function debtOf(debts: readonly Debt[]): Money {
  return sum(debts.map((debt) => debt.owed));
}

/** What a year's revenue comes to at the budget in force and the country as it stands. */
export function yearRevenue(game: Omit<Owing, 'debts'>): Money {
  return 4 * revenueOf(game, game.budget);
}

/**
 * The debt burden: what is owed against a year's revenue, in thousandths. A country with no
 * revenue to speak of is judged as if it raised the smallest sum there is.
 */
export function debtBurden(game: Owing): number {
  return burdenOf(debtOf(game.debts), yearRevenue(game));
}

function burdenOf(debt: Money, revenue: Money): number {
  return Math.floor((debt * 1000) / Math.max(1, revenue));
}

/**
 * The most that may be owed, counting what is to be borrowed this quarter: a share of a
 * year's revenue that the credit rating sets.
 */
export function debtLimit(game: Omit<Borrower, 'debts'>): Money {
  const { debtLimitPermille } = balance.finance.credit.ratings[game.credit.rating];
  return Math.floor((yearRevenue(game) * debtLimitPermille) / 1000);
}

/** The rate a loan over a term is offered at, at a credit rating, or null off the menu. */
function loanRate(quarters: number, rating: CreditRating): number | null {
  const term = balance.finance.loans.terms.find((each) => each.quarters === quarters);
  if (term === undefined) return null;
  return term.annualRateBasisPoints + balance.finance.credit.ratings[rating].loanRateBasisPoints;
}

/**
 * The rate a bond over a term is offered at, at a credit rating, or null off the menu or
 * when the rating is too poor to issue bonds at all.
 */
function bondRate(quarters: number, rating: CreditRating): number | null {
  const { terms } = balance.finance.bonds;
  const term = terms.find((each) => each.quarters === quarters);
  if (term === undefined || !bondsOpenTo(rating)) return null;
  return term.annualRateBasisPoints + balance.finance.credit.ratings[rating].bondRateBasisPoints;
}

/** Whether a nation with a credit rating may issue bonds. */
export function bondsOpenTo(rating: CreditRating): boolean {
  return ratedAtLeast(rating, balance.finance.bonds.leastRating);
}

/**
 * Why a nation with a credit rating may not issue bonds, as the player is told, or null when
 * it may.
 */
export function bondsClosedBecause(rating: CreditRating): string | null {
  if (bondsOpenTo(rating)) return null;
  const least = CREDIT_RATING_NAMES[balance.finance.bonds.leastRating];
  return `Bonds can be issued only at a credit rating of ${least} or better. The nation is rated ${CREDIT_RATING_NAMES[rating]}.`;
}

/** How each kind of debt is priced: its rate over a term at a credit rating. */
const RATES: Readonly<Record<DebtKind, (quarters: number, rating: CreditRating) => number | null>> =
  {
    loan: loanRate,
    bond: bondRate,
  };

/** The sums and terms each kind of debt is offered in. */
const MENUS: Readonly<
  Record<
    DebtKind,
    { readonly amounts: readonly Money[]; readonly terms: readonly { readonly quarters: number }[] }
  >
> = {
  loan: balance.finance.loans,
  bond: balance.finance.bonds,
};

/**
 * The yearly rate a kind of debt over a term is offered at to a nation with a credit rating,
 * in hundredths of a percent, or null when no such debt is on offer.
 */
export function annualRateFor(
  kind: DebtKind,
  quarters: number,
  rating: CreditRating,
): number | null {
  return RATES[kind](quarters, rating);
}

/** How the nation's debt stands, as the player is shown it. */
export interface DebtStatus {
  /** Everything still owed. */
  readonly debt: Money;
  /** A year's revenue at the budget in force. */
  readonly yearRevenue: Money;
  /** The debt against a year's revenue, in thousandths. */
  readonly burden: number;
  /** The most that may be owed. */
  readonly limit: Money;
  /** The most that each debt owed asks for this quarter, before any is missed. */
  readonly repayments: Money;
  /** Every debt owed, in the order it was taken. */
  readonly debts: readonly (Debt & { readonly name: string })[];
}

export function debtStatus(game: Borrower): DebtStatus {
  const debt = debtOf(game.debts);
  const revenue = yearRevenue(game);
  return {
    debt,
    yearRevenue: revenue,
    burden: burdenOf(debt, revenue),
    limit: debtLimit(game),
    repayments: sum(game.debts.map((owed) => dueOn(owed).due)),
    debts: game.debts.map((owed) => ({ ...owed, name: debtName(owed) })),
  };
}

/**
 * The terms of a loan on the menu to a nation with a credit rating, or null when the menu
 * has no such loan.
 */
export function loanTerms(amount: Money, quarters: number, rating: CreditRating): LoanTerms | null {
  return debtTerms('loan', amount, quarters, rating);
}

/**
 * The terms of a debt of a kind on the menu to a nation with a credit rating, or null when
 * the menu has no such debt for it. A loan is repaid level; a bond pays its interest each
 * quarter and its whole sum at maturity.
 */
export function debtTerms(
  kind: DebtKind,
  amount: Money,
  quarters: number,
  rating: CreditRating,
): LoanTerms | null {
  const rate = annualRateFor(kind, quarters, rating);
  if (rate === null || !MENUS[kind].amounts.includes(amount)) return null;
  const repayment =
    kind === 'bond' ? interestOn(amount, rate) : levelRepayment(amount, rate, quarters);
  return {
    kind,
    amount,
    quarters,
    annualRateBasisPoints: rate,
    repayment,
    totalInterest: paidOver(amount, rate, quarters, repayment) - amount,
  };
}

/**
 * Every loan on the menu, each sum over each term, at the rate the credit rating gets. One
 * that would take the debt, with what is already planned for this quarter, past the most
 * that may be owed cannot be taken.
 */
export function loanOffers(game: Borrower, planned: readonly Borrowing[] = []): LoanOffer[] {
  return offersOf('loan', game, planned);
}

/**
 * Every bond on the menu, each sum over each term, at the rate the credit rating gets, or
 * none when the rating is too poor to issue bonds (`bondsClosedBecause` says why). One that
 * would take the debt past the most that may be owed cannot be taken.
 */
export function bondOffers(game: Borrower, planned: readonly Borrowing[] = []): LoanOffer[] {
  return offersOf('bond', game, planned);
}

function offersOf(kind: DebtKind, game: Borrower, planned: readonly Borrowing[]): LoanOffer[] {
  const { amounts, terms } = MENUS[kind];
  return amounts.flatMap((amount) =>
    terms.flatMap(({ quarters }) => {
      const offered = debtTerms(kind, amount, quarters, game.credit.rating);
      if (offered === null) return [];
      return [
        { ...offered, unavailable: limitFault(game, [...planned, { kind, amount, quarters }]) },
      ];
    }),
  );
}

/**
 * The quarter a debt taken in the quarter given, over a term, is last paid in: a bond's
 * maturity, when its whole sum falls due.
 */
export function maturityOfTaking(taken: GameDate, quarters: number): GameDate {
  return dateOfQuarter(quarterNumber(taken) + quarters);
}

/**
 * The quarter a debt owed is last paid in, if every payment is made, as the game stands at
 * a date: for a bond that pays only interest until then, its maturity.
 */
export function maturityOf(debt: Pick<Debt, 'quartersLeft'>, now: GameDate): GameDate {
  return dateOfQuarter(quarterNumber(now) + debt.quartersLeft - 1);
}

/** What a bond asks at its maturity: everything owed, and that quarter's interest on it. */
export function dueAtMaturity(debt: Pick<Debt, 'owed' | 'annualRateBasisPoints'>): Money {
  return debt.owed + interestOn(debt.owed, debt.annualRateBasisPoints);
}

/**
 * The quarters over which what is left of a bond whose maturity was missed is repaid in
 * level repayments: those balance data sets, but never more than the bond's own term.
 */
export function missedMaturityQuarters(debt: Pick<Debt, 'termQuarters'>): number {
  return Math.min(balance.finance.bonds.missedMaturityQuarters, debt.termQuarters);
}

/**
 * Whether a debt pays only interest until its last quarter, when everything owed falls due:
 * a bond, unless a maturity it missed has turned what is left into level repayments.
 */
export function paysAtMaturity(debt: Pick<Debt, 'schedule'>): boolean {
  return debt.schedule === 'atMaturity';
}

/**
 * What is wrong with borrowing these sums this quarter, or null when the game allows it.
 * Each must be on the menu, and together with what is owed they must stay within the most
 * that may be owed.
 */
export function borrowFault(game: Borrower, borrowing: readonly Borrowing[]): string | null {
  for (const each of borrowing) {
    if (!(DEBT_KINDS as readonly string[]).includes(each.kind)) {
      return `There is no kind of debt "${each.kind}" to take.`;
    }
    if (each.kind === 'bond') {
      const closed = bondsClosedBecause(game.credit.rating);
      if (closed !== null) return closed;
    }
    if (debtTerms(each.kind, each.amount, each.quarters, game.credit.rating) === null) {
      return `No ${DEBT_KIND_NAMES[each.kind].toLowerCase()} of ${formatMoney(each.amount)} over ${formatQuarters(each.quarters)} is on offer.`;
    }
  }
  return limitFault(game, borrowing);
}

function limitFault(game: Borrower, borrowing: readonly Borrowing[]): string | null {
  // What is already owed may stand above the limit, if revenue has fallen since; it only
  // keeps more from being borrowed.
  if (borrowing.length === 0) return null;
  const limit = debtLimit(game);
  const after = debtOf(game.debts) + sum(borrowing.map((each) => each.amount));
  if (after <= limit) return null;
  const { rating } = game.credit;
  const share = balance.finance.credit.ratings[rating].debtLimitPermille;
  return `It would take the debt to ${formatMoney(after)}, past the ${formatMoney(limit)} that may be owed: ${formatPercent(share, 0)} of a year’s revenue at a credit rating of ${CREDIT_RATING_NAMES[rating]}.`;
}

/** A quarter of a yearly rate on a sum, to the nearest Money unit. */
function interestOn(owed: Money, annualRateBasisPoints: number): Money {
  return Math.floor((owed * annualRateBasisPoints + 20_000) / 40_000);
}

/** What one quarter asks of a debt: the interest on it and what falls due. */
function dueOn(debt: Debt): { readonly interest: Money; readonly due: Money } {
  const interest = interestOn(debt.owed, debt.annualRateBasisPoints);
  const whole = debt.owed + interest;
  return { interest, due: debt.quartersLeft <= 1 ? whole : Math.min(debt.repayment, whole) };
}

/**
 * Everything a sum lent at a rate costs if repaid by a level repayment over some quarters,
 * the last one clearing what is left.
 */
function paidOver(owed: Money, rate: number, quarters: number, repayment: Money): Money {
  let left = owed;
  let paid = 0;
  for (let quarter = 1; quarter <= quarters && left > 0; quarter += 1) {
    const whole = left + interestOn(left, rate);
    const due = quarter === quarters ? whole : Math.min(repayment, whole);
    paid += due;
    left = whole - due;
  }
  return paid;
}

/**
 * The smallest whole repayment that clears a sum over the quarters given, with the last
 * repayment no larger than the others. It is found by halving, in whole numbers, so it
 * comes out the same on every machine.
 */
function levelRepayment(owed: Money, rate: number, quarters: number): Money {
  const clears = (repayment: Money) => {
    let left = owed;
    for (let quarter = 1; quarter < quarters && left > 0; quarter += 1) {
      left = left + interestOn(left, rate) - repayment;
    }
    return left <= 0 || left + interestOn(left, rate) <= repayment;
  };
  let low = 0;
  let high = owed + interestOn(owed, rate);
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (clears(middle)) high = middle;
    else low = middle + 1;
  }
  return high;
}

/** What a quarter's repayments did. */
export interface DebtService {
  /** The debts as the quarter leaves them: those repaid in full are gone. */
  readonly debts: readonly Debt[];
  /** What fell due. */
  readonly due: Money;
  /** What was paid. */
  readonly paid: Money;
  /** The part of what was paid that went to the principal rather than interest. */
  readonly principal: Money;
  /** What fell due and could not be paid, which has been added to the debt. */
  readonly missed: Money;
  /** The debts on which a payment was missed, by name. */
  readonly missedOn: readonly string[];
  /** What the payments took from the treasury, line by line. */
  readonly contributions: readonly Contribution[];
  /** What the payments did to the debt, line by line. */
  readonly changes: readonly Contribution[];
  readonly entries: readonly ReportEntry[];
}

/**
 * One quarter of repayments, paid out of what is available in the order the debts were
 * taken, before anything else. A repayment that cannot be covered in full takes what is
 * left, and the rest is a missed payment: it is added to what is owed, and the repayments
 * still to come rise to clear it. A debt whose term has run out with something still owed
 * falls due in full the next quarter. A bond whose interest is missed goes on paying only
 * interest, on the larger sum; one whose maturity is missed has what is left repaid in
 * level repayments over the quarters set in balance data.
 */
export function serveDebts(debts: readonly Debt[], available: Money): DebtService {
  const contributions: Contribution[] = [];
  const changes: Contribution[] = [];
  const entries: ReportEntry[] = [];
  const missedOn: string[] = [];
  let left = available;
  let due = 0;
  let missed = 0;
  let paid = 0;
  let principal = 0;

  const after = debts.flatMap((debt): Debt[] => {
    const name = debtName(debt);
    const asked = dueOn(debt);
    const pay = Math.min(asked.due, Math.max(0, left));
    left -= pay;
    paid += pay;
    due += asked.due;
    const interestPaid = Math.min(pay, asked.interest);
    const principalPaid = pay - interestPaid;
    principal += principalPaid;
    const owed = debt.owed + asked.interest - pay;
    if (interestPaid > 0)
      contributions.push({ label: `Interest on ${name}`, amount: -interestPaid });
    if (principalPaid > 0)
      contributions.push({ label: `Repaying ${name}`, amount: -principalPaid });
    if (principalPaid > 0) changes.push({ label: `Repaid on ${name}`, amount: -principalPaid });
    if (asked.interest > interestPaid) {
      changes.push({ label: `Interest unpaid on ${name}`, amount: asked.interest - interestPaid });
    }

    const unpaid = asked.due - pay;
    if (unpaid > 0) {
      missed += unpaid;
      missedOn.push(name);
      const respread = respreadAfterMissing(debt, owed);
      entries.push(missedEntry(debt, name, asked.due, unpaid, respread));
      return [respread];
    }
    if (owed === 0) {
      entries.push(repaidEntry(debt, name));
      return [];
    }
    return [{ ...debt, owed, quartersLeft: debt.quartersLeft - 1 }];
  });

  return {
    debts: after,
    due,
    paid,
    principal,
    missed,
    missedOn,
    contributions,
    changes,
    entries,
  };
}

/**
 * A debt once a payment on it is missed, with what is now owed. A loan's repayments still to
 * come rise to clear it. A bond before its maturity pays interest on the larger sum; at its
 * maturity, what is left is repaid level over the quarters balance data sets.
 */
function respreadAfterMissing(debt: Debt, owed: Money): Debt {
  const rate = debt.annualRateBasisPoints;
  if (paysAtMaturity(debt)) {
    if (debt.quartersLeft > 1) {
      return {
        ...debt,
        owed,
        quartersLeft: debt.quartersLeft - 1,
        repayment: interestOn(owed, rate),
      };
    }
    const quartersLeft = missedMaturityQuarters(debt);
    return {
      ...debt,
      owed,
      quartersLeft,
      repayment: levelRepayment(owed, rate, quartersLeft),
      schedule: 'level',
    };
  }
  const quartersLeft = Math.max(1, debt.quartersLeft - 1);
  return { ...debt, owed, quartersLeft, repayment: levelRepayment(owed, rate, quartersLeft) };
}

/** What the quarter's borrowing did. */
export interface DebtTaken {
  /** The debts with the new ones after them, in the order they were taken. */
  readonly debts: readonly Debt[];
  readonly borrowed: Money;
  /** What the borrowing brought into the treasury, line by line. */
  readonly contributions: readonly Contribution[];
  /** What it added to the debt, line by line. */
  readonly changes: readonly Contribution[];
  readonly entries: readonly ReportEntry[];
}

/**
 * Takes on what the player chose to borrow this quarter, at the rate the credit rating in
 * force as the quarter began gets. Its money arrives as the quarter ends and the first
 * repayment falls due the quarter after. Each new debt is numbered on from the highest owed.
 */
export function takeDebts(
  debts: readonly Debt[],
  borrowing: readonly Borrowing[],
  date: GameDate,
  rating: CreditRating,
): DebtTaken {
  let number = Math.max(0, ...debts.map((debt) => debt.number));
  const taken = borrowing.flatMap((each): Debt[] => {
    const terms = debtTerms(each.kind, each.amount, each.quarters, rating);
    if (terms === null) return [];
    number += 1;
    return [
      {
        kind: each.kind,
        number,
        taken: date,
        borrowed: terms.amount,
        annualRateBasisPoints: terms.annualRateBasisPoints,
        termQuarters: terms.quarters,
        owed: terms.amount,
        repayment: terms.repayment,
        quartersLeft: terms.quarters,
        schedule: each.kind === 'bond' ? 'atMaturity' : 'level',
      },
    ];
  });
  return {
    debts: [...debts, ...taken],
    borrowed: sum(taken.map((debt) => debt.borrowed)),
    contributions: taken.map((debt) => ({
      label: `${debtName(debt)} received`,
      amount: debt.borrowed,
    })),
    changes: taken.map((debt) => ({ label: `${debtName(debt)} taken`, amount: debt.borrowed })),
    entries: taken.map(takenEntry),
  };
}

function takenEntry(debt: Debt): ReportEntry {
  const rate = debt.annualRateBasisPoints;
  const interest = paidOver(debt.borrowed, rate, debt.termQuarters, debt.repayment) - debt.borrowed;
  if (debt.kind === 'bond') {
    const matures = maturityOfTaking(debt.taken, debt.termQuarters);
    return {
      kind: 'loanTaken',
      seriousness: 'notable',
      headline: `Issued ${formatMoney(debt.borrowed)} in bonds: ${debtName(debt)}`,
      cause: `It pays ${formatMoney(debt.repayment)} a quarter in interest from next quarter, at ${formatRate(rate)} a year, and the whole ${formatMoney(debt.borrowed)} falls due at maturity in Year ${matures.year} · Quarter ${matures.quarter}: ${formatMoney(interest)} in interest.`,
    };
  }
  return {
    kind: 'loanTaken',
    seriousness: 'notable',
    headline: `Borrowed ${formatMoney(debt.borrowed)}: ${debtName(debt)}`,
    cause: `It is repaid at ${formatMoney(debt.repayment)} a quarter over ${formatQuarters(debt.termQuarters)} from next quarter, at ${formatRate(debt.annualRateBasisPoints)} a year: ${formatMoney(interest)} in interest.`,
  };
}

function repaidEntry(debt: Debt, name: string): ReportEntry {
  return {
    kind: 'loanRepaid',
    seriousness: 'notable',
    headline: `Repaid: ${name}`,
    cause:
      debt.kind === 'bond'
        ? `The ${formatMoney(debt.borrowed)} raised in Year ${debt.taken.year} · Quarter ${debt.taken.quarter} is repaid, and its interest ends.`
        : `The ${formatMoney(debt.borrowed)} borrowed in Year ${debt.taken.year} · Quarter ${debt.taken.quarter} is paid off, and its repayments end.`,
  };
}

function missedEntry(
  before: Debt,
  name: string,
  due: Money,
  unpaid: Money,
  after: Debt,
): ReportEntry {
  const matured = paysAtMaturity(before) && before.quartersLeft <= 1;
  const owing = (debt: Debt) => (paysAtMaturity(debt) ? 'interest' : 'repayment');
  // Only interest that went unpaid adds to the debt; principal unpaid was owed already.
  const interestUnpaid = Math.max(0, after.owed - before.owed);
  const principalUnpaid = unpaid - interestUnpaid;
  const owed = formatMoney(after.owed);
  const unpaidPart =
    interestUnpaid === 0
      ? `${formatMoney(principalUnpaid)} of principal went unpaid, and ${owed} is still owed.`
      : `${principalUnpaid === 0 ? 'The' : `${formatMoney(principalUnpaid)} of principal went unpaid, and the`} ${formatMoney(interestUnpaid)} of interest it could not pay was added to the debt: ${owed} is now owed.`;
  return {
    kind: 'missedPayment',
    seriousness: 'serious',
    headline: `Missed payment: ${name}`,
    cause: matured
      ? `The treasury and the quarter’s revenue could not cover the ${formatMoney(due)} due at its maturity. ${unpaidPart} It is repaid at ${formatMoney(after.repayment)} a quarter over ${formatQuarters(after.quartersLeft)}.`
      : `The treasury and the quarter’s revenue could not cover its ${formatMoney(due)} ${owing(before)}. ${unpaidPart} Its ${owing(after)} is now ${formatMoney(after.repayment)} a quarter.`,
  };
}
