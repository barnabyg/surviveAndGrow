import { useId, useRef } from 'react';
import type { LessonProgress } from './lessonProgress';
import { cardPlace, outlinePlace, useSpotlight } from './spotlight';
import { LESSONS } from './tourSteps';
import './Tour.css';

/**
 * The tutorial game's lesson card. Unlike the tour it leaves the screen free, since each
 * lesson asks the player to use it: the part of the screen it is about is drawn round, and
 * the card stands beside it.
 */
export function Lessons({ progress }: { readonly progress: LessonProgress }) {
  const { lesson, note, target, skip, end } = progress;
  const card = useRef<HTMLElement>(null);
  const titleId = useId();
  const { box, cardHeight } = useSpotlight(target, card);
  const current = lesson === null ? undefined : LESSONS[lesson];
  if (lesson === null || current === undefined) return null;
  const last = lesson === LESSONS.length - 1;

  return (
    <div className="lessons">
      {box !== null && <div className="lessons__outline" style={outlinePlace(box)} />}
      <section
        ref={card}
        className="tour__card lessons__card"
        aria-labelledby={titleId}
        style={cardPlace(box, cardHeight)}
      >
        <p className="tour__count">
          Tutorial · Lesson {lesson + 1} of {LESSONS.length}
        </p>
        {note !== null && (
          <p className="lessons__note" role="status">
            ✓ {note}
          </p>
        )}
        <h2 className="tour__title" id={titleId}>
          {current.title}
        </h2>
        <p className="tour__text">{current.text}</p>
        <div className="button-row tour__actions">
          <button type="button" className="button" onClick={end}>
            End tutorial
          </button>
          {current.waitFor === null ? (
            <button type="button" className="button button--commit" onClick={skip}>
              {last ? 'Finish' : 'Next'}
            </button>
          ) : (
            <button type="button" className="button" onClick={skip}>
              Skip lesson
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
