import { percentOff } from './arithmetic';
import { balance } from './balance';
import type { Money } from './types';
import {
  SITE_EFFECT_DEFINITIONS,
  SITE_EFFECTS,
  type SiteEffect,
  type SiteType,
} from './vocabulary';

/** What it takes to build a site of one type, and what the site then does. */
export interface SiteTerms {
  readonly cost: Money;
  /** How many quarters it takes to build. */
  readonly buildQuarters: number;
  /** What keeping the site in good repair costs each quarter it is in use. */
  readonly upkeep: Money;
  /** What the finished site does, in a sentence the player can be shown. */
  readonly effect: string;
  /** What the site does while it is decaying, in the same words. */
  readonly decayingEffect: string;
}

/** The terms on which a site of one type is built. They are the same wherever it stands. */
export function siteTerms(type: SiteType): SiteTerms {
  const { cost, buildQuarters, upkeep } = balance.sites[type];
  return {
    cost,
    buildQuarters,
    upkeep,
    effect: effectOf(type, false),
    decayingEffect: effectOf(type, true),
  };
}

/**
 * What a site of one type in use leaves of each thing it bears on, in thousandths. A
 * decaying site does only part of what it does in good repair.
 */
export function siteEffectsOf(
  type: SiteType,
  decaying = false,
): readonly (readonly [SiteEffect, number])[] {
  const effects: Readonly<Partial<Record<SiteEffect, number>>> = balance.sites[type].effects;
  return SITE_EFFECTS.flatMap((effect) => {
    const permille = effects[effect];
    if (permille === undefined) return [];
    return [[effect, decaying ? 1000 - weakened(1000 - permille) : permille] as const];
  });
}

/**
 * What a site of one type in use adds to its region's infrastructure access, in thousandths
 * of the whole. A decaying site adds only part of it.
 */
export function infrastructureOf(type: SiteType, decaying = false): number {
  const permille = balance.sites[type].infrastructurePermille;
  return decaying ? weakened(permille) : permille;
}

/** What is left of something a site does while it decays. */
function weakened(permille: number): number {
  return Math.floor((permille * balance.upkeep.decayingEffectPermille) / 1000);
}

/** A site's effects in words, written from the same figures the rules use. */
function effectOf(type: SiteType, decaying: boolean): string {
  return siteEffectsOf(type, decaying)
    .map(([effect, permille]) =>
      SITE_EFFECT_DEFINITIONS[effect].sentence.replace('{percent}', String(percentOff(permille))),
    )
    .join(' ');
}
