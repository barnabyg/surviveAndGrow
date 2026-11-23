import { sum } from './arithmetic';
import { chains } from './chains';
import { regionName } from './country';
import { livingStandards, type ProsperitySituation } from './prosperity';
import {
  instalment,
  onSite,
  siteStatus,
  sitesInUse,
  onSurvey,
  onTechnology,
  projectStartFault,
  type Project,
  type ProjectStarting,
} from './projects';
import { improvedEffect, improves, technologiesNeeded } from './sites';
import {
  knownTechnologies,
  technologyName,
  technologyOf,
  technologyTerms,
  type TechnologyTerms,
} from './technology';
import type { GameDate, Money } from './types';
import {
  SITE_TYPE_DEFINITIONS,
  SITE_TYPES,
  TECHNOLOGIES,
  type Technology,
  type TechnologyState,
} from './vocabulary';

/** How one technology stands in the tree, and what researching it takes and does. */
export interface TechnologyStatus extends TechnologyTerms {
  readonly state: TechnologyState;
  /** How many quarters of research are done. */
  readonly quartersPaid: number;
  /** What the next quarter of research costs, or nothing once it is known. */
  readonly instalment: Money;
  /** The quarter research began, or null if it has not. */
  readonly began: GameDate | null;
  /** The first quarter it is known, or null until then. */
  readonly known: GameDate | null;
  /**
   * Why research on it cannot be started this quarter, beside what is already planned, or
   * null when it can. A technology known, under way or planned has a reason too.
   */
  readonly fault: string | null;
}

/**
 * Every technology in the tree, in the vocabulary's order, as it stands with `planned` to
 * be started as the quarter ends beside the sites and the surveys planned.
 */
export function researchStatuses(
  game: ProjectStarting,
  planned: Technology | null,
  plannedSiteIds: readonly string[] = [],
  plannedSurveys: readonly string[] = [],
): readonly TechnologyStatus[] {
  return TECHNOLOGIES.map((technology) => {
    const terms = technologyTerms(technology);
    const project = game.projects.find((each) => technologyOf(each) === technology);
    const quartersPaid = project?.quartersPaid ?? 0;
    const fault =
      planned === technology
        ? `${terms.name} is planned.`
        : researchFault(game, technology, plannedSiteIds, planned, plannedSurveys);
    return {
      ...terms,
      state: stateOf(project, planned === technology, terms, game.projects),
      quartersPaid,
      instalment: instalment(
        { cost: terms.cost, buildQuarters: terms.researchQuarters },
        quartersPaid,
      ),
      began: project?.began ?? null,
      known: project?.status === 'known' ? project.opened : null,
      fault,
    };
  });
}

/**
 * What is wrong with starting research on a technology this quarter, beside the sites, the
 * research and the surveys already planned, or null when it can be started.
 */
export function researchFault(
  game: ProjectStarting,
  technology: Technology,
  plannedSiteIds: readonly string[],
  planned: Technology | null = null,
  plannedSurveys: readonly string[] = [],
): string | null {
  return projectStartFault(game, [
    ...plannedSiteIds.map(onSite),
    ...(planned === null ? [] : [onTechnology(planned)]),
    ...plannedSurveys.map(onSurvey),
    onTechnology(technology),
  ]);
}

function stateOf(
  project: Project | undefined,
  planned: boolean,
  terms: TechnologyTerms,
  projects: readonly Project[],
): TechnologyState {
  if (project?.status === 'known') return 'known';
  if (project?.status === 'paused') return 'paused';
  if (project !== undefined) return 'researching';
  if (planned) return 'planned';
  const known = knownTechnologies(projects);
  return terms.prerequisites.every((needed) => known.includes(needed)) ? 'available' : 'locked';
}

/** A site in use a technology improves, and what it would do with it. */
export interface SiteGain {
  readonly siteId: string;
  readonly name: string;
  /**
   * What the site does with the technology, in its own sentence, each figure the technology
   * moves saying what it is without it: "now" for one not yet known.
   */
  readonly effect: string;
}

/** A chain whose ore a technology moves, in tonnes a quarter. */
export interface ChainGain {
  readonly sourceId: string;
  readonly name: string;
  readonly before: number;
  readonly after: number;
}

/** A region whose output and infrastructure access a technology moves. */
export interface RegionGain {
  readonly regionId: string;
  readonly name: string;
  /** What it adds to the region's output a quarter. */
  readonly output: Money;
  /** What it adds to the region's infrastructure access, in thousandths. */
  readonly infrastructure: number;
}

/** A site of the country's that a technology unlocks, and the region it stands in. */
export interface SiteUnlock {
  readonly siteId: string;
  readonly name: string;
  readonly regionName: string;
}

/**
 * What a technology does in this game, from the sites in use: what it would do once known, or
 * what it does, for one known. A technology that improves a type of site pays off only where
 * one is in use.
 */
export interface TechnologyGains {
  readonly sites: readonly SiteGain[];
  readonly chains: readonly ChainGain[];
  readonly regions: readonly RegionGain[];
  /**
   * While no site it improves is in use, a sentence that says so; null when one is, or when
   * the technology improves no type of site.
   */
  readonly awaiting: string | null;
  /**
   * The country's sites that need the technology before they can be started, in the country
   * file's order, less those an alternative has closed.
   */
  readonly unlocks: readonly SiteUnlock[];
}

/** What a technology does in this game, from the sites in use (`TechnologyGains`). */
export function technologyGains(
  game: ProsperitySituation & { readonly date: GameDate },
  technology: Technology,
): TechnologyGains {
  const isKnown = knownTechnologies(game.projects).includes(technology);
  const without = game.projects.filter((project) => technologyOf(project) !== technology);
  const withIt: readonly Project[] = isKnown
    ? game.projects
    : [
        ...without,
        {
          target: onTechnology(technology),
          began: game.date,
          quartersPaid: technologyTerms(technology).researchQuarters,
          status: 'known',
          opened: game.date,
        },
      ];
  const before = { ...game, projects: without };
  const after = { ...game, projects: withIt };
  const knownBefore = knownTechnologies(without);
  const note = isKnown ? `without ${technologyName(technology)}` : 'now';
  const sites = sitesInUse(before).flatMap(({ site, decaying }): SiteGain[] => {
    const effect = improvedEffect(site, knownBefore, technology, decaying, note);
    return effect === null ? [] : [{ siteId: site.id, name: site.name, effect }];
  });
  const chainsBefore = chains(before);
  const chainGains = chains(after).flatMap((chain): ChainGain[] => {
    const then = chainsBefore.find((each) => each.sourceId === chain.sourceId)?.shipped ?? 0;
    const name = game.country.sites.find((site) => site.id === chain.sourceId)?.name ?? '';
    return chain.shipped === then
      ? []
      : [{ sourceId: chain.sourceId, name, before: then, after: chain.shipped }];
  });
  const standardsBefore = livingStandards(before);
  const regions = livingStandards(after).flatMap((standard): RegionGain[] => {
    const then = standardsBefore.find((each) => each.regionId === standard.regionId);
    const output =
      sum(standard.output.map((part) => part.amount)) -
      sum((then?.output ?? []).map((part) => part.amount));
    const infrastructure =
      standard.scores.infrastructure -
      (then?.scores.infrastructure ?? standard.scores.infrastructure);
    return output === 0 && infrastructure === 0
      ? []
      : [
          {
            regionId: standard.regionId,
            name: regionName(game.country, standard.regionId),
            output,
            infrastructure,
          },
        ];
  });
  const improved = SITE_TYPES.filter((type) => improves(technology, type)).map((type) =>
    SITE_TYPE_DEFINITIONS[type].name.toLowerCase(),
  );
  const awaiting =
    improved.length === 0 || sites.length > 0
      ? null
      : `No ${orListed(improved)} is in use yet, so it improves nothing until one is built.`;
  const unlocks = game.country.sites.flatMap((site): SiteUnlock[] =>
    technologiesNeeded(site).includes(technology) && siteStatus(game, site.id).closedBy === null
      ? [{ siteId: site.id, name: site.name, regionName: regionName(game.country, site.regionId) }]
      : [],
  );
  return { sites, chains: chainGains, regions, awaiting, unlocks };
}

/** Names as alternatives: "A", "A or B", "A, B or C". */
function orListed(names: readonly string[]): string {
  return names.length < 2
    ? (names[0] ?? '')
    : `${names.slice(0, -1).join(', ')} or ${names.at(-1) ?? ''}`;
}
