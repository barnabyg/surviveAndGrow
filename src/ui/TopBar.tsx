import { formatMoney, seasonOf, type GameState, type TurnReport } from '../sim';
import { Crest } from './Crest';
import { formatSigned } from './format';
import { VitalSign } from './VitalSign';

interface TopBarProps {
  readonly game: GameState;
  /** The report on the quarter just ended, or null before any quarter has ended. */
  readonly report: TurnReport | null;
  readonly onEndQuarter: () => void;
}

export function TopBar({ game, report, onEndQuarter }: TopBarProps) {
  const { date } = game;
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
          breakdownTitle="What moved the treasury"
        />
      </div>

      <button type="button" className="button button--primary" onClick={onEndQuarter}>
        End quarter
      </button>
    </header>
  );
}
