import {
  describeEvent,
  describeUnrest,
  FOOD_STAGE_NAMES,
  formatCount,
  formatPercent,
  formatIndex,
  formatTonnes,
  livingStandards,
  type GameState,
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
