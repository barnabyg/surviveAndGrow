import { balance } from './balance';
import type { Budget } from './budget';
import { dateOfQuarter, quarterNumber } from './calendar';
import type { Country } from './country';
import { formatMoney, formatQuarters } from './text';
import type { GameDate, Money } from './types';
import { SPENDING_AREA_NAMES, SPENDING_AREAS, type SpendingArea } from './vocabulary';

/**
 * Austerity: the terms a bailout imposes for a fixed number of quarters. The tax rate may not
 * go below a floor, spending on some areas may not go above a cap, and nothing may be
 * borrowed nor any project started. Projects already under way carry on. The rules here say
 * what austerity allows; `bailout.ts` says when it begins, is extended and ends.
 */

/** What the game remembers of austerity while it is in force. */
export interface Austerity {
  /**
   * How many quarters it still holds, counting the one being decided. It ends as the last of
   * them ends.
   */
  readonly quartersLeft: number;
}

/** What austerity needs of the game: the country, the date and whether it is in force. */
export interface Austere {
  readonly country: Country;
  readonly date: GameDate;
  readonly austerity: Austerity | null;
}

/** The limits austerity sets on the budget, as the player is shown them. */
export interface AusterityStatus {
  readonly quartersLeft: number;
  /** The last quarter it holds; it ends as this quarter ends. */
  readonly lastQuarter: GameDate;
  /** The lowest tax rate allowed, as a whole percentage. */
  readonly taxFloorPercent: number;
  /** The most that may be spent on each area, or null where it is not capped. */
  readonly caps: Readonly<Record<SpendingArea, Money | null>>;
  /** Why the limits hold and until when, in a sentence. */
  readonly reason: string;
}

/** The ranges each part of the budget may be set within, as things stand. */
export interface BudgetBounds {
  readonly taxRatePercent: { readonly min: number; readonly max: number };
  readonly spending: Readonly<
    Record<SpendingArea, { readonly min: Money; readonly max: Money; readonly step: Money }>
  >;
}

/**
 * The most that may be spent on an area during austerity, or null where it is not capped: a
 * share of what the country's starting budget spends there, brought down onto a step, but
 * never below one step unless the starting budget spends nothing there.
 */
export function spendingCap(country: Country, area: SpendingArea): Money | null {
  const share = balance.finance.austerity.spendingCapPermille[area];
  if (share === undefined) return null;
  const { step } = balance.budget.spending;
  const start = country.start.budget.spending[area];
  const capped = Math.floor((start * share) / 1000);
  return Math.max(capped - (capped % step), Math.min(start, step));
}

/** The last quarter austerity holds, as the game stands at a date. */
function lastQuarterOf(austerity: Austerity, date: GameDate): GameDate {
  return dateOfQuarter(quarterNumber(date) + austerity.quartersLeft - 1);
}

/** "until Year 3 · Quarter 2 ends", the end of austerity as the game stands at a date. */
export function untilAusterityEnds(austerity: Austerity, date: GameDate): string {
  const last = lastQuarterOf(austerity, date);
  return `until Year ${last.year} · Quarter ${last.quarter} ends`;
}

/** How austerity stands, or null when it is not in force. */
export function austerityStatus(game: Austere): AusterityStatus | null {
  const { austerity } = game;
  if (austerity === null) return null;
  return {
    quartersLeft: austerity.quartersLeft,
    lastQuarter: lastQuarterOf(austerity, game.date),
    taxFloorPercent: balance.finance.austerity.taxFloorPercent,
    caps: Object.fromEntries(
      SPENDING_AREAS.map((area) => [area, spendingCap(game.country, area)]),
    ) as Record<SpendingArea, Money | null>,
    reason: `The bailout’s terms hold for ${formatQuarters(austerity.quartersLeft)} more, ${untilAusterityEnds(austerity, game.date)}.`,
  };
}

/** The ranges the budget may be set within: the game's own, narrowed by austerity. */
export function budgetBounds(game: Austere): BudgetBounds {
  const { taxRatePercent, spending } = balance.budget;
  const status = austerityStatus(game);
  return {
    taxRatePercent: {
      min: Math.max(taxRatePercent.min, status?.taxFloorPercent ?? taxRatePercent.min),
      max: taxRatePercent.max,
    },
    spending: Object.fromEntries(
      SPENDING_AREAS.map((area) => [
        area,
        { ...spending, max: Math.min(spending.max, status?.caps[area] ?? spending.max) },
      ]),
    ) as BudgetBounds['spending'],
  };
}

/**
 * The budget brought within austerity: the tax rate raised to the floor and spending lowered
 * to the caps. A budget austerity already allows, or any budget when it is not in force,
 * comes back as it is.
 */
export function withinAusterity(game: Austere, budget: Budget): Budget {
  if (game.austerity === null) return budget;
  const bounds = budgetBounds(game);
  return {
    taxRatePercent: Math.max(budget.taxRatePercent, bounds.taxRatePercent.min),
    spending: Object.fromEntries(
      SPENDING_AREAS.map((area) => [
        area,
        Math.min(budget.spending[area], bounds.spending[area].max),
      ]),
    ) as Budget['spending'],
  };
}

/** What is wrong with a budget under austerity, or null when it allows it. */
export function austerityBudgetFault(game: Austere, budget: Budget): string | null {
  const status = austerityStatus(game);
  if (status === null || game.austerity === null) return null;
  const until = untilAusterityEnds(game.austerity, game.date);
  if (budget.taxRatePercent < status.taxFloorPercent) {
    return `The tax rate cannot go below ${status.taxFloorPercent}% during austerity, ${until}.`;
  }
  for (const area of SPENDING_AREAS) {
    const cap = status.caps[area];
    if (cap !== null && budget.spending[area] > cap) {
      return `${SPENDING_AREA_NAMES[area]} spending cannot go above ${formatMoney(cap)} during austerity, ${until}.`;
    }
  }
  return null;
}

/** Why nothing can be borrowed now, or null when austerity does not forbid it. */
export function borrowingBarred(game: Pick<Austere, 'date' | 'austerity'>): string | null {
  if (game.austerity === null) return null;
  return `Nothing can be borrowed during austerity, ${untilAusterityEnds(game.austerity, game.date)}: the bailout’s terms forbid it.`;
}

/** Why no project can be started now, or null when austerity does not forbid it. */
export function buildingBarred(game: Pick<Austere, 'date' | 'austerity'>): string | null {
  if (game.austerity === null) return null;
  return `No project can be started during austerity, ${untilAusterityEnds(game.austerity, game.date)}: the bailout’s terms forbid it. Projects already under way carry on.`;
}
