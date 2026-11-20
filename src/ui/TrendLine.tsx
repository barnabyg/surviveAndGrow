import { describeTrend, hasTrend, verticalScale, type Mark } from './trend';
import './chart.css';

interface TrendLineProps {
  /** What the line charts, as its description names it: "Treasury". */
  readonly subject: string;
  /** The figure at the start of each quarter shown, the oldest first, ending with now. */
  readonly values: readonly number[];
  readonly format: (value: number) => string;
  /** A level drawn across the chart as a dashed line, such as the strike threshold. */
  readonly mark?: Mark;
}

const WIDTH = 150;
const HEIGHT = 44;
const INSET = 5;

/**
 * The short trend line beside a vital sign. The figure is a solid line ending in a dot at
 * the position now; a mark is a dashed line. Its description says the same in words.
 */
export function TrendLine({ subject, values, format, mark }: TrendLineProps) {
  if (!hasTrend(values)) return <span className="trend trend--none">No trend yet</span>;

  const y = verticalScale(
    mark === undefined ? values : [...values, mark.value],
    INSET,
    HEIGHT - INSET,
  );
  const x = (index: number) => INSET + (index * (WIDTH - 2 * INSET)) / (values.length - 1);
  const points = values.map((value, index) => `${x(index).toFixed(1)},${y(value).toFixed(1)}`);
  const last = values.at(-1) ?? 0;
  return (
    <svg
      className="trend"
      width={WIDTH}
      height={HEIGHT}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={describeTrend(subject, values, format, mark === undefined ? [] : [mark])}
    >
      {mark !== undefined && (
        <path
          className="trend__mark"
          d={`M${INSET},${y(mark.value).toFixed(1)} H${WIDTH - INSET}`}
        />
      )}
      <polyline className="trend__line" points={points.join(' ')} />
      <circle className="trend__now" cx={x(values.length - 1)} cy={y(last)} r="3" />
    </svg>
  );
}
