import tavaraFile from '../../src/countries/tavara.json';
import { loadCountry, type Country } from '../../src/sim';
import testlandFile from '../countries/testland.json';

/** The real country that ships with the game. */
export const tavara = (): Country => loadCountry(tavaraFile);

/** The crude second country. It exists to prove that nothing is tied to the first. */
export const testland = (): Country => loadCountry(testlandFile);

/** Every scenario that is not about one country's particular figures runs against both. */
export const bothCountries: [name: string, country: () => Country][] = [
  ['Tavara', tavara],
  ['Testland', testland],
];
