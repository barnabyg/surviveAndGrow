import { sum } from './arithmetic';
import { balance } from './balance';
import { spendingFault, taxOn, taxRateFault, type Budget } from './budget';
import { levelRepaymentOf, type StartingLoan } from './debt';
import { contains } from './geometry';
import { formatMoney, formatPercent } from './text';
import { MONEY_PER_MILLION, type Money } from './types';
import { upkeepForEvery } from './upkeep';
import {
  DECORATION_KINDS,
  DILEMMA_TYPES,
  EVENT_TYPES,
  LABEL_SIDES,
  MAP_FRAME,
  SETTLEMENT_SIZES,
  SITE_CHAIN_ROLES,
  SITE_FORMS,
  SITE_POWER_ROLES,
  SITE_TYPE_NAMES,
  SITE_TYPES,
  SPENDING_AREAS,
  TERRAINS,
  type DecorationKind,
  type DilemmaType,
  type EventType,
  type LabelSide,
  type SettlementSize,
  type SiteType,
  type SpendingArea,
  type Terrain,
} from './vocabulary';

/**
 * The newest version of the country file format this game reads. It still reads every
 * earlier version: format 2 added the sites a site depends on and a region's own population
 * growth, which format 1 cannot say, and format 3 added sites that are alternatives to each
 * other, which format 2 cannot, and format 4 added debt the game starts with, which format 3
 * cannot.
 */
export const COUNTRY_FORMAT_VERSION = 4;

/** The oldest country file format this game still reads. */
const OLDEST_COUNTRY_FORMAT_VERSION = 1;

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
  /**
   * How fast the region's people grow in number, in ten-thousandths a quarter: the country
   * file's own rate for the region, or the game's.
   */
  readonly growthPerTenThousandPerQuarter: number;
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
  /**
   * The ids of the other sites this one depends on, as the country file lists them. A site
   * with alternatives stands for whichever of them is chosen.
   */
  readonly dependsOn: readonly string[];
  /**
   * The ids of the sites this one is an alternative to, in the country file's order. Building
   * on either rules the other out. The file may say so on either side or on both.
   */
  readonly alternatives: readonly string[];
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
  /**
   * The chance, from 0 to 1, that each dilemma arises as a quarter begins, when the
   * conditions it needs hold. One the file does not mention never arises.
   */
  readonly dilemmaLikelihood: Readonly<Record<DilemmaType, number>>;
  readonly start: {
    readonly treasury: Money;
    /** The budget in force when the game starts. */
    readonly budget: Budget;
    /** The national food reserve when the game starts, in tonnes. */
    readonly foodReserve: number;
    /** The loans owed when the game starts, in the file's order: none unless it says. */
    readonly loans: readonly StartingLoan[];
  };
  /**
   * The country file this country was read from, as its author wrote it. A saved game
   * carries it, and reading it again gives this same country.
   */
  readonly source: unknown;
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

/**
 * A chance, from 0 to 1, for each of the engine's words of one kind, such as each event. A
 * word the file does not mention gets no chance, and a word the engine does not have is a fault.
 */
function readChances<Word extends string>(
  reader: Reader,
  parent: Json,
  key: string,
  path: string,
  words: readonly Word[],
  kind: string,
): Record<Word, number> {
  const chancesPath = join(path, key);
  const written = parent[key] === undefined ? {} : reader.object(parent, key, path);
  for (const name of Object.keys(written)) {
    if (!words.some((word) => word === name)) {
      reader.fault(join(chancesPath, name), `is not ${kind} this game has (${words.join(', ')})`);
    }
  }
  return Object.fromEntries(
    words.map((word) => {
      if (written[word] === undefined) return [word, 0];
      const chance = reader.number(written, word, chancesPath);
      if (chance < 0 || chance > 1) {
        reader.fault(join(chancesPath, word), `is ${chance}, but must be a chance from 0 to 1`);
        return [word, 0];
      }
      return [word, chance];
    }),
  ) as Record<Word, number>;
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
    dependsOn: readSiteIds(reader, site, path, 'dependsOn'),
    alternatives: readSiteIds(reader, site, path, 'alternatives'),
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
 * A region's population growth. A file of format 2 or later may give it as `populationGrowth`,
 * in percent a year to at most two decimal places; otherwise the game's own rate applies.
 */
function readGrowth(reader: Reader, region: Json, path: string, formatVersion: number): number {
  const fallback = balance.population.growthPerTenThousandPerQuarter;
  if (region.populationGrowth === undefined) return fallback;
  if (formatVersion < 2) {
    reader.fault(join(path, 'populationGrowth'), 'needs country file format 2 or later');
    return fallback;
  }
  const before = reader.faults.length;
  const percent = reader.number(region, 'populationGrowth', path);
  if (reader.faults.length > before) return fallback;
  const { maxGrowthPercentPerYear } = balance.population;
  if (percent < 0 || percent > maxGrowthPercentPerYear) {
    reader.fault(
      join(path, 'populationGrowth'),
      `is ${percent}, but must be a yearly percentage from 0 to ${maxGrowthPercentPerYear}`,
    );
    return fallback;
  }
  // A year is four quarters; the rate is held in ten-thousandths a quarter.
  return Math.round((percent * 100) / 4);
}

/**
 * The ids a site lists under `key`, such as the sites it depends on. Whether each names a
 * site is checked once every site has been read (`checkDependencies`, `checkAlternatives`).
 */
function readSiteIds(
  reader: Reader,
  site: Json,
  path: string,
  key: 'dependsOn' | 'alternatives',
): string[] {
  const value = site[key];
  if (value === undefined) return [];
  const listPath = join(path, key);
  if (!Array.isArray(value)) {
    reader.fault(listPath, wrongKind(value, 'a list of site ids'));
    return [];
  }
  const ids: string[] = [];
  value.forEach((item: unknown, index) => {
    const itemPath = `${listPath}[${index}]`;
    if (typeof item !== 'string' || item.trim() === '') {
      reader.fault(itemPath, wrongKind(item, 'the id of a site'));
    } else if (ids.includes(item)) {
      reader.fault(itemPath, `repeats "${item}"`);
    } else {
      ids.push(item);
    }
  });
  return ids;
}

/**
 * Each site a site depends on must be another site the country has, and no chain of
 * dependencies may lead back to where it started. A source must lead to an outlet, and a
 * power line to a power station.
 */
function checkDependencies(reader: Reader, sites: readonly Site[]): void {
  const byId = new Map(sites.map((site) => [site.id, site]));
  sites.forEach((site, index) => {
    site.dependsOn.forEach((id, place) => {
      const path = `sites[${index}].dependsOn[${place}]`;
      if (id === site.id) reader.fault(path, `is "${id}": a site cannot depend on itself`);
      else if (!byId.has(id)) reader.fault(path, `is "${id}", which is not the id of a site`);
      else if (site.alternatives.includes(id)) {
        reader.fault(
          path,
          `is "${id}", one of its alternatives: a site cannot depend on a site it rules out`,
        );
      }
    });
  });
  // A site depended on stands for whichever of its alternatives is chosen.
  const choices = (id: string): Site[] => {
    const site = byId.get(id);
    if (site === undefined) return [];
    return [site, ...site.alternatives.flatMap((other) => byId.get(other) ?? [])];
  };

  // A depth-first walk; a site met again while its own dependencies are open is a cycle.
  const done = new Set<string>();
  const reported = new Set<string>();
  const walk = (site: Site, trail: readonly string[]): void => {
    if (done.has(site.id)) return;
    const loopsAt = trail.indexOf(site.id);
    if (loopsAt >= 0) {
      const cycle = [...trail.slice(loopsAt), site.id];
      const key = [...cycle.slice(0, -1)].sort().join(' ');
      if (!reported.has(key)) {
        reported.add(key);
        const index = sites.indexOf(site);
        reader.fault(
          `sites[${index}].dependsOn`,
          `goes round in a circle: ${cycle.map((id) => `"${id}"`).join(' depends on ')}`,
        );
      }
      return;
    }
    for (const next of site.dependsOn.flatMap(choices)) {
      if (next !== site) walk(next, [...trail, site.id]);
    }
    done.add(site.id);
  };
  for (const site of sites) walk(site, []);

  // A source earns only through a chain that reaches an outlet, so it must lead to one.
  const outlets = SITE_TYPES.filter((type) => SITE_CHAIN_ROLES[type] === 'outlet');
  const outletNames = outlets.map((type) => SITE_TYPE_NAMES[type].toLowerCase()).join(' or ');
  const reaches = (site: Site, seen: ReadonlySet<string>): boolean =>
    site.dependsOn.some((id) => {
      const nexts = choices(id);
      // Whichever alternative is chosen, the chain must still reach an outlet.
      return (
        nexts.length > 0 &&
        nexts.every(
          (next) =>
            outlets.includes(next.type) ||
            (!seen.has(next.id) && reaches(next, new Set([...seen, next.id]))),
        )
      );
    });
  sites.forEach((site, index) => {
    if (SITE_CHAIN_ROLES[site.type] !== 'source' || reaches(site, new Set([site.id]))) return;
    reader.fault(
      `sites[${index}].dependsOn`,
      `must lead, directly or through other sites, to a ${outletNames}: a ${SITE_TYPE_NAMES[site.type].toLowerCase()} earns only through a chain that reaches one`,
    );
  });

  // A power line carries power only from a station, so it must lead to one through lines.
  const stationNames = SITE_TYPES.filter((type) => SITE_POWER_ROLES[type] === 'station')
    .map((type) => SITE_TYPE_NAMES[type].toLowerCase())
    .join(' or ');
  const powers = (site: Site, seen: ReadonlySet<string>): boolean =>
    site.dependsOn.some((id) => {
      const nexts = choices(id);
      return (
        nexts.length > 0 &&
        nexts.every(
          (next) =>
            SITE_POWER_ROLES[next.type] === 'station' ||
            (SITE_POWER_ROLES[next.type] === 'line' &&
              !seen.has(next.id) &&
              powers(next, new Set([...seen, next.id]))),
        )
      );
    });
  sites.forEach((site, index) => {
    if (SITE_POWER_ROLES[site.type] !== 'line' || powers(site, new Set([site.id]))) return;
    const name = SITE_TYPE_NAMES[site.type].toLowerCase();
    reader.fault(
      `sites[${index}].dependsOn`,
      `must lead, directly or through other ${name}s, to a ${stationNames}: a ${name} carries power only from one`,
    );
  });
}

/**
 * Each alternative a site lists must be another site the country has, playing the same part
 * in a chain and in bringing power, so that whichever is chosen a chain or a power line
 * through it still works. Returns the sites
 * with their alternatives said on both sides: if one rules out another, each rules out the other.
 */
function checkAlternatives(reader: Reader, sites: readonly Site[]): Site[] {
  const byId = new Map(sites.map((site) => [site.id, site]));
  sites.forEach((site, index) => {
    site.alternatives.forEach((id, place) => {
      const path = `sites[${index}].alternatives[${place}]`;
      const other = byId.get(id);
      if (id === site.id) {
        reader.fault(path, `is "${id}": a site cannot be an alternative to itself`);
      } else if (other === undefined) {
        reader.fault(path, `is "${id}", which is not the id of a site`);
      } else if (
        SITE_CHAIN_ROLES[other.type] !== SITE_CHAIN_ROLES[site.type] ||
        SITE_POWER_ROLES[other.type] !== SITE_POWER_ROLES[site.type]
      ) {
        const name = (type: SiteType) => SITE_TYPE_NAMES[type].toLowerCase();
        const part =
          SITE_CHAIN_ROLES[other.type] === SITE_CHAIN_ROLES[site.type]
            ? 'in bringing power'
            : 'in a chain';
        reader.fault(
          path,
          `is "${id}", a ${name(other.type)}, but a ${name(site.type)} can only be an alternative to a site that plays the same part ${part}`,
        );
      }
    });
  });
  return sites.map((site) => ({
    ...site,
    alternatives: sites
      .filter(
        (other) =>
          other !== site &&
          (site.alternatives.includes(other.id) || other.alternatives.includes(site.id)),
      )
      .map((other) => other.id),
  }));
}

/**
 * The sites that could all be in use at once and between them need the most upkeep: every
 * site, less those ruled out by the alternatives chosen.
 */
function costliestTogether(sites: readonly Site[]): Site[] {
  const upkeepOf = (chosen: readonly Site[]) =>
    sum(chosen.map((site) => balance.sites[site.type].upkeep));
  const choose = (left: readonly Site[], chosen: readonly Site[]): Site[] => {
    const [site, ...rest] = left;
    if (site === undefined) return [...chosen];
    if (chosen.some((other) => other.alternatives.includes(site.id))) return choose(rest, chosen);
    if (site.alternatives.length === 0) return choose(rest, [...chosen, site]);
    const withIt = choose(rest, [...chosen, site]);
    const withoutIt = choose(rest, chosen);
    return upkeepOf(withIt) >= upkeepOf(withoutIt) ? withIt : withoutIt;
  };
  return choose(sites, []);
}

/**
 * The starting budget, written with the tax rate in percent and spending in millions. It
 * is held to the same rules as a budget the player sets. Upkeep may be left out: the game
 * then starts with enough to keep in good repair every one of the country's sites that can
 * stand together, which costs nothing until they are built, since upkeep is spent only as
 * far as it is needed.
 */
function readBudget(reader: Reader, budget: Json, path: string, sites: readonly Site[]): Budget {
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
      if (area === 'upkeep' && written.upkeep === undefined) {
        return [area, upkeepForEvery(costliestTogether(sites).map((site) => site.type))];
      }
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

/** What the game starts with: the treasury, the budget, the food reserve and any loans. */
function readStart(
  reader: Reader,
  start: Json,
  formatVersion: number,
  regions: readonly Region[],
  sites: readonly Site[],
): Country['start'] {
  const treasury = reader.money(start, 'treasury', 'start');
  const budget = readBudget(reader, reader.object(start, 'budget', 'start'), 'start.budget', sites);
  return {
    treasury,
    budget,
    foodReserve: reader.wholeNumber(start, 'foodReserve', 'start', 0),
    loans: readStartingLoans(reader, start, formatVersion, regions, { treasury, budget }),
  };
}

/**
 * The loans a file of format 4 or later may say the game starts with, in `start.loans`:
 * each the sum owed, in millions, its yearly rate in percent to at most two decimal places,
 * and the quarters left to repay it. Between them they may owe no more than balance data
 * allows against the regions' output, and their first repayments must be payable from the
 * starting treasury and the first quarter's revenue, before anything unrest costs.
 */
function readStartingLoans(
  reader: Reader,
  start: Json,
  formatVersion: number,
  regions: readonly Region[],
  { treasury, budget }: Pick<Country['start'], 'treasury' | 'budget'>,
): StartingLoan[] {
  if (start.loans === undefined) return [];
  if (formatVersion < 4) {
    reader.fault('start.loans', 'needs country file format 4 or later');
    return [];
  }
  const limits = balance.finance.startingDebt;
  const loans = reader.list(start, 'loans', 'start', (item, path): StartingLoan => {
    const before = reader.faults.length;
    const owed = reader.money(item, 'amount', path);
    if (reader.faults.length === before && owed === 0) {
      reader.fault(join(path, 'amount'), 'must be more than 0');
    }
    return {
      owed,
      annualRateBasisPoints: readRate(reader, item, path, limits.mostRatePercent),
      quarters: reader.wholeNumber(item, 'quarters', path, 1, limits.mostQuarters),
    };
  });
  if (loans.length > limits.mostLoans) {
    reader.fault(
      'start.loans',
      `lists ${loans.length} loans, but a country may start with at most ${limits.mostLoans}`,
    );
  }
  // What the loans come to together means nothing while any part of them, or of the
  // regions and budget they are weighed against, is in doubt.
  if (reader.faults.length > 0) return loans;

  const output = sum(regions.map((region) => region.output));
  const owed = sum(loans.map((loan) => loan.owed));
  const mostOwed = Math.floor((4 * output * limits.mostOwedPermille) / 1000);
  if (owed > mostOwed) {
    reader.fault(
      'start.loans',
      `owe ${formatMoney(owed)} between them, but a country may start owing at most ${formatMoney(mostOwed)}: ${formatPercent(limits.mostOwedPermille, 0)} of a year’s output from its regions`,
    );
  }
  // Repayments are paid first, out of the treasury and the quarter's revenue.
  const repayments = sum(loans.map(levelRepaymentOf));
  const revenue = sum(regions.map((region) => taxOn(region.output, budget.taxRatePercent)));
  if (repayments > treasury + revenue) {
    reader.fault(
      'start.loans',
      `ask ${formatMoney(repayments)} in the first quarter, but the starting treasury and the first quarter’s revenue come to ${formatMoney(treasury + revenue)}: the game would open on a missed payment`,
    );
  }
  return loans;
}

/** A loan's yearly rate, written in percent to at most two decimal places. */
function readRate(reader: Reader, loan: Json, path: string, mostPercent: number): number {
  const before = reader.faults.length;
  const percent = reader.number(loan, 'rate', path);
  if (reader.faults.length > before) return 0;
  const basisPoints = Math.round(percent * 100);
  if (percent < 0 || percent > mostPercent || Math.abs(percent * 100 - basisPoints) > 1e-6) {
    reader.fault(
      join(path, 'rate'),
      `is ${percent}, but must be a yearly percentage from 0 to ${mostPercent}, to at most two decimal places`,
    );
    return 0;
  }
  return basisPoints;
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
  if (
    !Number.isInteger(formatVersion) ||
    formatVersion < OLDEST_COUNTRY_FORMAT_VERSION ||
    formatVersion > COUNTRY_FORMAT_VERSION
  ) {
    throw new CountryFileError([
      `formatVersion is ${formatVersion}, but this game reads versions ${OLDEST_COUNTRY_FORMAT_VERSION} to ${COUNTRY_FORMAT_VERSION}.`,
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
    growthPerTenThousandPerQuarter: readGrowth(reader, item, path, formatVersion),
    eventLikelihood: readChances(reader, item, 'eventLikelihood', path, EVENT_TYPES, 'an event'),
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
  const listed = reader.list(file, 'sites', '', (item, path) => {
    // Format 1 had no way to say what a site depends on, and format 2 none to name alternatives.
    const later = { dependsOn: 2, alternatives: 3 } as const;
    const fields = { ...item };
    for (const [key, version] of Object.entries(later)) {
      if (formatVersion < version && item[key] !== undefined) {
        reader.fault(join(path, key), `needs country file format ${version} or later`);
        Reflect.deleteProperty(fields, key);
      }
    }
    return readSite(reader, fields, path, regions, siteIds, siteNames);
  });
  const sites = checkAlternatives(reader, listed);
  checkDependencies(reader, sites);

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
    dilemmaLikelihood: readChances(
      reader,
      file,
      'dilemmaLikelihood',
      '',
      DILEMMA_TYPES,
      'a dilemma',
    ),
    start: readStart(reader, start, formatVersion, regions, sites),
    // A copy, so that nothing done to the file afterwards reaches the country.
    source: JSON.parse(JSON.stringify(file)) as unknown,
  };

  if (reader.faults.length > 0) throw new CountryFileError(reader.faults);
  return country;
}
