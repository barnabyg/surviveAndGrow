import { describe, expect, it } from 'vitest';
import tavaraFile from '../../src/countries/tavara.json';
import {
  advanceQuarter,
  approvalStatus,
  createGame,
  previewQuarter,
  type Budget,
  type Country,
  type Decisions,
  type GameState,
  type TurnReport,
} from '../../src/sim';
import testlandFile from '../countries/testland.json';
import { tavara, withDroughtChance } from './countries';
import { budgetFrom } from '../budgets';

/** Each country as it ships, but with no chance of drought anywhere. */
const withoutDrought: [name: string, country: () => Country][] = [
  ['Tavara', () => withDroughtChance(tavaraFile, {})],
  ['Testland', () => withDroughtChance(testlandFile, {})],
];

/** Each country with one region that drought strikes every year. */
const withDrought = [
  { name: 'Tavara', file: tavaraFile, regionId: 'dry-east', regionName: 'The Dry East' },
  { name: 'Testland', file: testlandFile, regionId: 'sandreach', regionName: 'Sandreach' },
] as const;

interface Played {
  readonly state: GameState;
  readonly reports: readonly TurnReport[];
  /** The state after each quarter, in order. */
  readonly states: readonly GameState[];
}

/** Plays quarters with one budget and no relief, until the count is reached or the game ends. */
function play(start: GameState, quarters: number, budget: Budget = start.budget): Played {
  let state = start;
  const reports: TurnReport[] = [];
  const states: GameState[] = [];
  for (let quarter = 0; quarter < quarters && state.outcome.status === 'playing'; quarter += 1) {
    const result = advanceQuarter(state, { budget, reliefRegionId: null });
    state = result.state;
    reports.push(result.report);
    states.push(state);
  }
  return { state, reports, states };
}

const national = (game: GameState) => approvalStatus(game).approval;
const regionOf = (game: GameState, regionId: string) => {
  const region = game.regions.find((candidate) => candidate.id === regionId);
  if (region === undefined) throw new Error(`There is no region ${regionId}`);
  return region;
};
const line = (report: TurnReport | undefined, label: string) =>
  report?.approval.contributions.find((entry) => entry.label === label)?.amount;

/** Taxed at the top rate with nothing spent on the public: the surest way to be disliked. */
function harsh(game: GameState): Budget {
  return budgetFrom(game.budget, {
    taxRatePercent: 40,
    spending: { health: 0, education: 0, security: 0 },
  });
}

describe('approval when a game starts in Tavara', () => {
  it('stands where the starting budget puts it, the same in every region', () => {
    const game = createGame(tavara(), 1);

    // Baseline 51.5%; tax at the neutral 18%; health a little over what people expect
    // (+0.7), education and security a little under (−0.2 each).
    expect(national(game)).toBe(518);
    expect(game.regions.map((region) => region.approval)).toEqual([518, 518, 518, 518, 518, 518]);
    expect(game.regions.map((region) => region.unrest)).toEqual([
      'calm',
      'calm',
      'calm',
      'calm',
      'calm',
      'calm',
    ]);
  });

  it('states the thresholds for strikes and protests', () => {
    const status = approvalStatus(createGame(tavara(), 1));

    expect(status.strikesBelow).toBe(400);
    expect(status.protestsBelow).toBe(300);
    expect(status.unrest).toEqual([]);
  });

  it('lists what approval is made of, adding up to the figure', () => {
    const status = approvalStatus(createGame(tavara(), 1));

    expect(status.causes).toEqual([
      { label: 'Baseline', amount: 515 },
      { label: 'Food', amount: 0 },
      { label: 'Tax rate', amount: 0 },
      { label: 'Health spending', amount: 7 },
      { label: 'Education spending', amount: -2 },
      { label: 'Security spending', amount: -2 },
    ]);
  });
});

/**
 * Each country with drought every year in one region and nothing done about it. The failed
 * harvest is in after four quarters, the region is tight in the fifth and in shortage in the
 * sixth, and every other region stays where it started. The figures are worked by hand:
 *
 * - Tavara: 4,600,000 people at 51.8% and the Dry East's 600,000 at 47.7% average 51.3%
 *   (2,669,000,000 / 5,200,000 = 513.27). The plain mean of the six regions would be 51.1%.
 * - Testland: 300,000 at 63.1% and Sandreach's 100,000 at 59.0% average 62.0%
 *   (248,300,000 / 400,000 = 620.75). The plain mean of the two would be 61.0%.
 */
describe.each([
  { ...withDrought[0], people: 600_000, ofPeople: 5_200_000, hungry: 477, fed: 518, all: 513 },
  { ...withDrought[1], people: 100_000, ofPeople: 400_000, hungry: 590, fed: 631, all: 620 },
])('national approval in $name when one region goes hungry', (land) => {
  it('weighs each region by its people, not region by region', () => {
    const start = createGame(withDroughtChance(land.file, { [land.regionId]: 1 }), 3);
    const { state, reports } = play(start, 6);

    expect(regionOf(state, land.regionId)).toMatchObject({
      population: land.people,
      approval: land.hungry,
      foodStage: 'shortage',
    });
    for (const region of state.regions) {
      if (region.id !== land.regionId) expect(region.approval).toBe(land.fed);
    }
    expect(state.regions.reduce((total, region) => total + region.population, 0)).toBe(
      land.ofPeople,
    );

    expect(national(state)).toBe(land.all);
    expect(reports.at(-1)?.approval.value).toBe(land.all);
  });
});

describe.each(withoutDrought)('approval in %s', (_name, country) => {
  it('does not move while the budget and the food situation stay as they started', () => {
    const start = createGame(country(), 3);
    const { reports, states } = play(start, 6);

    for (const state of states) expect(national(state)).toBe(national(start));
    for (const report of reports) {
      expect(report.approval.value).toBe(national(start));
      expect(report.approval.change).toBe(0);
    }
  });

  it('is the regions’ approval averaged by population', () => {
    const { state } = play(createGame(country(), 3), 3, harsh(createGame(country(), 3)));

    const people = state.regions.reduce((total, region) => total + region.population, 0);
    const weighted = state.regions.reduce(
      (total, region) => total + region.population * region.approval,
      0,
    );
    expect(national(state)).toBe(Math.floor(weighted / people));
  });

  it('falls when tax is raised and rises when it is cut', () => {
    const start = createGame(country(), 3);
    const raised = play(start, 1, budgetFrom(start.budget, { taxRatePercent: 30 }));
    const cut = play(start, 1, budgetFrom(start.budget, { taxRatePercent: 8 }));

    expect(national(raised.state)).toBeLessThan(national(start));
    expect(line(raised.reports[0], 'Tax rate')).toBeLessThan(0);
    expect(national(cut.state)).toBeGreaterThan(national(start));
    expect(line(cut.reports[0], 'Tax rate')).toBeGreaterThan(0);
  });

  it.each([
    ['health', 'Health spending'],
    ['education', 'Education spending'],
    ['security', 'Security spending'],
  ] as const)('falls when %s spending is withdrawn, and that alone is the cause', (area, label) => {
    const start = createGame(country(), 3);
    const { state, reports } = play(
      start,
      1,
      budgetFrom(start.budget, { spending: { [area]: 0 } }),
    );

    expect(national(state)).toBeLessThan(national(start));
    expect(line(reports[0], label)).toBe(reports[0]?.approval.change);
    for (const other of ['Food', 'Tax rate']) expect(line(reports[0], other)).toBe(0);
  });

  it('keeps moving for years after a large change, by a smaller step each quarter', () => {
    const start = createGame(country(), 3);
    const { reports } = play(start, 16, budgetFrom(start.budget, { taxRatePercent: 28 }));
    const changes = reports.map((report) => report.approval.change);

    // The first quarters each take a smaller step down, and it is still moving four years on.
    expect(changes[0]).toBeLessThan(0);
    expect(changes[1]).toBeLessThan(0);
    expect(changes[1]).toBeGreaterThan(changes[0] ?? 0);
    expect(changes[2]).toBeGreaterThan(changes[1] ?? 0);
    for (const change of changes) expect(change).toBeLessThan(0);
    expect(changes.at(-1)).toBeGreaterThan(changes[2] ?? 0);
  });

  it('settles after a small change', () => {
    const start = createGame(country(), 3);
    // Nothing for relief, which nobody needs here, so the treasury lasts the whole time.
    const budget = budgetFrom(start.budget, {
      taxRatePercent: start.budget.taxRatePercent + 1,
      spending: { foodRelief: 0 },
    });
    const { reports, state } = play(start, 16, budget);

    // One point of tax is worth 1.2 points of approval: it is all there within three years.
    expect(reports[0]?.approval.change).toBeLessThan(0);
    expect(reports.at(-1)?.approval.change).toBe(0);
    expect(national(state)).toBe(national(start) - 12);
  });

  it('recovers when the cause is removed', () => {
    const start = createGame(country(), 3);
    // Nothing for relief, which nobody needs here, so the treasury lasts the whole time.
    const usual = budgetFrom(start.budget, { spending: { foodRelief: 0 } });
    const raised = { ...usual, taxRatePercent: usual.taxRatePercent + 2 };
    const squeezed = play(start, 4, raised);
    const relaxed = play(squeezed.state, 16, usual);

    expect(national(squeezed.state)).toBeLessThan(national(start));
    expect(relaxed.reports[0]?.approval.change).toBeGreaterThan(0);
    expect(national(relaxed.state)).toBe(national(start));
  });

  it('reports contributions that add up to the change, every quarter', () => {
    const start = createGame(country(), 3);
    const budgets = [harsh(start), start.budget, budgetFrom(start.budget, { taxRatePercent: 5 })];
    let state = start;

    for (let quarter = 0; quarter < 18; quarter += 1) {
      const budget = budgets[Math.floor(quarter / 6)] ?? start.budget;
      const before = national(state);
      const result = advanceQuarter(state, { budget, reliefRegionId: null });
      state = result.state;

      const { approval } = result.report;
      expect(approval.value).toBe(national(state));
      expect(approval.change).toBe(national(state) - before);
      expect(approval.contributions.reduce((total, entry) => total + entry.amount, 0)).toBe(
        approval.change,
      );
      const causes = approvalStatus(state).causes;
      expect(causes.reduce((total, entry) => total + entry.amount, 0)).toBe(national(state));
    }
  });
});

describe('the tax rate in Tavara', () => {
  it('costs 1.2 points of approval for each point of tax above 18%, a tenth of it each quarter', () => {
    const start = createGame(withDroughtChance(tavaraFile, {}), 1);
    const { states, reports } = play(start, 2, budgetFrom(start.budget, { taxRatePercent: 28 }));

    // Ten points of tax are worth 12.0 points of approval. A tenth of that lands in the first
    // quarter (−1.2) and a tenth of what is left in the second (−1.1, rounded up from 1.08).
    expect(states.map(national)).toEqual([506, 495]);
    expect(reports[0]?.approval.contributions).toEqual([
      { label: 'Food', amount: 0 },
      { label: 'Tax rate', amount: -12 },
      { label: 'Health spending', amount: 0 },
      { label: 'Education spending', amount: 0 },
      { label: 'Security spending', amount: 0 },
    ]);
  });
});

describe.each(withDrought)('hunger in $name', ({ file, regionId }) => {
  it('pulls approval down in the hungry region and nowhere else', () => {
    // A drought every year and no relief: the region goes hungry in year 2.
    const start = createGame(withDroughtChance(file, { [regionId]: 1 }, 0), 1);
    const { states, reports } = play(start, 6);
    const tightAt = states.findIndex((state) => regionOf(state, regionId).foodStage !== 'adequate');

    expect(tightAt).toBeGreaterThan(0);
    const after = states[tightAt];
    if (after === undefined) throw new Error('The region never went hungry');
    expect(regionOf(after, regionId).approval).toBeLessThan(regionOf(start, regionId).approval);
    for (const region of after.regions) {
      if (region.id !== regionId) expect(region.approval).toBe(regionOf(start, region.id).approval);
    }
    expect(line(reports[tightAt], 'Food')).toBeLessThan(0);
    expect(line(reports[tightAt], 'Food')).toBe(reports[tightAt]?.approval.change);
  });
});

describe.each(withoutDrought)('unrest in %s', (_name, country) => {
  it('begins with strikes once a region’s approval is below 40%, and protests below 30%', () => {
    const start = createGame(country(), 5);
    const { states } = play(start, 16, harsh(start));

    for (const state of states) {
      for (const region of state.regions) {
        const expected =
          region.approval < 300 ? 'protests' : region.approval < 400 ? 'strikes' : 'calm';
        expect(region.unrest).toBe(expected);
      }
    }
    // Both stages were passed through on the way down.
    const seen = states.map((state) => state.regions[0]?.unrest);
    expect(seen).toContain('calm');
    expect(seen).toContain('strikes');
    expect(seen.at(-1)).toBe('protests');
    expect(seen.indexOf('strikes')).toBeLessThan(seen.indexOf('protests'));
  });

  it('lists the regions in unrest', () => {
    const start = createGame(country(), 5);
    const { state } = play(start, 16, harsh(start));

    expect(approvalStatus(state).unrest).toEqual(
      state.regions.map((region) => ({ regionId: region.id, unrest: 'protests' })),
    );
  });

  it('ends when approval recovers, protests first and then strikes', () => {
    const start = createGame(country(), 5);
    // Eleven quarters of the harsh budget, then nine of the lowest tax: the term has room for both.
    const fallen = play(start, 11, harsh(start));
    const { states } = play(fallen.state, 9, budgetFrom(start.budget, { taxRatePercent: 5 }));

    const seen = states.map((state) => state.regions[0]?.unrest);
    expect(seen).toContain('strikes');
    expect(seen.at(-1)).toBe('calm');
    expect(seen.lastIndexOf('protests')).toBeLessThan(seen.indexOf('strikes'));
    expect(seen.lastIndexOf('strikes')).toBeLessThan(seen.lastIndexOf('calm'));
  });

  it('reports each start and each end once, in the region it happened in', () => {
    const start = createGame(country(), 5);
    const fallen = play(start, 11, harsh(start));
    const recovered = play(fallen.state, 9, budgetFrom(start.budget, { taxRatePercent: 5 }));
    const entries = [...fallen.reports, ...recovered.reports].flatMap((report) => report.entries);
    const regionId = start.regions[0]?.id;
    const here = entries.filter(
      (entry) => entry.regionId === regionId && ['strike', 'protest'].includes(entry.kind),
    );
    const name = start.country.regions[0]?.name ?? '';

    expect(here.map((entry) => [entry.kind, entry.seriousness, entry.headline])).toEqual([
      ['strike', 'warning', `Strikes in ${name}`],
      ['protest', 'serious', `Protests in ${name}`],
      ['protest', 'notable', `The protests in ${name} have ended`],
      ['strike', 'notable', `The strikes in ${name} have ended`],
    ]);
  });
});

describe('strikes in Tavara', () => {
  /** Tavara with every region on strike, reached by four quarters of the harsh budget. */
  function struck(): GameState {
    const start = createGame(withDroughtChance(tavaraFile, {}), 1);
    return play(start, 4, harsh(start)).state;
  }

  it('begin four quarters after tax goes to 40% and public spending to nothing, and protests three later', () => {
    const start = createGame(withDroughtChance(tavaraFile, {}), 1);
    const { states, reports } = play(start, 7, harsh(start));

    // The harsh budget is worth −40.4 points in the end, and a tenth of what is left of
    // each part of that lands each quarter, rounded up. Approval goes 51.8% → 47.6% →
    // 43.8% → 40.4% → 37.3% → 34.4% → 31.8% → 29.6%: calm for three quarters, strikes
    // after the fourth and protests after the seventh.
    expect(states.map(national)).toEqual([476, 438, 404, 373, 344, 318, 296]);
    expect(states.map((state) => regionOf(state, 'arden-vale').unrest)).toEqual([
      'calm',
      'calm',
      'calm',
      'strikes',
      'strikes',
      'strikes',
      'protests',
    ]);
    expect(reports[3]?.entries).toContainEqual({
      kind: 'strike',
      seriousness: 'warning',
      headline: 'Strikes in Arden Vale',
      cause:
        'Approval there has fallen to 37.3%, below the 40% at which strikes begin. While they last the region produces 30% less.',
      regionId: 'arden-vale',
    });
    expect(reports[6]?.entries).toContainEqual({
      kind: 'protest',
      seriousness: 'serious',
      headline: 'Protests in Arden Vale',
      cause:
        'Approval there has fallen to 29.6%, below the 30% at which protests begin. While they last the region produces 60% less.',
      regionId: 'arden-vale',
    });
  });

  it('cut the region’s output, and so the tax it pays, in the quarters that follow', () => {
    const start = createGame(withDroughtChance(tavaraFile, {}), 1);
    const { reports } = play(start, 8, harsh(start));
    const treasuryLine = (report: TurnReport | undefined, label: string) =>
      report?.treasury.contributions.find((entry) => entry.label === label)?.amount;

    // Arden Vale produces $52.0m a quarter: $20.8m of tax at 40%.
    expect(treasuryLine(reports[3], 'Tax from Arden Vale')).toBe(208);
    expect(treasuryLine(reports[3], 'Lost to strikes in Arden Vale')).toBeUndefined();
    // On strike it produces 30% less, $36.4m, which pays $14.6m: $6.2m is lost.
    expect(treasuryLine(reports[4], 'Tax from Arden Vale')).toBe(208);
    expect(treasuryLine(reports[4], 'Lost to strikes in Arden Vale')).toBe(-62);
    // In protest it produces 60% less, $20.8m, which pays $8.3m: $12.5m is lost.
    expect(treasuryLine(reports[7], 'Tax from Arden Vale')).toBe(208);
    expect(treasuryLine(reports[7], 'Lost to protests in Arden Vale')).toBe(-125);
  });

  it('leave the treasury breakdown adding up to the change', () => {
    const game = struck();
    const { report, state } = advanceQuarter(game, { budget: game.budget, reliefRegionId: null });

    expect(report.treasury.contributions.reduce((total, entry) => total + entry.amount, 0)).toBe(
      state.treasury - game.treasury,
    );
  });

  it('are counted in the revenue the preview projects', () => {
    const game = struck();
    const decisions: Decisions = { budget: game.budget, reliefRegionId: null };

    const preview = previewQuarter(game, decisions);
    const { state } = advanceQuarter(game, decisions);

    // Tax at 40% on output of $172.0m would be $68.8m. With every region producing 30%
    // less it is $48.2m, each region's tax being rounded to the nearest $0.1m.
    expect(preview.revenue).toEqual({ min: 482, max: 482 });
    expect(preview.treasury).toEqual({ min: state.treasury, max: state.treasury });
  });
});

describe.each(withoutDrought)('previewing approval in %s', (_name, country) => {
  it('gives approval after the quarter exactly as it then turns out', () => {
    const start = createGame(country(), 9);
    const budgets = [
      harsh(start),
      budgetFrom(start.budget, { taxRatePercent: 25, spending: { health: 200 } }),
      budgetFrom(start.budget, { taxRatePercent: 5 }),
    ];
    let game = start;

    for (let quarter = 0; quarter < 15; quarter += 1) {
      const decisions: Decisions = {
        budget: budgets[Math.floor(quarter / 5)] ?? start.budget,
        reliefRegionId: null,
      };
      const preview = previewQuarter(game, decisions);
      const { state } = advanceQuarter(game, decisions);

      expect(preview.approval).toEqual({ min: national(state), max: national(state) });
      expect(preview.unrest).toEqual(approvalStatus(state).unrest);
      game = state;
    }
  });

  it('says where approval is heading if the decisions are left as they are', () => {
    const start = createGame(country(), 9);
    // A small change, so that approval gets there within the term. Nothing for relief,
    // which nobody needs here, so the treasury lasts.
    const budget = budgetFrom(start.budget, {
      taxRatePercent: start.budget.taxRatePercent + 2,
      spending: { foodRelief: 0 },
    });

    const preview = previewQuarter(start, { budget });
    const { state } = play(start, 19, budget);

    expect(preview.approvalHeading.min).toBeLessThan(preview.approval.min);
    expect(preview.approvalHeading).toEqual({ min: national(state), max: national(state) });
  });

  it('shows no movement for the budget in force', () => {
    const start = createGame(country(), 9);

    const preview = previewQuarter(start, { budget: start.budget });

    expect(preview.approval).toEqual({ min: national(start), max: national(start) });
    expect(preview.approvalHeading).toEqual(preview.approval);
    expect(preview.unrest).toEqual([]);
  });
});

describe.each(withDrought)(
  'previewing approval in $name through a famine',
  ({ file, regionId }) => {
    it('stays exact while people go hungry and die', () => {
      let game = createGame(withDroughtChance(file, { [regionId]: 1 }, 0), 1);

      for (let quarter = 0; quarter < 12 && game.outcome.status === 'playing'; quarter += 1) {
        const decisions: Decisions = { budget: game.budget, reliefRegionId: null };
        const preview = previewQuarter(game, decisions);
        const before = national(game);
        const { state, report } = advanceQuarter(game, decisions);

        expect(preview.approval).toEqual({ min: national(state), max: national(state) });
        expect(report.approval.change).toBe(national(state) - before);
        expect(
          report.approval.contributions.reduce((total, entry) => total + entry.amount, 0),
        ).toBe(report.approval.change);
        game = state;
      }

      // The scenario did end in famine, so the sums above were tested with people dying.
      expect(game.outcome.status).toBe('lost');
    });
  },
);
