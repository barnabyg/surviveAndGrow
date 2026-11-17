import {
  DECAYING_SHARE,
  describeEvent,
  describeUnrest,
  FOOD_STAGE_NAMES,
  formatCount,
  formatMoney,
  formatPercent,
  formatIndex,
  formatTonnes,
  livingStandards,
  type Contribution,
  type GameState,
  type LivingStandard,
  type Preview,
  type TurnReport,
} from '../sim';
import { formatSignedCount } from './format';

interface RegionCardProps {
  readonly game: GameState;
  /** The report on the quarter just ended, which says what moved the region's people. */
  readonly report: TurnReport | null;
  readonly regionId: string;
  /** What the decisions now in force will do this quarter. */
  readonly preview: Preview;
  /** The region food relief is being sent to, if any. */
  readonly reliefRegionId: string | null;
  readonly onSendRelief: (regionId: string | null) => void;
  readonly onClose: () => void;
}

/** The card for the region picked out on the map: how it stands, and relief at a click. */
export function RegionCard(props: RegionCardProps) {
  const { game, report, regionId, preview, reliefRegionId, onSendRelief, onClose } = props;
  const region = game.country.regions.find((candidate) => candidate.id === regionId);
  const state = game.regions.find((candidate) => candidate.id === regionId);
  if (!region || !state) return null;

  const events = game.events.filter((event) => event.regionId === regionId);
  const shortfall = preview.shortfalls.find((entry) => entry.regionId === regionId)?.shortfall;
  const relieved = reliefRegionId === regionId;
  const unrest = describeUnrest(state.unrest);
  const standard = livingStandards(game).find((entry) => entry.regionId === regionId);
  // What moved the region's people last quarter: its growth, and any deaths in famine.
  const moved = (report?.population?.contributions ?? []).filter(
    (line) => line.regionId === regionId,
  );

  return (
    <section className="map-card" aria-labelledby="region-card-title">
      <div>
        <div className="label label--pending">Region · {region.terrain}</div>
        <h2 className="map-card__name" id="region-card-title">
          {region.name}
        </h2>
      </div>
      <dl className="map-card__list">
        <div>
          <dt>People</dt>
          <dd>{formatCount(state.population)}</dd>
        </div>
        {moved.map((line) => (
          <div key={line.label}>
            <dt>{line.amount > 0 ? 'Grew last quarter' : 'Died in famine'}</dt>
            <dd>{formatSignedCount(line.amount)}</dd>
          </div>
        ))}
        <div>
          <dt>Living standard</dt>
          <dd>{formatIndex(standard?.value ?? 0)}</dd>
        </div>
        <div>
          <dt>Food</dt>
          <dd>{FOOD_STAGE_NAMES[state.foodStage]}</dd>
        </div>
        <div>
          <dt>In store</dt>
          <dd>{formatTonnes(state.foodStock)}</dd>
        </div>
        <div>
          <dt>Approval</dt>
          <dd>{formatPercent(state.approval)}</dd>
        </div>
      </dl>
      {standard !== undefined && <PowerNote game={game} standard={standard} />}
      {standard !== undefined && (
        <div className="map-card__parts">
          <Parts
            title="Output a quarter"
            parts={standard.output}
            total={standard.output.reduce((total, part) => total + part.amount, 0)}
            format={formatMoney}
          />
          <Parts
            title="Infrastructure access"
            parts={standard.infrastructure}
            total={standard.scores.infrastructure}
            format={(permille) => formatIndex(permille)}
          />
        </div>
      )}
      {unrest !== null && <p className="warning-note">▲ {unrest}</p>}
      {events.map((event) => (
        <p key={event.type} className="warning-note">
          ▲ {describeEvent(game, event)}
        </p>
      ))}
      <p className={shortfall === undefined ? 'map-card__note' : 'warning-note'}>
        {shortfall === undefined
          ? 'Its people have enough to eat this quarter.'
          : `▲ Its people will go short of ${formatTonnes(shortfall)} this quarter.`}
      </p>
      <div className="button-row">
        <button type="button" className="button" onClick={onClose}>
          Close
        </button>
        <button
          type="button"
          className="button button--commit"
          aria-pressed={relieved}
          onClick={() => {
            onSendRelief(relieved ? null : regionId);
          }}
        >
          {relieved ? 'Stop sending relief' : 'Send food relief here'}
        </button>
      </div>
    </section>
  );
}

/** Whether power reaches the region, from which station along which line, and how well. */
function PowerNote({ game, standard }: { game: GameState; standard: LivingStandard }) {
  const { power } = standard;
  const nameOf = (id: string | null) =>
    game.country.sites.find((site) => site.id === id)?.name ?? '';
  if (power.stationId === null) {
    return (
      <p className="map-card__note" role="status" aria-label="Power">
        Not powered: no power line in use links it to a power station.
      </p>
    );
  }
  const from = `${nameOf(power.stationId)}, along ${nameOf(power.lineId)}`;
  return power.weakened ? (
    <p className="warning-note" role="status" aria-label="Power">
      ▲ Power weakened: the power from {from} runs through a decaying site, so it gives only{' '}
      {DECAYING_SHARE} of what it gives in good repair.
    </p>
  ) : (
    <p className="map-card__note" role="status" aria-label="Power">
      Powered from {from}.
    </p>
  );
}

interface PartsProps {
  readonly title: string;
  readonly parts: readonly Contribution[];
  /** What the parts come to, which may be capped below their sum. */
  readonly total: number;
  readonly format: (amount: number) => string;
}

/** A figure of the region's and what it is made of, line by line. */
function Parts({ title, parts, total, format }: PartsProps) {
  return (
    <table className="breakdown__table" aria-label={title}>
      <caption className="map-card__term">{title}</caption>
      <tbody>
        {parts.map((part) => (
          <tr key={part.label}>
            <th scope="row">{part.label}</th>
            <td>{format(part.amount)}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <th scope="row">Total</th>
          <td>{format(total)}</td>
        </tr>
      </tfoot>
    </table>
  );
}
