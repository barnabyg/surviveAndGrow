import { useState } from 'react';
import { LESSONS, type LessonAction } from './tourSteps';

/** Where the tutorial's lessons stand, and the ways the game screen moves them on. */
export interface LessonProgress {
  /** The lesson open, by its place in LESSONS, or null outside the tutorial. */
  readonly lesson: number | null;
  /** What the player's action in the last lesson did, or null. */
  readonly note: string | null;
  /** The part of the screen the open lesson is about. */
  readonly target: string | null;
  /** The player has done something: the open lesson moves on if it was waiting for it. */
  readonly did: (action: LessonAction) => void;
  /** Moves past the open lesson without its action. */
  readonly skip: () => void;
  readonly end: () => void;
}

/**
 * The tutorial's lessons in a game. Each moves on by itself once the player has done what it
 * asks; `onChange` hears of every move, so the progress can be kept.
 */
export function useLessons(
  initial: number | null,
  onChange: (lesson: number | null) => void,
): LessonProgress {
  const [lesson, setLesson] = useState(initial);
  const [note, setNote] = useState<string | null>(null);

  const move = (to: number | null, said: string | null) => {
    const next = to !== null && to < LESSONS.length ? to : null;
    setLesson(next);
    setNote(said);
    onChange(next);
  };

  return {
    lesson,
    note,
    target: lesson === null ? null : (LESSONS[lesson]?.target ?? null),
    did: (action) => {
      if (lesson === null) return;
      const current = LESSONS[lesson];
      if (current?.waitFor === action) move(lesson + 1, current.after ?? null);
    },
    skip: () => {
      if (lesson !== null) move(lesson + 1, null);
    },
    end: () => {
      move(null, null);
    },
  };
}
