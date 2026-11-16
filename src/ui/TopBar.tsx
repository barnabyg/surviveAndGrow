import { seasonOf, type GameState } from '../sim';
import { Crest } from './Crest';
import { formatMoney } from './format';

interface TopBarProps {
  readonly game: GameState;
  readonly onEndQuarter: () => void;
}

export function TopBar({ game, onEndQuarter }: TopBarProps) {
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
        <div className="vital" role="group" aria-label="Treasury">
          <div className="label">Treasury</div>
          <div className="vital__value">{formatMoney(game.treasury)}</div>
        </div>
      </div>

      <button type="button" className="button button--primary" onClick={onEndQuarter}>
        End quarter
      </button>
    </header>
  );
}
