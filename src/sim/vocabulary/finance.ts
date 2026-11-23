/** Finance: the kinds of debt, how each is repaid, and the credit rating’s steps. */

/**
 * The kinds of debt the nation can owe. A loan is repaid in equal quarterly repayments of
 * interest and principal over its term. A bond pays only interest each quarter, and the
 * whole sum at maturity. A bailout loan is never borrowed: it is what a missed payment turns
 * everything owed into, repaid like a loan on the lenders' terms.
 */
export const DEBT_KINDS = ['loan', 'bond', 'bailout'] as const;
export type DebtKind = (typeof DEBT_KINDS)[number];

/**
 * How a debt is repaid: level, in equal repayments of interest and principal, or interest
 * alone until everything owed falls due at maturity.
 */
export const DEBT_SCHEDULES = ['level', 'atMaturity'] as const;
export type DebtSchedule = (typeof DEBT_SCHEDULES)[number];

export const DEBT_KIND_NAMES: Readonly<Record<DebtKind, string>> = {
  loan: 'Loan',
  bond: 'Bond',
  bailout: 'Bailout loan',
};

/**
 * The steps of the nation's credit rating, from the worst to the best. The rating sets the
 * rate new debt is taken at and the most that may be owed.
 */
export const CREDIT_RATINGS = ['b', 'bb', 'bbb', 'a', 'aa'] as const;
export type CreditRating = (typeof CREDIT_RATINGS)[number];

export const CREDIT_RATING_NAMES: Readonly<Record<CreditRating, string>> = {
  b: 'B',
  bb: 'BB',
  bbb: 'BBB',
  a: 'A',
  aa: 'AA',
};
