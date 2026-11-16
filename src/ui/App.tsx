import { useState } from 'react';
import tavaraFile from '../countries/tavara.json';
import { createGame, loadCountry, type GameState } from '../sim';
import { GameScreen } from './GameScreen';
import { StartScreen } from './StartScreen';

// The one country that ships. It goes through the same check as any other country file.
const country = loadCountry(tavaraFile);

/** A seed from the address (`?seed=7`) replays a known game. Otherwise each game is new. */
function chooseSeed(): number {
  const fromAddress = new URLSearchParams(window.location.search).get('seed');
  const seed = fromAddress === null ? Number.NaN : Number.parseInt(fromAddress, 10);
  if (Number.isSafeInteger(seed)) return seed;
  return crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
}

export function App() {
  const [game, setGame] = useState<GameState | null>(null);

  if (game === null) {
    return (
      <StartScreen
        country={country}
        onStart={() => {
          setGame(createGame(country, chooseSeed()));
        }}
      />
    );
  }
  return <GameScreen initialGame={game} />;
}
