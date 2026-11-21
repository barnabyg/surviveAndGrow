import { formatTonnes, tradeRoutes, type GameState, type TradeOrder } from '../sim';
import { routeTitle } from './TradeRouteMark';
import './map-card.css';

interface TradeRouteCardProps {
  readonly game: GameState;
  readonly routeId: string;
  /** The grain the player means to buy and sell abroad this quarter, which the routes carry. */
  readonly plannedTrade: readonly TradeOrder[];
  readonly onClose: () => void;
}

/**
 * The card for the trade route picked out on the map: what it can carry across the border,
 * and what it carries this quarter, the mines' ore and grain, with what is left free.
 */
export function TradeRouteCard({ game, routeId, plannedTrade, onClose }: TradeRouteCardProps) {
  const route = tradeRoutes(game, plannedTrade).find((candidate) => candidate.id === routeId);
  if (route === undefined) return null;
  const crossing = game.country.crossings.find((candidate) => candidate.id === route.id);
  const neighbour = game.country.map.neighbours.find(
    (candidate) => candidate.id === crossing?.neighbourId,
  );
  const capacity = formatTonnes(route.capacity);
  const kind = route.kind === 'crossing' ? 'Border crossing' : 'Shipping lane';
  const rows: [label: string, tonnes: number][] = [
    ...(route.kind === 'port' || route.ore > 0
      ? [['Mines’ ore', route.ore] satisfies [string, number]]
      : []),
    ['Grain bought and sold', route.grain],
    ['Free', route.capacity - route.carried],
    ['Capacity', route.capacity],
  ];

  return (
    <section className="map-card" aria-labelledby="route-card-title">
      <div>
        <div className="label label--pending">
          {kind} · {route.state}
        </div>
        <h2 className="map-card__name" id="route-card-title">
          {routeTitle(route)}
        </h2>
      </div>
      <p className="map-card__note">
        {route.kind === 'crossing'
          ? `Border crossing to ${neighbour?.name ?? ''}. Open from the start, it carries ${capacity} a quarter across the border.`
          : `It carries what ${route.name} ships across the border: ${capacity} a quarter.`}
      </p>
      {route.state === 'missing' && (
        <p className="warning-note" role="status">
          ✕ Missing trade link: once {route.name} is in use, this lane carries {capacity} a quarter.
        </p>
      )}
      {route.state === 'weak' && (
        <p className="warning-note" role="status">
          ▲ Weak trade link: {route.name} is decaying, so the lane carries {capacity}, half what it
          does in good repair, until the port’s upkeep is paid.
        </p>
      )}
      {route.state !== 'missing' && (
        <table className="breakdown__table" aria-label="What the route carries this quarter">
          <caption className="label">This quarter</caption>
          <tbody>
            {rows.map(([label, tonnes]) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                <td>{formatTonnes(tonnes)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="map-card__note">
        The mines’ ore goes by the port its chain runs to. Grain bought and sold abroad goes over
        the border crossings first, then by sea.
      </p>
      <div className="button-row">
        <button type="button" className="button" onClick={onClose}>
          Close
        </button>
      </div>
    </section>
  );
}
