import type { SiteEffect, SiteType, Technology } from '../vocabulary';

/**
 * The balance values of one technology: what researching it costs, in Money units, paid over
 * the `researchQuarters` it takes, and what it does once known. Each effect leaves that many
 * thousandths of what it bears on in every region, or across the nation for an effect whose
 * reach is the nation (`SITE_EFFECT_DEFINITIONS`), multiplying with what the sites in use do.
 */
export interface TechnologyBalance {
  readonly cost: number;
  readonly researchQuarters: number;
  readonly effects: Readonly<Partial<Record<SiteEffect, number>>>;
  /**
   * What it does for each type of site it improves. It pays off only where such a site is in
   * use, and adds to what the site does before decay takes its share.
   */
  readonly improves: Readonly<Partial<Record<SiteType, SiteImprovement>>>;
}

/**
 * How a technology improves a type of site in use. Each part is left out where it does not
 * apply.
 */
export interface SiteImprovement {
  /**
   * What it leaves, in thousandths, of what the site's own effect leaves of the same thing: an
   * irrigation scheme that leaves 500 of the weather's hold, improved by 800, leaves 400.
   */
  readonly effects?: Readonly<Partial<Record<SiteEffect, number>>>;
  /** What it adds to what the site produces or carries in a chain, in thousandths of it. */
  readonly capacityPermille?: number;
  /**
   * For a power station, what it adds to what its power gives each region it reaches, output
   * and infrastructure access alike, in thousandths of it.
   */
  readonly powerPermille?: number;
}

/** `balance.technologies`: what each technology costs, takes to research and does. */
export const technologiesBalance = {
  /**
   * What can be researched (`TECHNOLOGY_DEFINITIONS` gives each its name and prerequisites).
   * Research is a project on no site: paid in instalments after the budget, paused when the
   * treasury cannot pay, and known from the quarter after its last instalment. One
   * technology is researched at a time.
   */
  technologies: {
    // Weather and drought move every region's harvest 30% less; a flood's water it does not
    // hold back. It multiplies with irrigation where a region has both.
    droughtResistantSeed: {
      cost: 80,
      researchQuarters: 4,
      effects: { weatherAndDrought: 700 },
      improves: {},
    },
    // The second tier improves what has been built, so it pays off only where the player
    // has built it. An irrigation scheme then takes 60% off the weather's hold, not 50%.
    improvedIrrigation: {
      cost: 100,
      researchQuarters: 4,
      effects: {},
      improves: { irrigation: { effects: { harvestWeather: 800 } } },
    },
    // A grain store then saves 40% of the reserve's spoilage, not 25%.
    coldStorage: {
      cost: 80,
      researchQuarters: 3,
      effects: {},
      improves: { grainStore: { effects: { reserveSpoilage: 800 } } },
    },
    // The third tier. Trunk roads and ports carry a quarter more, so a chain held back by its
    // road or its port ships more, and a port carries more grain across the border. A mine
    // produces no more: a chain its mine holds back gains nothing. It and grid efficiency
    // cost less than the tiers below them: at twice this, what a builder spent on research
    // held its mine's chain back longer than the improvements repaid (docs/balance/phase-5.md).
    roadEngineering: {
      cost: 75,
      researchQuarters: 5,
      effects: {},
      improves: {
        trunkRoad: { capacityPermille: 250 },
        port: { capacityPermille: 250 },
        shallowPort: { capacityPermille: 250 },
      },
    },
    // Power from a station, a dam among them, then adds 25% to a region's output, not 20%,
    // and 18.7 points of infrastructure access, not 15.
    gridEfficiency: {
      cost: 75,
      researchQuarters: 5,
      effects: {},
      improves: { powerStation: { powerPermille: 250 }, dam: { powerPermille: 250 } },
    },
    // The fourth tier, joining both branches. It does nothing of itself: it unlocks the dam
    // (`SITE_TYPE_DEFINITIONS`), which pays off only where a country has a site for one.
    // Improved irrigation, which it needs, improves irrigation schemes and not dams.
    hydropower: {
      cost: 200,
      researchQuarters: 6,
      effects: {},
      improves: {},
    },
    // A branch of their own, each needing nothing first and doing nothing of itself: public
    // health unlocks the clinic and teacher training the school, which pay off only where a
    // country has a site for one. As cheap and quick as the first tier of the farming branch.
    publicHealth: {
      cost: 80,
      researchQuarters: 4,
      effects: {},
      improves: {},
    },
    teacherTraining: {
      cost: 80,
      researchQuarters: 4,
      effects: {},
      improves: {},
    },
  } satisfies Record<Technology, TechnologyBalance>,
} as const;
