import { loadCountry } from '../../src/sim';
import tavaraFile from '../../src/countries/tavara.json';
import { sweepDoingNothing } from './forewarning';

sweepDoingNothing(
  'Tavara with world price shocks likely',
  () =>
    loadCountry({
      ...tavaraFile,
      priceShockLikelihood: { failedHarvestsAbroad: 0.3, oreGlut: 0.3 },
    }),
  { shocks: true, seedsPerTest: 5 },
);
