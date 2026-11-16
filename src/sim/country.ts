import { balance } from './balance';
import type { Budget } from './budget';
import { MONEY_PER_MILLION, type Money } from './types';
import {
  DECORATION_KINDS,
  EVENT_TYPES,
  LABEL_SIDES,
  MAP_FRAME,
  SETTLEMENT_SIZES,
  SPENDING_AREAS,
  TERRAINS,
  type DecorationKind,
  type EventType,
  type LabelSide,
  type SettlementSize,
  type SpendingArea,
  type Terrain,
} from './vocabulary';

/** The version of the country file format this game reads. */
export const COUNTRY_FORMAT_VERSION = 1;

/** A position in the map frame: x from the left edge, y from the top edge. */
export type Point = readonly [x: number, y: number];

export interface Region {
  readonly id: string;
  readonly name: string;
  readonly terrain: Terrain;
  /** The outline of the region, as the corners of a closed shape. */
  readonly shape: readonly Point[];
  /** Where the region's name is written. */
  readonly label: Point;
  /** How many people live in the region when the game starts. */
  readonly population: number;
  /** What the region produces in a quarter when the game starts, before tax. */
  readonly output: Money;
  /** The region's farmland, in units of 1,000 hectares. */
  readonly farmland: number;
  /** The chance, from 0 to 1, that each kind of event strikes the region in a year. */
  readonly eventLikelihood: Readonly<Record<EventType, number>>;
}

export interface Settlement {
  readonly id: string;
  readonly name: string;
  readonly regionId: string;
  readonly at: Point;
  readonly size: SettlementSize;
  /** Which side of the settlement its name is written on. */
  readonly labelSide: LabelSide;
}

export interface Neighbour {
  readonly id: string;
  readonly name: string;
  readonly shape: readonly Point[];
  readonly label: Point;
}

/** Sea is whatever the regions and neighbours leave uncovered. A sea entry only names it. */
export interface Sea {
  readonly name: string;
  readonly label: Point;
}

export interface River {
  readonly id: string;
  readonly name: string;
  /** The line the river follows, from source to mouth. */
  readonly course: readonly Point[];
}

export interface Decoration {
  readonly kind: DecorationKind;
  readonly at: Point;
}

/** A country, checked and ready to start a game from. The engine holds no country of its own. */
export interface Country {
  readonly formatVersion: number;
  readonly id: string;
  readonly name: string;
  readonly map: {
    readonly seas: readonly Sea[];
    readonly neighbours: readonly Neighbour[];
    readonly rivers: readonly River[];
    readonly decorations: readonly Decoration[];
  };
  readonly regions: readonly Region[];
  readonly settlements: readonly Settlement[];
  readonly start: {
    readonly treasury: Money;
    /** The budget in force when the game starts. */
    readonly budget: Budget;
    /** The national food reserve when the game starts, in tonnes. */
    readonly foodReserve: number;
  };
}

/** Thrown when a country file is rejected. Each fault names where it is and what is wrong. */
export class CountryFileError extends Error {
  readonly faults: readonly string[];

  constructor(faults: readonly string[]) {
    super(`The country file cannot be used. ${faults.join(' ')}`);
    this.name = 'CountryFileError';
    this.faults = faults;
  }
}

type Json = Readonly<Record<string, unknown>>;

/**
 * Reads values out of a country file, noting every fault it meets and carrying on with a
 * harmless stand-in, so the author is told about all of them at once.
 */
class Reader {
  readonly faults: string[] = [];

  fault(path: string, problem: string): void {
    this.faults.push(`${path} ${problem}.`);
  }

  object(parent: Json, key: string, path: string): Json {
    const value = parent[key];
    if (isRecord(value)) return value;
    this.fault(join(path, key), wrongKind(value, 'an object'));
    return {};
  }

  text(parent: Json, key: string, path: string): string {
    const value = parent[key];
    if (typeof value === 'string' && value.trim() !== '') return value;
    this.fault(join(path, key), wrongKind(value, 'text'));
    return '';
  }

  number(parent: Json, key: string, path: string): number {
    const value = parent[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    this.fault(join(path, key), wrongKind(value, 'a number'));
    return 0;
  }

  /** An amount written in millions of dollars, to at most one decimal place. */
  money(parent: Json, key: string, path: string): Money {
    const millions = this.number(parent, key, path);
    const units = Math.round(millions * MONEY_PER_MILLION);
    if (millions < 0) {
      this.fault(join(path, key), `must not be negative, but is ${millions}`);
      return 0;
    }
    if (Math.abs(millions * MONEY_PER_MILLION - units) > 1e-6) {
      this.fault(join(path, key), `must be in millions to one decimal place, but is ${millions}`);
      return 0;
    }
    return units;
  }

  /** A whole number no smaller than `min` and, when given, no larger than `max`. */
  wholeNumber(parent: Json, key: string, path: string, min: number, max?: number): number {
    const value = this.number(parent, key, path);
    if (typeof parent[key] !== 'number' || !Number.isFinite(parent[key])) return min;
    if (Number.isInteger(value) && value >= min && (max === undefined || value <= max)) {
      return value;
    }
    const allowed = max === undefined ? `of at least ${min}` : `from ${min} to ${max}`;
    this.fault(join(path, key), `is ${value}, but must be a whole number ${allowed}`);
    return min;
  }

  /** One of the engine's own words, such as a terrain. */
  oneOf<Word extends string>(
    parent: Json,
    key: string,
    path: string,
    words: readonly [Word, ...Word[]],
  ): Word {
    const value = parent[key];
    const word = words.find((candidate) => candidate === value);
    if (word !== undefined) return word;
    this.fault(
      join(path, key),
      typeof value === 'string'
        ? `is "${value}", which is not one of: ${words.join(', ')}`
        : wrongKind(value, 'text'),
    );
    return words[0];
  }

  /** An identifier, which must not repeat one already seen in the same list. */
  id(parent: Json, key: string, path: string, seen: Map<string, string>): string {
    const id = this.text(parent, key, path);
    if (id === '') return id;
    const earlier = seen.get(id);
    if (earlier === undefined) {
      seen.set(id, path);
    } else {
      this.fault(join(path, key), `repeats "${id}", already used by ${earlier}`);
    }
    return id;
  }

  /** A list of objects, each read by `read` with its own path, such as `regions[2]`. */
  list<Item>(
    parent: Json,
    key: string,
    path: string,
    read: (item: Json, itemPath: string) => Item,
  ): Item[] {
    const value = parent[key];
    const listPath = join(path, key);
    if (!Array.isArray(value)) {
      this.fault(listPath, wrongKind(value, 'a list'));
      return [];
    }
    return value.map((item: unknown, index) => {
      const itemPath = `${listPath}[${index}]`;
      if (isRecord(item)) return read(item, itemPath);
      this.fault(itemPath, wrongKind(item, 'an object'));
      return read({}, itemPath);
    });
  }

  /** A position, which must lie inside the map frame. */
  point(parent: Json, key: string, path: string): Point {
    const value = parent[key];
    if (value === undefined) {
      this.fault(join(path, key), 'is missing');
      return [0, 0];
    }
    return this.pointAt(value, join(path, key));
  }

  /** A line or outline, which needs at least `fewest` positions. */
  points(parent: Json, key: string, path: string, fewest: number): Point[] {
    const value = parent[key];
    const listPath = join(path, key);
    if (!Array.isArray(value)) {
      this.fault(listPath, wrongKind(value, 'a list of points'));
      return [];
    }
    if (value.length < fewest) {
      this.fault(listPath, `needs at least ${fewest} points, but has ${value.length}`);
    }
    return value.map((item: unknown, index) => this.pointAt(item, `${listPath}[${index}]`));
  }

  private pointAt(value: unknown, path: string): Point {
    if (!Array.isArray(value) || value.length !== 2) {
      this.fault(path, 'must be a pair of numbers [x, y]');
      return [0, 0];
    }
    const pair: readonly unknown[] = value;
    const [x, y] = pair;
    if (typeof x !== 'number' || typeof y !== 'number' || !isFinite(x) || !isFinite(y)) {
      this.fault(path, 'must be a pair of numbers [x, y]');
      return [0, 0];
    }
    if (x < 0 || x > MAP_FRAME.width || y < 0 || y > MAP_FRAME.height) {
      this.fault(
        path,
        `is (${x}, ${y}), outside the ${MAP_FRAME.width} by ${MAP_FRAME.height} map frame`,
      );
    }
    return [x, y];
  }
}

function isRecord(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function join(path: string, key: string): string {
  return path === '' ? key : `${path}.${key}`;
}

function wrongKind(value: unknown, wanted: string): string {
  return value === undefined ? 'is missing' : `must be ${wanted}, but is ${describe(value)}`;
}

function describe(value: unknown): string {
  if (value === null) return 'empty';
  if (Array.isArray(value)) return 'a list';
  if (typeof value === 'string') return value.trim() === '' ? 'blank' : 'text';
  if (typeof value === 'number') return Number.isFinite(value) ? 'a number' : 'not a finite number';
  if (typeof value === 'boolean') return 'true or false';
  return typeof value === 'object' ? 'an object' : 'missing';
}

/** How likely each event is in a region. An event the file does not mention never strikes. */
function readEventLikelihood(
  reader: Reader,
  region: Json,
  path: string,
): Record<EventType, number> {
  const likelihoodPath = join(path, 'eventLikelihood');
  const written =
    region.eventLikelihood === undefined ? {} : reader.object(region, 'eventLikelihood', path);
  for (const key of Object.keys(written)) {
    if (!EVENT_TYPES.some((type) => type === key)) {
      reader.fault(
        join(likelihoodPath, key),
        `is not an event this game has (${EVENT_TYPES.join(', ')})`,
      );
    }
  }
  return Object.fromEntries(
    EVENT_TYPES.map((type) => {
      if (written[type] === undefined) return [type, 0];
      const chance = reader.number(written, type, likelihoodPath);
      if (chance < 0 || chance > 1) {
        reader.fault(join(likelihoodPath, type), `is ${chance}, but must be a chance from 0 to 1`);
        return [type, 0];
      }
      return [type, chance];
    }),
  ) as Record<EventType, number>;
}

/** The starting budget, written with the tax rate in percent and spending in whole millions. */
function readBudget(reader: Reader, budget: Json, path: string): Budget {
  const { taxRatePercent, spending: range } = balance.budget;
  const spendingPath = join(path, 'spending');
  const written = reader.object(budget, 'spending', path);
  for (const key of Object.keys(written)) {
    if (!SPENDING_AREAS.some((area) => area === key)) {
      reader.fault(
        join(spendingPath, key),
        `is not a spending area this game has (${SPENDING_AREAS.join(', ')})`,
      );
    }
  }
  const spending = Object.fromEntries(
    SPENDING_AREAS.map((area) => {
      const millions = reader.wholeNumber(
        written,
        area,
        spendingPath,
        range.min / MONEY_PER_MILLION,
        range.max / MONEY_PER_MILLION,
      );
      return [area, millions * MONEY_PER_MILLION];
    }),
  ) as Record<SpendingArea, Money>;

  return {
    taxRatePercent: reader.wholeNumber(
      budget,
      'taxRate',
      path,
      taxRatePercent.min,
      taxRatePercent.max,
    ),
    spending,
  };
}

/**
 * Checks a country file and returns the country it describes.
 * @throws CountryFileError naming every fault found.
 */
export function loadCountry(file: unknown): Country {
  if (!isRecord(file)) {
    throw new CountryFileError([`The file must be an object, but is ${describe(file)}.`]);
  }
  const reader = new Reader();

  // A file written for another version cannot be judged by this version's rules.
  const { formatVersion } = file;
  if (typeof formatVersion !== 'number') {
    throw new CountryFileError([`formatVersion ${wrongKind(formatVersion, 'a number')}.`]);
  }
  if (formatVersion !== COUNTRY_FORMAT_VERSION) {
    throw new CountryFileError([
      `formatVersion is ${formatVersion}, but this game reads version ${COUNTRY_FORMAT_VERSION}.`,
    ]);
  }

  const regionIds = new Map<string, string>();
  const regions = reader.list(file, 'regions', '', (item, path): Region => ({
    id: reader.id(item, 'id', path, regionIds),
    name: reader.text(item, 'name', path),
    terrain: reader.oneOf(item, 'terrain', path, TERRAINS),
    shape: reader.points(item, 'shape', path, 3),
    label: reader.point(item, 'label', path),
    population: reader.wholeNumber(item, 'population', path, 1),
    output: reader.money(item, 'output', path),
    farmland: reader.wholeNumber(item, 'farmland', path, 0),
    eventLikelihood: readEventLikelihood(reader, item, path),
  }));
  if (Array.isArray(file.regions) && regions.length === 0) {
    reader.fault('regions', 'must list at least one region');
  }

  const settlementIds = new Map<string, string>();
  const settlements = reader.list(file, 'settlements', '', (item, path): Settlement => {
    const regionId = reader.text(item, 'region', path);
    if (regionId !== '' && !regionIds.has(regionId)) {
      reader.fault(join(path, 'region'), `is "${regionId}", which is not the id of a region`);
    }
    return {
      id: reader.id(item, 'id', path, settlementIds),
      name: reader.text(item, 'name', path),
      regionId,
      at: reader.point(item, 'at', path),
      size: reader.oneOf(item, 'size', path, SETTLEMENT_SIZES),
      labelSide:
        item.labelSide === undefined ? 'right' : reader.oneOf(item, 'labelSide', path, LABEL_SIDES),
    };
  });

  const map = reader.object(file, 'map', '');
  const neighbourIds = new Map<string, string>();
  const riverIds = new Map<string, string>();
  const start = reader.object(file, 'start', '');

  const country: Country = {
    formatVersion,
    id: reader.text(file, 'id', ''),
    name: reader.text(file, 'name', ''),
    map: {
      seas: reader.list(map, 'seas', 'map', (item, path): Sea => ({
        name: reader.text(item, 'name', path),
        label: reader.point(item, 'label', path),
      })),
      neighbours: reader.list(map, 'neighbours', 'map', (item, path): Neighbour => ({
        id: reader.id(item, 'id', path, neighbourIds),
        name: reader.text(item, 'name', path),
        shape: reader.points(item, 'shape', path, 3),
        label: reader.point(item, 'label', path),
      })),
      rivers: reader.list(map, 'rivers', 'map', (item, path): River => ({
        id: reader.id(item, 'id', path, riverIds),
        name: reader.text(item, 'name', path),
        course: reader.points(item, 'course', path, 2),
      })),
      decorations: reader.list(map, 'decorations', 'map', (item, path): Decoration => ({
        kind: reader.oneOf(item, 'kind', path, DECORATION_KINDS),
        at: reader.point(item, 'at', path),
      })),
    },
    regions,
    settlements,
    start: {
      treasury: reader.money(start, 'treasury', 'start'),
      budget: readBudget(reader, reader.object(start, 'budget', 'start'), 'start.budget'),
      foodReserve: reader.wholeNumber(start, 'foodReserve', 'start', 0),
    },
  };

  if (reader.faults.length > 0) throw new CountryFileError(reader.faults);
  return country;
}
