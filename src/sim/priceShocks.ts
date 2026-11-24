import { balance } from './balance';
import { dateOfQuarter, quarterNumber } from './calendar';
import type { Country } from './country';
import type { ReportEntry } from './report';
import { drawAt } from './rng';
import { capitalised, formatDate, formatQuarters } from './text';
import type { GameDate } from './types';
import { GOOD_NAMES, GOODS, PRICE_SHOCK_TYPES, type Good, type PriceShockType } from './vocabulary';

/*
 * World price shocks: events abroad that push one good's world price up or down for a set
 * time. Unlike droughts and floods they strike no region but the world's markets, so they are
 * not among the events each region rolls for. Like the world prices themselves they are drawn
 * from the seed and the quarter alone, and leave the generator, and so the weather and events
 * a seed brings, as they were.
 */

/** What a world price shock is, as data. How likely it is is the country file's business. */
export interface PriceShockDefinition {
  readonly name: string;
  /** What it is called in the middle of a sentence: "an ore glut". */
  readonly called: string;
  /** The good whose world price it moves. */
  readonly good: Good;
  /**
   * How far it pushes the price each quarter it is in force, on top of what markets do, in
   * thousandths of the good's usual price: up when above nothing, down when below.
   */
  readonly pushPermillePerQuarter: number;
  /** How many quarters before it first moves the price it is announced. */
  readonly noticeQuarters: number;
  /** How many quarters it is in force: the number of times it moves the price. */
  readonly lastsQuarters: number;
  /** What the turn report says of it when it is announced and when it ends. */
  readonly announcement: { readonly coming: string; readonly ends: string };
}

/** A shock announced, which may already be in force. */
export interface PriceShock {
  readonly type: PriceShockType;
  /** The quarter it was announced as beginning: the first the player was told of it in. */
  readonly announced: GameDate;
  /** The first quarter whose price it moved: the price as that quarter begins is pushed. */
  readonly begins: GameDate;
}

/** What a game must say for its shocks to be read. */
export interface ShockWatch {
  readonly country: Pick<Country, 'priceShockLikelihood'>;
  /** The quarter now being decided. */
  readonly date: GameDate;
  readonly priceShocks: readonly PriceShock[];
}

const definitions: Readonly<Record<PriceShockType, PriceShockDefinition>> = balance.priceShocks;

/** A key that keeps the draws for shocks apart from every other draw keyed on the seed. */
const SHOCK_DRAWS = 0x73686f63;

/**
 * The shocks the country file's chances announce as the game moves into a quarter, in the
 * order of `PRICE_SHOCK_TYPES`. Each has its own draw from the seed and the quarter alone.
 * One of a kind already announced or in force is not announced again (`turnShocks`).
 */
export function rollPriceShocks(
  country: Pick<Country, 'priceShockLikelihood'>,
  seed: number,
  date: GameDate,
): PriceShockType[] {
  return PRICE_SHOCK_TYPES.filter(
    (type, index) =>
      drawAt(seed, SHOCK_DRAWS, quarterNumber(date), index) < country.priceShockLikelihood[type],
  );
}

/** The name of a kind of shock, as the player reads it: "Ore glut". */
export function shockName(type: PriceShockType): string {
  return definitions[type].name;
}

/** The good a kind of shock moves. */
export function shockGood(type: PriceShockType): Good {
  return definitions[type].good;
}

/** How far a kind of shock pushes its good's price each quarter, in dollars a tonne. */
export function pushOf(type: PriceShockType): number {
  const definition = definitions[type];
  const usual = balance.trade.goods[definition.good].usualDollarsPerTonne;
  return Math.round((usual * definition.pushPermillePerQuarter) / 1000);
}

/** The quarter, counted from the start of the game, a shock first no longer moves the price in. */
function endOf(shock: PriceShock): number {
  return quarterNumber(shock.begins) + definitions[shock.type].lastsQuarters;
}

/** Whether a shock pushes the price as the game moves into the quarter numbered. */
function inForceInto(shock: PriceShock, quarter: number): boolean {
  return quarterNumber(shock.begins) <= quarter && quarter < endOf(shock);
}

/**
 * How far the shocks push each good's price as the game moves into a quarter, in dollars a
 * tonne, in the goods' order.
 */
export function pushesInto(shocks: readonly PriceShock[], date: GameDate): number[] {
  const quarter = quarterNumber(date);
  return GOODS.map((good) =>
    shocks
      .filter((shock) => shockGood(shock.type) === good && inForceInto(shock, quarter))
      .reduce((total, shock) => total + pushOf(shock.type), 0),
  );
}

/** The shocks that pushed a good's price as the game moved into the quarter now being decided. */
export function shocksThatMoved(watch: ShockWatch, good: Good): PriceShock[] {
  const quarter = quarterNumber(watch.date);
  return watch.priceShocks.filter(
    (shock) => shockGood(shock.type) === good && inForceInto(shock, quarter),
  );
}

/**
 * The shocks as the game moves into a quarter: those whose time is up end, and those the
 * draws announce begin their notice, unless one of their kind is still announced or in force.
 * The report says what was announced, what first moved a price and what ended.
 */
export function turnShocks(
  shocks: readonly PriceShock[],
  announced: readonly PriceShockType[],
  date: GameDate,
): { readonly shocks: readonly PriceShock[]; readonly entries: readonly ReportEntry[] } {
  const quarter = quarterNumber(date);
  const ended = shocks.filter((shock) => endOf(shock) === quarter);
  const remaining = shocks.filter((shock) => endOf(shock) > quarter);
  const begun = remaining.filter((shock) => quarterNumber(shock.begins) === quarter);
  const fresh = announced
    .filter((type) => !remaining.some((shock) => shock.type === type))
    .map((type): PriceShock => ({
      type,
      announced: date,
      begins: dateOfQuarter(quarter + definitions[type].noticeQuarters),
    }));
  return {
    shocks: [...remaining, ...fresh],
    entries: [...fresh.map(comingEntry), ...begun.map(begunEntry), ...ended.map(endedEntry)],
  };
}

/** Which way a push moves a price, in a word. */
function way(push: number): 'up' | 'down' {
  return push > 0 ? 'up' : 'down';
}

/** The world price of a good, as the player names it: "the world grain price". */
function priceName(good: Good): string {
  return `the world ${GOOD_NAMES[good].toLowerCase()} price`;
}

/** What a shock does, in a line: "pushed up by $36 a tonne each quarter for 3 quarters". */
function pushWords(type: PriceShockType): string {
  const push = pushOf(type);
  return `pushed ${way(push)} by $${Math.abs(push)} a tonne each quarter for ${formatQuarters(definitions[type].lastsQuarters)}`;
}

/** What a shock will do, in a line, from when it begins. */
export function shockForecast(shock: PriceShock): string {
  const good = shockGood(shock.type);
  return `From ${formatDate(shock.begins)} ${priceName(good)} will be ${pushWords(shock.type)}.`;
}

function comingEntry(shock: PriceShock): ReportEntry {
  const definition = definitions[shock.type];
  return {
    kind: 'priceShock',
    seriousness: 'warning',
    headline: `${definition.name} ahead`,
    cause: `${definition.announcement.coming} ${shockForecast(shock)}`,
  };
}

function begunEntry(shock: PriceShock): ReportEntry {
  const definition = definitions[shock.type];
  const push = pushOf(shock.type);
  const more = definition.lastsQuarters - 1;
  return {
    kind: 'priceShock',
    seriousness: 'warning',
    headline: `${definition.name} pushes the world ${GOOD_NAMES[definition.good].toLowerCase()} price ${way(push)}`,
    cause: `${capitalised(priceName(definition.good))} was pushed ${way(push)} by $${Math.abs(push)} a tonne as the quarter ended${more > 0 ? `, and will be for ${formatQuarters(more, 'more')}` : ''}.`,
  };
}

function endedEntry(shock: PriceShock): ReportEntry {
  const definition = definitions[shock.type];
  return {
    kind: 'priceShock',
    seriousness: 'notable',
    headline: `${definition.name} has ended`,
    cause: `${definition.announcement.ends} ${capitalised(priceName(definition.good))} is no longer pushed ${way(pushOf(shock.type))}, and is pulled back towards its usual $${balance.trade.goods[definition.good].usualDollarsPerTonne} a tonne.`,
  };
}

/**
 * The earliest quarter, counted from the start of the game, a shock of a kind could next be
 * announced in: the next, or once the one of its kind announced or in force has ended.
 */
function nextAnnouncement(watch: ShockWatch, type: PriceShockType): number {
  const own = watch.priceShocks.find((shock) => shock.type === type);
  return own === undefined ? quarterNumber(watch.date) + 1 : endOf(own);
}

/**
 * What the shocks announced push a good's price by as the game moves into each of the
 * quarters ahead, the next first, in dollars a tonne. A shock not yet announced is not
 * counted: it cannot move the price until its notice has run, and the risks ahead list it
 * while it could come within their horizon (`shocksThatMayCome`).
 */
export function pushesAhead(watch: ShockWatch, good: Good, quarters: number): number[] {
  const now = quarterNumber(watch.date);
  return Array.from({ length: quarters }, (_, index) =>
    watch.priceShocks
      .filter((shock) => shockGood(shock.type) === good && inForceInto(shock, now + index + 1))
      .reduce((total, shock) => total + pushOf(shock.type), 0),
  );
}

/** A shock not yet announced that could be, and move its price within some quarters ahead. */
export interface PossibleShock {
  readonly type: PriceShockType;
  /** The chance, from 0 to 1, that it is announced in time to. */
  readonly chance: number;
  /** How many quarters are played before it first moves the price, at the soonest: 0 is the one being decided. */
  readonly soonest: number;
  /** How many quarters of notice it gives. */
  readonly noticeQuarters: number;
  /** How many of the quarters played could end with it announced in time. */
  readonly drawsLeft: number;
}

/**
 * The shocks not yet announced that could be, and first move their price within `quarters`
 * of the one being decided, counting it. Each is announced as one of those quarters ends, if
 * its draw falls under its chance, so the chance it comes in time is that of any of those
 * draws doing so.
 */
export function shocksThatMayCome(watch: ShockWatch, quarters: number): PossibleShock[] {
  const now = quarterNumber(watch.date);
  return PRICE_SHOCK_TYPES.flatMap((type) => {
    const chance = watch.country.priceShockLikelihood[type];
    const { noticeQuarters } = definitions[type];
    // Played quarters run from 0, the one being decided; one announced as the game moves into
    // the quarter after the a-th first moves the price as the game moves into a + notice.
    const first = nextAnnouncement(watch, type) - now;
    const last = quarters - 1 - noticeQuarters;
    if (chance <= 0 || first > last) return [];
    const draws = last - first + 1;
    return [
      {
        type,
        chance: 1 - (1 - chance) ** draws,
        soonest: first + noticeQuarters,
        noticeQuarters,
        drawsLeft: draws,
      },
    ];
  });
}

/** A shock as a risk ahead names it, in the middle of a sentence: "an ore glut". */
export function shockCalled(type: PriceShockType): string {
  return definitions[type].called;
}

/** What a kind of shock would do once announced, in a line: "the world ore price would be pushed down by $20 a tonne each quarter for 3 quarters". */
export function shockWouldDo(type: PriceShockType): string {
  return `${priceName(shockGood(type))} would be ${pushWords(type)}`;
}

/** A shock announced or in force, as the player sees it beside its good's price. */
export interface ShockStatus {
  readonly type: PriceShockType;
  readonly name: string;
  /** Whether it already moves the price, or is still to come. */
  readonly inForce: boolean;
  /**
   * How many quarters after this one the price is next pushed: as the next begins is 1. One
   * that has pushed the price for the last time has none to come, and is null.
   */
  readonly nextPushIn: number | null;
  /** What it does and when, in a line. */
  readonly description: string;
}

/** The shocks announced or in force on a good's price. */
export function shockStatuses(watch: ShockWatch, good: Good): ShockStatus[] {
  const now = quarterNumber(watch.date);
  return watch.priceShocks
    .filter((shock) => shockGood(shock.type) === good)
    .map((shock) => {
      const inForce = quarterNumber(shock.begins) <= now;
      // The pushes still to come, as the game moves into the quarters after this one.
      const more = endOf(shock) - now - 1;
      const push = pushOf(shock.type);
      const pushed = `${capitalised(priceName(good))} was pushed ${way(push)} by $${Math.abs(push)} a tonne as this quarter began`;
      return {
        type: shock.type,
        name: shockName(shock.type),
        inForce,
        nextPushIn: !inForce ? quarterNumber(shock.begins) - now : more > 0 ? 1 : null,
        description: !inForce
          ? shockForecast(shock)
          : more > 0
            ? `${pushed}, and will be for ${formatQuarters(more, 'more')}.`
            : `${pushed}, for the last time.`,
      };
    });
}
