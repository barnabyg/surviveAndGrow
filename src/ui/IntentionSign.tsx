import { INTENTION_NAMES, type Intention } from '../sim';

/**
 * The mark for each intention, drawn about the centre of a 12 by 12 box: a ring for peaceful,
 * a ring with a pupil, an eye, for watchful, and a solid spearhead for hostile. Each has its
 * own shape, and the word goes with it wherever it is shown, so neither rests on colour.
 */
export const INTENTION_MARKS: Readonly<
  Record<Intention, { readonly outline: string; readonly solid: string }>
> = {
  peaceful: { outline: 'M0,-4.5 A4.5,4.5 0 1 1 -0.01,-4.5 Z', solid: '' },
  watchful: {
    outline: 'M0,-4.5 A4.5,4.5 0 1 1 -0.01,-4.5 Z',
    solid: 'M0,-1.8 A1.8,1.8 0 1 1 -0.01,-1.8 Z',
  },
  hostile: { outline: '', solid: 'M0,-5.5 L5.5,4.5 H-5.5 Z' },
};

/** An intention's mark as part of a drawing, in the colour given. */
export function IntentionMark({ intention, ink }: { intention: Intention; ink: string }) {
  const { outline, solid } = INTENTION_MARKS[intention];
  return (
    <>
      {outline !== '' && <path d={outline} fill="none" stroke={ink} strokeWidth="1.6" />}
      {solid !== '' && <path d={solid} fill={ink} />}
    </>
  );
}

/** An intention in a line of text: its mark, then its word. */
export function IntentionSign({ intention }: { readonly intention: Intention }) {
  return (
    <span className="intention" data-intention={intention}>
      <svg width="13" height="13" viewBox="-6.5 -6.5 13 13" aria-hidden="true">
        <IntentionMark intention={intention} ink="currentColor" />
      </svg>{' '}
      {INTENTION_NAMES[intention]}
    </span>
  );
}
