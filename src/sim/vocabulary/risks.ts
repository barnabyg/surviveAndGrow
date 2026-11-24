/** The risks ahead: the kinds of danger, and how likely one can be. */

/** The dangers the game looks ahead for. A list of risks is in this order where nothing else decides. */
export const RISK_KINDS = [
  'famine',
  'event',
  'priceShock',
  'reserve',
  'treasury',
  'bailout',
  'bondMaturity',
  'creditRating',
  'upkeep',
  'strikes',
  'tier',
  'neighbour',
  'borderIncident',
  'coup',
  'election',
] as const;
export type RiskKind = (typeof RISK_KINDS)[number];

/** How likely a risk is, from the least to the most. A risk less likely than remote is not listed. */
export const LIKELIHOODS = ['remote', 'unlikely', 'possible', 'likely', 'almostCertain'] as const;
export type Likelihood = (typeof LIKELIHOODS)[number];

export const LIKELIHOOD_NAMES: Readonly<Record<Likelihood, string>> = {
  remote: 'Remote',
  unlikely: 'Unlikely',
  possible: 'Possible',
  likely: 'Likely',
  almostCertain: 'Almost certain',
};
