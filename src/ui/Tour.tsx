import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { TOUR_STEPS, tourSelector } from './tourSteps';
import './Tour.css';

interface TourProps {
  /** The step shown, by its place in TOUR_STEPS. */
  readonly step: number;
  readonly onStep: (step: number) => void;
  readonly onEnd: () => void;
}

/** Where the picked-out element stands in the window, and which steps can be shown. */
interface Layout {
  readonly box: DOMRect | null;
  /** The steps whose element is on screen, by their place in TOUR_STEPS. */
  readonly shown: readonly number[];
}

const CARD_WIDTH = 420;
const GAP = 18;
/** The space around the picked-out element, so the outline does not sit on its edge. */
const PAD = 6;

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

/** Places the card beside the box: right, then left, then below, then above, kept in the window. */
function cardPlace(box: DOMRect | null, height: number): CSSProperties {
  const width = window.innerWidth;
  const tall = window.innerHeight;
  if (box === null) {
    return { left: (width - CARD_WIDTH) / 2, top: Math.max(GAP, (tall - height) / 2) };
  }
  const clampTop = (top: number) => Math.min(Math.max(GAP, top), tall - height - GAP);
  const clampLeft = (left: number) => Math.min(Math.max(GAP, left), width - CARD_WIDTH - GAP);
  if (box.right + PAD + GAP + CARD_WIDTH <= width - GAP) {
    return { left: box.right + PAD + GAP, top: clampTop(box.top) };
  }
  if (box.left - PAD - GAP - CARD_WIDTH >= GAP) {
    return { left: box.left - PAD - GAP - CARD_WIDTH, top: clampTop(box.top) };
  }
  if (box.bottom + PAD + GAP + height <= tall - GAP) {
    return { left: clampLeft(box.left), top: box.bottom + PAD + GAP };
  }
  return { left: clampLeft(box.left), top: clampTop(box.top - PAD - GAP - height) };
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
  const [layout, setLayout] = useState<Layout>({ box: null, shown: [] });
  const [cardHeight, setCardHeight] = useState(0);
  const current = TOUR_STEPS[step];
  const target = current?.target ?? null;

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

  // The picked-out element is measured once the screen has settled, which is after a
  // collapsed panel has opened for its step, and again whenever the window moves under it.
  useLayoutEffect(() => {
    const element = target === null ? null : document.querySelector(tourSelector(target));
    element?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setLayout({
          box: element?.getBoundingClientRect() ?? null,
          shown: TOUR_STEPS.flatMap((_, index) => (onScreen(index) ? [index] : [])),
        });
        setCardHeight(card.current?.offsetHeight ?? 0);
      });
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [target]);

  if (current === undefined) return null;
  const previous = nextShown(step, -1);
  const next = nextShown(step, 1);
  const position = layout.shown.indexOf(step) + 1;
  const { box } = layout;
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
        <div
          className="tour__spotlight"
          style={{
            left: box.left - PAD,
            top: box.top - PAD,
            width: box.width + PAD * 2,
            height: box.height + PAD * 2,
          }}
        />
      )}
      <div ref={card} className="tour__card" style={cardPlace(box, cardHeight)}>
        <p className="tour__count">
          Tutorial{position > 0 && ` · ${position} of ${layout.shown.length}`}
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
