import { describe, expect, it } from 'vitest';
import tavaraFile from '../../src/countries/tavara.json';
import {
  advanceQuarter,
  createGame,
  type Budget,
  type Decisions,
  type GameState,
  loadCountry,
  risksAhead,
  type TurnReport,
} from '../../src/sim';
import testlandFile from '../countries/testland.json';
import { testlandFormat4File, withChances } from './countries';
import { faultsOf, withValue, without } from './files';
import { steward } from './players';

/** Each country with a region by a river, that a flood strikes every single year. */
const scenarios = [
  { name: 'Tavara', file: tavaraFile, regionId: 'south-delta', regionName: 'South Delta' },
  { name: 'Testland', file: testlandFile, regionId: 'northfield', regionName: 'Northfield' },
] as const;

const asItIs = (game: GameState): Decisions => ({ budget: game.budget });

interface Played {
  /** The state after each quarter, in order. */
  readonly states: readonly GameState[];
  readonly reports: readonly TurnReport[];
}

/** Plays quarters with the decisions each brings, until the game ends or the count is reached. */
function play(start: GameState, quarters: number, decide: (game: GameState) => Decisions): Played {
  let state = start;
  const states: GameState[] = [];
  const reports: TurnReport[] = [];
  for (let quarter = 0; quarter < quarters && state.outcome.status === 'playing'; quarter += 1) {
    const result = advanceQuarter(state, decide(state));
    state = result.state;
    states.push(state);
    reports.push(result.report);
  }
  return { states, reports };
}

/** What a region grew at the harvest a report gives, in tonnes. */
function grownIn(report: TurnReport | undefined, regionId: string): number {
  const grown = report?.harvest?.regions.find((region) => region.regionId === regionId)?.grown;
  if (grown === undefined) throw new Error(`No harvest in ${regionId} was reported`);
  return grown;
}

describe.each(scenarios)('a flood in $name', ({ file, regionId, regionName }) => {
  const flooded = () => withChances(file, { flood: { [regionId]: 1 } });

  it('is announced in the planting season, two quarters before the harvest it spoils', () => {
    const game = createGame(flooded(), 1);
    const { state, report } = advanceQuarter(game, asItIs(game));

    expect(state.date).toEqual({ year: 1, quarter: 2 });
    expect(state.events).toEqual([{ type: 'flood', regionId, began: { year: 1, quarter: 2 } }]);
    expect(report.entries).toContainEqual({
      kind: 'event',
      seriousness: 'serious',
      headline: `Flood in ${regionName}`,
      cause:
        'The rivers have burst their banks. This year’s harvest there will be 30% smaller than it would have been.',
      regionId,
    });
  });

  it.each([1, 2, 3])('cuts the harvest in that region and no other (seed %i)', (seed) => {
    const spared = () => withChances(file, {});
    const wet = play(createGame(flooded(), seed), 4, asItIs).reports[3];
    const dry = play(createGame(spared(), seed), 4, asItIs).reports[3];

    for (const region of flooded().regions) {
      const ratio = grownIn(wet, region.id) / grownIn(dry, region.id);
      expect(ratio).toBeCloseTo(region.id === regionId ? 0.7 : 1, 3);
    }
  });
});

describe('a flood in Lowmere Plains, where an irrigation scheme can be built', () => {
  const regionId = 'lowmere-plains';
  const flooded = () => withChances(tavaraFile, { flood: { [regionId]: 1 } });
  const spared = () => withChances(tavaraFile, {});

  /** Taxed enough to pay for what is built, with relief sent wherever it is needed. */
  const builder =
    (starts: readonly string[]) =>
    (game: GameState): Decisions => {
      const budget: Budget = { ...game.budget, taxRatePercent: 40 };
      return {
        ...steward(game, budget),
        startProjects: game.history.length === 1 ? starts : [],
      };
    };
  const irrigating = builder(['lowmere-irrigation']);

  // The scheme is built through year 1 and is in use when the year 2 flood comes.
  const played = play(createGame(flooded(), 1), 8, irrigating);

  it('sets the region’s sites in use decaying as it begins', () => {
    const [before, during, after] = [3, 4, 5].map(
      (index) =>
        played.states[index]?.projects.find((project) => project.siteId === 'lowmere-irrigation')
          ?.status,
    );

    expect([before, during, after]).toEqual(['operating', 'decaying', 'operating']);
    expect(played.reports[4]?.entries).toContainEqual({
      kind: 'siteDecaying',
      seriousness: 'warning',
      headline: 'Decaying: Lowmere irrigation',
      cause:
        'The flood in Lowmere Plains has damaged it. This quarter it does only 50% of what it does in good repair, and paying its $0.4m upkeep restores it from the next.',
      regionId,
    });
  });

  it('takes less of an irrigated region’s harvest', () => {
    const irrigated =
      grownIn(played.reports[7], regionId) /
      grownIn(play(createGame(spared(), 1), 8, irrigating).reports[7], regionId);
    const bare =
      grownIn(play(createGame(flooded(), 1), 8, builder([])).reports[7], regionId) /
      grownIn(play(createGame(spared(), 1), 8, builder([])).reports[7], regionId);

    // Irrigation leaves the flood half its hold: 15% of the harvest in place of 30%.
    expect(irrigated).toBeCloseTo(0.85, 2);
    expect(bare).toBeCloseTo(0.7, 2);
  });
});

describe('the risks ahead in a country where floods come', () => {
  const regionId = 'lowmere-plains';
  const country = () => withChances(tavaraFile, { flood: { [regionId]: 0.25 } });
  const floodRisk = (game: GameState) =>
    risksAhead(game, asItIs(game)).filter((risk) => risk.kind === 'event');

  it('include a flood that could begin, with what it would do', () => {
    const game = createGame(country(), 1);

    expect(floodRisk(game)).toEqual([
      {
        kind: 'event',
        likelihood: 'unlikely',
        headline: 'Flood in Lowmere Plains',
        reason:
          'A flood there next quarter, a 25% chance, would take 30% of its harvest and set any site in use there decaying until its upkeep is paid.',
        regionId,
        withinQuarters: 2,
      },
    ]);
  });

  it('name the sites a flood would damage, and what irrigation spares of the harvest', () => {
    const built = play(createGame(country(), 2), 4, (game) => ({
      budget: { ...game.budget, taxRatePercent: 40 },
      startProjects: game.history.length === 1 ? ['lowmere-irrigation', 'lowmere-store'] : [],
    })).states[3];
    if (built === undefined) throw new Error('The game ended early');

    expect(built.date).toEqual({ year: 2, quarter: 1 });
    expect(floodRisk(built)).toEqual([
      expect.objectContaining({
        reason:
          'A flood there next quarter, a 25% chance, would take 15% of its harvest and set Lowmere irrigation and Lowmere grain store decaying until their upkeep is paid.',
      }),
    ]);
  });

  it('leave out a flood that cannot begin before the horizon', () => {
    const game = createGame(country(), 1);
    const afterPlanting = play(game, 1, asItIs).states[0];
    if (afterPlanting === undefined) throw new Error('The game ended early');

    expect(afterPlanting.date).toEqual({ year: 1, quarter: 2 });
    expect(floodRisk(afterPlanting)).toEqual([]);
  });

  it('include a flood however unlikely, since its damage is certain if it comes', () => {
    const rare = withChances(tavaraFile, { flood: { [regionId]: 0.01 } });
    const game = createGame(rare, 1);

    expect(floodRisk(game)).toEqual([
      expect.objectContaining({ likelihood: 'remote', headline: 'Flood in Lowmere Plains' }),
    ]);
  });
});

describe('flood likelihoods in a country file', () => {
  it('set how likely a flood is in each region', () => {
    const country = loadCountry(
      withValue(tavaraFile, ['regions', 4, 'eventLikelihood'], { drought: 0, flood: 0.25 }),
    );

    expect(country.regions[4]?.eventLikelihood).toEqual({ drought: 0, flood: 0.25 });
  });

  it('need country file format 6', () => {
    // Tavara as format 6 wrote it, before it could name world price shocks.
    const format6 = without(tavaraFile, ['priceShockLikelihood']);
    const faults = faultsOf(withValue(format6, ['formatVersion'], 5));

    expect(faults).toEqual([
      'regions[2].eventLikelihood.flood needs country file format 6 or later.',
      'regions[4].eventLikelihood.flood needs country file format 6 or later.',
    ]);
  });

  it('are none in a file of an earlier format, which still loads as it is', () => {
    const country = loadCountry(testlandFormat4File());

    expect(country.regions.map((region) => region.eventLikelihood.flood)).toEqual([0, 0]);
  });

  it('share one chance with drought, which begins in the same season', () => {
    const faults = faultsOf(
      withValue(tavaraFile, ['regions', 3, 'eventLikelihood'], { drought: 0.75, flood: 0.5 }),
    );

    expect(faults).toEqual([
      'regions[3].eventLikelihood gives drought and flood chances that come to 1.25, but events that begin in the same season share one chance, so together they may come to at most 1.',
    ]);
    expect(
      loadCountry(
        withValue(tavaraFile, ['regions', 3, 'eventLikelihood'], { drought: 0.35, flood: 0.65 }),
      ).regions[3]?.eventLikelihood,
    ).toEqual({ drought: 0.35, flood: 0.65 });
  });
});
