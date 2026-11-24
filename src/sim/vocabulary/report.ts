/** The turn report: the kinds of entry, and how serious one can be. */

/**
 * The kinds of thing a turn report can tell the player. Each kind has its own icon in the
 * interface, so a new kind is added here and given an icon there.
 */
export const REPORT_KINDS = [
  'budget',
  'spendingCut',
  'harvest',
  'hunger',
  'event',
  'strike',
  'protest',
  'armyLoyalty',
  'projectStarted',
  'projectPaused',
  'projectCompleted',
  'researchStarted',
  'researchPaused',
  'researchCompleted',
  'surveyStarted',
  'surveyPaused',
  'surveyCompleted',
  'siteDecaying',
  'siteRestored',
  'loanTaken',
  'loanRepaid',
  'trade',
  'priceShock',
  'bailout',
  'missedPayment',
  'austerity',
  'creditRating',
  'dilemma',
  'tier',
  'election',
  'collapse',
  'victory',
  'quiet',
] as const;
export type ReportKind = (typeof REPORT_KINDS)[number];

/** How serious a report is, from the least to the most. A turn report leads with the most serious. */
export const SERIOUSNESS_LEVELS = ['routine', 'notable', 'warning', 'serious', 'critical'] as const;
export type Seriousness = (typeof SERIOUSNESS_LEVELS)[number];

export const SERIOUSNESS_NAMES: Readonly<Record<Seriousness, string>> = {
  routine: 'Routine',
  notable: 'Notable',
  warning: 'Warning',
  serious: 'Serious',
  critical: 'Critical',
};
