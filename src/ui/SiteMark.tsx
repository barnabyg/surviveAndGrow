import {
  formatMoney,
  siteTerms,
  SITE_STATE_NAMES,
  SITE_TYPE_NAMES,
  type Point,
  type Site,
  type SiteStatus,
  type SiteType,
} from '../sim';
import type { MapPalette } from './mapPalette';

/** The symbol for each type of site, drawn about the centre of its round marker. */
const SYMBOLS: Readonly<Record<SiteType, string>> = {
  // A drop of water.
  irrigation: 'M0,-7 C4,-2 5,1 5,3 A5,5 0 0 1 -5,3 C-5,1 -4,-2 0,-7Z',
  // A road running away from the eye, with its centre line.
  farmRoad: 'M-5,7 L-2,-7 M5,7 L2,-7 M0,6 V3 M0,0 V-3',
  // A store house with its door.
  grainStore: 'M-5,6 V-2 L0,-7 L5,-2 V6Z M-2,6 V2 H2 V6',
  // Crossed pick and hammer.
  mine: 'M-6,6 L5,-5 M2,-7 C5,-7 7,-5 7,-2 M6,6 L-4,-4 M-7,-3 L-3,-7',
  // A wide road with two lanes and their dividing line.
  trunkRoad: 'M-7,7 L-3,-7 M7,7 L3,-7 M0,7 V4 M0,1 V-2 M0,-5 V-7',
  // An anchor.
  port: 'M0,-7 V7 M-2,-5 H2 M-6,1 C-6,5 -3,7 0,7 C3,7 6,5 6,1',
};

/**
 * How a site stands, in words. An empty site that runs along a line is a possible route,
 * and one the player means to start on this quarter is planned.
 */
export function siteStateName(site: Site, status: SiteStatus, planned: boolean): string {
  if (planned) return 'Planned';
  if (status.state === 'empty') return site.form === 'route' ? 'Possible route' : 'Empty site';
  return SITE_STATE_NAMES[status.state];
}

/** How far building has got: "2 of 3". */
export function progressOf(status: SiteStatus): string {
  return `${status.quartersPaid} of ${status.buildQuarters}`;
}

/** Where a site's round marker is drawn: where it stands, or half way along its route. */
export function markerPlace(site: Site): Point {
  return site.form === 'route' ? (splitAt(site.route, 0.5)[0].at(-1) ?? [0, 0]) : site.at;
}

interface SiteMarkProps {
  readonly site: Site;
  readonly status: SiteStatus;
  /** Whether the player means to start building here when the quarter ends. */
  readonly planned: boolean;
  readonly palette: MapPalette;
  readonly selected: boolean;
  readonly onSelect: (siteId: string) => void;
}

/**
 * One site on the map. It is a button: picking it opens the site's card. Each state has
 * its own shape as well as its own colour: an empty site is a dashed marker, one being
 * built wears a ring and says how far it has got, and one in use is solid. One in use that
 * is decaying for want of upkeep also wears the warning triangle and a tag that says so.
 */
export function SiteMark({ site, status, planned, palette, selected, onSelect }: SiteMarkProps) {
  const [x, y] = markerPlace(site);
  const underWay = status.state === 'building' || status.state === 'paused';
  const decaying = status.state === 'decaying';
  const inUse = status.state === 'operating' || decaying;
  // A site not yet begun still has its whole cost to pay, so it says what that is.
  const cost = status.state === 'empty' ? formatMoney(siteTerms(site.type).cost) : null;
  const description = [
    site.name,
    SITE_TYPE_NAMES[site.type].toLowerCase(),
    siteStateName(site, status, planned).toLowerCase(),
    ...(underWay ? [`${progressOf(status)} quarters built`] : []),
    ...(cost === null ? [] : [cost]),
  ].join(', ');
  const tags = [
    ...(planned ? [{ text: 'Planned', fill: palette.selection }] : []),
    ...(status.state === 'building' ? [{ text: progressOf(status), fill: palette.selection }] : []),
    ...(status.state === 'paused'
      ? [{ text: `▲ Paused · ${progressOf(status)}`, fill: palette.tagText }]
      : []),
    ...(decaying ? [{ text: '▲ Decaying', fill: palette.tagText }] : []),
    ...(selected ? [{ text: site.name, fill: palette.selection }] : []),
  ];
  return (
    <g
      className="map__site"
      role="button"
      tabIndex={0}
      aria-label={description}
      aria-pressed={selected}
      onClick={() => {
        onSelect(site.id);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(site.id);
        }
      }}
    >
      <title>{cost === null ? site.name : `${site.name} · ${cost}`}</title>
      {site.form === 'route' && (
        <RouteLine
          route={site.route}
          built={inUse ? 1 : status.quartersPaid / Math.max(1, status.buildQuarters)}
          started={planned || underWay}
          palette={palette}
          selected={selected}
        />
      )}
      <g transform={`translate(${x},${y})`}>
        <circle className="map__site-focus" r="21" fill="none" strokeWidth="2.5" />
        {selected && <circle r="21" fill="none" stroke={palette.selection} strokeWidth="2" />}
        {(planned || underWay) && (
          <circle
            r="16.5"
            fill="none"
            stroke={palette.selection}
            strokeWidth="3"
            {...(status.state === 'building' ? {} : { strokeDasharray: '4 3' })}
          />
        )}
        <circle
          r="13"
          fill={inUse ? palette.siteLine : palette.site}
          fillOpacity={inUse || selected ? 0.95 : 0.75}
          stroke={inUse ? palette.site : palette.siteLine}
          strokeWidth="1.5"
          {...(status.state === 'empty' ? { strokeDasharray: '3 3' } : {})}
        />
        <path
          d={SYMBOLS[site.type]}
          fill="none"
          stroke={inUse ? palette.site : palette.siteLine}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {decaying && <WarningTriangle palette={palette} />}
      </g>
      {tags.map((tag, index) => {
        const width = tag.text.length * 6.7 + 22;
        const top = y + 25 + index * 25;
        return (
          <g key={tag.text}>
            <rect
              x={x - width / 2}
              y={top}
              width={width}
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

/** The warning triangle, worn at the top right of a site's marker while it decays. */
function WarningTriangle({ palette }: { readonly palette: MapPalette }) {
  return (
    <g className="map__site-warning" transform="translate(12,-12)">
      <path
        d="M0,-9 L9,7 H-9 Z"
        fill={palette.tagBackground}
        stroke={palette.tagText}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M0,-3 V2 M0,4.5 V4.6"
        stroke={palette.tagText}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </g>
  );
}

interface RouteLineProps {
  readonly route: readonly Point[];
  /** The share of the route that is built, from none (0) to all of it (1). */
  readonly built: number;
  /** Whether building has been planned or begun, which turns the unbuilt part amber. */
  readonly started: boolean;
  readonly palette: MapPalette;
  readonly selected: boolean;
}

/**
 * A route. The built part is drawn as a road: a pale line in a dark casing. The part
 * still to build is dashed, in amber once work is planned or under way.
 */
function RouteLine({ route, built, started, palette, selected }: RouteLineProps) {
  const [road, rest] = splitAt(route, built);
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      {/* A wide unseen line, so the route is easy to hit. */}
      <polyline points={line(route)} stroke="transparent" strokeWidth="16" />
      {selected && (
        <polyline
          points={line(route)}
          stroke={palette.selection}
          strokeOpacity="0.55"
          strokeWidth="9"
        />
      )}
      {built < 1 && (
        <polyline
          points={line(rest)}
          stroke={started ? palette.construction : palette.siteLine}
          strokeOpacity={started || selected ? 1 : 0.55}
          strokeWidth={started ? 3 : 2}
          strokeDasharray={started ? '5 4' : '7 6'}
          strokeLinecap="butt"
        />
      )}
      {built > 0 && (
        <>
          <polyline points={line(road)} stroke={palette.roadCasing} strokeWidth="5" />
          <polyline points={line(road)} stroke={palette.road} strokeWidth="2.6" />
        </>
      )}
    </g>
  );
}

function line(route: readonly Point[]): string {
  return route.map(([x, y]) => `${x},${y}`).join(' ');
}

/**
 * Cuts a line in two at a share of its length, from none of it (0) to all of it (1). Both
 * parts include the point where it is cut.
 */
function splitAt(route: readonly Point[], share: number): [Point[], Point[]] {
  const lengths = route
    .slice(1)
    .map(([x, y], index) => Math.hypot(x - (route[index]?.[0] ?? x), y - (route[index]?.[1] ?? y)));
  let left = lengths.reduce((total, length) => total + length, 0) * Math.min(1, Math.max(0, share));
  for (const [index, length] of lengths.entries()) {
    const from = route[index];
    const to = route[index + 1];
    if (from === undefined || to === undefined) break;
    if (left <= length && length > 0) {
      const along = left / length;
      const cut: Point = [from[0] + (to[0] - from[0]) * along, from[1] + (to[1] - from[1]) * along];
      return [
        [...route.slice(0, index + 1), cut],
        [cut, ...route.slice(index + 1)],
      ];
    }
    left -= length;
  }
  return [[...route], route.slice(-1)];
}
