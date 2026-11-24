import { describe, expect, it } from 'vitest';
import tavaraFile from '../../src/countries/tavara.json';
import {
  advanceQuarter,
  createGame,
  REPORT_KINDS,
  SERIOUSNESS_LEVELS,
  type Budget,
  type Decisions,
  type GameState,
  type ReportEntry,
  type TurnReport,
} from '../../src/sim';
import testlandFile from '../countries/testland.json';
import { bothCountries, tavara, testland, withDroughtChance } from './countries';
import { budgetFrom, budgetOf, lavish } from '../budgets';

const neglect = (game: GameState): Decisions => ({ budget: game.budget, reliefRegionId: null });

/** Ends one quarter with no relief sent anywhere. */
function reportOn(game: GameState, budget: Budget = game.budget): TurnReport {
  return advanceQuarter(game, { budget, reliefRegionId: null }).report;
}

/** The reports of each quarter played, until the count is reached or the game ends. */
function reportsOf(
  start: GameState,
  quarters: number,
  decide: (game: GameState) => Decisions = neglect,
): TurnReport[] {
  const reports: TurnReport[] = [];
  let game = start;
  for (let quarter = 0; quarter < quarters && game.outcome.status === 'playing'; quarter += 1) {
    const result = advanceQuarter(game, decide(game));
    game = result.state;
    reports.push(result.report);
  }
  return reports;
}

const headlines = (report: TurnReport | undefined) =>
  report?.entries.map((entry) => entry.headline);

/** Taxed at the top rate and spending next to nothing, so the treasury grows every quarter. */
const thrifty: Budget = budgetOf({ taxRatePercent: 40, spending: { agriculture: 10 } });

/** Each country as it ships, but with no chance of drought anywhere. */
const withoutDrought = [
  ['Tavara', () => withDroughtChance(tavaraFile, {})],
  ['Testland', () => withDroughtChance(testlandFile, {})],
] as const;

/** Each country with one region that drought strikes every year. */
const withDrought = [
  { name: 'Tavara', file: tavaraFile, regionId: 'dry-east', regionName: 'The Dry East' },
  { name: 'Testland', file: testlandFile, regionId: 'sandreach', regionName: 'Sandreach' },
] as const;

describe('the budget outcome in the turn report', () => {
  it('says how long the treasury lasts when the quarter ran a deficit', () => {
    const report = reportOn(createGame(tavara(), 1));

    // Revenue $31.0m against spending $38.0m leaves $35.0m, which covers 5 more such quarters.
    expect(report.entries).toContainEqual({
      kind: 'budget',
      seriousness: 'warning',
      headline: 'The treasury is shrinking',
      cause:
        'Spending of $38.0m outran revenue of $31.0m. At this deficit the treasury lasts 5 more quarters.',
    });
  });

  it('counts a single quarter left in the singular', () => {
    const game = createGame(tavara(), 1);
    const budget = budgetOf({
      taxRatePercent: game.budget.taxRatePercent,
      spending: {
        agriculture: 200,
        foodRelief: 70,
        health: 70,
        education: 100,
        security: 50,
        defence: 0,
      },
    });

    const report = reportOn(game, budget);

    // $42.0m in hand, revenue $31.0m and spending $49.0m: the $24.0m left covers one more
    // deficit of $18.0m and not a second.
    expect(report.entries).toContainEqual(
      expect.objectContaining({
        kind: 'budget',
        cause:
          'Spending of $49.0m outran revenue of $31.0m. At this deficit the treasury lasts 1 more quarter.',
      }),
    );
  });

  it('says when the treasury cannot pay for another quarter like the last', () => {
    const report = reportOn(createGame(tavara(), 1), lavish);

    // The cut left $0.1m in the treasury against a deficit of $41.9m.
    expect(report.entries).toContainEqual({
      kind: 'budget',
      seriousness: 'warning',
      headline: 'The treasury is shrinking',
      cause:
        'Spending of $50.5m outran revenue of $8.6m. The treasury cannot cover another quarter like it.',
    });
  });

  it('is routine when the quarter ran a surplus', () => {
    // Testland's starting budget spends all it raises, so this one leaves agriculture out.
    const game = createGame(testland(), 1);
    const report = reportOn(game, budgetFrom(game.budget, { spending: { agriculture: 0 } }));

    expect(report.entries).toContainEqual({
      kind: 'budget',
      seriousness: 'routine',
      headline: 'The treasury is growing',
      cause: 'Revenue of $5.0m outran spending of $4.0m, leaving $1.0m over.',
    });
  });

  it('is routine when revenue and spending were the same', () => {
    const game = createGame(testland(), 1);
    const budget = budgetOf({
      taxRatePercent: game.budget.taxRatePercent,
      spending: { agriculture: 20, health: 10, education: 10, security: 10, defence: 0 },
    });

    const report = reportOn(game, budget);

    expect(report.entries).toContainEqual({
      kind: 'budget',
      seriousness: 'routine',
      headline: 'The budget balanced',
      cause: 'Revenue and spending were both $5.0m.',
    });
  });
});

describe.each(bothCountries)('every turn report in %s', (_name, country) => {
  const reports = [1, 2, 3].flatMap((seed) => reportsOf(createGame(country(), seed), 20));

  it('carries exactly one entry for the budget outcome', () => {
    for (const report of reports) {
      expect(report.entries.filter((entry) => entry.kind === 'budget')).toHaveLength(1);
    }
  });

  it('puts the most serious entries first', () => {
    const rank = (entry: ReportEntry) => SERIOUSNESS_LEVELS.indexOf(entry.seriousness);
    for (const report of reports) {
      const ranks = report.entries.map(rank);
      expect(ranks).toEqual([...ranks].sort((a, b) => b - a));
    }
  });

  it('uses only the kinds and levels of seriousness the game knows', () => {
    for (const entry of reports.flatMap((report) => report.entries)) {
      expect(REPORT_KINDS).toContain(entry.kind);
      expect(SERIOUSNESS_LEVELS).toContain(entry.seriousness);
      expect(entry.headline).not.toBe('');
      expect(entry.cause).not.toBe('');
    }
  });
});

describe('a forced spending cut', () => {
  it('is reported ahead of the deficit that caused it', () => {
    const report = reportOn(createGame(withDroughtChance(tavaraFile, {}), 1), lavish);

    // A deficit that size also cuts the credit rating.
    expect(report.entries.map((entry) => [entry.kind, entry.seriousness])).toEqual([
      ['spendingCut', 'serious'],
      ['creditRating', 'warning'],
      ['budget', 'warning'],
    ]);
  });
});

describe.each(withoutDrought)(
  'a quarter in %s in which nothing notable happened',
  (_name, country) => {
    it('says so, ahead of the routine entries', () => {
      const report = reportOn(createGame(country(), 1), thrifty);

      expect(report.entries).toEqual([
        {
          kind: 'quiet',
          seriousness: 'routine',
          headline: 'A quiet quarter',
          cause: 'Nothing notable happened.',
        },
        expect.objectContaining({ kind: 'budget', headline: 'The treasury is growing' }),
      ]);
    });

    it('is not called quiet once something notable does happen', () => {
      // The fourth quarter brings the harvest in.
      const reports = reportsOf(createGame(country(), 1), 4, () => ({ budget: thrifty }));

      expect(headlines(reports[3])).toContain('The harvest is in');
      expect(headlines(reports[3])).not.toContain('A quiet quarter');
    });

    it('is not called quiet when the budget ran a deficit', () => {
      const game = createGame(country(), 1);
      const budget = budgetFrom(thrifty, {
        taxRatePercent: 5,
        spending: { health: 200, education: 200 },
      });

      const report = reportOn(game, budget);

      expect(headlines(report)).toContain('The treasury is shrinking');
      expect(headlines(report)).not.toContain('A quiet quarter');
    });
  },
);

describe.each(withDrought)('a drought left alone in $name', ({ file, regionId, regionName }) => {
  const game = createGame(withDroughtChance(file, { [regionId]: 1 }), 1);
  // A year to the failed harvest, then a quarter each of tight and shortage, and two of famine.
  const reports = reportsOf(game, 40);
  const about = (report: TurnReport | undefined, kind: ReportEntry['kind']) =>
    report?.entries.filter((entry) => entry.kind === kind && entry.regionId === regionId);

  it('is reported in its region when it begins, ahead of the budget outcome', () => {
    expect(reports[0]?.entries[0]).toMatchObject({
      kind: 'event',
      seriousness: 'serious',
      headline: `Drought in ${regionName}`,
      regionId,
    });
    expect(reports[0]?.entries.at(-1)).toMatchObject({ kind: 'budget' });
  });

  it('is reported as ended once the harvest is in', () => {
    expect(about(reports[3], 'event')).toEqual([
      expect.objectContaining({
        seriousness: 'notable',
        headline: `The drought in ${regionName} has ended`,
      }),
    ]);
  });

  it('reports each stage of the hunger that follows as more serious than the last', () => {
    expect(
      [4, 5, 6].map((quarter) =>
        about(reports[quarter], 'hunger')?.map((entry) => [entry.headline, entry.seriousness]),
      ),
    ).toEqual([
      [[`Food is tight in ${regionName}`, 'warning']],
      [[`Food shortage in ${regionName}`, 'serious']],
      [[`Famine in ${regionName}`, 'critical']],
    ]);
  });

  it('leads the last report with the collapse of the state, in the region that starved', () => {
    expect(reports).toHaveLength(8);
    expect(reports[7]?.entries[0]).toEqual({
      kind: 'collapse',
      seriousness: 'critical',
      headline: 'The state has collapsed',
      cause: `Famine held ${regionName} for 2 quarters running. The state has collapsed.`,
      regionId,
    });
    expect(reports[7]?.entries[1]).toMatchObject({
      kind: 'hunger',
      seriousness: 'critical',
      headline: `Famine in ${regionName}`,
    });
  });
});

describe.each(withDrought)('a region relieved in $name', ({ file, regionId, regionName }) => {
  it('is reported as having enough food again once it is fed', () => {
    const game = createGame(withDroughtChance(file, { [regionId]: 1 }), 1);
    // Neglected for a year and a quarter, then sent all the relief it needs.
    const relieved = (state: GameState): Decisions => ({
      budget: budgetFrom(thrifty, { taxRatePercent: 40, spending: { foodRelief: 200 } }),
      reliefRegionId: state.date.year > 2 || state.date.quarter > 1 ? regionId : null,
    });

    const reports = reportsOf(game, 6, (state) =>
      state.date.year === 1 ? neglect(state) : relieved(state),
    );

    expect(headlines(reports[4])).toContain(`Food is tight in ${regionName}`);
    expect(reports[5]?.entries).toContainEqual({
      kind: 'hunger',
      seriousness: 'notable',
      headline: `${regionName} has enough food again`,
      cause: 'Its food situation is now: Adequate.',
      regionId,
    });
  });
});
