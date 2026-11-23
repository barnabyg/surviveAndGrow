import type { Deposit, Site } from './country';
import type { Reader } from './countryReader';
import {
  SITE_CHAIN_ROLES,
  SITE_POWER_ROLES,
  SITE_TYPE_NAMES,
  SITE_TYPES,
  type SiteType,
} from './vocabulary';

/** A site, and where it is written in the country file: "sites[3]". */
export interface PlacedSite {
  readonly site: Site;
  readonly path: string;
}

/**
 * Each site a site depends on must be another site the country has, and no chain of
 * dependencies may lead back to where it started. A source must lead to an outlet, and a
 * power line to a power station. The sites are the country's and its deposits', each with
 * where it is written.
 */
export function checkDependencies(reader: Reader, placed: readonly PlacedSite[]): void {
  const sites = placed.map(({ site }) => site);
  const pathOf = (site: Site) => placed.find((each) => each.site === site)?.path ?? site.id;
  const byId = new Map(sites.map((site) => [site.id, site]));
  sites.forEach((site) => {
    site.dependsOn.forEach((id, place) => {
      const path = `${pathOf(site)}.dependsOn[${place}]`;
      if (id === site.id) reader.fault(path, `is "${id}": a site cannot depend on itself`);
      else if (!byId.has(id)) reader.fault(path, `is "${id}", which is not the id of a site`);
      else if (site.alternatives.includes(id)) {
        reader.fault(
          path,
          `is "${id}", one of its alternatives: a site cannot depend on a site it rules out`,
        );
      }
    });
  });
  // A site depended on stands for whichever of its alternatives is chosen.
  const choices = (id: string): Site[] => {
    const site = byId.get(id);
    if (site === undefined) return [];
    return [site, ...site.alternatives.flatMap((other) => byId.get(other) ?? [])];
  };

  // A depth-first walk; a site met again while its own dependencies are open is a cycle.
  const done = new Set<string>();
  const reported = new Set<string>();
  const walk = (site: Site, trail: readonly string[]): void => {
    if (done.has(site.id)) return;
    const loopsAt = trail.indexOf(site.id);
    if (loopsAt >= 0) {
      const cycle = [...trail.slice(loopsAt), site.id];
      const key = [...cycle.slice(0, -1)].sort().join(' ');
      if (!reported.has(key)) {
        reported.add(key);
        reader.fault(
          `${pathOf(site)}.dependsOn`,
          `goes round in a circle: ${cycle.map((id) => `"${id}"`).join(' depends on ')}`,
        );
      }
      return;
    }
    for (const next of site.dependsOn.flatMap(choices)) {
      if (next !== site) walk(next, [...trail, site.id]);
    }
    done.add(site.id);
  };
  for (const site of sites) walk(site, []);

  // A source earns only through a chain that reaches an outlet, so it must lead to one.
  const outlets = SITE_TYPES.filter((type) => SITE_CHAIN_ROLES[type] === 'outlet');
  const outletNames = outlets.map((type) => SITE_TYPE_NAMES[type].toLowerCase()).join(' or ');
  const reaches = (site: Site, seen: ReadonlySet<string>): boolean =>
    site.dependsOn.some((id) => {
      const nexts = choices(id);
      // Whichever alternative is chosen, the chain must still reach an outlet.
      return (
        nexts.length > 0 &&
        nexts.every(
          (next) =>
            outlets.includes(next.type) ||
            (!seen.has(next.id) && reaches(next, new Set([...seen, next.id]))),
        )
      );
    });
  sites.forEach((site) => {
    if (SITE_CHAIN_ROLES[site.type] !== 'source' || reaches(site, new Set([site.id]))) return;
    reader.fault(
      `${pathOf(site)}.dependsOn`,
      `must lead, directly or through other sites, to a ${outletNames}: a ${SITE_TYPE_NAMES[site.type].toLowerCase()} earns only through a chain that reaches one`,
    );
  });

  // A power line carries power only from a station, so it must lead to one through lines.
  const stationNames = SITE_TYPES.filter((type) => SITE_POWER_ROLES[type] === 'station')
    .map((type) => SITE_TYPE_NAMES[type].toLowerCase())
    .join(' or ');
  const powers = (site: Site, seen: ReadonlySet<string>): boolean =>
    site.dependsOn.some((id) => {
      const nexts = choices(id);
      return (
        nexts.length > 0 &&
        nexts.every(
          (next) =>
            SITE_POWER_ROLES[next.type] === 'station' ||
            (SITE_POWER_ROLES[next.type] === 'line' &&
              !seen.has(next.id) &&
              powers(next, new Set([...seen, next.id]))),
        )
      );
    });
  sites.forEach((site) => {
    if (SITE_POWER_ROLES[site.type] !== 'line' || powers(site, new Set([site.id]))) return;
    const name = SITE_TYPE_NAMES[site.type].toLowerCase();
    reader.fault(
      `${pathOf(site)}.dependsOn`,
      `must lead, directly or through other ${name}s, to a ${stationNames}: a ${name} carries power only from one`,
    );
  });
}

/**
 * A deposit's sites are hidden until a survey finds them, so none of the country's sites may
 * depend on one or name one as an alternative, and a deposit's site may depend only on the
 * country's sites and the other site of its own deposit.
 */
export function checkDeposits(
  reader: Reader,
  sites: readonly Site[],
  deposits: readonly Deposit[],
): void {
  const owner = new Map<string, number>();
  deposits.forEach((deposit, index) => {
    for (const site of [deposit.mine, deposit.route]) {
      if (site.id !== '') owner.set(site.id, index);
    }
  });
  const hidden = (id: string) =>
    `is "${id}", a deposit’s site, which is hidden until a survey finds it`;
  sites.forEach((site, index) => {
    for (const key of ['dependsOn', 'alternatives'] as const) {
      site[key].forEach((id, place) => {
        if (owner.has(id)) reader.fault(`sites[${index}].${key}[${place}]`, hidden(id));
      });
    }
  });
  deposits.forEach((deposit, index) => {
    for (const [site, part] of [
      [deposit.mine, 'mine'],
      [deposit.route, 'route'],
    ] as const) {
      site.dependsOn.forEach((id, place) => {
        const from = owner.get(id);
        if (from !== undefined && from !== index) {
          reader.fault(
            `deposits[${index}].${part}.dependsOn[${place}]`,
            `is "${id}", a site of another deposit: a deposit’s site may depend only on the country’s sites and its own deposit’s`,
          );
        }
      });
    }
  });
}

/**
 * Each alternative a site lists must be another site the country has, playing the same part
 * in a chain and in bringing power, so that whichever is chosen a chain or a power line
 * through it still works. Returns the sites
 * with their alternatives said on both sides: if one rules out another, each rules out the other.
 */
export function checkAlternatives(reader: Reader, sites: readonly Site[]): Site[] {
  const byId = new Map(sites.map((site) => [site.id, site]));
  sites.forEach((site, index) => {
    site.alternatives.forEach((id, place) => {
      const path = `sites[${index}].alternatives[${place}]`;
      const other = byId.get(id);
      if (id === site.id) {
        reader.fault(path, `is "${id}": a site cannot be an alternative to itself`);
      } else if (other === undefined) {
        reader.fault(path, `is "${id}", which is not the id of a site`);
      } else if (
        SITE_CHAIN_ROLES[other.type] !== SITE_CHAIN_ROLES[site.type] ||
        SITE_POWER_ROLES[other.type] !== SITE_POWER_ROLES[site.type]
      ) {
        const name = (type: SiteType) => SITE_TYPE_NAMES[type].toLowerCase();
        const part =
          SITE_CHAIN_ROLES[other.type] === SITE_CHAIN_ROLES[site.type]
            ? 'in bringing power'
            : 'in a chain';
        reader.fault(
          path,
          `is "${id}", a ${name(other.type)}, but a ${name(site.type)} can only be an alternative to a site that plays the same part ${part}`,
        );
      }
    });
  });
  return sites.map((site) => ({
    ...site,
    alternatives: sites
      .filter(
        (other) =>
          other !== site &&
          (site.alternatives.includes(other.id) || other.alternatives.includes(site.id)),
      )
      .map((other) => other.id),
  }));
}
