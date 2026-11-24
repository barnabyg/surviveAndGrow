import { describe, expect, it } from 'vitest';
import tavaraFile from '../../src/countries/tavara.json';
import {
  advanceQuarter,
  createGame,
  loadCountry,
  risksAhead,
  withinAusterity,
  type Budget,
  type Country,
  type Decisions,
  type GameState,
  type TurnReport,
} from '../../src/sim';
import testlandFile from '../countries/testland.json';
import { withChances, withDroughtChance, withoutPoweredMines } from './countries';
import { steward } from './playing';
import { budgetFrom } from '../budgets';

/*
 * World price shocks played out over whole games, in both countries: each comes, is reported
 * as it is announced, begins and ends, and a player who prepares for it comes through better
 * than one who does not.
 */

/** Plays quarters, each decided by the function given, and keeps every state and report. */
function play(start: GameState, quarters: number, decide: (game: GameState) => Decisions) {
  const states = [start];
  const reports: TurnReport[] = [];
  for (let quarter = 0; quarter < quarters; quarter += 1) {
    const game = states.at(-1) ?? start;
    if (game.outcome.status !== 'playing') break;
    const result = advanceQuarter(game, decide(game));
    states.push(result.state);
    reports.push(result.report);
  }
  return { states, reports, state: states.at(-1) ?? start };
}

const headlines = (reports: readonly TurnReport[]) =>
  reports.flatMap((report) =>
    report.entries.filter((entry) => entry.kind === 'priceShock').map((entry) => entry.headline),
  );

/** The grain bought abroad over the quarters reported, in tonnes, and what it cost. */
function imported(reports: readonly TurnReport[]) {
  const lines = (figure: 'food' | 'treasury') =>
    reports.flatMap((report) =>
      report[figure].contributions.filter((line) => line.label === 'Grain imported'),
    );
  return {
    tonnes: lines('food').reduce((total, line) => total + line.amount, 0),
    cost: -lines('treasury').reduce((total, line) => total + line.amount, 0),
  };
}

const files = [
  ['Tavara', tavaraFile],
  ['Testland', testlandFile],
] as const;

describe.each(files)('failed harvests abroad, over four years in %s', (_name, file) => {
  // Harvests fail abroad whenever they can, and the country lives on grain bought abroad,
  // with a treasury that can pay for it.
  const country = (): Country => {
    const shocked = withChances(file, { shocks: { failedHarvestsAbroad: 1 } });
    return loadCountry({
      ...(shocked.source as object),
      start: { ...(shocked.source as { start: object }).start, treasury: 1000 },
    });
  };
  const usual = 5000;

  /** Buys the same grain every quarter, whatever the price. */
  const unprepared = (game: GameState): Decisions => ({
    ...steward(game),
    trade: [{ good: 'grain', direction: 'import', tonnes: usual }],
  });

  /**
   * Buys the same grain over the years, but while harvests abroad are known to be failing
   * and the price is not yet pushed up, buys ahead what the shock's three quarters would need,
   * and then buys none while it lasts.
   */
  const prepared = (game: GameState): Decisions => {
    const shock = game.priceShocks.find((each) => each.type === 'failedHarvestsAbroad');
    const now = game.date.year * 4 + game.date.quarter;
    const begins = shock === undefined ? null : shock.begins.year * 4 + shock.begins.quarter;
    const ahead = begins === null ? 0 : begins - now;
    const tonnes =
      ahead === 2
        ? usual + 7000
        : ahead === 1
          ? usual + 8000
          : ahead <= 0 && begins !== null
            ? 0
            : usual;
    return {
      ...steward(game),
      trade: tonnes === 0 ? [] : [{ good: 'grain', direction: 'import', tonnes }],
    };
  };

  // Shocks are announced as quarters 2, 7, 12 and 17 begin and are in force in 4 to 6, 9 to
  // 11 and 14 to 16, so sixteen quarters take in three whole shocks.
  const quarters = 16;

  it('comes again and again, each announced ahead, begun and ended in the report', () => {
    const { reports } = play(createGame(country(), 5), quarters, unprepared);

    expect(headlines(reports)).toEqual([
      'Failed harvests abroad ahead',
      'Failed harvests abroad pushes the world grain price up',
      'Failed harvests abroad ahead',
      'Failed harvests abroad has ended',
      'Failed harvests abroad pushes the world grain price up',
      'Failed harvests abroad ahead',
      'Failed harvests abroad has ended',
      'Failed harvests abroad pushes the world grain price up',
      'Failed harvests abroad ahead',
      'Failed harvests abroad has ended',
    ]);
  });

  it('costs a player who stocks the reserve ahead of it less than one who does not', () => {
    const late = play(createGame(country(), 5), quarters, unprepared);
    const early = play(createGame(country(), 5), quarters, prepared);

    // The same grain, bought for less.
    expect(imported(early.reports).tonnes).toBe(usual * quarters);
    expect(imported(late.reports).tonnes).toBe(usual * quarters);
    expect(imported(early.reports).cost).toBeLessThan(imported(late.reports).cost);
    expect(early.state.treasury).toBeGreaterThan(late.state.treasury);
  });
});

/** A country rich enough to build its first mine's chain at once, with no drought or dilemma. */
function rich(file: unknown, glut: number): Country {
  const copy = withoutPoweredMines(file) as { start: { treasury: number } };
  copy.start.treasury = 2000;
  const calm = withDroughtChance(copy, {});
  return loadCountry({
    ...(calm.source as object),
    priceShockLikelihood: { oreGlut: glut },
  });
}

/** The game, seed 11, once the whole chain of the country's first mine has been built. */
function minesEarning(file: unknown): GameState {
  const country = rich(file, 0);
  const mine = country.sites.find((site) => site.type === 'mine');
  const road = country.sites.find(
    (site) => site.type === 'trunkRoad' && mine?.dependsOn.includes(site.id),
  );
  const port = country.sites.find(
    (site) => site.type === 'port' && road?.dependsOn.includes(site.id),
  );
  const chain = [mine, road, port].map((site) => site?.id ?? '');
  const budget: Budget = budgetFrom(country.start.budget, {
    taxRatePercent: 25,
    spending: { upkeep: 40 },
  });
  return play(createGame(country, 11), 9, (game) => ({
    ...steward(game, budget),
    startProjects: game.history.length === 1 ? chain : [],
  })).state;
}

/**
 * Each country with its mine earning, and health and education set so that the budget lives
 * on the mine's tax: with them, a loan the mine could repay at ordinary prices is one too many
 * when its ore sells for less.
 */
const mining = [
  { name: 'Tavara', file: tavaraFile, health: 130, education: 130 },
  { name: 'Testland', file: testlandFile, health: 40, education: 30 },
] as const;

describe.each(mining)('an ore glut in $name, with the mine earning', (scenario) => {
  const { file, health, education } = scenario;
  const earning = minesEarning(file);
  // Testland's mine soon wins it the game, so here it has only begun to hold prosperity.
  const from = (glut: number): GameState => ({
    ...earning,
    country: rich(file, glut),
    treasury: 50,
    prosperousQuarters: 0,
  });
  const budget: Budget = budgetFrom(earning.budget, {
    taxRatePercent: 25,
    spending: { upkeep: 40, health, education },
  });
  // The spree: $80.0m a quarter over these four areas and Defence together.
  const lavish: Budget = budgetFrom(budget, {
    spending: {
      agriculture: 200,
      health: 200,
      education: 200,
      security: 200 - budget.spending.defence,
    },
  });

  /** Keeps the budget, within any austerity a bailout brings. */
  const careful = (game: GameState): Decisions => steward(game, withinAusterity(game, budget));
  /**
   * Borrows $50.0m over four quarters in the second quarter, once the glut is announced, and
   * spends it on the services the quarter after.
   */
  const borrower =
    (start: GameState) =>
    (game: GameState): Decisions => {
      const played = game.history.length - start.history.length;
      return {
        ...steward(game, withinAusterity(game, played === 2 ? lavish : budget)),
        borrow: played === 1 ? [{ kind: 'loan', amount: 500, quarters: 4 }] : [],
      };
    };
  const trouble = (reports: readonly TurnReport[]) =>
    reports.filter((report) =>
      report.entries.some((entry) => entry.kind === 'spendingCut' || entry.kind === 'bailout'),
    ).length;

  it('is announced, pushes the ore price down and ends, in the report', () => {
    const { reports } = play(from(1), 6, careful);
    const whole = [
      'Ore glut ahead',
      'Ore glut pushes the world ore price down',
      'Ore glut ahead',
      'Ore glut has ended',
    ];

    // Testland's mine wins it the game before the glut has run its course.
    const seen = headlines(reports);
    expect(seen).toEqual(whole.slice(0, seen.length));
    expect(seen.length).toBeGreaterThanOrEqual(reports.length === 6 ? 4 : 2);
  });

  it('leaves a player who avoids a loan untroubled, and troubles one who takes it', () => {
    const glut = from(1);
    const prepared = play(glut, 8, careful);
    const unprepared = play(glut, 8, borrower(glut));
    // At ordinary ore prices the same loan would have been repaid without trouble.
    const calm = from(0);
    const lucky = play(calm, 8, borrower(calm));

    expect(trouble(prepared.reports)).toBe(0);
    expect(trouble(lucky.reports)).toBe(0);
    expect(trouble(unprepared.reports)).toBeGreaterThan(0);
  });

  it('is warned of before the loan is taken, and the trouble it brings before it comes', () => {
    const glut = from(1);
    const { states, reports } = play(glut, 8, borrower(glut));
    const announced = states[1];
    if (announced === undefined) throw new Error('The game ended');

    // As the borrower decides to borrow, the glut is on the risks.
    const risks = risksAhead(announced, borrower(glut)(announced));
    expect(risks.map((risk) => risk.headline)).toContain('Ore glut ahead');
    const first = reports.findIndex((report) =>
      report.entries.some((entry) => entry.kind === 'spendingCut' || entry.kind === 'bailout'),
    );
    // A quarter before trouble comes, while the player could still act, it is warned of.
    const before = states[first - 1];
    if (before === undefined) throw new Error('No trouble came');
    const warned = risksAhead(before, borrower(glut)(before)).filter(
      (risk) => risk.kind === 'treasury' || risk.kind === 'bailout',
    );
    expect(warned).not.toEqual([]);
  });
});
