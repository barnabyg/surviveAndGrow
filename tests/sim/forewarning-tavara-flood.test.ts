import tavaraFile from '../../src/countries/tavara.json';
import { withChances } from './countries';
import { sweepDoingNothing } from './forewarning';

const everywhere = (chance: number) =>
  Object.fromEntries(tavaraFile.regions.map((region) => [region.id, chance]));

sweepDoingNothing(
  'Tavara with drought and flood likely everywhere',
  () => withChances(tavaraFile, { drought: everywhere(0.4), flood: everywhere(0.4) }),
  { floods: true, seedsPerTest: 5 },
);
