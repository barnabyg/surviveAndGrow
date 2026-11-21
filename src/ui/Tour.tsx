import { useEffect, useId, useRef, useState } from 'react';
import { cardPlace, outlinePlace, tourSelector, useSpotlight } from './spotlight';
import { TOUR_STEPS } from './tourSteps';
import './Tour.css';

interface TourProps {
  /** The step shown, by its place in TOUR_STEPS. */
  readonly step: number;
  readonly onStep: (step: number) => void;
  readonly onEnd: () => void;
}

function onScreen(index: number): boolean {
  const target = TOUR_STEPS[index]?.target;
  if (target === undefined) return false;
  return target === null || document.querySelector(tourSelector(target)) !== null;
}

/** The next step in the given direction whose element is on screen, or null if none is. */
function nextShown(from: number, direction: 1 | -1): number | null {
  for (let index = from + direction; index >= 0 && index < TOUR_STEPS.length; index += direction) {
    if (onScreen(index)) return index;
  }
  return null;
}

/**
 * The guided tour of the main screen: a step at a time, it picks out one part of the screen
 * and says what it is for. It holds the screen while it is open, as a dialog does. Focus goes
 * to the tour, and back to where it was when the tour ends.
 */
export function Tour({ step, onStep, onEnd }: TourProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const forward = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  // The steps whose element is on screen, by their place in TOUR_STEPS.
  const [shown, setShown] = useState<readonly number[]>([]);
  const current = TOUR_STEPS[step];
  const { box, cardHeight } = useSpotlight(current?.target ?? null, card);

  useEffect(() => {
    const element = dialog.current;
    const before = document.activeElement;
    if (element && !element.open) element.showModal();
    return () => {
      if (before instanceof HTMLElement && before.isConnected) before.focus();
    };
  }, []);

  // Each step keeps focus in the tour. Back is disabled on the first step, and a disabled
  // button loses focus, so focus moves on to the button that goes forward.
  useEffect(() => {
    const focused = document.activeElement;
    const keep =
      focused instanceof HTMLButtonElement &&
      !focused.disabled &&
      dialog.current?.contains(focused) === true;
    if (!keep) forward.current?.focus();
  }, [step]);

  // Which steps can be shown is read from the screen once it has settled.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setShown(TOUR_STEPS.flatMap((_, index) => (onScreen(index) ? [index] : [])));
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [step]);

  if (current === undefined) return null;
  const previous = nextShown(step, -1);
  const next = nextShown(step, 1);
  const position = shown.indexOf(step) + 1;
  const go = (index: number | null) => {
    if (index !== null) onStep(index);
  };

  return (
    <dialog
      ref={dialog}
      className="tour"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onEnd();
      }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight') go(next);
        else if (event.key === 'ArrowLeft') go(previous);
        else return;
        event.preventDefault();
      }}
    >
      {box === null ? (
        <div className="tour__shade" />
      ) : (
        <div className="tour__spotlight" style={outlinePlace(box)} />
      )}
      <div ref={card} className="tour__card" style={cardPlace(box, cardHeight)}>
        <p className="tour__count">
          Tour of the screen{position > 0 && ` · ${position} of ${shown.length}`}
        </p>
        <h2 className="tour__title" id={titleId}>
          {current.title}
        </h2>
        <p className="tour__text">{current.text}</p>
        <div className="button-row tour__actions">
          <button type="button" className="button" onClick={onEnd}>
            End tour
          </button>
          <button
            type="button"
            className="button"
            disabled={previous === null}
            onClick={() => {
              go(previous);
            }}
          >
            Back
          </button>
          <button
            type="button"
            className="button button--commit"
            ref={forward}
            onClick={() => {
              if (next === null) onEnd();
              else go(next);
            }}
          >
            {next === null ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </dialog>
  );
}
