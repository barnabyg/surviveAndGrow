import { nextDate, quartersUntilHarvest } from './calendar';
import {
  resolveBudget,
  revenueOf,
  withBorrowed,
  withFixedCosts,
  type BudgetOutcome,
} from './budget';
import { serveDebts, takeDebts, type Borrowing } from './debt';
import {
  resolveProjects,
  siteEffects,
  startsOf,
  type BuildingOutcome,
  type Project,
  type ProjectTarget,
  type SiteEffects,
} from './projects';
import type { Decisions, GameState } from './state';
import { resolveTrade, type TradeOrder, type TradeOutcome } from './trade';
import type { Contribution } from './types';
import { resolveUpkeep } from './upkeep';

export interface QuarterMoney {
  /** What repaying debts did, before anything else. */
  readonly serviced: ReturnType<typeof serveDebts>;
  /** What the budget alone did: revenue, and spending on the areas it sets. */
  readonly budget: BudgetOutcome;
  /** What building did with the money the budget left. */
  readonly building: BuildingOutcome;
  /** The projects once upkeep has told on the sites in use, and what the report says of it. */
  readonly upkept: ReturnType<typeof resolveUpkeep>;
  /** What was borrowed, which arrives as the quarter ends. */
  readonly taken: ReturnType<typeof takeDebts>;
  /** What was bought abroad, paid for as the quarter ends, after what was borrowed arrives. */
  readonly traded: TradeOutcome;
  /** All of it together: the quarter's whole effect on the treasury. */
  readonly finances: BudgetOutcome;
}

/**
 * One quarter of money. Repayments on debts come first, out of the treasury and the
 * quarter's revenue; then the budget's own spending, cut if what is left cannot cover it;
 * then the instalments on projects are paid out of what is left. The sites that upkeep did
 * not reach are decaying from the next quarter. What is borrowed arrives as the quarter
 * ends, after all of it, unless a missed payment has brought a bailout; and then what was
 * bought abroad is paid for.
 */
export function resolveMoney(
  state: Pick<
    GameState,
    | 'country'
    | 'treasury'
    | 'regions'
    | 'projects'
    | 'date'
    | 'debts'
    | 'credit'
    | 'worldPrices'
    | 'foodReserve'
  >,
  decisions: Decisions,
  starts: readonly ProjectTarget[] = startsOf(decisions),
  borrowing: readonly Borrowing[] = decisions.borrow ?? [],
  trading: readonly TradeOrder[] = decisions.trade ?? [],
): QuarterMoney {
  const serviced = serveDebts(
    state.debts,
    state.treasury + revenueOf(state, decisions.budget),
    state.date,
  );
  const budget = resolveBudget(state, decisions.budget, serviced);
  const building = resolveProjects(state, starts, state.date, budget.treasury);
  // A missed payment puts everything owed in the bailout loan, and nothing more is lent.
  const taken = takeDebts(
    serviced.debts,
    serviced.missed > 0 ? [] : borrowing,
    state.date,
    state.credit.rating,
  );
  const borrowed = withBorrowed(
    withFixedCosts(budget, building.paid, building.contributions),
    taken.borrowed,
    taken.contributions,
  );
  const traded = resolveTrade(state, trading, borrowed.treasury, state.foodReserve);
  return {
    serviced,
    budget,
    building,
    upkept: resolveUpkeep({ country: state.country, projects: building.projects }, budget.upkeep),
    taken,
    traded,
    // Goods bought or sold abroad move the treasury but are no part of the budget's balance.
    finances: withBorrowed(borrowed, traded.earned - traded.paid, traded.money),
  };
}

/**
 * The quarter's food with its trade: the grain sold abroad, set aside before it began, and
 * the grain bought abroad, which reaches the national reserve once it is over.
 */
export function withTraded<
  Food extends { foodReserve: number; contributions: readonly Contribution[] },
>(food: Food, traded: TradeOutcome): Food {
  return {
    ...food,
    foodReserve: food.foodReserve + traded.imported,
    contributions: [...traded.sold, ...food.contributions, ...traded.bought],
  };
}

export interface QuarterAhead {
  readonly finances: BudgetOutcome;
  /** The sites in use as that quarter begins. */
  readonly sites: SiteEffects;
  /** The grain bought abroad that reaches the reserve as that quarter ends, in tonnes. */
  readonly imported: number;
  /** The grain sold abroad, set aside from the reserve as that quarter begins, in tonnes. */
  readonly exported: number;
}

/**
 * What the budget will bring in and pay out in each quarter from this one to the harvest
 * if it is left as it is, and the sites that will be in use by then. A treasury that runs
 * dry on the way cuts the later quarters' spending and pauses building, and the forecast
 * must know it.
 */
export function quartersToHarvest(state: GameState, decisions: Decisions): QuarterAhead[] {
  const quarterly: QuarterAhead[] = [];
  let { treasury, date } = state;
  let projects: readonly Project[] = state.projects;
  let { debts } = state;
  for (let ahead = quartersUntilHarvest(state.date.quarter); ahead > 0; ahead -= 1) {
    // Projects are started, money borrowed and goods bought in the quarter being decided and
    // none after.
    const later = quarterly.length === 0 ? undefined : [];
    const money = resolveMoney(
      { ...state, treasury, projects, date, debts },
      decisions,
      later,
      later,
      later,
    );
    quarterly.push({
      finances: money.finances,
      sites: siteEffects({ ...state, projects }),
      imported: money.traded.imported,
      exported: money.traded.exported,
    });
    ({ treasury } = money.finances);
    ({ projects } = money.upkept);
    ({ debts } = money.taken);
    date = nextDate(date);
  }
  return quarterly;
}
