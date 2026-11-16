import { balance } from './balance';
import type { Country } from './country';
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

/** @throws RangeError when the budget is outside what the game allows. */
export function checkBudget(budget: Budget): void {
  const { taxRatePercent, spending } = balance.budget;
  const rate = budget.taxRatePercent;
  if (!Number.isInteger(rate) || rate < taxRatePercent.min || rate > taxRatePercent.max) {
    throw new RangeError(
      `The tax rate must be a whole number from ${taxRatePercent.min} to ${taxRatePercent.max}, but is ${rate}.`,
    );
  }
  for (const area of SPENDING_AREAS) {
    const amount = budget.spending[area];
    const allowed =
      Number.isInteger(amount) &&
      amount >= spending.min &&
      amount <= spending.max &&
      amount % spending.step === 0;
    if (!allowed) {
      throw new RangeError(
        `${SPENDING_AREA_NAMES[area]} spending must be from ${formatMoney(spending.min)} to ${formatMoney(spending.max)} in steps of ${formatMoney(spending.step)}, but is ${formatMoney(amount)}.`,
      );
    }
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
  const taxes = regions.map((region): Contribution => {
    const name = country.regions.find((candidate) => candidate.id === region.id)?.name ?? region.id;
    return {
      label: `Tax from ${name}`,
      amount: percentOf(region.output, budget.taxRatePercent),
      regionId: region.id,
    };
  });
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

function sum(amounts: readonly number[]): number {
  return amounts.reduce((total, amount) => total + amount, 0);
}
