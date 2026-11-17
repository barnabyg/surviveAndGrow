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
 * Each country with no drought, and three budgets whose effect on approval is worked out
 * by hand from the approval rules:
 *
 * - `steady` keeps approval where the game starts it (Tavara 54.3%, Testland 65.6%). In
 *   Tavara it drops food relief, which no one needs, so that the treasury lasts the term.
 * - `close` raises tax until approval settles near the 50% the election needs: Tavara's
 *   3 points of tax cost 3.6 points (50.7%), Testland's 13 cost 15.6 (50.0%).
 * - `harsh` taxes at 40% and spends nothing on the public, which settles approval at 13.6%.
 */
const lands = [
  {
    name: 'Tavara',
    country: () => withDroughtChance(tavaraFile, {}),
    steady: (budget: Budget): Budget => ({
      ...budget,
      spending: { ...budget.spending, foodRelief: 0 },
    }),
    steadyApproval: 543,
    close: (budget: Budget): Budget => ({ ...budget, taxRatePercent: 21 }),
    closeApproval: 507,
  },
  {
    name: 'Testland',
    country: () => withDroughtChance(testlandFile, {}),
    steady: (budget: Budget): Budget => budget,
    steadyApproval: 656,
    close: (budget: Budget): Budget => ({ ...budget, taxRatePercent: 33 }),
    closeApproval: 500,
  },
] as const;

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
    const { state } = term(land.country(), seed, land.steady);
    const election = electionOf(state);

    // Approval never moved, and the campaign can swing the vote by 3 points at most.
    expect(approvalStatus(state).approval).toBe(land.steadyApproval);
    expect(election.voteShare).toBeGreaterThanOrEqual(land.steadyApproval - 30);
    expect(election.voteShare).toBeLessThanOrEqual(land.steadyApproval + 30);
    expect(election).toMatchObject({
      status: 'won',
      cause: 'election',
      needed: 500,
      headline: 'You won the election',
    });
  });

  it.each([1, 2, 3, 4])('is lost when the country does not (seed %i)', (seed) => {
    const { state } = term(land.country(), seed, harsh);
    const election = electionOf(state);

    expect(approvalStatus(state).approval).toBe(136);
    expect(election.voteShare).toBeGreaterThanOrEqual(106);
    expect(election.voteShare).toBeLessThanOrEqual(166);
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
      (_, index) => term(land.country(), index + 1, land.close).state,
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
    // In a term with no hunger, approval is where the tax rise settles it.
    const [first] = closeRunTerms();
    expect(first && approvalStatus(first).approval).toBe(land.closeApproval);

    // Every swing from 3 points against to 3 points for turns up, and nothing beyond.
    expect([...swings].sort((a, b) => a - b)).toEqual(
      Array.from({ length: 61 }, (_, index) => index - 30),
    );
  });

  it('gives the same result for the same seed', () => {
    const first = term(land.country(), 2026, land.close);
    const second = term(land.country(), 2026, land.close);

    expect(second.state).toEqual(first.state);
    expect(second.reports).toEqual(first.reports);
  });

  it('says in words what happened, and reports it', () => {
    const { state, reports } = term(land.country(), 3, land.steady);
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
    const { state, before } = term(land.country(), seed, land.close);

    const forecast = previewQuarter(before, { budget: before.budget }).voteShare;

    expect(before.date).toEqual({ year: 5, quarter: 4 });
    expect(electionOf(state).voteShare).toBeGreaterThanOrEqual(forecast.min);
    expect(electionOf(state).voteShare).toBeLessThanOrEqual(forecast.max);
  });

  it('does not move the generator', () => {
    const { before } = term(land.country(), 4, land.close);
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
