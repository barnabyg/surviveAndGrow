/** Money is held as a whole number of $100,000, so every sum the player sees adds up exactly. */
export type Money = number;

/** How many Money units make one million dollars. */
export const MONEY_PER_MILLION = 10;

/** How many dollars one Money unit is. */
export const DOLLARS_PER_MONEY = 1_000_000 / MONEY_PER_MILLION;

export type Quarter = 1 | 2 | 3 | 4;

/** The quarter the player is deciding in. One turn is one quarter. */
export interface GameDate {
  readonly year: number;
  readonly quarter: Quarter;
}

/** One thing that moved a figure, and by how much. */
export interface Contribution {
  readonly label: string;
  readonly amount: number;
  /** The region it happened in, when it belongs to one place. */
  readonly regionId?: string;
}

/**
 * A figure the player can open. Every derived figure carries the list of what contributed
 * to its change, and the contributions always add up to the change.
 */
export interface Figure {
  readonly value: number;
  readonly change: number;
  readonly contributions: readonly Contribution[];
}

/**
 * A projected figure. When nothing about it is left to chance the two ends are equal;
 * otherwise what happens will fall somewhere from `min` to `max`.
 */
export interface Range {
  readonly min: number;
  readonly max: number;
}

/** A projection with nothing left to chance. */
export function exactly(value: number): Range {
  return { min: value, max: value };
}
