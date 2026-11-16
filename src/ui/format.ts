import { formatMoney, type Money } from '../sim';

/** A movement of money with its sign: `+$9.4m`, `−$11.0m`, or `$0.0m` for none. */
export function formatSigned(amount: Money): string {
  return `${amount > 0 ? '+' : ''}${formatMoney(amount)}`;
}
