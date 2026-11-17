import tavaraFile from '../../src/countries/tavara.json';
import { loadCountry, type Country } from '../../src/sim';
import testlandFile from '../countries/testland.json';

/**
 * The real country that ships with the game, with its dilemmas left out and its people not
 * growing in number. A dilemma stops the game until it is answered, so a test meets one only
 * when it sets one up; and growth moves every figure worked out per head, so a test meets it
 * only when it is about it.
 */
export const tavara = (): Country => loadCountry(withoutDilemmas(tavaraFile));

/**
 * The crude second country, with its dilemmas left out and no growth. It exists to prove that
 * nothing is tied to the first.
 */
export const testland = (): Country => loadCountry(withoutDilemmas(testlandFile));

/** The two countries with their dilemmas left out, but growing as they do when shipped. */
export const tavaraGrowing = (): Country => loadCountry(withGrowth(withoutDilemmas(tavaraFile)));
export const testlandGrowing = (): Country =>
  loadCountry(withGrowth(withoutDilemmas(testlandFile)));

/** The two countries exactly as their files are written, dilemmas and all. */
export const tavaraAsShipped = (): Country => loadCountry(tavaraFile);
export const testlandAsShipped = (): Country => loadCountry(testlandFile);

/** Every scenario that is not about one country's particular figures runs against both. */
export const bothCountries: [name: string, country: () => Country][] = [
  ['Tavara', tavara],
  ['Testland', testland],
];

/**
 * Testland's file as format 1 could write it: without its chain of mine, trunk road and
 * port, since a mine must say what it depends on and that needs format 2.
 */
export function testlandFormat1File(): unknown {
  const file = structuredClone(testlandFile) as { formatVersion: number; sites: unknown[] };
  file.formatVersion = 1;
  file.sites = file.sites.slice(0, 3);
  return file;
}

/**
 * Testland's file as format 2 could write it: its quay is not an alternative to its port,
 * since naming alternatives needs format 3.
 */
export function testlandFormat2File(): unknown {
  const file = structuredClone(testlandFile) as {
    formatVersion: number;
    sites: { alternatives?: unknown }[];
  };
  file.formatVersion = 2;
  for (const site of file.sites) delete site.alternatives;
  return file;
}

interface Chances {
  formatVersion: number;
  regions: { id: string; eventLikelihood?: Record<string, number>; populationGrowth?: number }[];
  dilemmaLikelihood?: Record<string, number>;
  start: { foodReserve: number };
}

/**
 * A copy of a country file in which no dilemma ever arises and no region grows. Saying so
 * needs format 2 of the country file, which reads a format 1 file's contents unchanged.
 */
function withoutDilemmas(file: unknown): unknown {
  const copy = withoutGrowth(file) as Chances;
  delete copy.dilemmaLikelihood;
  return copy;
}

/** A copy of a country file in which no region's people grow in number. */
export function withoutGrowth(file: unknown): unknown {
  const copy = structuredClone(file) as Chances;
  copy.formatVersion = Math.max(copy.formatVersion, 2);
  for (const region of copy.regions) region.populationGrowth = 0;
  return copy;
}

/** A copy of a country file whose regions grow at the rate their file or the game sets. */
function withGrowth(file: unknown): unknown {
  const copy = structuredClone(file) as Chances;
  for (const region of copy.regions) delete region.populationGrowth;
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
    /** Whether the regions' people grow in number, as they do when shipped. */
    readonly growing?: boolean;
  },
): Country {
  const copy = (chances.growing === true ? structuredClone(file) : withoutGrowth(file)) as Chances;
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
