import { tavaraAsShipped } from './countries';
import { sweepDoingNothing } from './forewarning';

sweepDoingNothing('Tavara as it ships', tavaraAsShipped, {
  floods: true,
  shocks: true,
  seedsPerTest: 15,
});
