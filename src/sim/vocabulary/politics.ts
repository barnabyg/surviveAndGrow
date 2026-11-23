/** Approval and unrest: what moves approval, and how far discontent can go. */

/**
 * What moves approval. Food is each region's own; the tax rate and the spending areas that
 * serve the public bear on every region alike; events are one-off pushes that fade.
 */
export const APPROVAL_DRIVERS = [
  'food',
  'tax',
  'health',
  'education',
  'security',
  'events',
] as const;
export type ApprovalDriver = (typeof APPROVAL_DRIVERS)[number];

export const APPROVAL_DRIVER_NAMES: Readonly<Record<ApprovalDriver, string>> = {
  food: 'Food',
  tax: 'Tax rate',
  health: 'Health spending',
  education: 'Education spending',
  security: 'Security spending',
  events: 'Events',
};

/** The kinds of unrest a region can be in, the milder first. */
export const UNREST_KINDS = ['strikes', 'protests'] as const;

/** How far a region's discontent has gone, from none to the worst. */
export const UNREST_LEVELS = ['calm', ...UNREST_KINDS] as const;
export type Unrest = (typeof UNREST_LEVELS)[number];

export const UNREST_NAMES: Readonly<Record<Unrest, string>> = {
  calm: 'Calm',
  strikes: 'Strikes',
  protests: 'Protests',
};
