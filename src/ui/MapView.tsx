import { Fragment, useId } from 'react';
import {
  BORDER_INCIDENT_NAME,
  borderIncidentStatuses,
  chainOf,
  chains,
  chainsThrough,
  deterrenceStatus,
  describeEvent,
  describeUnrest,
  drawAt,
  FOOD_STAGE_NAMES,
  formatIndex,
  formatPercent,
  isInUseState,
  MAP_FRAME,
  neighbourBorder,
  settlementLooks,
  siteStatus,
  surveyStatuses,
  tradeRoutes,
  UNREST_NAMES,
  type Decoration,
  type GameState,
  type LabelSide,
  type Point,
  type Region,
  type Settlement,
  type SettlementLook,
  type SurveyState,
  type TradeOrder,
  UNREST_KINDS,
} from '../sim';
import { infrastructureWords, lensFill, livingStandardOf, needsLightInk, type Lens } from './lens';
import { TIER_PALETTES, type MapPalette } from './mapPalette';
import { NeighbourMark } from './NeighbourMark';
import { SiteMark } from './SiteMark';
import { TradeRouteMark } from './TradeRouteMark';
import './MapView.css';

interface MapViewProps {
  readonly game: GameState;
  /** What the map shows: the country as it looks, or its regions coloured by one figure. */
  readonly lens: Lens;
  /** The region the player has picked out, if any. */
  readonly selectedRegionId: string | null;
  /** The region food relief is being sent to, if any. */
  readonly reliefRegionId: string | null;
  readonly onSelectRegion: (regionId: string) => void;
  /** The site the player has picked out, if any. */
  readonly selectedSiteId: string | null;
  readonly onSelectSite: (siteId: string) => void;
  /** The sites the player means to start building on when the quarter ends. */
  readonly plannedSiteIds: readonly string[];
  /** The regions the player means to survey this quarter. */
  readonly plannedSurveys: readonly string[];
  /** The grain the player means to buy and sell abroad this quarter, which the routes carry. */
  readonly plannedTrade: readonly TradeOrder[];
  /** The trade route the player has picked out, if any. */
  readonly selectedRouteId: string | null;
  readonly onSelectRoute: (routeId: string) => void;
  /** The neighbour the player has picked out, if any. */
  readonly selectedNeighbourId: string | null;
  readonly onSelectNeighbour: (neighbourId: string) => void;
}

/** How one region is painted under the chosen lens. */
interface Paint {
  readonly fill: string;
  /** The colour of lettering that can be read over the fill. */
  readonly ink: string;
}

/**
 * The country, drawn entirely from its country file and the state of the game. Nothing
 * here knows any one country. A lens recolours the regions and changes the figure each is
 * labelled with; sites, routes, trade routes, neighbours, events and tags are drawn the same
 * under every lens, except that the infrastructure lens marks and rings every missing link in a chain and
 * marks every missing or weak trade link.
 */
export function MapView(props: MapViewProps) {
  const { game, lens, selectedRegionId, reliefRegionId, onSelectRegion } = props;
  const { selectedSiteId, onSelectSite, plannedSiteIds, plannedSurveys } = props;
  const { plannedTrade, selectedRouteId, onSelectRoute } = props;
  const { selectedNeighbourId, onSelectNeighbour } = props;
  const { country } = game;
  // The whole map takes on the look of the tier of prosperity in force.
  const palette = TIER_PALETTES[game.tier];
  const hatchId = useId();
  const plain = lens === 'country';
  const paintOf = new Map(
    country.regions.map((region): [string, Paint] => {
      const state = game.regions.find((candidate) => candidate.id === region.id);
      const fill = lensFill(lens, game, region, state, palette);
      const ink = plain
        ? palette.regionLabel
        : needsLightInk(fill)
          ? palette.lensLabelLight
          : palette.lensLabelDark;
      return [region.id, { fill, ink }];
    }),
  );
  const paint = (regionId: string): Paint =>
    paintOf.get(regionId) ?? { fill: palette.terrain.plains, ink: palette.regionLabel };
  // The links missing from the chains of the site picked out are drawn as such. The
  // infrastructure lens shows what is missing everywhere: every chain's missing links,
  // each ringed as well.
  const ringMissing = lens === 'infrastructure';
  const missingLinks = new Set(
    ringMissing
      ? chains(game).flatMap((chain) => chain.missing)
      : selectedSiteId === null
        ? []
        : chainsThrough(game, selectedSiteId).flatMap((chain) => chain.missing),
  );
  const isIdle = (siteId: string) => {
    const chain = chainOf(game, siteId);
    const state = siteStatus(game, siteId).state;
    return chain !== null && chain.output === 0 && isInUseState(state);
  };
  // The trade routes, with what they carry this quarter. A port not yet in use is a missing
  // trade link, drawn only under the infrastructure lens.
  const routes = tradeRoutes(game, plannedTrade).filter(
    (route) => ringMissing || route.state !== 'missing',
  );
  const neighbourOf = (routeId: string) => {
    const crossing = country.crossings.find((candidate) => candidate.id === routeId);
    return (
      country.map.neighbours.find((neighbour) => neighbour.id === crossing?.neighbourId) ?? null
    );
  };
  // What each neighbour intends, which its mark and its border are drawn by, and the border
  // incidents announced or in force, each drawn on its neighbour's border under every lens.
  const neighbourStatuses = deterrenceStatus(game).neighbours;
  const incidents = borderIncidentStatuses(game);
  // Settlements are built up and lit by their region's living standard, under every lens.
  const looks = settlementLooks(game);
  const lookOf = (settlementId: string): SettlementLook =>
    looks.find((look) => look.settlementId === settlementId) ?? { buildings: 0, lit: 0 };

  return (
    <svg
      className="map"
      viewBox={`0 0 ${MAP_FRAME.width} ${MAP_FRAME.height}`}
      role="group"
      aria-label={`Map of ${country.name}`}
      data-tier={game.tier}
      style={{ background: palette.sea }}
    >
      {/* The hatching for strikes, the cross-hatching for protests, and the glow of lit
          settlements. */}
      <defs>
        {UNREST_KINDS.map((unrest) => (
          <pattern
            key={unrest}
            id={`${hatchId}-${unrest}`}
            width="10"
            height="10"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <path
              d={unrest === 'strikes' ? 'M0,0 V10' : 'M0,0 V10 M0,0 H10'}
              stroke={palette.unrestMark}
              strokeOpacity="0.55"
              strokeWidth="2.4"
            />
          </pattern>
        ))}
        {/* The glow behind a lit settlement, fading out from its centre. */}
        <radialGradient id={`${hatchId}-glow`}>
          <stop offset="0" stopColor={palette.settlementGlow} stopOpacity="0.75" />
          <stop offset="1" stopColor={palette.settlementGlow} stopOpacity="0" />
        </radialGradient>
      </defs>
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

      {/* Neighbours and sea are muted so that the player's country stands out. A neighbour's
          land picks it out at a click, as its mark does for the keyboard. */}
      {country.map.neighbours.map((neighbour) => (
        <polygon
          key={neighbour.id}
          className="map__neighbour-land"
          points={outline(neighbour.shape)}
          fill={palette.neighbour}
          stroke={palette.neighbourBorder}
          strokeWidth="1"
          onClick={() => {
            onSelectNeighbour(neighbour.id);
          }}
        />
      ))}
      {country.map.seas.map((sea) => (
        <text key={sea.name} className="map__sea-label" {...at(sea.label)} fill={palette.seaLabel}>
          {sea.name}
        </text>
      ))}

      {/* The regions. The dark stroke beneath the fills survives only around the outside,
          which gives the country its outline without joining the shapes together. */}
      <g fill="none" stroke={palette.outline} strokeWidth="4" strokeLinejoin="round">
        {country.regions.map((region) => (
          <polygon key={region.id} points={outline(region.shape)} />
        ))}
      </g>
      {/* Each region's land, and over it the approval lens's mark for unrest: hatching,
          which reads without its colour. The two are drawn region by region, so a region
          lying inside another covers its neighbour's hatching as it covers its land. */}
      {country.regions.map((region) => {
        const unrest = game.regions.find((state) => state.id === region.id)?.unrest ?? 'calm';
        return (
          <Fragment key={region.id}>
            <RegionShape
              region={region}
              game={game}
              lens={lens}
              fill={paint(region.id).fill}
              selected={region.id === selectedRegionId}
              relieved={region.id === reliefRegionId}
              onSelect={onSelectRegion}
            />
            {lens === 'approval' && unrest !== 'calm' && (
              <polygon
                className="map__overlay"
                points={outline(region.shape)}
                fill={`url(#${hatchId}-${unrest})`}
                role="img"
                aria-label={`${UNREST_NAMES[unrest]} in ${region.name}`}
              />
            )}
          </Fragment>
        );
      })}

      {/* Everything from here down is drawn over the regions and lets clicks through. */}
      <g className="map__overlay">
        {/* A region struck by an event is tinted and hatched round its edge. Under a lens
            the tint is left off, so that the lens's colours stay true to its scale. */}
        {game.events.map((event) => {
          const region = country.regions.find((candidate) => candidate.id === event.regionId);
          return (
            region && (
              <polygon
                key={`${event.type}-${event.regionId}`}
                points={outline(region.shape)}
                fill={plain ? palette.eventTint : 'none'}
                fillOpacity="0.18"
                stroke={palette.eventLine}
                strokeWidth="2"
                strokeDasharray="2 5"
              />
            )
          );
        })}

        {/* The marks of the land belong to the country view; a lens shows one figure. */}
        {plain && (
          <g aria-hidden="true">
            {country.map.decorations.map((decoration, index) => (
              <DecorationMark key={index} decoration={decoration} palette={palette} />
            ))}
          </g>
        )}

        <g
          fill="none"
          stroke={plain ? palette.regionBorder : palette.lensBorder}
          strokeWidth="1.2"
          strokeDasharray="5 4"
          strokeOpacity="0.75"
          aria-hidden="true"
        >
          {country.regions.map((region) => (
            <polygon key={region.id} points={outline(region.shape)} />
          ))}
        </g>

        {/* Under a lens the river is drawn in the sea's dark blue, which shows against
            every step of both scales. */}
        <g
          fill="none"
          stroke={plain ? palette.river : palette.sea}
          strokeWidth="3"
          strokeLinecap="round"
        >
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
            look={lookOf(settlement.id)}
            palette={palette}
            glowId={`${hatchId}-glow`}
            ground={paint(settlement.regionId).fill}
            ink={plain ? null : paint(settlement.regionId).ink}
          />
        ))}

        {country.regions.map((region) => (
          <RegionLabel
            key={region.id}
            region={region}
            game={game}
            lens={lens}
            palette={palette}
            paint={paint(region.id)}
            relieved={region.id === reliefRegionId}
          />
        ))}

        {surveyStatuses(game, { startSurveys: plannedSurveys })
          .flatMap(({ regionId, state }) => {
            const region = country.regions.find((each) => each.id === regionId);
            return region === undefined || !isMarked(state) ? [] : [{ region, state }];
          })
          .map(({ region, state }, index) => (
            <SurveyMark
              key={region.id}
              region={region}
              state={state}
              palette={palette}
              toured={index === 0}
            />
          ))}
      </g>

      {/* Each neighbour's name, what it intends and its border, under the trade routes, so a
          crossing is never covered by the border it stands on. */}
      {country.map.neighbours.map((neighbour) => {
        const status = neighbourStatuses.find(
          (candidate) => candidate.neighbourId === neighbour.id,
        );
        return (
          status && (
            <NeighbourMark
              key={neighbour.id}
              neighbour={neighbour}
              status={status}
              border={neighbourBorder(country, neighbour.id)}
              incident={incidents.find((incident) => incident.neighbourId === neighbour.id) ?? null}
              palette={palette}
              selected={neighbour.id === selectedNeighbourId}
              onSelect={onSelectNeighbour}
            />
          )
        );
      })}

      {/* Trade routes go under the sites, so a lane never covers its port. */}
      {routes.map((route) => (
        <TradeRouteMark
          key={`${route.kind} ${route.id}`}
          route={route}
          neighbour={neighbourOf(route.id)}
          palette={palette}
          selected={route.id === selectedRouteId}
          infrastructure={ringMissing}
          onSelect={onSelectRoute}
        />
      ))}

      {/* Sites are drawn last, over everything, so that each can be picked. Routes go under
          the sites that stand in one place, so a route that starts at a site never covers it. */}
      {[
        ...country.sites.filter((site) => site.form === 'route'),
        ...country.sites.filter((site) => site.form === 'place'),
      ].map((site) => {
        const status = siteStatus(game, site.id);
        const closedBy = country.sites.find((other) => other.id === status.closedBy);
        return (
          <SiteMark
            key={site.id}
            site={site}
            status={status}
            planned={plannedSiteIds.includes(site.id)}
            palette={palette}
            selected={site.id === selectedSiteId}
            missingLink={missingLinks.has(site.id)}
            ringed={ringMissing && missingLinks.has(site.id)}
            idle={isIdle(site.id)}
            closedBy={closedBy?.name ?? null}
            onSelect={onSelectSite}
          />
        );
      })}
    </svg>
  );
}

/** How a region stands for a survey while the map marks it: it may still hide a deposit. */
type MarkedSurveyState = Exclude<SurveyState, 'barren' | 'surveyed'>;

/** Whether the map marks a region standing so for a survey. */
function isMarked(state: SurveyState): state is MarkedSurveyState {
  return state !== 'barren' && state !== 'surveyed';
}

/** How a region not yet surveyed is marked: what the magnifying glass says of it. */
const SURVEY_MARK_WORDS: Readonly<Record<MarkedSurveyState, string>> = {
  unsurveyed: 'not yet surveyed: a deposit of ore may lie here',
  planned: 'survey planned',
  surveying: 'being surveyed',
  paused: 'survey paused',
};

interface SurveyMarkProps {
  readonly region: Region;
  readonly state: MarkedSurveyState;
  readonly palette: MapPalette;
  /** Whether this is the mark the tour's step on surveys picks out: the first on the map. */
  readonly toured: boolean;
}

/**
 * A magnifying glass above a region's name while the region may still hide a deposit, the
 * shape the legend explains. Its glass is filled once a survey is planned or under way, and its
 * name says which, so the mark never rests on colour alone.
 */
function SurveyMark({ region, state, palette, toured }: SurveyMarkProps) {
  const [x, y] = region.label;
  const underway = state !== 'unsurveyed';
  return (
    <g
      className="map__survey"
      data-tour={toured ? 'survey' : undefined}
      transform={`translate(${x} ${y - 30})`}
      role="img"
      aria-label={`${region.name}: ${SURVEY_MARK_WORDS[state]}`}
    >
      <circle r="9" fill={palette.tagBackground} />
      <circle
        cx="-1.5"
        cy="-1.5"
        r="3.5"
        fill={underway ? palette.tagText : 'none'}
        stroke={palette.tagText}
        strokeWidth="1.5"
      />
      <path d="M1,1 L5,5" stroke={palette.tagText} strokeWidth="2" strokeLinecap="round" />
    </g>
  );
}

interface RegionShapeProps {
  readonly region: Region;
  readonly game: GameState;
  readonly lens: Lens;
  readonly fill: string;
  readonly selected: boolean;
  readonly relieved: boolean;
  readonly onSelect: (regionId: string) => void;
}

/**
 * The land of one region. It is a button: picking it opens the region's card. Its name
 * gives the figure the lens shows, so the colour is never the only way to read it.
 */
function RegionShape(props: RegionShapeProps) {
  const { region, game, lens, fill, selected, relieved, onSelect } = props;
  const state = game.regions.find((candidate) => candidate.id === region.id);
  const stage = state?.foodStage ?? 'adequate';
  const unrest = describeUnrest(state?.unrest ?? 'calm');
  const events = game.events.filter((event) => event.regionId === region.id);
  const description = [
    region.name,
    lens === 'approval'
      ? `approval ${formatPercent(state?.approval ?? 0)}`
      : lens === 'living'
        ? `living standard ${formatIndex(livingStandardOf(game, region.id))}`
        : lens === 'infrastructure'
          ? infrastructureWords(game, region.id).description
          : `food ${FOOD_STAGE_NAMES[stage].toLowerCase()}`,
    ...events.map((event) => describeEvent(game, event)),
    ...(unrest === null ? [] : [unrest]),
    ...incidentTags(game, region.id).map((tag) => tag.toLowerCase()),
    ...(relieved ? ['food relief being sent'] : []),
  ].join(', ');
  return (
    <polygon
      className="map__region"
      points={outline(region.shape)}
      fill={fill}
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
  readonly lens: Lens;
  readonly palette: MapPalette;
  readonly paint: Paint;
  readonly relieved: boolean;
}

/**
 * A region's name, with the figure the lens shows beneath: its approval under the approval
 * lens, its living standard under the living-standards lens, its infrastructure access under
 * the infrastructure lens, and its food stage otherwise. Then a tag for hunger, for each
 * event, for unrest, for a border incident in force on its border and for relief. A region in trouble gets a dark tag with a warning mark, so its state never
 * rests on colour alone.
 */
function RegionLabel({ region, game, lens, palette, paint, relieved }: RegionLabelProps) {
  const [x, y] = region.label;
  const state = game.regions.find((candidate) => candidate.id === region.id);
  const stage = state?.foodStage ?? 'adequate';
  const unrest = describeUnrest(state?.unrest ?? 'calm');
  const tags = [
    ...(stage === 'adequate' ? [] : [`▲ Food: ${FOOD_STAGE_NAMES[stage]}`]),
    ...game.events
      .filter((event) => event.regionId === region.id)
      .map((event) => describeEvent(game, event)),
    ...(unrest === null ? [] : [`▲ ${unrest}`]),
    ...incidentTags(game, region.id).map((tag) => `▲ ${tag}`),
    ...(relieved ? ['Food relief on its way'] : []),
  ];
  // Under a lens the lettering is the figure the colour stands for, so it is written at
  // full strength, with a halo of the region's own colour to carry it over any hatching.
  const lettering =
    lens === 'country' ? {} : { stroke: paint.fill, className: 'map__region-figure' };
  const figure =
    lens === 'approval'
      ? `Approval: ${formatPercent(state?.approval ?? 0)}`
      : lens === 'living'
        ? `Living standard: ${formatIndex(livingStandardOf(game, region.id))}`
        : lens === 'infrastructure'
          ? infrastructureWords(game, region.id).figure
          : stage === 'adequate'
            ? `Food: ${FOOD_STAGE_NAMES[stage]}`
            : null;
  return (
    <g>
      <text
        x={x}
        y={y}
        fill={paint.ink}
        {...lettering}
        className={`map__region-label ${lettering.className ?? ''}`.trim()}
      >
        {region.name}
      </text>
      {figure !== null && (
        <text
          x={x}
          y={y + 15}
          fill={paint.ink}
          {...lettering}
          className={`map__region-stage ${lettering.className ?? ''}`.trim()}
        >
          {figure}
        </text>
      )}
      {tags.map((tag, index) => {
        const top = y + (figure === null ? 7 : 22) + index * 26;
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

/**
 * What each border incident in force costs a region on its border, in a few words: "Border
 * incident · output −20%". A region no incident touches has none.
 */
function incidentTags(game: GameState, regionId: string): string[] {
  return borderIncidentStatuses(game)
    .filter((incident) => incident.inForce && incident.regionIds.includes(regionId))
    .map((incident) => `${BORDER_INCIDENT_NAME} · output −${incident.outputCutPercent}%`);
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

/** The spacing of the plots a settlement's buildings stand on, and the size of a building. */
const PLOT = 6;
const BUILDING = 5;
/** How far from a settlement's centre its plots reach, in plots. */
const PLOT_REACH = 3;

/**
 * Where a settlement's buildings stand, relative to its centre, in the order they are built:
 * plots on a small grid, each row set half a plot along from the last, taken from the centre
 * outwards with a twist of chance so that each settlement has its own street plan. The chance
 * is drawn from the settlement's id, so the plan is the same every time, a settlement grows
 * and shrinks at its edges, and no country needs anything drawn for it.
 */
function plotsOf(settlement: Settlement): Point[] {
  // The id folded into one number (FNV-1a), as the seed of the plan's chance.
  let seed = 2166136261;
  for (let index = 0; index < settlement.id.length; index += 1) {
    seed = Math.imul(seed ^ settlement.id.charCodeAt(index), 16777619) >>> 0;
  }
  const plots: { at: Point; order: number }[] = [];
  for (let row = -PLOT_REACH; row <= PLOT_REACH; row += 1) {
    for (let column = -PLOT_REACH; column <= PLOT_REACH; column += 1) {
      const x = (column + (row % 2 === 0 ? 0 : 0.5)) * PLOT;
      const y = row * PLOT;
      const order = Math.hypot(x, y) + drawAt(seed, row + PLOT_REACH, column + PLOT_REACH) * PLOT;
      plots.push({ at: [x - BUILDING / 2, y - BUILDING / 2], order });
    }
  }
  return plots.sort((a, b) => a.order - b.order).map((plot) => plot.at);
}

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
  /** How built up and lit the settlement is at its region's living standard. */
  readonly look: SettlementLook;
  readonly palette: MapPalette;
  /** The id of the glow laid behind a settlement with lights on. */
  readonly glowId: string;
  /** The colour of the land beneath, used as a halo so the name stays readable. */
  readonly ground: string;
  /** The colour to letter in over a lens's colour, or null to use the palette's own. */
  readonly ink: string | null;
}

/**
 * A settlement: as many buildings as its region's living standard gives it, the ones nearest
 * its centre lit first, and a glow behind it that brightens with the share lit. Lit buildings
 * are outlined as well as coloured, and the count is in the mark's name, so its state never
 * rests on colour alone.
 */
function SettlementMark({ settlement, look, palette, glowId, ground, ink }: SettlementMarkProps) {
  const [x, y] = settlement.at;
  const place = LABEL_PLACES[settlement.labelSide];
  const plots = plotsOf(settlement).slice(0, look.buildings);
  const reach = Math.max(0, ...plots.map(([dx, dy]) => Math.hypot(dx, dy))) + PLOT * 2;
  const dark = ink ?? palette.settlement;
  return (
    <g>
      {look.lit > 0 && (
        <circle
          cx={x}
          cy={y}
          r={reach}
          fill={`url(#${glowId})`}
          opacity={0.4 + (0.6 * look.lit) / look.buildings}
          aria-hidden="true"
        />
      )}
      <g
        role="img"
        aria-label={`${settlement.name}: ${look.buildings} buildings, ${look.lit} lit`}
        data-buildings={look.buildings}
        data-lit={look.lit}
      >
        {plots.map(([dx, dy], index) =>
          index < look.lit ? (
            <rect
              key={`${dx},${dy}`}
              x={x + dx + 0.5}
              y={y + dy + 0.5}
              width={BUILDING - 1}
              height={BUILDING - 1}
              fill={palette.settlementLit}
              stroke={dark}
              strokeWidth="1"
            />
          ) : (
            <rect
              key={`${dx},${dy}`}
              x={x + dx}
              y={y + dy}
              width={BUILDING}
              height={BUILDING}
              fill={dark}
            />
          ),
        )}
      </g>
      <text
        className={`map__settlement-label map__settlement-label--${settlement.size}`}
        x={x + place.dx}
        y={y + place.dy}
        textAnchor={place.anchor}
        fill={ink ?? palette.settlementLabel}
        stroke={ground}
      >
        {settlement.name}
      </text>
    </g>
  );
}
