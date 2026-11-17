import {
  electionStatus,
  formatPercent,
  type GameState,
  type Preview,
  type Range,
  formatQuarters,
} from '../sim';
import { formatDate, formatRange } from './format';
import { DecisionPanel } from './DecisionPanel';

interface ElectionPanelProps {
  readonly game: GameState;
  /** What the decisions now in force will do this quarter. */
  readonly preview: Preview;
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
 * The election ahead: when it is, and the share of the vote it would give if it were held
 * on approval as this quarter will leave it. The forecast is a range, because the campaign
 * can swing the vote either way, and it is drawn against the share needed.
 */
export function ElectionPanel({ game, preview }: ElectionPanelProps) {
  const election = electionStatus(game);
  const forecast = preview.voteShare;
  const outlook = verdict(forecast, election.needed);
  // The bar runs from no votes to every vote, a tenth of a percent to each unit.
  const left = forecast.min / 10;
  const width = Math.max((forecast.max - forecast.min) / 10, 0.6);

  return (
    <DecisionPanel
      id="election"
      title="Election"
      note={
        <span className="section-note">
          {formatDate(election.date)} ·{' '}
          {election.quartersAway === 0
            ? 'when this quarter ends'
            : `in ${formatQuarters(election.quartersAway)}`}
        </span>
      }
    >
      <div className="election__forecast" role="group" aria-label="Vote share forecast">
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
      <p className="outlook__note">
        This is the vote as it would go on the approval this quarter will leave. The campaign can
        swing it either way, which is why it is a range.
      </p>
    </DecisionPanel>
  );
}
