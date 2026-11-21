import { loadCountry } from '../../src/sim';
import testlandFile from '../countries/testland.json';
import { sweepDoingNothing } from './forewarning';

sweepDoingNothing(
  'Testland with world price shocks likely',
  () =>
    loadCountry({
      ...testlandFile,
      priceShockLikelihood: { failedHarvestsAbroad: 0.3, oreGlut: 0.3 },
    }),
  { shocks: true, seedsPerTest: 5 },
);
