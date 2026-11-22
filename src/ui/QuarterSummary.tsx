import type { ReactNode } from 'react';
import {
  electionStatus,
  foodStatus,
  formatMoney,
  formatPercent,
  formatQuarters,
  monthsOfFood,
  type GameState,
  type Preview,
  type Range,
} from '../sim';
import { formatDate, formatRange } from './format';
import './QuarterSummary.css';

interface QuarterSummaryProps {
  readonly game: GameState;
  /** What the decisions now in force will do this quarter. */
  readonly preview: Preview;
  /** The quarter's dilemma, while it has one, which goes above everything else. */
  readonly children?: ReactNode;
}

/** Which side of the line a forecast falls, in words and with a mark when it is not safe. */
function verdict(
  forecast: Range,
  needed: number,
): { readonly text: string; readonly safe: boolean } {
  const line = formatPercent(needed, 0);
  if (forecast.min >= needed) {
    return { text: `On course to win: the whole range is at or above ${line}.`, safe: true };
  }
  return forecast.max < needed
    ? { text: `▲ On course to lose: the whole range is below ${line}.`, safe: false }
    : { text: `▲ Too close to call: the range runs either side of ${line}.`, safe: false };
}

/**
 * Where the decisions in force leave the country when the quarter ends, pinned above the
 * decision tabs so it never scrolls away: the balance, the treasury, approval and the food
 * reserve, and the election ahead. The vote share forecast is a range, because the campaign
 * can swing the vote either way, and it is drawn against the share needed.
 */
export function QuarterSummary({ game, preview, children }: QuarterSummaryProps) {
  const election = electionStatus(game);
  const forecast = preview.voteShare;
  const outlook = verdict(forecast, election.needed);
  const food = foodStatus(game);
  const months = (tonnes: number) => monthsOfFood(tonnes, food.quarterlyConsumption).toFixed(1);
  const reserveLow =
    preview.foodReserveAfterHarvest.min * 3 < food.safeReserveMonths * food.quarterlyConsumption;
  // The bar runs from no votes to every vote, a tenth of a percent to each unit.
  const left = forecast.min / 10;
  const width = Math.max((forecast.max - forecast.min) / 10, 0.6);

  return (
    <section className="summary" aria-labelledby="summary-title">
      {children}
      <div className="section-head">
        <h2 className="section-title" id="summary-title">
          Quarter ahead
        </h2>
        <span className="section-note">As decided, when the quarter ends</span>
      </div>
      <dl className="summary__figures">
        <Figure
          label="Balance"
          value={formatRange(preview.balance, formatMoney)}
          warn={preview.balance.min < 0}
        />
        <Figure label="Treasury" value={formatRange(preview.treasury, formatMoney)} />
        <Figure label="Approval" value={formatRange(preview.approval, formatPercent)} />
        <Figure
          label="Food after harvest"
          value={formatRange(preview.foodReserveAfterHarvest, months, 'months')}
          warn={reserveLow}
        />
      </dl>

      <section className="election" aria-labelledby="election-title" data-tour="election">
        <div className="section-head">
          <h3 className="label" id="election-title">
            Election
          </h3>
          <span className="section-note">
            {formatDate(election.date)} ·{' '}
            {election.quartersAway === 0
              ? 'when this quarter ends'
              : `in ${formatQuarters(election.quartersAway)}`}
          </span>
        </div>
        <div
          className="election__forecast"
          role="group"
          aria-label="Vote share forecast"
          title="The vote as it would go on the approval this quarter will leave. The campaign can swing it either way, which is why it is a range."
        >
          <span>Vote share forecast</span>
          <span className="election__share">{formatRange(forecast, formatPercent)}</span>
          <span className="election__needed">{formatPercent(election.needed, 0)} needed</span>
        </div>
        <svg
          className="election__bar"
          viewBox="0 0 100 14"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <rect className="election__track" x="0" y="5" width="100" height="4" />
          <rect className="election__range" x={left} y="3" width={width} height="8" />
          <path className="election__line" d={`M${election.needed / 10},0 V14`} />
        </svg>
        <p className={outlook.safe ? 'election__verdict' : 'warning-note'}>{outlook.text}</p>
      </section>
    </section>
  );
}

/** One figure of the summary, marked when it is a warning, by a sign as well as colour. */
function Figure(props: {
  readonly label: string;
  readonly value: string;
  readonly warn?: boolean;
}) {
  const { label, value, warn = false } = props;
  return (
    <div className="summary__figure" role="group" aria-label={label}>
      <dt className="label">{label}</dt>
      <dd className={warn ? 'summary__value summary__value--warn' : 'summary__value'}>
        {warn && '▲ '}
        {value}
      </dd>
    </div>
  );
}
