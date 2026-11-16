import { formatMoney, formatTonnes, type Money, type Range } from '../sim';

/** A movement of money with its sign: `+$9.4m`, `−$11.0m`, or `$0.0m` for none. */
export function formatSigned(amount: Money): string {
  return `${amount > 0 ? '+' : ''}${formatMoney(amount)}`;
}

/** A movement of food with its sign: `+118,240 t` or `−14,560 t`. */
export function formatSignedTonnes(tonnes: number): string {
  return `${tonnes > 0 ? '+' : ''}${formatTonnes(tonnes)}`;
}

/** A movement of approval with its sign, in points: `+1.2 points`, `−3.6 points`. */
export function formatSignedPoints(permille: number): string {
  return `${permille > 0 ? '+' : permille < 0 ? '−' : ''}${formatPoints(Math.abs(permille))}`;
}

/** A size in points of approval, written from thousandths: `1.2 points`, `1.0 point`. */
export function formatPoints(permille: number): string {
  return `${(permille / 10).toFixed(1)} ${permille === 10 ? 'point' : 'points'}`;
}

/**
 * A projection: one value when nothing is left to chance, otherwise `low to high`.
 * A unit that is not part of each value is written once, at the end.
 */
export function formatRange(range: Range, format: (value: number) => string, unit = ''): string {
  const values =
    range.min === range.max ? format(range.min) : `${format(range.min)} to ${format(range.max)}`;
  return unit === '' ? values : `${values} ${unit}`;
}
