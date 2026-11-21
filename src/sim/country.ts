import { balance } from './balance';
import type { Budget } from './budget';
import {
  describeKind,
  isRecord,
  join,
  readChances,
  Reader,
  wrongKind,
  type Json,
} from './countryReader';
import { readStart } from './countryStart';
import type { StartingLoan } from './debt';
import { contains } from './geometry';
import { checkAlternatives, checkDependencies } from './siteChecks';
import type { Money } from './types';
import {
  DECORATION_KINDS,
  DILEMMA_TYPES,
  EVENT_TYPES,
  LABEL_SIDES,
  SETTLEMENT_SIZES,
  SITE_FORMS,
  SITE_TYPE_NAMES,
  SITE_TYPES,
  TERRAINS,
  type DecorationKind,
  type DilemmaType,
  type EventType,
  type LabelSide,
  type SettlementSize,
  type SiteType,
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
 * Checks a country file and returns the country it describes.
 * @throws CountryFileError naming every fault found.
 */
export function loadCountry(file: unknown): Country {
  if (!isRecord(file)) {
    throw new CountryFileError([`The file must be an object, but is ${describeKind(file)}.`]);
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
