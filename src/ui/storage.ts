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

/** Where the decisions tab the player last chose is remembered, for every country. */
const DECISION_TAB_KEY = 'survive-and-grow/decision-tab';

/** The decisions tab the player last chose, or null if there is none to be read. */
export function readDecisionTab(): string | null {
  try {
    return window.localStorage.getItem(DECISION_TAB_KEY);
  } catch {
    return null;
  }
}

/** Remembers the decisions tab chosen. If the browser refuses, it is simply forgotten. */
export function storeDecisionTab(tabId: string): void {
  try {
    window.localStorage.setItem(DECISION_TAB_KEY, tabId);
  } catch {
    // Storage full, blocked, or a private window: the tab stays chosen for this visit.
  }
}

/** How far the player has come in the tutorial game: its seed, and the lesson open. */
export interface TutorialProgress {
  readonly seed: number;
  readonly lesson: number;
}

/**
 * Where the tutorial progress for a saved game is kept: apart from the saves, so that nothing
 * reading saves meets it.
 */
const tutorialKey = (key: string) => `survive-and-grow/tutorial/${key.slice(KEY_PREFIX.length)}`;

/** The tutorial progress kept beside a saved game, or null if there is none to be read. */
export function readTutorial(key: string): TutorialProgress | null {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(tutorialKey(key)) ?? 'null') as unknown;
    if (typeof parsed !== 'object' || parsed === null) return null;
    const { seed, lesson } = parsed as Record<string, unknown>;
    return typeof seed === 'number' && typeof lesson === 'number' ? { seed, lesson } : null;
  } catch {
    return null;
  }
}

/** Keeps the tutorial progress, or with null forgets it. If the browser refuses, it is lost. */
export function storeTutorial(key: string, progress: TutorialProgress | null): void {
  try {
    if (progress === null) window.localStorage.removeItem(tutorialKey(key));
    else window.localStorage.setItem(tutorialKey(key), JSON.stringify(progress));
  } catch {
    // Storage full, blocked, or a private window: a reload starts the lessons over.
  }
}

/** Where the first-time tips the player has seen are remembered, for every country. */
const TIPS_SEEN_KEY = 'survive-and-grow/tips-seen';
/** Where it is remembered that the player has turned the tips off. */
const TIPS_OFF_KEY = 'survive-and-grow/tips-off';
/**
 * The tips seen in this visit. A browser that will not store them still shows each tip only
 * once while the page stays open.
 */
const tipsSeenThisVisit = new Set<string>();

/** The tips the player has seen, in this visit or before it. */
export function readTipsSeen(): ReadonlySet<string> {
  const seen = new Set(tipsSeenThisVisit);
  try {
    const parsed = JSON.parse(window.localStorage.getItem(TIPS_SEEN_KEY) ?? '[]') as unknown;
    if (Array.isArray(parsed)) {
      for (const id of parsed) if (typeof id === 'string') seen.add(id);
    }
  } catch {
    // Storage that cannot be read holds nothing seen before this visit.
  }
  return seen;
}

/** Remembers that a tip has been seen. If the browser refuses, it is remembered for this visit. */
export function storeTipSeen(tipId: string): void {
  const seen = readTipsSeen();
  tipsSeenThisVisit.add(tipId);
  try {
    window.localStorage.setItem(TIPS_SEEN_KEY, JSON.stringify([...seen, tipId]));
  } catch {
    // Storage full, blocked, or a private window: the visit's memory is enough.
  }
}

/** Whether the player has turned the tips off. Storage that cannot be read leaves them on. */
export function readTipsOff(): boolean {
  try {
    return window.localStorage.getItem(TIPS_OFF_KEY) === 'true';
  } catch {
    return false;
  }
}

/** Turns the tips off, or on again, which forgets every tip seen so they show afresh. */
export function storeTipsOff(off: boolean): void {
  if (!off) tipsSeenThisVisit.clear();
  try {
    if (off) {
      window.localStorage.setItem(TIPS_OFF_KEY, 'true');
    } else {
      window.localStorage.removeItem(TIPS_OFF_KEY);
      window.localStorage.removeItem(TIPS_SEEN_KEY);
    }
  } catch {
    // The choice holds for this visit only.
  }
}
