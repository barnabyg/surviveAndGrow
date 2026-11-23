/** Surveys: how a region stands for one. */

/**
 * How a region stands for a survey: no deposit could lie there, so there is nothing to
 * survey; not yet surveyed; planned to be surveyed as the quarter ends; being surveyed, or
 * paused for want of money; or surveyed, once and for all.
 */
export const SURVEY_STATES = [
  'barren',
  'unsurveyed',
  'planned',
  'surveying',
  'paused',
  'surveyed',
] as const;
export type SurveyState = (typeof SURVEY_STATES)[number];

export const SURVEY_STATE_NAMES: Readonly<Record<SurveyState, string>> = {
  barren: 'Nothing to survey',
  unsurveyed: 'Not surveyed',
  planned: 'Planned',
  surveying: 'Being surveyed',
  paused: 'Paused',
  surveyed: 'Surveyed',
};
