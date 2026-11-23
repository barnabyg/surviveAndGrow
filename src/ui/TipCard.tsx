import { useId, useRef, useState } from 'react';
import type { GameState, Risk, Technology } from '../sim';
import { cardPlace, outlinePlace, useSpotlight } from './spotlight';
import { readTipsOff, readTipsSeen, storeTipSeen, storeTipsOff } from './storage';
import { TIPS, tipsDue, type Tip } from './tips';
import './Tour.css';

interface TipsInput {
  readonly game: GameState;
  readonly risks: readonly Risk[];
  readonly plannedSiteIds: readonly string[];
  readonly plannedResearch: Technology | null;
  /** Whether the tour or a lesson is open, which a tip waits behind. */
  readonly quiet: boolean;
}

/** The tip to show now, if any, and the player's control over the tips. */
export interface TipsState {
  readonly tip: Tip | null;
  readonly dismiss: () => void;
  readonly on: boolean;
  readonly toggle: () => void;
}

/**
 * The first-time tips in a game. The first tip whose condition holds and which has not been
 * seen is shown; dismissing it marks it seen, in every game and country.
 */
export function useTips(input: TipsInput): TipsState {
  const { game, risks, plannedSiteIds, plannedResearch, quiet } = input;
  const [on, setOn] = useState(() => !readTipsOff());
  const [seen, setSeen] = useState(readTipsSeen);
  const due = on && !quiet ? tipsDue({ game, risks, plannedSiteIds, plannedResearch }) : new Set();
  const tip = TIPS.find((candidate) => due.has(candidate.when) && !seen.has(candidate.id)) ?? null;
  return {
    tip,
    dismiss: () => {
      if (tip === null) return;
      storeTipSeen(tip.id);
      setSeen(readTipsSeen());
    },
    on,
    toggle: () => {
      storeTipsOff(on);
      setOn(!on);
      setSeen(readTipsSeen());
    },
  };
}

/**
 * A first-time tip: like a lesson, it draws round the part of the screen it is about and
 * leaves the screen free to use.
 */
export function TipCard({ tips }: { readonly tips: TipsState }) {
  const { tip, dismiss, toggle } = tips;
  const card = useRef<HTMLElement>(null);
  const titleId = useId();
  const { box, cardHeight } = useSpotlight(tip?.target ?? null, card);
  if (tip === null) return null;
  return (
    <div className="lessons">
      {box !== null && <div className="lessons__outline" style={outlinePlace(box)} />}
      <section
        ref={card}
        className="tour__card lessons__card"
        aria-labelledby={titleId}
        style={cardPlace(box, cardHeight)}
      >
        <p className="tour__count">First-time tip</p>
        <h2 className="tour__title" id={titleId}>
          {tip.title}
        </h2>
        <p className="tour__text">{tip.text}</p>
        <div className="button-row tour__actions">
          <button type="button" className="button" onClick={toggle}>
            Turn tips off
          </button>
          <button type="button" className="button button--commit" onClick={dismiss}>
            Got it
          </button>
        </div>
      </section>
    </div>
  );
}
