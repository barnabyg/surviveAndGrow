import { describe, expect, it } from 'vitest';
import { playGame } from '../balance/batch';
import { DEGENERATE_PLAYERS } from '../balance/players';
import { tavaraAsShipped, testlandAsShipped } from './countries';
import { ENDINGS, GAME_TIMEOUT } from './scripted';

/**
 * The players that each lean on one lever, or build only part of what the chain builder
 * does. They probe the balance for a trick that wins on its own (`BALANCE_PLAYERS=all`);
 * here they only have to finish a term on the countries as they ship.
 */
describe.each([
  ['Tavara', tavaraAsShipped],
  ['Testland', testlandAsShipped],
] as const)('a one-lever player in %s', (_name, country) => {
  it.each(DEGENERATE_PLAYERS)(
    '$name plays to an ending',
    ({ decide }) => {
      expect(ENDINGS).toContain(playGame(country(), 1, decide, 1).ending);
    },
    GAME_TIMEOUT,
  );
});
