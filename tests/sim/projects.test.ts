import { describe, expect, it } from 'vitest';
import tavaraFile from '../../src/countries/tavara.json';
import {
  advanceQuarter,
  createGame,
  describeEvent,
  previewQuarter,
  siteStatus,
  startFault,
  type Budget,
  type Country,
  type Decisions,
  type GameState,
  type Preview,
  type TurnReport,
} from '../../src/sim';
import testlandFile from '../countries/testland.json';
import { bothCountries, tavara, testland, withDroughtChance } from './countries';
import { steward } from './players';

/**
 * Every tax the country can bear and nothing spent but the upkeep of what is built, so the
 * treasury only grows and every site in use stays in good repair.
 */
const austere: Budget = {
  taxRatePercent: 40,
  spending: { agriculture: 0, foodRelief: 0, health: 0, education: 0, security: 0, upkeep: 200 },
};

/** A budget the treasury cannot cover: spending is cut and nothing is left over. */
const ruinous: Budget = {
  taxRatePercent: 5,
  spending: {
    agriculture: 200,
    foodRelief: 200,
    health: 200,
    education: 200,
    security: 200,
    upkeep: 200,
  },
};

interface Played {
  readonly state: GameState;
  readonly reports: readonly TurnReport[];
}

/** Plays one quarter for each set of decisions given, in order. */
function play(start: GameState, quarters: readonly Partial<Decisions>[]): Played {
  let state = start;
  const reports: TurnReport[] = [];
  for (const decisions of quarters) {
    const result = advanceQuarter(state, { budget: state.budget, ...decisions });
    reports.push(result.report);
    state = result.state;
  }
  return { state, reports };
}

/** What each quarter paid towards building, as the treasury's breakdown lists it. */
function payments(reports: readonly TurnReport[]): number[][] {
  return reports.map((report) =>
    report.treasury.contributions
      .filter((line) => line.label.startsWith('Building '))
      .map((line) => line.amount),
  );
}

function entriesOf(report: TurnReport | undefined, kind: string) {
  return (report?.entries ?? []).filter((entry) => entry.kind === kind);
}

describe.each(bothCountries)('the sites of %s', (_name, country) => {
  it('are all empty when a game starts', () => {
    const game = createGame(country(), 3);

    expect(game.projects).toEqual([]);
    for (const site of game.country.sites) {
      expect(siteStatus(game, site.id)).toMatchObject({ state: 'empty', quartersPaid: 0 });
    }
  });

  it('are built by paying the whole cost over the build time, and then operate', () => {
    const game = createGame(country(), 3);
    const store = game.country.sites.find((site) => site.type === 'grainStore');
    if (!store) throw new Error('The country has no grain store site');

    const { state, reports } = play(game, [
      { budget: austere, startProjects: [store.id] },
      { budget: austere },
      { budget: austere },
    ]);

    // $6.0m over two quarters, and nothing more once it is built.
    expect(payments(reports)).toEqual([[-30], [-30], []]);
    expect(siteStatus(state, store.id)).toMatchObject({
      state: 'operating',
      quartersPaid: 2,
      buildQuarters: 2,
      instalment: 0,
      opened: { year: 1, quarter: 3 },
    });
  });

  it('leave the weather and the events of the game as they were', () => {
    const game = createGame(country(), 3);
    const [site] = game.country.sites.filter((candidate) => candidate.type === 'grainStore');

    const built = play(game, [
      { budget: austere, startProjects: site ? [site.id] : [] },
      { budget: austere },
      { budget: austere },
    ]);
    const bare = play(game, [{ budget: austere }, { budget: austere }, { budget: austere }]);

    expect(built.state.rng).toBe(bare.state.rng);
    expect(built.state.events).toEqual(bare.state.events);
    expect(built.state.regions.map((region) => region.weather)).toEqual(
      bare.state.regions.map((region) => region.weather),
    );
  });

  it('cannot be built on when the site is not one of the country’s', () => {
    const game = createGame(country(), 3);

    expect(startFault(game, ['atlantis'])).toBe('There is no site "atlantis" to build on.');
    expect(() =>
      advanceQuarter(game, { budget: game.budget, startProjects: ['atlantis'] }),
    ).toThrow(new RangeError('There is no site "atlantis" to build on.'));
    expect(() =>
      previewQuarter(game, { budget: game.budget, startProjects: ['atlantis'] }),
    ).toThrow(new RangeError('There is no site "atlantis" to build on.'));
  });

  it('leave the earlier state untouched when a project is started', () => {
    const game = createGame(country(), 3);
    const before = structuredClone(game);
    const store = game.country.sites.find((site) => site.type === 'grainStore');

    advanceQuarter(game, { budget: austere, startProjects: store ? [store.id] : [] });

    expect(game).toEqual(before);
  });
});

describe('starting a project in Tavara', () => {
  it('pays the first instalment that quarter and reports that work has begun', () => {
    const game = createGame(tavara(), 1);

    const { state, reports } = play(game, [{ startProjects: ['lowmere-irrigation'] }]);

    // Revenue $31.0m, spending $36.0m and a $4.0m instalment: $42.0m falls to $33.0m.
    expect(state.treasury).toBe(330);
    expect(reports[0]?.treasury.contributions).toContainEqual({
      label: 'Building Lowmere irrigation',
      amount: -40,
      regionId: 'lowmere-plains',
    });
    expect(siteStatus(state, 'lowmere-irrigation')).toEqual({
      siteId: 'lowmere-irrigation',
      state: 'building',
      closedBy: null,
      quartersPaid: 1,
      buildQuarters: 3,
      cost: 120,
      upkeep: 4,
      instalment: 40,
      began: { year: 1, quarter: 1 },
      opened: null,
    });
    expect(entriesOf(reports[0], 'projectStarted')).toEqual([
      {
        kind: 'projectStarted',
        seriousness: 'notable',
        headline: 'Building begins: Lowmere irrigation',
        cause: 'It costs $12.0m, paid over the 3 quarters it takes to build.',
        regionId: 'lowmere-plains',
      },
    ]);
  });

  it('counts the instalment in the deficit the budget report gives', () => {
    const game = createGame(tavara(), 1);

    const { reports } = play(game, [{ startProjects: ['lowmere-irrigation'] }]);

    expect(entriesOf(reports[0], 'budget')).toEqual([
      {
        kind: 'budget',
        seriousness: 'warning',
        headline: 'The treasury is shrinking',
        cause:
          'Spending of $40.0m outran revenue of $31.0m. At this deficit the treasury lasts 3 more quarters.',
      },
    ]);
  });

  it('splits a cost that does not divide evenly so that the last instalment makes it up', () => {
    const game = createGame(tavara(), 1);

    const { reports } = play(game, [{ startProjects: ['lowmere-road'] }, {}, {}, {}]);

    // $10.0m over three quarters.
    expect(payments(reports)).toEqual([[-33], [-33], [-34], []]);
  });

  it('reports the finished site, which is in use from the next quarter', () => {
    const game = createGame(tavara(), 1);

    const { state, reports } = play(game, [{ startProjects: ['lowmere-road'] }, {}, {}]);

    expect(entriesOf(reports[1], 'projectCompleted')).toEqual([]);
    expect(entriesOf(reports[2], 'projectCompleted')).toEqual([
      {
        kind: 'projectCompleted',
        seriousness: 'notable',
        headline: 'Finished: Farm road, Arden to Lowmere',
        cause:
          'It is in use from next quarter. 50% less of its region’s surplus is lost on the way to the national reserve.',
        regionId: 'lowmere-plains',
      },
    ]);
    expect(siteStatus(state, 'lowmere-road')).toMatchObject({
      state: 'operating',
      opened: { year: 1, quarter: 4 },
    });
  });

  it('builds several projects at once, each paid for on its own line', () => {
    const game = createGame(tavara(), 1);

    const { state, reports } = play(game, [
      { startProjects: ['lowmere-store'] },
      { startProjects: ['dustwell-irrigation'] },
    ]);

    expect(payments(reports)).toEqual([[-30], [-30, -40]]);
    expect(state.projects.map((project) => [project.siteId, project.status])).toEqual([
      ['lowmere-store', 'operating'],
      ['dustwell-irrigation', 'building'],
    ]);
  });
});

describe('a project cannot be started', () => {
  it('on a site that is already being built on', () => {
    const { state } = play(createGame(tavara(), 1), [{ startProjects: ['lowmere-irrigation'] }]);

    expect(startFault(state, ['lowmere-irrigation'])).toBe(
      'Lowmere irrigation is already being built.',
    );
    expect(() =>
      advanceQuarter(state, { budget: state.budget, startProjects: ['lowmere-irrigation'] }),
    ).toThrow(new RangeError('Lowmere irrigation is already being built.'));
  });

  it('on a site that is already built', () => {
    const { state } = play(createGame(tavara(), 1), [{ startProjects: ['lowmere-store'] }, {}]);

    expect(startFault(state, ['lowmere-store'])).toBe('Lowmere grain store is already built.');
  });

  it('twice in the same quarter', () => {
    const game = createGame(tavara(), 1);

    expect(startFault(game, ['lowmere-store', 'lowmere-store'])).toBe(
      'Lowmere grain store is listed twice.',
    );
  });

  it('when the treasury does not hold its whole cost', () => {
    const game = createGame(testland(), 1);

    expect(startFault(game, ['north-irrigation'])).toBe(
      'The treasury holds $10.0m, which does not cover the $12.0m needed to start North irrigation.',
    );
    expect(startFault(game, ['sand-road'])).toBeNull();
  });

  it('when the treasury does not hold the cost of everything started together', () => {
    const game = createGame(tavara(), 1);
    const four = ['lowmere-irrigation', 'dustwell-irrigation', 'lowmere-road', 'coast-road'];

    expect(startFault(game, four.slice(0, 3))).toBeNull();
    expect(startFault(game, four)).toBe(
      'The treasury holds $42.0m, which does not cover the $44.0m needed to start 4 projects.',
    );
    expect(() => previewQuarter(game, { budget: game.budget, startProjects: four })).toThrow(
      RangeError,
    );
  });
});

describe('a project the treasury cannot pay for', () => {
  it('pauses for the quarter, builds nothing and is reported', () => {
    const game = createGame(tavara(), 1);

    const { state, reports } = play(game, [{ budget: ruinous, startProjects: ['lowmere-store'] }]);

    // The budget took all but $0.1m, which does not cover a $3.0m instalment.
    expect(state.treasury).toBe(1);
    expect(payments(reports)).toEqual([[]]);
    expect(siteStatus(state, 'lowmere-store')).toMatchObject({ state: 'paused', quartersPaid: 0 });
    expect(entriesOf(reports[0], 'projectPaused')).toEqual([
      {
        kind: 'projectPaused',
        seriousness: 'warning',
        headline: 'Paused: Lowmere grain store',
        cause:
          'The treasury could not cover its $3.0m instalment, so nothing was built this quarter.',
        regionId: 'lowmere-plains',
      },
    ]);
  });

  it('resumes when the money is there, and takes as long again to finish', () => {
    const game = createGame(tavara(), 1);

    const { state, reports } = play(game, [
      { budget: ruinous, startProjects: ['lowmere-store'] },
      { budget: ruinous },
      { budget: austere },
      { budget: austere },
    ]);

    expect(payments(reports)).toEqual([[], [], [-30], [-30]]);
    expect(entriesOf(reports[1], 'projectPaused')).toHaveLength(1);
    expect(entriesOf(reports[2], 'projectStarted')).toEqual([
      {
        kind: 'projectStarted',
        seriousness: 'notable',
        headline: 'Building resumes: Lowmere grain store',
        cause: '1 of its 2 quarters of building is now done.',
        regionId: 'lowmere-plains',
      },
    ]);
    expect(siteStatus(state, 'lowmere-store')).toMatchObject({
      state: 'operating',
      opened: { year: 2, quarter: 1 },
    });
  });

  it('is the one started later, when there is money for only some', () => {
    const game = createGame(tavara(), 1);
    // $42.0m and $31.0m of revenue, less $68.0m of spending, leaves $5.0m for building.
    const tight: Budget = {
      taxRatePercent: 18,
      spending: {
        agriculture: 200,
        foodRelief: 200,
        health: 200,
        education: 80,
        security: 0,
        upkeep: 0,
      },
    };

    const { state, reports } = play(game, [
      { budget: tight, startProjects: ['lowmere-irrigation', 'lowmere-store'] },
    ]);

    expect(payments(reports)).toEqual([[-40]]);
    expect(state.treasury).toBe(10);
    expect(siteStatus(state, 'lowmere-irrigation')).toMatchObject({ state: 'building' });
    expect(siteStatus(state, 'lowmere-store')).toMatchObject({ state: 'paused' });
  });
});

/** The country's own spending with enough tax to pay for it, and not so much that anyone strikes. */
function solvent(country: Country): Budget {
  return { taxRatePercent: 25, spending: country.start.budget.spending };
}

interface Years extends Played {
  /** The state each quarter began from, in order. */
  readonly before: readonly GameState[];
}

/**
 * Plays whole years on a solvent budget with relief sent where it is needed, starting a
 * project on each of the named sites in the first quarter the treasury can afford it.
 */
function playYears(country: Country, seed: number, years: number, build: readonly string[]): Years {
  let state = createGame(country, seed);
  let waiting = [...build];
  const before: GameState[] = [];
  const reports: TurnReport[] = [];
  for (let quarter = 0; quarter < years * 4; quarter += 1) {
    const starts: string[] = [];
    for (const siteId of waiting) {
      if (startFault(state, [...starts, siteId]) === null) starts.push(siteId);
    }
    waiting = waiting.filter((siteId) => !starts.includes(siteId));
    before.push(state);
    const result = advanceQuarter(state, {
      ...steward(state, solvent(country)),
      startProjects: starts,
    });
    reports.push(result.report);
    ({ state } = result);
  }
  return { state, reports, before };
}

function siteOfType(country: Country, type: string) {
  const site = country.sites.find((candidate) => candidate.type === type);
  if (!site) throw new Error(`The country has no ${type} site`);
  return site;
}

function harvestIn(report: TurnReport | undefined, regionId: string) {
  const harvest = report?.harvest?.regions.find((region) => region.regionId === regionId);
  if (!harvest) throw new Error(`No harvest was reported for ${regionId}`);
  return harvest;
}

function spoiled(report: TurnReport | undefined): number {
  const line = report?.food.contributions.find((entry) => entry.label === 'Spoiled in store');
  return -(line?.amount ?? 0);
}

const seeds = Array.from({ length: 30 }, (_, index) => index + 1);

const bothFiles: [name: string, file: unknown][] = [
  ['Tavara', tavaraFile],
  ['Testland', testlandFile],
];

describe.each(bothFiles)('a finished site in %s', (_name, file) => {
  /** The country with no drought ever, so that only the weather moves the harvest. */
  const calm = () => withDroughtChance(file, {});

  it('of irrigation halves how far the weather moves its region’s harvest', () => {
    const site = siteOfType(calm(), 'irrigation');
    // The third year's harvest, by which time the scheme has long been in use.
    const grown = (build: readonly string[]) =>
      seeds.map(
        (seed) => harvestIn(playYears(calm(), seed, 3, build).reports[11], site.regionId).grown,
      );
    const spread = (harvests: readonly number[]) => Math.max(...harvests) - Math.min(...harvests);

    const irrigated = spread(grown([site.id]));
    const rainFed = spread(grown([]));

    expect(rainFed).toBeGreaterThan(0);
    expect(irrigated).toBeGreaterThan(rainFed * 0.48);
    expect(irrigated).toBeLessThan(rainFed * 0.52);
  });

  it('of irrigation leaves every other region’s harvest as it was', () => {
    const site = siteOfType(calm(), 'irrigation');

    const irrigated = playYears(calm(), 5, 3, [site.id]).reports[11]?.harvest?.regions ?? [];
    const rainFed = playYears(calm(), 5, 3, []).reports[11]?.harvest?.regions ?? [];

    expect(irrigated.filter((region) => region.regionId !== site.regionId)).toEqual(
      rainFed.filter((region) => region.regionId !== site.regionId),
    );
  });

  it('of a farm road halves the share of its region’s surplus lost on the way', () => {
    const site = siteOfType(calm(), 'farmRoad');
    let lostWithoutRoad = 0;

    for (const seed of seeds.slice(0, 12)) {
      const served = harvestIn(playYears(calm(), seed, 3, [site.id]).reports[11], site.regionId);
      const unserved = harvestIn(playYears(calm(), seed, 3, []).reports[11], site.regionId);

      expect(served.surplus).toBe(unserved.surplus);
      expect(Math.abs(served.lost * 2 - unserved.lost)).toBeLessThanOrEqual(1);
      lostWithoutRoad += unserved.lost;
    }
    expect(lostWithoutRoad).toBeGreaterThan(0);
  });

  it('of a grain store cuts what spoils in the national reserve by a quarter', () => {
    const site = siteOfType(calm(), 'grainStore');

    // Started in the first quarter, the store is in use from the third.
    const stored = playYears(calm(), 9, 1, [site.id]);
    const open = playYears(calm(), 9, 1, []);

    expect(stored.before[2]?.foodReserve).toBe(open.before[2]?.foodReserve);
    expect(spoiled(open.reports[2])).toBeGreaterThan(0);
    expect(Math.abs(spoiled(stored.reports[2]) * 4 - spoiled(open.reports[2]) * 3)).toBeLessThan(4);
    // Until then it changed nothing.
    expect(spoiled(stored.reports[1])).toBe(spoiled(open.reports[1]));
  });

  it('is counted in the forecast, which the harvest then falls inside', () => {
    const build = [siteOfType(calm(), 'irrigation').id, siteOfType(calm(), 'farmRoad').id];

    for (const seed of seeds.slice(0, 8)) {
      let state = createGame(calm(), seed);
      let waiting = [...build];
      let previews: Preview[] = [];
      for (let quarter = 0; quarter < 12; quarter += 1) {
        const starts = waiting.filter((siteId) => startFault(state, [siteId]) === null).slice(0, 1);
        waiting = waiting.filter((siteId) => !starts.includes(siteId));
        const decisions = { budget: solvent(state.country), startProjects: starts };
        previews.push(previewQuarter(state, decisions));
        const result = advanceQuarter(state, decisions);
        ({ state } = result);

        const { harvest } = result.report;
        if (harvest === null) continue;
        for (const preview of previews) {
          expect(harvest.total).toBeGreaterThanOrEqual(preview.harvest.min);
          expect(harvest.total).toBeLessThanOrEqual(preview.harvest.max);
          expect(state.foodReserve).toBeGreaterThanOrEqual(preview.foodReserveAfterHarvest.min);
          expect(state.foodReserve).toBeLessThanOrEqual(preview.foodReserveAfterHarvest.max);
        }
        previews = [];
      }
      expect(waiting).toEqual([]);
    }
  });
});

describe('irrigation in a drought', () => {
  /** Tavara with a drought in the Dry East every year. */
  const parched = () => withDroughtChance(tavaraFile, { 'dry-east': 1 });
  const droughtIn = (state: GameState) => {
    const [drought] = state.events.filter((event) => event.regionId === 'dry-east');
    if (!drought) throw new Error('There is no drought in the Dry East');
    return describeEvent(state, drought);
  };

  it('halves what the drought takes from the harvest', () => {
    // Started in the first quarter, the scheme is in use for the first harvest.
    const irrigated = playYears(parched(), 2, 1, ['dustwell-irrigation']);
    const rainFed = playYears(parched(), 2, 1, []);

    expect(droughtIn(rainFed.before[3] ?? rainFed.state)).toBe('Drought · harvest −40%');
    expect(droughtIn(irrigated.before[3] ?? irrigated.state)).toBe('Drought · harvest −20%');
    // While the scheme was still being built the drought stood to take its full share.
    expect(droughtIn(irrigated.before[2] ?? irrigated.state)).toBe('Drought · harvest −40%');

    // 80% of the harvest in place of 60%, give or take weather that counts for half as much.
    const ratio =
      harvestIn(irrigated.reports[3], 'dry-east').grown /
      harvestIn(rainFed.reports[3], 'dry-east').grown;
    expect(ratio).toBeGreaterThan(1.24);
    expect(ratio).toBeLessThan(1.47);
  });
});

describe('two grain stores in Tavara', () => {
  it('each cut what spoils by a quarter of what the other leaves', () => {
    const calm = () => withDroughtChance(tavaraFile, {});

    const stored = playYears(calm(), 9, 1, ['lowmere-store', 'southbank-store']);
    const open = playYears(calm(), 9, 1, []);

    // Three quarters of three quarters is nine sixteenths, worked to the nearest thousandth.
    expect(stored.before[2]?.foodReserve).toBe(open.before[2]?.foodReserve);
    expect(spoiled(stored.reports[2]) / spoiled(open.reports[2])).toBeCloseTo(9 / 16, 2);
  });
});

describe('previewing a quarter with projects', () => {
  it('counts the instalments in spending, the balance and the treasury', () => {
    const game = createGame(tavara(), 1);

    const preview = previewQuarter(game, {
      budget: game.budget,
      startProjects: ['lowmere-irrigation'],
    });

    expect(preview.projectSpending).toEqual({ min: 40, max: 40 });
    expect(preview.spending).toEqual({ min: 400, max: 400 });
    expect(preview.balance).toEqual({ min: -90, max: -90 });
    expect(preview.treasury).toEqual({ min: 330, max: 330 });
    expect(preview.pausedSites).toEqual([]);
  });

  it('names the sites where building will pause for want of money', () => {
    const game = createGame(tavara(), 1);

    const preview = previewQuarter(game, { budget: ruinous, startProjects: ['lowmere-store'] });

    expect(preview.pausedSites).toEqual(['lowmere-store']);
    expect(preview.projectSpending).toEqual({ min: 0, max: 0 });
    expect(preview.treasury).toEqual({ min: 1, max: 1 });
  });

  it.each(bothFiles)('is exact about money while projects are built in %s', (_name, file) => {
    let state = createGame(withDroughtChance(file, {}), 4);
    let waiting = state.country.sites.map((site) => site.id);

    for (let quarter = 0; quarter < 16; quarter += 1) {
      const starts = waiting.filter((siteId) => startFault(state, [siteId]) === null).slice(0, 1);
      waiting = waiting.filter((siteId) => !starts.includes(siteId));
      // Every fourth quarter the budget is one the treasury cannot cover, so building pauses.
      const budget = quarter % 4 === 3 ? ruinous : solvent(state.country);
      const decisions = { budget, startProjects: starts };
      const preview = previewQuarter(state, decisions);
      const result = advanceQuarter(state, decisions);

      const paid = payments([result.report])[0] ?? [];
      expect(preview.treasury).toEqual({ min: result.state.treasury, max: result.state.treasury });
      expect(preview.projectSpending.min).toBe(paid.reduce((total, amount) => total - amount, 0));
      expect(preview.pausedSites).toEqual(
        result.state.projects
          .filter((project) => project.status === 'paused')
          .map((project) => project.siteId),
      );
      // A quarter the treasury cannot cover cuts upkeep too, and the sites in use decay.
      expect(preview.upkeep.short).toEqual(
        state.projects
          .filter((project) => project.status === 'operating' || project.status === 'decaying')
          .map((project) => project.siteId)
          .filter((siteId) => siteStatus(result.state, siteId).state === 'decaying'),
      );
      ({ state } = result);
    }
    expect(state.projects.some((project) => project.status === 'decaying')).toBe(true);
    expect(
      state.projects.filter((project) => ['operating', 'decaying'].includes(project.status)),
    ).not.toEqual([]);
  });
});
