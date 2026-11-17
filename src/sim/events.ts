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

/** An event striking a region: it begins there unless one of its type is already under way. */
export interface EventStrike {
  readonly type: EventType;
  readonly regionId: string;
}

/** An event that could begin in a region, and the chance the country file gives it. */
export interface PossibleEvent extends EventStrike {
  /** The chance, from 0 to 1, that it strikes. */
  readonly chance: number;
}

/** Every event that could begin as the calendar moves into `date`, where the chance is not nil. */
export function eventsThatMayBegin(country: Country, date: GameDate): PossibleEvent[] {
  return EVENT_TYPES.filter((type) =>
    definitions[type].conditions.beginsInQuarters.includes(date.quarter),
  ).flatMap((type) =>
    country.regions
      .filter((region) => region.eventLikelihood[type] > 0)
      .map((region) => ({ type, regionId: region.id, chance: region.eventLikelihood[type] })),
  );
}

/**
 * Rolls for every event that can begin as the calendar moves into `date`. One number is
 * drawn for every region whatever its likelihood, so the same seed gives the same weather
 * in every country file.
 */
export function rollEvents(
  country: Country,
  date: GameDate,
  rng: RngState,
): { readonly struck: readonly EventStrike[]; readonly rng: RngState } {
  const struck: EventStrike[] = [];
  let current = rng;
  for (const type of EVENT_TYPES) {
    if (!definitions[type].conditions.beginsInQuarters.includes(date.quarter)) continue;
    for (const region of country.regions) {
      const roll = nextRandom(current);
      current = roll.state;
      if (roll.value / 2 ** 32 < region.eventLikelihood[type]) {
        struck.push({ type, regionId: region.id });
      }
    }
  }
  return { struck, rng: current };
}

/** The events that begin on `date`: each strike, unless one of its type is already under way there. */
export function beginStruck(
  active: readonly ActiveEvent[],
  struck: readonly EventStrike[],
  date: GameDate,
): ActiveEvent[] {
  return struck
    .filter((strike) => !isActive(active, strike.type, strike.regionId))
    .map((strike) => ({ type: strike.type, regionId: strike.regionId, began: date }));
}

/** The name of a kind of event, as the player reads it: "Drought". */
export function eventName(type: EventType): string {
  return definitions[type].name;
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

/**
 * What the events now in force leave of a region's harvest, in thousandths. `hold` is what
 * irrigation leaves of an event's hold on the region: 1000 where there is none.
 */
export function harvestPermille(
  active: readonly ActiveEvent[],
  regionId: string,
  hold: number,
): number {
  return active
    .filter((event) => event.regionId === regionId)
    .reduce(
      (permille, event) => Math.floor((permille * leftBy(definitions[event.type], hold)) / 1000),
      1000,
    );
}

/** What one event leaves of a harvest, in thousandths, where it has only `hold` of its grip. */
function leftBy(definition: EventDefinition, hold: number): number {
  return 1000 - Math.floor(((1000 - definition.effects.harvestPermille) * hold) / 1000);
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
  hold: number,
): number {
  const region = country.regions.find((candidate) => candidate.id === regionId);
  let worst = harvestPermille(active, regionId, hold);
  for (const type of EVENT_TYPES) {
    const definition = definitions[type];
    const mayStillBegin =
      definition.conditions.beginsInQuarters.some((begins) =>
        entersBeforeHarvest(begins, quarter),
      ) &&
      (region?.eventLikelihood[type] ?? 0) > 0 &&
      !isActive(active, type, regionId);
    if (mayStillBegin) {
      worst = Math.floor((worst * leftBy(definition, hold)) / 1000);
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

/** What the turn report says when an event begins, given the hold it has on its region. */
export function beginEntry(country: Country, event: ActiveEvent, hold: number): ReportEntry {
  const definition = definitions[event.type];
  return {
    kind: 'event',
    seriousness: 'serious',
    headline: `${definition.name} in ${regionName(country, event.regionId)}`,
    cause: `${definition.announcement.begins} This year’s harvest there will be ${harvestCutPercent(definition, hold)}% smaller than it would have been.`,
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

/**
 * An event in force and what it does to its region, in a few words: "Drought · harvest
 * −40%", or less where irrigation leaves it only `hold` thousandths of its grip.
 */
export function describeEventWithHold(event: ActiveEvent, hold: number): string {
  const definition = definitions[event.type];
  return `${definition.name} · harvest −${harvestCutPercent(definition, hold)}%`;
}

/** How much of a harvest the event takes, as a whole percentage. */
function harvestCutPercent(definition: EventDefinition, hold: number): number {
  return Math.round((1000 - leftBy(definition, hold)) / 10);
}
