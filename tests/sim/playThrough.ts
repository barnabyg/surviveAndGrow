// What docs/playing.md states of the seed its play-through is played on, rendered from games
// played on that seed, so that a change to the game which moves an outcome fails a test.
import { readFileSync } from 'node:fs';
import { formatPercent } from '../../src/sim';
import type { GameResult } from '../balance/batch';

/** The seed of the play-through, on Tavara as it ships. */
export const PLAY_THROUGH_SEED = 1;

const ORDINALS = ['', 'first', 'second', 'third', 'fourth'] as const;

/** A small place in words, as the play-through gives it: `third`. */
export function ordinal(place: number): string {
  const word = ORDINALS[place];
  if (word === undefined || word === '') throw new Error(`No word for place ${String(place)}`);
  return word;
}

/** The play-through's section of the doc, with every run of whitespace made one space. */
export function playThroughText(): string {
  const doc = readFileSync(new URL('../../docs/playing.md', import.meta.url), 'utf8');
  const start = doc.indexOf('## A play-through');
  if (start < 0) throw new Error('docs/playing.md has no play-through.');
  return doc.slice(start).replace(/\s+/g, ' ');
}

/**
 * How a game ended, in the words the play-through uses. A game that ends in a way the
 * play-through has no words for throws: its sentence needs writing afresh, here and there.
 */
function outcome(result: GameResult, termQuarters: number): string {
  if (result.ending === 'won') {
    const term = Math.ceil(result.quarters / termQuarters);
    const year = Math.ceil((result.quarters - (term - 1) * termQuarters) / 4);
    return `wins in quarter ${String(result.quarters)}, in the ${ordinal(year)} year of its ${ordinal(term)} term`;
  }
  if (result.ending === 'lostElection' && result.terms === 1 && result.voteShare !== null) {
    return `loses its first vote with ${formatPercent(result.voteShare)}`;
  }
  if (result.ending === 'lostElection' && result.terms === 2) {
    return 'wins its first vote and loses its second';
  }
  if (result.ending === 'lostElection' && result.terms === 3) {
    return 'wins its first two votes and loses its third';
  }
  throw new Error(
    `The play-through has no words for a game ending ${result.ending} in term ${String(result.terms)}.`,
  );
}

/** The words that introduce each scripted player the play-through names. */
const INTRODUCED: ReadonlyMap<string, string> = new Map([
  ['Chain builder', 'chain builder, which never trades,'],
  ['Timing trader', 'trades grain besides,'],
  ['Improver', 'the technologies that improve them,'],
]);

/** The scripted players whose whole games the play-through says the ending of. */
export const PLAY_THROUGH_PLAYERS: readonly string[] = [...INTRODUCED.keys()];

/**
 * What the play-through says of a scripted player, from that player's whole game on its seed:
 * the words that introduce the player, then how its game ended. Null for a player it does not
 * name.
 */
export function playThroughOutcome(
  player: string,
  result: GameResult,
  termQuarters: number,
): string | null {
  const introduced = INTRODUCED.get(player);
  return introduced === undefined ? null : `${introduced} ${outcome(result, termQuarters)}`;
}
