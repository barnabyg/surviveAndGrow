import { percentOff } from './arithmetic';
import { balance, type SiteImprovement } from './balance';
import type { Project } from './projects';
import { siteTerms } from './sites';
import { listed } from './text';
import type { Money } from './types';
import {
  IMPROVEMENT_SENTENCES,
  SITE_EFFECT_DEFINITIONS,
  SITE_EFFECTS,
  SITE_TYPE_DEFINITIONS,
  SITE_TYPES,
  TECHNOLOGIES,
  TECHNOLOGY_DEFINITIONS,
  type SiteEffect,
  type SiteType,
  type Technology,
} from './vocabulary';

/**
 * What researching a technology takes, and what it then does. It is the same in every game:
 * the technologies are the engine's, not a country's.
 */
export interface TechnologyTerms {
  readonly technology: Technology;
  readonly name: string;
  readonly cost: Money;
  /** How many quarters it takes to research. */
  readonly researchQuarters: number;
  /** What it does once known, in sentences the player can be shown. */
  readonly effect: string;
  /** The technologies that must be known before it can be researched. */
  readonly prerequisites: readonly Technology[];
  /** The technologies it is a prerequisite of: what it leads to in the tree. */
  readonly leadsTo: readonly Technology[];
  /** The types of site it unlocks, which cannot be started until it is known. */
  readonly unlocks: readonly SiteType[];
}

/** The terms of a technology, from its definition and its balance values. */
export function technologyTerms(technology: Technology): TechnologyTerms {
  const { name, prerequisites } = TECHNOLOGY_DEFINITIONS[technology];
  const { cost, researchQuarters } = balance.technologies[technology];
  const unlocks = SITE_TYPES.filter(
    (type) => SITE_TYPE_DEFINITIONS[type].unlockedBy === technology,
  );
  return {
    technology,
    name,
    cost,
    researchQuarters,
    effect: [
      ...technologyEffectsOf(technology).map(([effect, permille]) =>
        SITE_EFFECT_DEFINITIONS[effect].everywhere.replace(
          '{percent}',
          String(percentOff(permille)),
        ),
      ),
      ...improvementSentences(technology),
      ...unlocks.map(
        (type) => `Unlocks ${pluralsOf([type]).toLowerCase()}. ${siteTerms(type).effect}`,
      ),
    ].join(' '),
    prerequisites,
    leadsTo: TECHNOLOGIES.filter((other) =>
      TECHNOLOGY_DEFINITIONS[other].prerequisites.includes(technology),
    ),
    unlocks,
  };
}

/**
 * What a technology does for the types of site it improves, in sentences the player can be
 * shown. Types improved alike share a sentence: "Trunk roads, ports and shallow ports carry
 * 25% more…".
 */
function improvementSentences(technology: Technology): string[] {
  const improves: Readonly<Partial<Record<SiteType, SiteImprovement>>> =
    balance.technologies[technology].improves;
  const groups = new Map<string, { template: string; percent: number; types: SiteType[] }>();
  const add = (key: string, template: string, percent: number, type: SiteType) => {
    const group = groups.get(key) ?? { template, percent, types: [] };
    group.types.push(type);
    groups.set(key, group);
  };
  for (const type of SITE_TYPES) {
    const improvement = improves[type];
    if (improvement === undefined) continue;
    for (const effect of SITE_EFFECTS) {
      const permille = improvement.effects?.[effect];
      if (permille === undefined) continue;
      const { improved } = SITE_EFFECT_DEFINITIONS[effect];
      add(`${effect} ${String(permille)}`, improved, percentOff(permille), type);
    }
    const { capacityPermille, powerPermille } = improvement;
    if (capacityPermille !== undefined) {
      const percent = Math.round(capacityPermille / 10);
      add(`capacity ${String(capacityPermille)}`, IMPROVEMENT_SENTENCES.capacity, percent, type);
    }
    if (powerPermille !== undefined) {
      const percent = Math.round(powerPermille / 10);
      add(`power ${String(powerPermille)}`, IMPROVEMENT_SENTENCES.power, percent, type);
    }
  }
  return [...groups.values()].map(({ template, percent, types }) =>
    template.replace('{sites}', pluralsOf(types)).replace('{percent}', String(percent)),
  );
}

/** Types of site named together, as a sentence begins with them: "Trunk roads and ports". */
function pluralsOf(types: readonly SiteType[]): string {
  return listed(
    types.map((type, index) => {
      const { plural } = SITE_TYPE_DEFINITIONS[type];
      return index === 0 ? plural : plural.toLowerCase();
    }),
  );
}

/** The name of a technology, as the player reads it: "Drought-resistant seed". */
export function technologyName(technology: Technology): string {
  return TECHNOLOGY_DEFINITIONS[technology].name;
}

/**
 * What a known technology leaves of each thing it bears on, in thousandths: in every region,
 * or across the nation for an effect whose reach is the nation.
 */
export function technologyEffectsOf(
  technology: Technology,
): readonly (readonly [SiteEffect, number])[] {
  const effects: Readonly<Partial<Record<SiteEffect, number>>> =
    balance.technologies[technology].effects;
  return SITE_EFFECTS.flatMap((effect) => {
    const permille = effects[effect];
    return permille === undefined ? [] : [[effect, permille] as const];
  });
}

/** The technology a project researches, or null for a project that researches none. */
export function technologyOf({ target }: Pick<Project, 'target'>): Technology | null {
  return target.kind === 'technology' ? target.technology : null;
}

/** The technologies known, in the order their research finished. */
export function knownTechnologies(projects: readonly Project[]): readonly Technology[] {
  return projects.flatMap((project) => {
    const technology = technologyOf(project);
    return technology !== null && project.status === 'known' ? [technology] : [];
  });
}

/** The research under way, being researched or paused for want of money, if there is any. */
export function researchUnderway(projects: readonly Project[]): Project | null {
  return (
    projects.find((project) => technologyOf(project) !== null && project.status !== 'known') ?? null
  );
}

/**
 * What is wrong with starting research on a technology beside the technologies listed before
 * it, or null when nothing is. One technology is researched at a time, and only once its
 * prerequisites are known.
 */
export function technologyFault(
  projects: readonly Project[],
  technology: Technology,
  alongside: readonly Technology[],
): string | null {
  const name = technologyName(technology);
  const project = projects.find((each) => technologyOf(each) === technology);
  if (project?.status === 'known') return `${name} is already known.`;
  if (project !== undefined) return `${name} is already being researched.`;
  const underway = researchUnderway(projects);
  const busy = underway === null ? null : technologyOf(underway);
  if (busy !== null) {
    return `One technology is researched at a time, and ${technologyName(busy)} is being researched.`;
  }
  const [planned] = alongside;
  if (planned !== undefined) {
    return `One technology is researched at a time, and ${technologyName(planned)} is planned.`;
  }
  const known = knownTechnologies(projects);
  const missing = TECHNOLOGY_DEFINITIONS[technology].prerequisites.filter(
    (needed) => !known.includes(needed),
  );
  if (missing.length > 0) {
    return `${name} needs ${listed(missing.map(technologyName))} to be known first.`;
  }
  return null;
}
