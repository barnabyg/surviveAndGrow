import { sum } from './arithmetic';
import { chains } from './chains';
import type { Country } from './country';
import type { Project } from './projects';
import { capacityOf, oreTonnesOf } from './sites';
import { formatTonnes } from './text';
import type { TradeOrder, WorldPrices } from './trade';
import { inUse } from './upkeep';
import { SITE_CHAIN_ROLES, type SiteType } from './vocabulary';

interface Trading {
  readonly country: Country;
  readonly projects: readonly Project[];
  readonly worldPrices: WorldPrices;
}

/**
 * Something that carries goods across the border: a border crossing, named in the country
 * file and open from the start, or a port in use.
 */
export interface TradeLink {
  /** The crossing's id, or the port's site id. */
  readonly id: string;
  readonly name: string;
  readonly kind: 'crossing' | 'port';
  /** What it carries across the border this quarter, in tonnes. */
  readonly tonnes: number;
  /** Whether it is a port that decays, and so carries only part of what it does in good repair. */
  readonly decaying: boolean;
}

/**
 * What the trade links carry across the border this quarter, and how it is shared: the ore
 * the mines' chains ship takes its share first, and grain bought or sold abroad is limited to
 * what is left.
 */
export interface TradeCapacity {
  /** The crossings in the country file's order, then the ports in use in the same order. */
  readonly links: readonly TradeLink[];
  /** What the links carry between them, in tonnes. */
  readonly total: number;
  /** The ore the mines' chains ship, in tonnes: no more than the whole. */
  readonly ore: number;
  /** The grain ordered, in tonnes. */
  readonly grain: number;
  /** What is left once the ore and the grain ordered have their share, in tonnes. */
  readonly free: number;
}

/**
 * The trade links this quarter and what they carry, with the ore the mines ship and the grain
 * in the orders given. A port is counted while it is in use, and carries what it ships for a
 * chain: half while it decays.
 */
export function tradeCapacity(game: Trading, orders: readonly TradeOrder[] = []): TradeCapacity {
  const crossings = game.country.crossings.map((crossing): TradeLink => ({
    id: crossing.id,
    name: crossing.name,
    kind: 'crossing',
    tonnes: crossing.tonnes,
    decaying: false,
  }));
  const ports = game.country.sites.flatMap((site): TradeLink[] => {
    const project = game.projects.find((candidate) => candidate.siteId === site.id);
    if (SITE_CHAIN_ROLES[site.type] !== 'outlet' || project === undefined || !inUse(project)) {
      return [];
    }
    const decaying = project.status === 'decaying';
    const tonnes = portTonnesOf(site.type, decaying);
    return [{ id: site.id, name: site.name, kind: 'port', tonnes, decaying }];
  });
  const links = [...crossings, ...ports];
  const total = sum(links.map((link) => link.tonnes));
  const ore = Math.min(total, sum(chains(game).map((chain) => chain.shipped)));
  const grain = sum(orders.map((order) => order.tonnes));
  return { links, total, ore, grain, free: total - ore - grain };
}

/**
 * What a port of one type carries across the border in a quarter while in use, in tonnes: what
 * it ships for a chain, and half of it while it decays. Nothing for a site that is not a port.
 */
export function portTonnesOf(type: SiteType, decaying = false): number {
  if (SITE_CHAIN_ROLES[type] !== 'outlet') return 0;
  return oreTonnesOf(capacityOf(type, decaying) ?? 0);
}

/**
 * Why the grain in the orders cannot cross the border this quarter, or null when the trade
 * links have room for it.
 */
export function capacityFault(game: Trading, orders: readonly TradeOrder[]): string | null {
  const { total, ore, grain, free } = tradeCapacity(game, orders);
  if (free >= 0) return null;
  const share = ore > 0 ? `, ${formatTonnes(ore)} of it the mines’ ore` : '';
  return `The trade links carry ${formatTonnes(total)} a quarter${share}, so no more than ${formatTonnes(total - ore)} of grain can cross the border, but ${formatTonnes(grain)} would.`;
}
