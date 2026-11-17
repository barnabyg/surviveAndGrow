import { loadSave, SaveError, saveGame, type GameState, type TurnReport } from '../sim';

/**
 * Where saved games are kept in the browser. The simulation says what a save holds and
 * whether one can be opened; this is the only place that touches storage.
 */
const KEY_PREFIX = 'survive-and-grow/save/';

/**
 * The key one country's game is kept under. A country file served beside the game
 * (`?country=`) is kept apart from the country built into it, by the address it came from,
 * so trying out a file never touches the game being played on the real one.
 */
export function saveKey(countryId: string, address: string | null): string {
  return address === null
    ? `${KEY_PREFIX}built-in/${countryId}`
    : `${KEY_PREFIX}file${new URL(address, window.location.href).pathname}`;
}

/** What storage holds for a country: nothing, a game to resume, or a save that cannot be opened. */
export type StoredGame =
  | { readonly status: 'none' }
  | { readonly status: 'ready'; readonly game: GameState; readonly report: TurnReport | null }
  /** The save is refused. `reason` says why, in words for the player. */
  | { readonly status: 'refused'; readonly reason: string };

export function readStoredGame(key: string): StoredGame {
  let text: string | null;
  try {
    text = window.localStorage.getItem(key);
  } catch {
    // Storage that cannot be read holds nothing to resume. Saving will say so if it fails too.
    return { status: 'none' };
  }
  if (text === null) return { status: 'none' };
  try {
    return { status: 'ready', ...loadSave(JSON.parse(text) as unknown) };
  } catch (error) {
    if (error instanceof SaveError) return { status: 'refused', reason: error.message };
    if (error instanceof SyntaxError) {
      return {
        status: 'refused',
        reason: 'The saved game is damaged and cannot be opened: it is not a saved game.',
      };
    }
    throw error;
  }
}

/** Stores a game with the report on its last quarter. Returns whether it was stored. */
export function storeGame(key: string, game: GameState, report: TurnReport | null): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(saveGame(game, report)));
    return true;
  } catch {
    // The browser may refuse: storage full, blocked, or a private window. The game plays on.
    return false;
  }
}

/** Removes what is stored for a country. Returns whether it is gone. */
export function discardStoredGame(key: string): boolean {
  try {
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
