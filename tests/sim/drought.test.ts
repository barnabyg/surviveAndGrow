import { describe, expect, it } from 'vitest';
import tavaraFile from '../../src/countries/tavara.json';
import {
  advanceQuarter,
  createGame,
  loadCountry,
  previewQuarter,
  type Budget,
  type Country,
  type Decisions,
  type FoodStage,
  type GameState,
  type TurnReport,
} from '../../src/sim';
import testlandFile from '../countries/testland.json';
import { withDroughtChance } from './countries';
import { faultsOf, withValue } from './files';

/** Each country with one region that drought strikes every single year. */
const scenarios = [
  { name: 'Tavara', file: tavaraFile, regionId: 'dry-east', regionName: 'The Dry East' },
  { name: 'Testland', file: testlandFile, regionId: 'sandreach', regionName: 'Sandreach' },
] as const;

/**
 * A budget the treasury can always cover: taxed at the top rate, with agriculture as the
 * country started and $7.0m a quarter for food relief, which moves 14,000 tonnes.
 */
function reliefBudget(game: GameState, foodRelief = 70): Budget {
  const { agriculture } = game.country.start.budget.spending;
  return {
    taxRatePercent: 40,
    spending: { agriculture, foodRelief, health: 0, education: 0, security: 0, upkeep: 0 },
  };
}

interface Played {
  readonly state: GameState;
  readonly reports: readonly TurnReport[];
  /** The state after each quarter, in order. */
  readonly states: readonly GameState[];
}

/** Plays quarters until the game is lost or the count is reached. */
function play(start: GameState, quarters: number, decide: (game: GameState) => Decisions): Played {
  let state = start;
  const reports: TurnReport[] = [];
  const states: GameState[] = [];
  for (let quarter = 0; quarter < quarters && state.outcome.status === 'playing'; quarter += 1) {
    const result = advanceQuarter(state, decide(state));
    state = result.state;
    reports.push(result.report);
    states.push(state);
  }
  return { state, reports, states };
}

const neglect = (game: GameState): Decisions => ({ budget: game.budget, reliefRegionId: null });

function region(game: GameState, regionId: string) {
  const found = game.regions.find((candidate) => candidate.id === regionId);
  if (!found) throw new Error(`No region ${regionId}`);
  return found;
}

/** The stages a region passed through, without repeats. */
function stagesOf(played: Played, regionId: string): FoodStage[] {
  const stages: FoodStage[] = ['adequate'];
  for (const state of played.states) {
    const stage = region(state, regionId).foodStage;
    if (stage !== stages.at(-1)) stages.push(stage);
  }
  return stages;
}

function reliefSent(report: TurnReport | undefined, regionName: string): number | undefined {
  return report?.food.contributions.find((line) => line.label === `Relief sent to ${regionName}`)
    ?.amount;
}

describe.each(scenarios)('a drought in $name', ({ file, regionId, regionName }) => {
  const stricken = () => withDroughtChance(file, { [regionId]: 1 });
  const spared = () => withDroughtChance(file, {});

  it('is announced two quarters before the harvest it affects', () => {
    const { state, report } = advanceQuarter(createGame(stricken(), 1), {
      budget: stricken().start.budget,
      reliefRegionId: null,
    });

    expect(state.date).toEqual({ year: 1, quarter: 2 });
    expect(state.events).toEqual([{ type: 'drought', regionId, began: { year: 1, quarter: 2 } }]);
    expect(report.entries).toContainEqual({
      kind: 'event',
      seriousness: 'serious',
      headline: `Drought in ${regionName}`,
      cause:
        'The rains have failed. This year’s harvest there will be 40% smaller than it would have been.',
      regionId,
    });
  });

  it.each([1, 2, 3, 4, 5])('cuts the harvest in that region and no other (seed %i)', (seed) => {
    const dry = play(createGame(stricken(), seed), 4, neglect).reports[3]?.harvest;
    const wet = play(createGame(spared(), seed), 4, neglect).reports[3]?.harvest;
    if (!dry || !wet) throw new Error('No harvest was reported');

    for (const [index, grown] of dry.regions.entries()) {
      const normal = wet.regions[index]?.grown ?? 0;
      if (grown.regionId === regionId) {
        expect(grown.grown / normal).toBeCloseTo(0.6, 3);
      } else {
        expect(grown.grown).toBe(normal);
      }
    }
  });

  it('ends once the harvest is in', () => {
    const { state, reports } = play(createGame(stricken(), 1), 4, neglect);

    expect(state.events).toEqual([]);
    expect(reports[3]?.entries.map((entry) => entry.headline)).toContain(
      `The drought in ${regionName} has ended`,
    );
  });

  it('never comes where the country file gives it no chance', () => {
    // Two whole terms, each of which ends with its election after 20 quarters.
    const states = [1, 2].flatMap(
      (seed) =>
        play(createGame(spared(), seed), 20, (game) => ({
          budget: reliefBudget(game, 0),
          reliefRegionId: null,
        })).states,
    );

    expect(states).toHaveLength(40);
    expect(states.every((state) => state.events.length === 0)).toBe(true);
  });

  it('comes about as often as the country file says', () => {
    const country = withDroughtChance(file, { [regionId]: 0.5 });
    const firstYears = Array.from({ length: 200 }, (_, seed) =>
      advanceQuarter(createGame(country, seed), {
        budget: country.start.budget,
        reliefRegionId: null,
      }),
    );

    const droughts = firstYears.filter(({ state }) => state.events.length > 0).length;
    expect(droughts).toBeGreaterThan(75);
    expect(droughts).toBeLessThan(125);
  });

  describe.each([1, 2, 3])('left alone (seed %i)', (seed) => {
    const played = play(createGame(stricken(), seed), 40, neglect);

    it('worsens through the named stages to famine', () => {
      expect(stagesOf(played, regionId)).toEqual(['adequate', 'tight', 'shortage', 'famine']);
    });

    it('leaves the region short of food while the national reserve is not empty', () => {
      const hungry = played.states.filter(
        (state) => region(state, regionId).foodStage !== 'adequate',
      );

      expect(hungry.length).toBeGreaterThan(0);
      expect(hungry.every((state) => state.foodReserve > 0)).toBe(true);
    });

    it('kills people in the region, and only there', () => {
      const start = createGame(stricken(), seed);
      // Two quarters of famine, each taking 3% of the people still alive.
      const people = region(start, regionId).population;
      const afterOne = people - Math.floor((people * 30) / 1000);
      const afterTwo = afterOne - Math.floor((afterOne * 30) / 1000);

      expect(region(played.state, regionId).population).toBe(afterTwo);
      for (const other of start.regions.filter((candidate) => candidate.id !== regionId)) {
        expect(region(played.state, other.id).population).toBe(other.population);
      }
    });

    it('ends the game in a loss that says why', () => {
      // A year to the failed harvest, then one quarter each of tight, shortage and famine,
      // and the second quarter of famine brings the state down.
      expect(played.states).toHaveLength(8);
      expect(played.state.outcome).toEqual({
        status: 'lost',
        cause: 'famine',
        regionId,
        headline: 'The state has collapsed',
        summary: `Famine held ${regionName} for 2 quarters running. The state has collapsed.`,
      });
      expect(played.reports.at(-1)?.entries.map((entry) => entry.headline)).toContain(
        'The state has collapsed',
      );
    });

    it('cannot be played on', () => {
      expect(() => advanceQuarter(played.state, neglect(played.state))).toThrow(
        'The game is over.',
      );
      expect(() => previewQuarter(played.state, neglect(played.state))).toThrow(
        'The game is over.',
      );
    });
  });

  describe.each([1, 2, 3])('met with relief (seed %i)', (seed) => {
    const played = play(createGame(stricken(), seed), 16, (game) => ({
      budget: reliefBudget(game),
      reliefRegionId: regionId,
    }));

    it('is survived', () => {
      expect(played.states).toHaveLength(16);
      expect(played.state.outcome).toEqual({ status: 'playing' });
    });

    it('never lets the region go hungry', () => {
      expect(stagesOf(played, regionId)).toEqual(['adequate']);
      expect(region(played.state, regionId).population).toBe(
        region(createGame(stricken(), seed), regionId).population,
      );
    });

    it('draws the relief from the national reserve', () => {
      // The failed harvest of year 1 runs short from the first quarter of year 2.
      const sent = reliefSent(played.reports[4], regionName);

      expect(sent).toBeLessThan(0);
      expect(played.reports[4]?.food.contributions).toContainEqual({
        label: `Relief sent to ${regionName}`,
        amount: sent,
        regionId,
      });
    });
  });

  it('sends nothing to a region that is not short of food', () => {
    const game = createGame(stricken(), 1);

    const { report } = advanceQuarter(game, {
      budget: reliefBudget(game),
      reliefRegionId: regionId,
    });

    expect(reliefSent(report, regionName)).toBeUndefined();
  });

  it('lets a region recover once relief arrives', () => {
    const played = play(createGame(stricken(), 1), 9, (game) => ({
      budget: reliefBudget(game),
      // Nothing until the region is in shortage, in the second quarter of year 2.
      reliefRegionId: game.date.year === 2 && game.date.quarter >= 3 ? regionId : null,
    }));

    expect(played.states.slice(4, 8).map((state) => region(state, regionId).foodStage)).toEqual([
      'tight',
      'shortage',
      'tight',
      'adequate',
    ]);
    expect(played.state.outcome.status).toBe('playing');
  });

  it('previews who will go short and what relief will reach them', () => {
    const decide = (game: GameState): Decisions => ({
      budget: reliefBudget(game),
      reliefRegionId: game.date.year === 2 ? regionId : null,
    });
    const afterHarvest = play(createGame(stricken(), 1), 4, decide).state;

    const preview = previewQuarter(afterHarvest, decide(afterHarvest));
    const { report } = advanceQuarter(afterHarvest, decide(afterHarvest));

    const shortfall = preview.shortfalls.find((entry) => entry.regionId === regionId)?.shortfall;
    expect(shortfall).toBeGreaterThan(0);
    expect(preview.relief).toEqual({ capacity: 14_000, shortfall, delivered: shortfall });
    expect(reliefSent(report, regionName)).toBe(-(shortfall ?? 0));
  });

  it('refuses to send relief to a region that does not exist', () => {
    const game = createGame(stricken(), 1);

    expect(() => advanceQuarter(game, { budget: game.budget, reliefRegionId: 'atlantis' })).toThrow(
      'There is no region "atlantis" to send food relief to.',
    );
  });
});

describe('food relief in Tavara', () => {
  const afterFailedHarvest = (country: Country, foodRelief: number) =>
    play(createGame(country, 1), 5, (game) => ({
      budget: reliefBudget(game, foodRelief),
      reliefRegionId: 'dry-east',
    }));

  it('is limited by what is spent on it', () => {
    const country = withDroughtChance(tavaraFile, { 'dry-east': 1 });

    const played = afterFailedHarvest(country, 10);

    // $1.0m moves 2,000 tonnes, far less than the region is short of.
    expect(reliefSent(played.reports[4], 'The Dry East')).toBe(-2000);
    expect(region(played.state, 'dry-east').foodStage).toBe('tight');
  });

  it('is limited by what the national reserve holds', () => {
    const everywhere = Object.fromEntries(tavaraFile.regions.map(({ id }) => [id, 1]));
    const country = withDroughtChance(tavaraFile, everywhere, 5000);

    const played = afterFailedHarvest(country, 70);

    // 5,000 tonnes less five quarters of spoilage is 3,297, and no region had a surplus.
    expect(reliefSent(played.reports[4], 'The Dry East')).toBe(-3297);
    expect(played.state.foodReserve).toBe(0);
    expect(region(played.state, 'dry-east').foodStage).toBe('tight');
  });
});

describe('event likelihoods in a country file', () => {
  it('set how likely a drought is in each region of Tavara', () => {
    const likelihoods = loadCountry(tavaraFile).regions.map((entry) => [
      entry.name,
      entry.eventLikelihood.drought,
    ]);

    expect(likelihoods).toContainEqual(['The Dry East', 0.35]);
    expect(likelihoods).toContainEqual(['Lowmere Plains', 0]);
  });

  it('are rejected for an event the game does not have', () => {
    const faults = faultsOf(
      withValue(tavaraFile, ['regions', 0, 'eventLikelihood'], { locusts: 0.2 }),
    );

    expect(faults).toEqual([
      'regions[0].eventLikelihood.locusts is not an event this game has (drought).',
    ]);
  });

  it('are rejected when they are not a chance from 0 to 1', () => {
    const faults = faultsOf(
      withValue(tavaraFile, ['regions', 3, 'eventLikelihood'], { drought: 1.5 }),
    );

    expect(faults).toEqual([
      'regions[3].eventLikelihood.drought is 1.5, but must be a chance from 0 to 1.',
    ]);
  });
});
