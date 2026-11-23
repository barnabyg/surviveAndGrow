import { percentOff } from './arithmetic';
import { balance, type SiteBalance } from './balance';
import { formatMoney, formatPercent, formatPoints, formatTonnes } from './text';
import { DOLLARS_PER_MONEY, type Money } from './types';
import {
  CHAIN_ROLE_SENTENCES,
  POWER_ROLE_SENTENCES,
  SITE_CHAIN_ROLES,
  SITE_EFFECT_DEFINITIONS,
  SITE_EFFECTS,
  SITE_POWER_ROLES,
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

/**
 * The terms on which a site of one type is built. They are the same wherever it stands, but
 * for what a found deposit's mine produces: its own `capacity`, when it is given one.
 */
export function siteTerms(type: SiteType, capacity?: Money): SiteTerms {
  const { cost, buildQuarters, upkeep } = balance.sites[type];
  return {
    cost,
    buildQuarters,
    upkeep,
    effect: effectOf(type, false, capacity),
    decayingEffect: effectOf(type, true, capacity),
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

/**
 * What a site of one type in use produces or carries in a quarter as part of a chain, or
 * null for a type that plays no part in one. A decaying site has only part of it.
 */
export function capacityOf(type: SiteType, decaying = false, own?: Money): Money | null {
  const { capacity: usual }: SiteBalance = balance.sites[type];
  const capacity = own ?? usual;
  if (capacity === undefined || SITE_CHAIN_ROLES[type] === null) return null;
  return decaying ? weakened(capacity) : capacity;
}

/**
 * What a site produces or carries in a quarter as part of a chain: its type's capacity, or
 * the size a survey revealed for a found deposit's mine (`capacityOf`).
 */
export function siteCapacity(
  site: { readonly type: SiteType; readonly capacity?: Money },
  decaying = false,
): Money | null {
  return capacityOf(site.type, decaying, site.capacity);
}

/**
 * The tonnes of ore a capacity amounts to. Capacities are counted as what their ore is worth
 * at the usual world ore price (`balance.sites`).
 */
export function oreTonnesOf(capacity: Money): number {
  return Math.round((capacity * DOLLARS_PER_MONEY) / balance.trade.goods.ore.usualDollarsPerTonne);
}

/** What power gives a region, in thousandths: of its output, and of infrastructure access. */
export interface PowerGain {
  readonly outputPermille: number;
  readonly infrastructurePermille: number;
}

/**
 * What power gives a region a power line links to a station. While the station or a line
 * of the link decays, it gives only part of it.
 */
export function powerGain(decaying = false): PowerGain {
  const { outputPermille, infrastructurePermille } = balance.power;
  return decaying
    ? {
        outputPermille: weakened(outputPermille),
        infrastructurePermille: weakened(infrastructurePermille),
      }
    : { outputPermille, infrastructurePermille };
}

/** What is left of something a site does while it decays. */
function weakened(permille: number): number {
  return Math.floor((permille * balance.upkeep.decayingEffectPermille) / 1000);
}

/** A site's effects in words, written from the same figures the rules use. */
function effectOf(type: SiteType, decaying: boolean, own?: Money): string {
  const role = SITE_CHAIN_ROLES[type];
  const capacity = capacityOf(type, decaying, own);
  const powerRole = SITE_POWER_ROLES[type];
  const gain = powerGain(decaying);
  return [
    ...siteEffectsOf(type, decaying).map(([effect, permille]) =>
      SITE_EFFECT_DEFINITIONS[effect].sentence.replace('{percent}', String(percentOff(permille))),
    ),
    ...(role === null || capacity === null
      ? []
      : [
          CHAIN_ROLE_SENTENCES[role]
            .replace('{tonnes}', formatTonnes(oreTonnesOf(capacity)))
            .replace('{money}', formatMoney(capacity)),
        ]),
    ...(powerRole === null
      ? []
      : [
          POWER_ROLE_SENTENCES[powerRole]
            .replace('{percent}', formatPercent(gain.outputPermille, 0))
            .replace('{points}', formatPoints(gain.infrastructurePermille)),
        ]),
  ].join(' ');
}
