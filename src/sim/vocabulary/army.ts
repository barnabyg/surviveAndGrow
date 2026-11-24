/** The army: how loyal it is, by stages, and what moves its loyalty. */

/**
 * How loyal the army is, from the best to the worst. Loyalty is read in these stages
 * wherever it is shown, for the nation and for each region.
 */
export const ARMY_STAGES = ['loyal', 'restless', 'plotting'] as const;
export type ArmyStage = (typeof ARMY_STAGES)[number];

export const ARMY_STAGE_NAMES: Readonly<Record<ArmyStage, string>> = {
  loyal: 'Loyal',
  restless: 'Restless',
  plotting: 'Plotting',
};

/**
 * What moves army loyalty. Defence spending bears on every region alike; unrest is each
 * region's own.
 */
export const LOYALTY_DRIVERS = ['defence', 'unrest'] as const;
export type LoyaltyDriver = (typeof LOYALTY_DRIVERS)[number];

export const LOYALTY_DRIVER_NAMES: Readonly<Record<LoyaltyDriver, string>> = {
  defence: 'Defence spending',
  unrest: 'Unrest',
};
