import {
  formatMoney,
  isInUseState,
  listed,
  siteTerms,
  SITE_POWER_ROLES,
  SITE_STATE_NAMES,
  SITE_TYPE_NAMES,
  technologyName,
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
  // A small anchor above the waterline.
  shallowPort: 'M0,-7 V3 M-2,-5 H2 M-4,0 C-4,3 -2,4 0,4 C2,4 4,3 4,0 M-7,7 H7',
  // A bolt of lightning.
  powerStation: 'M2,-7 L-4,1 H0 L-2,7 L4,-1 H0 Z',
  // A pylon with its two cross-arms.
  powerLine: 'M0,-7 L-5,7 M0,-7 L5,7 M-6,-3 H6 M-3,2 H3',
  // A dam wall, with the water it holds back above it.
  dam: 'M-5,7 L-3,-1 H3 L5,7 Z M-7,-4 C-5,-6 -3,-6 -1,-4 C1,-2 3,-2 5,-4 L7,-5',
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
  /**
   * Whether the site is a missing link in the chain of the site picked out: one that chain
   * needs and that is not yet in use.
   */
  readonly missingLink: boolean;
  /**
   * Whether a missing link is ringed as well, as the infrastructure lens draws every one, and
   * its route dotted more boldly.
   */
  readonly ringed: boolean;
  /** Whether the site is the source of a chain, in use, that earns nothing for want of links. */
  readonly idle: boolean;
  /** The name of the alternative whose building closed the site, or null while it is open. */
  readonly closedBy: string | null;
  readonly onSelect: (siteId: string) => void;
}

/**
 * One site on the map. It is a button: picking it opens the site's card. Each state has
 * its own shape as well as its own colour: an empty site is a dashed marker, one being
 * built wears a ring and says how far it has got, and one in use is solid. One in use that
 * is decaying, for want of upkeep or from a flood, also wears the warning triangle and a tag
 * that says so.
 * A missing link in the chain picked out wears a cross and a tag, and its route is dotted;
 * ringed, it also wears a broken ring, and its route's dots are larger.
 * A site closed by building on one of its alternatives is faded and struck through.
 * A site locked until research is done is faded and dashed, and wears a padlock.
 */
export function SiteMark(props: SiteMarkProps) {
  const { site, status, planned, palette, selected, missingLink, ringed, idle, closedBy } = props;
  const { onSelect } = props;
  const [x, y] = markerPlace(site);
  const underWay = status.state === 'building' || status.state === 'paused';
  const decaying = status.state === 'decaying';
  const inUse = isInUseState(status.state);
  const closed = status.state === 'closed';
  const locked = status.state === 'locked';
  const needs = listed(status.lockedBy.map(technologyName));
  // A site not yet begun still has its whole cost to pay, so it says what that is.
  const cost = status.state === 'empty' ? formatMoney(siteTerms(site.type).cost) : null;
  const description = [
    site.name,
    SITE_TYPE_NAMES[site.type].toLowerCase(),
    siteStateName(site, status, planned).toLowerCase(),
    ...(underWay ? [`${progressOf(status)} quarters built`] : []),
    ...(cost === null ? [] : [cost]),
    ...(closed && closedBy !== null ? [`ruled out by ${closedBy}`] : []),
    ...(locked ? [`needs ${needs} researched first`] : []),
    ...(missingLink ? ['missing link'] : []),
    ...(idle ? ['earning nothing: its chain is not complete'] : []),
  ].join(', ');
  const tags = [
    ...(planned ? [{ text: 'Planned', fill: palette.selection }] : []),
    ...(status.state === 'building' ? [{ text: progressOf(status), fill: palette.selection }] : []),
    ...(status.state === 'paused'
      ? [{ text: `▲ Paused · ${progressOf(status)}`, fill: palette.tagText }]
      : []),
    ...(decaying ? [{ text: '▲ Decaying', fill: palette.tagText }] : []),
    ...(missingLink ? [{ text: '✕ Missing link', fill: palette.tagText }] : []),
    ...(idle ? [{ text: '▲ Earning nothing', fill: palette.tagText }] : []),
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
      <title>
        {cost !== null
          ? `${site.name} · ${cost}`
          : locked
            ? `${site.name} · locked: needs ${needs}`
            : site.name}
      </title>
      {site.form === 'route' && (
        <RouteLine
          route={site.route}
          built={inUse ? 1 : status.quartersPaid / Math.max(1, status.buildQuarters)}
          started={planned || underWay}
          missing={missingLink}
          bold={ringed}
          closed={closed || locked}
          power={SITE_POWER_ROLES[site.type] === 'line'}
          palette={palette}
          selected={selected}
        />
      )}
      <g transform={`translate(${x},${y})`}>
        <circle className="map__site-focus" r="21" fill="none" strokeWidth="2.5" />
        {ringed && <MissingRing palette={palette} />}
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
          fillOpacity={inUse || selected ? 0.95 : closed || locked ? 0.35 : 0.75}
          stroke={inUse ? palette.site : palette.siteLine}
          strokeWidth="1.5"
          {...(status.state === 'empty' || closed || locked ? { strokeDasharray: '3 3' } : {})}
        />
        <path
          d={SYMBOLS[site.type]}
          fill="none"
          stroke={inUse ? palette.site : palette.siteLine}
          strokeOpacity={closed || locked ? 0.45 : 1}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {closed && <ClosedStrike palette={palette} />}
        {locked && <Padlock palette={palette} />}
        {decaying && <WarningTriangle palette={palette} />}
        {missingLink && <MissingCross palette={palette} />}
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

/** The stroke struck through a site's marker once one of its alternatives has closed it. */
function ClosedStrike({ palette }: { readonly palette: MapPalette }) {
  return (
    <g className="map__site-closed" strokeLinecap="round">
      <path d="M-10,10 L10,-10" stroke={palette.tagBackground} strokeWidth="5" />
      <path d="M-10,10 L10,-10" stroke={palette.tagText} strokeWidth="2.5" />
    </g>
  );
}

/** The padlock worn at the top left of a site's marker while research must unlock it. */
function Padlock({ palette }: { readonly palette: MapPalette }) {
  return (
    <g className="map__site-locked" transform="translate(-12,-12)">
      <path
        d="M-3.5,-1 V-4 A3.5,3.5 0 0 1 3.5,-4 V-1"
        fill="none"
        stroke={palette.tagBackground}
        strokeWidth="4.5"
      />
      <path
        d="M-3.5,-1 V-4 A3.5,3.5 0 0 1 3.5,-4 V-1"
        fill="none"
        stroke={palette.tagText}
        strokeWidth="2"
      />
      <rect
        x="-6"
        y="-1.5"
        width="12"
        height="9"
        rx="1.5"
        fill={palette.tagBackground}
        stroke={palette.tagText}
        strokeWidth="1.5"
      />
      <path d="M0,1.5 V4" stroke={palette.tagText} strokeWidth="2" strokeLinecap="round" />
    </g>
  );
}

/** The broken ring round a missing link, over a dark one so that it shows on any ground. */
function MissingRing({ palette }: { readonly palette: MapPalette }) {
  return (
    <g className="map__missing-ring" fill="none">
      <circle r="19" stroke={palette.tagBackground} strokeWidth="5" />
      <circle r="19" stroke={palette.tagText} strokeWidth="2.5" strokeDasharray="6 4" />
    </g>
  );
}

/** The cross worn at the bottom right of a site's marker while it is a missing link. */
function MissingCross({ palette }: { readonly palette: MapPalette }) {
  return (
    <g className="map__site-missing" transform="translate(12,12)">
      <circle r="8" fill={palette.tagBackground} stroke={palette.tagText} strokeWidth="1.5" />
      <path
        d="M-3.5,-3.5 L3.5,3.5 M3.5,-3.5 L-3.5,3.5"
        stroke={palette.tagText}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </g>
  );
}

/** How the part of a route still to build is drawn: a power line finer than a road. */
const UNBUILT = {
  road: {
    width: { started: 3, other: 2 },
    dashes: { started: '5 4', closed: '2 5', possible: '7 6' },
  },
  power: {
    width: { started: 2, other: 1.5 },
    dashes: { started: '3 3', closed: '1.5 5', possible: '3 4' },
  },
} as const;

interface RouteLineProps {
  readonly route: readonly Point[];
  /** The share of the route that is built, from none (0) to all of it (1). */
  readonly built: number;
  /** Whether building has been planned or begun, which turns the unbuilt part amber. */
  readonly started: boolean;
  /** Whether the route is a missing link in the chain picked out, which dots its unbuilt part. */
  readonly missing: boolean;
  /** Whether a missing route is drawn as the infrastructure lens rings it: in larger dots. */
  readonly bold: boolean;
  /** Whether one of its alternatives has closed the route, which leaves it faint and finely dashed. */
  readonly closed: boolean;
  /** Whether the route is a power line, which is finely dashed in every state. */
  readonly power: boolean;
  readonly palette: MapPalette;
  readonly selected: boolean;
}

/**
 * A route. The built part is drawn as a road: a pale line in a dark casing. The part
 * still to build is dashed, in amber once work is planned or under way. A route that is a
 * missing link in the chain picked out is dotted instead, in round dots over a dark line,
 * which no dash of a possible or started route resembles. A closed route is faint and
 * finely dashed. A power line is drawn finer: short dashes while it is still to build, and
 * once built, pale dashes along a thin dark line, which no road resembles.
 */
function RouteLine(props: RouteLineProps) {
  const { route, built, started, missing, bold, closed, power, palette, selected } = props;
  const [road, rest] = splitAt(route, built);
  const unbuilt = UNBUILT[power ? 'power' : 'road'];
  return (
    <g
      className={power ? 'map__power-line' : undefined}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* A wide unseen line, so the route is easy to hit. */}
      <polyline points={line(route)} stroke="transparent" strokeWidth="16" />
      {selected && (
        <polyline
          className="map__route-halo"
          points={line(route)}
          stroke={palette.selection}
          strokeOpacity="0.55"
          strokeWidth="9"
        />
      )}
      {built < 1 && missing && (
        <>
          <polyline
            points={line(rest)}
            stroke={palette.tagBackground}
            strokeWidth={bold ? 9 : 6}
            strokeOpacity="0.85"
          />
          <polyline
            className="map__missing-link"
            points={line(rest)}
            stroke={palette.tagText}
            strokeWidth={bold ? 6 : 4}
            strokeDasharray={bold ? '0.1 11' : '0.1 9'}
            strokeLinecap="round"
          />
        </>
      )}
      {built < 1 && !missing && (
        <polyline
          points={line(rest)}
          stroke={started ? palette.construction : palette.siteLine}
          strokeOpacity={started || selected ? 1 : closed ? 0.3 : 0.55}
          strokeWidth={unbuilt.width[started ? 'started' : 'other']}
          strokeDasharray={unbuilt.dashes[started ? 'started' : closed ? 'closed' : 'possible']}
          strokeLinecap="butt"
        />
      )}
      {built > 0 && power && (
        <>
          <polyline
            className="map__power-casing"
            points={line(road)}
            stroke={palette.roadCasing}
            strokeWidth="3"
          />
          <polyline
            points={line(road)}
            stroke={palette.road}
            strokeWidth="1.5"
            strokeDasharray="3 2"
            strokeLinecap="butt"
          />
        </>
      )}
      {built > 0 && !power && (
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
