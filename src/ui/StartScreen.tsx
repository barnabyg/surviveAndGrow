import { useState } from 'react';
import type { Country, GameState } from '../sim';
import { ConfirmDialog } from './ConfirmDialog';
import { Crest } from './Crest';
import { formatDate } from './format';
import type { StoredGame } from './storage';

interface StartScreenProps {
  readonly country: Country;
  /** What the browser holds for this country: nothing, a game to resume, or a save it cannot open. */
  readonly stored: StoredGame;
  readonly onStart: () => void;
  /** Opens the saved game where it was left. */
  readonly onResume: () => void;
  /** Removes a save that cannot be opened, once the player has said so. */
  readonly onDiscard: () => void;
}

/** A saved game in a line: where it stands, or how it ended. */
function describeSave(game: GameState): string {
  return game.outcome.status === 'playing'
    ? `${game.country.name}, ${formatDate(game.date)}.`
    : `${game.country.name}, finished. ${game.outcome.headline}.`;
}

export function StartScreen({ country, stored, onStart, onResume, onDiscard }: StartScreenProps) {
  const [discarding, setDiscarding] = useState(false);
  const resumable = stored.status === 'ready';
  return (
    <main className="start">
      <Crest size={96} />
      <h1 className="start__title">Survive and Grow</h1>
      <p className="start__lead">
        {country.name} is yours to lead. Raise its living standards, and stay in office long enough
        to see it done.
      </p>

      {stored.status === 'ready' && (
        <section className="start__saved" aria-labelledby="saved-game-title">
          <h2 className="label" id="saved-game-title">
            Saved game
          </h2>
          <p className="start__save">{describeSave(stored.game)}</p>
          <p className="start__note">
            The game is saved as each quarter ends. Starting a new game replaces it when the new
            game’s first quarter ends.
          </p>
        </section>
      )}
      {stored.status === 'refused' && (
        <section className="start__saved" aria-labelledby="saved-game-title">
          <h2 className="label" id="saved-game-title">
            Saved game
          </h2>
          <p className="warning-note">▲ {stored.reason}</p>
          <p className="start__note">
            It has been left as it is. A new game started now will not be saved, so that nothing is
            written over it.
          </p>
          <button
            type="button"
            className="button"
            onClick={() => {
              setDiscarding(true);
            }}
          >
            Discard the saved game
          </button>
        </section>
      )}

      <div className="start__actions">
        {resumable && (
          <button type="button" className="button button--primary" onClick={onResume}>
            Resume saved game
          </button>
        )}
        <button
          type="button"
          className={resumable ? 'button start__second' : 'button button--primary'}
          onClick={onStart}
        >
          Start new game
        </button>
      </div>

      {discarding && (
        <ConfirmDialog
          title="Discard the saved game?"
          cancelLabel="Keep it"
          confirmLabel="Discard it"
          onCancel={() => {
            setDiscarding(false);
          }}
          onConfirm={() => {
            setDiscarding(false);
            onDiscard();
          }}
        >
          The saved game will be removed from this browser and cannot be brought back. A newer
          release of the game might still have been able to open it.
        </ConfirmDialog>
      )}
    </main>
  );
}
