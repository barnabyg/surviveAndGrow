export function sum(amounts: readonly number[]): number {
  return amounts.reduce((total, amount) => total + amount, 0);
}

/** The people of regions together, as a country file or a game holds them. */
export function populationOf(regions: readonly { readonly population: number }[]): number {
  return sum(regions.map((region) => region.population));
}

/** The limits of a figure kept in thousandths of a whole: approval, loyalty, a standing. */
export const PERMILLE_LIMITS = { min: 0, max: 1000 } as const;

/**
 * What a multiplier written in thousandths takes off, as a whole percentage: 750 takes
 * off 25.
 */
export function percentOff(permilleLeft: number): number {
  return Math.round((1000 - permilleLeft) / 10);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Shares a whole `total` among parts in proportion to their numerators over one
 * denominator, so that the parts are whole numbers and add up to the total exactly. Each
 * part is its quotient rounded down, and what is left over goes, one unit at a time, to
 * the parts that were rounded down the furthest.
 */
export function apportion(
  numerators: readonly number[],
  denominator: number,
  total: number,
): number[] {
  const shares = numerators.map((numerator, index) => {
    const part = Math.floor(numerator / denominator);
    return { index, part, remainder: numerator - part * denominator };
  });
  const byRemainder = [...shares].sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  const parts = shares.map((share) => share.part);
  let left = total - sum(parts);
  for (let turn = 0; left !== 0 && byRemainder.length > 0; turn += 1) {
    // Left over is handed out from the largest remainder down; a shortfall, which only a
    // rounded numerator can cause, is taken back from the smallest remainder up.
    const place = turn % byRemainder.length;
    const share = byRemainder[left > 0 ? place : byRemainder.length - 1 - place];
    if (share === undefined) break;
    parts[share.index] = (parts[share.index] ?? 0) + Math.sign(left);
    left -= Math.sign(left);
  }
  return parts;
}

/**
 * How far a figure moves in a quarter towards where it would settle: a share of the gap, in
 * thousandths, rounded away from nothing so that it arrives in the end and does not stall
 * just short.
 */
export function stepTowards(current: number, settled: number, sharePermille: number): number {
  const gap = settled - current;
  if (gap === 0) return 0;
  const step = Math.ceil((Math.abs(gap) * sharePermille) / 1000);
  return gap > 0 ? step : -step;
}
