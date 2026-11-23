import type { LastingService, SiteEffect, SiteType } from '../vocabulary';

/** The balance values of one type of site. */
export interface SiteBalance {
  readonly cost: number;
  readonly buildQuarters: number;
  /**
   * What keeping the site in good repair costs, in Money units ($100,000) a quarter, from
   * its first quarter in use. Left unpaid, the site decays (see `balance.upkeep`).
   */
  readonly upkeep: number;
  /** What the site in use leaves of each thing it bears on, in thousandths. */
  readonly effects: Readonly<Partial<Record<SiteEffect, number>>>;
  /**
   * What the site in use adds to its region's infrastructure access, in thousandths of the
   * whole. A route counts for the region it belongs to.
   */
  readonly infrastructurePermille: number;
  /**
   * For a site that plays a part in a chain (`SITE_TYPE_DEFINITIONS`), how much ore it
   * produces or carries in a quarter while in good repair, counted as what that ore is worth at
   * the usual world ore price, in Money units: at $100 a tonne, 600 is 600,000 tonnes. A chain
   * ships the least of its sites' capacities, and a decaying site has only part of its
   * capacity. What the ore shipped earns follows the world ore price.
   */
  readonly capacity?: number;
  /**
   * For a site that serves its region's people, what it adds, in thousandths, to where the
   * region's level of each lasting service settles, on top of what spending holds
   * (`prosperity.services`). The level builds up to it over the quarters the site is in use,
   * as it does to spending, and a decaying site adds only part of it.
   */
  readonly services?: Readonly<Partial<Record<LastingService, number>>>;
}

/** `balance.sites`: what each type of site costs, takes to build and does. */
export const sitesBalance = {
  /**
   * What can be built. Each type costs `cost` in Money units ($100,000), paid over the
   * `buildQuarters` it takes to build, and then has its effects for good: each leaves that
   * many thousandths of what it bears on (see `SITE_EFFECT_DEFINITIONS`).
   */
  sites: {
    irrigation: {
      cost: 120,
      buildQuarters: 3,
      upkeep: 4,
      effects: { harvestWeather: 500 },
      infrastructurePermille: 200,
    },
    farmRoad: {
      cost: 100,
      buildQuarters: 3,
      upkeep: 3,
      effects: { transportLoss: 500 },
      infrastructurePermille: 300,
    },
    grainStore: {
      cost: 60,
      buildQuarters: 2,
      upkeep: 2,
      effects: { reserveSpoilage: 750 },
      infrastructurePermille: 200,
    },
    // The large sites of a chain. Each is slow to build and costs several quarters' tax, so
    // one started late in a term opens after the election.
    mine: {
      cost: 400,
      buildQuarters: 6,
      upkeep: 6,
      effects: {},
      infrastructurePermille: 100,
      capacity: 600,
    },
    trunkRoad: {
      cost: 300,
      buildQuarters: 5,
      upkeep: 5,
      effects: {},
      infrastructurePermille: 400,
      capacity: 720,
    },
    port: {
      cost: 500,
      buildQuarters: 8,
      upkeep: 8,
      effects: {},
      infrastructurePermille: 300,
      capacity: 900,
    },
    // A port for shallow-draught ships: about half the cost of a deep-water port and quicker
    // to build, but it ships less than a mine produces. A country offers it as an
    // alternative to a deep-water port, so choosing it gives up the larger trade for good.
    shallowPort: {
      cost: 250,
      buildQuarters: 5,
      upkeep: 4,
      effects: {},
      infrastructurePermille: 200,
      capacity: 360,
    },
    // A power station does nothing alone: what power gives a region is `balance.power`, and
    // it reaches a region only along a power line. So a line adds nothing of its own to
    // infrastructure access: the power it brings does.
    powerStation: {
      cost: 300,
      buildQuarters: 5,
      upkeep: 5,
      effects: {},
      infrastructurePermille: 100,
    },
    powerLine: {
      cost: 60,
      buildQuarters: 2,
      upkeep: 1,
      effects: {},
      infrastructurePermille: 0,
    },
    // A dam is a power station, its power reaching a region only along a power line, that
    // also holds back 40% of how far weather, drought and flood move its own region's harvest:
    // less than an irrigation scheme does. Nearly twice a station's cost and slower to build
    // than a port, so one started late in a term opens after the election.
    dam: {
      cost: 550,
      buildQuarters: 8,
      upkeep: 7,
      effects: { harvestWeather: 600 },
      infrastructurePermille: 100,
    },
    // The sites that serve a region's people. A clinic lets its region's health level settle
    // 15 points higher than health spending alone holds it, and a school its education level,
    // for that region only. Each costs less than an irrigation scheme and adds a quarter of
    // what the smallest farming site does to infrastructure access.
    clinic: {
      cost: 80,
      buildQuarters: 3,
      upkeep: 3,
      effects: {},
      infrastructurePermille: 50,
      services: { health: 150 },
    },
    school: {
      cost: 80,
      buildQuarters: 3,
      upkeep: 3,
      effects: {},
      infrastructurePermille: 50,
      services: { education: 150 },
    },
  } satisfies Record<SiteType, SiteBalance>,
} as const;
