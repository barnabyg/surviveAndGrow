import { describe, expect, it } from 'vitest';
import tavaraFile from '../../src/countries/tavara.json';
import {
  advanceQuarter,
  balance,
  chainOf,
  createGame,
  knownTechnologies,
  livingStandards,
  loadSave,
  previewQuarter,
  regionPower,
  risksAhead,
  saveGame,
  siteEffects,
  siteStatus,
  siteTerms,
  technologyGains,
  technologyTerms,
  TECHNOLOGY_DEFINITIONS,
  type Budget,
  type Country,
  type GameState,
  type Site,
  type Technology,
  type TurnReport,
} from '../../src/sim';
import testlandFile from '../countries/testland.json';
import { withChances, withoutPoweredMines } from './countries';
import { knowing, steward } from './playing';
import { budgetFrom } from '../budgets';

/**
 * A country with a treasury that pays for everything it can build and for research, no
 * drought, flood or dilemma, unless asked for, and mines that need no power.
 */
function rich(file: unknown, flood: Record<string, number> = {}): Country {
  const copy = withoutPoweredMines(file) as { start: { treasury: number } };
  copy.start.treasury = 5000;
  return withChances(copy, { flood });
}

/** The country's own spending with enough tax and upkeep for everything built. */
function solvent(country: Country): Budget {
  return budgetFrom(country.start.budget, { taxRatePercent: 25, spending: { upkeep: 40 } });
}

/** The first site of a type in the country, among the ids given if there are any. */
function first(country: Country, type: string, among?: readonly string[]): Site {
  const site = country.sites.find(
    (candidate) => candidate.type === type && (among === undefined || among.includes(candidate.id)),
  );
  if (site === undefined) throw new Error(`The country has no ${type} site`);
  return site;
}

/**
 * The sites each technology improves, one of each: an irrigation scheme, a grain store, a
 * mine with its trunk road and the shallow port that holds its chain back, and a power line
 * with the station it leads to.
 */
function sitesOf(country: Country) {
  const mine = first(country, 'mine');
  const road = first(country, 'trunkRoad', mine.dependsOn);
  const port = first(country, 'port', road.dependsOn);
  const quay = first(country, 'shallowPort', port.alternatives);
  const station = first(country, 'powerStation');
  const line = country.sites.find(
    (site) => site.type === 'powerLine' && site.dependsOn.includes(station.id),
  );
  if (line === undefined) throw new Error('The country has no line to its station');
  return {
    irrigation: first(country, 'irrigation'),
    store: first(country, 'grainStore'),
    mine,
    road,
    quay,
    station,
    line,
  };
}

/**
 * Plays until the sites given are in use, starting them all in the first quarter: every site
 * of `sitesOf` unless others are given. A small country with everything built soon wins, so a
 * game played long after is given only what it needs.
 */
function built(
  country: Country,
  sites: readonly Site[] = Object.values(sitesOf(country)),
): GameState {
  const budget = solvent(country);
  const ids = sites.map((site) => site.id);
  let state = advanceQuarter(createGame(country, 5), {
    ...steward(createGame(country, 5), budget),
    startProjects: ids,
  }).state;
  while (!ids.every((id) => siteStatus(state, id).state === 'operating')) {
    state = advanceQuarter(state, steward(state, budget)).state;
  }
  return state;
}

/** Every technology a technology needs, directly or through others. */
function prerequisitesOf(technology: Technology): Technology[] {
  return TECHNOLOGY_DEFINITIONS[technology].prerequisites.flatMap((needed) => [
    ...prerequisitesOf(needed),
    needed,
  ]);
}

/** Plays quarters as a careful player, researching the technology given in the first if any. */
function play(start: GameState, quarters: number, research: Technology | null) {
  const states: GameState[] = [];
  const reports: TurnReport[] = [];
  let state = start;
  for (let quarter = 0; quarter < quarters; quarter += 1) {
    const decisions = steward(state, solvent(state.country));
    const result = advanceQuarter(
      state,
      quarter === 0 && research !== null ? { ...decisions, startResearch: research } : decisions,
    );
    state = result.state;
    states.push(state);
    reports.push(result.report);
  }
  return { states, reports };
}

const scenarios = [
  { name: 'Tavara', country: () => rich(tavaraFile) },
  { name: 'Testland', country: () => rich(testlandFile) },
] as const;

/** Where a site's region falls in the country file's order. */
const regionIndex = (country: Country, site: Site) =>
  country.regions.findIndex((region) => region.id === site.regionId);

interface Improvement {
  readonly technology: Technology;
  /** The sites it improves, built before it is researched. */
  readonly sites: readonly Site[];
  /** The figure the technology moves, as the game stands. */
  readonly figure: (game: GameState) => number;
  readonly before: number;
  readonly after: number;
}

/** Each improvement, the figure it moves, and what it moves it from and to. */
function improvements(country: Country): Improvement[] {
  const sites = sitesOf(country);
  const { improvedIrrigation, coldStorage, roadEngineering, gridEfficiency } = balance.technologies;
  const withdrawn = (permille: number, by: number) => Math.floor((permille * by) / 1000);
  return [
    {
      technology: 'improvedIrrigation',
      sites: [sites.irrigation],
      figure: (game) =>
        siteEffects(game).inRegion.harvestWeather[regionIndex(country, sites.irrigation)] ?? 0,
      before: balance.sites.irrigation.effects.harvestWeather,
      after: withdrawn(
        balance.sites.irrigation.effects.harvestWeather,
        improvedIrrigation.improves.irrigation.effects.harvestWeather,
      ),
    },
    {
      technology: 'coldStorage',
      sites: [sites.store],
      figure: (game) => siteEffects(game).national.reserveSpoilage,
      before: balance.sites.grainStore.effects.reserveSpoilage,
      after: withdrawn(
        balance.sites.grainStore.effects.reserveSpoilage,
        coldStorage.improves.grainStore.effects.reserveSpoilage,
      ),
    },
    {
      technology: 'roadEngineering',
      sites: [sites.mine, sites.road, sites.quay],
      figure: (game) => chainOf(game, sites.mine.id)?.shipped ?? 0,
      // The shallow port holds the chain back, and road engineering widens it.
      before: balance.sites.shallowPort.capacity * 1000,
      after:
        ((balance.sites.shallowPort.capacity *
          (1000 + roadEngineering.improves.shallowPort.capacityPermille)) /
          1000) *
        1000,
    },
    {
      technology: 'gridEfficiency',
      sites: [sites.station, sites.line],
      figure: (game) =>
        regionPower(game).find((power) => power.regionId === sites.line.regionId)?.outputPermille ??
        0,
      before: balance.power.outputPermille,
      after:
        (balance.power.outputPermille *
          (1000 + gridEfficiency.improves.powerStation.powerPermille)) /
        1000,
    },
  ];
}

describe.each(scenarios)('in a whole game of $name, an improvement', ({ country }) => {
  it.each(improvements(country()).map((each) => [each.technology, each] as const))(
    '%s moves its figure only once researched',
    (technology, { sites, figure, before, after }) => {
      const ready = knowing(built(country(), sites), prerequisitesOf(technology));
      const { researchQuarters } = technologyTerms(technology);
      const researched = play(ready, researchQuarters + 1, technology);
      const control = play(ready, researchQuarters + 1, null);

      expect(figure(ready)).toBe(before);
      expect(after).not.toBe(before);
      researched.states.forEach((state, index) => {
        const known = knownTechnologies(state.projects).includes(technology);
        // Known from the quarter after its last instalment, and not before.
        expect(known).toBe(index + 1 >= researchQuarters);
        expect(figure(state)).toBe(known ? after : before);
        expect(figure(control.states[index] ?? ready)).toBe(before);
      });
    },
  );

  it('road engineering raises a chain’s yield where it widens the bottleneck, and the tax it pays', () => {
    const { mine, road, quay } = sitesOf(country());
    const without = knowing(
      built(country(), [mine, road, quay]),
      prerequisitesOf('roadEngineering'),
    );
    const withIt = knowing(without, ['roadEngineering']);
    expect(chainOf(without, mine.id)?.bottleneck).toBe(quay.id);
    expect(chainOf(withIt, mine.id)?.bottleneck).toBe(quay.id);
    expect(chainOf(withIt, mine.id)?.shipped).toBeGreaterThan(
      chainOf(without, mine.id)?.shipped ?? Infinity,
    );
    expect(chainOf(withIt, mine.id)).toMatchObject({
      unimproved: chainOf(without, mine.id)?.shipped,
      improvedBy: ['roadEngineering'],
    });

    const taxed = (game: GameState) =>
      advanceQuarter(game, steward(game, solvent(game.country))).report.treasury.contributions;
    const lines = taxed(withIt).filter((line) => line.label.startsWith(`Tax from ${mine.name}`));
    const base = taxed(without).find((line) => line.label === `Tax from ${mine.name}`);
    // The tax on what the chain would ship anyway, then what road engineering adds, named.
    expect(lines.find((line) => line.label === `Tax from ${mine.name}`)).toEqual(base);
    expect(
      lines.find((line) => line.label === `Tax from ${mine.name}: Road engineering`)?.amount,
    ).toBeGreaterThan(0);
  });
});

describe.each(scenarios)(
  'in $name, the breakdowns name the technology behind a figure',
  ({ country }) => {
    const start = built(country());
    const sites = sitesOf(country());
    const all = knowing(start, [
      'droughtResistantSeed',
      'improvedIrrigation',
      'coldStorage',
      'roadEngineering',
      'gridEfficiency',
    ]);
    const before = knowing(start, ['droughtResistantSeed', 'improvedIrrigation', 'coldStorage']);

    it('in the region’s output and infrastructure access', () => {
      const standard = livingStandards(all).find((each) => each.regionId === sites.line.regionId);
      const power = `Power from ${sites.station.name}`;
      const output = standard?.output.find((line) => line.label === `${power}: Grid efficiency`);
      const access = standard?.infrastructure.find(
        (line) => line.label === `${power}: Grid efficiency`,
      );
      expect(output?.amount).toBeGreaterThan(0);
      expect(access?.amount).toBeGreaterThan(0);
      // What power gives without it is the line it always had.
      const unimproved = livingStandards(before).find(
        (each) => each.regionId === sites.line.regionId,
      );
      expect(standard?.output.find((line) => line.label === power)).toEqual(
        unimproved?.output.find((line) => line.label === power),
      );
      const mineStandard = livingStandards(all).find(
        (each) => each.regionId === sites.mine.regionId,
      );
      expect(
        mineStandard?.output.find((line) => line.label === `${sites.mine.name}: Road engineering`)
          ?.amount,
      ).toBeGreaterThan(0);
    });

    it('in the treasury', () => {
      const { report } = advanceQuarter(all, steward(all, solvent(all.country)));
      const region = all.country.regions.find((each) => each.id === sites.line.regionId)?.name;
      expect(
        report.treasury.contributions.find(
          (line) => line.label === `Tax from power in ${region}: Grid efficiency`,
        )?.amount,
      ).toBeGreaterThan(0);
    });

    it('in the food reserve, where cold storage keeps grain from spoiling', () => {
      const { report } = advanceQuarter(all, steward(all, solvent(all.country)));
      const saved = report.food.contributions.find(
        (line) => line.label === 'Kept from spoiling by Cold storage',
      );
      expect(saved?.amount).toBeGreaterThan(0);
      const { report: without } = advanceQuarter(
        knowing(start, ['droughtResistantSeed']),
        steward(start, solvent(start.country)),
      );
      expect(without.food.contributions.map((line) => line.label)).not.toContain(
        'Kept from spoiling by Cold storage',
      );
      // What spoils without it is the line it always had; cold storage gives part of it back.
      expect(report.food.contributions.find((line) => line.label === 'Spoiled in store')).toEqual(
        without.food.contributions.find((line) => line.label === 'Spoiled in store'),
      );
    });

    it('in the site’s own terms, saying what each figure would be without it', () => {
      const known = knownTechnologies(all.projects);
      expect(siteTerms('irrigation', undefined, known)).toMatchObject({
        effect:
          'Weather, drought and flood move its region’s harvest 60% (50% without Improved irrigation) less.',
        improvedBy: ['improvedIrrigation'],
      });
      expect(siteTerms('shallowPort', undefined, known).effect).toBe(
        'Ships up to 450,000 t (360,000 t without Road engineering) a quarter across the border: a mine’s ore first, and grain bought or sold abroad in what is left.',
      );
      expect(siteTerms('powerLine', undefined, known).effect).toBe(
        'Brings power from a power station to its region: the region produces 25% (20% without Grid efficiency) more and gains 18.7 points (15.0 points without Grid efficiency) of infrastructure access.',
      );
      // A site no technology known improves reads as it always did.
      expect(siteTerms('mine', undefined, known)).toEqual(siteTerms('mine'));
    });
  },
);

describe('improved irrigation', () => {
  it('is named in the harvest report where an irrigation scheme is in use', () => {
    const start = knowing(built(rich(tavaraFile)), ['droughtResistantSeed', 'improvedIrrigation']);
    let state = start;
    let harvest: TurnReport | undefined;
    while (harvest === undefined) {
      const { state: next, report } = advanceQuarter(state, steward(state, solvent(state.country)));
      if (report.harvest !== null) harvest = report;
      state = next;
    }
    expect(harvest.entries.find((entry) => entry.kind === 'harvest')?.cause).toContain(
      `Improved irrigation is known: ${technologyTerms('improvedIrrigation').effect}`,
    );
  });

  it('is named in the report of an irrigation scheme finished once it is known', () => {
    const country = rich(tavaraFile);
    const { irrigation } = sitesOf(country);
    const start = knowing(createGame(country, 5), ['droughtResistantSeed', 'improvedIrrigation']);
    const entries: TurnReport['entries'][number][] = [];
    let state = advanceQuarter(start, {
      ...steward(start, solvent(country)),
      startProjects: [irrigation.id],
    }).state;
    while (siteStatus(state, irrigation.id).state !== 'operating') {
      const { state: next, report } = advanceQuarter(state, steward(state, solvent(country)));
      entries.push(...report.entries);
      state = next;
    }
    expect(entries.find((entry) => entry.headline === `Finished: ${irrigation.name}`)?.cause).toBe(
      `It is in use from next quarter. ${siteTerms('irrigation', irrigation.capacity, knownTechnologies(start.projects)).effect}`,
    );
    expect(
      siteTerms('irrigation', irrigation.capacity, knownTechnologies(start.projects)).effect,
    ).toContain('without Improved irrigation');
  });

  it('narrows the preview’s harvest forecast in the irrigated region', () => {
    const without = knowing(built(rich(tavaraFile)), ['droughtResistantSeed']);
    const withIt = knowing(without, ['improvedIrrigation']);
    const width = (game: GameState) => {
      const { harvest } = previewQuarter(game, steward(game, solvent(game.country)));
      return harvest.max - harvest.min;
    };
    expect(width(withIt)).toBeLessThan(width(without));
  });

  it('is counted in the risks ahead: a flood there would take less of the harvest', () => {
    const country = rich(tavaraFile, { 'lowmere-plains': 1 });
    const { irrigation } = sitesOf(country);
    const without = knowing(built(country), ['droughtResistantSeed']);
    const withIt = knowing(without, ['improvedIrrigation']);
    const flood = (game: GameState) =>
      risksAhead(game, steward(game, solvent(game.country))).find(
        (risk) => risk.kind === 'event' && risk.regionId === irrigation.regionId,
      )?.reason;
    const cut = 1000 - balance.events.flood.effects.harvestPermille;
    const left = (permille: number) => Math.round((cut * permille) / 10_000);
    expect(flood(without)).toContain(`would take ${String(left(500))}% of its harvest`);
    expect(flood(withIt)).toContain(`would take ${String(left(400))}% of its harvest`);
  });
});

describe('what the research tab says a technology would improve in this game', () => {
  const start = built(rich(tavaraFile));
  const sites = sitesOf(start.country);

  it('names each site in use it would improve, and by how much', () => {
    const gains = technologyGains(start, 'roadEngineering');
    expect(gains.sites.map((site) => site.siteId)).toEqual([sites.road.id, sites.quay.id]);
    expect(gains.sites[1]?.effect).toContain('450,000 t (360,000 t now)');
    expect(gains.chains).toEqual([
      { sourceId: sites.mine.id, name: sites.mine.name, before: 360_000, after: 450_000 },
    ]);
    expect(gains.regions).toEqual([
      expect.objectContaining({ regionId: sites.mine.regionId, infrastructure: 0 }),
    ]);
    expect(gains.regions[0]?.output).toBeGreaterThan(0);
    expect(gains.awaiting).toBeNull();
  });

  it('says a technology pays off only once what it improves is built', () => {
    const gains = technologyGains(createGame(rich(tavaraFile), 1), 'coldStorage');
    expect(gains).toEqual({
      sites: [],
      chains: [],
      regions: [],
      awaiting: 'No grain store is in use yet, so it improves nothing until one is built.',
      unlocks: [],
    });
    expect(technologyGains(start, 'droughtResistantSeed').awaiting).toBeNull();
  });

  it('for one known, says what it does now', () => {
    const known = knowing(start, ['droughtResistantSeed', 'improvedIrrigation', 'gridEfficiency']);
    const gains = technologyGains(known, 'gridEfficiency');
    expect(gains.sites.map((site) => site.siteId)).toContain(sites.station.id);
    expect(gains.sites[0]?.effect).toContain('25% (20% without Grid efficiency)');
    expect(gains.regions.every((region) => region.output > 0)).toBe(true);
  });
});

describe('a game that knows the improvements', () => {
  it('saves and opens again in the same save format: only the tree has grown, not the state', () => {
    const game = knowing(built(rich(tavaraFile)), [
      'droughtResistantSeed',
      'improvedIrrigation',
      'coldStorage',
      'roadEngineering',
      'gridEfficiency',
    ]);
    const stored = JSON.parse(JSON.stringify(saveGame(game, null))) as unknown;
    expect(loadSave(stored)).toEqual({ game, report: null });
  });
});
