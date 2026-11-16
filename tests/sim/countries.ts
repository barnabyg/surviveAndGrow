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

/** A country file with the yearly chance of drought set for each region; unnamed regions get none. */
export function withDroughtChance(
  file: unknown,
  chance: Record<string, number>,
  reserve?: number,
): Country {
  const copy = structuredClone(file) as {
    regions: { id: string; eventLikelihood?: Record<string, number> }[];
    start: { foodReserve: number };
  };
  for (const region of copy.regions) {
    region.eventLikelihood = { drought: chance[region.id] ?? 0 };
  }
  if (reserve !== undefined) copy.start.foodReserve = reserve;
  return loadCountry(copy);
}
