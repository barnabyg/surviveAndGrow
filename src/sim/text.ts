import { MONEY_PER_MILLION, type Money } from './types';

const MINUS = '−';

/** Money as the player reads it: `$42.0m`, or `−$5.0m` when negative. */
export function formatMoney(amount: Money): string {
  const millions = (Math.abs(amount) / MONEY_PER_MILLION).toFixed(1);
  return `${amount < 0 ? MINUS : ''}$${millions}m`;
}

/** A weight of food as the player reads it: `1,262,660 t`, or `−14,560 t` when negative. */
export function formatTonnes(tonnes: number): string {
  return `${tonnes < 0 ? MINUS : ''}${formatCount(Math.abs(tonnes))} t`;
}

/** A whole number with its thousands marked off: `18,000`. */
export function formatCount(count: number): string {
  return count.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** A size in points of approval, written from thousandths: `1.2 points`, `1.0 point`. */
export function formatPoints(permille: number): string {
  return `${(permille / 10).toFixed(1)} ${permille === 10 ? 'point' : 'points'}`;
}

/** A movement in points with its sign: `+1.2 points`, `−3.6 points`, `0.0 points`. */
export function formatSignedPoints(permille: number): string {
  return `${permille > 0 ? '+' : permille < 0 ? MINUS : ''}${formatPoints(Math.abs(permille))}`;
}

/**
 * A share written in thousandths as the player reads it: `54.3%`. Marks that are whole
 * numbers by design, such as a threshold, are written without the decimal: `40%`.
 */
export function formatPercent(permille: number, decimals: 0 | 1 = 1): string {
  return `${permille < 0 ? MINUS : ''}${(Math.abs(permille) / 10).toFixed(decimals)}%`;
}
