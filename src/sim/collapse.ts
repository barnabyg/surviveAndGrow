import { balance } from './balance';
import { regionName, type Country } from './country';
import type { ReportEntry } from './report';
import type { Outcome, RegionState } from './state';

export type Collapse = Extract<Outcome, { readonly cause: 'famine' }>;

/** The state collapses when famine has held one region for too many quarters running. */
export function collapseOf(country: Country, regions: readonly RegionState[]): Collapse | null {
  const limit = balance.hunger.collapseAfterFamineQuarters;
  const stricken = regions.find((region) => region.famineQuarters >= limit);
  if (stricken === undefined) return null;
  return {
    status: 'lost',
    cause: 'famine',
    regionId: stricken.id,
    headline: 'The state has collapsed',
    summary: `Famine held ${regionName(country, stricken.id)} for ${limit} quarters running. The state has collapsed.`,
  };
}

/** What the turn report says when famine brings the state down. */
export function collapseEntry(outcome: Collapse): ReportEntry {
  return {
    kind: 'collapse',
    seriousness: 'critical',
    headline: outcome.headline,
    cause: outcome.summary,
    regionId: outcome.regionId,
  };
}
