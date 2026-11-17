import { describe, expect, it } from 'vitest';
import tavaraFile from '../../src/countries/tavara.json';
import {
  advanceQuarter,
  approvalStatus,
  createGame,
  electionStatus,
  previewQuarter,
  type Budget,
  type Country,
  type GameState,
  type TurnReport,
} from '../../src/sim';
import testlandFile from '../countries/testland.json';
import { withDroughtChance } from './countries';

/**
 * A country with no drought that starts at a chosen tax rate, with a treasury that lasts
 * the term. Approval starts where the starting budget settles it, so a game played with
 * that budget keeps the same approval to polling day, and it can be worked out by hand.
 */
function startingAt(file: unknown, taxRate: number): Country {
  const copy = structuredClone(file) as {
    start: { treasury: number; budget: { taxRate: number } };
  };
  copy.start.budget.taxRate = taxRate;
  copy.start.treasury = 500;
  return withDroughtChance(copy, {});
}

/**
 * Each country with no drought, and approval worked out by hand from the approval rules.
 * The baseline is 45.5%, each point of tax above 18% costs 1.2 points, and the starting
 * spending on health, education and security is worth +0.3 in Tavara and +14.0 in Testland.
 *
 * - `steady` keeps approval where the country as shipped starts it (Tavara 45.8%, Testland
 *   57.1%). In Tavara it drops food relief, which no one needs, so the treasury lasts.
 * - `approving` starts at a tax rate that leaves approval 3 points or more above the 50%
 *   the election needs, `disapproving` at one that leaves it 3 points or more below, and
 *   `close` at one that leaves it within a point of 50%.
 * - `harsh` taxes at 40% and spends nothing on the public, which loses any election.
 */
const lands = [
  {
    name: 'Tavara',
    country: () => withDroughtChance(tavaraFile, {}),
    steady: (budget: Budget): Budget => ({
      ...budget,
      spending: { ...budget.spending, foodRelief: 0 },
    }),
    steadyApproval: 458,
    // Tax at 12%: six points under 18% are worth +7.2 points.
    approving: () => startingAt(tavaraFile, 12),
    approvingApproval: 530,
    // Tax at 21%: three points over cost 3.6.
    disapproving: () => startingAt(tavaraFile, 21),
    disapprovingApproval: 422,
    // Tax at 15%: three points under are worth +3.6.
    close: () => startingAt(tavaraFile, 15),
    closeApproval: 494,
  },
  {
    name: 'Testland',
    country: () => withDroughtChance(testlandFile, {}),
    steady: (budget: Budget): Budget => budget,
    steadyApproval: 571,
    // Tax at 20%, as the file has it: two points over 18% cost 2.4.
    approving: () => startingAt(testlandFile, 20),
    approvingApproval: 571,
    // Tax at 30%: twelve points over cost 14.4.
    disapproving: () => startingAt(testlandFile, 30),
    disapprovingApproval: 451,
    // Tax at 26%: eight points over cost 9.6.
    close: () => startingAt(testlandFile, 26),
    closeApproval: 499,
  },
] as const;

const unchanged = (budget: Budget): Budget => budget;

function harsh(budget: Budget): Budget {
  return {
    taxRatePercent: 40,
    spending: { ...budget.spending, health: 0, education: 0, security: 0 },
  };
}

interface Played {
  readonly state: GameState;
  readonly reports: readonly TurnReport[];
  /** The game as it stood before the last quarter played was resolved. */
  readonly before: GameState;
}

/** Plays quarters with one budget and no relief, until the count is reached or the game ends. */
function play(start: GameState, budget: Budget, quarters = 20): Played {
  let state = start;
  let before = start;
  const reports: TurnReport[] = [];
  for (let quarter = 0; quarter < quarters && state.outcome.status === 'playing'; quarter += 1) {
    before = state;
    const result = advanceQuarter(state, { budget, reliefRegionId: null });
    state = result.state;
    reports.push(result.report);
  }
  return { state, reports, before };
}

function term(country: Country, seed: number, change: (budget: Budget) => Budget): Played {
  const game = createGame(country, seed);
  return play(game, change(game.budget));
}

/** The election a game ended in. */
function electionOf(state: GameState) {
  const { outcome } = state;
  if (outcome.status === 'playing' || outcome.cause !== 'election') {
    throw new Error(`The game did not end in an election: ${JSON.stringify(outcome)}`);
  }
  return outcome;
}

describe.each(lands)('the election in $name', (land) => {
  it('is due at the end of year 5, and counts down to it', () => {
    let game = createGame(land.country(), 3);
    const budget = land.steady(game.budget);

    expect(electionStatus(game)).toEqual({
      termQuarters: 20,
      date: { year: 5, quarter: 4 },
      quartersAway: 19,
      needed: 500,
    });

    game = advanceQuarter(game, { budget }).state;
    expect(electionStatus(game).quartersAway).toBe(18);

    game = play(game, budget, 18).state;
    expect(game.date).toEqual({ year: 5, quarter: 4 });
    expect(electionStatus(game).quartersAway).toBe(0);
    expect(game.outcome).toEqual({ status: 'playing' });
  });

  it('is held when quarter 20 is resolved, and ends the game', () => {
    const { state, reports } = term(land.country(), 3, land.steady);

    expect(reports).toHaveLength(20);
    expect(reports.at(-1)?.date).toEqual({ year: 5, quarter: 4 });
    expect(state.outcome.status).not.toBe('playing');
    expect(electionOf(state).cause).toBe('election');
    expect(() => advanceQuarter(state, { budget: state.budget })).toThrow('The game is over.');
  });

  it.each([1, 2, 3, 4])('is won when the country approves (seed %i)', (seed) => {
    const { state } = term(land.approving(), seed, unchanged);
    const election = electionOf(state);

    // Approval never moved, and the campaign can swing the vote by 3 points at most.
    expect(approvalStatus(state).approval).toBe(land.approvingApproval);
    expect(election.voteShare).toBeGreaterThanOrEqual(land.approvingApproval - 30);
    expect(election.voteShare).toBeLessThanOrEqual(land.approvingApproval + 30);
    expect(election).toMatchObject({
      status: 'won',
      cause: 'election',
      needed: 500,
      headline: 'You won the election',
    });
  });

  it.each([1, 2, 3, 4])('is lost when the country does not (seed %i)', (seed) => {
    const { state } = term(land.disapproving(), seed, unchanged);
    const election = electionOf(state);

    expect(approvalStatus(state).approval).toBe(land.disapprovingApproval);
    expect(election.voteShare).toBeGreaterThanOrEqual(land.disapprovingApproval - 30);
    expect(election.voteShare).toBeLessThanOrEqual(land.disapprovingApproval + 30);
    expect(election).toMatchObject({
      status: 'lost',
      cause: 'election',
      needed: 500,
      headline: 'You lost the election',
    });
  });

  // Six hundred close-run terms, one for each seed, played once for the tests that follow.
  let played: readonly GameState[] | undefined;
  const closeRunTerms = () =>
    (played ??= Array.from(
      { length: 600 },
      (_, index) => term(land.close(), index + 1, unchanged).state,
    ));

  it('turns on exactly half the vote: 50.0% wins and 49.9% loses', () => {
    const shares = new Map<number, string>();
    for (const state of closeRunTerms()) {
      const election = electionOf(state);

      expect(election.status).toBe(election.voteShare >= 500 ? 'won' : 'lost');
      shares.set(election.voteShare, election.status);
    }

    expect(shares.get(500)).toBe('won');
    expect(shares.get(499)).toBe('lost');
  });

  it('swings the vote a little either way of approval, by the seed', () => {
    const swings = new Set<number>();
    for (const state of closeRunTerms()) {
      swings.add(electionOf(state).voteShare - approvalStatus(state).approval);
    }
    // In a term with no hunger and no change of budget, approval stays where it started.
    const [first] = closeRunTerms();
    expect(first && approvalStatus(first).approval).toBe(land.closeApproval);

    // Every swing from 3 points against to 3 points for turns up, and nothing beyond.
    expect([...swings].sort((a, b) => a - b)).toEqual(
      Array.from({ length: 61 }, (_, index) => index - 30),
    );
  });

  it('gives the same result for the same seed', () => {
    const first = term(land.close(), 2026, unchanged);
    const second = term(land.close(), 2026, unchanged);

    expect(second.state).toEqual(first.state);
    expect(second.reports).toEqual(first.reports);
  });

  it('says in words what happened, and reports it', () => {
    const { state, reports } = term(land.approving(), 3, unchanged);
    const election = electionOf(state);

    expect(election.summary).toMatch(
      /^You took \d\d\.\d% of the vote and needed 50%\. Approval stood at \d\d\.\d% on polling day, and the campaign moved the vote by (\+|−)?\d\.\d points?\.$/,
    );
    expect(reports.at(-1)?.entries).toContainEqual({
      kind: 'election',
      seriousness: 'notable',
      headline: 'You won the election',
      cause: election.summary,
    });
  });

  it('leads the last report with a lost election', () => {
    const { state, reports } = term(land.country(), 3, harsh);

    expect(reports.at(-1)?.entries[0]).toEqual({
      kind: 'election',
      seriousness: 'critical',
      headline: 'You lost the election',
      cause: electionOf(state).summary,
    });
  });
});

describe.each(lands)('the vote share forecast in $name', (land) => {
  it('is approval as the quarter will leave it, give or take the swing', () => {
    const game = createGame(land.country(), 3);

    const preview = previewQuarter(game, { budget: land.steady(game.budget) });

    expect(preview.voteShare).toEqual({
      min: land.steadyApproval - 30,
      max: land.steadyApproval + 30,
    });
  });

  it('answers to the budget before it is committed', () => {
    const game = createGame(land.country(), 3);

    const preview = previewQuarter(game, { budget: harsh(game.budget) });

    expect(preview.voteShare.min).toBe(preview.approval.min - 30);
    expect(preview.voteShare.max).toBeLessThan(land.steadyApproval);
  });

  it.each([1, 2, 3, 4, 5, 6])('contains the result on the eve of the vote (seed %i)', (seed) => {
    const { state, before } = term(land.close(), seed, unchanged);

    const forecast = previewQuarter(before, { budget: before.budget }).voteShare;

    expect(before.date).toEqual({ year: 5, quarter: 4 });
    expect(electionOf(state).voteShare).toBeGreaterThanOrEqual(forecast.min);
    expect(electionOf(state).voteShare).toBeLessThanOrEqual(forecast.max);
  });

  it('does not move the generator', () => {
    const { before } = term(land.close(), 4, unchanged);
    const untouched = structuredClone(before);

    previewQuarter(before, { budget: before.budget });

    expect(before).toEqual(untouched);
  });
});

describe('famine and the election', () => {
  it('ends the game in famine first, long before the vote', () => {
    const country = withDroughtChance(tavaraFile, { 'dry-east': 1 });
    const game = createGame(country, 1);

    const { state, reports } = play(game, game.budget);

    expect(reports.length).toBeLessThan(20);
    expect(state.outcome).toEqual({
      status: 'lost',
      cause: 'famine',
      regionId: 'dry-east',
      headline: 'The state has collapsed',
      summary: 'Famine held The Dry East for 2 quarters running. The state has collapsed.',
    });
    expect(reports.flatMap((report) => report.entries.map((entry) => entry.kind))).not.toContain(
      'election',
    );
  });
});
