import { sum } from './arithmetic';
import { balance } from './balance';
import type { Country, Site } from './country';
import type { Project } from './projects';
import type { ReportEntry } from './report';
import { siteTerms } from './sites';
import { capitalised, formatMoney } from './text';
import type { Money } from './types';
import type { ProjectStatus, SiteState, SiteType } from './vocabulary';

interface Building {
  readonly country: Country;
  readonly projects: readonly Project[];
}

/** How much of what it does in good repair a decaying site still does, in words: "50%". */
export const DECAYING_SHARE = `${Math.round(balance.upkeep.decayingEffectPermille / 10)}%`;

/** The rule for which sites decay first, in words the player is shown. */
export const UPKEEP_ORDER_RULE =
  'Upkeep keeps sites in good repair in the order building began on them, so the newest decay first.';

/** What a quarter's upkeep did: what the sites in use needed, what was spent, and on which. */
export interface UpkeepOutcome {
  /** What every site in use needs to be kept in good repair this quarter. */
  readonly needed: Money;
  /** What was actually spent on upkeep. It is never more than the sites kept up need. */
  readonly spent: Money;
  /** The sites kept in good repair, in the order building began on them. */
  readonly kept: readonly string[];
  /** The sites that went without, in the same order. They are decaying from next quarter. */
  readonly short: readonly string[];
}

/**
 * The sites that need upkeep this quarter: those in use as it begins, in good repair or
 * decaying, in the order building began on them. A site finished this quarter needs none
 * until its first quarter in use.
 */
export function sitesNeedingUpkeep({ country, projects }: Building): readonly Site[] {
  return projects.flatMap((project) => {
    const site = country.sites.find((candidate) => candidate.id === project.siteId);
    return site !== undefined && inUse(project) ? [site] : [];
  });
}

/** What the sites in use need for their upkeep this quarter. */
export function upkeepNeeded(building: Building): Money {
  return sum(sitesNeedingUpkeep(building).map((site) => siteTerms(site.type).upkeep));
}

/**
 * Spends what is available on upkeep. Sites are kept up one by one in the order building
 * began on them, until what is left will not cover the next: it and every site after it go
 * without. Only what the sites kept up need is spent.
 */
export function payUpkeep(building: Building, available: Money): UpkeepOutcome {
  const sites = sitesNeedingUpkeep(building);
  const kept: string[] = [];
  const short: string[] = [];
  let left = available;
  for (const site of sites) {
    const due = siteTerms(site.type).upkeep;
    if (short.length === 0 && due <= left) {
      kept.push(site.id);
      left -= due;
    } else {
      short.push(site.id);
    }
  }
  return {
    needed: sum(sites.map((site) => siteTerms(site.type).upkeep)),
    spent: available - left,
    kept,
    short,
  };
}

/**
 * Upkeep that keeps every site of the given types in good repair, brought up to a step the
 * budget allows and no more than one area may be given. A country file that does not set
 * its starting upkeep starts with this for all its sites.
 */
export function upkeepForEvery(types: readonly SiteType[]): Money {
  const { max, step } = balance.budget.spending;
  const needed = sum(types.map((type) => balance.sites[type].upkeep));
  return Math.min(max, Math.ceil(needed / step) * step);
}

/**
 * The projects once the quarter's upkeep has told: a site that went without is decaying,
 * and a decaying one that was kept up is in good repair again. Both are reported.
 */
export function resolveUpkeep(
  { country, projects }: Building,
  upkeep: UpkeepOutcome,
): { readonly projects: readonly Project[]; readonly entries: readonly ReportEntry[] } {
  const entries: ReportEntry[] = [];
  const after = projects.map((project): Project => {
    const site = country.sites.find((candidate) => candidate.id === project.siteId);
    if (site === undefined) return project;
    if (project.status === 'operating' && upkeep.short.includes(site.id)) {
      entries.push(decayingEntry(site, upkeep));
      return { ...project, status: 'decaying' };
    }
    if (project.status === 'decaying' && upkeep.kept.includes(site.id)) {
      entries.push(restoredEntry(site));
      return { ...project, status: 'operating' };
    }
    return project;
  });
  return { projects: after, entries };
}

/** Damage done to the sites in use in one region, and what did it: "the flood in Lowmere". */
export interface SiteDamage {
  readonly regionId: string;
  readonly cause: string;
}

/**
 * The projects once damage has told on the sites in use in the regions it struck: each in good
 * repair is decaying from the quarter now beginning, until a quarter in which its upkeep is
 * paid restores it. Each is reported.
 */
export function damageSites(
  { country, projects }: Building,
  damage: readonly SiteDamage[],
): { readonly projects: readonly Project[]; readonly entries: readonly ReportEntry[] } {
  const entries: ReportEntry[] = [];
  const after = projects.map((project): Project => {
    const site = country.sites.find((candidate) => candidate.id === project.siteId);
    const struck = damage.find((done) => done.regionId === site?.regionId);
    if (site === undefined || struck === undefined || project.status !== 'operating') {
      return project;
    }
    entries.push(damagedEntry(site, struck));
    return { ...project, status: 'decaying' };
  });
  return { projects: after, entries };
}

/** Whether a project is built and in use, in good repair or decaying. */
export function inUse(project: Pick<Project, 'status'>): boolean {
  return isInUseState(project.status);
}

/** Whether a site in this state is built and in use, in good repair or decaying. */
export function isInUseState(state: ProjectStatus | SiteState): boolean {
  return state === 'operating' || state === 'decaying';
}

function decayingEntry(site: Site, upkeep: UpkeepOutcome): ReportEntry {
  const { upkeep: due } = siteTerms(site.type);
  return {
    kind: 'siteDecaying',
    seriousness: 'warning',
    headline: `Decaying: ${site.name}`,
    cause: `Upkeep of ${formatMoney(upkeep.spent)} fell short of the ${formatMoney(upkeep.needed)} the sites in use need, and the newest decay first. From next quarter it does only ${DECAYING_SHARE} of what it does in good repair, until its ${formatMoney(due)} upkeep is paid.`,
    regionId: site.regionId,
  };
}

function damagedEntry(site: Site, damage: SiteDamage): ReportEntry {
  return {
    kind: 'siteDecaying',
    seriousness: 'warning',
    headline: `Decaying: ${site.name}`,
    cause: `${capitalised(damage.cause)} has damaged it. This quarter it does only ${DECAYING_SHARE} of what it does in good repair, and paying its ${formatMoney(siteTerms(site.type).upkeep)} upkeep restores it from the next.`,
    regionId: site.regionId,
  };
}

function restoredEntry(site: Site): ReportEntry {
  return {
    kind: 'siteRestored',
    seriousness: 'notable',
    headline: `Restored: ${site.name}`,
    cause: `Its ${formatMoney(siteTerms(site.type).upkeep)} upkeep was paid, and it is in good repair again from next quarter.`,
    regionId: site.regionId,
  };
}
