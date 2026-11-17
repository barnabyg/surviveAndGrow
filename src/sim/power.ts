import type { Country, Site } from './country';
import { siteStatus, type Project } from './projects';
import { powerGain } from './sites';
import type { Money } from './types';
import { inUse } from './upkeep';
import { SITE_POWER_ROLES } from './vocabulary';

interface Building {
  readonly country: Country;
  readonly projects: readonly Project[];
}

/**
 * How power reaches one region. It is worked out afresh each quarter from the sites in use,
 * and never kept.
 */
export interface RegionPower {
  readonly regionId: string;
  /** The power line that brings the region its power, or null while none does. */
  readonly lineId: string | null;
  /** The power station that line leads to, or null while the region has no power. */
  readonly stationId: string | null;
  /** Whether the station or a line on the way is decaying, so the region has only part of it. */
  readonly weakened: boolean;
  /** What power adds to the region's output, in thousandths of it. */
  readonly outputPermille: number;
  /** What power adds to the region's infrastructure access, in thousandths of the whole. */
  readonly infrastructurePermille: number;
}

/** A way from a power line to a station in use, and whether anything on it is decaying. */
interface Link {
  readonly stationId: string;
  readonly weakened: boolean;
}

/**
 * How power reaches each region, in the country file's order. A region is powered while a
 * power line in use that belongs to it leads, directly or through other lines in use, to a
 * station in use. A station alone powers no region, not even its own. Where several lines
 * bring power, the region takes it from one with nothing decaying on its way if there is
 * one, and otherwise from the first in the country file.
 */
export function regionPower(building: Building): RegionPower[] {
  const links = building.country.sites.flatMap((site) => {
    if (SITE_POWER_ROLES[site.type] !== 'line') return [];
    const link = linkOf(building, site, new Set());
    return link === null ? [] : [{ line: site, ...link }];
  });
  return building.country.regions.map((region) => {
    const reaching = links.filter(({ line }) => line.regionId === region.id);
    const best = reaching.find((link) => !link.weakened) ?? reaching[0];
    if (best === undefined) return unpowered(region.id);
    return {
      regionId: region.id,
      lineId: best.line.id,
      stationId: best.stationId,
      weakened: best.weakened,
      ...powerGain(best.weakened),
    };
  });
}

/** How a region stands that no power reaches. */
export function unpowered(regionId: string): RegionPower {
  return {
    regionId,
    lineId: null,
    stationId: null,
    weakened: false,
    outputPermille: 0,
    infrastructurePermille: 0,
  };
}

/** What power adds to an output, in Money: a whole share of it, rounded down. */
export function poweredOutput(output: Money, power: RegionPower): Money {
  return Math.floor((output * power.outputPermille) / 1000);
}

/**
 * The best way from a site to a station in use: the site itself if it is one, or through
 * what a line in use depends on. A site depended on that has alternatives stands for
 * whichever of them has been started, as in a chain. Null when there is none.
 */
function linkOf(building: Building, site: Site, seen: ReadonlySet<string>): Link | null {
  const role = SITE_POWER_ROLES[site.type];
  const project = building.projects.find((candidate) => candidate.siteId === site.id);
  if (role === null || seen.has(site.id) || project === undefined || !inUse(project)) return null;
  const decaying = project.status === 'decaying';
  if (role === 'station') return { stationId: site.id, weakened: decaying };
  const next = new Set([...seen, site.id]);
  const ways = site.dependsOn.flatMap((id) => {
    const target = building.country.sites.find(
      (candidate) => candidate.id === (siteStatus(building, id).closedBy ?? id),
    );
    const way = target === undefined ? null : linkOf(building, target, next);
    return way === null ? [] : [{ ...way, weakened: way.weakened || decaying }];
  });
  return ways.find((way) => !way.weakened) ?? ways[0] ?? null;
}
