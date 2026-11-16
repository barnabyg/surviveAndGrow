import {
  MAP_FRAME,
  type Country,
  type Decoration,
  type LabelSide,
  type Point,
  type Settlement,
} from '../sim';
import { tierOnePalette, type MapPalette } from './mapPalette';

/** The country, drawn entirely from its country file. Nothing here knows any one country. */
export function MapView({ country }: { readonly country: Country }) {
  const palette = tierOnePalette;
  const terrainOf = new Map(country.regions.map((region) => [region.id, region.terrain]));

  return (
    <svg
      className="map"
      viewBox={`0 0 ${MAP_FRAME.width} ${MAP_FRAME.height}`}
      role="group"
      aria-label={`Map of ${country.name}`}
      style={{ background: palette.sea }}
    >
      {/* Shallow water: a soft glow where land meets the sea. */}
      <g fill="none" stroke={palette.coastGlow} strokeLinejoin="round" aria-hidden="true">
        {country.regions.map((region) => (
          <g key={region.id}>
            <polygon points={outline(region.shape)} strokeOpacity="0.1" strokeWidth="36" />
            <polygon points={outline(region.shape)} strokeOpacity="0.13" strokeWidth="16" />
          </g>
        ))}
        {country.map.neighbours.map((neighbour) => (
          <polygon
            key={neighbour.id}
            points={outline(neighbour.shape)}
            strokeOpacity="0.1"
            strokeWidth="30"
          />
        ))}
      </g>

      {/* Neighbours and sea are muted so that the player's country stands out. */}
      {country.map.neighbours.map((neighbour) => (
        <polygon
          key={neighbour.id}
          points={outline(neighbour.shape)}
          fill={palette.neighbour}
          stroke={palette.neighbourBorder}
          strokeWidth="1"
        />
      ))}
      {country.map.seas.map((sea) => (
        <text key={sea.name} className="map__sea-label" {...at(sea.label)} fill={palette.seaLabel}>
          {sea.name}
        </text>
      ))}
      {country.map.neighbours.map((neighbour) => (
        <text
          key={neighbour.id}
          className="map__neighbour-label"
          {...at(neighbour.label)}
          fill={palette.neighbourLabel}
        >
          {neighbour.name}
        </text>
      ))}

      {/* The regions. The dark stroke beneath the fills survives only around the outside,
          which gives the country its outline without joining the shapes together. */}
      <g fill="none" stroke={palette.outline} strokeWidth="4" strokeLinejoin="round">
        {country.regions.map((region) => (
          <polygon key={region.id} points={outline(region.shape)} />
        ))}
      </g>
      {country.regions.map((region) => (
        <polygon
          key={region.id}
          points={outline(region.shape)}
          fill={palette.terrain[region.terrain]}
        />
      ))}

      <g aria-hidden="true">
        {country.map.decorations.map((decoration, index) => (
          <DecorationMark key={index} decoration={decoration} palette={palette} />
        ))}
      </g>

      <g
        fill="none"
        stroke={palette.regionBorder}
        strokeWidth="1.2"
        strokeDasharray="5 4"
        strokeOpacity="0.75"
        aria-hidden="true"
      >
        {country.regions.map((region) => (
          <polygon key={region.id} points={outline(region.shape)} />
        ))}
      </g>

      <g fill="none" stroke={palette.river} strokeWidth="3" strokeLinecap="round">
        {country.map.rivers.map((river) => (
          <path key={river.id} d={flowing(river.course)}>
            <title>{river.name}</title>
          </path>
        ))}
      </g>

      {country.regions.map((region) => (
        <text
          key={region.id}
          className="map__region-label"
          {...at(region.label)}
          fill={palette.regionLabel}
        >
          {region.name}
        </text>
      ))}

      {country.settlements.map((settlement) => (
        <SettlementMark
          key={settlement.id}
          settlement={settlement}
          palette={palette}
          ground={palette.terrain[terrainOf.get(settlement.regionId) ?? 'plains']}
        />
      ))}
    </svg>
  );
}

function outline(shape: readonly Point[]): string {
  return shape.map(([x, y]) => `${x},${y}`).join(' ');
}

function at([x, y]: Point): { x: number; y: number } {
  return { x, y };
}

/** A smooth line through the points of a river's course. */
function flowing(course: readonly Point[]): string {
  return course
    .map(([x, y], index) => {
      if (index === 0) return `M${x},${y}`;
      const next = course[index + 1];
      // Curve through each bend towards the midpoint of the next stretch; end on the mouth.
      return next === undefined
        ? `L${x},${y}`
        : `Q${x},${y} ${(x + next[0]) / 2},${(y + next[1]) / 2}`;
    })
    .join(' ');
}

interface DecorationMarkProps {
  readonly decoration: Decoration;
  readonly palette: MapPalette;
}

function DecorationMark({ decoration, palette }: DecorationMarkProps) {
  const [x, y] = decoration.at;
  switch (decoration.kind) {
    case 'mountain':
      return (
        <g stroke={palette.mountainLine} strokeLinejoin="round">
          <path
            d={`M${x - 13},${y} L${x},${y - 20} L${x + 13},${y}Z`}
            fill={palette.mountain}
            strokeWidth="1.4"
          />
          <path d={`M${x},${y - 20} l4,9 l-3,3 l4,8`} fill="none" strokeWidth="1" />
        </g>
      );
    case 'dune':
      return (
        <path
          d={`M${x - 9},${y} q9,-7 18,0`}
          fill="none"
          stroke={palette.dune}
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      );
    case 'field':
      return (
        <path
          d={`M${x - 8},${y - 2} l16,-3 M${x - 8},${y + 2} l16,-3 M${x - 8},${y + 6} l16,-3`}
          fill="none"
          stroke={palette.field}
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      );
  }
}

/** Where each small building of a settlement sits, relative to its centre. */
const BUILDINGS = {
  town: [
    [-10, -6],
    [-4, -9],
    [2, -6],
    [-8, 0],
    [-2, -2],
    [4, 0],
    [-4, 5],
    [3, 6],
  ],
  village: [
    [-6, -4],
    [0, -6],
    [-2, 2],
  ],
} as const;

const LABEL_PLACES: Readonly<
  Record<LabelSide, { dx: number; dy: number; anchor: 'start' | 'middle' | 'end' }>
> = {
  right: { dx: 13, dy: 4, anchor: 'start' },
  left: { dx: -14, dy: 4, anchor: 'end' },
  above: { dx: 0, dy: -14, anchor: 'middle' },
  below: { dx: 0, dy: 23, anchor: 'middle' },
};

interface SettlementMarkProps {
  readonly settlement: Settlement;
  readonly palette: MapPalette;
  /** The colour of the land beneath, used as a halo so the name stays readable. */
  readonly ground: string;
}

function SettlementMark({ settlement, palette, ground }: SettlementMarkProps) {
  const [x, y] = settlement.at;
  const place = LABEL_PLACES[settlement.labelSide];
  return (
    <g>
      <g fill={palette.settlement} aria-hidden="true">
        {BUILDINGS[settlement.size].map(([dx, dy]) => (
          <rect key={`${dx},${dy}`} x={x + dx} y={y + dy} width="5" height="5" />
        ))}
      </g>
      <text
        className={`map__settlement-label map__settlement-label--${settlement.size}`}
        x={x + place.dx}
        y={y + place.dy}
        textAnchor={place.anchor}
        fill={palette.settlementLabel}
        stroke={ground}
      >
        {settlement.name}
      </text>
    </g>
  );
}
