import { useEffect, useRef } from 'react';
import type { GameState } from '../sim';

interface GameOverDialogProps {
  readonly game: GameState;
  readonly onRestart: () => void;
}

/** The end of the game: what happened, why, and a way to start again. */
export function GameOverDialog({ game, onRestart }: GameOverDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
  }, []);

  if (game.outcome.status !== 'lost') return null;
  const { date } = game;
  return (
    <dialog
      ref={dialog}
      className="dialog dialog--danger"
      aria-labelledby="game-over-title"
      onCancel={(event) => {
        // The game is over; there is nothing behind this to go back to.
        event.preventDefault();
      }}
    >
      <div className="label label--danger">You have lost</div>
      <h2 className="dialog__title" id="game-over-title">
        The state has collapsed
      </h2>
      <div className="dialog__body">
        <p>{game.outcome.summary}</p>
        <p>
          Your government fell at the start of year {date.year}, quarter {date.quarter}. The
          warnings were in the quarterly reports and on the map: food relief sent in time would have
          held the famine off.
        </p>
      </div>
      <div className="button-row">
        <button type="button" className="button button--commit" onClick={onRestart}>
          Start a new game
        </button>
      </div>
    </dialog>
  );
}
