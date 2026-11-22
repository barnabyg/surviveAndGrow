import { describe, expect, it } from 'vitest';
import {
  advanceQuarter,
  createGame,
  foodStatus,
  loadCountry,
  previewQuarter,
  type Budget,
  type Country,
  type GameState,
  type Preview,
  type TurnReport,
} from '../../src/sim';
import testlandFile from '../countries/testland.json';
import { bothCountries, tavara, testland } from './countries';
import { steward } from './playing';

const seeds = Array.from({ length: 30 }, (_, index) => index + 1);

interface Year {
  readonly state: GameState;
  /** The reports on quarters 1 to 4, in order. */
  readonly reports: readonly TurnReport[];
  /** The preview taken at the start of each quarter, with the same budget. */
  readonly previews: readonly Preview[];
}

/** Plays the four quarters of a year with one budget. */
function playYear(start: GameState, budget: Budget = start.budget): Year {
  let state = start;
  const reports: TurnReport[] = [];
  const previews: Preview[] = [];
  for (let quarter = 0; quarter < 4; quarter += 1) {
    previews.push(previewQuarter(state, { budget }));
    const result = advanceQuarter(state, { budget });
    reports.push(result.report);
    state = result.state;
  }
  return { state, reports, previews };
}

function harvestOf(year: Year): NonNullable<TurnReport['harvest']> {
  const harvest = year.reports[3]?.harvest;
  if (!harvest) throw new Error('No harvest was reported in quarter 4');
  return harvest;
}

function withRelief(budget: Budget, foodRelief: number): Budget {
  return { ...budget, spending: { ...budget.spending, foodRelief } };
}

function withAgriculture(budget: Budget, agriculture: number): Budget {
  return { ...budget, spending: { ...budget.spending, agriculture } };
}

/**
 * Testland with the same farmland in both regions and neither droughts nor dilemmas, so
 * only the terrain differs.
 */
function evenTestland(): Country {
  const file = structuredClone(testlandFile) as {
    regions: { farmland: number; eventLikelihood?: Record<string, number> }[];
    dilemmaLikelihood?: Record<string, number>;
  };
  for (const region of file.regions) {
    region.farmland = 100;
    region.eventLikelihood = {};
  }
  file.dilemmaLikelihood = {};
  return loadCountry(file);
}

describe('eating', () => {
  it('takes food from each region every quarter', () => {
    const game = createGame(tavara(), 1);
    const highlands = (state: GameState) => state.regions[0]?.foodStock;

    // 500,000 people eat 50 kg each a quarter: 25,000 tonnes. They start with a year's food.
    expect(highlands(game)).toBe(100_000);
    const { state } = advanceQuarter(game, { budget: game.budget });
    expect(highlands(state)).toBe(75_000);
  });
});

describe('the harvest', () => {
  it('comes in quarter 4 and in no other quarter', () => {
    const { reports } = playYear(createGame(tavara(), 1));

    expect(reports.map((report) => report.harvest !== null)).toEqual([false, false, false, true]);
  });

  it('is grown by every region', () => {
    const harvest = harvestOf(playYear(createGame(tavara(), 1)));

    expect(harvest.regions.map((region) => region.regionId)).toEqual(
      tavara().regions.map((region) => region.id),
    );
    expect(harvest.total).toBe(harvest.regions.reduce((sum, region) => sum + region.grown, 0));
  });

  it.each(seeds)('depends on the terrain of the land (seed %i)', (seed) => {
    const [plains, arid] = harvestOf(playYear(createGame(evenTestland(), seed))).regions;

    // 100 units of farmland with $1.0m a quarter on agriculture (87.4% of full yield):
    // plains give 1,200 t a unit and arid land 500 t, each within 16% for the weather.
    expect(plains?.grown).toBeGreaterThanOrEqual(88_099);
    expect(plains?.grown).toBeLessThanOrEqual(121_661);
    expect(arid?.grown).toBeGreaterThanOrEqual(36_708);
    expect(arid?.grown).toBeLessThanOrEqual(50_692);
  });

  it('follows the weather, which follows the seed', () => {
    const totals = seeds.map((seed) => harvestOf(playYear(createGame(tavara(), seed))).total);

    expect(new Set(totals).size).toBeGreaterThan(20);
    expect(harvestOf(playYear(createGame(tavara(), 5))).total).toBe(totals[4]);
  });

  it.each(seeds)('is larger when more is spent on agriculture (seed %i)', (seed) => {
    const game = createGame(tavara(), seed);
    // Taxed heavily enough that the treasury covers either budget all year.
    const budget: Budget = { ...game.budget, taxRatePercent: 40 };

    const neglected = harvestOf(playYear(game, withAgriculture(budget, 0)));
    const funded = harvestOf(playYear(game, withAgriculture(budget, 200)));

    // The same seed gives the same weather, so the spending is the only difference.
    for (const [index, region] of funded.regions.entries()) {
      expect(region.grown).toBeGreaterThan(neglected.regions[index]?.grown ?? Infinity);
    }
    // No spending leaves 85% of the full yield; the most the budget allows gives 133%.
    expect(funded.total / neglected.total).toBeCloseTo(1.33 / 0.85, 3);
  });

  it('loses a share of what each region sends to the reserve in transport', () => {
    const harvest = harvestOf(playYear(createGame(tavara(), 1)));

    expect(harvest.regions.some((region) => region.surplus > 0)).toBe(true);
    for (const region of harvest.regions) {
      // 15% of what leaves the region never arrives.
      expect(region.lost).toBe(Math.floor(region.surplus * 0.15));
    }
  });
});

describe('a good year and a bad year', () => {
  const years = seeds.map((seed) => playYear(createGame(tavara(), seed)));
  const byHarvest = [...years].sort((a, b) => harvestOf(a).total - harvestOf(b).total);
  const bad = byHarvest[0];
  const good = byHarvest.at(-1);
  if (!bad || !good) throw new Error('No years were played');

  it('differ in how much the country grows', () => {
    // With average weather and its starting budget Tavara grows 1,262,660 tonnes.
    expect(harvestOf(good).total).toBeGreaterThan(1_262_660);
    expect(harvestOf(bad).total).toBeLessThan(1_262_660);
  });

  it('differ in how much reaches the national reserve', () => {
    const delivered = (year: Year) =>
      harvestOf(year).regions.reduce((sum, region) => sum + region.surplus - region.lost, 0);

    expect(delivered(good)).toBeGreaterThan(delivered(bad));
    expect(good.state.foodReserve).toBeGreaterThan(bad.state.foodReserve);
  });

  it('both leave the reserve higher after the harvest than before it', () => {
    for (const year of [good, bad]) {
      expect(year.reports[3]?.food.change).toBeGreaterThan(0);
    }
  });
});

describe('the national reserve', () => {
  it('loses a share to spoilage every quarter', () => {
    const game = createGame(tavara(), 1);

    const { state, report } = advanceQuarter(game, { budget: game.budget });

    // 8% of 182,000 tonnes spoils: 14,560.
    expect(state.foodReserve).toBe(167_440);
    expect(report.food).toEqual({
      value: 167_440,
      change: -14_560,
      contributions: [{ label: 'Spoiled in store', amount: -14_560 }],
    });
  });

  it('is measured in months of what the country eats', () => {
    // Tavara eats 260,000 tonnes a quarter and holds 182,000.
    expect(foodStatus(createGame(tavara(), 1))).toMatchObject({
      reserveMonths: 2.1,
      quarterlyConsumption: 260_000,
    });
    // Testland eats 20,000 tonnes a quarter and holds 30,000.
    expect(foodStatus(createGame(testland(), 1)).reserveMonths).toBe(4.5);
  });

  it('is flagged when it is below the safe level', () => {
    expect(foodStatus(createGame(tavara(), 1))).toMatchObject({
      safeReserveMonths: 3,
      belowSafeLevel: true,
    });
    expect(foodStatus(createGame(testland(), 1)).belowSafeLevel).toBe(false);
  });

  it('lists the surplus each region sent and what was lost on the way', () => {
    const year = playYear(createGame(tavara(), 1));
    const harvest = harvestOf(year);
    const lines = year.reports[3]?.food.contributions ?? [];

    const plains = harvest.regions.find((region) => region.regionId === 'lowmere-plains');
    expect(lines).toContainEqual({
      label: 'Surplus from Lowmere Plains',
      amount: plains?.surplus,
      regionId: 'lowmere-plains',
    });
    expect(lines).toContainEqual({
      label: 'Lost in transport',
      amount: -harvest.regions.reduce((sum, region) => sum + region.lost, 0),
    });
  });
});

describe.each(bothCountries)('food in %s', (_name, country) => {
  it('explains the whole change in the reserve, every quarter', () => {
    let game = createGame(country(), 4);
    // Enough food relief spending to carry a region through a drought.
    const budget = withRelief(game.budget, 20);
    for (let quarter = 0; quarter < 12; quarter += 1) {
      const { state, report } = advanceQuarter(game, steward(game, budget));
      const explained = report.food.contributions.reduce((sum, line) => sum + line.amount, 0);

      expect(explained).toBe(report.food.change);
      expect(state.foodReserve - game.foodReserve).toBe(report.food.change);
      expect(state.foodReserve).toBe(report.food.value);
      game = state;
    }
  });

  it.each(seeds)('forecasts a harvest range the harvest then falls inside (seed %i)', (seed) => {
    const year = playYear(createGame(country(), seed));
    const { total } = harvestOf(year);

    for (const preview of year.previews) {
      expect(preview.harvest.min).toBeLessThan(preview.harvest.max);
      expect(total).toBeGreaterThanOrEqual(preview.harvest.min);
      expect(total).toBeLessThanOrEqual(preview.harvest.max);
    }
  });

  it.each(seeds)(
    'keeps the harvest inside the forecast when the treasury runs dry mid-year (seed %i)',
    (seed) => {
      const game = createGame(country(), seed);
      // Taxed too lightly to pay for itself: the treasury empties within the year, and
      // agriculture is then cut along with everything else.
      const budget: Budget = {
        taxRatePercent: 5,
        spending: { ...game.budget.spending, agriculture: 200, health: 100 },
      };

      const year = playYear(game, budget);
      const { total } = harvestOf(year);

      expect(
        year.reports.some((report) =>
          report.entries.some((entry) => entry.headline === 'Spending was cut'),
        ),
      ).toBe(true);
      for (const preview of year.previews) {
        expect(total).toBeGreaterThanOrEqual(preview.harvest.min);
        expect(total).toBeLessThanOrEqual(preview.harvest.max);
      }
    },
  );

  it('narrows the forecast as the harvest approaches', () => {
    const { previews } = playYear(createGame(country(), 9));
    const widths = previews.map((preview) => preview.harvest.max - preview.harvest.min);

    expect(widths).toEqual([...widths].sort((a, b) => b - a));
    expect(widths[3]).toBeLessThan((widths[0] ?? 0) / 2);
  });

  it.each(seeds)('projects a reserve the reserve then falls inside (seed %i)', (seed) => {
    const year = playYear(createGame(country(), seed));

    for (const preview of year.previews) {
      expect(year.state.foodReserve).toBeGreaterThanOrEqual(preview.foodReserveAfterHarvest.min);
      expect(year.state.foodReserve).toBeLessThanOrEqual(preview.foodReserveAfterHarvest.max);
    }
  });

  it('previews the effect of agriculture spending on the forecast and the reserve', () => {
    const game = createGame(country(), 9);

    const lean = previewQuarter(game, { budget: withAgriculture(game.budget, 0) });
    const rich = previewQuarter(game, { budget: withAgriculture(game.budget, 200) });

    expect(rich.harvest.min).toBeGreaterThan(lean.harvest.min);
    expect(rich.harvest.max).toBeGreaterThan(lean.harvest.max);
    expect(rich.foodReserveAfterHarvest.max).toBeGreaterThan(lean.foodReserveAfterHarvest.max);
  });
});
