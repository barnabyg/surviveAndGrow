import { balance } from './balance';
import { entersBeforeHarvest } from './calendar';
import { regionName, type Country } from './country';
import { nextRandom, type RngState } from './rng';
import type { ReportEntry } from './report';
import type { GameDate, Quarter } from './types';
import { EVENT_TYPES, type EventType } from './vocabulary';

/**
 * What an event is, as data: the conditions under which it can begin, how long it lasts
 * and what it does. How likely it is in each region is the country file's business.
 */
export interface EventDefinition {
  readonly name: string;
  readonly conditions: {
    /** The event can begin as the calendar moves into one of these quarters. */
    readonly beginsInQuarters: readonly Quarter[];
  };
  /** The event lasts until the next harvest is in. */
  readonly endsAfterHarvest: boolean;
  /** What the turn report says of the event when it begins and when it ends. */
  readonly announcement: { readonly begins: string; readonly ends: string };
  readonly effects: {
    /** What is left of the region's harvest while the event lasts, in thousandths. */
    readonly harvestPermille: number;
  };
}

/** An event under way in one region. */
export interface ActiveEvent {
  readonly type: EventType;
  readonly regionId: string;
  /** The first quarter the event was in force. */
  readonly began: GameDate;
}

const definitions: Readonly<Record<EventType, EventDefinition>> = balance.events;

/**
 * Rolls for every event that can begin as the calendar moves into `date`. One number is
 * drawn for every region whatever its likelihood, so the same seed gives the same weather
 * in every country file.
 */
export function beginEvents(
  country: Country,
  active: readonly ActiveEvent[],
  date: GameDate,
  rng: RngState,
): { readonly begun: readonly ActiveEvent[]; readonly rng: RngState } {
  const begun: ActiveEvent[] = [];
  let current = rng;
  for (const type of EVENT_TYPES) {
    if (!definitions[type].conditions.beginsInQuarters.includes(date.quarter)) continue;
    for (const region of country.regions) {
      const roll = nextRandom(current);
      current = roll.state;
      const strikes = roll.value / 2 ** 32 < region.eventLikelihood[type];
      if (strikes && !isActive(active, type, region.id)) {
        begun.push({ type, regionId: region.id, began: date });
      }
    }
  }
  return { begun, rng: current };
}

/** Splits the events into those a harvest brings to an end and those that carry on. */
export function endEventsAfterHarvest(active: readonly ActiveEvent[]): {
  readonly ended: readonly ActiveEvent[];
  readonly remaining: readonly ActiveEvent[];
} {
  return {
    ended: active.filter((event) => definitions[event.type].endsAfterHarvest),
    remaining: active.filter((event) => !definitions[event.type].endsAfterHarvest),
  };
}

/** What the events now in force leave of a region's harvest, in thousandths. */
export function harvestPermille(active: readonly ActiveEvent[], regionId: string): number {
  return active
    .filter((event) => event.regionId === regionId)
    .reduce(
      (permille, event) =>
        Math.floor((permille * definitions[event.type].effects.harvestPermille) / 1000),
      1000,
    );
}

/**
 * The least that events could leave of a region's coming harvest, in thousandths: what
 * those now in force leave, cut again by every event that could still begin before the
 * harvest. The forecast uses it so that a drought yet to come cannot fall outside its range.
 */
export function worstHarvestPermille(
  country: Country,
  active: readonly ActiveEvent[],
  regionId: string,
  quarter: Quarter,
): number {
  const region = country.regions.find((candidate) => candidate.id === regionId);
  let worst = harvestPermille(active, regionId);
  for (const type of EVENT_TYPES) {
    const definition = definitions[type];
    const mayStillBegin =
      definition.conditions.beginsInQuarters.some((begins) =>
        entersBeforeHarvest(begins, quarter),
      ) &&
      (region?.eventLikelihood[type] ?? 0) > 0 &&
      !isActive(active, type, regionId);
    if (mayStillBegin) {
      worst = Math.floor((worst * definition.effects.harvestPermille) / 1000);
    }
  }
  return worst;
}

/** Whether an event of one type is under way in a region. */
function isActive(active: readonly ActiveEvent[], type: EventType, regionId: string): boolean {
  return active.some(
    (event) =>
      event.regionId === regionId &&
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- The engine has one event type so far, which makes this comparison always true. It is what keeps the check right once a second type is added; remove this line then.
      event.type === type,
  );
}

/** What the turn report says when an event begins. */
export function beginEntry(country: Country, event: ActiveEvent): ReportEntry {
  const definition = definitions[event.type];
  return {
    kind: 'event',
    seriousness: 'serious',
    headline: `${definition.name} in ${regionName(country, event.regionId)}`,
    cause: `${definition.announcement.begins} This year’s harvest there will be ${harvestCutPercent(definition)}% smaller than it would have been.`,
    regionId: event.regionId,
  };
}

/** What the turn report says when an event ends. */
export function endEntry(country: Country, event: ActiveEvent): ReportEntry {
  const definition = definitions[event.type];
  return {
    kind: 'event',
    seriousness: 'notable',
    headline: `The ${definition.name.toLowerCase()} in ${regionName(country, event.regionId)} has ended`,
    cause: definition.announcement.ends,
    regionId: event.regionId,
  };
}

/** An event in force and what it does, in a few words: "Drought · harvest −40%". */
export function describeEvent(event: ActiveEvent): string {
  const definition = definitions[event.type];
  return `${definition.name} · harvest −${harvestCutPercent(definition)}%`;
}

/** How much of a harvest the event takes, as a whole percentage. */
function harvestCutPercent(definition: EventDefinition): number {
  return Math.round((1000 - definition.effects.harvestPermille) / 10);
}
