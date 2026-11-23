import { percentOff, sum } from './arithmetic';
import { balance, type SiteBalance, type SiteImprovement } from './balance';
import { formatMoney, formatPercent, formatPoints, formatTonnes, listed } from './text';
import { DOLLARS_PER_MONEY, type Money } from './types';
import {
  CHAIN_ROLE_SENTENCES,
  LASTING_SERVICE_NAMES,
  LASTING_SERVICES,
  POWER_ROLE_SENTENCES,
  SERVICE_SITE_SENTENCE,
  SITE_CHAIN_ROLES,
  SITE_EFFECT_DEFINITIONS,
  SITE_EFFECTS,
  SITE_POWER_ROLES,
  SITE_TYPE_DEFINITIONS,
  SITE_TYPES,
  TECHNOLOGIES,
  TECHNOLOGY_DEFINITIONS,
  type LastingService,
  type SiteEffect,
  type SiteType,
  type Technology,
} from './vocabulary';

/** What it takes to build a site of one type, and what the site then does. */
export interface SiteTerms {
  readonly cost: Money;
  /** How many quarters it takes to build. */
  readonly buildQuarters: number;
  /** What keeping the site in good repair costs each quarter it is in use. */
  readonly upkeep: Money;
  /**
   * What the finished site does, in a sentence the player can be shown. Each figure a known
   * technology improves says what it would be without it.
   */
  readonly effect: string;
  /** What the site does while it is decaying, in the same words. */
  readonly decayingEffect: string;
  /** The technologies known that improve a site of this type, in the order they became known. */
  readonly improvedBy: readonly Technology[];
}

/**
 * The terms on which a site of one type is built. They are the same wherever it stands, but
 * for what a found deposit's mine produces: its own `capacity`, when it is given one. What it
 * does counts the technologies `known` that improve it.
 */
export function siteTerms(
  type: SiteType,
  capacity?: Money,
  known: readonly Technology[] = [],
): SiteTerms {
  const { cost, buildQuarters, upkeep } = balance.sites[type];
  const improvedBy = known.filter((technology) => improves(technology, type));
  const names = improvedBy.map((technology) => TECHNOLOGY_DEFINITIONS[technology].name);
  const compared: Comparison | null =
    improvedBy.length === 0
      ? null
      : {
          known: known.filter((technology) => !improvedBy.includes(technology)),
          note: `without ${listed(names)}`,
        };
  return {
    cost,
    buildQuarters,
    upkeep,
    effect: effectOf(type, false, capacity, known, compared),
    decayingEffect: effectOf(type, true, capacity, known, compared),
    improvedBy,
  };
}

/**
 * What a site would do once a technology is known beside those `known`, in the site's own
 * sentence, with each figure it would move saying what it is without it, in the words of
 * `note`. Null when the technology does not improve the site's type.
 */
export function improvedEffect(
  site: { readonly type: SiteType; readonly capacity?: Money },
  known: readonly Technology[],
  technology: Technology,
  decaying = false,
  note = 'now',
): string | null {
  if (!improves(technology, site.type)) return null;
  return effectOf(site.type, decaying, site.capacity, [...known, technology], { known, note });
}

/**
 * The technologies that must be known before a site can be started, in the tree's order: the
 * one that unlocks its type, if any, and the one the country file says it needs, if any.
 * Until they are known the site is locked.
 */
export function technologiesNeeded(site: {
  readonly type: SiteType;
  readonly needs?: Technology;
}): readonly Technology[] {
  const { unlockedBy } = SITE_TYPE_DEFINITIONS[site.type];
  return TECHNOLOGIES.filter(
    (technology) => technology === unlockedBy || technology === site.needs,
  );
}

/** The types of site that make power. */
const STATION_TYPES = SITE_TYPES.filter((type) => SITE_POWER_ROLES[type] === 'station');

/**
 * Whether a technology improves what a site of one type does: the site itself, or, for a power
 * line, the power it brings from a station.
 */
export function improves(technology: Technology, type: SiteType): boolean {
  if (improvementsOf(type, [technology]).length > 0) return true;
  return (
    SITE_POWER_ROLES[type] === 'line' &&
    STATION_TYPES.some((station) =>
      improvementsOf(station, [technology]).some(([, each]) => (each.powerPermille ?? 0) > 0),
    )
  );
}

/**
 * The technologies among those known that improve a type of site, each with what it does for
 * it, in the order they became known.
 */
export function improvementsOf(
  type: SiteType,
  known: readonly Technology[],
): readonly (readonly [Technology, SiteImprovement])[] {
  return known.flatMap((technology) => {
    const improves: Readonly<Partial<Record<SiteType, SiteImprovement>>> =
      balance.technologies[technology].improves;
    const improvement = improves[type];
    return improvement === undefined ? [] : [[technology, improvement] as const];
  });
}

/**
 * What a site of one type in use leaves of each thing it bears on, in thousandths, with the
 * technologies `known` that improve it. A decaying site does only part of what it does in good
 * repair.
 */
export function siteEffectsOf(
  type: SiteType,
  decaying = false,
  known: readonly Technology[] = [],
): readonly (readonly [SiteEffect, number])[] {
  const effects: Readonly<Partial<Record<SiteEffect, number>>> = balance.sites[type].effects;
  const improvements = improvementsOf(type, known);
  return SITE_EFFECTS.flatMap((effect) => {
    const own = effects[effect];
    if (own === undefined) return [];
    const permille = improvements.reduce(
      (left, [, improvement]) =>
        Math.floor((left * (improvement.effects?.[effect] ?? 1000)) / 1000),
      own,
    );
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
 * What a site of one type in use adds to where its region's level of a lasting service
 * settles, in thousandths, on top of what spending holds. A decaying site adds only part of it.
 */
export function serviceOf(type: SiteType, service: LastingService, decaying = false): number {
  const { services }: SiteBalance = balance.sites[type];
  const permille = services?.[service] ?? 0;
  return decaying ? weakened(permille) : permille;
}

/**
 * What a site of one type in use produces or carries in a quarter as part of a chain, or
 * null for a type that plays no part in one: its own capacity, when it is given one, or its
 * type's, raised by the technologies `known` that improve it. A decaying site has only part
 * of it.
 */
export function capacityOf(
  type: SiteType,
  decaying = false,
  own?: Money,
  known: readonly Technology[] = [],
): Money | null {
  const { capacity: usual }: SiteBalance = balance.sites[type];
  const base = own ?? usual;
  if (base === undefined || SITE_CHAIN_ROLES[type] === null) return null;
  const capacity = raised(
    base,
    improvementsOf(type, known).map(([, improvement]) => improvement.capacityPermille ?? 0),
  );
  return decaying ? weakened(capacity) : capacity;
}

/**
 * What a site produces or carries in a quarter as part of a chain: its type's capacity, or
 * the size a survey revealed for a found deposit's mine, with the technologies `known` that
 * improve it (`capacityOf`).
 */
export function siteCapacity(
  site: { readonly type: SiteType; readonly capacity?: Money },
  decaying = false,
  known: readonly Technology[] = [],
): Money | null {
  return capacityOf(site.type, decaying, site.capacity, known);
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
 * What power gives a region a power line links to a station of the type given, or to the
 * station that gives most when none is, raised by the technologies `known` that improve it.
 * While the station or a line of the link decays, it gives only part of it.
 */
export function powerGain(
  decaying = false,
  known: readonly Technology[] = [],
  station?: SiteType,
): PowerGain {
  const addedBy = (type: SiteType) =>
    sum(improvementsOf(type, known).map(([, improvement]) => improvement.powerPermille ?? 0));
  const added = [
    station === undefined ? Math.max(...STATION_TYPES.map(addedBy)) : addedBy(station),
  ];
  const outputPermille = raised(balance.power.outputPermille, added);
  const infrastructurePermille = raised(balance.power.infrastructurePermille, added);
  return decaying
    ? {
        outputPermille: weakened(outputPermille),
        infrastructurePermille: weakened(infrastructurePermille),
      }
    : { outputPermille, infrastructurePermille };
}

/** A figure raised by each of the shares given, in thousandths of it, rounded down. */
function raised(figure: number, permilles: readonly number[]): number {
  return Math.floor((figure * (1000 + sum(permilles))) / 1000);
}

/** What is left of something a site does while it decays. */
function weakened(permille: number): number {
  return Math.floor((permille * balance.upkeep.decayingEffectPermille) / 1000);
}

/**
 * What a site's figures are set beside: the technologies known in the comparison, and the
 * words that say so, as in "900,000 t (720,000 t without Road engineering)".
 */
interface Comparison {
  readonly known: readonly Technology[];
  readonly note: string;
}

/**
 * A site's effects in words, written from the same figures the rules use, with the
 * technologies `known`. Where a comparison is given, each figure that differs there says what
 * it is there.
 */
function effectOf(
  type: SiteType,
  decaying: boolean,
  own: Money | undefined,
  known: readonly Technology[],
  compared: Comparison | null,
): string {
  const before = compared?.known ?? known;
  const figure = (after: string, then: string) =>
    compared === null || after === then ? after : `${after} (${then} ${compared.note})`;
  const role = SITE_CHAIN_ROLES[type];
  const capacity = capacityOf(type, decaying, own, known);
  const capacityThen = capacityOf(type, decaying, own, before) ?? 0;
  const powerRole = SITE_POWER_ROLES[type];
  const station = powerRole === 'station' ? type : undefined;
  const gain = powerGain(decaying, known, station);
  const gainThen = powerGain(decaying, before, station);
  const effectsThen = new Map(siteEffectsOf(type, decaying, before));
  return [
    ...siteEffectsOf(type, decaying, known).map(([effect, permille]) =>
      SITE_EFFECT_DEFINITIONS[effect].sentence.replace(
        '{percent}%',
        figure(`${percentOff(permille)}%`, `${percentOff(effectsThen.get(effect) ?? permille)}%`),
      ),
    ),
    ...(role === null || capacity === null
      ? []
      : [
          CHAIN_ROLE_SENTENCES[role]
            .replace(
              '{tonnes}',
              figure(formatTonnes(oreTonnesOf(capacity)), formatTonnes(oreTonnesOf(capacityThen))),
            )
            .replace('{money}', figure(formatMoney(capacity), formatMoney(capacityThen))),
        ]),
    ...(powerRole === null
      ? []
      : [
          POWER_ROLE_SENTENCES[powerRole]
            .replace(
              '{percent}',
              figure(
                formatPercent(gain.outputPermille, 0),
                formatPercent(gainThen.outputPermille, 0),
              ),
            )
            .replace(
              '{points}',
              figure(
                formatPoints(gain.infrastructurePermille),
                formatPoints(gainThen.infrastructurePermille),
              ),
            ),
        ]),
    // What a site does for a lasting service no technology improves, so nothing is compared.
    ...LASTING_SERVICES.flatMap((service) => {
      const permille = serviceOf(type, service, decaying);
      return permille === 0
        ? []
        : [
            SERVICE_SITE_SENTENCE.replaceAll('{service}', LASTING_SERVICE_NAMES[service]).replace(
              '{points}',
              formatPoints(permille),
            ),
          ];
    }),
  ].join(' ');
}
