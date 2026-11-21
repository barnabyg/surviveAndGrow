import { useEffect, useState } from 'react';
import tavaraFile from '../countries/tavara.json';
import {
  CountryFileError,
  createGame,
  loadCountry,
  type Country,
  type GameState,
  type TurnReport,
} from '../sim';
import { GameScreen } from './GameScreen';
import { StartScreen } from './StartScreen';
import {
  discardStoredGame,
  readStoredGame,
  readTutorial,
  saveKey,
  storeGame,
  storeTutorial,
  type StoredGame,
} from './storage';
import { TUTORIAL_SEED } from './tutorialGame';

type CountrySource =
  | { readonly status: 'loading' }
  | {
      readonly status: 'ready';
      readonly country: Country;
      /** The address the country file was served from, or null for the one built in. */
      readonly address: string | null;
    }
  | { readonly status: 'rejected'; readonly faults: readonly string[] };

/** Every country file, shipped or not, goes through the same check. */
function readCountry(file: unknown, address: string | null): CountrySource {
  try {
    return { status: 'ready', country: loadCountry(file), address };
  } catch (error) {
    if (error instanceof CountryFileError) return { status: 'rejected', faults: error.faults };
    throw error;
  }
}

/**
 * The country to play. It is the one that ships, unless the address names another country
 * file (`?country=/countries/mine.json`), which is how a country author tries out their work.
 * The file must be served by this site: the game does not fetch from anywhere else.
 */
function useCountry(): CountrySource {
  const [address] = useState(() => new URLSearchParams(window.location.search).get('country'));
  const [source, setSource] = useState<CountrySource>(() => {
    if (address === null) return readCountry(tavaraFile, null);
    if (new URL(address, window.location.href).origin !== window.location.origin) {
      return {
        status: 'rejected',
        faults: [`Country files are read from this site only, and ${address} is elsewhere.`],
      };
    }
    return { status: 'loading' };
  });

  useEffect(() => {
    if (address === null) return;
    const location = new URL(address, window.location.href);
    if (location.origin !== window.location.origin) return;
    let wanted = true;
    fetch(location)
      .then((response) => response.json() as Promise<unknown>)
      .then(
        (file) => readCountry(file, address),
        (): CountrySource => ({
          status: 'rejected',
          faults: [`No country file could be read from ${address}.`],
        }),
      )
      .then((loaded) => {
        if (wanted) setSource(loaded);
      })
      .catch((error: unknown) => {
        console.error(error);
      });
    return () => {
      wanted = false;
    };
  }, [address]);

  return source;
}

/**
 * Names a seed in the address, or with null takes the seed out of it. The address names a
 * seed exactly when the player has asked for a known game, so reloading the page and
 * replaying from the summary screen agree on which game that is.
 */
function writeSeedToAddress(seed: number | null): void {
  const address = new URL(window.location.href);
  if (seed === null) address.searchParams.delete('seed');
  else address.searchParams.set('seed', String(seed));
  window.history.replaceState(null, '', address);
}

/**
 * A seed from the address (`?seed=7`) is the seed of the next new game, which replays a known
 * game. Otherwise each game is new. It never stands in the way of a saved game: that is
 * still offered first, and the seed counts only if the player starts a new game instead.
 */
function chooseSeed(): number {
  const fromAddress = new URLSearchParams(window.location.search).get('seed');
  const seed = fromAddress === null ? Number.NaN : Number.parseInt(fromAddress, 10);
  if (Number.isSafeInteger(seed)) return seed;
  return crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
}

export function App() {
  const source = useCountry();

  if (source.status === 'loading') {
    return (
      <main className="start">
        <p className="start__lead">Loading the country…</p>
      </main>
    );
  }
  if (source.status === 'rejected') {
    return (
      <main className="start">
        <h1 className="start__title">This country file cannot be used</h1>
        <ul className="faults">
          {source.faults.map((fault) => (
            <li key={fault}>{fault}</li>
          ))}
        </ul>
      </main>
    );
  }
  const storageKey = saveKey(source.country.id, source.address);
  return <Session key={storageKey} country={source.country} storageKey={storageKey} />;
}

/** A game on screen: where it stands, and the report on its last quarter if one has ended. */
interface Play {
  readonly game: GameState;
  readonly report: TurnReport | null;
  /** The tutorial lesson the game opens on, or null outside the tutorial. */
  readonly lesson: number | null;
}

interface SessionProps {
  /** The country the page was opened on, which a new game is started in. */
  readonly country: Country;
  /** Where this country's game is kept in the browser. */
  readonly storageKey: string;
}

/**
 * One visit to the game on one country: the start screen, then a game, saved as each
 * quarter ends. A save the game cannot open is never written over: while one is there,
 * nothing is saved, until the player discards it.
 */
function Session({ country, storageKey }: SessionProps) {
  const [stored, setStored] = useState<StoredGame>(() => readStoredGame(storageKey));
  const [play, setPlay] = useState<Play | null>(null);
  // Counts the games begun, so that each one gets a screen of its own with nothing
  // carried over from the last.
  const [playNumber, setPlayNumber] = useState(0);
  const [storingFailed, setStoringFailed] = useState(false);

  const begin = (next: Play) => {
    setPlay(next);
    setPlayNumber(playNumber + 1);
    setStoringFailed(false);
  };

  if (play === null) {
    return (
      <StartScreen
        country={country}
        stored={stored}
        onStart={() => {
          storeTutorial(storageKey, null);
          begin({ game: createGame(country, chooseSeed()), report: null, lesson: null });
        }}
        onTutorial={() => {
          storeTutorial(storageKey, { seed: TUTORIAL_SEED, lesson: 0 });
          begin({ game: createGame(country, TUTORIAL_SEED), report: null, lesson: 0 });
        }}
        onResume={() => {
          if (stored.status !== 'ready') return;
          // The tutorial picks up where it was, if the saved game is the tutorial's.
          const progress = readTutorial(storageKey);
          const lesson =
            progress !== null && progress.seed === stored.game.seed ? progress.lesson : null;
          begin({ game: stored.game, report: stored.report, lesson });
        }}
        onDiscard={() => {
          if (discardStoredGame(storageKey)) setStored({ status: 'none' });
        }}
      />
    );
  }

  const { game } = play;
  const replay = () => {
    writeSeedToAddress(game.seed);
    // The same game again is the same seed on the country this game was played on.
    storeTutorial(storageKey, null);
    begin({ game: createGame(game.country, game.seed), report: null, lesson: null });
  };
  const newGame = () => {
    // A new game is a different game, so the address stops naming this one's seed.
    writeSeedToAddress(null);
    setPlay(null);
  };
  const saveNotice =
    stored.status === 'refused'
      ? 'This game is not being saved, so that the saved game which could not be opened is left as it is.'
      : storingFailed
        ? 'The game could not be saved: the browser would not store it. You can play on, but this game will be lost when the page is closed.'
        : null;
  return (
    <GameScreen
      key={playNumber}
      initialGame={game}
      initialReport={play.report}
      saveNotice={saveNotice}
      initialLesson={play.lesson}
      onLessonChange={(lesson) => {
        storeTutorial(storageKey, lesson === null ? null : { seed: game.seed, lesson });
      }}
      onQuarterEnded={(ended, report) => {
        if (stored.status === 'refused') return;
        const kept = storeGame(storageKey, ended, report);
        if (kept) setStored({ status: 'ready', game: ended, report });
        setStoringFailed(!kept);
      }}
      onReplay={replay}
      onNewGame={newGame}
      onRestart={(how) => {
        // The player has given this game up, so its save goes too and a reload does not
        // bring it back. A save the game could not open is still never touched.
        if (stored.status !== 'refused' && discardStoredGame(storageKey)) {
          setStored({ status: 'none' });
        }
        if (how === 'replay') replay();
        else newGame();
      }}
    />
  );
}
