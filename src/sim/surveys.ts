import type { Country } from './country';
import { depositFind, depositIn, surveyOf, surveyTerms, type SurveyTerms } from './deposits';
import {
  instalment,
  onSurvey,
  projectStartFault,
  startsOf,
  type ProjectStarting,
  type ProjectTarget,
} from './projects';
import type { Decisions } from './state';
import type { GameDate, Money } from './types';
import type { SurveyState } from './vocabulary';

/** The projects a quarter's decisions would start: the sites, the research and the surveys. */
export type ProjectPlan = Pick<Decisions, 'startProjects' | 'startResearch' | 'startSurveys'>;

/**
 * What is wrong with starting a project on this target this quarter, beside everything
 * already planned, or null when it can be started: the treasury must cover them all.
 */
export function planFault(
  game: ProjectStarting,
  plan: ProjectPlan,
  target: ProjectTarget,
): string | null {
  return projectStartFault(game, [...startsOf(plan), target]);
}

/** How a survey of one region stands, what it takes, and what it may find or has found. */
export interface SurveyStatus extends SurveyTerms {
  readonly state: SurveyState;
  /** How many quarters of surveying are done. */
  readonly quartersPaid: number;
  /** What the next quarter of surveying costs, or nothing once it is done. */
  readonly instalment: Money;
  /** The quarter the survey began, or null if it has not. */
  readonly began: GameDate | null;
  /** The ore a found deposit's mine could yield a quarter, in tonnes, once surveyed; else null. */
  readonly found: number | null;
  /**
   * Why a survey of the region cannot be started this quarter, beside what is already
   * planned, or null when it can. A region surveyed, being surveyed or planned has a reason too.
   */
  readonly fault: string | null;
}

/** What surveying needs of the game: what starting a project needs, the seed, and the country. */
export type Surveying = ProjectStarting & { readonly seed: number; readonly country: Country };

/** Every region, in the country file's order, as it stands for a survey beside the plan. */
export function surveyStatuses(game: Surveying, plan: ProjectPlan): readonly SurveyStatus[] {
  return game.country.regions.map((region) => surveyStatus(game, region.id, plan));
}

/** How a survey of one region stands beside the plan. */
export function surveyStatus(game: Surveying, regionId: string, plan: ProjectPlan): SurveyStatus {
  const terms = surveyTerms(game.country, regionId);
  const project = game.projects.find((each) => surveyOf(each) === regionId);
  const planned = (plan.startSurveys ?? []).includes(regionId);
  const quartersPaid = project?.quartersPaid ?? 0;
  const deposit = depositIn(game.country, regionId);
  const surveyed = project?.status === 'surveyed';
  const others = {
    ...plan,
    startSurveys: (plan.startSurveys ?? []).filter((id) => id !== regionId),
  };
  return {
    ...terms,
    state:
      deposit === null
        ? 'barren'
        : surveyed
          ? 'surveyed'
          : project?.status === 'paused'
            ? 'paused'
            : project !== undefined
              ? 'surveying'
              : planned
                ? 'planned'
                : 'unsurveyed',
    quartersPaid,
    instalment: instalment({ cost: terms.cost, buildQuarters: terms.surveyQuarters }, quartersPaid),
    began: project?.began ?? null,
    found: surveyed && deposit !== null ? depositFind(game.seed, deposit) : null,
    fault:
      planned && deposit !== null
        ? `${terms.name} is planned.`
        : planFault(game, others, onSurvey(regionId)),
  };
}
