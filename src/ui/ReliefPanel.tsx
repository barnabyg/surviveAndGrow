import { FOOD_STAGE_NAMES, formatMoney, formatTonnes, type GameState, type Preview } from '../sim';

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
  const nameOf = (regionId: string) =>
    game.country.regions.find((region) => region.id === regionId)?.name ?? regionId;
  const { capacity, shortfall, delivered } = preview.relief;

  return (
    <section className="relief" aria-labelledby="relief-title">
      <div className="section-head">
        <h2 className="section-title" id="relief-title">
          Food relief
        </h2>
        <span className="section-note">
          {formatMoney(reliefSpending)} moves {formatTonnes(capacity)} a quarter
        </span>
      </div>

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
        <p className={delivered < shortfall ? 'warning-note' : 'relief__result'}>
          {reliefResult(nameOf(reliefRegionId), capacity, shortfall, delivered)}
        </p>
      )}
    </section>
  );
}

/** What relief will do this quarter, and what is holding it back when it falls short. */
function reliefResult(name: string, capacity: number, shortfall: number, delivered: number) {
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
