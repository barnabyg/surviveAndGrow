import tavaraFile from '../../src/countries/tavara.json';
import { loadCountry, type Country } from '../../src/sim';
import testlandFile from '../countries/testland.json';
import type { GameResult } from './batch';
import { DEGENERATE_PLAYERS, SCRIPTED_PLAYERS, type ScriptedPlayer } from './players';

/** The countries the balance run can play, by the name `BALANCE_COUNTRY` gives them. */
export const COUNTRIES: Readonly<Record<string, object>> = {
  tavara: tavaraFile,
  testland: testlandFile,
};

/**
 * Whether the world price shocks come as the country file says (`shipped`), or never
 * (`none`): the same games with no shock in them, since the shocks have draws of their own
 * and leave the weather and events of a seed as they were. `BALANCE_SHOCKS` chooses.
 */
export type ShockSetting = 'shipped' | 'none';

export function shockSetting(value: string | undefined): ShockSetting {
  if (value === undefined || value === '' || value === 'shipped') return 'shipped';
  if (value === 'none') return 'none';
  throw new Error(`BALANCE_SHOCKS must be shipped or none, but is "${value}".`);
}

export function countryNamed(name: string, shocks: ShockSetting = 'shipped'): Country {
  const file = COUNTRIES[name];
  if (file === undefined) {
    throw new Error(`BALANCE_COUNTRY must be tavara, testland or both, but is "${name}".`);
  }
  if (shocks === 'shipped') return loadCountry(file);
  return loadCountry({ ...file, priceShockLikelihood: { failedHarvestsAbroad: 0, oreGlut: 0 } });
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
  readonly shocks: ShockSetting;
  /** The file the worker writes its results to. */
  readonly out: string;
}

/** One game a worker played, and the player that played it. */
export interface Played {
  readonly player: string;
  readonly result: GameResult;
}
