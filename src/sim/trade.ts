import { clamp, sum } from './arithmetic';
import { balance } from './balance';
import { quarterNumber } from './calendar';
import type { ReportEntry } from './report';
import { drawAt } from './rng';
import { formatMoney, formatQuarters, formatTonnes } from './text';
import type { Contribution, Figure, GameDate, Money, Range } from './types';
import { GOOD_NAMES, GOODS, TRADE_DIRECTIONS, type Good, type TradeDirection } from './vocabulary';

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

/** A key that keeps the draws for prices apart from every other draw keyed on the seed. */
const PRICE_DRAWS = 0x70726963;

/**
 * How far world markets move each good's price as the game moves into a quarter, as a share
 * of the good's full swing in thousandths, from −1000 to 1000, in the goods' order. Like the
 * dilemma rolls they depend on the seed and the quarter alone, so the weather and events a
 * seed brings do not shift with them.
 */
export function rollPrices(seed: number, date: GameDate): number[] {
  return GOODS.map((_good, index) => {
    const roll = drawAt(seed, PRICE_DRAWS, quarterNumber(date), index);
    return Math.floor(roll * 2001) - 1000;
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

/** A good's price after a quarter, from its price before and what markets did to it. */
function movePrice(good: Good, price: number, shock: number): PriceMove {
  const rules = balance.trade.goods[good];
  const usual = rules.usualDollarsPerTonne;
  const revert = Math.round(((usual - price) * rules.revertPermillePerQuarter) / 1000);
  const swing = Math.round((usual * rules.swingPermillePerQuarter * shock) / 1_000_000);
  const next = clamp(
    price + revert + swing,
    rules.lowestDollarsPerTonne,
    rules.highestDollarsPerTonne,
  );
  return { revert, markets: next - price - revert, price: next };
}

/** The world prices once a quarter is over, with the new price of each good added to its path. */
export function movePrices(prices: WorldPrices, shocks: readonly number[]): WorldPrices {
  return byGood((good, index) => [
    ...prices[good],
    movePrice(good, priceOf(prices, good), shocks[index] ?? 0).price,
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
}

/** Where a good's world price stands, what moved it and where it could go. */
export function priceStatus(game: { readonly worldPrices: WorldPrices }, good: Good): PriceStatus {
  const path = game.worldPrices[good];
  const price = priceOf(game.worldPrices, good);
  const before = path.at(-2);
  return {
    good,
    name: GOOD_NAMES[good],
    price,
    usual: balance.trade.goods[good].usualDollarsPerTonne,
    path,
    figure: before === undefined ? null : priceFigure(good, before, price),
    forecast: forecastPrice(good, price),
    forecastQuarters: balance.trade.forecastQuarters,
  };
}

/**
 * What moved a price from one quarter to the next: the pull back towards the usual price,
 * and world markets, which take in whatever the limits held back.
 */
function priceFigure(good: Good, before: number, after: number): Figure {
  const { revert } = movePrice(good, before, 0);
  const pulled = clamp(
    before + revert,
    balance.trade.goods[good].lowestDollarsPerTonne,
    balance.trade.goods[good].highestDollarsPerTonne,
  );
  return {
    value: after,
    change: after - before,
    contributions: [
      { label: 'Pull towards the usual price', amount: pulled - before },
      { label: 'World markets', amount: after - pulled },
    ],
  };
}

/** The lowest and highest a price could reach within the forecast. */
function forecastPrice(good: Good, price: number): Range {
  let low = price;
  let high = price;
  let min = price;
  let max = price;
  for (let quarter = 0; quarter < balance.trade.forecastQuarters; quarter += 1) {
    low = movePrice(good, low, -1000).price;
    high = movePrice(good, high, 1000).price;
    min = Math.min(min, low);
    max = Math.max(max, high);
  }
  return { min, max };
}

/** What a number of tonnes costs at a price in dollars a tonne, to the nearest $100,000. */
export function costOf(tonnes: number, dollarsPerTonne: number): Money {
  return Math.round((tonnes * dollarsPerTonne) / 100_000);
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

interface Trader {
  readonly worldPrices: WorldPrices;
  readonly treasury: Money;
}

/** What kind of order an order is: the good and which way it goes. Each kind once a quarter. */
function kindOf(order: Pick<TradeOrder, 'good' | 'direction'>): string {
  return `${order.good} ${order.direction}`;
}

/** The import of a good among the orders planned, if there is one. */
export function plannedImport(planned: readonly TradeOrder[], good: Good): TradeOrder | undefined {
  const kind = kindOf({ good, direction: 'import' });
  return planned.find((order) => kindOf(order) === kind);
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
    unavailable: tradeFault(game, [
      ...planned.filter((other) => kindOf(other) !== kindOf(order)),
      order,
    ]),
  };
}

/** What is wrong with the orders to trade this quarter, or null when the game allows them. */
export function tradeFault(game: Trader, orders: readonly TradeOrder[]): string | null {
  const step = balance.trade.orderStepTonnes;
  for (const order of orders) {
    if (!(GOODS as readonly string[]).includes(order.good)) {
      return `"${order.good}" is not a good the world trades in.`;
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
  const cost = sum(
    orders.map((order) => costOf(order.tonnes, priceOf(game.worldPrices, order.good))),
  );
  return cost > game.treasury
    ? `The treasury holds only ${formatMoney(game.treasury)}, and the grain ordered would cost ${formatMoney(cost)}.`
    : null;
}

/** What a quarter's trade did, as it ended. */
export interface TradeOutcome {
  /** The treasury once the goods bought have been paid for. */
  readonly treasury: Money;
  /** What was paid for them. */
  readonly paid: Money;
  /** The grain that reached the national reserve, in tonnes. */
  readonly imported: number;
  /** What trade did to the treasury and to the reserve, for their breakdowns. */
  readonly money: readonly Contribution[];
  readonly food: readonly Contribution[];
  readonly entries: readonly ReportEntry[];
}

/**
 * The quarter's trade, as it ends: each import is paid for out of the treasury at this
 * quarter's world price and its grain reaches the national reserve. An import the treasury
 * can no longer pay for in full by then is cut to the whole steps it can.
 */
export function resolveTrade(
  game: { readonly worldPrices: WorldPrices },
  orders: readonly TradeOrder[],
  treasury: Money,
): TradeOutcome {
  let left = treasury;
  let imported = 0;
  const money: Contribution[] = [];
  const food: Contribution[] = [];
  const entries: ReportEntry[] = [];
  for (const order of orders) {
    const price = priceOf(game.worldPrices, order.good);
    const tonnes = affordable(order.tonnes, price, left);
    const cost = costOf(tonnes, price);
    left -= cost;
    imported += tonnes;
    const label = `${GOOD_NAMES[order.good]} imported`;
    if (tonnes > 0) {
      money.push({ label, amount: -cost });
      food.push({ label, amount: tonnes });
    }
    entries.push(importEntry(order, tonnes, cost, price));
  }
  return { treasury: left, paid: treasury - left, imported, money, food, entries };
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
      cause: `${formatTonnes(tonnes)} reached the national reserve, bought for ${formatMoney(cost)} at $${price} a tonne.`,
    };
  }
  return {
    kind: 'trade',
    seriousness: 'warning',
    headline: `${name} import cut short`,
    cause: `The treasury could pay for only ${formatTonnes(tonnes)} of the ${formatTonnes(order.tonnes)} ordered, at $${price} a tonne: ${formatMoney(cost)}.`,
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
