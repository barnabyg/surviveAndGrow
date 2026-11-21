import { formatTonnes, MAP_FRAME, type Neighbour, type Point, type TradeRoute } from '../sim';
import type { MapPalette } from './mapPalette';

/** The most a route can carry, in tonnes, at which its line is drawn at its widest. */
const WIDEST_TONNES = 900_000;

/**
 * How wide a route is drawn for what it can carry: wider the more it carries, but by the
 * square root, so that a border crossing still shows beside a deep-water port.
 */
export function routeWidth(tonnes: number): number {
  return 3 + 9 * Math.sqrt(Math.min(1, Math.max(0, tonnes) / WIDEST_TONNES));
}
/** What a route carried last quarter against its capacity, as the map writes it: "600,000 t of 900,000 t". */
/** What a route carries against its capacity, as the map writes it: "600,000 t of 900,000 t". */
export function carriedText(route: TradeRoute): string {
  return `${formatTonnes(route.carried.total)} of ${formatTonnes(route.capacity)}`;
}

/** What a route is, in words: "Korr Pass" or "Shipping lane from Saltmouth port". */
export function routeTitle(route: TradeRoute): string {
  return route.kind === 'crossing' ? route.name : `Shipping lane from ${route.name}`;
}

/** What a route is and how it stands, in words, as the map and its card describe it. */
export function routeDescription(route: TradeRoute, neighbourName: string | null): string {
  const what = route.kind === 'crossing' ? [`border crossing to ${neighbourName ?? ''}`] : [];
  const how =
    route.state === 'missing'
      ? `missing trade link: it would carry ${formatTonnes(route.capacity)} a quarter once the port is in use`
      : `carried ${carriedText(route)} last quarter`;
  const weak =
    route.state === 'weak' ? ['weak trade link: half its capacity while the port decays'] : [];
  return [routeTitle(route), ...what, how, ...weak].join(', ');
}

interface TradeRouteMarkProps {
  readonly route: TradeRoute;
  /** The neighbour a border crossing leads to, or null for a shipping lane. */
  readonly neighbour: Neighbour | null;
  readonly palette: MapPalette;
  readonly selected: boolean;
  /**
   * Whether the infrastructure lens is chosen, which tags a weak trade link as such. A
   * missing trade link is drawn only then.
   */
  readonly infrastructure: boolean;
  readonly onSelect: (routeId: string) => void;
}

/**
 * A trade route on the map. It is a button: picking it opens the route's card. A route in
 * use is a dark line as wide as what it can carry, with a pale core as wide as the share of
 * it carried last quarter, and a tag that gives both in tonnes. A border crossing also has a
 * bar across the border where it stands. A missing trade link is dotted, in the style of a
 * missing link in a chain, and tagged; a weak one is dashed, and tagged under the
 * infrastructure lens.
 */
export function TradeRouteMark(props: TradeRouteMarkProps) {
  const { route, neighbour, palette, selected, infrastructure, onSelect } = props;
  const [start = [0, 0], end = start] = [route.path[0], route.path.at(-1)];
  const points = route.path.map(([x, y]) => `${x},${y}`).join(' ');
  const width = routeWidth(route.capacity);
  const share = route.capacity > 0 ? route.carried.total / route.capacity : 0;
  const missing = route.state === 'missing';
  const weak = route.state === 'weak';
  const tags = [
    ...(missing ? [{ text: '✕ Missing trade link', fill: palette.tagText }] : []),
    ...(!missing ? [{ text: carriedText(route), fill: palette.tagText }] : []),
    ...(weak && infrastructure ? [{ text: '▲ Weak trade link', fill: palette.tagText }] : []),
  ];
  const halfWidth = Math.max(...tags.map((tag) => tagWidthOf(tag.text))) / 2;
  const { at: place, stack } = tagPlace(route, start, end, halfWidth, neighbour?.label ?? null);
  return (
    <g
      className="map__route"
      role="button"
      tabIndex={0}
      aria-label={routeDescription(route, neighbour?.name ?? null)}
      aria-pressed={selected}
      data-kind={route.kind}
      onClick={() => {
        onSelect(route.id);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(route.id);
        }
      }}
    >
      <title>{routeTitle(route)}</title>
      <g fill="none" strokeLinecap="round">
        {/* A wide unseen line, so the route is easy to hit. */}
        <polyline points={points} stroke="transparent" strokeWidth="18" />
        {selected && (
          <polyline
            className="map__route-halo"
            points={points}
            stroke={palette.selection}
            strokeOpacity="0.55"
            strokeWidth={width + 7}
          />
        )}
        {!missing && (
          // A pale edge, so the route shows on dark ground and light.
          <polyline
            points={points}
            stroke={palette.road}
            strokeOpacity="0.8"
            strokeWidth={width + 2.5}
            strokeLinecap="butt"
          />
        )}
        {missing ? (
          <>
            <polyline
              points={points}
              stroke={palette.tagBackground}
              strokeWidth="9"
              strokeOpacity="0.85"
            />
            <polyline
              className="map__missing-trade-link"
              points={points}
              stroke={palette.tagText}
              strokeWidth="6"
              strokeDasharray="0.1 11"
            />
          </>
        ) : (
          <>
            <polyline
              className="map__route-capacity"
              points={points}
              stroke={palette.roadCasing}
              strokeWidth={width}
              strokeLinecap="butt"
              {...(weak ? { strokeDasharray: '10 5' } : {})}
            />
            {share > 0 && (
              <polyline
                className="map__route-carried"
                points={points}
                stroke={palette.road}
                strokeWidth={Math.max(1.2, (width - 2) * Math.min(1, share))}
                strokeLinecap="butt"
              />
            )}
          </>
        )}
        {route.kind === 'crossing' && <CrossingBar at={start} towards={end} palette={palette} />}
      </g>
      {tags.map((tag, index) => {
        const tagWidth = tagWidthOf(tag.text);
        const x = clamp(place[0], tagWidth / 2 + 4, MAP_FRAME.width - tagWidth / 2 - 4);
        const top = clamp(place[1] - 11 + stack * index * 25, 4, MAP_FRAME.height - 26);
        return (
          <g key={tag.text}>
            <rect
              x={x - tagWidth / 2}
              y={top}
              width={tagWidth}
              height="22"
              rx="11"
              fill={palette.tagBackground}
            />
            <text className="map__tag" x={x} y={top + 15.5} fill={tag.fill}>
              {tag.text}
            </text>
          </g>
        );
      })}
    </g>
  );
}

/** The bar a border crossing draws across the border where it stands. */
function CrossingBar(props: {
  readonly at: Point;
  readonly towards: Point;
  readonly palette: MapPalette;
}) {
  const { at, towards, palette } = props;
  const length = Math.hypot(towards[0] - at[0], towards[1] - at[1]) || 1;
  // Across the route, 10 either side of the border.
  const [dx, dy] = [((at[1] - towards[1]) / length) * 10, ((towards[0] - at[0]) / length) * 10];
  const d = `M${at[0] - dx},${at[1] - dy} L${at[0] + dx},${at[1] + dy}`;
  return (
    <g className="map__crossing-bar">
      <path d={d} stroke={palette.tagBackground} strokeWidth="7" />
      <path d={d} stroke={palette.tagText} strokeWidth="3" />
    </g>
  );
}

/** How wide a tag is drawn for its text. */
function tagWidthOf(text: string): number {
  return text.length * 6.7 + 22;
}

/**
 * Where a route's tags go: the centre of the first, and whether the others stack below it (1)
 * or above it (-1). A border crossing's tags sit beside its mark, on the side away from the
 * neighbour's name. A shipping lane's sit to one side of it, up or to the right, a third of
 * the way from its port and clear of the port's marker.
 */
function tagPlace(
  route: TradeRoute,
  start: Point,
  end: Point,
  halfWidth: number,
  avoid: Point | null,
): { at: Point; stack: 1 | -1 } {
  const length = Math.hypot(end[0] - start[0], end[1] - start[1]) || 1;
  const [ux, uy] = [(end[0] - start[0]) / length, (end[1] - start[1]) / length];
  if (route.kind === 'crossing') {
    const middle: Point = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2];
    const beside = (side: number): Point => [middle[0] + side * (halfWidth + 14), middle[1]];
    const away = (point: Point) =>
      avoid === null ? 0 : Math.hypot(point[0] - avoid[0], point[1] - avoid[1]);
    return { at: away(beside(1)) > away(beside(-1)) ? beside(1) : beside(-1), stack: 1 };
  }
  const along = Math.max(60, length / 3);
  const [sx, sy] = uy === 0 ? [0, -1] : [Math.abs(uy), -ux * Math.sign(uy)];
  // Far enough to the side that the tag clears the lane, and the port's marker beside it.
  const aside = Math.max(halfWidth * Math.abs(sx) + 11 * Math.abs(sy) + 8, 36);
  return {
    at: [start[0] + ux * along + sx * aside, start[1] + uy * along + sy * aside],
    stack: sy < 0 ? -1 : 1,
  };
}

function clamp(value: number, least: number, most: number): number {
  return Math.min(most, Math.max(least, value));
}
