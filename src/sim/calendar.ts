import { balance } from './balance';
import type { GameDate, Quarter } from './types';

/** The season of a quarter, such as "Harvest season". */
export function seasonOf(date: GameDate): string {
  return balance.calendar.seasons[date.quarter];
}

export function nextQuarter(quarter: Quarter): Quarter {
  return ((quarter % 4) + 1) as Quarter;
}

export function nextDate(date: GameDate): GameDate {
  return {
    year: date.quarter === 4 ? date.year + 1 : date.year,
    quarter: nextQuarter(date.quarter),
  };
}

/** Which quarter of the game a date is, counting the first quarter of year 1 as quarter 1. */
export function quarterNumber(date: GameDate): number {
  return (date.year - 1) * 4 + date.quarter;
}

/** The date of a quarter of the game, counted the same way. */
export function dateOfQuarter(number: number): GameDate {
  return { year: Math.floor((number - 1) / 4) + 1, quarter: (((number - 1) % 4) + 1) as Quarter };
}

/** Whether the harvest comes in when this quarter is resolved. */
export function isHarvestQuarter(quarter: Quarter): boolean {
  return quarter === balance.calendar.harvestQuarter;
}

/** How many quarters, this one included, must be lived through before the next harvest is in. */
export function quartersUntilHarvest(quarter: Quarter): number {
  return ((balance.calendar.harvestQuarter - quarter + 4) % 4) + 1;
}

/**
 * Whether the calendar will move into quarter `into` before the next harvest is in, seen
 * from the quarter now being decided. An event that begins on entering it can still come.
 */
export function entersBeforeHarvest(into: Quarter, now: Quarter): boolean {
  const quartersAway = (into - now + 4) % 4;
  return quartersAway >= 1 && quartersAway < quartersUntilHarvest(now);
}
