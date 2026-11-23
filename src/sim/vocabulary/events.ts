/** Events: the kinds that can strike a region. */

/**
 * The kinds of event the engine knows. A country file says how likely each is, region by
 * region. The events that begin in the same quarter share one roll in each region, taken in
 * this order (`rollEvents`), so a new kind goes at the end and leaves the others' strikes as
 * they were.
 */
export const EVENT_TYPES = ['drought', 'flood'] as const;
export type EventType = (typeof EVENT_TYPES)[number];
