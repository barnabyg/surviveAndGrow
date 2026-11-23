import { chains } from './chains';
import type { Country, Point } from './country';
import { contains } from './geometry';
import { siteStatus, type Project } from './projects';
import type { TradeOrder, WorldPrices } from './trade';
import { portTonnesOf, tradeCapacity, tradeLinks } from './tradeLinks';
import { improvementsOf } from './sites';
import { knownTechnologies } from './technology';
import { MAP_FRAME, SITE_CHAIN_ROLES, type Technology } from './vocabulary';

interface Trading {
  readonly country: Country;
  readonly projects: readonly Project[];
  readonly worldPrices: WorldPrices;
}

/** What a trade route carries across the border in a quarter, in tonnes. */
export interface Carriage {
  /** The ore the mines' chains ship by it. */
  readonly ore: number;
  /** The grain bought and sold abroad that goes by it. */
  readonly grain: number;
  /** The two together. */
  readonly total: number;
}

/** What one trade link carried across the border in a quarter, as the game remembers it. */
export interface RouteCarriage {
  /** The crossing's id, or the port's site id. */
  readonly routeId: string;
  /** The ore the mines' chains shipped by it, in tonnes. */
  readonly ore: number;
  /** The grain bought and sold abroad that went by it, in tonnes. */
  readonly grain: number;
}

/**
 * A trade link as the map draws it: a border crossing, or a shipping lane from a port to the
 * edge of the map, with what it carried last quarter and what it is to carry this quarter.
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
  /** What it would carry if no technology improved it, in tonnes: `capacity` while none does. */
  readonly unimproved: number;
  /** The technologies known that make it carry more, in the order they became known. */
  readonly improvedBy: readonly Technology[];
  /** What it carried in the quarter last played: nothing before the first. */
  readonly carried: Carriage;
  /** What it is to carry this quarter: the mines' ore and the grain ordered so far. */
  readonly planned: Carriage;
  /**
   * The line it is drawn along: from the border out into the neighbour, or from the port out
   * to the edge of the map.
   */
  readonly path: readonly Point[];
}

/** How far a crossing's mark reaches into the neighbour, in the map frame. */
const CROSSING_REACH = 40;

const NOTHING: Carriage = { ore: 0, grain: 0, total: 0 };

/**
 * What each trade link carries this quarter, with the grain given crossing the border: the
 * mines' ore goes by the port its chain runs to, and the grain over the border crossings first
 * and then by sea, each link taking what it has room for. Only the links that carry anything
 * are listed, in the order of the links.
 */
export function routeCarriage(game: Trading, grainTonnes: number): RouteCarriage[] {
  const links = tradeLinks(game);
  const ore = new Map<string, number>();
  for (const chain of chains(game)) {
    const port = chain.links.find((link) => links.some((each) => each.id === link.siteId));
    if (port === undefined) continue;
    ore.set(port.siteId, (ore.get(port.siteId) ?? 0) + chain.shipped);
  }
  let grainLeft = grainTonnes;
  return links.flatMap((link): RouteCarriage[] => {
    const shipped = Math.min(link.tonnes, ore.get(link.id) ?? 0);
    const grain = Math.max(0, Math.min(grainLeft, link.tonnes - shipped));
    grainLeft -= grain;
    return shipped + grain > 0 ? [{ routeId: link.id, ore: shipped, grain }] : [];
  });
}

/**
 * The trade routes this quarter, in the order of the trade links: the border crossings, then
 * the ports in use, then the ports that could still be built, which are missing links. Where
 * each is drawn comes from the country file alone. Each says what it carried in the quarter
 * last played, and what it is to carry this quarter with the grain in the orders.
 */
export function tradeRoutes(
  game: Trading & { readonly tradeCarried: readonly RouteCarriage[] },
  orders: readonly TradeOrder[] = [],
): readonly TradeRoute[] {
  const { country } = game;
  const capacity = tradeCapacity(game, orders);
  const planned = routeCarriage(game, capacity.grain);
  const carriage = (carried: readonly RouteCarriage[], id: string): Carriage => {
    const found = carried.find((each) => each.routeId === id);
    return found === undefined
      ? NOTHING
      : { ore: found.ore, grain: found.grain, total: found.ore + found.grain };
  };
  const open = capacity.links.flatMap((link): TradeRoute[] => {
    const path =
      link.kind === 'crossing' ? crossingPath(country, link.id) : lanePath(country, link.id);
    if (path === null) return [];
    return [
      {
        id: link.id,
        name: link.name,
        kind: link.kind,
        state: link.decaying ? 'weak' : 'open',
        capacity: link.tonnes,
        unimproved: link.unimproved,
        improvedBy: link.improvedBy,
        carried: carriage(game.tradeCarried, link.id),
        planned: carriage(planned, link.id),
        path,
      },
    ];
  });
  const known = knownTechnologies(game.projects);
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
        capacity: portTonnesOf(site.type, false, known),
        unimproved: portTonnesOf(site.type),
        improvedBy: improvementsOf(site.type, known).map(([technology]) => technology),
        carried: NOTHING,
        planned: NOTHING,
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
