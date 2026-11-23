/**
 * Reads one site of a country file, whether the file lists it or a deposit hides it, and checks
 * it against its region and its type. The checks between sites are in `siteChecks.ts`.
 */

import {
  LOCKED_SITE_FORMAT,
  OLDEST_COUNTRY_FORMAT_VERSION,
  SITE_TYPE_FORMATS,
  TECHNOLOGY_FORMATS,
} from './countryFormats';
import { join, wrongKind, type Json, type Reader } from './countryReader';
import type { Region, Site, SiteDetails } from './countryTypes';
import { contains } from './geometry';
import {
  SITE_FORMS,
  SITE_TYPE_NAMES,
  SITE_TYPES,
  TECHNOLOGIES,
  type Technology,
} from './vocabulary';

/**
 * A site, which must be given the way its type is built: a position for one that stands in
 * one place, a route for one that runs along a line. A position must lie in the site's own
 * region. A route must stay inside the country and start or end in its region.
 */
export function readSite(
  reader: Reader,
  site: Json,
  path: string,
  regions: readonly Region[],
  ids: Map<string, string>,
  names: Map<string, string>,
  formatVersion: number,
  /** The region the site stands in when it is not the site's to say: a deposit's mine's. */
  regionOf?: string,
): Site {
  const regionId = regionOf ?? reader.text(site, 'region', path);
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
    ...readNeeds(reader, site, path, formatVersion),
  };
  // A type the game does not know says nothing about how the site should be given.
  if (!SITE_TYPES.some((type) => type === site.type))
    return { ...details, form: 'place', at: [0, 0] };
  const typeFormat = SITE_TYPE_FORMATS[details.type] ?? OLDEST_COUNTRY_FORMAT_VERSION;
  if (formatVersion < typeFormat) {
    reader.fault(
      join(path, 'type'),
      `is "${details.type}", which needs country file format ${typeFormat} or later`,
    );
  }
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
 * The technology a site of a file of format 9 or later says it needs, in `needs`: one of the
 * game's own, in a file of a format that can name it. Nothing when it says none.
 */
function readNeeds(
  reader: Reader,
  site: Json,
  path: string,
  formatVersion: number,
): { readonly needs?: Technology } {
  const value = site.needs;
  if (value === undefined) return {};
  const needsPath = join(path, 'needs');
  if (formatVersion < LOCKED_SITE_FORMAT) {
    reader.fault(needsPath, `needs country file format ${LOCKED_SITE_FORMAT} or later`);
    return {};
  }
  const technology = TECHNOLOGIES.find((candidate) => candidate === value);
  if (technology !== undefined) {
    const technologyFormat = TECHNOLOGY_FORMATS[technology] ?? LOCKED_SITE_FORMAT;
    if (formatVersion < technologyFormat) {
      reader.fault(
        needsPath,
        `is "${technology}", which needs country file format ${technologyFormat} or later`,
      );
      return {};
    }
    return { needs: technology };
  }
  reader.fault(
    needsPath,
    typeof value === 'string'
      ? `is "${value}", which is not a technology this game has (${TECHNOLOGIES.join(', ')})`
      : wrongKind(value, 'the id of a technology'),
  );
  return {};
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
