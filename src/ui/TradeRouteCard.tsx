import {
  formatTonnes,
  listed,
  technologyName,
  tradeRoutes,
  type GameState,
  type TradeOrder,
  quartersLeftWords,
} from '../sim';
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
 * what it carried last quarter, and what it is to carry this quarter with the grain ordered
 * so far, the mines' ore and grain each, with what is left free. A crossing closed by a border
 * incident says so, and for how long.
 */
export function TradeRouteCard({ game, routeId, plannedTrade, onClose }: TradeRouteCardProps) {
  const route = tradeRoutes(game, plannedTrade).find((candidate) => candidate.id === routeId);
  if (route === undefined) return null;
  const crossing = game.country.crossings.find((candidate) => candidate.id === route.id);
  const neighbour = game.country.map.neighbours.find(
    (candidate) => candidate.id === crossing?.neighbourId,
  );
  // A technology that makes the lane carry more is named beside what it carries. A closed
  // crossing carries nothing: what it is said to carry is what it does once open again.
  const capacity =
    route.closed !== null
      ? formatTonnes(route.unimproved)
      : route.improvedBy.length === 0
        ? formatTonnes(route.capacity)
        : `${formatTonnes(route.capacity)} (${formatTonnes(route.unimproved)} without ${listed(route.improvedBy.map(technologyName))})`;
  const kind = route.kind === 'crossing' ? 'Border crossing' : 'Shipping lane';
  const { carried, planned } = route;
  const rows: [label: string, last: number, now: number][] = [
    ...(route.kind === 'port' || carried.ore > 0 || planned.ore > 0
      ? [['Mines’ ore', carried.ore, planned.ore] satisfies [string, number, number]]
      : []),
    ['Grain bought and sold', carried.grain, planned.grain],
    ['Carried', carried.total, planned.total],
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
      {route.closed !== null && (
        <p className="warning-note" role="status" aria-label="Closed">
          ✕ Closed by the border incident with {route.closed.name}: it carries nothing{' '}
          {quartersLeftWords(route.closed.quartersLeft)}. Grain ordered goes by the links left open.
        </p>
      )}
      {route.state === 'weak' && (
        <p className="warning-note" role="status">
          ▲ Weak trade link: {route.name} is decaying, so the lane carries {capacity}, half what it
          does in good repair, until the port’s upkeep is paid.
        </p>
      )}
      {route.state !== 'missing' && (
        <>
          <table className="breakdown__table" aria-label="What the route carries">
            <thead>
              <tr>
                <th scope="col">Carried</th>
                <th scope="col">Last quarter</th>
                <th scope="col">This quarter</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([label, last, now]) => (
                <tr key={label}>
                  <th scope="row">{label}</th>
                  <td>{formatTonnes(last)}</td>
                  <td>{formatTonnes(now)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="map-card__note" role="status">
            Capacity {formatTonnes(route.capacity)} a quarter:{' '}
            {formatTonnes(route.capacity - planned.total)} of it free this quarter, with the mines’
            ore and the grain ordered so far.
          </p>
        </>
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
