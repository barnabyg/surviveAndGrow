import { percentOff } from './arithmetic';
import { balance } from './balance';
import type { Money } from './types';
import type { SiteType } from './vocabulary';

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

/** A site's effect in words, written from the same figures the rules use. */
function effectOf(type: SiteType): string {
  const { sites } = balance;
  switch (type) {
    case 'irrigation':
      return `Weather and drought move its region’s harvest ${percentOff(sites.irrigation.weatherPermille)}% less.`;
    case 'farmRoad':
      return `${percentOff(sites.farmRoad.transportLossPermille)}% less of its region’s surplus is lost on the way to the national reserve.`;
    case 'grainStore':
      return `${percentOff(sites.grainStore.spoilagePermille)}% less of the national reserve spoils each quarter.`;
  }
}
