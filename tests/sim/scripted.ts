// The scripted players of the balance batch (tests/balance/players.ts) as the simulation tests
// play them: a player by its name, the ways its game can end, and how long a test of a whole
// game is given.
import type { GameResult } from '../balance/batch';
import { DEGENERATE_PLAYERS, SCRIPTED_PLAYERS, type ScriptedPlayer } from '../balance/players';

/**
 * The limit for a test that plays a scripted player's game. A whole game of several terms
 * takes a second or two, and a single term of a builder's game a second or so; both take
 * longer while the rest of the suite runs alongside, and the default limit of five seconds is
 * too close.
 */
export const GAME_TIMEOUT = 30_000;

/** Every way a game played for the balance can end. */
export const ENDINGS: readonly GameResult['ending'][] = [
  'won',
  'inOffice',
  'lostElection',
  'famine',
];

/** The scripted player of a name, the one-lever players among them. */
export function playerNamed(name: string): ScriptedPlayer {
  const player = [...SCRIPTED_PLAYERS, ...DEGENERATE_PLAYERS].find(
    (candidate) => candidate.name === name,
  );
  if (player === undefined) throw new Error(`There is no player "${name}".`);
  return player;
}
