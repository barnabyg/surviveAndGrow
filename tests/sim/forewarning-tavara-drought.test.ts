import tavaraFile from '../../src/countries/tavara.json';
import { withDroughtChance } from './countries';
import { sweepDoingNothing } from './forewarning';

sweepDoingNothing('Tavara with drought likely everywhere', () =>
  withDroughtChance(
    tavaraFile,
    Object.fromEntries(tavaraFile.regions.map((region) => [region.id, 0.4])),
  ),
);
