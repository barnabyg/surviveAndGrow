import { describe, expect, it } from 'vitest';
import tavaraFile from '../../src/countries/tavara.json';
import {
  advanceQuarter,
  createGame,
  electionStatus,
  siteSchedule,
  termCalendar,
  termRecords,
  victoryStatus,
  type Budget,
  type Country,
  type GameState,
  type TurnReport,
} from '../../src/sim';
import testlandFile from '../countries/testland.json';
import { startingAt, withChances } from './countries';
import { budgetFrom } from '../budgets';

/**
 * Each country with no drought and no dilemmas, started at a tax rate that holds approval
 * where it starts with an unchanged budget: `approving` 3 points or more above the 50% the
 * vote needs, so it wins every election whatever the campaign does (see election.test.ts).
 */
const lands = [
  {
    name: 'Tavara',
    approving: () => startingAt(tavaraFile, 12),
    // With a tenth of its people, starting on nothing for health and education and then
    // spending $3.0m a quarter on each, it passes into Prosperous in the second term.
    rising: () => wealthy(tavaraFile, 0, 10),
    generousSpending: 30,
  },
  {
    name: 'Testland',
    approving: () => startingAt(testlandFile, 20),
    // With all its people, starting on nothing for either and then spending $4.0m a quarter
    // on each, it passes into Prosperous in the second term.
    rising: () => wealthy(testlandFile, 0, 1),
    generousSpending: 40,
  },
] as const;

interface Wealth {
  regions: { population: number }[];
  start: { treasury: number; budget: { spending: Record<string, number> } };
}

/**
 * A country file with its people divided by the number given, so that every region is as
 * rich per head as wanted, and a treasury that lasts. It starts with the spending on health
 * and education given, in millions a quarter, which sets where their levels start. No
 * drought or dilemma comes.
 */
function wealthy(file: unknown, services: number, peopleDividedBy = 10): Country {
  const copy = structuredClone(file) as Wealth;
  for (const region of copy.regions) {
    region.population = Math.round(region.population / peopleDividedBy);
  }
  copy.start.treasury = 2000;
  copy.start.budget.spending.health = services;
  copy.start.budget.spending.education = services;
  return withChances(copy, {});
}

/** Low tax, and the amount given, in Money units, on each of health and education. */
function generous(game: GameState, amount: number): Budget {
  return budgetFrom(game.budget, {
    taxRatePercent: 10,
    spending: { health: amount, education: amount },
  });
}

/** Taxes at 40% and spends nothing on the public, which loses any election. */
function harsh(game: GameState): Budget {
  return budgetFrom(game.budget, {
    taxRatePercent: 40,
    spending: { health: 0, education: 0, security: 0 },
  });
}

interface Played {
  readonly state: GameState;
  readonly reports: readonly TurnReport[];
}

/** Plays quarters with the budget given for each, until the count is reached or the game ends. */
function play(start: GameState, quarters: number, budget = (game: GameState) => game.budget) {
  let state = start;
  const reports: TurnReport[] = [];
  for (let quarter = 0; quarter < quarters && state.outcome.status === 'playing'; quarter += 1) {
    const result = advanceQuarter(state, { budget: budget(state), reliefRegionId: null });
    state = result.state;
    reports.push(result.report);
  }
  return { state, reports } satisfies Played;
}

describe.each(lands)('a re-election in $name', (land) => {
  const country = (): Country => land.approving();

  it('starts a new term instead of ending the game, and the report says so', () => {
    const { state, reports } = play(createGame(country(), 3), 20);

    expect(state.outcome).toEqual({ status: 'playing' });
    expect(state.date).toEqual({ year: 6, quarter: 1 });
    const entry = reports.at(-1)?.entries.find((each) => each.kind === 'election');
    expect(entry).toMatchObject({ seriousness: 'notable', headline: 'You won the election' });
    expect(entry?.cause).toMatch(
      /Your second term begins, and the next election is held at the end of Year 10, Quarter 4\.$/,
    );
  });

  it('counts down to the next election, at the end of the new term', () => {
    const { state } = play(createGame(country(), 3), 20);

    expect(electionStatus(state)).toEqual({
      term: 2,
      termQuarters: 20,
      date: { year: 10, quarter: 4 },
      quartersAway: 19,
      needed: 500,
    });
  });

  it('holds the next election at the end of the 40th quarter', () => {
    const { reports } = play(createGame(country(), 3), 40);

    const held = reports.flatMap((report, index) =>
      report.entries.some((entry) => entry.kind === 'election') ? [index + 1] : [],
    );
    expect(held).toEqual([20, 40]);
  });
});

describe.each(lands)('a defeat in a later term in $name', (land) => {
  it('ends the game at the vote that closes the second term', () => {
    const reelected = play(createGame(land.approving(), 3), 20).state;

    const { state, reports } = play(reelected, 40, harsh);

    expect(reports).toHaveLength(20);
    expect(state.date).toEqual({ year: 11, quarter: 1 });
    expect(state.outcome).toMatchObject({
      status: 'lost',
      cause: 'election',
      headline: 'You lost the election',
    });
    expect(electionStatus(state)).toMatchObject({ term: 2, date: { year: 10, quarter: 4 } });
  });
});

describe.each(lands)('the win on prosperity in $name', (land) => {
  it('comes once prosperity has stood in Prosperous for four quarters running', () => {
    const passed: number[] = [];
    const held: number[] = [];
    let game = createGame(land.rising(), 3);
    let last: TurnReport | undefined;
    while (game.outcome.status === 'playing' && game.history.length <= 60) {
      const result = advanceQuarter(game, { budget: generous(game, land.generousSpending) });
      if (result.state.tier === 'prosperous' && game.tier !== 'prosperous') {
        passed.push(game.history.length);
      }
      game = result.state;
      held.push(victoryStatus(game).held);
      last = result.report;
    }

    // It passed into the top tier once, after the first election had been won, and the game
    // was won as the fourth quarter in that tier ended.
    expect(passed).toHaveLength(1);
    const [reached = 0] = passed;
    expect(reached).toBeGreaterThan(20);
    expect(held.slice(reached - 1)).toEqual([1, 2, 3, 4]);
    expect(held.slice(0, reached - 1).every((count) => count === 0)).toBe(true);
    expect(game.history).toHaveLength(reached + 4);
    expect(electionStatus(game).term).toBe(2);
    expect(game.outcome).toEqual({
      status: 'won',
      cause: 'prosperity',
      headline: 'The nation is prosperous',
      summary:
        'National prosperity has stood in Prosperous, from 42 up, for 4 quarters running. You have won.',
    });
    expect(last?.entries).toContainEqual({
      kind: 'victory',
      seriousness: 'notable',
      headline: 'The nation is prosperous',
      cause:
        'National prosperity has stood in Prosperous, from 42 up, for 4 quarters running. You have won.',
    });
    expect(() => advanceQuarter(game, { budget: game.budget })).toThrow('The game is over.');
  });

  it('shows how many of the four quarters have been held', () => {
    const game = createGame(wealthy(land.name === 'Tavara' ? tavaraFile : testlandFile, 20), 3);

    expect(game.tier).toBe('prosperous');
    expect(victoryStatus(game)).toMatchObject({ tier: 'prosperous', held: 0, needed: 4 });
    const next = advanceQuarter(game, { budget: game.budget }).state;
    expect(victoryStatus(next)).toMatchObject({ tier: 'prosperous', held: 1, needed: 4 });
  });
});

describe.each(lands)('the timeline of a second term in $name', (land) => {
  it('lays out the 20 quarters of the new term, with its own election', () => {
    const { state } = play(createGame(land.approving(), 3), 21);

    const calendar = termCalendar(state);

    expect(calendar).toMatchObject({ term: 2, termQuarters: 20, now: 22 });
    expect(calendar.quarters.map((quarter) => quarter.number)).toEqual(
      Array.from({ length: 20 }, (_, index) => index + 21),
    );
    expect(calendar.quarters[0]?.date).toEqual({ year: 6, quarter: 1 });
    expect(calendar.quarters.filter((quarter) => quarter.election).map((q) => q.number)).toEqual([
      40,
    ]);
    expect(calendar.quarters.map((quarter) => quarter.when).slice(0, 3)).toEqual([
      'past',
      'now',
      'ahead',
    ]);
  });

  it('counts the quarters a site would be in use before the vote that closes the term', () => {
    const { state } = play(createGame(land.approving(), 3), 21);
    const store = state.country.sites.find((site) => site.type === 'grainStore')?.id ?? '';

    // Built in quarters 22 and 23, in use from 24 to 40.
    expect(siteSchedule(state, store)).toMatchObject({
      begins: 22,
      opens: 24,
      inUseBeforeVote: 17,
    });
  });

  it('stays on the term the game ended in once it is over', () => {
    const reelected = play(createGame(land.approving(), 3), 20).state;
    const { state } = play(reelected, 40, harsh);

    const calendar = termCalendar(state);

    expect(calendar.term).toBe(2);
    expect(calendar.quarters.every((quarter) => quarter.when === 'past')).toBe(true);
  });
});

describe.each(lands)('the record of the terms served in $name', (land) => {
  it('tells each term: when it ran, prosperity at either end, and how it ended', () => {
    const reelected = play(createGame(land.approving(), 3), 20).state;
    const { state } = play(reelected, 40, harsh);

    const records = termRecords(state);

    expect(
      records.map(({ term, from, to, quarters, ending }) => ({ term, from, to, quarters, ending })),
    ).toEqual([
      {
        term: 1,
        from: { year: 1, quarter: 1 },
        to: { year: 5, quarter: 4 },
        quarters: 20,
        ending: 'reelected',
      },
      {
        term: 2,
        from: { year: 6, quarter: 1 },
        to: { year: 10, quarter: 4 },
        quarters: 20,
        ending: 'defeated',
      },
    ]);
    // Each term starts where the one before it ended.
    expect(records[0]?.prosperity.start).toBe(state.history[0]?.prosperity);
    expect(records[0]?.prosperity.end).toBe(state.history[20]?.prosperity);
    expect(records[1]?.prosperity.start).toBe(records[0]?.prosperity.end);
    expect(records[1]?.prosperity.end).toBe(state.history.at(-1)?.prosperity);
  });

  it('leaves a term still being served in office', () => {
    const { state } = play(createGame(land.approving(), 3), 25);

    expect(
      termRecords(state).map((record) => [record.term, record.quarters, record.ending]),
    ).toEqual([
      [1, 20, 'reelected'],
      [2, 5, 'inOffice'],
    ]);
  });
});

describe.each(lands)('dilemmas in a second term in $name', (land) => {
  /** The approving country, with the chance of each dilemma named and the reserve given. */
  function approvingWith(dilemmas: Record<string, number>, reserve: number): Country {
    const file = structuredClone(land.name === 'Tavara' ? tavaraFile : testlandFile) as {
      start: { treasury: number; budget: { taxRate: number } };
    };
    // Approving as above, with a treasury that lasts two terms.
    file.start.treasury = 1000;
    file.start.budget.taxRate = land.name === 'Tavara' ? 12 : 20;
    return withChances(file, { dilemmas, reserve });
  }

  /** Plays to the start of a quarter of the game, answering each dilemma with its last option. */
  function playTo(country: Country, quarter: number): GameState {
    let game = createGame(country, 3);
    while (game.history.length < quarter) {
      const choice = game.dilemma?.options.at(-1)?.id ?? null;
      game = advanceQuarter(game, { budget: game.budget, dilemmaChoice: choice }).state;
    }
    return game;
  }

  it('arise in it as in the first', () => {
    // The merchants come with each new year, once the harvest has reached the reserve.
    const met: number[] = [];
    let game = playTo(approvingWith({ merchantOffer: 1 }, 3_000_000), 21);
    while (game.history.length <= 41) {
      if (game.dilemma !== null) met.push(game.history.length);
      const choice = game.dilemma?.options.at(-1)?.id ?? null;
      game = advanceQuarter(game, { budget: game.budget, dilemmaChoice: choice }).state;
    }
    expect(met).toEqual([21, 25, 29, 33, 37, 41]);
  });

  it('never arise in the quarter its election is held', () => {
    // A neighbour offers grain whenever the reserve is low. It is full until it is emptied.
    const country = approvingWith({ grainOffer: 1 }, 3_000_000);
    const emptied = (game: GameState): GameState => ({ ...game, foodReserve: 0 });
    const next = (game: GameState) => advanceQuarter(game, { budget: game.budget }).state;

    expect(next(emptied(playTo(country, 38))).dilemma?.type).toBe('grainOffer');
    expect(next(emptied(playTo(country, 39))).dilemma).toBe(null);
    expect(next(emptied(playTo(country, 39))).outcome).toEqual({ status: 'playing' });
  });
});
