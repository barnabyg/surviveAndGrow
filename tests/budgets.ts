// The one place a test or a scripted player builds a budget. A budget names every spending
// area the game has, so a budget spelled out by hand breaks when the game gains an area: these
// builders take the areas a test cares about and fill in the rest.
import { SPENDING_AREAS, type Budget, type Money, type SpendingArea } from '../src/sim';

/** What is spent on the areas a test names, in Money units. The builder fills in the others. */
export type SpendingOn = Readonly<Partial<Record<SpendingArea, Money>>>;

/**
 * A whole budget from the areas named. Every other area gets `elsewhere`: nothing, unless a
 * test means "the same on everything", such as the most a slider allows. A test whose figures
 * count on what is spent names its areas, so that they stand when the game gains one.
 */
export function budgetOf(given: {
  readonly taxRatePercent: number;
  readonly spending?: SpendingOn;
  readonly elsewhere?: Money;
}): Budget {
  const { taxRatePercent, spending = {}, elsewhere = 0 } = given;
  return {
    taxRatePercent,
    spending: Object.fromEntries(
      SPENDING_AREAS.map((area) => [area, spending[area] ?? elsewhere]),
    ) as Record<SpendingArea, Money>,
  };
}

/**
 * Another budget, such as a country's starting budget or the budget in force, with the tax
 * rate or the areas named changed and everything else as it was.
 */
export function budgetFrom(
  base: Budget,
  changes: { readonly taxRatePercent?: number; readonly spending?: SpendingOn },
): Budget {
  return {
    taxRatePercent: changes.taxRatePercent ?? base.taxRatePercent,
    spending: { ...base.spending, ...changes.spending },
  };
}

/**
 * The lowest tax and $20.0m, the most a slider allows, on each area named: more than a
 * treasury covers. Tests whose figures were worked out on this budget share it. It names its
 * areas, so those figures stand when the game gains an area, on which it spends nothing.
 */
export const lavish: Budget = budgetOf({
  taxRatePercent: 5,
  spending: {
    agriculture: 200,
    foodRelief: 200,
    health: 200,
    education: 200,
    security: 200,
    upkeep: 200,
  },
});
