import type { Point } from './country';

/** Whether a point lies inside a closed shape. A point on the shape's edge counts as inside. */
export function contains(shape: readonly Point[], [x, y]: Point): boolean {
  let inside = false;
  for (let index = 0; index < shape.length; index += 1) {
    const [ax, ay] = shape[index] ?? [0, 0];
    const [bx, by] = shape[(index + 1) % shape.length] ?? [0, 0];
    const onEdge =
      (bx - ax) * (y - ay) === (by - ay) * (x - ax) &&
      x >= Math.min(ax, bx) &&
      x <= Math.max(ax, bx) &&
      y >= Math.min(ay, by) &&
      y <= Math.max(ay, by);
    if (onEdge) return true;
    // Count the edges that a line running right from the point crosses.
    if (ay > y !== by > y && x < ax + ((y - ay) * (bx - ax)) / (by - ay)) inside = !inside;
  }
  return inside;
}
