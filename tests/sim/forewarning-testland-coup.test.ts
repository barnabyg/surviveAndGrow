import { testlandAsShipped } from './countries';
import { sweepDoingNothing } from './forewarning';

sweepDoingNothing('Testland as it ships', testlandAsShipped, { coups: true, seedsPerTest: 6 });
