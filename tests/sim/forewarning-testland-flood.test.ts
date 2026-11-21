import testlandFile from '../countries/testland.json';
import { withChances } from './countries';
import { sweepDoingNothing } from './forewarning';

sweepDoingNothing(
  'Testland with drought and flood likely everywhere',
  () =>
    withChances(testlandFile, {
      drought: { northfield: 0.5, sandreach: 0.5 },
      flood: { northfield: 0.4, sandreach: 0.4 },
    }),
  { floods: true, seedsPerTest: 5 },
);
