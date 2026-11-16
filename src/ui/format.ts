import { formatMoney, formatTonnes, type FoodStatus, type Money, type Range } from '../sim';

/** A movement of money with its sign: `+$9.4m`, `−$11.0m`, or `$0.0m` for none. */
export function formatSigned(amount: Money): string {
  return `${amount > 0 ? '+' : ''}${formatMoney(amount)}`;
}

/** A movement of food with its sign: `+118,240 t` or `−14,560 t`. */
export function formatSignedTonnes(tonnes: number): string {
  return `${tonnes > 0 ? '+' : ''}${formatTonnes(tonnes)}`;
}

/** A weight of food as months of what the whole country eats. */
export function monthsOfFood(tonnes: number, food: FoodStatus): number {
  return food.quarterlyConsumption === 0 ? 0 : (tonnes * 3) / food.quarterlyConsumption;
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
