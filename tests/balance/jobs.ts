import tavaraFile from '../../src/countries/tavara.json';
import { loadCountry, type Country } from '../../src/sim';
import testlandFile from '../countries/testland.json';
import type { GameResult } from './batch';
import { DEGENERATE_PLAYERS, SCRIPTED_PLAYERS, type ScriptedPlayer } from './players';

/** The countries the balance run can play, by the name `BALANCE_COUNTRY` gives them. */
export const COUNTRIES: Readonly<Record<string, () => Country>> = {
  tavara: () => loadCountry(tavaraFile),
  testland: () => loadCountry(testlandFile),
};

export function countryNamed(name: string): Country {
  const load = COUNTRIES[name];
  if (load === undefined) {
    throw new Error(`BALANCE_COUNTRY must be tavara, testland or both, but is "${name}".`);
  }
  return load();
}

/**
 * The players a run plays: the scripted ones, with `all` the one-lever ones too, or the
 * players named, separated by commas.
 */
export function playersFor(which: string | undefined): readonly ScriptedPlayer[] {
  if (which === undefined || which === '') return SCRIPTED_PLAYERS;
  if (which === 'all') return [...SCRIPTED_PLAYERS, ...DEGENERATE_PLAYERS];
  return playersNamed(which.split(',').map((name) => name.trim()));
}

/** The players of the names given, in that order. */
export function playersNamed(names: readonly string[]): ScriptedPlayer[] {
  const all = [...SCRIPTED_PLAYERS, ...DEGENERATE_PLAYERS];
  return names.map((name) => {
    const player = all.find((candidate) => candidate.name === name);
    if (player === undefined) throw new Error(`There is no scripted player "${name}".`);
    return player;
  });
}

/** A share of a balance run that one worker plays. */
export interface Job {
  readonly country: string;
  readonly players: readonly string[];
  readonly seeds: readonly number[];
  readonly terms: number;
  /** The file the worker writes its results to. */
  readonly out: string;
}

/** One game a worker played, and the player that played it. */
export interface Played {
  readonly player: string;
  readonly result: GameResult;
}
