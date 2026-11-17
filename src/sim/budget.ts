import { outputPermille } from './approval';
import { balance } from './balance';
import { clamp, sum } from './arithmetic';
import { regionName, type Country } from './country';
import type { ReportEntry } from './report';
import type { RegionState } from './state';
import { formatMoney } from './text';
import type { Contribution, Money } from './types';
import { SPENDING_AREA_NAMES, SPENDING_AREAS, UNREST_NAMES, type SpendingArea } from './vocabulary';

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
  /**
   * What is actually spent, which is less than budgeted when the treasury falls short. It
   * counts the fixed costs once they have been added.
   */
  readonly spending: Money;
  /** The part of spending that is fixed and not the budget's to set: instalments on projects. */
  readonly fixed: Money;
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

/**
 * The nearest budget the game allows to the one given: the tax rate and each area's spending
 * brought inside their limits, and spending brought down onto a step. A budget the game
 * already allows comes back as it is.
 */
export function fitBudget(budget: Budget): Budget {
  const { taxRatePercent, spending } = balance.budget;
  return {
    taxRatePercent: clamp(budget.taxRatePercent, taxRatePercent.min, taxRatePercent.max),
    spending: Object.fromEntries(
      SPENDING_AREAS.map((area) => {
        const amount = clamp(budget.spending[area], spending.min, spending.max);
        return [area, amount - ((amount - spending.min) % spending.step)];
      }),
    ) as Record<SpendingArea, Money>,
  };
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

/**
 * Works out one quarter of revenue and spending. The same sums serve the turn and the
 * preview. A region that is striking or protesting as the quarter begins produces less,
 * and the tax that costs is shown as a loss beside what it would have paid.
 */
export function resolveBudget(
  { country, treasury, regions }: Finances,
  budget: Budget,
): BudgetOutcome {
  const taxes = regions.flatMap((region): Contribution[] => {
    const name = regionName(country, region.id);
    const inFull = percentOf(region.output, budget.taxRatePercent);
    const produced = Math.floor((region.output * outputPermille(region.unrest)) / 1000);
    const lost = inFull - percentOf(produced, budget.taxRatePercent);
    return [
      { label: `Tax from ${name}`, amount: inFull, regionId: region.id },
      ...(lost > 0
        ? [
            {
              label: `Lost to ${UNREST_NAMES[region.unrest].toLowerCase()} in ${name}`,
              amount: -lost,
              regionId: region.id,
            },
          ]
        : []),
    ];
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
    fixed: 0,
    spent,
    balance: revenue - spending,
    treasury: treasury + revenue - spending,
    cut,
    contributions: [
      ...taxes,
      ...SPENDING_AREAS.map((area): Contribution => ({
        label: SPENDING_AREA_NAMES[area],
        // Taken from nothing, so that an area with no spending reads 0 and never −0.
        amount: 0 - spent[area],
      })),
    ],
  };
}

/**
 * Adds the quarter's fixed costs to what the budget did. They were paid out of what the
 * budget's own spending left in the treasury.
 */
export function withFixedCosts(
  outcome: BudgetOutcome,
  paid: Money,
  contributions: readonly Contribution[],
): BudgetOutcome {
  return {
    ...outcome,
    spending: outcome.spending + paid,
    fixed: outcome.fixed + paid,
    balance: outcome.balance - paid,
    treasury: outcome.treasury - paid,
    contributions: [...outcome.contributions, ...contributions],
  };
}

/** What the turn report says when spending had to be cut. */
export function cutEntry(outcome: BudgetOutcome): ReportEntry {
  return {
    kind: 'spendingCut',
    seriousness: 'serious',
    headline: 'Spending was cut',
    cause: `The treasury could not cover the ${formatMoney(outcome.budgeted)} budget. Every area was cut to what could be afforded: ${formatMoney(outcome.spending - outcome.fixed)} in all.`,
  };
}

/**
 * What the turn report says of the quarter's budget: whether the treasury grew or shrank,
 * and by what. A deficit also says how long the treasury can go on paying it.
 */
export function budgetEntry(outcome: BudgetOutcome): ReportEntry {
  const revenue = formatMoney(outcome.revenue);
  const spending = formatMoney(outcome.spending);
  if (outcome.balance < 0) {
    const quarters = Math.floor(outcome.treasury / -outcome.balance);
    const lasts =
      quarters === 0
        ? 'The treasury cannot cover another quarter like it.'
        : `At this deficit the treasury lasts ${quarters} more ${quarters === 1 ? 'quarter' : 'quarters'}.`;
    return {
      kind: 'budget',
      seriousness: 'warning',
      headline: 'The treasury is shrinking',
      cause: `Spending of ${spending} outran revenue of ${revenue}. ${lasts}`,
    };
  }
  if (outcome.balance > 0) {
    return {
      kind: 'budget',
      seriousness: 'routine',
      headline: 'The treasury is growing',
      cause: `Revenue of ${revenue} outran spending of ${spending}, leaving ${formatMoney(outcome.balance)} over.`,
    };
  }
  return {
    kind: 'budget',
    seriousness: 'routine',
    headline: 'The budget balanced',
    cause: `Revenue and spending were both ${revenue}.`,
  };
}

/** A whole percentage of an amount, rounded to the nearest unit using whole-number sums. */
function percentOf(amount: Money, percent: number): Money {
  return Math.floor((amount * percent + 50) / 100);
}
