/** The neighbours: what each intends towards the country. */

/**
 * What a neighbour intends, from the best to the worst. It is read from the neighbour's
 * ambition, at the prosperity tier in force, against the country's deterrence.
 */
export const INTENTIONS = ['peaceful', 'watchful', 'hostile'] as const;
export type Intention = (typeof INTENTIONS)[number];

export const INTENTION_NAMES: Readonly<Record<Intention, string>> = {
  peaceful: 'Peaceful',
  watchful: 'Watchful',
  hostile: 'Hostile',
};
