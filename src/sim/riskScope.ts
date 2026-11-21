import { balance } from './balance';
import type { PossibleEvent } from './events';
import type { QuarterResolved } from './game';
import type { GameState } from './state';
import { LIKELIHOODS, type Likelihood } from './vocabulary';

/*
 * What the risks look-ahead (`risks.ts`) shares with the risks read from it: the quarters
 * played, and how one danger is weighed across them.
 */

/** An event supposed to begin after a number of the quarters ahead have been played. */
export interface Supposed extends PossibleEvent {
  readonly afterQuarters: number;
}

/** The quarters ahead as one course of weather and one set of events would have them. */
export type Path = readonly QuarterResolved[];

/** Everything the projection found, from which each risk is read. */
export interface Scope {
  readonly state: GameState;
  /** How many of the quarters played count for dangers other than hunger. */
  readonly watched: number;
  readonly possible: readonly Supposed[];
  /**
   * One entry for each course of weather, with the chance it stands for and a path for each
   * supposition about events: none first, then each possible event alone in the order of
   * `possible`, then all together when there is more than one.
   */
  readonly courses: readonly { readonly weight: number; readonly paths: readonly Path[] }[];
  /** Every bond owed or about to be issued that is still to fall due in one payment. */
  readonly bonds: readonly BondAhead[];
}

/** A bond whose whole sum is still to fall due. */
export interface BondAhead {
  readonly name: string;
  readonly number: number;
  /** How many quarters are played before the one it falls due in: 0 is the one being decided. */
  readonly matures: number;
}

/** The course with ordinary weather and no new event. */
export function typicalOf(courses: Scope['courses']): Path {
  return courses[Math.floor(courses.length / 2)]?.paths[0] ?? [];
}

/** What was found of one danger: how likely it is and how soon it could come. */
export interface Finding {
  /** The chance of it, in thousandths. */
  readonly chance: number;
  /** How many quarters are played before it shows, at the soonest: 0 is the one being decided. */
  readonly soonest: number;
  /** True when it comes whatever the weather does, with no new event. */
  readonly sure: boolean;
  /** True when it comes only if an event begins. */
  readonly needsEvent: boolean;
  /** The event that brings it, when it comes with an event and not without. */
  readonly event: PossibleEvent | null;
}

/**
 * Weighs one danger across every path. `shows` says how many quarters into a path the
 * danger first shows, or null if it never does. A danger to one region answers to the
 * events that could strike that region; one to the whole country answers to them all.
 */
export function weigh(
  scope: Scope,
  shows: (path: Path) => number | null,
  regionId?: string,
): Finding | null {
  const { possible, courses } = scope;
  const own = possible.flatMap((event, index) =>
    regionId === undefined || event.regionId === regionId ? [{ event, index }] : [],
  );
  const anyOf = (events: readonly PossibleEvent[]) =>
    1 - events.reduce((none, event) => none * (1 - event.chance), 1);

  let chance = 0;
  const shown: number[] = [];
  let sure = true;
  let needsEvent = true;
  let bringer: PossibleEvent | null = null;
  for (const course of courses) {
    const unprompted = shows(course.paths[0] ?? []);
    if (unprompted !== null) {
      chance += course.weight;
      needsEvent = false;
      shown.push(unprompted);
      continue;
    }
    sure = false;
    // With each of its own events alone, and failing those with every event at once.
    const bringing = own.flatMap(({ event, index }) => {
      const quarters = shows(course.paths[index + 1] ?? []);
      return quarters === null ? [] : [{ event, quarters }];
    });
    const together = possible.length > 1 ? shows(course.paths.at(-1) ?? []) : null;
    if (bringing.length > 0) {
      chance += course.weight * anyOf(bringing.map((entry) => entry.event));
      bringer ??= bringing[0]?.event ?? null;
      shown.push(...bringing.map((entry) => entry.quarters));
    } else if (together !== null) {
      chance += course.weight * anyOf(possible);
      shown.push(together);
    }
  }
  if (shown.length === 0) return null;
  return {
    chance: Math.round(chance),
    soonest: Math.min(...shown),
    sure,
    needsEvent,
    event: needsEvent ? bringer : null,
  };
}

/** The likelihood a chance in thousandths amounts to, or null when it is negligible. */
export function likelihoodOf(chance: number): Likelihood | null {
  const from = balance.risks.likelihoodFromPermille;
  return LIKELIHOODS.findLast((likelihood) => chance >= from[likelihood]) ?? null;
}

/** When something comes, counted in quarters played before it: "this quarter", "in 3 quarters". */
export function when(quartersAway: number): string {
  if (quartersAway === 0) return 'this quarter';
  return quartersAway === 1 ? 'next quarter' : `in ${quartersAway} quarters`;
}
