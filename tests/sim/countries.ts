import tavaraFile from '../../src/countries/tavara.json';
import { loadCountry, type Country } from '../../src/sim';
import testlandFile from '../countries/testland.json';

/**
 * The real country that ships with the game, with its dilemmas left out. A dilemma stops the
 * game until it is answered, so a test meets one only when it sets one up.
 */
export const tavara = (): Country => loadCountry(withoutDilemmas(tavaraFile));

/**
 * The crude second country, with its dilemmas left out. It exists to prove that nothing is
 * tied to the first.
 */
export const testland = (): Country => loadCountry(withoutDilemmas(testlandFile));

/** The two countries exactly as their files are written, dilemmas and all. */
export const tavaraAsShipped = (): Country => loadCountry(tavaraFile);
export const testlandAsShipped = (): Country => loadCountry(testlandFile);

/** Every scenario that is not about one country's particular figures runs against both. */
export const bothCountries: [name: string, country: () => Country][] = [
  ['Tavara', tavara],
  ['Testland', testland],
];

interface Chances {
  regions: { id: string; eventLikelihood?: Record<string, number> }[];
  dilemmaLikelihood?: Record<string, number>;
  start: { foodReserve: number };
}

/** A copy of a country file in which no dilemma ever arises. */
function withoutDilemmas(file: unknown): unknown {
  const copy = structuredClone(file) as Chances;
  delete copy.dilemmaLikelihood;
  return copy;
}

/**
 * A country file with the yearly chance of drought set for each region; unnamed regions get
 * none. No dilemma arises in it.
 */
export function withDroughtChance(
  file: unknown,
  chance: Record<string, number>,
  reserve?: number,
): Country {
  return withChances(file, { drought: chance, ...(reserve === undefined ? {} : { reserve }) });
}

/**
 * A country file with chance pinned down: the chance each quarter of each dilemma named,
 * and none of any other; the yearly chance of drought in each region named, and none
 * elsewhere; and, if given, the food reserve the country starts with.
 */
export function withChances(
  file: unknown,
  chances: {
    readonly dilemmas?: Record<string, number>;
    readonly drought?: Record<string, number>;
    readonly reserve?: number;
  },
): Country {
  const copy = structuredClone(file) as Chances;
  for (const region of copy.regions) {
    region.eventLikelihood = { drought: chances.drought?.[region.id] ?? 0 };
  }
  copy.dilemmaLikelihood = chances.dilemmas ?? {};
  if (chances.reserve !== undefined) copy.start.foodReserve = chances.reserve;
  return loadCountry(copy);
}

/**
 * A country with no drought and no dilemmas that starts at a chosen tax rate, with a
 * treasury that lasts the term. Approval starts where the starting budget settles it, so a
 * game played with that budget keeps the same approval to polling day, and it can be worked
 * out by hand.
 */
export function startingAt(file: unknown, taxRate: number): Country {
  const copy = structuredClone(file) as {
    start: { treasury: number; budget: { taxRate: number } };
  };
  copy.start.budget.taxRate = taxRate;
  copy.start.treasury = 500;
  return withDroughtChance(copy, {});
}
