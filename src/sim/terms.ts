import { balance } from './balance';
import { dateOfQuarter, quarterNumber } from './calendar';
import type { VitalSigns } from './history';
import type { Outcome } from './state';
import type { GameDate } from './types';

/**
 * Terms of office. The game runs over as many terms as the government keeps winning, each
 * `balance.election.termQuarters` long and closed by an election as its last quarter ends.
 * Terms are counted from 1, and every term falls on the same quarters in every game, so the
 * term a quarter belongs to is read off the calendar and never stored.
 */

/** The term a quarter of the game belongs to, the quarter counted from 1. */
export function termOfQuarter(number: number): number {
  return Math.max(1, Math.ceil(number / balance.election.termQuarters));
}

/** The first and last quarters of a term, counted like a quarter's number. */
export function termBounds(term: number): { readonly first: number; readonly last: number } {
  const { termQuarters } = balance.election;
  return { first: (term - 1) * termQuarters + 1, last: term * termQuarters };
}

/**
 * The term a game is in: the one the quarter being decided belongs to, or, once the game is
 * over, the one its last quarter belonged to.
 */
export function termOf(game: { readonly date: GameDate; readonly outcome?: Outcome }): number {
  const now = quarterNumber(game.date);
  const over = game.outcome !== undefined && game.outcome.status !== 'playing';
  return termOfQuarter(over ? now - 1 : now);
}

/** Whether the vote is held when this quarter is resolved: the last quarter of every term. */
export function isElectionQuarter(date: GameDate): boolean {
  return quarterNumber(date) % balance.election.termQuarters === 0;
}

/** A term as the end-of-game summary tells it. */
export interface TermRecord {
  /** Which term it was, counted from 1. */
  readonly term: number;
  /** Its first quarter. */
  readonly from: GameDate;
  /** The last quarter of it that was played. */
  readonly to: GameDate;
  /** How many of its quarters were played. */
  readonly quarters: number;
  /**
   * National prosperity, in thousandths, as the term began and as its last quarter played
   * left it. Either is null where the quarter was recorded before prosperity was measured.
   */
  readonly prosperity: { readonly start: number | null; readonly end: number | null };
  /**
   * How it ended: in re-election, in defeat at the vote, in the state's collapse, in the
   * prosperity win, or not at all, while the government is still in office.
   */
  readonly ending: 'reelected' | 'defeated' | 'collapsed' | 'won' | 'inOffice';
}

/**
 * Every term the government has served, the one it is in or ended in last, drawn from the
 * game's record of vital signs.
 */
export function termRecords(game: {
  readonly date: GameDate;
  readonly outcome: Outcome;
  readonly history: readonly VitalSigns[];
}): TermRecord[] {
  const played = quarterNumber(game.date) - 1;
  const current = termOf(game);
  const prosperityAt = (number: number) =>
    game.history.find((record) => quarterNumber(record.date) === number)?.prosperity ?? null;
  return Array.from({ length: current }, (_, index): TermRecord => {
    const term = index + 1;
    const { first, last } = termBounds(term);
    const lastPlayed = Math.min(last, played);
    return {
      term,
      from: dateOfQuarter(first),
      to: dateOfQuarter(Math.max(first, lastPlayed)),
      quarters: Math.max(0, lastPlayed - first + 1),
      // The signs recorded as a quarter begins are where the one before it left them.
      prosperity: { start: prosperityAt(first), end: prosperityAt(lastPlayed + 1) },
      ending: term < current ? 'reelected' : endingOf(game.outcome),
    };
  });
}

function endingOf(outcome: Outcome): TermRecord['ending'] {
  if (outcome.status === 'playing') return 'inOffice';
  switch (outcome.cause) {
    case 'election':
      return 'defeated';
    case 'famine':
      return 'collapsed';
    case 'prosperity':
      return 'won';
  }
}
