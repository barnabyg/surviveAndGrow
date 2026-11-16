import {
  approvalStatus,
  foodStatus,
  formatMoney,
  formatPercent,
  monthsOfFood,
  regionName,
  seasonOf,
  UNREST_NAMES,
  type ApprovalStatus,
  type GameState,
  type TurnReport,
} from '../sim';
import { strikeMark } from './ApprovalChart';
import { Crest } from './Crest';
import { formatPoints, formatSigned, formatSignedPoints, formatSignedTonnes } from './format';
import { recent, type Mark } from './trend';
import { TrendLine } from './TrendLine';
import { VitalSign } from './VitalSign';

interface TopBarProps {
  readonly game: GameState;
  /** The report on the quarter just ended, or null before any quarter has ended. */
  readonly report: TurnReport | null;
  readonly onEndQuarter: () => void;
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

export function TopBar({ game, report, onEndQuarter }: TopBarProps) {
  const { date } = game;
  const food = foodStatus(game);
  const approval = approvalStatus(game);
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
      </div>

      <button
        type="button"
        className="button button--primary"
        disabled={game.outcome.status !== 'playing'}
        onClick={onEndQuarter}
      >
        End quarter
      </button>
    </header>
  );
}
