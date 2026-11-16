/** Money is held as a whole number of $100,000, so every sum the player sees adds up exactly. */
export type Money = number;

/** How many Money units make one million dollars. */
export const MONEY_PER_MILLION = 10;

export type Quarter = 1 | 2 | 3 | 4;

/** The quarter the player is deciding in. One turn is one quarter. */
export interface GameDate {
  readonly year: number;
  readonly quarter: Quarter;
}
