import { testlandAsShipped } from './countries';
import { sweepDoingNothing } from './forewarning';

sweepDoingNothing('Testland as it ships', testlandAsShipped, {
  floods: true,
  shocks: true,
  seedsPerTest: 6,
});
