import { SITE_TYPE_NAMES, type Point, type Site, type SiteType } from '../sim';
import type { MapPalette } from './mapPalette';

/** The symbol for each type of site, drawn about the centre of its round marker. */
const SYMBOLS: Readonly<Record<SiteType, string>> = {
  // A drop of water.
  irrigation: 'M0,-7 C4,-2 5,1 5,3 A5,5 0 0 1 -5,3 C-5,1 -4,-2 0,-7Z',
  // A road running away from the eye, with its centre line.
  farmRoad: 'M-5,7 L-2,-7 M5,7 L2,-7 M0,6 V3 M0,0 V-3',
  // A store house with its door.
  grainStore: 'M-5,6 V-2 L0,-7 L5,-2 V6Z M-2,6 V2 H2 V6',
};

/** How a site stands, in words: an empty site that runs along a line is a possible route. */
export function siteStateName(site: Site): string {
  return site.form === 'route' ? 'Possible route' : 'Empty site';
}

/** Where a site's round marker is drawn: where it stands, or half way along its route. */
export function markerPlace(site: Site): Point {
  return site.form === 'route' ? halfWayAlong(site.route) : site.at;
}

interface SiteMarkProps {
  readonly site: Site;
  readonly palette: MapPalette;
  readonly selected: boolean;
  readonly onSelect: (siteId: string) => void;
}

/**
 * One site on the map. It is a button: picking it opens the site's card. An empty site is
 * a dashed round marker carrying the symbol of its type, and a route that could be built
 * is a dashed line with its marker half way along.
 */
export function SiteMark({ site, palette, selected, onSelect }: SiteMarkProps) {
  const [x, y] = markerPlace(site);
  const description = [
    site.name,
    SITE_TYPE_NAMES[site.type].toLowerCase(),
    siteStateName(site).toLowerCase(),
  ].join(', ');
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
      <title>{site.name}</title>
      {site.form === 'route' && (
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          {/* A wide unseen line, so the route is easy to hit. */}
          <polyline points={line(site.route)} stroke="transparent" strokeWidth="16" />
          {selected && (
            <polyline points={line(site.route)} stroke={palette.selection} strokeWidth="7" />
          )}
          <polyline
            points={line(site.route)}
            stroke={palette.siteLine}
            strokeOpacity={selected ? 0.9 : 0.55}
            strokeWidth="2"
            strokeDasharray="7 6"
            strokeLinecap="butt"
          />
        </g>
      )}
      <g transform={`translate(${x},${y})`}>
        <circle className="map__site-focus" r="19" fill="none" strokeWidth="2.5" />
        {selected && <circle r="19" fill="none" stroke={palette.selection} strokeWidth="2.5" />}
        <circle
          r="13"
          fill={palette.site}
          fillOpacity={selected ? 0.95 : 0.75}
          stroke={palette.siteLine}
          strokeWidth="1.5"
          strokeDasharray="3 3"
        />
        <path
          d={SYMBOLS[site.type]}
          fill="none"
          stroke={palette.siteLine}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      {selected && (
        <g>
          <rect
            x={x - site.name.length * 3.35 - 11}
            y={y + 24}
            width={site.name.length * 6.7 + 22}
            height="22"
            rx="11"
            fill={palette.tagBackground}
          />
          <text className="map__tag" x={x} y={y + 39.5} fill={palette.selection}>
            {site.name}
          </text>
        </g>
      )}
    </g>
  );
}

function line(route: readonly Point[]): string {
  return route.map(([x, y]) => `${x},${y}`).join(' ');
}

/** The point half way along a line, measured along its length. */
function halfWayAlong(route: readonly Point[]): Point {
  const lengths = route
    .slice(1)
    .map(([x, y], index) => Math.hypot(x - (route[index]?.[0] ?? x), y - (route[index]?.[1] ?? y)));
  let left = lengths.reduce((total, length) => total + length, 0) / 2;
  for (const [index, length] of lengths.entries()) {
    const from = route[index];
    const to = route[index + 1];
    if (from === undefined || to === undefined) break;
    if (left <= length && length > 0) {
      const share = left / length;
      return [from[0] + (to[0] - from[0]) * share, from[1] + (to[1] - from[1]) * share];
    }
    left -= length;
  }
  return route[0] ?? [0, 0];
}
