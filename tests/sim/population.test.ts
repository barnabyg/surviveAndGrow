import { describe, expect, it } from 'vitest';
import tavaraFile from '../../src/countries/tavara.json';
import {
  advanceQuarter,
  createGame,
  foodStatus,
  loadCountry,
  monthsOfFood,
  previewQuarter,
  type GameState,
  type TurnReport,
} from '../../src/sim';
import {
  tavaraGrowing,
  testlandFormat1File,
  testlandFormat2File,
  testlandGrowing,
  withChances,
} from './countries';
import { faultsOf, withValue } from './files';
import { steward } from './playing';

const sum = (amounts: readonly number[]) => amounts.reduce((total, amount) => total + amount, 0);
const peopleOf = (game: GameState) => sum(game.regions.map((region) => region.population));
/** What a population eats in a quarter, in tonnes, at 50 kg a head. */
const need = (people: number) => Math.floor((people * 50) / 1000);

/** Plays quarters as a careful player does, keeping every report. */
function play(start: GameState, quarters: number) {
  let state = start;
  const reports: TurnReport[] = [];
  for (let quarter = 0; quarter < quarters && state.outcome.status === 'playing'; quarter += 1) {
    const result = advanceQuarter(state, steward(state));
    state = result.state;
    reports.push(result.report);
  }
  return { state, reports };
}

describe.each([
  ['Tavara', tavaraGrowing],
  ['Testland', testlandGrowing],
])('the population of %s', (_name, country) => {
  it('grows in every region every quarter, by 0.3% at the game’s own rate', () => {
    const start = createGame(country(), 1);

    const { state } = advanceQuarter(start, steward(start));

    state.regions.forEach((region, index) => {
      const before = start.regions[index]?.population ?? 0;
      expect(region.population).toBe(before + Math.floor((before * 30) / 10_000));
    });
  });

  it('rises over a term, and what it eats rises with it', () => {
    const start = createGame(country(), 1);

    const { state } = play(start, 20);

    const consumption = state.history.map((record) => record.quarterlyConsumption);
    for (let quarter = 1; quarter < consumption.length; quarter += 1) {
      expect(consumption[quarter]).toBeGreaterThan(consumption[quarter - 1] ?? 0);
    }
    expect(peopleOf(state)).toBeGreaterThan(Math.floor(peopleOf(start) * 1.05));
    // What the country eats, and so the months the reserve lasts, follow the larger population.
    const status = foodStatus(state);
    expect(status.quarterlyConsumption).toBe(
      sum(state.regions.map((region) => need(region.population))),
    );
    expect(status.reserveMonths).toBe(monthsOfFood(state.foodReserve, status.quarterlyConsumption));
  });

  it('is reported region by region, adding up to the change', () => {
    const start = createGame(country(), 1);

    const { state, report } = advanceQuarter(start, steward(start));

    expect(report.population?.value).toBe(peopleOf(state));
    expect(report.population?.change).toBe(peopleOf(state) - peopleOf(start));
    expect(sum(report.population?.contributions.map((line) => line.amount) ?? [])).toBe(
      report.population?.change,
    );
    expect(report.population?.contributions.map((line) => line.regionId)).toEqual(
      start.regions.map((region) => region.id),
    );
    expect(report.population?.contributions[0]?.label).toMatch(/^Growth in /);
  });

  it('leaves a region short of the food the larger number of people need', () => {
    const start = createGame(country(), 1);
    const { state } = play(start, 8);

    const preview = previewQuarter(state, { budget: state.budget });

    // Each region eats from its own stock until the harvest; its need is its people's now.
    for (const shortfall of preview.shortfalls) {
      const region = state.regions.find((entry) => entry.id === shortfall.regionId);
      expect(shortfall.shortfall).toBeLessThanOrEqual(need(region?.population ?? 0));
    }
    expect(foodStatus(state).quarterlyConsumption).toBeGreaterThan(
      foodStatus(start).quarterlyConsumption,
    );
  });
});

describe('a region in famine', () => {
  it('loses people to famine and does not grow', () => {
    const country = withChances(tavaraFile, {
      drought: { 'dry-east': 1 },
      reserve: 0,
      growing: true,
    });
    let state = createGame(country, 1);
    let famine: TurnReport | undefined;
    for (let quarter = 0; quarter < 12 && famine === undefined; quarter += 1) {
      const result = advanceQuarter(state, { budget: state.budget });
      if (result.state.regions.some((region) => region.foodStage === 'famine'))
        famine = result.report;
      state = result.state;
    }

    const lines = famine?.population?.contributions.filter((line) => line.regionId === 'dry-east');
    expect(lines?.map((line) => line.label)).toEqual(['Famine deaths in The Dry East']);
    expect(lines?.[0]?.amount).toBeLessThan(0);
  });
});

describe('a country file', () => {
  const format2 = testlandFormat2File();

  it('may set a region’s yearly growth, which the game holds a quarter at a time', () => {
    const country = loadCountry(withValue(format2, ['regions', 1, 'populationGrowth'], 4));

    expect(country.regions.map((region) => region.growthPerTenThousandPerQuarter)).toEqual([
      30, 100,
    ]);
  });

  it('may stop a region growing', () => {
    const country = loadCountry(withValue(format2, ['regions', 0, 'populationGrowth'], 0));
    const start = createGame(withChancesOf(country), 1);

    const { state } = advanceQuarter(start, { budget: start.budget });

    expect(state.regions[0]?.population).toBe(start.regions[0]?.population);
    expect(state.regions[1]?.population).toBeGreaterThan(start.regions[1]?.population ?? 0);
  });

  it('is rejected when a growth rate is out of range, not a number, or in a format 1 file', () => {
    expect(faultsOf(withValue(format2, ['regions', 0, 'populationGrowth'], 12))).toEqual([
      'regions[0].populationGrowth is 12, but must be a yearly percentage from 0 to 10.',
    ]);
    expect(faultsOf(withValue(format2, ['regions', 0, 'populationGrowth'], -1))).toEqual([
      'regions[0].populationGrowth is -1, but must be a yearly percentage from 0 to 10.',
    ]);
    expect(faultsOf(withValue(format2, ['regions', 0, 'populationGrowth'], 'fast'))).toEqual([
      'regions[0].populationGrowth must be a number, but is text.',
    ]);
    expect(
      faultsOf(withValue(testlandFormat1File(), ['regions', 0, 'populationGrowth'], 2)),
    ).toEqual(['regions[0].populationGrowth needs country file format 2 or later.']);
  });
});

/** The country with nothing left to chance: no drought and no dilemma. */
function withChancesOf(country: ReturnType<typeof loadCountry>) {
  return withChances(country.source, { growing: true });
}
