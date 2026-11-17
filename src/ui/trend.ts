/** A trend line shows the quarters just gone: this many of them at most. */
export const TREND_QUARTERS = 8;

/** A level worth drawing across a chart, such as the one below which strikes begin. */
export interface Mark {
  readonly value: number;
  /** What the chart writes beside the line: "Strikes below 40%". */
  readonly label: string;
  /** How a sentence names it: "the 40% strike threshold". */
  readonly name: string;
}

/**
 * The records a trend is drawn from: the position now and at the start of each of the
 * last eight quarters, or fewer while the game is young.
 */
export function recent<Record>(history: readonly Record[]): readonly Record[] {
  return history.slice(-(TREND_QUARTERS + 1));
}

/** Whether there are enough points to draw a line through. */
export function hasTrend(values: readonly number[]): boolean {
  return values.length >= 2;
}

/**
 * A trend in words, for anyone who cannot see the chart: how long it covers, which way the
 * figure went, from what to what, and where it now stands against each mark.
 */
export function describeTrend(
  subject: string,
  values: readonly number[],
  format: (value: number) => string,
  marks: readonly Mark[] = [],
): string {
  const first = values[0];
  const last = values.at(-1);
  if (first === undefined || last === undefined || !hasTrend(values)) {
    return `${subject}: there is not yet a trend.`;
  }
  const quarters = values.length - 1;
  const span = quarters === 1 ? 'the last quarter' : `the last ${quarters} quarters`;
  // The direction is judged on the figures as written, so the words never contradict them.
  const [from, to] = [format(first), format(last)];
  const movement =
    from === to ? `unchanged at ${to}` : `${last > first ? 'rose' : 'fell'} from ${from} to ${to}`;
  const standing = marks.map((mark) => `${last >= mark.value ? 'above' : 'below'} ${mark.name}`);
  return `${subject} over ${span}: ${movement}${
    standing.length === 0 ? '' : `, and is ${standing.join(' and ')}`
  }.`;
}

/**
 * Maps values onto a strip of a chart, top to bottom. The strip covers every value and
 * every mark, and a figure that has not moved sits in its middle.
 */
export function verticalScale(
  values: readonly number[],
  top: number,
  bottom: number,
): (value: number) => number {
  const low = Math.min(...values);
  const high = Math.max(...values);
  if (high === low) return () => (top + bottom) / 2;
  return (value) => bottom - ((value - low) / (high - low)) * (bottom - top);
}
