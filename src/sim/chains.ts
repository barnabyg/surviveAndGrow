import { balance } from './balance';
import type { Country, Site } from './country';
import { siteStatus, type Project } from './projects';
import { capacityOf } from './sites';
import { costOf, priceOf, type WorldPrices } from './trade';
import type { Money } from './types';
import { inUse } from './upkeep';
import { SITE_CHAIN_ROLES, type SiteState } from './vocabulary';

interface Building {
  readonly country: Country;
  readonly projects: readonly Project[];
  /** The world prices now: what the ore a chain ships is worth. */
  readonly worldPrices: WorldPrices;
}

/**
 * The tonnes of ore a capacity amounts to. Capacities are counted as what their ore is worth
 * at the usual world ore price (`balance.sites`).
 */
export function oreTonnesOf(capacity: Money): number {
  return Math.round((capacity * 100_000) / balance.trade.goods.ore.usualDollarsPerTonne);
}

/** One site of a chain, as it stands. */
export interface ChainLink {
  readonly siteId: string;
  readonly state: SiteState;
  /**
   * What the site can produce or carry this quarter: its capacity in good repair, part of it
   * while it decays, and nothing until it is built. A site of a type that plays no part in
   * chains is null: it must be in use for the chain to be complete, but it limits nothing.
   */
  readonly carries: Money | null;
}

/**
 * A source of output, such as a mine, and every site it depends on, directly or through
 * others: the chain its output must travel to reach an outlet. The source earns only while
 * every site it depends on is in use, and then no more than the weakest of them carries.
 */
export interface Chain {
  /** The site that produces the chain's output. */
  readonly sourceId: string;
  /** The source and then every site it depends on, each once, in the order the chain runs. */
  readonly links: readonly ChainLink[];
  /** The sites the source depends on that are not in use, in the same order. */
  readonly missing: readonly string[];
  /** Whether every site the source depends on is in use. */
  readonly complete: boolean;
  /**
   * The ore the chain ships abroad this quarter, in tonnes. It is nothing unless the source is
   * in use and the chain complete, and then what its weakest link carries.
   */
  readonly shipped: number;
  /** The world ore price the ore is sold at this quarter, in dollars a tonne. */
  readonly orePrice: number;
  /**
   * What the chain adds to its source's region's output this quarter: the ore it ships at the
   * world ore price.
   */
  readonly output: Money;
  /**
   * What the ore it ships would earn at the usual world ore price. The difference from
   * `output` is the world ore price's effect.
   */
  readonly atUsualPrice: Money;
  /**
   * The link that holds the chain back: the first missing one while it is incomplete, the
   * source while it is not in use, and otherwise the one that carries least (the first of
   * equals). Null only for a chain with nothing in it that limits it.
   */
  readonly bottleneck: string | null;
}

/** The chain of a site that is a source, or null for a site of any other type. */
export function chainOf(building: Building, siteId: string): Chain | null {
  const source = building.country.sites.find((site) => site.id === siteId);
  if (source === undefined || SITE_CHAIN_ROLES[source.type] !== 'source') return null;
  const links = sitesOf(building, source).map((site) => linkOf(building, site));
  const [own, ...dependencies] = links;
  const missing = dependencies
    .filter((link) => link.state !== 'operating' && link.state !== 'decaying')
    .map((link) => link.siteId);
  const complete = missing.length === 0;
  const working = complete && own !== undefined && own.carries !== null && own.carries > 0;
  const limiting = links.filter(
    (link): link is ChainLink & { carries: Money } => link.carries !== null,
  );
  const weakest = limiting.reduce<(ChainLink & { carries: Money }) | null>(
    (least, link) => (least === null || link.carries < least.carries ? link : least),
    null,
  );
  const shipped = oreTonnesOf(working ? (weakest?.carries ?? 0) : 0);
  const orePrice = priceOf(building.worldPrices, 'ore');
  return {
    sourceId: source.id,
    links,
    missing,
    complete,
    shipped,
    orePrice,
    output: costOf(shipped, orePrice),
    atUsualPrice: costOf(shipped, balance.trade.goods.ore.usualDollarsPerTonne),
    bottleneck: !complete ? (missing[0] ?? null) : !working ? source.id : (weakest?.siteId ?? null),
  };
}

/** The chains a site is part of, as their source or as a site one depends on. */
export function chainsThrough(building: Building, siteId: string): Chain[] {
  return chains(building).filter((chain) => chain.links.some((link) => link.siteId === siteId));
}

/** Every chain in the country, one for each source, in the country file's order. */
export function chains(building: Building): Chain[] {
  return building.country.sites.flatMap((site) => {
    const chain = chainOf(building, site.id);
    return chain === null ? [] : [chain];
  });
}

/** What a source in use earns this quarter, with the site it stands on. */
export interface ChainEarning {
  readonly site: Site;
  /** What it earns at the world ore price. */
  readonly output: Money;
  /** What it would earn at the usual world ore price. */
  readonly atUsualPrice: Money;
  /** The world ore price, in dollars a tonne. */
  readonly orePrice: number;
}

/** The sources that ship ore this quarter, in the country file's order. */
export function chainEarnings(building: Building): ChainEarning[] {
  return chains(building).flatMap((chain) => {
    const site = building.country.sites.find((candidate) => candidate.id === chain.sourceId);
    if (site === undefined || chain.shipped === 0) return [];
    const { output, atUsualPrice, orePrice } = chain;
    return [{ site, output, atUsualPrice, orePrice }];
  });
}

/**
 * A source's earnings as a breakdown lists them: what its ore would earn at the usual price,
 * under the label given, and beside it, while the price is not at its usual level, the world
 * ore price's effect: "Korrgate mine: ore at $85 a tonne".
 */
export function earningLines(
  label: string,
  earning: Pick<ChainEarning, 'output' | 'atUsualPrice' | 'orePrice'>,
  value: (output: Money) => Money = (output) => output,
): { readonly label: string; readonly amount: Money }[] {
  const usual = value(earning.atUsualPrice);
  const effect = value(earning.output) - usual;
  return [
    { label, amount: usual },
    ...(effect === 0
      ? []
      : [{ label: `${label}: ore at $${earning.orePrice} a tonne`, amount: effect }]),
  ];
}

/**
 * A source and every site it depends on, each once, walking each list of dependencies in
 * order. A site depended on that has alternatives stands for whichever of them has been
 * started, or for itself while none has.
 */
function sitesOf(building: Building, source: Site): Site[] {
  const found: Site[] = [];
  const byId = (id: string) => building.country.sites.find((candidate) => candidate.id === id);
  const walk = (site: Site): void => {
    if (found.includes(site)) return;
    found.push(site);
    for (const id of site.dependsOn) {
      // A site closed by one of its alternatives stands for the one started in its place.
      const next = byId(siteStatus(building, id).closedBy ?? id);
      if (next !== undefined) walk(next);
    }
  };
  walk(source);
  return found;
}

function linkOf(building: Building, site: Site): ChainLink {
  const project = building.projects.find((candidate) => candidate.siteId === site.id);
  const { state } = siteStatus(building, site.id);
  const capacity = capacityOf(site.type, state === 'decaying');
  return {
    siteId: site.id,
    state,
    carries: capacity === null ? null : project !== undefined && inUse(project) ? capacity : 0,
  };
}
