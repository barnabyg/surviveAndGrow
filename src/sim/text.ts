import { MONEY_PER_MILLION, type Money } from './types';

const MINUS = '−';

/** Money as the player reads it: `$42.0m`, or `−$5.0m` when negative. */
export function formatMoney(amount: Money): string {
  const millions = (Math.abs(amount) / MONEY_PER_MILLION).toFixed(1);
  return `${amount < 0 ? MINUS : ''}$${millions}m`;
}

/** A weight of food as the player reads it: `1,262,660 t`, or `−14,560 t` when negative. */
export function formatTonnes(tonnes: number): string {
  const digits = Math.abs(tonnes)
    .toFixed(0)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${tonnes < 0 ? MINUS : ''}${digits} t`;
}
