import { balance } from './balance';
import type { Country } from './country';
import { nextRandom, type RngState } from './rng';
import type { Notice } from './state';
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
 * The least and most that events could leave of a region's coming harvest, in thousandths:
 * those now in force, and at the extremes those that could still begin before the harvest.
 */
export function harvestPermilleRange(
  country: Country,
  active: readonly ActiveEvent[],
  regionId: string,
  quarter: Quarter,
): { readonly worst: number; readonly best: number } {
  const now = harvestPermille(active, regionId);
  const region = country.regions.find((candidate) => candidate.id === regionId);
  let worst = now;
  let best = now;
  for (const type of EVENT_TYPES) {
    const definition = definitions[type];
    const mayStillBegin =
      definition.conditions.beginsInQuarters.some((begins) => begins > quarter) &&
      (region?.eventLikelihood[type] ?? 0) > 0 &&
      !isActive(active, type, regionId);
    if (!mayStillBegin) continue;
    const effect = definition.effects.harvestPermille;
    if (effect < 1000) worst = Math.floor((worst * effect) / 1000);
    if (effect > 1000) best = Math.floor((best * effect) / 1000);
  }
  return { worst, best };
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

/** The notice the turn report carries when an event begins. */
export function beginNotice(country: Country, event: ActiveEvent): Notice {
  const definition = definitions[event.type];
  const cut = Math.round((1000 - definition.effects.harvestPermille) / 10);
  return {
    title: `${definition.name} in ${regionName(country, event.regionId)}`,
    detail: `The rains have failed. This year’s harvest there will be ${cut}% smaller than it would have been.`,
    tone: 'danger',
    regionId: event.regionId,
  };
}

/** The notice the turn report carries when an event ends. */
export function endNotice(country: Country, event: ActiveEvent): Notice {
  const name = definitions[event.type].name.toLowerCase();
  return {
    title: `The ${name} in ${regionName(country, event.regionId)} has ended`,
    detail: 'The harvest it spoiled is in, and the next growing year starts afresh.',
    tone: 'info',
    regionId: event.regionId,
  };
}

/** How an event in force is labelled on the map, such as "Drought · harvest −40%". */
export function describeEvent(event: ActiveEvent): string {
  const definition = definitions[event.type];
  const cut = Math.round((1000 - definition.effects.harvestPermille) / 10);
  return `${definition.name} · harvest −${cut}%`;
}

function regionName(country: Country, regionId: string): string {
  return country.regions.find((region) => region.id === regionId)?.name ?? regionId;
}
