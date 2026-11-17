import { spendingFault, taxRateFault, type Budget } from './budget';
import { contains } from './geometry';
import { MONEY_PER_MILLION, type Money } from './types';
import {
  DECORATION_KINDS,
  EVENT_TYPES,
  LABEL_SIDES,
  MAP_FRAME,
  SETTLEMENT_SIZES,
  SITE_FORMS,
  SITE_TYPE_NAMES,
  SITE_TYPES,
  SPENDING_AREAS,
  TERRAINS,
  type DecorationKind,
  type EventType,
  type LabelSide,
  type SettlementSize,
  type SiteType,
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

interface SiteDetails {
  readonly id: string;
  readonly type: SiteType;
  readonly name: string;
  /** The region the site belongs to, which is the region its effect falls on. */
  readonly regionId: string;
}

/**
 * Somewhere the country file allows something to be built. A site of one type stands in
 * one place; a site of another runs along a route, which may cross into other regions.
 */
export type Site = SiteDetails &
  (
    | { readonly form: 'place'; readonly at: Point }
    /** The line the route follows from one end to the other. */
    | { readonly form: 'route'; readonly route: readonly Point[] }
  );

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
  /** Where things can be built, in the country file's order. */
  readonly sites: readonly Site[];
  readonly start: {
    readonly treasury: Money;
    /** The budget in force when the game starts. */
    readonly budget: Budget;
    /** The national food reserve when the game starts, in tonnes. */
    readonly foodReserve: number;
  };
}

/** The name of a region, as reports and the interface write it. */
export function regionName(country: Country, regionId: string): string {
  return country.regions.find((region) => region.id === regionId)?.name ?? regionId;
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

  /** Text that must not repeat one already seen in the same list, such as an identifier. */
  unique(parent: Json, key: string, path: string, seen: Map<string, string>): string {
    const value = this.text(parent, key, path);
    if (value === '') return value;
    const earlier = seen.get(value);
    if (earlier === undefined) {
      seen.set(value, path);
    } else {
      this.fault(join(path, key), `repeats "${value}", already used by ${earlier}`);
    }
    return value;
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

/**
 * A site, which must be given the way its type is built: a position for one that stands in
 * one place, a route for one that runs along a line. A position must lie in the site's own
 * region. A route must stay inside the country and start or end in its region.
 */
function readSite(
  reader: Reader,
  site: Json,
  path: string,
  regions: readonly Region[],
  ids: Map<string, string>,
  names: Map<string, string>,
): Site {
  const regionId = reader.text(site, 'region', path);
  const named = regions.find((candidate) => candidate.id === regionId);
  if (regionId !== '' && named === undefined) {
    reader.fault(join(path, 'region'), `is "${regionId}", which is not the id of a region`);
  }
  // A shape already reported as too small to enclose anything cannot place a site.
  const encloses = (candidate: Region) => candidate.shape.length >= 3;
  const region = named !== undefined && encloses(named) ? named : undefined;
  const country = regions.every(encloses) ? regions : [];
  const details: SiteDetails = {
    id: reader.unique(site, 'id', path, ids),
    type: reader.oneOf(site, 'type', path, SITE_TYPES),
    name: reader.unique(site, 'name', path, names),
    regionId,
  };
  // A type the game does not know says nothing about how the site should be given.
  if (!SITE_TYPES.some((type) => type === site.type))
    return { ...details, form: 'place', at: [0, 0] };
  const typeName = SITE_TYPE_NAMES[details.type].toLowerCase();

  if (SITE_FORMS[details.type] === 'route') {
    if (site.at !== undefined) {
      reader.fault(
        join(path, 'at'),
        `must be left out: a ${typeName} runs along a line, given by "route"`,
      );
    }
    const before = reader.faults.length;
    const route = reader.points(site, 'route', path, 2);
    if (reader.faults.length === before) {
      route.forEach((point, index) => {
        if (country.length > 0 && !country.some((candidate) => contains(candidate.shape, point))) {
          reader.fault(
            `${join(path, 'route')}[${index}]`,
            `is (${point[0]}, ${point[1]}), outside the country`,
          );
        }
      });
      const ends = [route[0], route.at(-1)];
      if (region && !ends.some((end) => end !== undefined && contains(region.shape, end))) {
        reader.fault(join(path, 'route'), `must start or end in its region "${regionId}"`);
      }
    }
    return { ...details, form: 'route', route };
  }

  if (site.route !== undefined) {
    reader.fault(
      join(path, 'route'),
      `must be left out: a ${typeName} stands in one place, given by "at"`,
    );
  }
  const before = reader.faults.length;
  const at = reader.point(site, 'at', path);
  if (reader.faults.length === before && region && !contains(region.shape, at)) {
    reader.fault(join(path, 'at'), `is (${at[0]}, ${at[1]}), outside its region "${regionId}"`);
  }
  return { ...details, form: 'place', at };
}

/**
 * The starting budget, written with the tax rate in percent and spending in millions. It
 * is held to the same rules as a budget the player sets.
 */
function readBudget(reader: Reader, budget: Json, path: string): Budget {
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
      const before = reader.faults.length;
      const amount = reader.money(written, area, spendingPath);
      const fault = reader.faults.length === before ? spendingFault(amount) : null;
      if (fault !== null) reader.fault(join(spendingPath, area), fault);
      return [area, amount];
    }),
  ) as Record<SpendingArea, Money>;

  const before = reader.faults.length;
  const taxRatePercent = reader.number(budget, 'taxRate', path);
  const fault = reader.faults.length === before ? taxRateFault(taxRatePercent) : null;
  if (fault !== null) reader.fault(join(path, 'taxRate'), fault);

  return { taxRatePercent, spending };
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

  // Reports and breakdowns name regions, so two regions may not share a name.
  const regionIds = new Map<string, string>();
  const regionNames = new Map<string, string>();
  const regions = reader.list(file, 'regions', '', (item, path): Region => ({
    id: reader.unique(item, 'id', path, regionIds),
    name: reader.unique(item, 'name', path, regionNames),
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
      id: reader.unique(item, 'id', path, settlementIds),
      name: reader.text(item, 'name', path),
      regionId,
      at: reader.point(item, 'at', path),
      size: reader.oneOf(item, 'size', path, SETTLEMENT_SIZES),
      labelSide:
        item.labelSide === undefined ? 'right' : reader.oneOf(item, 'labelSide', path, LABEL_SIDES),
    };
  });

  // Reports and the treasury's breakdown name sites, so two sites may not share a name.
  const siteIds = new Map<string, string>();
  const siteNames = new Map<string, string>();
  const sites = reader.list(file, 'sites', '', (item, path) =>
    readSite(reader, item, path, regions, siteIds, siteNames),
  );

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
        id: reader.unique(item, 'id', path, neighbourIds),
        name: reader.text(item, 'name', path),
        shape: reader.points(item, 'shape', path, 3),
        label: reader.point(item, 'label', path),
      })),
      rivers: reader.list(map, 'rivers', 'map', (item, path): River => ({
        id: reader.unique(item, 'id', path, riverIds),
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
    sites,
    start: {
      treasury: reader.money(start, 'treasury', 'start'),
      budget: readBudget(reader, reader.object(start, 'budget', 'start'), 'start.budget'),
      foodReserve: reader.wholeNumber(start, 'foodReserve', 'start', 0),
    },
  };

  if (reader.faults.length > 0) throw new CountryFileError(reader.faults);
  return country;
}
