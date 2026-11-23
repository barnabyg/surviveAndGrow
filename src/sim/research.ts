import {
  instalment,
  onSite,
  onSurvey,
  onTechnology,
  projectStartFault,
  type Project,
  type ProjectStarting,
} from './projects';
import {
  knownTechnologies,
  technologyOf,
  technologyTerms,
  type TechnologyTerms,
} from './technology';
import type { GameDate, Money } from './types';
import { TECHNOLOGIES, type Technology, type TechnologyState } from './vocabulary';

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
