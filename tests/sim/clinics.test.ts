import { describe, expect, it } from 'vitest';
import tavaraFile from '../../src/countries/tavara.json';
import {
  advanceQuarter,
  balance,
  createGame,
  knownTechnologies,
  livingStandards,
  loadCountry,
  loadSave,
  onSite,
  previewQuarter,
  risksAhead,
  saveGame,
  serviceLevels,
  siteStatus,
  siteTerms,
  startFault,
  technologyGains,
  technologyTerms,
  TECHNOLOGY_DEFINITIONS,
  type Country,
  type GameState,
  type LastingService,
  type Site,
  type SiteType,
  type Technology,
} from '../../src/sim';
import testlandFile from '../countries/testland.json';
import { testlandFormat9File, withChances } from './countries';
import { faultsOf, withValue } from './files';
import { knowing, steward } from './playing';

/** A country with a treasury that pays for anything, and no drought, flood or dilemma. */
function rich(file: unknown): Country {
  const copy = structuredClone(file) as { start: { treasury: number } };
  copy.start.treasury = 5000;
  return withChances(copy, {});
}

/** The two types of site that serve a region's people, each with the service it raises. */
const SERVICE_SITES = [
  { type: 'clinic', service: 'health', technology: 'publicHealth' },
  { type: 'school', service: 'education', technology: 'teacherTraining' },
] as const satisfies readonly {
  type: SiteType;
  service: LastingService;
  technology: Technology;
}[];

/** What a site of one type adds to where its region's level of a service settles. */
function pointsOf(type: (typeof SERVICE_SITES)[number]['type'], service: LastingService): number {
  const services: Partial<Record<LastingService, number>> = balance.sites[type].services;
  return services[service] ?? 0;
}

/** The country's sites of one type, in its file's order. */
const sitesOf = (country: Country, type: SiteType): Site[] =>
  country.sites.filter((site) => site.type === type);

/** The country's first site of one type. */
function firstOf(country: Country, type: SiteType): Site {
  const site = sitesOf(country, type)[0];
  if (site === undefined) throw new Error(`The country has no ${type}`);
  return site;
}

/** A budget that keeps every service as the country starts and pays for all upkeep. */
const keeping = (country: Country) => ({
  taxRatePercent: country.start.budget.taxRatePercent,
  spending: { ...country.start.budget.spending, upkeep: 40 },
});

/** The same game with a site in use from now, in good repair or decaying. */
function withSite(game: GameState, site: Site, status: 'operating' | 'decaying'): GameState {
  return {
    ...game,
    projects: [
      ...game.projects,
      {
        target: onSite(site.id),
        began: game.date,
        quartersPaid: siteTerms(site.type).buildQuarters,
        status,
        opened: game.date,
      },
    ],
  };
}

/** A region's level of a service as the game stands. */
const levelOf = (game: GameState, regionId: string, service: LastingService) =>
  game.regions.find((region) => region.id === regionId)?.[service] ?? 0;

/** The game after a number of quarters played carefully on one budget, starting nothing. */
function played(start: GameState, quarters: number, budget = keeping(start.country)): GameState {
  let state = start;
  for (let quarter = 0; quarter < quarters; quarter += 1) {
    state = advanceQuarter(state, steward(state, budget)).state;
  }
  return state;
}

const scenarios = [
  { name: 'Tavara', file: tavaraFile },
  { name: 'Testland', file: testlandFile },
] as const;

describe('a country file with clinics and schools', () => {
  it('ships Tavara and Testland at format 10, each with clinics and schools placed its own way', () => {
    const tavara = loadCountry(tavaraFile);
    const testland = loadCountry(testlandFile);
    expect([tavara.formatVersion, testland.formatVersion]).toEqual([10, 10]);

    const regionsOf = (country: Country, type: SiteType) =>
      sitesOf(country, type).map((site) => site.regionId);
    // Tavara spreads two of each over four regions; Testland has one of each, side by side.
    const tavaraRegions = [...regionsOf(tavara, 'clinic'), ...regionsOf(tavara, 'school')];
    expect(tavaraRegions).toHaveLength(4);
    expect(new Set(tavaraRegions).size).toBe(4);
    expect(regionsOf(testland, 'clinic')).toEqual(regionsOf(testland, 'school'));
    expect(regionsOf(testland, 'clinic')).toHaveLength(1);
  });

  it('rejects a clinic or a school in a file of an earlier format', () => {
    for (const { type } of SERVICE_SITES) {
      expect(faultsOf(withValue(testlandFormat9File(), ['sites', 0, 'type'], type))).toEqual([
        `sites[0].type is "${type}", which needs country file format 10 or later.`,
      ]);
    }
  });

  it('lets a site need public health or teacher training from format 10, and not before', () => {
    for (const { technology } of SERVICE_SITES) {
      const needing = (file: unknown) => withValue(file, ['sites', 0, 'needs'], technology);
      expect(loadCountry(needing(testlandFile)).sites[0]?.needs).toBe(technology);
      expect(faultsOf(needing(testlandFormat9File()))).toEqual([
        `sites[0].needs is "${technology}", which needs country file format 10 or later.`,
      ]);
    }
  });

  it('still loads a file of format 9 as it is, with no clinic or school', () => {
    const country = loadCountry(testlandFormat9File());
    expect(country.formatVersion).toBe(9);
    expect([...sitesOf(country, 'clinic'), ...sitesOf(country, 'school')]).toEqual([]);
  });

  it('leaves them out of the upkeep the opening budget sets aside, locked as they are', () => {
    expect(loadCountry(testlandFile).start.budget.spending.upkeep).toBe(
      loadCountry(testlandFormat9File()).start.budget.spending.upkeep,
    );
  });
});

describe.each(SERVICE_SITES)('a $type', ({ type, service, technology }) => {
  const other: LastingService = service === 'health' ? 'education' : 'health';

  it('is a small site its own technology unlocks, which needs no other', () => {
    expect(TECHNOLOGY_DEFINITIONS[technology].prerequisites).toEqual([]);
    expect(technologyTerms(technology).unlocks).toEqual([type]);

    const site = balance.sites[type];
    expect(site.cost).toBeLessThanOrEqual(balance.sites.irrigation.cost);
    expect(site.buildQuarters).toBeLessThanOrEqual(balance.sites.irrigation.buildQuarters);
    expect(site.upkeep).toBeGreaterThan(0);
    expect(site.infrastructurePermille).toBeGreaterThan(0);
    expect(pointsOf(type, service)).toBeGreaterThan(0);
  });

  it('says what it does for its region, and half of it while it decays', () => {
    const points = pointsOf(type, service);
    const terms = siteTerms(type);
    expect(terms.effect).toBe(
      `Its region’s ${service} level builds up to ${(points / 10).toFixed(1)} points higher than ${service} spending alone holds it, over the quarters it is in use.`,
    );
    expect(terms.decayingEffect).toContain(`${(points / 20).toFixed(1)} points higher`);
    expect(technologyTerms(technology).effect).toContain(terms.effect);
  });

  describe.each(scenarios)('in $name', ({ file }) => {
    it('stands locked until its technology is known', () => {
      const country = rich(file);
      const site = firstOf(country, type);
      const game = createGame(country, 5);
      const name = TECHNOLOGY_DEFINITIONS[technology].name;

      expect(siteStatus(game, site.id)).toMatchObject({ state: 'locked', lockedBy: [technology] });
      expect(startFault(game, [site.id])).toBe(
        `${site.name} is locked: ${name} must be researched first.`,
      );
      expect(technologyGains(game, technology).unlocks.map((each) => each.siteId)).toEqual(
        sitesOf(country, type).map((each) => each.id),
      );

      const known = knowing(game, [technology]);
      expect(siteStatus(known, site.id)).toMatchObject({ state: 'empty', lockedBy: [] });
      expect(startFault(known, [site.id])).toBeNull();
    });

    it(`raises its region’s ${service} level over the quarters it is in use, and no other`, () => {
      const country = rich(file);
      const site = firstOf(country, type);
      const without = knowing(createGame(country, 5), [technology]);
      const withIt = withSite(without, site, 'operating');
      const points = pointsOf(type, service);

      // One quarter closes only a share of the gap the site opens.
      const before = levelOf(without, site.regionId, service);
      const first = levelOf(played(withIt, 1), site.regionId, service);
      expect(first).toBeGreaterThan(before);
      expect(first).toBeLessThan(before + points);

      // In time the level settles as much higher than spending alone holds it.
      const settledWithout = played(without, 60);
      const settledWith = played(withIt, 60);
      expect(levelOf(settledWith, site.regionId, service)).toBe(
        levelOf(settledWithout, site.regionId, service) + points,
      );
      // The other service there, and every service elsewhere, is as it would have been.
      expect(levelOf(settledWith, site.regionId, other)).toBe(
        levelOf(settledWithout, site.regionId, other),
      );
      for (const region of country.regions.filter((each) => each.id !== site.regionId)) {
        expect(levelOf(settledWith, region.id, service)).toBe(
          levelOf(settledWithout, region.id, service),
        );
      }
    });

    it('raises it half as far while it decays', () => {
      const country = rich(file);
      const site = firstOf(country, type);
      const start = knowing(createGame(country, 5), [technology]);
      const decaying = withSite(start, site, 'decaying');
      const half = Math.floor(
        (pointsOf(type, service) * balance.upkeep.decayingEffectPermille) / 1000,
      );
      const standing = (game: GameState) =>
        serviceLevels(game).find(
          (each) => each.regionId === site.regionId && each.service === service,
        );
      expect((standing(decaying)?.settles ?? 0) - (standing(start)?.settles ?? 0)).toBe(half);

      // Played with no upkeep, so that it stays decaying, the level settles that much higher.
      const unkept = { ...keeping(country), spending: { ...keeping(country).spending, upkeep: 0 } };
      const settled = played(decaying, 60, unkept);
      expect(siteStatus(settled, site.id).state).toBe('decaying');
      expect(levelOf(settled, site.regionId, service)).toBe(
        levelOf(played(start, 60, unkept), site.regionId, service) + half,
      );
    });

    it('is named in the breakdown of where its region’s level settles', () => {
      const country = rich(file);
      const site = firstOf(country, type);
      const start = knowing(createGame(country, 5), [technology]);
      const game = withSite(start, site, 'operating');
      const points = pointsOf(type, service);
      const standing = serviceLevels(game).find(
        (each) => each.regionId === site.regionId && each.service === service,
      );
      const spending = service === 'health' ? 'Health spending' : 'Education spending';

      expect(standing?.level).toBe(levelOf(game, site.regionId, service));
      expect(standing?.parts.map((part) => part.label)).toEqual([spending, site.name]);
      expect(standing?.parts[1]?.amount).toBe(points);
      expect(standing?.settles).toBe(
        (standing?.parts[0]?.amount ?? 0) + (standing?.parts[1]?.amount ?? 0),
      );
      // A region with no such site in use has only what spending holds.
      const elsewhere = serviceLevels(start).find(
        (each) => each.regionId === site.regionId && each.service === service,
      );
      expect(elsewhere?.parts.map((part) => part.label)).toEqual([spending]);
      // What it adds to infrastructure access is named in that breakdown too.
      const standard = livingStandards(game).find((each) => each.regionId === site.regionId);
      expect(standard?.infrastructure).toContainEqual(
        expect.objectContaining({
          label: site.name,
          amount: balance.sites[type].infrastructurePermille,
        }),
      );
    });

    it('is counted by the live preview, as each quarter then turns out', () => {
      const country = rich(file);
      const site = firstOf(country, type);
      const without = knowing(createGame(country, 5), [technology]);
      const part = service === 'health' ? 'Health' : 'Education';

      /** Four years played, and how far the service's part of prosperity moved in them. */
      const play = (start: GameState) => {
        let state = start;
        let moved = 0;
        for (let quarter = 0; quarter < 16; quarter += 1) {
          const decisions = steward(state, keeping(country));
          const preview = previewQuarter(state, decisions);
          const turn = advanceQuarter(state, decisions);
          // No mine earns, so nothing is left to chance: the preview is what the quarter
          // comes to.
          expect([preview.prosperity.min, preview.prosperity.max]).toEqual([
            turn.report.prosperity?.value,
            turn.report.prosperity?.value,
          ]);
          moved +=
            turn.report.prosperity?.contributions.find((each) => each.label === part)?.amount ?? 0;
          state = turn.state;
        }
        return moved;
      };

      // What the quarters come to has the service's part of prosperity rising, which the same
      // quarters without the site do not: it is not the site's infrastructure alone.
      expect(play(withSite(without, site, 'operating'))).toBeGreaterThan(0);
      expect(play(without)).toBe(0);
    });

    it('is counted by the risks ahead: unpaid upkeep that would set it decaying is warned of', () => {
      const country = rich(file);
      const site = firstOf(country, type);
      const game = withSite(knowing(createGame(country, 5), [technology]), site, 'operating');
      const unkept = { ...keeping(country), spending: { ...keeping(country).spending, upkeep: 0 } };
      const upkeep = risksAhead(game, { budget: unkept, reliefRegionId: null }).find(
        (risk) => risk.kind === 'upkeep',
      );
      expect(upkeep?.reason).toContain(site.name);
    });
  });
});

describe.each(scenarios)('in a whole game of $name', ({ file }) => {
  it('a region’s health level rises faster with a clinic than in the same game without it', () => {
    const country = rich(file);
    const clinic = firstOf(country, 'clinic');
    // Health spending raised, so that the level is rising in both games.
    const budget = {
      ...keeping(country),
      spending: {
        ...keeping(country).spending,
        health: country.start.budget.spending.health * 2,
      },
    };

    const play = (builds: boolean) => {
      let state = createGame(country, 5);
      const levels = [levelOf(state, clinic.regionId, 'health')];
      for (let quarter = 0; quarter < 24; quarter += 1) {
        const unlocked = builds && siteStatus(state, clinic.id).state === 'empty';
        state = advanceQuarter(state, {
          ...steward(state, budget),
          ...(builds && quarter === 0 ? { startResearch: 'publicHealth' as const } : {}),
          ...(unlocked ? { startProjects: [clinic.id] } : {}),
        }).state;
        levels.push(levelOf(state, clinic.regionId, 'health'));
      }
      return { state, levels };
    };

    const without = play(false);
    const withIt = play(true);
    expect(knownTechnologies(withIt.state.projects)).toContain('publicHealth');
    expect(siteStatus(withIt.state, clinic.id).state).toBe('operating');

    // Until the clinic is in use the two games are the same game.
    const opens =
      technologyTerms('publicHealth').researchQuarters + siteTerms('clinic').buildQuarters;
    expect(withIt.levels.slice(0, opens + 1)).toEqual(without.levels.slice(0, opens + 1));
    // From then on the level rises faster each quarter, and ends higher.
    const rise = (levels: readonly number[], quarter: number) =>
      (levels[quarter + 1] ?? 0) - (levels[quarter] ?? 0);
    expect(rise(without.levels, opens)).toBeGreaterThan(0);
    for (let quarter = opens; quarter < opens + 4; quarter += 1) {
      expect(rise(withIt.levels, quarter)).toBeGreaterThan(rise(without.levels, quarter));
    }
    expect(withIt.levels.at(-1)).toBeGreaterThan(without.levels.at(-1) ?? 0);

    // A game with the clinic built saves and opens again as it was.
    const stored = JSON.parse(JSON.stringify(saveGame(withIt.state, null))) as unknown;
    const resumed = loadSave(stored).game;
    expect(siteStatus(resumed, clinic.id).state).toBe('operating');
    expect(levelOf(resumed, clinic.regionId, 'health')).toBe(withIt.levels.at(-1));
  });
});
