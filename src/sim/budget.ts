import { balance } from './balance';
import { sum } from './arithmetic';
import { regionName, type Country } from './country';
import type { Notice, RegionState } from './state';
import { formatMoney } from './text';
import type { Contribution, Money } from './types';
import { SPENDING_AREA_NAMES, SPENDING_AREAS, type SpendingArea } from './vocabulary';

/** The player's budget: a tax rate and an amount for each spending area, per quarter. */
export interface Budget {
  /** A whole percentage of each region's output. */
  readonly taxRatePercent: number;
  readonly spending: Readonly<Record<SpendingArea, Money>>;
}

/** What a budget does to the treasury in one quarter. Nothing in it is left to chance. */
export interface BudgetOutcome {
  readonly revenue: Money;
  /** What the budget asks to spend. */
  readonly budgeted: Money;
  /** What is actually spent, which is less than budgeted when the treasury falls short. */
  readonly spending: Money;
  readonly spent: Readonly<Record<SpendingArea, Money>>;
  /** Revenue less spending. */
  readonly balance: Money;
  /** The treasury once the quarter is over. */
  readonly treasury: Money;
  /** True when the treasury could not cover the budget and every area was cut. */
  readonly cut: boolean;
  /** Everything that moved the treasury, by revenue source and spending area. */
  readonly contributions: readonly Contribution[];
}

/** What is wrong with a tax rate, or null when the game allows it. */
export function taxRateFault(rate: number): string | null {
  const { min, max } = balance.budget.taxRatePercent;
  return Number.isInteger(rate) && rate >= min && rate <= max
    ? null
    : `must be a whole number from ${min} to ${max}, but is ${rate}`;
}

/** What is wrong with the spending on one area, or null when the game allows it. */
export function spendingFault(amount: Money): string | null {
  const { min, max, step } = balance.budget.spending;
  return Number.isInteger(amount) && amount >= min && amount <= max && amount % step === 0
    ? null
    : `must be from ${formatMoney(min)} to ${formatMoney(max)} in steps of ${formatMoney(step)}, but is ${formatMoney(amount)}`;
}

/** @throws RangeError when the budget is outside what the game allows. */
export function checkBudget(budget: Budget): void {
  const rateFault = taxRateFault(budget.taxRatePercent);
  if (rateFault !== null) throw new RangeError(`The tax rate ${rateFault}.`);
  for (const area of SPENDING_AREAS) {
    const fault = spendingFault(budget.spending[area]);
    if (fault !== null) throw new RangeError(`${SPENDING_AREA_NAMES[area]} spending ${fault}.`);
  }
}

interface Finances {
  readonly country: Country;
  readonly treasury: Money;
  readonly regions: readonly RegionState[];
}

/** Works out one quarter of revenue and spending. The same sums serve the turn and the preview. */
export function resolveBudget(
  { country, treasury, regions }: Finances,
  budget: Budget,
): BudgetOutcome {
  const taxes = regions.map((region): Contribution => ({
    label: `Tax from ${regionName(country, region.id)}`,
    amount: percentOf(region.output, budget.taxRatePercent),
    regionId: region.id,
  }));
  const revenue = sum(taxes.map((tax) => tax.amount));
  const budgeted = sum(SPENDING_AREAS.map((area) => budget.spending[area]));

  // Spending the treasury cannot cover is cut across every area in the same proportion.
  const affordable = treasury + revenue;
  const cut = budgeted > affordable;
  const spent = Object.fromEntries(
    SPENDING_AREAS.map((area) => {
      const wanted = budget.spending[area];
      return [area, cut ? Math.floor((wanted * affordable) / budgeted) : wanted];
    }),
  ) as Record<SpendingArea, Money>;
  const spending = sum(SPENDING_AREAS.map((area) => spent[area]));

  return {
    revenue,
    budgeted,
    spending,
    spent,
    balance: revenue - spending,
    treasury: treasury + revenue - spending,
    cut,
    contributions: [
      ...taxes,
      ...SPENDING_AREAS.map((area): Contribution => ({
        label: SPENDING_AREA_NAMES[area],
        amount: -spent[area],
      })),
    ],
  };
}

/** The notice the turn report carries when spending had to be cut. */
export function cutNotice(outcome: BudgetOutcome): Notice {
  return {
    title: 'Spending was cut',
    detail: `The treasury could not cover the ${formatMoney(outcome.budgeted)} budget. Every area was cut to what could be afforded: ${formatMoney(outcome.spending)} in all.`,
    tone: 'danger',
  };
}

/** A whole percentage of an amount, rounded to the nearest unit using whole-number sums. */
function percentOf(amount: Money, percent: number): Money {
  return Math.floor((amount * percent + 50) / 100);
}
