import {
  FOOD_STAGE_NAMES,
  formatMoney,
  formatTonnes,
  regionName,
  type GameState,
  type Preview,
  type ReliefDelivery,
} from '../sim';
import { DecisionPanel } from './DecisionPanel';
import './ReliefPanel.css';

interface ReliefPanelProps {
  readonly game: GameState;
  /** What the decisions now in force will do this quarter. */
  readonly preview: Preview;
  /** What the committed budget spends on food relief. */
  readonly reliefSpending: number;
  readonly reliefRegionId: string | null;
  readonly onSendRelief: (regionId: string | null) => void;
}

/** Where food relief goes. It takes effect when the quarter ends, without being committed. */
export function ReliefPanel(props: ReliefPanelProps) {
  const { game, preview, reliefSpending, reliefRegionId, onSendRelief } = props;
  const nameOf = (regionId: string) => regionName(game.country, regionId);
  const { relief } = preview;

  return (
    <DecisionPanel
      id="relief"
      title="Food relief"
      note={
        <span className="section-note">
          {formatMoney(reliefSpending)} moves {formatTonnes(relief.capacity)} a quarter
        </span>
      }
    >
      {preview.shortfalls.length === 0 ? (
        <p className="section-empty">No region will go short of food this quarter.</p>
      ) : (
        <ul className="relief__needs">
          {preview.shortfalls.map((entry) => (
            <li key={entry.regionId} className="warning-note">
              ▲ {nameOf(entry.regionId)} will go short of {formatTonnes(entry.shortfall)}.
            </li>
          ))}
        </ul>
      )}

      <div className="relief__target">
        <label htmlFor="relief-target">Send food relief to</label>
        <select
          id="relief-target"
          value={reliefRegionId ?? ''}
          onChange={(event) => {
            onSendRelief(event.target.value === '' ? null : event.target.value);
          }}
        >
          <option value="">Nowhere</option>
          {game.regions.map((region) => (
            <option key={region.id} value={region.id}>
              {nameOf(region.id)} · food {FOOD_STAGE_NAMES[region.foodStage].toLowerCase()}
            </option>
          ))}
        </select>
      </div>

      {reliefRegionId !== null && (
        <p className={relief.delivered < relief.shortfall ? 'warning-note' : 'relief__result'}>
          {reliefResult(nameOf(reliefRegionId), relief)}
        </p>
      )}
    </DecisionPanel>
  );
}

/** What relief will do this quarter, and what is holding it back when it falls short. */
function reliefResult(name: string, { capacity, shortfall, delivered }: ReliefDelivery) {
  if (shortfall === 0) return `${name} is not short of food this quarter, so nothing will be sent.`;
  if (delivered === shortfall) {
    return `Relief will deliver all ${formatTonnes(delivered)} that ${name} is short of.`;
  }
  const limit =
    delivered === capacity
      ? 'Food relief spending cannot move more'
      : 'The national reserve holds no more';
  return `▲ Relief will deliver ${formatTonnes(delivered)} of the ${formatTonnes(shortfall)} that ${name} is short of. ${limit}.`;
}
