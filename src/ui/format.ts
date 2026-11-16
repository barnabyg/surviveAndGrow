import { formatMoney, type Money, type Range } from '../sim';

/** A movement of money with its sign: `+$9.4m`, `−$11.0m`, or `$0.0m` for none. */
export function formatSigned(amount: Money): string {
  return `${amount > 0 ? '+' : ''}${formatMoney(amount)}`;
}

/** A projection: one value when nothing is left to chance, otherwise `low to high`. */
export function formatRange(range: Range, format: (value: number) => string): string {
  return range.min === range.max
    ? format(range.min)
    : `${format(range.min)} to ${format(range.max)}`;
}
