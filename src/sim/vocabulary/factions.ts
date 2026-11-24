/** Factions: who they are, how each stands, and what a standing can answer to. */

/**
 * The factions, the engine's own like its site types: a country file cannot add one. The
 * first three live among a region's people, in the shares its faction mix gives, and their
 * standings move its approval. The army has no share of the people and moves no approval:
 * its standing is national army loyalty.
 */
export const CIVIL_FACTIONS = ['farmers', 'workers', 'business'] as const;
export type CivilFaction = (typeof CIVIL_FACTIONS)[number];

export const FACTIONS = [...CIVIL_FACTIONS, 'army'] as const;
export type Faction = (typeof FACTIONS)[number];

export const FACTION_NAMES: Readonly<Record<Faction, string>> = {
  farmers: 'Farmers',
  workers: 'Workers',
  business: 'Business',
  army: 'Army',
};

/**
 * How a civil faction stands, from the best to the worst. A standing is read in these moods
 * wherever it is shown; the army's is read in its own stages instead.
 */
export const FACTION_MOODS = ['pleased', 'content', 'uneasy', 'angry'] as const;
export type FactionMood = (typeof FACTION_MOODS)[number];

export const FACTION_MOOD_NAMES: Readonly<Record<FactionMood, string>> = {
  pleased: 'Pleased',
  content: 'Content',
  uneasy: 'Uneasy',
  angry: 'Angry',
};

/**
 * What a civil faction's standing can answer to. Each lever is a measure of the quarter that
 * the engine knows how to take (`factions.ts`). Which of them a faction answers to, how
 * heavily, and where each is neutral, at its best and at its worst are balance data
 * (`balance.factions.levers`).
 *
 * - `agricultureShare`: the share of what the budget spends that goes to agriculture, in
 *   thousandths.
 * - `servicesShare`: the share that goes to health and education together, in thousandths.
 * - `tax`: the tax rate, as a whole percentage.
 * - `budgetBalance`: the tax raised less what the budget spends, against the tax raised, in
 *   thousandths: below nothing is a deficit.
 * - `debtBurden`: what is owed against a year's revenue as the quarter begins, in thousandths.
 * - `works`: how many large sites are in use as the quarter begins: those that play a part in
 *   a chain or make power.
 * - `harvest`: what the drought and flood in force as the quarter begins leave of the
 *   harvest, in thousandths, where the faction's people live.
 */
export const FACTION_LEVERS = [
  'agricultureShare',
  'servicesShare',
  'tax',
  'budgetBalance',
  'debtBurden',
  'works',
  'harvest',
] as const;
export type FactionLever = (typeof FACTION_LEVERS)[number];

export const FACTION_LEVER_NAMES: Readonly<Record<FactionLever, string>> = {
  agricultureShare: 'Agriculture’s share of spending',
  servicesShare: 'Health and education’s share of spending',
  tax: 'Tax rate',
  budgetBalance: 'The budget’s balance',
  debtBurden: 'Debt burden',
  works: 'Large sites in use',
  harvest: 'Drought and flood',
};
