/** How a game stands and the ways it can end. */

/** How a game stands: still being played, or ended in a win or a loss. */
export const OUTCOME_STATUSES = ['playing', 'won', 'lost'] as const;

/** The ways a game can end. */
export const ENDING_CAUSES = ['famine', 'election', 'prosperity'] as const;
