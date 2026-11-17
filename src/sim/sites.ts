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
  /** What the finished site does, in a sentence the player can be shown. */
  readonly effect: string;
}

/** The terms on which a site of one type is built. They are the same wherever it stands. */
export function siteTerms(type: SiteType): SiteTerms {
  const { cost, buildQuarters } = balance.sites[type];
  return { cost, buildQuarters, effect: effectOf(type) };
}

/** What a site of one type in use leaves of each thing it bears on, in thousandths. */
export function siteEffectsOf(type: SiteType): readonly (readonly [SiteEffect, number])[] {
  const effects: Readonly<Partial<Record<SiteEffect, number>>> = balance.sites[type].effects;
  return SITE_EFFECTS.flatMap((effect) => {
    const permille = effects[effect];
    return permille === undefined ? [] : [[effect, permille] as const];
  });
}

/** A site's effects in words, written from the same figures the rules use. */
function effectOf(type: SiteType): string {
  return siteEffectsOf(type)
    .map(([effect, permille]) =>
      SITE_EFFECT_DEFINITIONS[effect].sentence.replace('{percent}', String(percentOff(permille))),
    )
    .join(' ');
}
