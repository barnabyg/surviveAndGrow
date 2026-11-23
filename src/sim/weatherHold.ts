import type { Country } from './country';
import { leftIn, siteEffects, sitesInUse, type Project } from './projects';
import { improvementsOf, siteEffectsOf } from './sites';
import { knownTechnologies, technologyEffectsOf, technologyName } from './technology';
import { WEATHER_HELD_BY, type SiteEffect, type Technology } from './vocabulary';

interface Building {
  readonly country: Country;
  readonly projects: readonly Project[];
}

/** One thing that lessens how far the weather moves a region's harvest. */
export interface WeatherHoldLine {
  /** The site in use in the region, or the technology known, that lessens it. */
  readonly label: string;
  /** What it leaves of the weather's hold, in thousandths. */
  readonly permille: number;
  /** What it would leave if no technology improved it: the same as above while none does. */
  readonly unimproved: number;
  /** The technologies known that make it leave less, in the order they became known. */
  readonly improvedBy: readonly Technology[];
}

/** How far the weather moves a region's harvest, and what lessens it. */
export interface WeatherHold {
  /**
   * What is left of the weather's hold on the harvest, in thousandths: what the harvest
   * reads (`leftIn` with `WEATHER_HELD_BY`).
   */
  readonly left: number;
  /** The sites in use in the region, in the country file's order, then the technologies known. */
  readonly lines: readonly WeatherHoldLine[];
}

/**
 * How far the weather moves a region's harvest as the game stands, and each site in use there
 * and each technology known that lessens it, with what it leaves of it on its own: the
 * breakdown of the harvest's steadiness, as the region's card shows it.
 */
export function weatherHold(building: Building, regionId: string): WeatherHold {
  const known = knownTechnologies(building.projects);
  const index = building.country.regions.findIndex((region) => region.id === regionId);
  const sites = sitesInUse(building)
    .filter(({ site }) => site.regionId === regionId)
    .flatMap(({ site, decaying }): WeatherHoldLine[] => {
      const permille = held(siteEffectsOf(site.type, decaying, known));
      if (permille === null) return [];
      const unimproved = held(siteEffectsOf(site.type, decaying)) ?? permille;
      const improvedBy =
        permille === unimproved
          ? []
          : known.filter((technology) =>
              improvementsOf(site.type, [technology]).some(([, improvement]) =>
                WEATHER_HELD_BY.some((effect) => improvement.effects?.[effect] !== undefined),
              ),
            );
      return [{ label: site.name, permille, unimproved, improvedBy }];
    });
  const technologies = known.flatMap((technology): WeatherHoldLine[] => {
    const permille = held(technologyEffectsOf(technology));
    return permille === null
      ? []
      : [{ label: technologyName(technology), permille, unimproved: permille, improvedBy: [] }];
  });
  return {
    left: index < 0 ? 1000 : leftIn(siteEffects(building), WEATHER_HELD_BY, index),
    lines: [...sites, ...technologies],
  };
}

/** What effects leave of the weather's hold together, or null when none bears on it. */
function held(effects: readonly (readonly [SiteEffect, number])[]): number | null {
  const bearing = effects.filter(([effect]) => WEATHER_HELD_BY.includes(effect));
  return bearing.length === 0
    ? null
    : bearing.reduce((left, [, permille]) => Math.floor((left * permille) / 1000), 1000);
}
