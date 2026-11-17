import {
  approvalStatus,
  electionStatus,
  foodStatus,
  formatIndex,
  formatMoney,
  formatPercent,
  formatPoints,
  formatSignedIndex,
  formatSignedPoints,
  monthsOfFood,
  prosperityStatus,
  tierFrom,
  TIER_NAMES,
  TIERS,
  tierStatus,
  regionName,
  seasonOf,
  UNREST_NAMES,
  type ApprovalStatus,
  type GameState,
  type TurnReport,
  quartersWord,
} from '../sim';
import { strikeMark } from './ApprovalChart';
import { Crest } from './Crest';
import { formatDate, formatSigned, formatSignedTonnes } from './format';
import { recent, type Mark } from './trend';
import { TrendLine } from './TrendLine';
import { VitalSign } from './VitalSign';

interface TopBarProps {
  readonly game: GameState;
  /** The report on the quarter just ended, or null before any quarter has ended. */
  readonly report: TurnReport | null;
  readonly onEndQuarter: () => void;
  /** Asks to give up this game for a fresh one. */
  readonly onRestart: () => void;
}

/** What the approval figure says while regions are striking or protesting. */
function unrestRemark(game: GameState, { unrest }: ApprovalStatus) {
  const [first] = unrest;
  if (first === undefined) return undefined;
  const tone = unrest.some((entry) => entry.unrest === 'protests') ? 'danger' : 'warning';
  const text =
    unrest.length === 1
      ? `${UNREST_NAMES[first.unrest]} in ${regionName(game.country, first.regionId)}`
      : `Unrest in ${unrest.length} regions`;
  return { text, tone } as const;
}

export function TopBar({ game, report, onEndQuarter, onRestart }: TopBarProps) {
  const { date } = game;
  const food = foodStatus(game);
  const approval = approvalStatus(game);
  const election = electionStatus(game);
  const prosperity = prosperityStatus(game);
  const tier = tierStatus({ ...game, prosperity: prosperity.value });
  const target: Mark = {
    value: prosperity.target,
    label: `Target: ${formatIndex(prosperity.target, 0)}`,
    name: `the target of ${formatIndex(prosperity.target, 0)}`,
  };
  const shown = recent(game.history);
  const safeLevel: Mark = {
    value: food.safeReserveMonths,
    label: `Safe level: ${food.safeReserveMonths} months`,
    name: `the ${food.safeReserveMonths}-month safe level`,
  };
  return (
    <header className="topbar">
      <div className="topbar__identity">
        <Crest size={46} />
        <div>
          <h1 className="topbar__country">{game.country.name}</h1>
          <div className="topbar__date">
            Year {date.year} · Quarter {date.quarter} · {seasonOf(date)}
          </div>
        </div>
      </div>

      <div className="vitals">
        <VitalSign
          label="Treasury"
          value={formatMoney(game.treasury)}
          figure={report?.treasury ?? null}
          formatChange={formatSigned}
          formatMovement={formatMoney}
          breakdownTitle="What moved the treasury"
          trend={
            <TrendLine
              subject="Treasury"
              values={shown.map((record) => record.treasury)}
              format={formatMoney}
            />
          }
        />
        <VitalSign
          label="Food reserve"
          value={food.reserveMonths.toFixed(1)}
          unit="months"
          figure={report?.food ?? null}
          formatChange={formatSignedTonnes}
          formatMovement={(tonnes) =>
            `${monthsOfFood(tonnes, food.quarterlyConsumption).toFixed(1)} months`
          }
          remark={
            food.belowSafeLevel
              ? { text: `Below the ${food.safeReserveMonths}-month safe level`, tone: 'warning' }
              : undefined
          }
          note={safeLevel.label}
          breakdownTitle="What moved the food reserve"
          trend={
            <TrendLine
              subject="Food reserve"
              values={shown.map((record) =>
                monthsOfFood(record.foodReserve, record.quarterlyConsumption),
              )}
              format={(value) => `${value.toFixed(1)} months`}
              mark={safeLevel}
            />
          }
        />
        <VitalSign
          label="Approval"
          value={formatPercent(approval.approval)}
          figure={report?.approval ?? null}
          formatChange={formatSignedPoints}
          formatMovement={formatPoints}
          remark={unrestRemark(game, approval)}
          note={`Strikes below ${formatPercent(approval.strikesBelow, 0)}`}
          breakdownTitle="What moved approval"
          trend={
            <TrendLine
              subject="Approval"
              values={shown.map((record) => record.approval)}
              format={formatPercent}
              mark={strikeMark(approval.strikesBelow)}
            />
          }
        >
          <h2 className="label">What approval is made of</h2>
          <table className="breakdown__table" aria-label="What approval is made of">
            <tbody>
              {approval.causes.map((cause, index) => (
                <tr key={cause.label}>
                  <th scope="row">{cause.label}</th>
                  <td>
                    {index === 0 ? formatPercent(cause.amount) : formatSignedPoints(cause.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">Approval now</th>
                <td>{formatPercent(approval.approval)}</td>
              </tr>
            </tfoot>
          </table>
          <p className="breakdown__empty">
            Approval moves a part of the way each quarter towards where the budget and the food
            situation would settle it. A region strikes below{' '}
            {formatPercent(approval.strikesBelow, 0)} and protests below{' '}
            {formatPercent(approval.protestsBelow, 0)}.
          </p>
        </VitalSign>
        <VitalSign
          label="Prosperity"
          value={formatIndex(prosperity.value)}
          unit={`of ${formatIndex(prosperity.target, 0)}`}
          figure={report?.prosperity ?? null}
          formatChange={formatSignedIndex}
          formatMovement={formatIndex}
          remark={
            tier.lostBelow !== null && prosperity.value < tierFrom(tier.tier)
              ? {
                  text: `${TIER_NAMES[tier.tier]} is lost below ${formatIndex(tier.lostBelow)}`,
                  tone: 'warning',
                }
              : undefined
          }
          note={
            tier.next === null
              ? `${TIER_NAMES[tier.tier]} · the target is reached`
              : `${TIER_NAMES[tier.tier]} · ${formatIndex(tier.next.distance)} to ${TIER_NAMES[tier.next.tier]}`
          }
          breakdownTitle="What moved prosperity"
          trend={
            <TrendLine
              subject="Prosperity"
              // Quarters recorded before prosperity was measured are left out.
              values={shown.flatMap((record) =>
                record.prosperity === null ? [] : [record.prosperity],
              )}
              format={(value) => formatIndex(value)}
              mark={target}
            />
          }
        >
          <h2 className="label">What prosperity is made of</h2>
          <table className="breakdown__table" aria-label="What prosperity is made of">
            <tbody>
              {prosperity.parts.map((part) => (
                <tr key={part.label}>
                  <th scope="row">{part.label}</th>
                  <td>{formatIndex(part.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">Prosperity now</th>
                <td>{formatIndex(prosperity.value)}</td>
              </tr>
            </tfoot>
          </table>
          <p className="breakdown__empty">
            Prosperity is the regions’ living standards averaged by population. Health and education
            build up slowly with spending and wear down without it. Passing a tier raises what
            people expect, which lowers the approval baseline.
          </p>
          <h2 className="label">Tiers</h2>
          <table className="breakdown__table" aria-label="Tiers of prosperity">
            <tbody>
              {TIERS.map((each) => (
                <tr key={each} aria-current={each === tier.tier ? 'true' : undefined}>
                  <th scope="row">
                    {each === tier.tier ? '▶ ' : ''}
                    {TIER_NAMES[each]}
                  </th>
                  <td>from {formatIndex(tierFrom(each), 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="breakdown__empty">
            The target of {formatIndex(prosperity.target, 0)} is where{' '}
            {TIER_NAMES[TIERS[TIERS.length - 1] ?? 'prosperous']} begins.
          </p>
        </VitalSign>
        {/* The election is a date, not a figure that moves, so it opens to nothing. */}
        <div className="vital vital--election" role="group" aria-label="Next election">
          <div className="vital__figures">
            <span className="label">Next election</span>
            <span className="vital__value">
              {game.outcome.status !== 'playing' ? (
                game.outcome.cause === 'election' ? (
                  'Held'
                ) : (
                  'Not held'
                )
              ) : election.quartersAway === 0 ? (
                'This quarter'
              ) : (
                <>
                  {election.quartersAway}
                  <span className="vital__unit"> {quartersWord(election.quartersAway)}</span>
                </>
              )}
            </span>
            <div className="vital__note">{formatDate(election.date)}</div>
          </div>
        </div>
      </div>

      <div className="topbar__actions">
        {/* A finished game offers its own replay on the summary, so this is for one in play. */}
        {game.outcome.status === 'playing' && (
          <button type="button" className="button" onClick={onRestart}>
            Restart
          </button>
        )}
        <button
          type="button"
          className="button button--primary"
          disabled={game.outcome.status !== 'playing'}
          onClick={onEndQuarter}
        >
          End quarter
        </button>
      </div>
    </header>
  );
}
