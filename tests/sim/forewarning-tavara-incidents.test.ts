import { sweepDoingNothing } from './forewarning';
import { worthTakingAsShipped } from './worthTaking';

sweepDoingNothing('Tavara as it ships, but worth taking', () => worthTakingAsShipped('Tavara'), {
  incidents: true,
  seedsPerTest: 6,
});
