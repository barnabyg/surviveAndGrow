import { chains } from './chains';
import type { Country, Point } from './country';
import { contains } from './geometry';
import { siteStatus, type Project } from './projects';
import type { TradeOrder, WorldPrices } from './trade';
import { portTonnesOf, tradeCapacity } from './tradeLinks';
import { MAP_FRAME, SITE_CHAIN_ROLES } from './vocabulary';

interface Trading {
  readonly country: Country;
  readonly projects: readonly Project[];
  readonly worldPrices: WorldPrices;
}

/**
 * A trade link as the map draws it: a border crossing, or a shipping lane from a port to the
 * edge of the map, with what it carries this quarter.
 */
export interface TradeRoute {
  /** The crossing's id, or the port's site id. */
  readonly id: string;
  readonly name: string;
  readonly kind: 'crossing' | 'port';
  /**
   * How it stands: open; weak while its port decays and carries half what it would in good
   * repair; or missing, a port not yet in use, which carries nothing.
   */
  readonly state: 'open' | 'weak' | 'missing';
  /**
   * What it carries across the border in a quarter, in tonnes: for a missing link, what it
   * would carry once in use.
   */
  readonly capacity: number;
  /** The ore the mines' chains ship by it this quarter, in tonnes. */
  readonly ore: number;
  /** The grain bought and sold abroad that goes by it this quarter, in tonnes. */
  readonly grain: number;
  /** What it carries this quarter, ore and grain, in tonnes. */
  readonly carried: number;
  /**
   * The line it is drawn along: from the border out into the neighbour, or from the port out
   * to the edge of the map.
   */
  readonly path: readonly Point[];
}

/** How far a crossing's mark reaches into the neighbour, in the map frame. */
const CROSSING_REACH = 40;

/**
 * The trade routes this quarter, in the order of the trade links: the border crossings, then
 * the ports in use, then the ports that could still be built, which are missing links. Where
 * each is drawn comes from the country file alone. The mines' ore goes by the port its chain
 * runs to, and the grain in the orders goes over the border crossings first and then by sea,
 * each route taking what it has room for.
 */
export function tradeRoutes(
  game: Trading,
  orders: readonly TradeOrder[] = [],
): readonly TradeRoute[] {
  const { country } = game;
  const capacity = tradeCapacity(game, orders);
  const ore = new Map<string, number>();
  for (const chain of chains(game)) {
    const port = chain.links.find((link) => capacity.links.some((each) => each.id === link.siteId));
    if (port === undefined) continue;
    ore.set(port.siteId, (ore.get(port.siteId) ?? 0) + chain.shipped);
  }
  let grainLeft = capacity.grain;
  const open = capacity.links.flatMap((link): TradeRoute[] => {
    const path =
      link.kind === 'crossing' ? crossingPath(country, link.id) : lanePath(country, link.id);
    if (path === null) return [];
    const shipped = Math.min(link.tonnes, ore.get(link.id) ?? 0);
    const grain = Math.min(grainLeft, link.tonnes - shipped);
    grainLeft -= grain;
    return [
      {
        id: link.id,
        name: link.name,
        kind: link.kind,
        state: link.decaying ? 'weak' : 'open',
        capacity: link.tonnes,
        ore: shipped,
        grain,
        carried: shipped + grain,
        path,
      },
    ];
  });
  const missing = country.sites.flatMap((site): TradeRoute[] => {
    const state = siteStatus(game, site.id).state;
    const unbuilt = state === 'empty' || state === 'building' || state === 'paused';
    const path = lanePath(country, site.id);
    if (SITE_CHAIN_ROLES[site.type] !== 'outlet' || !unbuilt || path === null) return [];
    return [
      {
        id: site.id,
        name: site.name,
        kind: 'port',
        state: 'missing',
        capacity: portTonnesOf(site.type),
        ore: 0,
        grain: 0,
        carried: 0,
        path,
      },
    ];
  });
  return [...open, ...missing];
}

/** A crossing's mark: from the border out into the neighbour it leads to. */
function crossingPath(country: Country, crossingId: string): Point[] | null {
  const crossing = country.crossings.find((candidate) => candidate.id === crossingId);
  const neighbour = country.map.neighbours.find(
    (candidate) => candidate.id === crossing?.neighbourId,
  );
  if (neighbour === undefined) return null;
  const [at, outward] = crossingPlace(country, neighbour.shape, neighbour.label);
  return [at, [at[0] + outward[0] * CROSSING_REACH, at[1] + outward[1] * CROSSING_REACH]];
}

/**
 * A port's shipping lane: straight from the port to the nearest point of whichever edge of
 * the map it reaches over the least land, its own country's or a neighbour's, and of those
 * the nearest.
 */
function lanePath(country: Country, siteId: string): Point[] | null {
  const site = country.sites.find((candidate) => candidate.id === siteId);
  if (site?.form !== 'place') return null;
  const [x, y] = site.at;
  const edges: Point[] = [
    [x, 0],
    [MAP_FRAME.width, y],
    [x, MAP_FRAME.height],
    [0, y],
  ];
  const measured = edges.map((to) => ({
    to,
    land: landAlong(country, site.at, to),
    length: Math.hypot(to[0] - x, to[1] - y),
  }));
  measured.sort((a, b) => a.land - b.land || a.length - b.length);
  const best = measured[0];
  return best === undefined ? null : [site.at, best.to];
}

/** How often the land along a line is looked for, in the map frame. */
const LAND_STEP = 5;

/** How much of a line runs over land, any country's, in the map frame. */
function landAlong(country: Country, from: Point, to: Point): number {
  const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const steps = Math.ceil(length / LAND_STEP);
  const shapes = [
    ...country.regions.map((region) => region.shape),
    ...country.map.neighbours.map((neighbour) => neighbour.shape),
  ];
  let land = 0;
  for (let step = 1; step <= steps; step += 1) {
    const share = step / steps;
    const point: Point = [from[0] + (to[0] - from[0]) * share, from[1] + (to[1] - from[1]) * share];
    if (shapes.some((shape) => contains(shape, point))) land += length / steps;
  }
  return land;
}

/**
 * Where a crossing to a neighbour stands, and the way out of the country from there: the point
 * of the country's border with the neighbour nearest the neighbour's name.
 */
function crossingPlace(
  country: Country,
  shape: readonly Point[],
  label: Point,
): [at: Point, outward: Point] {
  let best: { at: Point; outward: Point; distance: number } | null = null;
  for (const edge of borderEdges(country, shape)) {
    const at = nearestOn(edge.from, edge.to, label);
    const distance = Math.hypot(at[0] - label[0], at[1] - label[1]);
    if (best === null || distance < best.distance) best = { at, outward: edge.outward, distance };
  }
  return best === null ? [label, [0, 0]] : [best.at, best.outward];
}

/**
 * The edges of the country's regions that face a neighbour: just outside each lies the
 * neighbour and no region. Each comes with the way out of the country, a unit step.
 */
function borderEdges(
  country: Country,
  shape: readonly Point[],
): { from: Point; to: Point; outward: Point }[] {
  return country.regions.flatMap((region) =>
    region.shape.flatMap((from, index) => {
      const to = region.shape[(index + 1) % region.shape.length] ?? from;
      const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
      if (length === 0) return [];
      const middle: Point = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2];
      const normal: Point = [(to[1] - from[1]) / length, (from[0] - to[0]) / length];
      const step = (sign: number): Point => [
        middle[0] + sign * normal[0],
        middle[1] + sign * normal[1],
      ];
      const outward: Point = contains(region.shape, step(1)) ? [-normal[0], -normal[1]] : normal;
      const beyond = step(outward === normal ? 1 : -1);
      const faces =
        contains(shape, beyond) && !country.regions.some((other) => contains(other.shape, beyond));
      return faces ? [{ from, to, outward }] : [];
    }),
  );
}

/** The point of a line from one point to another nearest a third. */
function nearestOn(from: Point, to: Point, point: Point): Point {
  const [dx, dy] = [to[0] - from[0], to[1] - from[1]];
  const along = ((point[0] - from[0]) * dx + (point[1] - from[1]) * dy) / (dx * dx + dy * dy);
  const share = Math.min(1, Math.max(0, along));
  return [from[0] + dx * share, from[1] + dy * share];
}
