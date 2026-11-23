import { sum } from './arithmetic';
import { buildingBarred, type Austere } from './austerity';
import { nextDate } from './calendar';
import type { Country, Site } from './country';
import type { ReportEntry } from './report';
import { infrastructureOf, siteEffectsOf, siteTerms } from './sites';
import { formatMoney, formatQuarters } from './text';
import type { Contribution, GameDate, Money } from './types';
import { inUse } from './upkeep';
import {
  SITE_EFFECT_DEFINITIONS,
  SITE_EFFECTS,
  type ProjectStatus,
  type SiteEffect,
  type SiteState,
} from './vocabulary';

/** A project on a site: building it. */
export interface SiteTarget {
  readonly kind: 'site';
  readonly siteId: string;
}

/**
 * What a project is for, one of `PROJECT_TARGET_KINDS`. Every project is on a site for now;
 * research and surveys, which are on no site, are to be targets of kinds of their own, added
 * to this union. Whatever its target, a project is paid for and paused in the same way
 * (`resolveProjects`) and barred in the same way (`projectStartFault`). Only what depends on
 * the target is written for each kind: its terms (`projectTerms`), what may stop it being
 * started (`targetFault`), the site it is on (`siteOf`), and how a save holds it
 * (`readTarget` in `save.ts`). With a single kind these need not ask which kind they have;
 * the compiler finds each of them for the kind added next.
 */
export type ProjectTarget = SiteTarget;

/**
 * Something being built or in use: anything with a cost, a build time and a lasting effect
 * is a project.
 */
export interface Project {
  /** What the project is for. */
  readonly target: ProjectTarget;
  /** The quarter the project was started in. */
  readonly began: GameDate;
  /** How many instalments have been paid, which is how many quarters of building are done. */
  readonly quartersPaid: number;
  readonly status: ProjectStatus;
  /** The first quarter the finished project is in use, or null while it is being built. */
  readonly opened: GameDate | null;
}

/** The target of a project on a site. */
export function onSite(siteId: string): ProjectTarget {
  return { kind: 'site', siteId };
}

/** The site a project is on, or null for a project that is on no site. */
export function siteOf({ target }: Pick<Project, 'target'>): string | null {
  return target.siteId;
}

/** The sites among these targets, in their order. */
export function sitesAmong(targets: readonly ProjectTarget[]): string[] {
  return targets.flatMap((target) => siteOf({ target }) ?? []);
}

/** The project on a site, if one has been started there. */
export function projectOnSite(projects: readonly Project[], siteId: string): Project | undefined {
  return projects.find((project) => siteOf(project) === siteId);
}

/** Whether two targets are the same thing. */
function sameTarget(a: ProjectTarget, b: ProjectTarget): boolean {
  return targetKey(a) === targetKey(b);
}

/** A target as text: the same for the same thing, whatever its kind. */
export function targetKey(target: ProjectTarget): string {
  return JSON.stringify(Object.entries(target).sort(([a], [b]) => a.localeCompare(b)));
}

/**
 * What a project costs and takes to finish, as its target sets them, and how the report
 * names it: by its name, and by its region when it is on one.
 */
export interface ProjectTerms {
  readonly name: string;
  readonly regionId?: string;
  readonly cost: Money;
  readonly buildQuarters: number;
  /** What it does once finished, as the report says it. */
  readonly effect: string;
}

/** A project's terms, or null when the country has no such target. */
export function projectTerms(country: Country, target: ProjectTarget): ProjectTerms | null {
  const site = country.sites.find((candidate) => candidate.id === target.siteId);
  if (site === undefined) return null;
  const { cost, buildQuarters, effect } = siteTerms(site.type);
  return { name: site.name, regionId: site.regionId, cost, buildQuarters, effect };
}

/**
 * How one site stands: empty, closed by building on one of its alternatives, being built, or
 * in use in good repair or decaying.
 */
export interface SiteStatus {
  readonly siteId: string;
  readonly state: SiteState;
  /** The alternative whose project closed the site, or null while it is not closed. */
  readonly closedBy: string | null;
  readonly quartersPaid: number;
  readonly buildQuarters: number;
  readonly cost: Money;
  /** What keeping the site in good repair costs each quarter it is in use. */
  readonly upkeep: Money;
  /** What the next quarter of building costs, or nothing once the site is built. */
  readonly instalment: Money;
  /** The quarter building began, or null on an empty site. */
  readonly began: GameDate | null;
  /** The first quarter the site is in use, or null until it is built. */
  readonly opened: GameDate | null;
}

interface Building {
  readonly country: Country;
  readonly projects: readonly Project[];
}

/** How a site stands. A site the country does not have is reported as empty and free. */
export function siteStatus({ country, projects }: Building, siteId: string): SiteStatus {
  const site = country.sites.find((candidate) => candidate.id === siteId);
  const project = projectOnSite(projects, siteId);
  const terms = site === undefined ? null : siteTerms(site.type);
  const quartersPaid = project?.quartersPaid ?? 0;
  const closedBy =
    project === undefined
      ? (site?.alternatives.find((id) => projectOnSite(projects, id) !== undefined) ?? null)
      : null;
  return {
    siteId,
    state: project?.status ?? (closedBy === null ? 'empty' : 'closed'),
    closedBy,
    quartersPaid,
    buildQuarters: terms?.buildQuarters ?? 0,
    cost: terms?.cost ?? 0,
    upkeep: terms?.upkeep ?? 0,
    instalment: terms === null ? 0 : instalment(terms, quartersPaid),
    began: project?.began ?? null,
    opened: project?.opened ?? null,
  };
}

/**
 * What is wrong with starting projects on these sites this quarter, or null when the game
 * allows it: `projectStartFault` for projects on sites.
 */
export function startFault(game: Starting, siteIds: readonly string[]): string | null {
  return projectStartFault(game, siteIds.map(onSite));
}

/** What starting projects needs of the game. */
type Starting = Building & { readonly treasury: Money } & Pick<Austere, 'date' | 'austerity'>;

/**
 * What is wrong with starting these projects this quarter, or null when the game allows it.
 * Each must be one its target allows beside those listed before it, and the treasury must
 * hold the whole cost of everything started together, though it is then paid for as it is
 * built. None is started during austerity.
 */
export function projectStartFault(
  game: Starting,
  targets: readonly ProjectTarget[],
): string | null {
  const { country, treasury } = game;
  if (targets.length > 0) {
    const barred = buildingBarred(game);
    if (barred !== null) return barred;
  }
  const started: ProjectTarget[] = [];
  const terms: ProjectTerms[] = [];
  for (const target of targets) {
    const fault = targetFault(game, target, started);
    if (fault !== null) return fault;
    const these = projectTerms(country, target);
    if (these === null) throw new RangeError(`There is no ${target.kind} to start a project on.`);
    started.push(target);
    terms.push(these);
  }
  const cost = sum(terms.map((each) => each.cost));
  if (cost <= treasury) return null;
  const what = terms.length === 1 ? (terms[0]?.name ?? '') : `${terms.length} projects`;
  return `The treasury holds ${formatMoney(treasury)}, which does not cover the ${formatMoney(cost)} needed to start ${what}.`;
}

/**
 * What is wrong with starting a project for this target beside those listed before it, or
 * null when nothing is. A project is started on an empty site, not on one closed by building
 * on one of its alternatives nor together with one.
 */
function targetFault(
  { country, projects }: Building,
  target: ProjectTarget,
  alongside: readonly ProjectTarget[],
): string | null {
  const nameOf = (id: string) => country.sites.find((candidate) => candidate.id === id)?.name ?? id;
  const site = country.sites.find((candidate) => candidate.id === target.siteId);
  if (site === undefined) return `There is no site "${target.siteId}" to build on.`;
  if (alongside.some((other) => sameTarget(other, target))) return `${site.name} is listed twice.`;
  const project = projectOnSite(projects, site.id);
  if (project !== undefined) {
    return `${site.name} is already ${inUse(project) ? 'built' : 'being built'}.`;
  }
  const { closedBy } = siteStatus({ country, projects }, site.id);
  if (closedBy !== null) {
    return `${site.name} is ruled out: building began on ${nameOf(closedBy)}, its alternative.`;
  }
  const rival = sitesAmong(alongside).find((id) => site.alternatives.includes(id));
  if (rival !== undefined) {
    return `${nameOf(rival)} and ${site.name} are alternatives: only one of them can be built.`;
  }
  return null;
}

/** What a quarter of building does. */
export interface BuildingOutcome {
  /** Every project as the quarter leaves it, in the order they were started. */
  readonly projects: readonly Project[];
  /** What was paid in instalments. */
  readonly paid: Money;
  /** The instalments, one line for each project paid for. */
  readonly contributions: readonly Contribution[];
  /** The projects whose instalment could not be covered, so that they made no progress. */
  readonly paused: readonly ProjectTarget[];
  readonly entries: readonly ReportEntry[];
}

/**
 * One quarter of building, whatever each project is for. Projects are paid for out of what
 * the budget has left, in the order they were started: the budget's own spending comes
 * first. A project whose instalment cannot be covered pauses for the quarter and carries on
 * when it can be paid. One that has had its last instalment is in use from the next quarter.
 */
export function resolveProjects(
  { country, projects }: Building,
  starts: readonly ProjectTarget[],
  date: GameDate,
  available: Money,
): BuildingOutcome {
  const begun = starts.map((target): Project => ({
    target,
    began: date,
    quartersPaid: 0,
    status: 'building',
    opened: null,
  }));
  const contributions: Contribution[] = [];
  const paused: ProjectTarget[] = [];
  const entries: ReportEntry[] = [];
  let left = available;

  const after = [...projects, ...begun].map((project): Project => {
    const terms = projectTerms(country, project.target);
    if (terms === null || inUse(project)) return project;
    const due = instalment(terms, project.quartersPaid);
    if (begun.includes(project)) entries.push(startedEntry(terms));

    if (due > left) {
      paused.push(project.target);
      entries.push(pausedEntry(terms, due));
      return { ...project, status: 'paused' };
    }
    left -= due;
    contributions.push({ label: `Building ${terms.name}`, amount: -due, ...placed(terms) });
    const quartersPaid = project.quartersPaid + 1;
    if (project.status === 'paused') entries.push(resumedEntry(terms, quartersPaid));
    if (quartersPaid < terms.buildQuarters) return { ...project, quartersPaid, status: 'building' };
    entries.push(completedEntry(terms));
    return { ...project, quartersPaid, status: 'operating', opened: nextDate(date) };
  });

  return { projects: after, paid: available - left, contributions, paused, entries };
}

/**
 * What the sites in use do, as what each leaves of something, in thousandths: 1000 leaves
 * it whole. Several sites bearing on the same thing multiply together. An effect that falls
 * on its site's region is counted region by region; one that falls on the nation, once.
 */
export interface SiteEffects {
  /** For each effect, what is left of it in each region, in the country file's order. */
  readonly inRegion: Readonly<Record<SiteEffect, readonly number[]>>;
  /** For each effect, what is left of it across the nation. */
  readonly national: Readonly<Record<SiteEffect, number>>;
}

/** The effects of the sites in use as a quarter begins. */
export function siteEffects({ country, projects }: Building): SiteEffects {
  const inRegion = Object.fromEntries(
    SITE_EFFECTS.map((effect) => [effect, country.regions.map(() => 1000)]),
  ) as Record<SiteEffect, number[]>;
  const national = Object.fromEntries(SITE_EFFECTS.map((effect) => [effect, 1000])) as Record<
    SiteEffect,
    number
  >;
  const leave = (left: number, permille: number) => Math.floor((left * permille) / 1000);
  for (const { site, decaying } of sitesInUse({ country, projects })) {
    const regionIndex = country.regions.findIndex((region) => region.id === site.regionId);
    for (const [effect, permille] of siteEffectsOf(site.type, decaying)) {
      if (SITE_EFFECT_DEFINITIONS[effect].reach === 'nation') {
        national[effect] = leave(national[effect], permille);
      } else if (regionIndex >= 0) {
        const left = inRegion[effect];
        left[regionIndex] = leave(left[regionIndex] ?? 1000, permille);
      }
    }
  }
  return { inRegion, national };
}

/** A site in use, and whether it is decaying for want of upkeep. */
export interface SiteInUse {
  readonly site: Site;
  readonly decaying: boolean;
}

/** The sites in use, in the country file's order. */
export function sitesInUse({ country, projects }: Building): readonly SiteInUse[] {
  return country.sites.flatMap((site) => {
    const project = projectOnSite(projects, site.id);
    return project !== undefined && inUse(project)
      ? [{ site, decaying: project.status === 'decaying' }]
      : [];
  });
}

/** What a site in use adds to its region's infrastructure access, in thousandths. */
export function infrastructureFrom({ site, decaying }: SiteInUse): number {
  return infrastructureOf(site.type, decaying);
}

/**
 * The instalment due after `quartersPaid` have been paid. The cost is split into equal
 * whole amounts, and the last instalment makes up whatever that leaves over.
 */
function instalment(
  terms: Pick<ProjectTerms, 'cost' | 'buildQuarters'>,
  quartersPaid: number,
): Money {
  if (quartersPaid >= terms.buildQuarters) return 0;
  const even = Math.floor(terms.cost / terms.buildQuarters);
  return quartersPaid === terms.buildQuarters - 1
    ? terms.cost - even * (terms.buildQuarters - 1)
    : even;
}

/** Where a line or report entry about a project points: its region, if it is on one. */
function placed({ regionId }: ProjectTerms): { readonly regionId?: string } {
  return regionId === undefined ? {} : { regionId };
}

function startedEntry(terms: ProjectTerms): ReportEntry {
  return {
    kind: 'projectStarted',
    seriousness: 'notable',
    headline: `Building begins: ${terms.name}`,
    cause: `It costs ${formatMoney(terms.cost)}, paid over the ${formatQuarters(terms.buildQuarters)} it takes to build.`,
    ...placed(terms),
  };
}

function pausedEntry(terms: ProjectTerms, due: Money): ReportEntry {
  return {
    kind: 'projectPaused',
    seriousness: 'warning',
    headline: `Paused: ${terms.name}`,
    cause: `The treasury could not cover its ${formatMoney(due)} instalment, so nothing was built this quarter.`,
    ...placed(terms),
  };
}

function resumedEntry(terms: ProjectTerms, quartersPaid: number): ReportEntry {
  return {
    kind: 'projectStarted',
    seriousness: 'notable',
    headline: `Building resumes: ${terms.name}`,
    cause: `${quartersPaid} of its ${formatQuarters(terms.buildQuarters)} of building ${quartersPaid === 1 ? 'is' : 'are'} now done.`,
    ...placed(terms),
  };
}

function completedEntry(terms: ProjectTerms): ReportEntry {
  return {
    kind: 'projectCompleted',
    seriousness: 'notable',
    headline: `Finished: ${terms.name}`,
    cause: `It is in use from next quarter. ${terms.effect}`,
    ...placed(terms),
  };
}
