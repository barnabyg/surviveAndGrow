import { sum } from './arithmetic';
import { buildingBarred, type Austere } from './austerity';
import { balance } from './balance';
import { nextDate } from './calendar';
import { regionName, type Country, type Site } from './country';
import { surveyFault, surveyFindings, surveyOf, surveyTerms } from './deposits';
import type { ReportEntry } from './report';
import {
  improvementsOf,
  infrastructureOf,
  siteEffectsOf,
  siteTerms,
  technologiesNeeded,
} from './sites';
import {
  knownTechnologies,
  technologyEffectsOf,
  technologyFault,
  technologyName,
  technologyOf,
  technologyTerms,
} from './technology';
import { formatMoney, formatQuarters, listed } from './text';
import type { Contribution, GameDate, Money } from './types';
import { inUse, isInUseState } from './upkeep';
import {
  PROJECT_TARGET_FINISHED,
  PROJECT_TARGET_KINDS,
  PROJECT_TARGET_WORDS,
  SITE_EFFECT_DEFINITIONS,
  SITE_EFFECTS,
  TECHNOLOGIES,
  type ProjectStatus,
  type ProjectTargetKind,
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

/** A project on no site: surveying a region for the deposit the country file hides there. */
export interface SurveyTarget {
  readonly kind: 'survey';
  readonly regionId: string;
}

/**
 * What a project is for, one of `PROJECT_TARGET_KINDS`: a site, built on, a technology,
 * researched, or a region, surveyed. Whatever its target, a project is paid for and paused in the same way
 * (`resolveProjects`) and barred in the same way (`projectStartFault`). Only what depends on
 * the target is written for each kind: its terms (`projectTerms`), what may stop it being
 * started (`targetFault`), the site it is on (`siteOf`), and how a save holds it
 * (`readTarget` in `save.ts`). A kind added to this union is found by the compiler in each.
 */
export type ProjectTarget = SiteTarget | TechnologyTarget | SurveyTarget;

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

/** The target of a survey of a region. */
export function onSurvey(regionId: string): ProjectTarget {
  return { kind: 'survey', regionId };
}

/** The site a project is on, or null for a project that is on no site. */
export function siteOf({ target }: Pick<Project, 'target'>): string | null {
  return target.kind === 'site' ? target.siteId : null;
}

/**
 * The projects a quarter's decisions start, in the order they are paid for: the sites to
 * build on, as listed, then the research, if any, and then the surveys, as listed.
 */
export function startsOf(decisions: {
  readonly startProjects?: readonly string[];
  readonly startResearch?: Technology | null;
  readonly startSurveys?: readonly string[];
}): ProjectTarget[] {
  const research = decisions.startResearch ?? null;
  return [
    ...(decisions.startProjects ?? []).map(onSite),
    ...(research === null ? [] : [onTechnology(research)]),
    ...(decisions.startSurveys ?? []).map(onSurvey),
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
  /** How the finished project stands: a site is operating, a technology known, a region surveyed. */
  readonly finished: ProjectStatus;
  readonly words: ProjectWords;
}

/**
 * A project's terms, or null when there is no such target: a site or region the country
 * lacks. What a survey found is told when it finishes (`surveyFindings`), not here. A site's
 * effect counts the technologies known given, naming those that improve it.
 */
export function projectTerms(
  country: Country,
  target: ProjectTarget,
  known: readonly Technology[] = [],
): ProjectTerms | null {
  const words = PROJECT_TARGET_WORDS[target.kind];
  if (target.kind === 'survey') {
    if (!country.regions.some((region) => region.id === target.regionId)) return null;
    const { cost, surveyQuarters } = surveyTerms(country, target.regionId);
    return {
      name: regionName(country, target.regionId),
      regionId: target.regionId,
      cost,
      buildQuarters: surveyQuarters,
      effect: 'It finds whether a deposit of ore lies there, and how large it is.',
      finished: PROJECT_TARGET_FINISHED.survey,
      words,
    };
  }
  if (target.kind === 'technology') {
    if (!TECHNOLOGIES.includes(target.technology)) return null;
    const { name, cost, researchQuarters, effect } = technologyTerms(target.technology);
    const finished = PROJECT_TARGET_FINISHED.technology;
    return { name, cost, buildQuarters: researchQuarters, effect, finished, words };
  }
  const site = country.sites.find((candidate) => candidate.id === target.siteId);
  if (site === undefined) return null;
  const { cost, buildQuarters, effect } = siteTerms(site.type, site.capacity, known);
  return {
    name: site.name,
    regionId: site.regionId,
    cost,
    buildQuarters,
    effect,
    finished: PROJECT_TARGET_FINISHED.site,
    words,
  };
}

/**
 * How one site stands: empty, locked until a technology is known, closed by building on one
 * of its alternatives, being built, or in use in good repair or decaying.
 */
export interface SiteStatus {
  readonly siteId: string;
  readonly state: SiteState;
  /** The alternative whose project closed the site, or null while it is not closed. */
  readonly closedBy: string | null;
  /**
   * The technologies not yet known that the site needs before it can be started, in the
   * tree's order: empty unless it is locked.
   */
  readonly lockedBy: readonly Technology[];
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

/**
 * How a site stands. A site the country does not have is reported as empty and free. One
 * closed by an alternative is closed, whatever it needs.
 */
export function siteStatus({ country, projects }: Building, siteId: string): SiteStatus {
  const site = country.sites.find((candidate) => candidate.id === siteId);
  const project = projectOnSite(projects, siteId);
  // Only what building takes is needed here, not what the site does, which takes longer to say.
  const terms = site === undefined ? null : balance.sites[site.type];
  const quartersPaid = project?.quartersPaid ?? 0;
  const closedBy =
    project === undefined
      ? (site?.alternatives.find((id) => projectOnSite(projects, id) !== undefined) ?? null)
      : null;
  const needed = project === undefined && closedBy === null && site ? technologiesNeeded(site) : [];
  const known = needed.length === 0 ? [] : knownTechnologies(projects);
  const lockedBy = needed.filter((technology) => !known.includes(technology));
  const unbegun = closedBy !== null ? 'closed' : lockedBy.length > 0 ? 'locked' : 'empty';
  return {
    siteId,
    state: project === undefined ? unbegun : siteStateOf(project),
    closedBy,
    lockedBy,
    quartersPaid,
    buildQuarters: terms?.buildQuarters ?? 0,
    cost: terms?.cost ?? 0,
    upkeep: terms?.upkeep ?? 0,
    instalment: terms === null ? 0 : instalment(terms, quartersPaid),
    began: project?.began ?? null,
    opened: project?.opened ?? null,
  };
}

/** How a project on no site stands once finished: a technology known, a region surveyed. */
type FinishedOffSite = (typeof PROJECT_TARGET_FINISHED)[Exclude<ProjectTargetKind, 'site'>];

/**
 * How a project on a site can stand: never as a project on no site finishes, which only
 * research and surveys do.
 */
export type SiteProjectState = Exclude<ProjectStatus, FinishedOffSite>;

/** Whether a project stands as only a project on no site finishes. */
function finishedOffSite(status: ProjectStatus): status is FinishedOffSite {
  return PROJECT_TARGET_KINDS.some(
    (kind) => kind !== 'site' && PROJECT_TARGET_FINISHED[kind] === status,
  );
}

/** How a site's project stands. Only a project on no site is ever finished otherwise than in use. */
export function siteStateOf({ status }: Pick<Project, 'status'>): SiteProjectState {
  return finishedOffSite(status) ? 'operating' : status;
}

/**
 * Whether a project of this kind can stand so: being built or paused, as any can, or finished
 * as its kind finishes, which for one finished in use is in good repair or decaying.
 */
export function standsAs(kind: ProjectTargetKind, status: ProjectStatus): boolean {
  const finished = PROJECT_TARGET_FINISHED[kind];
  if (isInUseState(status)) return isInUseState(finished);
  const finishes: readonly ProjectStatus[] = PROJECT_TARGET_KINDS.map(
    (each) => PROJECT_TARGET_FINISHED[each],
  );
  return status === finished || !finishes.includes(status);
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
 * null when nothing is. A project is started on an empty site, not on one locked until a
 * technology is known, nor on one closed by building on one of its alternatives nor together
 * with one. Research is started on a technology whose prerequisites are known, while no other
 * is being researched (`technologyFault`). A survey is started once in a region where a deposit
 * may lie (`surveyFault`).
 */
function targetFault(
  { country, projects }: Building,
  target: ProjectTarget,
  alongside: readonly ProjectTarget[],
): string | null {
  if (target.kind === 'survey') {
    const surveying = alongside.flatMap((other) => surveyOf({ target: other }) ?? []);
    return surveyFault(country, projects, target.regionId, surveying);
  }
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
  const { closedBy, lockedBy } = siteStatus({ country, projects }, site.id);
  if (closedBy !== null) {
    return `${site.name} is ruled out: building began on ${nameOf(closedBy)}, its alternative.`;
  }
  if (lockedBy.length > 0) {
    const must = lockedBy.length === 1 ? 'must' : 'must each';
    return `${site.name} is locked: ${listed(lockedBy.map(technologyName))} ${must} be researched first.`;
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
 * A survey that finishes reports what it found, which the seed decides (`deposits.ts`).
 */
export function resolveProjects(
  { country, projects, seed }: Building & { readonly seed: number },
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
  // A site finished reports what it does with the technologies known as the quarter began.
  const known = knownTechnologies(projects);

  const after = [...projects, ...begun].map((project): Project => {
    const terms = projectTerms(country, project.target, known);
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
    const regionId = surveyOf(project);
    const effect = regionId === null ? terms.effect : surveyFindings(country, seed, regionId);
    entries.push(completedEntry({ ...terms, effect }));
    return { ...project, quartersPaid, status: terms.finished, opened: nextDate(date) };
  });

  return { projects: after, paid: available - left, contributions, paused, entries };
}

/** Whether a project is finished: a site in use, a technology known or a region surveyed. */
function isFinished(project: Project): boolean {
  return inUse(project) || project.status === PROJECT_TARGET_FINISHED[project.target.kind];
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
  /**
   * For each effect, the technologies known that improve a site in use bearing on it, in the
   * order they became known: those that `inRegion` and `national` count beyond `unimproved`.
   */
  readonly improvedBy: Readonly<Record<SiteEffect, readonly Technology[]>>;
  /** The same effects as they would be if no technology improved the sites in use. */
  readonly unimproved: Pick<SiteEffects, 'inRegion' | 'national'>;
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
  const technologies = knownTechnologies(projects);
  const inUse = sitesInUse({ country, projects });
  const improvedBy = Object.fromEntries(
    SITE_EFFECTS.map((effect) => [
      effect,
      technologies.filter((technology) =>
        inUse.some(({ site }) =>
          improvementsOf(site.type, [technology]).some(
            ([, improvement]) => improvement.effects?.[effect] !== undefined,
          ),
        ),
      ),
    ]),
  ) as Record<SiteEffect, Technology[]>;
  return {
    ...effectsOf(country, inUse, technologies, technologies),
    technologies,
    improvedBy,
    unimproved: effectsOf(country, inUse, technologies, []),
  };
}

/**
 * What the sites in use, improved by the technologies `improving`, and the technologies
 * `known` everywhere leave of each thing, region by region and across the nation.
 */
function effectsOf(
  country: Country,
  inUse: readonly SiteInUse[],
  known: readonly Technology[],
  improving: readonly Technology[],
): Pick<SiteEffects, 'inRegion' | 'national'> {
  const inRegion = Object.fromEntries(
    SITE_EFFECTS.map((effect) => [effect, country.regions.map(() => 1000)]),
  ) as Record<SiteEffect, number[]>;
  const national = Object.fromEntries(SITE_EFFECTS.map((effect) => [effect, 1000])) as Record<
    SiteEffect,
    number
  >;
  const leave = (left: number, permille: number) => Math.floor((left * permille) / 1000);
  for (const { site, decaying } of inUse) {
    const regionIndex = country.regions.findIndex((region) => region.id === site.regionId);
    for (const [effect, permille] of siteEffectsOf(site.type, decaying, improving)) {
      if (SITE_EFFECT_DEFINITIONS[effect].reach === 'nation') {
        national[effect] = leave(national[effect], permille);
      } else if (regionIndex >= 0) {
        const left = inRegion[effect];
        left[regionIndex] = leave(left[regionIndex] ?? 1000, permille);
      }
    }
  }
  for (const technology of known) {
    for (const [effect, permille] of technologyEffectsOf(technology)) {
      if (SITE_EFFECT_DEFINITIONS[effect].reach === 'nation') {
        national[effect] = leave(national[effect], permille);
      } else {
        inRegion[effect] = inRegion[effect].map((left) => leave(left, permille));
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
    cause: `It costs ${formatMoney(terms.cost)}, paid over the ${formatQuarters(terms.buildQuarters)} it takes ${words.toFinish}.`,
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
