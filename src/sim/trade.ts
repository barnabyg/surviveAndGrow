import { clamp, sum } from './arithmetic';
import type { Country } from './country';
import type { Project } from './projects';
import { balance } from './balance';
import { quarterNumber } from './calendar';
import type { ReportEntry } from './report';
import { foodStatus, safeReserveTonnes } from './food';
import {
  pushesAhead,
  shockName,
  shocksThatMoved,
  shockStatuses,
  pushOf,
  type ShockStatus,
  type ShockWatch,
} from './priceShocks';
import { drawAt } from './rng';
import { capacityFault } from './tradeLinks';
import type { RegionState } from './state';
import { formatMoney, formatQuarters, formatTonnes } from './text';
import {
  DOLLARS_PER_MONEY,
  type Contribution,
  type Figure,
  type GameDate,
  type Money,
  type Range,
} from './types';
import {
  GOOD_NAMES,
  GOODS,
  ORDERED_GOODS,
  TRADE_DIRECTIONS,
  type Good,
  type TradeDirection,
} from './vocabulary';

/**
 * The world price of each good, in whole dollars a tonne, as each quarter began: from the
 * start of the game, or from when a save written before trade was opened, to the quarter now
 * being decided. The last is the price now.
 */
export type WorldPrices = Readonly<Record<Good, readonly number[]>>;

/** An order to trade a good across the border this quarter. */
export interface TradeOrder {
  readonly good: Good;
  readonly direction: TradeDirection;
  /** How much, in tonnes: a whole number of `balance.trade.orderStepTonnes`. */
  readonly tonnes: number;
}

/** An order is for a whole number of these tonnes. */
export const ORDER_STEP_TONNES = balance.trade.orderStepTonnes;

/** What grain sold abroad loses of the world price, in thousandths. */
export const EXPORT_MARGIN_PERMILLE = balance.trade.exportMarginPermille;

/** The world prices a game opens with: every good at its usual price. */
export function openingPrices(): WorldPrices {
  return byGood((good) => [balance.trade.goods[good].usualDollarsPerTonne]);
}

/** A record with one entry for each good, worked out from the good and its place in order. */
function byGood<Value>(value: (good: Good, index: number) => Value): Record<Good, Value> {
  const entries: Record<string, Value> = Object.fromEntries(
    GOODS.map((good, index) => [good, value(good, index)]),
  );
  return entries;
}

/** A good's world price now, in dollars a tonne. */
export function priceOf(prices: WorldPrices, good: Good): number {
  return prices[good].at(-1) ?? balance.trade.goods[good].usualDollarsPerTonne;
}

/**
 * The most world markets can move a price in a quarter, as a share of the good's full swing in
 * thousandths: a shock runs from minus this to this.
 */
export const FULL_SWING_PERMILLE = 1000;

/** A key that keeps the draws for prices apart from every other draw keyed on the seed. */
const PRICE_DRAWS = 0x70726963;

/**
 * How far world markets move each good's price as the game moves into a quarter, as a share
 * of the good's full swing in thousandths, from −`FULL_SWING_PERMILLE` to `FULL_SWING_PERMILLE`,
 * in the goods' order. Like the dilemma rolls they depend on the seed and the quarter alone, so
 * the weather and events a seed brings do not shift with them.
 */
export function rollPrices(seed: number, date: GameDate): number[] {
  return GOODS.map((_good, index) => {
    const roll = drawAt(seed, PRICE_DRAWS, quarterNumber(date), index);
    return Math.floor(roll * (2 * FULL_SWING_PERMILLE + 1)) - FULL_SWING_PERMILLE;
  });
}

/** What moves one good's price in a quarter, in dollars a tonne. */
interface PriceMove {
  /** The pull back towards the usual price. */
  readonly revert: number;
  /** What world markets did, within the limits. */
  readonly markets: number;
  readonly price: number;
}

/**
 * A good's price after a quarter, from its price before, what markets did to it and what
 * world price shocks in force pushed it by, in dollars a tonne.
 */
function movePrice(good: Good, price: number, shock: number, push = 0): PriceMove {
  const rules = balance.trade.goods[good];
  const usual = rules.usualDollarsPerTonne;
  const revert = Math.round(((usual - price) * rules.revertPermillePerQuarter) / 1000);
  const swing = Math.round((usual * rules.swingPermillePerQuarter * shock) / 1_000_000);
  const next = clamp(
    price + revert + swing + push,
    rules.lowestDollarsPerTonne,
    rules.highestDollarsPerTonne,
  );
  return { revert, markets: next - price - revert, price: next };
}

/**
 * The world prices once a quarter is over, with the new price of each good added to its path.
 * `pushes` is what world price shocks in force push each good's price by, in dollars a tonne,
 * in the goods' order (`pushesInto`).
 */
export function movePrices(
  prices: WorldPrices,
  shocks: readonly number[],
  pushes: readonly number[] = [],
): WorldPrices {
  return byGood((good, index) => [
    ...prices[good],
    movePrice(good, priceOf(prices, good), shocks[index] ?? 0, pushes[index] ?? 0).price,
  ]);
}

/** A good's world price as the player sees it. */
export interface PriceStatus {
  readonly good: Good;
  readonly name: string;
  /** The price now, in dollars a tonne. */
  readonly price: number;
  /** The price at its usual level. */
  readonly usual: number;
  /** The price as each recorded quarter began, the oldest first, ending with now. */
  readonly path: readonly number[];
  /** What moved it last quarter, or null when it has not yet moved. */
  readonly figure: Figure | null;
  /** The range it could reach within the forecast. */
  readonly forecast: Range;
  /** How many quarters ahead the forecast looks. */
  readonly forecastQuarters: number;
  /** The world price shocks announced or in force on it. */
  readonly shocks: readonly ShockStatus[];
}

/** What a game must say for a good's price to be read. */
export interface PriceWatch extends ShockWatch {
  readonly worldPrices: WorldPrices;
}

/** Where a good's world price stands, what moved it and where it could go. */
export function priceStatus(game: PriceWatch, good: Good): PriceStatus {
  const path = game.worldPrices[good];
  const price = priceOf(game.worldPrices, good);
  const before = path.at(-2);
  return {
    good,
    name: GOOD_NAMES[good],
    price,
    usual: balance.trade.goods[good].usualDollarsPerTonne,
    path,
    figure: before === undefined ? null : priceFigure(game, good, before, price),
    forecast: forecastPrice(game, good, price),
    forecastQuarters: balance.trade.forecastQuarters,
    shocks: shockStatuses(game, good),
  };
}

/**
 * What moved a price from one quarter to the next: the pull back towards the usual price,
 * any world price shock in force, and world markets, which take in whatever the limits held
 * back.
 */
function priceFigure(game: ShockWatch, good: Good, before: number, after: number): Figure {
  const rules = balance.trade.goods[good];
  const within = (price: number) =>
    clamp(price, rules.lowestDollarsPerTonne, rules.highestDollarsPerTonne);
  const { revert } = movePrice(good, before, 0);
  const pulled = within(before + revert);
  let reached = pulled;
  const shocks = shocksThatMoved(game, good).map((shock) => {
    const from = reached;
    reached = within(reached + pushOf(shock.type));
    return { label: shockName(shock.type), amount: reached - from };
  });
  return {
    value: after,
    change: after - before,
    contributions: [
      { label: 'Pull towards the usual price', amount: pulled - before },
      ...shocks,
      { label: 'World markets', amount: after - reached },
    ],
  };
}

/**
 * The lowest and highest a price could reach within the forecast: markets moving it the
 * same way every quarter, and the world price shocks announced pushing it as they will.
 */
function forecastPrice(game: ShockWatch, good: Good, price: number): Range {
  let low = price;
  let high = price;
  let min = price;
  let max = price;
  for (const push of pushesAhead(game, good, balance.trade.forecastQuarters)) {
    low = movePrice(good, low, -FULL_SWING_PERMILLE, push).price;
    high = movePrice(good, high, FULL_SWING_PERMILLE, push).price;
    min = Math.min(min, low);
    max = Math.max(max, high);
  }
  return { min, max };
}

/** What a number of tonnes costs at a price in dollars a tonne, to the nearest $100,000. */
export function costOf(tonnes: number, dollarsPerTonne: number): Money {
  return Math.round((tonnes * dollarsPerTonne) / DOLLARS_PER_MONEY);
}

/** An import as the trade panel offers it, before it is ordered. */
export interface ImportTerms {
  readonly good: Good;
  readonly tonnes: number;
  /** The price it is bought at: this quarter's world price. */
  readonly dollarsPerTonne: number;
  readonly cost: Money;
  /** Why it cannot be ordered as things stand, or null when it can. */
  readonly unavailable: string | null;
}

/** An export as the trade panel offers it, before it is ordered. */
export interface ExportTerms {
  readonly good: Good;
  readonly tonnes: number;
  /** The price it is sold at: this quarter's world price less the export margin. */
  readonly dollarsPerTonne: number;
  readonly income: Money;
  /** True when it would take the national reserve below its safe level. */
  readonly belowSafe: boolean;
  /** Why it cannot be ordered as things stand, or null when it can. */
  readonly unavailable: string | null;
}

interface Trader {
  readonly country: Country;
  /** The sites built and being built: a port in use is a trade link. */
  readonly projects: readonly Project[];
  readonly worldPrices: WorldPrices;
  readonly treasury: Money;
  /** The national reserve, which grain sold abroad comes out of. */
  readonly foodReserve: number;
  readonly regions: readonly RegionState[];
}

/**
 * What a good sells for abroad this quarter, in dollars a tonne: its world price less the
 * export margin, so that selling fetches less than buying costs.
 */
export function exportPriceOf(prices: WorldPrices, good: Good): number {
  const margin = balance.trade.exportMarginPermille;
  return Math.round((priceOf(prices, good) * (1000 - margin)) / 1000);
}

/** What kind of order an order is: the good and which way it goes. Each kind once a quarter. */
function kindOf(order: Pick<TradeOrder, 'good' | 'direction'>): string {
  return `${order.good} ${order.direction}`;
}

/** The order of a good one way among the orders planned, if there is one. */
export function plannedOrder(
  planned: readonly TradeOrder[],
  good: Good,
  direction: TradeDirection,
): TradeOrder | undefined {
  const kind = kindOf({ good, direction });
  return planned.find((order) => kindOf(order) === kind);
}

/** The import of a good among the orders planned, if there is one. */
export function plannedImport(planned: readonly TradeOrder[], good: Good): TradeOrder | undefined {
  return plannedOrder(planned, good, 'import');
}

/** The export of a good among the orders planned, if there is one. */
export function plannedExport(planned: readonly TradeOrder[], good: Good): TradeOrder | undefined {
  return plannedOrder(planned, good, 'export');
}

/** The orders planned with one put in place of any other of its kind. */
function withOrder(planned: readonly TradeOrder[], order: TradeOrder): TradeOrder[] {
  return [...planned.filter((other) => kindOf(other) !== kindOf(order)), order];
}

/** What importing a number of tonnes of a good would cost this quarter, and whether it may. */
export function importTerms(
  game: Trader,
  good: Good,
  tonnes: number,
  planned: readonly TradeOrder[] = [],
): ImportTerms {
  const dollarsPerTonne = priceOf(game.worldPrices, good);
  const order: TradeOrder = { good, direction: 'import', tonnes };
  return {
    good,
    tonnes,
    dollarsPerTonne,
    cost: costOf(tonnes, dollarsPerTonne),
    unavailable: tradeFault(game, withOrder(planned, order)),
  };
}

/**
 * What exporting a number of tonnes of a good from the national reserve would bring in this
 * quarter, whether it would take the reserve below its safe level, and whether it may.
 */
export function exportTerms(
  game: Trader,
  good: Good,
  tonnes: number,
  planned: readonly TradeOrder[] = [],
): ExportTerms {
  const dollarsPerTonne = exportPriceOf(game.worldPrices, good);
  const order: TradeOrder = { good, direction: 'export', tonnes };
  return {
    good,
    tonnes,
    dollarsPerTonne,
    income: costOf(tonnes, dollarsPerTonne),
    belowSafe: foodStatus({ regions: game.regions, foodReserve: game.foodReserve - tonnes })
      .belowSafeLevel,
    unavailable: tradeFault(game, withOrder(planned, order)),
  };
}

/** The grain the orders sell from the national reserve, in tonnes. */
export function exportedBy(orders: readonly TradeOrder[]): number {
  return sum(orders.filter((order) => order.direction === 'export').map((order) => order.tonnes));
}

/**
 * Why selling grain abroad leaves the reserve below its safe level, or null when it does not
 * or nothing is sold.
 */
export function belowSafeAfterExport(
  game: Pick<Trader, 'foodReserve' | 'regions'>,
  orders: readonly TradeOrder[],
): string | null {
  const sold = exportedBy(orders);
  const left = game.foodReserve - sold;
  if (sold === 0 || !foodStatus({ regions: game.regions, foodReserve: left }).belowSafeLevel) {
    return null;
  }
  return `Selling ${formatTonnes(sold)} takes the national reserve down to ${formatTonnes(Math.max(left, 0))}, below its safe level of ${formatTonnes(safeReserveTonnes(game.regions))}.`;
}

/** What is wrong with the orders to trade this quarter, or null when the game allows them. */
export function tradeFault(game: Trader, orders: readonly TradeOrder[]): string | null {
  const step = balance.trade.orderStepTonnes;
  for (const order of orders) {
    if (!(GOODS as readonly string[]).includes(order.good)) {
      return `"${order.good}" is not a good the world trades in.`;
    }
    if (!ORDERED_GOODS.includes(order.good)) {
      return `${GOOD_NAMES[order.good]} cannot be ordered: it is sold abroad only by a mine’s chain.`;
    }
    if (!(TRADE_DIRECTIONS as readonly string[]).includes(order.direction)) {
      return `Goods cannot be traded "${order.direction}".`;
    }
    if (!Number.isInteger(order.tonnes) || order.tonnes < step || order.tonnes % step !== 0) {
      return `An order must be for a whole number of ${formatTonnes(step)}, but is for ${formatTonnes(order.tonnes)}.`;
    }
  }
  const kinds = new Set(orders.map(kindOf));
  if (kinds.size !== orders.length) return 'Each good may be ordered only once a quarter.';
  // Bought and sold in one quarter, a good would only lose the margin, or game it.
  const both = GOODS.find(
    (good) =>
      plannedOrder(orders, good, 'import') !== undefined &&
      plannedOrder(orders, good, 'export') !== undefined,
  );
  if (both !== undefined) {
    return `${GOOD_NAMES[both]} cannot be both bought and sold in one quarter.`;
  }
  const carried = capacityFault(game, orders);
  if (carried !== null) return carried;
  const imports = orders.filter((order) => order.direction === 'import');
  const cost = sum(
    imports.map((order) => costOf(order.tonnes, priceOf(game.worldPrices, order.good))),
  );
  if (cost > game.treasury) {
    return `The treasury holds only ${formatMoney(game.treasury)}, and the grain ordered would cost ${formatMoney(cost)}.`;
  }
  const sold = exportedBy(orders);
  return sold > game.foodReserve
    ? `The national reserve holds only ${formatTonnes(game.foodReserve)}, and ${formatTonnes(sold)} would be sold.`
    : null;
}

/** What a quarter's trade did, as it ended. */
export interface TradeOutcome {
  /** The treasury once the goods sold have brought their income and the goods bought are paid for. */
  readonly treasury: Money;
  /** What was paid for the goods bought. */
  readonly paid: Money;
  /** What the goods sold brought in. */
  readonly earned: Money;
  /** The grain that reached the national reserve, in tonnes. */
  readonly imported: number;
  /** The grain that left the national reserve, in tonnes. */
  readonly exported: number;
  /** What trade did to the treasury, for its breakdown. */
  readonly money: readonly Contribution[];
  /**
   * What trade did to the reserve, for its breakdown: the grain sold, which is set aside as
   * the quarter begins, and the grain bought, which arrives as it ends.
   */
  readonly sold: readonly Contribution[];
  readonly bought: readonly Contribution[];
  readonly entries: readonly ReportEntry[];
}

/**
 * The quarter's trade. Each export is set aside from the national reserve as it stands once
 * any dilemma's answer has taken effect, so it is neither eaten nor spoiled, and is paid for
 * as the quarter ends at this quarter's world price less the export margin; one the reserve
 * no longer holds in full is cut to the whole steps it does. Each import is paid for out of
 * the treasury as the quarter ends at this quarter's world price and its grain reaches the
 * national reserve; one the treasury can no longer pay for in full by then is cut to the
 * whole steps it can.
 */
export function resolveTrade(
  game: { readonly worldPrices: WorldPrices },
  orders: readonly TradeOrder[],
  treasury: Money,
  reserve: number,
): TradeOutcome {
  let left = treasury;
  let held = reserve;
  let imported = 0;
  let exported = 0;
  let earned = 0;
  const money: Contribution[] = [];
  const sold: Contribution[] = [];
  const bought: Contribution[] = [];
  const entries: ReportEntry[] = [];
  for (const order of orders.filter((each) => each.direction === 'export')) {
    const price = exportPriceOf(game.worldPrices, order.good);
    const tonnes = Math.min(order.tonnes, wholeSteps(held));
    const income = costOf(tonnes, price);
    held -= tonnes;
    left += income;
    earned += income;
    exported += tonnes;
    const label = `${GOOD_NAMES[order.good]} exported`;
    if (tonnes > 0) {
      money.push({ label, amount: income });
      sold.push({ label, amount: -tonnes });
    }
    entries.push(exportEntry(order, tonnes, income, price));
  }
  const beforeImports = left;
  for (const order of orders.filter((each) => each.direction === 'import')) {
    const price = priceOf(game.worldPrices, order.good);
    const tonnes = affordable(order.tonnes, price, left);
    const cost = costOf(tonnes, price);
    left -= cost;
    imported += tonnes;
    const label = `${GOOD_NAMES[order.good]} imported`;
    if (tonnes > 0) {
      money.push({ label, amount: -cost });
      bought.push({ label, amount: tonnes });
    }
    entries.push(importEntry(order, tonnes, cost, price));
  }
  return {
    treasury: left,
    paid: beforeImports - left,
    earned,
    imported,
    exported,
    money,
    sold,
    bought,
    entries,
  };
}

/** The most of a weight that whole order steps make up. */
function wholeSteps(tonnes: number): number {
  const step = balance.trade.orderStepTonnes;
  return Math.max(0, Math.floor(tonnes / step) * step);
}

/** What the turn report says of an export. */
function exportEntry(order: TradeOrder, tonnes: number, income: Money, price: number): ReportEntry {
  const name = GOOD_NAMES[order.good];
  if (tonnes === order.tonnes) {
    return {
      kind: 'trade',
      seriousness: 'notable',
      headline: `${name} exported`,
      cause: `${formatTonnes(tonnes)} left the national reserve, sold for ${formatMoney(income)} at ${formatPrice(price)}.`,
    };
  }
  return {
    kind: 'trade',
    seriousness: 'warning',
    headline: `${name} export cut short`,
    cause: `The national reserve held only ${formatTonnes(tonnes)} of the ${formatTonnes(order.tonnes)} sold once the dilemma was answered, at ${formatPrice(price)}: ${formatMoney(income)}.`,
  };
}

/** The most of an order, in whole steps, that the treasury can pay for. */
function affordable(tonnes: number, price: number, treasury: Money): number {
  if (costOf(tonnes, price) <= treasury) return tonnes;
  const step = balance.trade.orderStepTonnes;
  let steps = Math.floor(tonnes / step);
  while (steps > 0 && costOf(steps * step, price) > treasury) steps -= 1;
  return steps * step;
}

/** What the turn report says of an import. */
function importEntry(order: TradeOrder, tonnes: number, cost: Money, price: number): ReportEntry {
  const name = GOOD_NAMES[order.good];
  if (tonnes === order.tonnes) {
    return {
      kind: 'trade',
      seriousness: 'notable',
      headline: `${name} imported`,
      cause: `${formatTonnes(tonnes)} reached the national reserve, bought for ${formatMoney(cost)} at ${formatPrice(price)}.`,
    };
  }
  return {
    kind: 'trade',
    seriousness: 'warning',
    headline: `${name} import cut short`,
    cause: `The treasury could pay for only ${formatTonnes(tonnes)} of the ${formatTonnes(order.tonnes)} ordered, at ${formatPrice(price)}: ${formatMoney(cost)}.`,
  };
}

/** A price in dollars a tonne, as the player reads it: `$240 a tonne`. */
export function formatPrice(dollarsPerTonne: number): string {
  return `$${dollarsPerTonne} a tonne`;
}

/** How far ahead a price's forecast looks, in words: "over the next 4 quarters". */
export function forecastSpan(): string {
  return `over the next ${formatQuarters(balance.trade.forecastQuarters)}`;
}
