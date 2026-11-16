import { useEffect, useState } from 'react';
import tavaraFile from '../countries/tavara.json';
import { CountryFileError, createGame, loadCountry, type Country, type GameState } from '../sim';
import { GameScreen } from './GameScreen';
import { StartScreen } from './StartScreen';

type CountrySource =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly country: Country }
  | { readonly status: 'rejected'; readonly faults: readonly string[] };

/** Every country file, shipped or not, goes through the same check. */
function readCountry(file: unknown): CountrySource {
  try {
    return { status: 'ready', country: loadCountry(file) };
  } catch (error) {
    if (error instanceof CountryFileError) return { status: 'rejected', faults: error.faults };
    throw error;
  }
}

/**
 * The country to play. It is the one that ships, unless the address names another country
 * file (`?country=/countries/mine.json`), which is how a country author tries out their work.
 */
function useCountry(): CountrySource {
  const [address] = useState(() => new URLSearchParams(window.location.search).get('country'));
  const [source, setSource] = useState<CountrySource>(() =>
    address === null ? readCountry(tavaraFile) : { status: 'loading' },
  );

  useEffect(() => {
    if (address === null) return;
    let wanted = true;
    fetch(address)
      .then((response) => response.json() as Promise<unknown>)
      .then(
        (file) => readCountry(file),
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

/** A seed from the address (`?seed=7`) replays a known game. Otherwise each game is new. */
function chooseSeed(): number {
  const fromAddress = new URLSearchParams(window.location.search).get('seed');
  const seed = fromAddress === null ? Number.NaN : Number.parseInt(fromAddress, 10);
  if (Number.isSafeInteger(seed)) return seed;
  return crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
}

export function App() {
  const source = useCountry();
  const [game, setGame] = useState<GameState | null>(null);

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
  if (game === null) {
    const { country } = source;
    return (
      <StartScreen
        country={country}
        onStart={() => {
          setGame(createGame(country, chooseSeed()));
        }}
      />
    );
  }
  return (
    <GameScreen
      initialGame={game}
      onRestart={() => {
        setGame(null);
      }}
    />
  );
}
