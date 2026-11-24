import {
  BORDER_INCIDENT_NAME,
  borderIncidentStatuses,
  deterrenceStatus,
  formatMoney,
  formatPercent,
  formatSignedPoints,
  incidentTaxCost,
  INTENTION_NAMES,
  INTENTIONS,
  TIER_NAMES,
  TIERS,
  type Budget,
  type DeterrenceStatus,
  type GameState,
  type NeighbourStatus,
  type TurnReport,
} from '../sim';
import { IntentionSign } from './IntentionSign';
import './map-card.css';

interface NeighbourCardProps {
  readonly game: GameState;
  /** The report on the quarter just ended, which says what moved deterrence and the neighbour. */
  readonly report: TurnReport | null;
  readonly neighbourId: string;
  /** The budget the quarter will be resolved with, which says what is spent on Defence. */
  readonly budget: Budget;
  readonly onClose: () => void;
}

/**
 * The card for the neighbour picked out on the map: what it intends, deterrence against what
 * it would take to change that, any border incident announced or in force on its border with
 * what it costs, what its ambition weighs as the country prospers, what moved it last quarter,
 * and where the Defence budget is taking it.
 */
export function NeighbourCard({ game, report, neighbourId, budget, onClose }: NeighbourCardProps) {
  const status = deterrenceStatus(game, budget);
  const neighbour = status.neighbours.find((candidate) => candidate.neighbourId === neighbourId);
  if (neighbour === undefined) return null;
  const { name, intention } = neighbour;
  const told = report?.entries.find(
    (entry) => entry.kind === 'neighbour' && entry.neighbourId === neighbourId,
  );
  const incident = borderIncidentStatuses(game).find(
    (candidate) => candidate.neighbourId === neighbourId,
  );
  const moved = report?.deterrence ?? null;
  const worsening = INTENTIONS.indexOf(neighbour.settlesIntention) > INTENTIONS.indexOf(intention);

  return (
    <section className="map-card" aria-labelledby="neighbour-card-title">
      <div>
        <div className="label label--pending">Neighbour · {INTENTION_NAMES[intention]}</div>
        <h2 className="map-card__name" id="neighbour-card-title">
          {name}
        </h2>
      </div>
      <dl className="map-card__list">
        <div>
          <dt>Intention</dt>
          <dd>
            <IntentionSign intention={intention} />
          </dd>
        </div>
        <div>
          <dt>Deterrence</dt>
          <dd>{formatPercent(status.deterrence)}</dd>
        </div>
        {neighbour.weighs > 0 && (
          <>
            <div>
              <dt>Watchful below</dt>
              <dd>{formatPercent(neighbour.watchfulBelow)}</dd>
            </div>
            <div>
              <dt>Hostile below</dt>
              <dd>{formatPercent(neighbour.hostileBelow)}</dd>
            </div>
          </>
        )}
        <div>
          <dt>Ambition</dt>
          <dd>{formatPercent(neighbour.ambition, 0)}</dd>
        </div>
      </dl>
      <p
        className={intention === 'peaceful' ? 'map-card__note' : 'warning-note'}
        role="status"
        aria-label="What it would take"
      >
        {intention === 'peaceful' ? '' : '▲ '}
        {whatItWouldTake(status, neighbour)}
      </p>
      {incident !== undefined && (
        <p className="warning-note" role="status" aria-label={BORDER_INCIDENT_NAME}>
          ▲ {incident.headline}
          {incident.inForce ? '' : ' ahead'}. {incident.description} It costs about{' '}
          {formatMoney(incidentTaxCost(game, budget, neighbourId))} a quarter in tax.
        </p>
      )}
      {incident === undefined && intention === 'hostile' && (
        <p className="warning-note" role="status" aria-label={BORDER_INCIDENT_NAME}>
          ▲ While {name} is hostile, each quarter may announce a border incident: its crossings
          would carry nothing and the regions on its border would produce less, at about{' '}
          {formatMoney(incidentTaxCost(game, budget, neighbourId))} a quarter in tax. The risks
          ahead give the chance.
        </p>
      )}
      {neighbour.ambition > 0 && (
        <table className="breakdown__table" aria-label="What its ambition weighs">
          <caption className="map-card__term">
            What its ambition weighs against deterrence as the country prospers
          </caption>
          <tbody>
            {TIERS.map((tier) => (
              <tr key={tier}>
                <th scope="row">
                  {TIER_NAMES[tier]}
                  {tier === status.tier ? ' (now)' : ''}
                </th>
                <td>{formatPercent(neighbour.weighsIn[tier])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="map-card__note" role="status" aria-label="What moved it">
        <span className="map-card__term">Last quarter</span>{' '}
        {told !== undefined
          ? `${told.headline}. ${told.cause}`
          : moved === null
            ? 'Nothing has moved it yet.'
            : `Deterrence ${moved.change === 0 ? 'did not move' : `moved ${formatSignedPoints(moved.change)}, to ${formatPercent(moved.value)}`}, and ${name} stayed ${INTENTION_NAMES[intention].toLowerCase()}.`}
      </p>
      <p
        className={worsening ? 'warning-note' : 'map-card__note'}
        role="status"
        aria-label="Where it is heading"
      >
        {worsening ? '▲ ' : ''}
        Defence at {formatMoney(status.spent)} a quarter, against the {formatMoney(status.expected)}{' '}
        the army expects, settles deterrence at {formatPercent(status.settles)}, where {name} would
        be {INTENTION_NAMES[neighbour.settlesIntention].toLowerCase()}. Deterrence moves there
        slowly, so it has to be bought ahead.
      </p>
      <div className="button-row">
        <button type="button" className="button" onClick={onClose}>
          Close
        </button>
      </div>
    </section>
  );
}

/** Deterrence against what it would take to change the neighbour's intention, in a sentence. */
function whatItWouldTake(status: DeterrenceStatus, neighbour: NeighbourStatus): string {
  const { name, intention, watchfulBelow, hostileBelow } = neighbour;
  const deterrence = `Deterrence is ${formatPercent(status.deterrence)}.`;
  if (neighbour.ambition === 0) {
    return `${name} has no ambition here, and stays peaceful whatever deterrence is.`;
  }
  if (neighbour.weighs === 0) {
    return `At ${TIER_NAMES[status.tier]} the country has nothing worth taking: ${name}’s ambition weighs nothing against deterrence, so it is peaceful whatever is spent on Defence. That changes as the country prospers.`;
  }
  switch (intention) {
    case 'peaceful':
      return `${deterrence} ${name} grows watchful if it falls below ${formatPercent(watchfulBelow)}, and turns hostile below ${formatPercent(hostileBelow)}.`;
    case 'watchful':
      return `${deterrence} ${name} is peaceful again from ${formatPercent(watchfulBelow)}, and turns hostile below ${formatPercent(hostileBelow)}.`;
    case 'hostile':
      return `${deterrence} ${name} is hostile while it is below ${formatPercent(hostileBelow)}, and peaceful again from ${formatPercent(watchfulBelow)}.`;
  }
}
