import {
  approvalStatus,
  electionStatus,
  formatPercent,
  type GameState,
  formatQuarters,
} from '../sim';
import { describeTrend, hasTrend, recent, TREND_QUARTERS, verticalScale, type Mark } from './trend';
import './chart.css';
import './ApprovalChart.css';

/** The level below which a region strikes, as charts mark it. */
export function strikeMark(strikesBelow: number): Mark {
  const level = formatPercent(strikesBelow, 0);
  return {
    value: strikesBelow,
    label: `Strikes below ${level}`,
    name: `the ${level} strike threshold`,
  };
}

/** The share of the vote the election needs, which approval must hold to win it. */
function electionMark(needed: number): Mark {
  const level = formatPercent(needed, 0);
  return { value: needed, label: `${level} line`, name: `the ${level} line` };
}

// The chart is drawn in a frame of this size and scaled to the column's width.
const FRAME = { width: 400, height: 170 } as const;
const PLOT = { left: 44, right: 392, top: 12, bottom: 138 } as const;
/** Gridlines fall on whole steps of this many thousandths: ten points of approval. */
const GRID_STEP = 100;

/**
 * National approval over the last eight quarters, against the two levels that matter: the
 * strike threshold and the share the election needs. Each mark has its own dash pattern and is labelled in
 * words, and the whole chart is described in a sentence for anyone who cannot see it.
 */
export function ApprovalChart({ game }: { readonly game: GameState }) {
  const shown = recent(game.history);
  const values = shown.map((record) => record.approval);
  const marks = [
    strikeMark(approvalStatus(game).strikesBelow),
    electionMark(electionStatus(game).needed),
  ];
  const quarters = values.length - 1;

  return (
    <section
      className="approval-chart"
      aria-labelledby="approval-chart-title"
      data-tour="approval-chart"
    >
      <div className="section-head">
        <h2 className="section-title" id="approval-chart-title">
          Approval
        </h2>
        {hasTrend(values) && (
          <span className="section-note">
            Last {quarters === 1 ? 'quarter' : formatQuarters(quarters)}
          </span>
        )}
      </div>
      {hasTrend(values) ? (
        <Chart
          values={values}
          marks={marks}
          // The line starts at the opening position until the game is older than the chart.
          startLabel={
            game.history.length > shown.length
              ? `${TREND_QUARTERS} quarters ago`
              : 'Start of the term'
          }
        />
      ) : (
        <p className="section-empty">
          There is not yet a trend to draw. The chart begins when a quarter has ended.
        </p>
      )}
    </section>
  );
}

interface ChartProps {
  readonly values: readonly number[];
  readonly marks: readonly Mark[];
  readonly startLabel: string;
}

function Chart({ values, marks, startLabel }: ChartProps) {
  const all = [...values, ...marks.map((mark) => mark.value)];
  // The scale runs between whole steps, with room to spare above and below every line.
  const low = Math.max(0, Math.floor((Math.min(...all) - GRID_STEP / 2) / GRID_STEP) * GRID_STEP);
  const high = Math.min(
    1000,
    Math.ceil((Math.max(...all) + GRID_STEP / 2) / GRID_STEP) * GRID_STEP,
  );
  const y = verticalScale([low, high], PLOT.top, PLOT.bottom);
  const x = (index: number) =>
    PLOT.left + 6 + (index * (PLOT.right - PLOT.left - 10)) / (values.length - 1);
  const last = values.at(-1) ?? 0;
  const lastX = x(values.length - 1);
  const [strikes, half] = marks;

  return (
    <svg
      className="approval-chart__chart"
      viewBox={`0 0 ${FRAME.width} ${FRAME.height}`}
      role="img"
      aria-label={describeTrend('Approval', values, formatPercent, marks)}
    >
      {[low, (low + high) / 2, high].map((level) => (
        <g key={level}>
          <path className="chart__grid" d={`M${PLOT.left},${y(level)} H${PLOT.right}`} />
          <text className="chart__axis" x={PLOT.left - 8} y={y(level) + 4} textAnchor="end">
            {formatPercent(level, 0)}
          </text>
        </g>
      ))}

      {/* The strike threshold is dashed and labelled beneath; the 50% line is dotted and
          labelled above, so the two are told apart by more than their colour. */}
      {strikes !== undefined && (
        <g>
          <path
            className="chart__mark chart__mark--danger"
            d={`M${PLOT.left},${y(strikes.value)} H${PLOT.right}`}
          />
          <text
            className="chart__mark-label chart__mark-label--danger"
            x={PLOT.left + 4}
            y={y(strikes.value) + 15}
          >
            {strikes.label}
          </text>
        </g>
      )}
      {half !== undefined && (
        <g>
          <path
            className="chart__mark chart__mark--dotted"
            d={`M${PLOT.left},${y(half.value)} H${PLOT.right}`}
          />
          <text className="chart__mark-label" x={PLOT.left + 4} y={y(half.value) - 6}>
            {half.label}
          </text>
        </g>
      )}

      <polyline
        className="chart__line"
        points={values
          .map((value, index) => `${x(index).toFixed(1)},${y(value).toFixed(1)}`)
          .join(' ')}
      />
      <circle className="chart__now" cx={lastX} cy={y(last)} r="4" />
      <text className="chart__value" x={lastX} y={y(last) - 10} textAnchor="end">
        {formatPercent(last)}
      </text>

      <text className="chart__axis" x={PLOT.left + 6} y={FRAME.height - 8}>
        {startLabel}
      </text>
      <text className="chart__axis" x={lastX} y={FRAME.height - 8} textAnchor="end">
        Now
      </text>
    </svg>
  );
}
