import { MONEY_PER_MILLION, type Money } from '../sim';

const MINUS = '−';

/** Money as the player reads it: `$42.0m`, or `−$5.0m` when negative. */
export function formatMoney(amount: Money): string {
  const millions = (Math.abs(amount) / MONEY_PER_MILLION).toFixed(1);
  return `${amount < 0 ? MINUS : ''}$${millions}m`;
}
