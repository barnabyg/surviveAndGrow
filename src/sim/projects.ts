import { sum } from './arithmetic';
import { balance } from './balance';
import { nextDate } from './calendar';
import type { Country, Site } from './country';
import type { ReportEntry } from './report';
import { siteTerms, type SiteTerms } from './sites';
import { formatMoney, formatQuarters } from './text';
import type { Contribution, GameDate, Money } from './types';
import type { ProjectStatus, SiteState } from './vocabulary';

/**
 * Something being built on a site, or built and in use. Anything with a cost, a build time
 * and a lasting effect is a project.
 */
export interface Project {
  readonly siteId: string;
  /** The quarter the project was started in. */
  readonly began: GameDate;
  /** How many instalments have been paid, which is how many quarters of building are done. */
  readonly quartersPaid: number;
  readonly status: ProjectStatus;
  /** The first quarter the finished site is in use, or null while it is being built. */
  readonly opened: GameDate | null;
}

/** How one site stands: empty, being built, or in use. */
export interface SiteStatus {
  readonly siteId: string;
  readonly state: SiteState;
  readonly quartersPaid: number;
  readonly buildQuarters: number;
  readonly cost: Money;
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
  const project = projects.find((candidate) => candidate.siteId === siteId);
  const terms = site === undefined ? null : siteTerms(site.type);
  const quartersPaid = project?.quartersPaid ?? 0;
  return {
    siteId,
    state: project?.status ?? 'empty',
    quartersPaid,
    buildQuarters: terms?.buildQuarters ?? 0,
    cost: terms?.cost ?? 0,
    instalment: terms === null ? 0 : instalment(terms, quartersPaid),
    began: project?.began ?? null,
    opened: project?.opened ?? null,
  };
}

/**
 * What is wrong with starting projects on these sites this quarter, or null when the game
 * allows it. A project is started on an empty site, and only when the treasury holds the
 * whole cost of everything started together, though it is then paid for as it is built.
 */
export function startFault(
  { country, projects, treasury }: Building & { readonly treasury: Money },
  siteIds: readonly string[],
): string | null {
  const sites: Site[] = [];
  for (const siteId of siteIds) {
    const site = country.sites.find((candidate) => candidate.id === siteId);
    if (site === undefined) return `There is no site "${siteId}" to build on.`;
    if (sites.includes(site)) return `${site.name} is listed twice.`;
    const project = projects.find((candidate) => candidate.siteId === siteId);
    if (project !== undefined) {
      return `${site.name} is already ${project.status === 'operating' ? 'built' : 'being built'}.`;
    }
    sites.push(site);
  }
  const cost = sum(sites.map((site) => siteTerms(site.type).cost));
  if (cost <= treasury) return null;
  const what = sites.length === 1 ? (sites[0]?.name ?? '') : `${sites.length} projects`;
  return `The treasury holds ${formatMoney(treasury)}, which does not cover the ${formatMoney(cost)} needed to start ${what}.`;
}

/** What a quarter of building does. */
export interface BuildingOutcome {
  /** Every project as the quarter leaves it, in the order they were started. */
  readonly projects: readonly Project[];
  /** What was paid in instalments. */
  readonly paid: Money;
  /** The instalments, one line for each project paid for. */
  readonly contributions: readonly Contribution[];
  /** The sites whose instalment could not be covered, so that nothing was built there. */
  readonly paused: readonly string[];
  readonly entries: readonly ReportEntry[];
}

/**
 * One quarter of building. Projects are paid for out of what the budget has left, in the
 * order they were started: the budget's own spending comes first. A project whose
 * instalment cannot be covered pauses for the quarter and carries on when it can be paid.
 * One that has had its last instalment is in use from the next quarter.
 */
export function resolveProjects(
  { country, projects }: Building,
  starts: readonly string[],
  date: GameDate,
  available: Money,
): BuildingOutcome {
  const begun = starts.map((siteId): Project => ({
    siteId,
    began: date,
    quartersPaid: 0,
    status: 'building',
    opened: null,
  }));
  const contributions: Contribution[] = [];
  const paused: string[] = [];
  const entries: ReportEntry[] = [];
  let left = available;

  const after = [...projects, ...begun].map((project): Project => {
    const site = country.sites.find((candidate) => candidate.id === project.siteId);
    if (site === undefined || project.status === 'operating') return project;
    const terms = siteTerms(site.type);
    const due = instalment(terms, project.quartersPaid);
    const told = { name: site.name, regionId: site.regionId, terms };
    if (begun.includes(project)) entries.push(startedEntry(told));

    if (due > left) {
      paused.push(site.id);
      entries.push(pausedEntry(told, due));
      return { ...project, status: 'paused' };
    }
    left -= due;
    contributions.push({ label: `Building ${site.name}`, amount: -due, regionId: site.regionId });
    const quartersPaid = project.quartersPaid + 1;
    if (project.status === 'paused') entries.push(resumedEntry(told, quartersPaid));
    if (quartersPaid < terms.buildQuarters) return { ...project, quartersPaid, status: 'building' };
    entries.push(completedEntry(told));
    return { ...project, quartersPaid, status: 'operating', opened: nextDate(date) };
  });

  return { projects: after, paid: available - left, contributions, paused, entries };
}

/**
 * What the sites in use do, as what each leaves of something, in thousandths: 1000 leaves
 * it whole. Several sites of one type bearing on the same thing multiply together.
 */
export interface SiteEffects {
  /** What is left of the weather's and of events' hold on each region's harvest. */
  readonly weatherPermille: readonly number[];
  /** What is left of the share of each region's surplus lost in transport. */
  readonly transportLossPermille: readonly number[];
  /** What is left of the share of the national reserve that spoils. */
  readonly spoilagePermille: number;
}

/** The effects of the sites in use as a quarter begins. Each list has one entry per region. */
export function siteEffects({ country, projects }: Building): SiteEffects {
  const inUse = country.sites.filter((site) =>
    projects.some((project) => project.siteId === site.id && project.status === 'operating'),
  );
  const compound = (sites: readonly Site[], permille: number) =>
    sites.reduce((left) => Math.floor((left * permille) / 1000), 1000);
  const { irrigation, farmRoad, grainStore } = balance.sites;
  const ofType = (type: Site['type'], regionId?: string) =>
    inUse.filter(
      (site) => site.type === type && (regionId === undefined || site.regionId === regionId),
    );
  return {
    weatherPermille: country.regions.map((region) =>
      compound(ofType('irrigation', region.id), irrigation.weatherPermille),
    ),
    transportLossPermille: country.regions.map((region) =>
      compound(ofType('farmRoad', region.id), farmRoad.transportLossPermille),
    ),
    spoilagePermille: compound(ofType('grainStore'), grainStore.spoilagePermille),
  };
}

/**
 * The instalment due after `quartersPaid` have been paid. The cost is split into equal
 * whole amounts, and the last instalment makes up whatever that leaves over.
 */
function instalment(terms: SiteTerms, quartersPaid: number): Money {
  if (quartersPaid >= terms.buildQuarters) return 0;
  const even = Math.floor(terms.cost / terms.buildQuarters);
  return quartersPaid === terms.buildQuarters - 1
    ? terms.cost - even * (terms.buildQuarters - 1)
    : even;
}

interface Told {
  readonly name: string;
  readonly regionId: string;
  readonly terms: SiteTerms;
}

function startedEntry({ name, regionId, terms }: Told): ReportEntry {
  return {
    kind: 'projectStarted',
    seriousness: 'notable',
    headline: `Building begins: ${name}`,
    cause: `It costs ${formatMoney(terms.cost)}, paid over the ${formatQuarters(terms.buildQuarters)} it takes to build.`,
    regionId,
  };
}

function pausedEntry({ name, regionId }: Told, due: Money): ReportEntry {
  return {
    kind: 'projectPaused',
    seriousness: 'warning',
    headline: `Paused: ${name}`,
    cause: `The treasury could not cover its ${formatMoney(due)} instalment, so nothing was built this quarter.`,
    regionId,
  };
}

function resumedEntry({ name, regionId, terms }: Told, quartersPaid: number): ReportEntry {
  return {
    kind: 'projectStarted',
    seriousness: 'notable',
    headline: `Building resumes: ${name}`,
    cause: `${quartersPaid} of its ${formatQuarters(terms.buildQuarters)} of building ${quartersPaid === 1 ? 'is' : 'are'} now done.`,
    regionId,
  };
}

function completedEntry({ name, regionId, terms }: Told): ReportEntry {
  return {
    kind: 'projectCompleted',
    seriousness: 'notable',
    headline: `Finished: ${name}`,
    cause: `It is in use from next quarter. ${terms.effect}`,
    regionId,
  };
}
