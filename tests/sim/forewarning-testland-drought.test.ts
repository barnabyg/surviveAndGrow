import testlandFile from '../countries/testland.json';
import { withDroughtChance } from './countries';
import { sweepDoingNothing } from './forewarning';

sweepDoingNothing('Testland with drought likely everywhere', () =>
  withDroughtChance(testlandFile, { northfield: 0.5, sandreach: 0.5 }),
);
