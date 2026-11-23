/** Dilemmas: the ones the engine knows, where they can arise and what an option can do. */

/**
 * The dilemmas the engine knows: events that put a choice to the player. A country file
 * says how likely each is to arise.
 */
export const DILEMMA_TYPES = [
  'grainOffer',
  'merchantOffer',
  'emergencyWorks',
  'strikeTalks',
  'teachersPay',
  'donorGrant',
] as const;
export type DilemmaType = (typeof DILEMMA_TYPES)[number];

/**
 * The kinds of place a dilemma can concern. The region is chosen from the state of the game
 * by the kind, never by name: one an event has struck, or one that is striking or protesting.
 */
export const DILEMMA_PLACES = ['struckByEvent', 'inUnrest'] as const;
export type DilemmaPlace = (typeof DILEMMA_PLACES)[number];

/** The kinds of effect a dilemma's option can have on the country. */
export const DILEMMA_EFFECT_KINDS = ['treasury', 'reserve', 'regionGrain', 'approval'] as const;
