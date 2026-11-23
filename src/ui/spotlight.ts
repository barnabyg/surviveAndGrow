import {
  createContext,
  useEffect,
  useLayoutEffect,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react';

/**
 * The element the tour is picking out, or null when no tour is open. A collapsed decision
 * panel opens while the tour points at it.
 */
export const TourTarget = createContext<string | null>(null);

/** Where an element stands in the window. */
export interface Box {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

const CARD_WIDTH = 420;
const GAP = 18;
/** The space around the picked-out element, so the outline does not sit on its edge. */
const PAD = 6;

/** The selector of the element a tour step or a lesson picks out. */
export function tourSelector(target: string): string {
  return `[data-tour="${target}"]`;
}

/**
 * The element drawn round for a target: the one marked, or, while that one is not shown, the
 * element that labels it. A decision panel behind another tab stands nowhere on the screen,
 * and is labelled by the tab that opens it, so a tip about it points there. The tour and the
 * lessons show the tab they point at, so they find the panel itself.
 */
function standingFor(target: string): Element | null {
  const marked = document.querySelector(tourSelector(target));
  if (marked === null || marked.getClientRects().length > 0) return marked;
  const label = marked.getAttribute('aria-labelledby');
  return label === null ? null : document.getElementById(label);
}

/** The outline drawn round a box, a little outside it. */
export function outlinePlace(box: Box): CSSProperties {
  return {
    left: box.left - PAD,
    top: box.top - PAD,
    width: box.width + PAD * 2,
    height: box.height + PAD * 2,
  };
}

/**
 * Places the card beside the box: below a wide one, otherwise right, then left, then below,
 * then above, kept in the window.
 */
export function cardPlace(box: Box | null, height: number): CSSProperties {
  const width = window.innerWidth;
  const tall = window.innerHeight;
  if (box === null) {
    return { left: (width - CARD_WIDTH) / 2, top: Math.max(GAP, (tall - height) / 2) };
  }
  const right = box.left + box.width;
  const bottom = box.top + box.height;
  const clampTop = (top: number) => Math.min(Math.max(GAP, top), tall - height - GAP);
  const clampLeft = (left: number) => Math.min(Math.max(GAP, left), width - CARD_WIDTH - GAP);
  // Beside a box as wide as half the window, the card would only cover the column next to
  // it, so it goes below if it fits there.
  if (box.width > width / 2 && bottom + PAD + GAP + height <= tall - GAP) {
    return { left: clampLeft(right - CARD_WIDTH), top: bottom + PAD + GAP };
  }
  if (right + PAD + GAP + CARD_WIDTH <= width - GAP) {
    return { left: right + PAD + GAP, top: clampTop(box.top) };
  }
  if (box.left - PAD - GAP - CARD_WIDTH >= GAP) {
    return { left: box.left - PAD - GAP - CARD_WIDTH, top: clampTop(box.top) };
  }
  if (bottom + PAD + GAP + height <= tall - GAP) {
    return { left: clampLeft(box.left), top: bottom + PAD + GAP };
  }
  return { left: clampLeft(box.left), top: clampTop(box.top - PAD - GAP - height) };
}

interface Spotlight {
  /** Where the picked-out element stands, or null when there is none on screen. */
  readonly box: Box | null;
  /** How tall the card beside it is, so that it can be kept in the window. */
  readonly cardHeight: number;
}

function sameBox(a: Box | null, b: Box | null): boolean {
  if (a === null || b === null) return a === b;
  return a.left === b.left && a.top === b.top && a.width === b.width && a.height === b.height;
}

/**
 * Follows the element marked `data-tour="<target>"` round the window, and the card beside it.
 * It is measured after every render, once the screen has settled, since what the screen holds
 * moves as the game does: a panel opens, or the element only appears once a quarter has ended.
 */
export function useSpotlight(
  target: string | null,
  card: RefObject<HTMLElement | null>,
): Spotlight {
  const [spotlight, setSpotlight] = useState<Spotlight>({ box: null, cardHeight: 0 });

  // A new target is brought into view, in a column that scrolls.
  useLayoutEffect(() => {
    if (target === null) return;
    document.querySelector(tourSelector(target))?.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
    });
  }, [target]);

  const [measure] = useState(() => {
    let frame = 0;
    const run = (wanted: string | null) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const element = wanted === null ? null : standingFor(wanted);
        const rect = element?.getBoundingClientRect();
        const box =
          rect === undefined
            ? null
            : { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
        const cardHeight = card.current?.offsetHeight ?? 0;
        // Set only on a change, or measuring after every render would never stop.
        setSpotlight((last) =>
          sameBox(last.box, box) && last.cardHeight === cardHeight ? last : { box, cardHeight },
        );
      });
    };
    const stop = () => {
      cancelAnimationFrame(frame);
    };
    return { run, stop };
  });

  useLayoutEffect(() => {
    measure.run(target);
  });

  useEffect(() => {
    const again = () => {
      measure.run(target);
    };
    window.addEventListener('resize', again);
    window.addEventListener('scroll', again, true);
    return () => {
      window.removeEventListener('resize', again);
      window.removeEventListener('scroll', again, true);
    };
  }, [measure, target]);

  // A measurement still to come is dropped only when the spotlight goes. When the target
  // changes, this cleanup would run after the measurement the new target has asked for, and
  // drop it, leaving the outline on the old target.
  useEffect(
    () => () => {
      measure.stop();
    },
    [measure],
  );

  return spotlight;
}
