/** Projects: how one stands, what it can be for, and the words the report uses for each. */

import type { ReportKind } from './report';

/**
 * How a project stands: being built, held up for want of money, or finished. A site, once
 * built, is in use: operating while its upkeep is paid and decaying while it is not. A
 * technology, once researched, is known. A region, once its survey is done, is surveyed.
 */
export const PROJECT_STATUSES = [
  'building',
  'paused',
  'operating',
  'decaying',
  'known',
  'surveyed',
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

/**
 * What a project can be for: a site, built on, a technology, researched, or a region,
 * surveyed. A kind added here is a project's target of its own in `projects.ts`, and a
 * save-format change.
 */
export const PROJECT_TARGET_KINDS = ['site', 'technology', 'survey'] as const;
export type ProjectTargetKind = (typeof PROJECT_TARGET_KINDS)[number];

/**
 * How a finished project of each kind stands: a site operating, from which it may decay, a
 * technology known and a region surveyed.
 */
export const PROJECT_TARGET_FINISHED = {
  site: 'operating',
  technology: 'known',
  survey: 'surveyed',
} as const satisfies Readonly<Record<ProjectTargetKind, ProjectStatus>>;

/**
 * How the report and the treasury's breakdown speak of a project of each kind: the headline
 * of each report entry, the work it is ("2 of its 3 quarters of building"), what it is for
 * ("the site"), what finishing it is ("the 3 quarters it takes to build"), what a quarter
 * without money did, what finishing means, the line it pays in the treasury's breakdown
 * ("Building Lowmere irrigation"), and the kinds of report its entries are. The risks ahead
 * warn of an instalment the treasury cannot cover with `instalmentOn`, which comes before the
 * project's name ("research into Hydropower") and is empty for a site, whose name says it
 * all, and with `pauses`, which is what then pauses.
 */
export interface ProjectWords {
  readonly begins: string;
  readonly resumes: string;
  readonly paused: string;
  readonly finished: string;
  readonly work: string;
  readonly subject: string;
  readonly toFinish: string;
  readonly idle: string;
  readonly finishedCause: string;
  readonly paying: string;
  readonly instalmentOn: string;
  readonly pauses: string;
  readonly reportKinds: {
    readonly started: ReportKind;
    readonly paused: ReportKind;
    readonly finished: ReportKind;
  };
}

export const PROJECT_TARGET_WORDS: Readonly<Record<ProjectTargetKind, ProjectWords>> = {
  site: {
    begins: 'Building begins',
    resumes: 'Building resumes',
    paused: 'Paused',
    finished: 'Finished',
    work: 'building',
    subject: 'the site',
    toFinish: 'to build',
    idle: 'nothing was built this quarter',
    finishedCause: 'It is in use from next quarter.',
    paying: 'Building',
    instalmentOn: '',
    pauses: 'building there',
    reportKinds: {
      started: 'projectStarted',
      paused: 'projectPaused',
      finished: 'projectCompleted',
    },
  },
  technology: {
    begins: 'Research begins',
    resumes: 'Research resumes',
    paused: 'Research paused',
    finished: 'Research finished',
    work: 'research',
    subject: 'the technology',
    toFinish: 'to research',
    idle: 'no research was done this quarter',
    finishedCause: 'It is known from next quarter.',
    paying: 'Researching',
    instalmentOn: 'research into',
    pauses: 'the research',
    reportKinds: {
      started: 'researchStarted',
      paused: 'researchPaused',
      finished: 'researchCompleted',
    },
  },
  survey: {
    begins: 'Survey begins',
    resumes: 'Survey resumes',
    paused: 'Survey paused',
    finished: 'Survey finished',
    work: 'surveying',
    subject: 'the region',
    toFinish: 'to survey',
    idle: 'no surveying was done this quarter',
    finishedCause: 'The surveyors have reported.',
    paying: 'Surveying',
    instalmentOn: 'the survey of',
    pauses: 'the survey',
    reportKinds: {
      started: 'surveyStarted',
      paused: 'surveyPaused',
      finished: 'surveyCompleted',
    },
  },
};
