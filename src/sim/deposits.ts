import { balance } from './balance';
import { regionName, type Country, type Deposit } from './country';
import type { Project } from './projects';
import { drawAt } from './rng';
import { formatTonnes } from './text';
import { DOLLARS_PER_MONEY, type Money, type Range } from './types';

/** A key that keeps the draws for deposits apart from every other draw keyed on the seed. */
const DEPOSIT_DRAWS = 0x6465706f;

/**
 * A whole number standing for a deposit's id, the same for the same id (FNV-1a). Keying the
 * draws on the id, not on the deposit's place in the file, means a deposit added or taken
 * away leaves what the others hold as it was.
 */
function keyOf(id: string): number {
  let hash = 0x811c9dc5;
  for (const character of id) {
    hash = Math.imul(hash ^ (character.codePointAt(0) ?? 0), 0x01000193) >>> 0;
  }
  return hash;
}

/**
 * What a survey of a deposit's region finds of it: the ore its mine would produce a quarter,
 * in tonnes, or null when it is not there. It depends on the seed and the deposit alone, so
 * the same seed always finds the same deposits, and the random generator is left untouched:
 * the weather, the events and everything the risks ahead and the preview foresee stay as
 * they were. The size is a whole number of `balance.surveys.tonnesStep` within its range,
 * each as likely as the others.
 */
export function depositFind(seed: number, deposit: Deposit): number | null {
  const key = keyOf(deposit.id);
  if (drawAt(seed, DEPOSIT_DRAWS, key, 0) >= deposit.likelihood) return null;
  const step = balance.surveys.tonnesStep;
  const steps = Math.floor((deposit.tonnes.max - deposit.tonnes.min) / step);
  return deposit.tonnes.min + Math.floor(drawAt(seed, DEPOSIT_DRAWS, key, 1) * (steps + 1)) * step;
}

/**
 * What a mine producing so many tonnes of ore a quarter can produce, counted as
 * `balance.sites` counts a capacity: what the ore is worth at the usual world ore price.
 */
export function capacityOfTonnes(tonnes: number): Money {
  return Math.round((tonnes * balance.trade.goods.ore.usualDollarsPerTonne) / DOLLARS_PER_MONEY);
}

/** The deposit a country file hides in a region, if it hides one there. */
export function depositIn(country: Pick<Country, 'deposits'>, regionId: string): Deposit | null {
  return country.deposits.find((deposit) => deposit.regionId === regionId) ?? null;
}

/** The region a project surveys, or null for a project that surveys none. */
export function surveyOf({ target }: Pick<Project, 'target'>): string | null {
  return target.kind === 'survey' ? target.regionId : null;
}

/** The regions surveyed, in the order their surveys finished. */
export function surveyedRegions(projects: readonly Project[]): readonly string[] {
  return projects.flatMap((project) => {
    const regionId = surveyOf(project);
    return regionId !== null && project.status === 'surveyed' ? [regionId] : [];
  });
}

/**
 * The country as a game on this seed has found it: the file's own sites, and then the mine
 * and route of each deposit lying in a region surveyed, in the file's order of deposits. A
 * found mine produces the size its survey revealed. It is the same country, the very object,
 * while nothing new has been found.
 */
export function withFinds(country: Country, projects: readonly Project[], seed: number): Country {
  const surveyed = surveyedRegions(projects);
  const hidden = new Set(country.deposits.flatMap(({ mine, route }) => [mine.id, route.id]));
  const found = country.deposits.flatMap((deposit) => {
    const tonnes = surveyed.includes(deposit.regionId) ? depositFind(seed, deposit) : null;
    return tonnes === null
      ? []
      : [{ ...deposit.mine, capacity: capacityOfTonnes(tonnes) }, deposit.route];
  });
  const own = country.sites.filter((site) => !hidden.has(site.id));
  if (own.length + found.length === country.sites.length) return country;
  return { ...country, sites: [...own, ...found] };
}

/** What a survey of one region takes, and what the player is told it may find. */
export interface SurveyTerms {
  readonly regionId: string;
  /** The region's name, which is the survey's. */
  readonly name: string;
  readonly cost: Money;
  /** How many quarters it takes to survey. */
  readonly surveyQuarters: number;
  /** The chance, from 0 to 1, that it finds a deposit: none where the file hides none. */
  readonly likelihood: number;
  /** The least and the most ore a deposit found could yield a quarter, or null for none. */
  readonly tonnes: Range | null;
}

/** The terms of a survey of a region, which are the same in every region but what it may find. */
export function surveyTerms(country: Country, regionId: string): SurveyTerms {
  const deposit = depositIn(country, regionId);
  const { cost, surveyQuarters } = balance.surveys;
  return {
    regionId,
    name: regionName(country, regionId),
    cost,
    surveyQuarters,
    likelihood: deposit?.likelihood ?? 0,
    tonnes: deposit?.tonnes ?? null,
  };
}

/**
 * What a finished survey of a region found, in a sentence for the report: a deposit of a
 * definite size and the sites that can now be built on it, or nothing.
 */
export function surveyFindings(country: Country, seed: number, regionId: string): string {
  const deposit = depositIn(country, regionId);
  const tonnes = deposit === null ? null : depositFind(seed, deposit);
  if (deposit === null || tonnes === null) return 'They found no deposit of ore worth mining.';
  return `They found a deposit of ore whose mine could yield ${formatTonnes(tonnes)} a quarter. ${deposit.mine.name} and ${deposit.route.name} can be built from next quarter.`;
}

/**
 * What is wrong with starting a survey of a region beside the surveys listed before it, or
 * null when nothing is. A region is surveyed once, and only where the country file hides a
 * deposit: elsewhere there is nothing to find.
 */
export function surveyFault(
  country: Country,
  projects: readonly Project[],
  regionId: string,
  alongside: readonly string[],
): string | null {
  if (!country.regions.some((region) => region.id === regionId)) {
    return `There is no region "${regionId}" to survey.`;
  }
  const name = regionName(country, regionId);
  if (depositIn(country, regionId) === null) {
    return `The geologists see no sign of ore in ${name}, so there is nothing there to survey.`;
  }
  if (alongside.includes(regionId)) return `${name} is listed twice.`;
  const project = projects.find((each) => surveyOf(each) === regionId);
  if (project?.status === 'surveyed') return `${name} has already been surveyed.`;
  if (project !== undefined) return `${name} is already being surveyed.`;
  return null;
}
