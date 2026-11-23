/**
 * Reads the deposits a country file hides for surveys to find, and checks each: its region, its
 * likelihood, its range of sizes, its mine and its route.
 */

import { balance } from './balance';
import { DEPOSIT_FORMAT } from './countryFormats';
import { isRecord, join, wrongKind, type Json, type Reader } from './countryReader';
import { readSite } from './countrySites';
import type { Deposit, Region } from './countryTypes';
import { formatTonnes } from './text';
import type { Range } from './types';
import { SITE_CHAIN_ROLES, SITE_TYPE_NAMES, SITE_TYPES } from './vocabulary';

/**
 * The deposits a file of format 8 or later hides in `deposits`, at most one in a region. Each
 * names its region, how likely it is to be there, the range of its size in tonnes of ore a
 * quarter, its mine, which stands in its region and depends on its route, and its route, a
 * trunk road. Their sites share the country's ids and names, and neither may name
 * alternatives. What their sites may depend on is checked with the rest (`checkDeposits`).
 */
export function readDeposits(
  reader: Reader,
  file: Json,
  formatVersion: number,
  regions: readonly Region[],
  siteIds: Map<string, string>,
  siteNames: Map<string, string>,
): Deposit[] {
  if (file.deposits === undefined) return [];
  if (formatVersion < DEPOSIT_FORMAT) {
    reader.fault('deposits', `needs country file format ${DEPOSIT_FORMAT} or later`);
    return [];
  }
  const ids = new Map<string, string>();
  const held = new Map<string, string>();
  return reader.list(file, 'deposits', '', (item, path): Deposit => {
    const id = reader.unique(item, 'id', path, ids);
    const regionId = reader.text(item, 'region', path);
    if (regionId !== '') {
      const earlier = held.get(regionId);
      if (!regions.some((region) => region.id === regionId)) {
        reader.fault(join(path, 'region'), `is "${regionId}", which is not the id of a region`);
      } else if (earlier !== undefined) {
        reader.fault(
          join(path, 'region'),
          `is "${regionId}", which already holds ${earlier}: a region holds at most one deposit`,
        );
      } else {
        held.set(regionId, path);
      }
    }
    const likelihood = readLikelihood(reader, item, path);
    const tonnes = readTonnes(reader, item, path);

    const minePath = join(path, 'mine');
    const mineFile = reader.object(item, 'mine', path);
    if (mineFile.region !== undefined) {
      reader.fault(
        join(minePath, 'region'),
        'must be left out: a deposit’s mine stands in the deposit’s region',
      );
    }
    const mine = readSite(
      reader,
      mineFile,
      minePath,
      regions,
      siteIds,
      siteNames,
      formatVersion,
      regionId,
    );
    const routePath = join(path, 'route');
    const routeFile = reader.object(item, 'route', path);
    const route = readSite(
      reader,
      routeFile,
      routePath,
      regions,
      siteIds,
      siteNames,
      formatVersion,
    );
    const parts = [
      { site: mine, written: mineFile, at: minePath, role: 'source', part: 'mine' },
      { site: route, written: routeFile, at: routePath, role: 'link', part: 'route' },
    ] as const;
    for (const { site, written, at, role, part } of parts) {
      const known = SITE_TYPES.some((type) => type === written.type);
      if (known && SITE_CHAIN_ROLES[site.type] !== role) {
        reader.fault(
          join(at, 'type'),
          `is "${site.type}", but a deposit’s ${part} must be a ${typeNamesOf(role)}`,
        );
      }
      if (written.alternatives !== undefined) {
        reader.fault(
          join(at, 'alternatives'),
          'must be left out: a deposit’s site has no alternatives',
        );
      }
    }
    if (route.id !== '' && !mine.dependsOn.includes(route.id)) {
      reader.fault(
        join(minePath, 'dependsOn'),
        `must include "${route.id}", the deposit’s route: its ore leaves along it`,
      );
    }
    return {
      id,
      regionId,
      likelihood,
      tonnes,
      mine: { ...mine, alternatives: [] },
      route: { ...route, alternatives: [] },
    };
  });
}

/** The names of the types of site that play one part in a chain: "trunk road". */
function typeNamesOf(role: 'source' | 'link'): string {
  return SITE_TYPES.filter((type) => SITE_CHAIN_ROLES[type] === role)
    .map((type) => SITE_TYPE_NAMES[type].toLowerCase())
    .join(' or ');
}

/** How likely a deposit is to be there: a chance above 0, since one never there is no deposit. */
function readLikelihood(reader: Reader, deposit: Json, path: string): number {
  const before = reader.faults.length;
  const chance = reader.number(deposit, 'likelihood', path);
  if (reader.faults.length > before) return 0;
  if (chance <= 0 || chance > 1) {
    reader.fault(
      join(path, 'likelihood'),
      `is ${chance}, but must be a chance above 0 and at most 1`,
    );
    return 0;
  }
  return chance;
}

/**
 * The range of a deposit's size, in tonnes of ore a quarter: each end a whole number of
 * `balance.surveys.tonnesStep` from one step to `mostTonnes`, the least first.
 */
function readTonnes(reader: Reader, deposit: Json, path: string): Range {
  const { tonnesStep: step, mostTonnes } = balance.surveys;
  const rangePath = join(path, 'tonnes');
  if (!isRecord(deposit.tonnes)) {
    reader.fault(rangePath, wrongKind(deposit.tonnes, 'an object with a min and a max'));
    return { min: step, max: step };
  }
  const written = deposit.tonnes;
  const end = (key: 'min' | 'max'): number | null => {
    const before = reader.faults.length;
    const tonnes = reader.number(written, key, rangePath);
    if (reader.faults.length > before) return null;
    if (!Number.isInteger(tonnes / step) || tonnes < step || tonnes > mostTonnes) {
      reader.fault(
        join(rangePath, key),
        `is ${tonnes}, but must be a whole number of ${formatTonnes(step)} from ${formatTonnes(step)} to ${formatTonnes(mostTonnes)}`,
      );
      return null;
    }
    return tonnes;
  };
  const min = end('min');
  const max = end('max');
  if (min !== null && max !== null && min > max) {
    reader.fault(
      rangePath,
      `runs from ${formatTonnes(min)} down to ${formatTonnes(max)}, but its min must be no more than its max`,
    );
    return { min, max: min };
  }
  return { min: min ?? step, max: max ?? min ?? step };
}
