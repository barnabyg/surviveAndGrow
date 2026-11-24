import { sweepDoingNothing } from './forewarning';
import { worthTakingAsShipped } from './worthTaking';

sweepDoingNothing(
  'Testland as it ships, but worth taking',
  () => worthTakingAsShipped('Testland'),
  { incidents: true, seedsPerTest: 6 },
);
