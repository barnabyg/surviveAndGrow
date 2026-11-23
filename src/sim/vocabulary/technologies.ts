/** Technologies: the tree, and how a technology stands in it. */

/**
 * The technologies the engine knows, in the order the research tab shows them. A country file
 * cannot add one. What each costs, how long it takes to research and what it does once known
 * are balance values (`balance.technologies`); a technology is added here and there and in no
 * rule.
 */
export const TECHNOLOGIES = [
  'droughtResistantSeed',
  'improvedIrrigation',
  'coldStorage',
  'roadEngineering',
  'gridEfficiency',
  'hydropower',
  'publicHealth',
  'teacherTraining',
] as const;
export type Technology = (typeof TECHNOLOGIES)[number];

/**
 * What the engine knows of each technology: its name, and the technologies that must be known
 * before it can be researched. Together the prerequisites make the technology tree.
 */
export const TECHNOLOGY_DEFINITIONS: Readonly<
  Record<
    Technology,
    {
      readonly name: string;
      readonly prerequisites: readonly Technology[];
    }
  >
> = {
  droughtResistantSeed: { name: 'Drought-resistant seed', prerequisites: [] },
  improvedIrrigation: { name: 'Improved irrigation', prerequisites: ['droughtResistantSeed'] },
  coldStorage: { name: 'Cold storage', prerequisites: ['droughtResistantSeed'] },
  roadEngineering: { name: 'Road engineering', prerequisites: ['improvedIrrigation'] },
  gridEfficiency: { name: 'Grid efficiency', prerequisites: ['coldStorage'] },
  hydropower: { name: 'Hydropower', prerequisites: ['improvedIrrigation', 'gridEfficiency'] },
  // A branch of their own, apart from farming and infrastructure: each needs nothing first.
  publicHealth: { name: 'Public health', prerequisites: [] },
  teacherTraining: { name: 'Teacher training', prerequisites: [] },
};

/**
 * How a technology stands in the tree: known; being researched, or paused for want of money;
 * planned to be started as the quarter ends; available, its prerequisites known; or locked
 * until they are.
 */
export const TECHNOLOGY_STATES = [
  'known',
  'researching',
  'paused',
  'planned',
  'available',
  'locked',
] as const;
export type TechnologyState = (typeof TECHNOLOGY_STATES)[number];

export const TECHNOLOGY_STATE_NAMES: Readonly<Record<TechnologyState, string>> = {
  known: 'Known',
  researching: 'Being researched',
  paused: 'Paused',
  planned: 'Planned',
  available: 'Available',
  locked: 'Locked',
};
