/**
 * Reads and checks a country file (`loadCountry`). What a file describes is in
 * `countryTypes.ts`, and which format first lets a file say each thing in `countryFormats.ts`.
 * Sites are read in `countrySites.ts` and hidden deposits in `countryDeposits.ts`; what follows
 * here is the regions, the border crossings and the likelihoods.
 */

import { sum } from './arithmetic';
import { balance } from './balance';
import { readDeposits } from './countryDeposits';
import {
  COUNTRY_FORMAT_VERSION,
  EVENT_FORMATS,
  OLDEST_COUNTRY_FORMAT_VERSION,
  PRICE_SHOCK_FORMAT,
} from './countryFormats';
import {
  describeKind,
  isRecord,
  join,
  readChances,
  Reader,
  wrongKind,
  type Json,
} from './countryReader';
import { readSite } from './countrySites';
import { readStart } from './countryStart';
import type {
  Country,
  Crossing,
  Decoration,
  Neighbour,
  Region,
  River,
  Sea,
  Settlement,
} from './countryTypes';
import { checkAlternatives, checkDependencies, checkDeposits } from './siteChecks';
import { formatTonnes } from './text';
import {
  DECORATION_KINDS,
  DILEMMA_TYPES,
  EVENT_TYPES,
  PRICE_SHOCK_TYPES,
  LABEL_SIDES,
  SETTLEMENT_SIZES,
  TERRAINS,
  type EventType,
  type PriceShockType,
} from './vocabulary';

export { COUNTRY_FORMAT_VERSION } from './countryFormats';
export { regionName } from './countryTypes';
export type {
  Country,
  Crossing,
  Decoration,
  Deposit,
  Neighbour,
  Point,
  Region,
  River,
  Sea,
  Settlement,
  Site,
} from './countryTypes';

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
 * The border crossings a file of format 5 or later names in `crossings`, each leading to one
 * of the file's neighbours and carrying a whole number of order steps a quarter. A file of an
 * earlier format could not name them, and is read as having one on each neighbour.
 */
function readCrossings(
  reader: Reader,
  file: Json,
  formatVersion: number,
  neighbours: readonly Neighbour[],
): Crossing[] {
  const { leastTonnes, mostTonnes, unlistedTonnes } = balance.trade.crossings;
  if (formatVersion < 5) {
    if (file.crossings !== undefined) {
      reader.fault('crossings', 'needs country file format 5 or later');
    }
    return neighbours.map((neighbour) => ({
      id: neighbour.id,
      name: `${neighbour.name} border`,
      neighbourId: neighbour.id,
      tonnes: unlistedTonnes,
    }));
  }
  if (file.crossings === undefined) return [];
  const ids = new Map<string, string>();
  const names = new Map<string, string>();
  const step = balance.trade.orderStepTonnes;
  return reader.list(file, 'crossings', '', (item, path): Crossing => {
    const crossing = {
      id: reader.unique(item, 'id', path, ids),
      name: reader.unique(item, 'name', path, names),
      neighbourId: reader.text(item, 'neighbour', path),
      tonnes: 0,
    };
    if (
      crossing.neighbourId !== '' &&
      !neighbours.some((neighbour) => neighbour.id === crossing.neighbourId)
    ) {
      reader.fault(
        join(path, 'neighbour'),
        `is "${crossing.neighbourId}", which is not the id of a neighbour`,
      );
    }
    const before = reader.faults.length;
    const tonnes = reader.number(item, 'tonnes', path);
    if (reader.faults.length > before) return crossing;
    if (tonnes < leastTonnes || tonnes > mostTonnes || tonnes % step !== 0) {
      reader.fault(
        join(path, 'tonnes'),
        `is ${tonnes}, but must be a whole number of ${formatTonnes(step)} from ${formatTonnes(leastTonnes)} to ${formatTonnes(mostTonnes)}`,
      );
      return crossing;
    }
    return { ...crossing, tonnes };
  });
}

/**
 * How likely each event is in a region, from its `eventLikelihood`. An event a file's format
 * cannot name is a fault. The events that begin in the same quarter share one roll in each
 * region (`rollEvents`), so their chances there may come to no more than 1 between them.
 */
function readEventLikelihood(
  reader: Reader,
  region: Json,
  path: string,
  formatVersion: number,
): Record<EventType, number> {
  const chances = readChances(reader, region, 'eventLikelihood', path, EVENT_TYPES, 'an event');
  const written = isRecord(region.eventLikelihood) ? region.eventLikelihood : {};
  for (const type of EVENT_TYPES) {
    if (formatVersion < EVENT_FORMATS[type] && written[type] !== undefined) {
      reader.fault(
        join(join(path, 'eventLikelihood'), type),
        `needs country file format ${EVENT_FORMATS[type]} or later`,
      );
      chances[type] = 0;
    }
  }
  for (const quarter of [1, 2, 3, 4] as const) {
    const sharing = EVENT_TYPES.filter(
      (type) =>
        chances[type] > 0 &&
        balance.events[type].conditions.beginsInQuarters.some((begins) => begins === quarter),
    );
    // Counted in millionths, so that chances such as 0.35 and 0.65 come to 1 exactly.
    const together = sum(sharing.map((type) => Math.round(chances[type] * 1_000_000)));
    if (sharing.length > 1 && together > 1_000_000) {
      reader.fault(
        join(path, 'eventLikelihood'),
        `gives ${sharing.join(' and ')} chances that come to ${together / 1_000_000}, but events that begin in the same season share one chance, so together they may come to at most 1`,
      );
    }
  }
  return chances;
}

/**
 * How likely each world price shock is to be announced in a quarter, from a file of format 7
 * or later. An earlier format cannot name them, and no shock ever comes in its country.
 */
function readPriceShockLikelihood(
  reader: Reader,
  file: Json,
  formatVersion: number,
): Record<PriceShockType, number> {
  if (formatVersion < PRICE_SHOCK_FORMAT && file.priceShockLikelihood !== undefined) {
    reader.fault(
      'priceShockLikelihood',
      `needs country file format ${PRICE_SHOCK_FORMAT} or later`,
    );
    return readChances(reader, {}, 'priceShockLikelihood', '', PRICE_SHOCK_TYPES, '');
  }
  return readChances(
    reader,
    file,
    'priceShockLikelihood',
    '',
    PRICE_SHOCK_TYPES,
    'a world price shock',
  );
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
    eventLikelihood: readEventLikelihood(reader, item, path, formatVersion),
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
    return readSite(reader, fields, path, regions, siteIds, siteNames, formatVersion);
  });
  const sites = checkAlternatives(reader, listed);
  const deposits = readDeposits(reader, file, formatVersion, regions, siteIds, siteNames);
  checkDependencies(reader, [
    ...sites.map((site, index) => ({ site, path: `sites[${index}]` })),
    ...deposits.flatMap((deposit, index) => [
      { site: deposit.mine, path: `deposits[${index}].mine` },
      { site: deposit.route, path: `deposits[${index}].route` },
    ]),
  ]);
  checkDeposits(reader, sites, deposits);

  const map = reader.object(file, 'map', '');
  const neighbourIds = new Map<string, string>();
  const riverIds = new Map<string, string>();
  const start = reader.object(file, 'start', '');

  const id = reader.text(file, 'id', '');
  const name = reader.text(file, 'name', '');
  const countryMap: Country['map'] = {
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
  };

  const country: Country = {
    formatVersion,
    id,
    name,
    map: countryMap,
    regions,
    settlements,
    sites,
    deposits,
    crossings: readCrossings(reader, file, formatVersion, countryMap.neighbours),
    dilemmaLikelihood: readChances(
      reader,
      file,
      'dilemmaLikelihood',
      '',
      DILEMMA_TYPES,
      'a dilemma',
    ),
    priceShockLikelihood: readPriceShockLikelihood(reader, file, formatVersion),
    start: readStart(reader, start, formatVersion, regions, sites),
    // A copy, so that nothing done to the file afterwards reaches the country.
    source: JSON.parse(JSON.stringify(file)) as unknown,
  };

  if (reader.faults.length > 0) throw new CountryFileError(reader.faults);
  return country;
}
