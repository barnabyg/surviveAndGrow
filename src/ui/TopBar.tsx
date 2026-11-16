import { foodStatus, formatMoney, seasonOf, type GameState, type TurnReport } from '../sim';
import { Crest } from './Crest';
import { formatSigned, formatSignedTonnes, monthsOfFood } from './format';
import { VitalSign } from './VitalSign';

interface TopBarProps {
  readonly game: GameState;
  /** The report on the quarter just ended, or null before any quarter has ended. */
  readonly report: TurnReport | null;
  readonly onEndQuarter: () => void;
}

export function TopBar({ game, report, onEndQuarter }: TopBarProps) {
  const { date } = game;
  const food = foodStatus(game);
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
        />
        <VitalSign
          label="Food reserve"
          value={food.reserveMonths.toFixed(1)}
          unit="months"
          figure={report?.food ?? null}
          formatChange={formatSignedTonnes}
          formatMovement={(tonnes) => `${monthsOfFood(tonnes, food).toFixed(1)} months`}
          remark={
            food.belowSafeLevel
              ? { text: `Below the ${food.safeReserveMonths}-month safe level`, tone: 'warning' }
              : undefined
          }
          breakdownTitle="What moved the food reserve"
        />
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
