import { describe, expect, it } from 'vitest';
import tavaraFile from '../../src/countries/tavara.json';
import {
  advanceQuarter,
  createGame,
  livingStandards,
  PROSPERITY_PART_NAMES,
  previewQuarter,
  prosperityStatus,
  type Budget,
  type Country,
  type GameState,
  type TurnReport,
} from '../../src/sim';
import testlandFile from '../countries/testland.json';
import { bothCountries, tavara, withChances } from './countries';
import { steward } from './playing';
import { budgetFrom } from '../budgets';

const sum = (amounts: readonly number[]) => amounts.reduce((total, amount) => total + amount, 0);

/** The budget in force with health and education spending set as given. */
function withServices(game: GameState, health: number, education: number): Budget {
  return budgetFrom(game.budget, { spending: { health, education } });
}

/** Plays quarters with one budget, as a careful player does, keeping every report. */
function play(start: GameState, quarters: number, budget: Budget = start.budget) {
  let state = start;
  const reports: TurnReport[] = [];
  for (let quarter = 0; quarter < quarters && state.outcome.status === 'playing'; quarter += 1) {
    const result = advanceQuarter(state, steward(state, budget));
    state = result.state;
    reports.push(result.report);
  }
  return { state, reports };
}

describe.each(bothCountries)('prosperity in %s', (_name, country) => {
  it('gives each region a living standard built from five parts', () => {
    const game = createGame(country(), 1);

    const standards = livingStandards(game);

    expect(standards.map((standard) => standard.regionId)).toEqual(
      game.regions.map((region) => region.id),
    );
    for (const standard of standards) {
      expect(Object.keys(standard.scores)).toEqual([
        'food',
        'income',
        'health',
        'education',
        'infrastructure',
      ]);
      expect(standard.value).toBeGreaterThan(0);
      expect(standard.value).toBeLessThan(1000);
    }
  });

  it('is the regions’ living standards averaged by population, with five parts adding up to it', () => {
    const game = createGame(country(), 1);

    const status = prosperityStatus(game);

    const people = sum(game.regions.map((region) => region.population));
    const weighted = sum(
      status.regions.map(
        (standard, index) => standard.value * (game.regions[index]?.population ?? 0),
      ),
    );
    expect(status.value).toBe(Math.floor(weighted / people));
    expect(status.parts.map((part) => part.label)).toEqual(Object.values(PROSPERITY_PART_NAMES));
    expect(sum(status.parts.map((part) => part.amount))).toBe(status.value);
    expect(status.target).toBe(420);
  });

  it('does not move while nothing changes: health and education start where the budget holds them', () => {
    const { state, reports } = play(createGame(withChances(fileOf(country()), {}), 1), 4);

    expect(state.history.map((record) => record.prosperity)).toEqual(
      state.history.map(() => state.history[0]?.prosperity),
    );
    expect(reports.every((report) => report.prosperity?.change === 0)).toBe(true);
  });

  it('rises with sustained health and education spending, slowly', () => {
    const start = createGame(withChances(fileOf(country()), {}), 1);
    const generous = withServices(start, 120, 120);

    const { state, reports } = play(start, 12, generous);

    const [first, second] = state.regions;
    expect(first?.health).toBeGreaterThan(start.regions[0]?.health ?? 0);
    expect(first?.education).toBeGreaterThan(start.regions[0]?.education ?? 0);
    // Spending is per head and the same everywhere, so every region's level is the same.
    expect(second?.health ?? first?.health).toBe(first?.health);
    const values = state.history.map((record) => record.prosperity ?? 0);
    for (let quarter = 1; quarter < values.length; quarter += 1) {
      expect(values[quarter]).toBeGreaterThanOrEqual(values[quarter - 1] ?? 0);
    }
    expect((values.at(-1) ?? 0) - (values[0] ?? 0)).toBeGreaterThanOrEqual(5);
    // It builds up over quarters, not at once: the first quarter brings well under half of the rise.
    const rise = (values.at(-1) ?? 0) - (values[0] ?? 0);
    expect((values[1] ?? 0) - (values[0] ?? 0)).toBeLessThan(rise / 2);
    // What moved it is health and education, and the lines add up to the change.
    const moved = reports[0]?.prosperity;
    expect(moved?.contributions.find((line) => line.label === 'Health')?.amount).toBeGreaterThan(0);
    expect(sum(moved?.contributions.map((line) => line.amount) ?? [])).toBe(moved?.change);
  });

  it('wears down when health and education spending stops', () => {
    const start = createGame(withChances(fileOf(country()), {}), 1);

    const { state } = play(start, 8, withServices(start, 0, 0));

    expect(state.regions[0]?.health).toBeLessThan(start.regions[0]?.health ?? 0);
    expect(state.regions[0]?.education).toBeLessThan(start.regions[0]?.education ?? 0);
    expect(state.history.at(-1)?.prosperity).toBeLessThan(state.history[0]?.prosperity ?? 0);
  });

  it('falls with hunger', () => {
    // Drought every year everywhere, an empty reserve and nothing spent on farming or relief.
    const regions = country().regions.map((region) => region.id);
    const parched = withChances(fileOf(country()), {
      drought: Object.fromEntries(regions.map((id) => [id, 1])),
      reserve: 0,
    });
    const start = createGame(parched, 1);
    const neglect: Budget = budgetFrom(start.budget, {
      spending: { agriculture: 0, foodRelief: 0 },
    });

    let state = start;
    let lowest = prosperityStatus(start).value;
    for (let quarter = 0; quarter < 12 && state.outcome.status === 'playing'; quarter += 1) {
      const result = advanceQuarter(state, { budget: neglect });
      state = result.state;
      lowest = Math.min(lowest, result.report.prosperity?.value ?? lowest);
    }

    expect(state.regions.some((region) => region.foodStage !== 'adequate')).toBe(true);
    expect(lowest).toBeLessThan(prosperityStatus(start).value);
  });

  it('is shown by the preview as the quarter will leave it', () => {
    const start = createGame(withChances(fileOf(country()), {}), 1);
    const decisions = { budget: withServices(start, 150, 150) };

    const preview = previewQuarter(start, decisions);
    const { report } = advanceQuarter(start, decisions);

    expect(preview.prosperity).toEqual({
      min: report.prosperity?.value,
      max: report.prosperity?.value,
    });
  });
});

describe('infrastructure access', () => {
  it('counts the sites in use in a region, and only in that region', () => {
    const country = tavara();
    let game = createGame(country, 1);
    const before = livingStandards(game);
    game = advanceQuarter(game, {
      budget: game.budget,
      startProjects: ['lowmere-store'],
    }).state;
    expect(livingStandards(game)).toEqual(before);

    game = advanceQuarter(game, { budget: game.budget }).state;

    const after = livingStandards(game);
    const lowmere = country.regions.findIndex((region) => region.id === 'lowmere-plains');
    expect(after[lowmere]?.scores.infrastructure).toBe(200);
    expect(after[lowmere]?.value).toBeGreaterThan(before[lowmere]?.value ?? 0);
    expect(after.filter((_, index) => index !== lowmere).map((entry) => entry.value)).toEqual(
      before.filter((_, index) => index !== lowmere).map((entry) => entry.value),
    );
  });
});

/** The file a test country was read from. */
function fileOf(country: Country): unknown {
  return country.id === 'testland' ? testlandFile : tavaraFile;
}
