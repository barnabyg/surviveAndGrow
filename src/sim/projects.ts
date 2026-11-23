import { sum } from './arithmetic';
import { buildingBarred, type Austere } from './austerity';
import { nextDate } from './calendar';
import type { Country, Site } from './country';
import type { ReportEntry } from './report';
import { infrastructureOf, siteEffectsOf, siteTerms } from './sites';
import {
  knownTechnologies,
  technologyEffectsOf,
  technologyFault,
  technologyOf,
  technologyTerms,
} from './technology';
import { formatMoney, formatQuarters } from './text';
import type { Contribution, GameDate, Money } from './types';
import { inUse } from './upkeep';
import {
  PROJECT_TARGET_WORDS,
  SITE_EFFECT_DEFINITIONS,
  SITE_EFFECTS,
  TECHNOLOGIES,
  type ProjectStatus,
  type ProjectWords,
  type SiteEffect,
  type SiteState,
  type Technology,
} from './vocabulary';

/** A project on a site: building it. */
export interface SiteTarget {
  readonly kind: 'site';
  readonly siteId: string;
}

/** A project on no site: researching a technology. */
export interface TechnologyTarget {
  readonly kind: 'technology';
  readonly technology: Technology;
}

/**
 * What a project is for, one of `PROJECT_TARGET_KINDS`: a site, built on, or a technology,
 * researched. Whatever its target, a project is paid for and paused in the same way
 * (`resolveProjects`) and barred in the same way (`projectStartFault`). Only what depends on
 * the target is written for each kind: its terms (`projectTerms`), what may stop it being
 * started (`targetFault`), the site it is on (`siteOf`), and how a save holds it
 * (`readTarget` in `save.ts`). A kind added to this union is found by the compiler in each.
 */
export type ProjectTarget = SiteTarget | TechnologyTarget;

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

/** The target of research into a technology. */
export function onTechnology(technology: Technology): ProjectTarget {
  return { kind: 'technology', technology };
}

/** The site a project is on, or null for a project that is on no site. */
export function siteOf({ target }: Pick<Project, 'target'>): string | null {
  return target.kind === 'site' ? target.siteId : null;
}

/**
 * The projects a quarter's decisions start, in the order they are paid for: the sites to
 * build on, as listed, and then the research, if any.
 */
export function startsOf(decisions: {
  readonly startProjects?: readonly string[];
  readonly startResearch?: Technology | null;
}): ProjectTarget[] {
  const research = decisions.startResearch ?? null;
  return [
    ...(decisions.startProjects ?? []).map(onSite),
    ...(research === null ? [] : [onTechnology(research)]),
  ];
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
 * What a project costs and takes to finish, as its target sets them, how it stands once
 * finished, and how the report names it: by its name, and by its region when it is on one,
 * in the words of its kind.
 */
export interface ProjectTerms {
  readonly name: string;
  readonly regionId?: string;
  readonly cost: Money;
  readonly buildQuarters: number;
  /** What it does once finished, as the report says it. */
  readonly effect: string;
  /** How the finished project stands: a site is operating, a technology known. */
  readonly finished: ProjectStatus;
  readonly words: ProjectWords;
}

/** A project's terms, or null when there is no such target: a site the country lacks. */
export function projectTerms(country: Country, target: ProjectTarget): ProjectTerms | null {
  const words = PROJECT_TARGET_WORDS[target.kind];
  if (target.kind === 'technology') {
    if (!TECHNOLOGIES.includes(target.technology)) return null;
    const { name, cost, researchQuarters, effect } = technologyTerms(target.technology);
    return { name, cost, buildQuarters: researchQuarters, effect, finished: 'known', words };
  }
  const site = country.sites.find((candidate) => candidate.id === target.siteId);
  if (site === undefined) return null;
  const { cost, buildQuarters, effect } = siteTerms(site.type);
  return {
    name: site.name,
    regionId: site.regionId,
    cost,
    buildQuarters,
    effect,
    finished: 'operating',
    words,
  };
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
    state: project === undefined ? (closedBy === null ? 'empty' : 'closed') : siteStateOf(project),
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

/** How a project on a site can stand: never known, which only research becomes. */
export type SiteProjectState = Exclude<ProjectStatus, 'known'>;

/** How a site's project stands. Only research is ever known, so a site's never is. */
export function siteStateOf({ status }: Pick<Project, 'status'>): SiteProjectState {
  return status === 'known' ? 'operating' : status;
}

/**
 * What is wrong with starting projects on these sites this quarter, or null when the game
 * allows it: `projectStartFault` for projects on sites.
 */
export function startFault(game: ProjectStarting, siteIds: readonly string[]): string | null {
  return projectStartFault(game, siteIds.map(onSite));
}

/** What starting projects needs of the game. */
export type ProjectStarting = Building & { readonly treasury: Money } & Pick<
    Austere,
    'date' | 'austerity'
  >;

/**
 * What is wrong with starting these projects this quarter, or null when the game allows it.
 * Each must be one its target allows beside those listed before it, and the treasury must
 * hold the whole cost of everything started together, though it is then paid for as it is
 * built. None is started during austerity.
 */
export function projectStartFault(
  game: ProjectStarting,
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
    if (these === null)
      throw new RangeError(`There is no such ${target.kind} to start a project on.`);
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
 * on one of its alternatives nor together with one. Research is started on a technology whose
 * prerequisites are known, while no other is being researched (`technologyFault`).
 */
function targetFault(
  { country, projects }: Building,
  target: ProjectTarget,
  alongside: readonly ProjectTarget[],
): string | null {
  if (target.kind === 'technology') {
    if (!TECHNOLOGIES.includes(target.technology)) {
      return `There is no technology "${target.technology}" to research.`;
    }
    const researching = alongside.flatMap((other) => technologyOf({ target: other }) ?? []);
    return technologyFault(projects, target.technology, researching);
  }
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
    if (terms === null || isFinished(project)) return project;
    const due = instalment(terms, project.quartersPaid);
    if (begun.includes(project)) entries.push(startedEntry(terms));

    if (due > left) {
      paused.push(project.target);
      entries.push(pausedEntry(terms, due));
      return { ...project, status: 'paused' };
    }
    left -= due;
    contributions.push({
      label: `${terms.words.paying} ${terms.name}`,
      amount: -due,
      ...placed(terms),
    });
    const quartersPaid = project.quartersPaid + 1;
    if (project.status === 'paused') entries.push(resumedEntry(terms, quartersPaid));
    if (quartersPaid < terms.buildQuarters) return { ...project, quartersPaid, status: 'building' };
    entries.push(completedEntry(terms));
    return { ...project, quartersPaid, status: terms.finished, opened: nextDate(date) };
  });

  return { projects: after, paid: available - left, contributions, paused, entries };
}

/** Whether a project is finished: a site in use, or a technology known. */
function isFinished(project: Project): boolean {
  return inUse(project) || project.status === 'known';
}

/**
 * What the sites in use and the technologies known do, as what each leaves of something, in
 * thousandths: 1000 leaves it whole. Several bearing on the same thing multiply together. An
 * effect that falls on its site's region is counted region by region; one that falls on the
 * nation, once. A technology's effect falls on every region, or once on the nation.
 */
export interface SiteEffects {
  /** For each effect, what is left of it in each region, in the country file's order. */
  readonly inRegion: Readonly<Record<SiteEffect, readonly number[]>>;
  /** For each effect, what is left of it across the nation. */
  readonly national: Readonly<Record<SiteEffect, number>>;
  /** The technologies known, whose effects are counted here, in the order they became known. */
  readonly technologies: readonly Technology[];
}

/**
 * What these effects together leave of something in one region, in thousandths: those of
 * the sites in use there and of the technologies known, multiplied together.
 */
export function leftIn(
  sites: SiteEffects,
  effects: readonly SiteEffect[],
  regionIndex: number,
): number {
  return effects.reduce(
    (left, effect) => Math.floor((left * (sites.inRegion[effect][regionIndex] ?? 1000)) / 1000),
    1000,
  );
}

/** The effects of the sites in use and the technologies known as a quarter begins. */
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
  const technologies = knownTechnologies(projects);
  for (const technology of technologies) {
    for (const [effect, permille] of technologyEffectsOf(technology)) {
      if (SITE_EFFECT_DEFINITIONS[effect].reach === 'nation') {
        national[effect] = leave(national[effect], permille);
      } else {
        inRegion[effect] = inRegion[effect].map((left) => leave(left, permille));
      }
    }
  }
  return { inRegion, national, technologies };
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
export function instalment(
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
function placed({ regionId }: Pick<ProjectTerms, 'regionId'>): { readonly regionId?: string } {
  return regionId === undefined ? {} : { regionId };
}

function startedEntry({ words, ...terms }: ProjectTerms): ReportEntry {
  return {
    kind: words.reportKinds.started,
    seriousness: 'notable',
    headline: `${words.begins}: ${terms.name}`,
    cause: `It costs ${formatMoney(terms.cost)}, paid over the ${formatQuarters(terms.buildQuarters)} ${words.takes}.`,
    ...placed(terms),
  };
}

function pausedEntry({ words, ...terms }: ProjectTerms, due: Money): ReportEntry {
  return {
    kind: words.reportKinds.paused,
    seriousness: 'warning',
    headline: `${words.paused}: ${terms.name}`,
    cause: `The treasury could not cover its ${formatMoney(due)} instalment, so ${words.idle}.`,
    ...placed(terms),
  };
}

function resumedEntry({ words, ...terms }: ProjectTerms, quartersPaid: number): ReportEntry {
  return {
    kind: words.reportKinds.started,
    seriousness: 'notable',
    headline: `${words.resumes}: ${terms.name}`,
    cause: `${quartersPaid} of its ${formatQuarters(terms.buildQuarters)} of ${words.work} ${quartersPaid === 1 ? 'is' : 'are'} now done.`,
    ...placed(terms),
  };
}

function completedEntry({ words, ...terms }: ProjectTerms): ReportEntry {
  return {
    kind: words.reportKinds.finished,
    seriousness: 'notable',
    headline: `${words.finished}: ${terms.name}`,
    cause: `${words.finishedCause} ${terms.effect}`,
    ...placed(terms),
  };
}
