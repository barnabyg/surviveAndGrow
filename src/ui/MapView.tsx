import {
  describeEvent,
  describeUnrest,
  FOOD_STAGE_NAMES,
  MAP_FRAME,
  type Decoration,
  type GameState,
  type LabelSide,
  type Point,
  type Region,
  type Settlement,
} from '../sim';
import { tierOnePalette, type MapPalette } from './mapPalette';

interface MapViewProps {
  readonly game: GameState;
  /** The region the player has picked out, if any. */
  readonly selectedRegionId: string | null;
  /** The region food relief is being sent to, if any. */
  readonly reliefRegionId: string | null;
  readonly onSelectRegion: (regionId: string) => void;
}

/**
 * The country, drawn entirely from its country file and the state of the game. Nothing
 * here knows any one country.
 */
export function MapView(props: MapViewProps) {
  const { game, selectedRegionId, reliefRegionId, onSelectRegion } = props;
  const { country } = game;
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
        <RegionShape
          key={region.id}
          region={region}
          game={game}
          palette={palette}
          selected={region.id === selectedRegionId}
          relieved={region.id === reliefRegionId}
          onSelect={onSelectRegion}
        />
      ))}

      {/* Everything from here down is drawn over the regions and lets clicks through. */}
      <g className="map__overlay">
        {/* A region struck by an event is tinted and hatched round its edge. */}
        {game.events.map((event) => {
          const region = country.regions.find((candidate) => candidate.id === event.regionId);
          return (
            region && (
              <polygon
                key={`${event.type}-${event.regionId}`}
                points={outline(region.shape)}
                fill={palette.eventTint}
                fillOpacity="0.18"
                stroke={palette.eventLine}
                strokeWidth="2"
                strokeDasharray="2 5"
              />
            )
          );
        })}

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

        {country.regions
          .filter((region) => region.id === selectedRegionId)
          .map((region) => (
            <polygon
              key={region.id}
              points={outline(region.shape)}
              fill="none"
              stroke={palette.selection}
              strokeWidth="3"
              strokeLinejoin="round"
              role="img"
              aria-label={`${region.name} is picked out`}
            />
          ))}

        {country.settlements.map((settlement) => (
          <SettlementMark
            key={settlement.id}
            settlement={settlement}
            palette={palette}
            ground={palette.terrain[terrainOf.get(settlement.regionId) ?? 'plains']}
          />
        ))}

        {country.regions.map((region) => (
          <RegionLabel
            key={region.id}
            region={region}
            game={game}
            palette={palette}
            relieved={region.id === reliefRegionId}
          />
        ))}
      </g>
    </svg>
  );
}

interface RegionShapeProps {
  readonly region: Region;
  readonly game: GameState;
  readonly palette: MapPalette;
  readonly selected: boolean;
  readonly relieved: boolean;
  readonly onSelect: (regionId: string) => void;
}

/** The land of one region. It is a button: picking it opens the region's card. */
function RegionShape({ region, game, palette, selected, relieved, onSelect }: RegionShapeProps) {
  const state = game.regions.find((candidate) => candidate.id === region.id);
  const stage = state?.foodStage ?? 'adequate';
  const unrest = describeUnrest(state?.unrest ?? 'calm');
  const events = game.events.filter((event) => event.regionId === region.id);
  const description = [
    region.name,
    `food ${FOOD_STAGE_NAMES[stage].toLowerCase()}`,
    ...events.map((event) => describeEvent(event)),
    ...(unrest === null ? [] : [unrest]),
    ...(relieved ? ['food relief being sent'] : []),
  ].join(', ');
  return (
    <polygon
      className="map__region"
      points={outline(region.shape)}
      fill={palette.terrain[region.terrain]}
      role="button"
      tabIndex={0}
      aria-label={description}
      aria-pressed={selected}
      onClick={() => {
        onSelect(region.id);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(region.id);
        }
      }}
    />
  );
}

interface RegionLabelProps {
  readonly region: Region;
  readonly game: GameState;
  readonly palette: MapPalette;
  readonly relieved: boolean;
}

/**
 * A region's name, with its food stage beneath and a tag for each event and for relief.
 * A region in trouble gets a dark tag with a warning mark, so the stage never rests on
 * colour alone.
 */
function RegionLabel({ region, game, palette, relieved }: RegionLabelProps) {
  const [x, y] = region.label;
  const state = game.regions.find((candidate) => candidate.id === region.id);
  const stage = state?.foodStage ?? 'adequate';
  const unrest = describeUnrest(state?.unrest ?? 'calm');
  const tags = [
    ...(stage === 'adequate' ? [] : [`▲ Food: ${FOOD_STAGE_NAMES[stage]}`]),
    ...game.events
      .filter((event) => event.regionId === region.id)
      .map((event) => describeEvent(event)),
    ...(unrest === null ? [] : [`▲ ${unrest}`]),
    ...(relieved ? ['Food relief on its way'] : []),
  ];
  return (
    <g>
      <text className="map__region-label" x={x} y={y} fill={palette.regionLabel}>
        {region.name}
      </text>
      {stage === 'adequate' && (
        <text className="map__region-stage" x={x} y={y + 15} fill={palette.regionLabel}>
          Food: {FOOD_STAGE_NAMES[stage]}
        </text>
      )}
      {tags.map((tag, index) => {
        const top = y + (stage === 'adequate' ? 22 : 7) + index * 26;
        const width = tag.length * 6.7 + 22;
        return (
          <g key={tag}>
            <rect
              x={x - width / 2}
              y={top}
              width={width}
              height="22"
              rx="11"
              fill={palette.tagBackground}
            />
            <text className="map__tag" x={x} y={top + 15.5} fill={palette.tagText}>
              {tag}
            </text>
          </g>
        );
      })}
    </g>
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
