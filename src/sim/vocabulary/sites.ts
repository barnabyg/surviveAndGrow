/**
 * Sites: the types that can be built, the parts they play in a chain and in bringing power,
 * what a site or a technology can lessen, and how a site stands.
 */

import type { Technology } from './technologies';

/** The kinds of thing that can be built. A country file says where each could stand. */
export const SITE_TYPES = [
  'irrigation',
  'farmRoad',
  'grainStore',
  'mine',
  'trunkRoad',
  'port',
  'shallowPort',
  'powerStation',
  'powerLine',
  'dam',
  'clinic',
  'school',
] as const;
export type SiteType = (typeof SITE_TYPES)[number];

/** A site either stands in one place or runs along a route. Its type decides which. */
export type SiteForm = 'place' | 'route';

/**
 * The part a site plays in a chain. A source produces output, but only while every site it
 * depends on, directly or through others, is in use; a link carries that output on; an
 * outlet ships it out. A source's chain must lead to an outlet. What each can produce or
 * carry is a balance value (`capacity`), and the least of them is what the chain yields.
 */
export const CHAIN_ROLES = ['source', 'link', 'outlet'] as const;
export type ChainRole = (typeof CHAIN_ROLES)[number];

/**
 * The part a site plays in bringing power to the regions. A station makes it; a line carries
 * it to the region the line belongs to, from a station or from another line that leads to
 * one. A region is powered while a line in use links it to a station in use.
 */
export const POWER_ROLES = ['station', 'line'] as const;
export type PowerRole = (typeof POWER_ROLES)[number];

/**
 * What the engine knows of each type of site: its name, how it is laid out, the part it
 * plays in a chain, if any, and in bringing power, if any, and the technology that unlocks
 * it, if one must be known before a site of the type can be started. What it costs and what
 * it does are balance values (`balance.sites`), so a type is added here and there and in no
 * rule.
 */
export const SITE_TYPE_DEFINITIONS: Readonly<
  Record<
    SiteType,
    {
      readonly name: string;
      /** The name of several, as a technology that improves them all speaks of them. */
      readonly plural: string;
      readonly form: SiteForm;
      readonly chainRole: ChainRole | null;
      readonly powerRole: PowerRole | null;
      readonly unlockedBy: Technology | null;
    }
  >
> = {
  irrigation: {
    name: 'Irrigation scheme',
    plural: 'Irrigation schemes',
    form: 'place',
    chainRole: null,
    powerRole: null,
    unlockedBy: null,
  },
  farmRoad: {
    name: 'Farm road',
    plural: 'Farm roads',
    form: 'route',
    chainRole: null,
    powerRole: null,
    unlockedBy: null,
  },
  grainStore: {
    name: 'Grain store',
    plural: 'Grain stores',
    form: 'place',
    chainRole: null,
    powerRole: null,
    unlockedBy: null,
  },
  mine: {
    name: 'Mine',
    plural: 'Mines',
    form: 'place',
    chainRole: 'source',
    powerRole: null,
    unlockedBy: null,
  },
  trunkRoad: {
    name: 'Trunk road',
    plural: 'Trunk roads',
    form: 'route',
    chainRole: 'link',
    powerRole: null,
    unlockedBy: null,
  },
  port: {
    name: 'Port',
    plural: 'Ports',
    form: 'place',
    chainRole: 'outlet',
    powerRole: null,
    unlockedBy: null,
  },
  shallowPort: {
    name: 'Shallow port',
    plural: 'Shallow ports',
    form: 'place',
    chainRole: 'outlet',
    powerRole: null,
    unlockedBy: null,
  },
  powerStation: {
    name: 'Power station',
    plural: 'Power stations',
    form: 'place',
    chainRole: null,
    powerRole: 'station',
    unlockedBy: null,
  },
  powerLine: {
    name: 'Power line',
    plural: 'Power lines',
    form: 'route',
    chainRole: null,
    powerRole: 'line',
    unlockedBy: null,
  },
  // A power station that also steadies its own region's harvest, as irrigation does. It is
  // unlocked by research.
  dam: {
    name: 'Dam',
    plural: 'Dams',
    form: 'place',
    chainRole: null,
    powerRole: 'station',
    unlockedBy: 'hydropower',
  },
  // The small sites that serve a region's people: each raises one of its lasting services,
  // on top of what spending builds (`balance.sites`). Each is unlocked by research of its own.
  clinic: {
    name: 'Clinic',
    plural: 'Clinics',
    form: 'place',
    chainRole: null,
    powerRole: null,
    unlockedBy: 'publicHealth',
  },
  school: {
    name: 'School',
    plural: 'Schools',
    form: 'place',
    chainRole: null,
    powerRole: null,
    unlockedBy: 'teacherTraining',
  },
};

/**
 * What a site in each part of a chain does, in a sentence the player can be shown.
 * `{tonnes}` is the ore it produces or carries a quarter, and `{money}` what that ore is worth
 * at the usual world ore price.
 */
export const CHAIN_ROLE_SENTENCES: Readonly<Record<ChainRole, string>> = {
  source:
    'Ships {tonnes} of ore a quarter, worth {money} at the usual world ore price, to add to its region’s output, but only while its chain to a port is complete.',
  link: 'Carries up to {tonnes} of a mine’s ore a quarter along its chain.',
  outlet:
    'Ships up to {tonnes} a quarter across the border: a mine’s ore first, and grain bought or sold abroad in what is left.',
};

/**
 * What a site in each part of bringing power does, in a sentence the player can be shown.
 * `{percent}` is what a powered region's output rises by and `{points}` what its
 * infrastructure access gains.
 */
export const POWER_ROLE_SENTENCES: Readonly<Record<PowerRole, string>> = {
  station:
    'Powers each region a power line links to it: the region produces {percent} more and gains {points} of infrastructure access.',
  line: 'Brings power from a power station to its region: the region produces {percent} more and gains {points} of infrastructure access.',
};

export const SITE_TYPE_NAMES: Readonly<Record<SiteType, string>> = Object.fromEntries(
  SITE_TYPES.map((type) => [type, SITE_TYPE_DEFINITIONS[type].name]),
) as Record<SiteType, string>;

export const SITE_FORMS: Readonly<Record<SiteType, SiteForm>> = Object.fromEntries(
  SITE_TYPES.map((type) => [type, SITE_TYPE_DEFINITIONS[type].form]),
) as Record<SiteType, SiteForm>;

export const SITE_CHAIN_ROLES: Readonly<Record<SiteType, ChainRole | null>> = Object.fromEntries(
  SITE_TYPES.map((type) => [type, SITE_TYPE_DEFINITIONS[type].chainRole]),
) as Record<SiteType, ChainRole | null>;

export const SITE_POWER_ROLES: Readonly<Record<SiteType, PowerRole | null>> = Object.fromEntries(
  SITE_TYPES.map((type) => [type, SITE_TYPE_DEFINITIONS[type].powerRole]),
) as Record<SiteType, PowerRole | null>;

/**
 * The things a site in use, or a technology known, can lessen. A site's or a technology's
 * effect leaves a share, in thousandths, of one of them; several bearing on the same thing
 * multiply together.
 */
export const SITE_EFFECTS = [
  'harvestWeather',
  'transportLoss',
  'reserveSpoilage',
  'weatherAndDrought',
] as const;
export type SiteEffect = (typeof SITE_EFFECTS)[number];

/**
 * Where each effect falls, and the sentences that tell the player what it does: `sentence`
 * for a site, which bears on the region it belongs to or on the whole nation, and
 * `everywhere` for a technology, which bears on every region at once. `{percent}` is what
 * the site or technology takes off.
 */
export const SITE_EFFECT_DEFINITIONS: Readonly<
  Record<
    SiteEffect,
    {
      readonly reach: 'region' | 'nation';
      readonly sentence: string;
      readonly everywhere: string;
      /**
       * What a technology that improves a type of site's effect does, for `{sites}`, the
       * types it improves, with `{percent}` what it takes off what the site leaves.
       */
      readonly improved: string;
    }
  >
> = {
  harvestWeather: {
    reach: 'region',
    sentence: 'Weather, drought and flood move its region’s harvest {percent}% less.',
    everywhere: 'Weather, drought and flood move every region’s harvest {percent}% less.',
    improved:
      '{sites} hold back a further {percent}% of how far weather, drought and flood move their region’s harvest.',
  },
  transportLoss: {
    reach: 'region',
    sentence: '{percent}% less of its region’s surplus is lost on the way to the national reserve.',
    everywhere:
      '{percent}% less of every region’s surplus is lost on the way to the national reserve.',
    improved:
      '{sites} save a further {percent}% of the surplus their region loses on the way to the national reserve.',
  },
  reserveSpoilage: {
    reach: 'nation',
    sentence: '{percent}% less of the national reserve spoils each quarter.',
    everywhere: '{percent}% less of the national reserve spoils each quarter.',
    improved: '{sites} save a further {percent}% of what spoils in the national reserve.',
  },
  weatherAndDrought: {
    reach: 'region',
    sentence: 'Weather and drought move its region’s harvest {percent}% less.',
    everywhere: 'Weather and drought move every region’s harvest {percent}% less.',
    improved:
      '{sites} hold back a further {percent}% of how far weather and drought move their region’s harvest.',
  },
};

/**
 * What a technology that improves what a type of site carries or brings does, in a sentence
 * the player can be shown: `{sites}` names the types it improves and `{percent}` what it adds.
 * What one that improves a site's effect does is the effect's own (`SITE_EFFECT_DEFINITIONS`).
 */
export const IMPROVEMENT_SENTENCES = {
  capacity:
    '{sites} carry {percent}% more, so a chain they hold back ships more ore and a port carries more across the border.',
  power:
    '{sites} do {percent}% more for each region their power reaches: it gains more output and more infrastructure access.',
} as const;

/**
 * The effects that lessen how far the weather moves a region's harvest. What lessens an
 * event's hold on the harvest is the event's own (`balance.events`).
 */
export const WEATHER_HELD_BY: readonly SiteEffect[] = ['harvestWeather', 'weatherAndDrought'];

/**
 * How a site stands: empty until a project is started on it, and then as the project stands.
 * A site no project has been started on is closed once one has been started on one of its
 * alternatives, and can then never be built. One that needs a technology not yet known is
 * locked until it is, and is then empty like any other.
 */
export const SITE_STATES = [
  'empty',
  'locked',
  'closed',
  'building',
  'paused',
  'operating',
  'decaying',
] as const;
export type SiteState = (typeof SITE_STATES)[number];

export const SITE_STATE_NAMES: Readonly<Record<SiteState, string>> = {
  empty: 'Empty',
  locked: 'Locked',
  closed: 'Closed',
  building: 'Under construction',
  paused: 'Paused',
  operating: 'Operating',
  decaying: 'Decaying',
};
