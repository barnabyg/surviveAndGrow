import { useEffect, useRef } from 'react';
import type { DilemmaOptionView, DilemmaView } from '../sim';
import './DilemmaDialog.css';

interface DilemmaDialogProps {
  readonly dilemma: DilemmaView;
  /** The name of the region it concerns, or null when it concerns the whole country. */
  readonly regionName: string | null;
  /** The option chosen so far, which can still be changed until the quarter ends. */
  readonly chosen: string | null;
  /** True when the player has tried to end the quarter without choosing. */
  readonly pressed: boolean;
  readonly onChoose: (optionId: string) => void;
  /** Puts the dilemma aside for now. It still has to be answered before the quarter ends. */
  readonly onLater: () => void;
}

/**
 * A dilemma put to the player: the situation, and each option as a button that states
 * everything it will do before it is chosen. Escape puts it aside for later.
 */
export function DilemmaDialog(props: DilemmaDialogProps) {
  const { dilemma, regionName, chosen, pressed, onChoose, onLater } = props;
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
  }, []);

  return (
    <dialog
      ref={dialog}
      className="dialog dialog--dilemma"
      aria-labelledby="dilemma-title"
      onCancel={(event) => {
        event.preventDefault();
        onLater();
      }}
    >
      <div className="label label--pending">
        A decision is needed{regionName === null ? '' : ` · ${regionName}`}
      </div>
      <h2 className="dialog__title" id="dilemma-title">
        {dilemma.title}
      </h2>
      <div className="dialog__body">
        <p>{dilemma.story}</p>
      </div>
      <ul className="dilemma__options">
        {dilemma.options.map((option) => (
          <li key={option.id}>
            <button
              type="button"
              className="dilemma__option"
              aria-pressed={option.id === chosen}
              disabled={option.unavailable !== null}
              onClick={() => {
                onChoose(option.id);
              }}
            >
              <span className="dilemma__label">{option.label}</span>
              {effectLines(option).map((line) => (
                <span key={line} className="dilemma__effect">
                  {line}
                </span>
              ))}
              {option.unavailable !== null && (
                <span className="dilemma__effect warning-note">
                  ▲ Cannot be chosen. {option.unavailable}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
      <p className={pressed ? 'warning-note' : 'dilemma__note'}>
        {pressed ? '▲ ' : ''}The quarter cannot end until you choose. Your choice takes effect when
        the quarter ends, and can be changed until then.
      </p>
      <div className="button-row">
        <button type="button" className="button" onClick={onLater}>
          Decide later
        </button>
      </div>
    </dialog>
  );
}

/** Everything an option will do, a sentence to a line. An option that does nothing says so. */
export function effectLines(option: DilemmaOptionView): string[] {
  return option.effects.length === 0
    ? ['Nothing changes.']
    : option.effects.map((effect) => `${effect}.`);
}
