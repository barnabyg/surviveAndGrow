/**
 * The seeded random generator (mulberry32). Its whole state is one 32-bit number held in
 * the game state, so a game can be replayed, saved and previewed without side effects.
 */
export type RngState = number;

export function seedGenerator(seed: number): RngState {
  return seed >>> 0;
}

/** Returns a whole number from 0 to 2^32 - 1 and the generator state that follows it. */
export function nextRandom(state: RngState): { value: number; state: RngState } {
  const next = (state + 0x6d2b79f5) >>> 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return { value: (t ^ (t >>> 14)) >>> 0, state: next };
}
