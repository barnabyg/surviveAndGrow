import { tavaraAsShipped } from './countries';
import { sweepDoingNothing } from './forewarning';

sweepDoingNothing('Tavara as it ships', tavaraAsShipped, { coups: true, seedsPerTest: 6 });
