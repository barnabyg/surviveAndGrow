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
 * The crude second country, with its dilemmas left out, no growth and none of the debt it
 * starts with. It exists to prove that nothing is tied to the first. Debt moves the treasury
 * and the credit rating, so a test meets it only when it is about it.
 */
export const testland = (): Country =>
  loadCountry(withoutStartingDebt(withoutDilemmas(testlandFile)));

/** Testland with its dilemmas left out and no growth, but owing the loans it starts with. */
export const testlandInDebt = (): Country => loadCountry(withoutDilemmas(testlandFile));

/**
 * The two countries with their dilemmas left out, but growing as they do when shipped.
 * Testland has neither drought nor flood: it spends nothing on relief, so either would bring
 * famine, and famine stops its people growing.
 */
export const tavaraGrowing = (): Country => loadCountry(withGrowth(withoutDilemmas(tavaraFile)));
export const testlandGrowing = (): Country => withChances(testlandFile, { growing: true });

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
  const file = testlandFormat3File() as { formatVersion: number; sites: unknown[] };
  file.formatVersion = 1;
  file.sites = file.sites.slice(0, 3);
  return file;
}

/**
 * Testland's file as format 2 could write it: its quay is not an alternative to its port,
 * since naming alternatives needs format 3.
 */
export function testlandFormat2File(): unknown {
  const file = testlandFormat3File() as {
    formatVersion: number;
    sites: { alternatives?: unknown }[];
  };
  file.formatVersion = 2;
  for (const site of file.sites) delete site.alternatives;
  return file;
}

/** Testland's file as format 3 could write it: it starts owing nothing. */
export function testlandFormat3File(): unknown {
  const file = testlandFormat4File() as { formatVersion: number; start: { loans?: unknown } };
  delete file.start.loans;
  file.formatVersion = 3;
  return file;
}

/** Testland's file as format 4 could write it: it names no border crossings. */
export function testlandFormat4File(): unknown {
  const file = testlandFormat5File() as { formatVersion: number; crossings?: unknown };
  delete file.crossings;
  file.formatVersion = 4;
  return file;
}

/** Testland's file as format 5 could write it: no flood ever comes. */
export function testlandFormat5File(): unknown {
  const file = testlandFormat6File() as Chances;
  for (const region of file.regions) {
    if (region.eventLikelihood !== undefined) delete region.eventLikelihood.flood;
  }
  file.formatVersion = 5;
  return file;
}

/** Testland's file as format 6 could write it: no world price shock ever comes. */
export function testlandFormat6File(): unknown {
  const file = testlandFormat7File() as Chances;
  delete file.priceShockLikelihood;
  file.formatVersion = 6;
  return file;
}

/** Testland's file as format 7 could write it: it hides no deposit for a survey to find. */
export function testlandFormat7File(): unknown {
  const file = testlandFormat8File() as Chances & { deposits?: unknown };
  delete file.deposits;
  file.formatVersion = 7;
  return file;
}

/**
 * Testland's file as format 8 could write it: it has no dam, and no site that needs a
 * technology, since naming either needs format 9.
 */
export function testlandFormat8File(): unknown {
  const file = testlandFormat9File() as Chances & {
    sites: { type: string; needs?: string }[];
  };
  file.sites = file.sites.filter((site) => site.type !== 'dam' && site.needs === undefined);
  file.formatVersion = 8;
  return file;
}

/**
 * Testland's file as format 9 could write it: it has no clinic and no school, since naming
 * either needs format 10.
 */
export function testlandFormat9File(): unknown {
  const file = testlandFormat10File() as Chances & { sites: { type: string }[] };
  file.sites = file.sites.filter((site) => site.type !== 'clinic' && site.type !== 'school');
  file.formatVersion = 9;
  return file;
}

/**
 * Testland's file as format 10 could write it: its starting budget says nothing of Defence,
 * since naming it needs format 11.
 */
export function testlandFormat10File(): unknown {
  return beforeDefence(testlandFile);
}

/** A copy of a country file as format 10 could write it: with no Defence in its budget. */
export function beforeDefence(file: unknown): unknown {
  const copy = structuredClone(file) as {
    formatVersion: number;
    start: { budget: { spending: { defence?: number } } };
  };
  delete copy.start.budget.spending.defence;
  copy.formatVersion = 10;
  return copy;
}

/**
 * A country as it is, but with no world price shock ever coming: for a test that pins down
 * how prices move from the seed alone.
 */
export function withoutPriceShocks(country: Country): Country {
  return loadCountry({ ...(country.source as object), priceShockLikelihood: {} });
}

/** A copy of a country file that starts the game owing nothing. */
function withoutStartingDebt(file: unknown): unknown {
  const copy = structuredClone(file) as { start: { loans?: unknown } };
  delete copy.start.loans;
  return copy;
}

/**
 * A copy of a country file whose mines need no power: each depends only on what carries its
 * output to a port. A test of a chain's road and port uses it, so that power is met only by
 * the tests about it.
 */
export function withoutPoweredMines(file: unknown): unknown {
  const copy = structuredClone(file) as {
    sites: { id: string; type: string; dependsOn?: string[] }[];
  };
  const lines = new Set(
    copy.sites.filter((site) => site.type === 'powerLine').map((site) => site.id),
  );
  for (const site of copy.sites) {
    if (site.type === 'mine' && site.dependsOn !== undefined) {
      site.dependsOn = site.dependsOn.filter((id) => !lines.has(id));
    }
  }
  return copy;
}

interface Chances {
  formatVersion: number;
  regions: { id: string; eventLikelihood?: Record<string, number>; populationGrowth?: number }[];
  dilemmaLikelihood?: Record<string, number>;
  priceShockLikelihood?: Record<string, number>;
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
 * and none of any other; the yearly chance of drought and of flood in each region named,
 * and none elsewhere; and, if given, the food reserve the country starts with. It starts
 * owing nothing, so that what debt does to the treasury and the rating stays out of the way.
 */
export function withChances(
  file: unknown,
  chances: {
    readonly dilemmas?: Record<string, number>;
    readonly drought?: Record<string, number>;
    readonly flood?: Record<string, number>;
    readonly reserve?: number;
    /** Whether the regions' people grow in number, as they do when shipped. */
    readonly growing?: boolean;
    /**
     * The chance each quarter of each world price shock named being announced, and none of
     * any other. Left out, no shock ever comes.
     */
    readonly shocks?: Record<string, number>;
  },
): Country {
  const copy = (
    chances.growing === true ? withoutStartingDebt(file) : withoutGrowth(withoutStartingDebt(file))
  ) as Chances;
  for (const region of copy.regions) {
    region.eventLikelihood = {
      drought: chances.drought?.[region.id] ?? 0,
      // Saying how likely a flood is needs format 6 of the country file.
      ...(chances.flood === undefined ? {} : { flood: chances.flood[region.id] ?? 0 }),
    };
  }
  if (chances.flood !== undefined) copy.formatVersion = Math.max(copy.formatVersion, 6);
  // Saying how likely a world price shock is needs format 7 of the country file.
  if (chances.shocks === undefined) {
    delete copy.priceShockLikelihood;
  } else {
    copy.priceShockLikelihood = chances.shocks;
    copy.formatVersion = Math.max(copy.formatVersion, 7);
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
