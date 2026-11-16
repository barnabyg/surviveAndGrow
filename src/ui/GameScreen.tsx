import { useState } from 'react';
import { advanceQuarter, type GameState } from '../sim';
import { MapView } from './MapView';
import { TopBar } from './TopBar';

export function GameScreen({ initialGame }: { readonly initialGame: GameState }) {
  const [game, setGame] = useState(initialGame);

  const endQuarter = () => {
    setGame(advanceQuarter(game, {}).state);
  };

  return (
    <div className="game">
      <TopBar game={game} onEndQuarter={endQuarter} />
      <div className="columns">
        <aside className="column column--situation" aria-label="Situation">
          <h2 className="section-title">This quarter</h2>
        </aside>
        <main className="column column--country" aria-label="Country">
          <MapView country={game.country} />
        </main>
        <aside className="column column--decisions" aria-label="Decisions">
          <h2 className="section-title">Budget</h2>
        </aside>
      </div>
    </div>
  );
}
