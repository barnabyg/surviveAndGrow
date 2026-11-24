import { neighbourOf, type Country, type Point } from './country';
import { contains } from './geometry';

/*
 * The country's border with each neighbour, worked out from the map: a country file draws the
 * regions and the neighbours and says nothing of where they meet.
 */

/** One edge of a region that faces a neighbour. */
export interface BorderEdge {
  /** The region whose edge it is. */
  readonly regionId: string;
  readonly from: Point;
  readonly to: Point;
  /** The way out of the country across it, a unit step. */
  readonly outward: Point;
}

/**
 * The edges of the country's regions that face the land of a shape, a neighbour's: just
 * outside each lies that land and no region.
 */
export function borderEdges(country: Country, shape: readonly Point[]): BorderEdge[] {
  return country.regions.flatMap((region) =>
    region.shape.flatMap((from, index): BorderEdge[] => {
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
      return faces ? [{ regionId: region.id, from, to, outward }] : [];
    }),
  );
}

/**
 * The country's border with one of its neighbours, by the neighbour's id: every edge of a
 * region that faces it, each with the region it belongs to. A neighbour the country has not,
 * or one that touches no region, has none.
 */
export function neighbourBorder(country: Country, neighbourId: string): readonly BorderEdge[] {
  const neighbour = neighbourOf(country, neighbourId);
  return neighbour === undefined ? [] : borderEdges(country, neighbour.shape);
}

/** The regions that border each neighbour, by country: a country is never changed in place. */
const bordering = new WeakMap<Country, Map<string, readonly string[]>>();

/**
 * The regions that border one of the country's neighbours, by the neighbour's id, in the
 * country file's order: each region with an edge that faces it. It is worked out from the map
 * once for a country, since a quarter's taxes ask it of every region.
 */
export function borderRegions(country: Country, neighbourId: string): readonly string[] {
  const known = bordering.get(country) ?? new Map<string, readonly string[]>();
  bordering.set(country, known);
  const found = known.get(neighbourId);
  if (found !== undefined) return found;
  const facing = new Set(neighbourBorder(country, neighbourId).map((edge) => edge.regionId));
  const regionIds = country.regions.flatMap((region) => (facing.has(region.id) ? [region.id] : []));
  known.set(neighbourId, regionIds);
  return regionIds;
}
