import { beforeAll, describe, expect, it } from 'vitest';
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
import { startingAt, withDroughtChance } from './countries';
import { budgetFrom } from '../budgets';

/**
 * Each country with no drought, and approval worked out by hand from the approval rules.
 * The baseline is 51.5%, each point of tax above 18% costs 1.2 points, and the starting
 * spending on health, education and security is worth +0.3 in Tavara and +14.0 in Testland.
 *
 * - `steady` keeps approval where the country as shipped starts it (Tavara 51.8%, Testland
 *   63.1%). In Tavara it drops food relief, which no one needs, so the treasury lasts.
 * - `approving` starts at a tax rate that leaves approval 3 points or more above the 50%
 *   the election needs, `disapproving` at one that leaves it 3 points or more below, and
 *   `close` at one that leaves it within a point of 50%.
 * - `harsh` taxes at 40% and spends nothing on the public, which loses any election.
 */
const lands = [
  {
    name: 'Tavara',
    country: () => withDroughtChance(tavaraFile, {}),
    steady: (budget: Budget): Budget => budgetFrom(budget, { spending: { foodRelief: 0 } }),
    steadyApproval: 518,
    // Tax at 17%: one point under 18% is worth +1.2 points.
    approving: () => startingAt(tavaraFile, 17),
    approvingApproval: 530,
    // Tax at 22%: four points over cost 4.8.
    disapproving: () => startingAt(tavaraFile, 22),
    disapprovingApproval: 470,
    // Tax at 20%: two points over cost 2.4.
    close: () => startingAt(tavaraFile, 20),
    closeApproval: 494,
  },
  {
    name: 'Testland',
    country: () => withDroughtChance(testlandFile, {}),
    steady: (budget: Budget): Budget => budget,
    steadyApproval: 631,
    // Tax at 20%, as the file has it: two points over 18% cost 2.4.
    approving: () => startingAt(testlandFile, 20),
    approvingApproval: 631,
    // Tax at 34%: sixteen points over cost 19.2.
    disapproving: () => startingAt(testlandFile, 34),
    disapprovingApproval: 463,
    // Tax at 31%: thirteen points over cost 15.6.
    close: () => startingAt(testlandFile, 31),
    closeApproval: 499,
  },
] as const;

const unchanged = (budget: Budget): Budget => budget;

function harsh(budget: Budget): Budget {
  return budgetFrom(budget, {
    taxRatePercent: 40,
    spending: { health: 0, education: 0, security: 0 },
  });
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

/** The election held as the last quarter played ended, with what the report said of it. */
function electionOf(played: Pick<Played, 'reports'>) {
  const report = played.reports.at(-1);
  const entry = report?.entries.find((each) => each.kind === 'election');
  if (report?.election == null || entry === undefined) {
    throw new Error(`No election was held as the last quarter ended: ${JSON.stringify(report)}`);
  }
  return { ...report.election, entry };
}

describe.each(lands)('the election in $name', (land) => {
  it('is due at the end of year 5, and counts down to it', () => {
    let game = createGame(land.country(), 3);
    const budget = land.steady(game.budget);

    expect(electionStatus(game)).toEqual({
      term: 1,
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

  it('is held when quarter 20 is resolved', () => {
    const played = term(land.country(), 3, land.steady);
    const { reports } = played;

    expect(reports).toHaveLength(20);
    expect(reports.at(-1)?.date).toEqual({ year: 5, quarter: 4 });
    expect(electionOf(played).needed).toBe(500);
    expect(reports.slice(0, -1).every((report) => report.election === null)).toBe(true);
  });

  it.each([1, 2, 3, 4])('is won when the country approves (seed %i)', (seed) => {
    const played = term(land.approving(), seed, unchanged);
    const election = electionOf(played);

    // Approval never moved, and the campaign can swing the vote by 3 points at most.
    expect(approvalStatus(played.state).approval).toBe(land.approvingApproval);
    expect(election.voteShare).toBeGreaterThanOrEqual(land.approvingApproval - 30);
    expect(election.voteShare).toBeLessThanOrEqual(land.approvingApproval + 30);
    expect(election).toMatchObject({ won: true, needed: 500 });
    expect(election.entry.headline).toBe('You won the election');
    // Winning does not end the game: the government governs on into a second term.
    expect(played.state.outcome).toEqual({ status: 'playing' });
  });

  it.each([1, 2, 3, 4])('is lost when the country does not (seed %i)', (seed) => {
    const played = term(land.disapproving(), seed, unchanged);
    const { state } = played;
    const election = electionOf(played);

    expect(approvalStatus(state).approval).toBe(land.disapprovingApproval);
    expect(election.voteShare).toBeGreaterThanOrEqual(land.disapprovingApproval - 30);
    expect(election.voteShare).toBeLessThanOrEqual(land.disapprovingApproval + 30);
    expect(election).toMatchObject({ won: false, needed: 500 });
    // Losing ends the game.
    expect(state.outcome).toEqual({
      status: 'lost',
      cause: 'election',
      voteShare: election.voteShare,
      needed: 500,
      headline: 'You lost the election',
      summary: election.entry.cause,
    });
    expect(() => advanceQuarter(state, { budget: state.budget })).toThrow('The game is over.');
  });

  // Six hundred close-run terms, one for each seed, played once for the tests that follow.
  // They take a few seconds alone and several times that while the whole suite runs, so
  // they are played before the tests, under a limit of their own.
  let played: readonly Played[] = [];
  beforeAll(() => {
    played = Array.from({ length: 600 }, (_, index) => term(land.close(), index + 1, unchanged));
  }, 60_000);
  const closeRunTerms = () => played;

  it('turns on exactly half the vote: 50.0% wins and 49.9% loses', () => {
    const shares = new Map<number, boolean>();
    for (const run of closeRunTerms()) {
      const election = electionOf(run);

      expect(election.won).toBe(election.voteShare >= 500);
      expect(run.state.outcome.status).toBe(election.won ? 'playing' : 'lost');
      shares.set(election.voteShare, election.won);
    }

    expect(shares.get(500)).toBe(true);
    expect(shares.get(499)).toBe(false);
  });

  it('swings the vote a little either way of approval, by the seed', () => {
    const swings = new Set<number>();
    for (const run of closeRunTerms()) {
      swings.add(electionOf(run).voteShare - approvalStatus(run.state).approval);
    }
    // In a term with no hunger and no change of budget, approval stays where it started.
    const [first] = closeRunTerms();
    expect(first && approvalStatus(first.state).approval).toBe(land.closeApproval);

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
    const { entry } = electionOf(term(land.approving(), 3, unchanged));

    expect(entry.kind).toBe('election');
    expect(entry.seriousness).toBe('notable');
    expect(entry.headline).toBe('You won the election');
    expect(entry.cause).toMatch(
      /^You took \d\d\.\d% of the vote and needed 50%\. Approval stood at \d\d\.\d% on polling day, and the campaign moved the vote by (\+|−)?\d\.\d points?\. Your second term begins, and the next election is held at the end of Year 10, Quarter 4\.$/,
    );
  });

  it('leads the last report with a lost election', () => {
    const played = term(land.country(), 3, harsh);
    const { entry } = electionOf(played);

    expect(played.reports.at(-1)?.entries[0]).toBe(entry);
    expect(entry).toMatchObject({
      kind: 'election',
      seriousness: 'critical',
      headline: 'You lost the election',
    });
    expect(entry.cause).toMatch(/^You took \d+\.\d% of the vote .* points?\.$/);
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
    const played = term(land.close(), seed, unchanged);
    const { before } = played;

    const forecast = previewQuarter(before, { budget: before.budget }).voteShare;

    expect(before.date).toEqual({ year: 5, quarter: 4 });
    expect(electionOf(played).voteShare).toBeGreaterThanOrEqual(forecast.min);
    expect(electionOf(played).voteShare).toBeLessThanOrEqual(forecast.max);
  });

  it('does not move the generator', () => {
    const { before } = term(land.close(), 4, unchanged);
    const untouched = structuredClone(before);

    previewQuarter(before, { budget: before.budget });

    expect(before).toEqual(untouched);
  });
});

/**
 * An election held while one region is hungry, so that the regions do not all approve alike.
 * Drought strikes the region every year and relief carries it until two quarters before the
 * vote; relief then stops, and the region is in shortage on polling day while the others
 * stand where they started. Approval on polling day is worked by hand from the regions:
 *
 * - Tavara: 4,600,000 people at 51.8% and the Dry East's 600,000 at 47.7% average 51.3%.
 *   The plain mean of the six regions would be 51.1%.
 * - Testland: 300,000 at 63.1% and Sandreach's 100,000 at 59.0% average 62.0%. The plain
 *   mean of the two would be 61.0%.
 *
 * The campaign's swing is the seed's: +1.5 points in Tavara and −0.3 in Testland.
 */
describe.each([
  {
    name: 'Tavara',
    file: tavaraFile,
    regionId: 'dry-east',
    relief: 70,
    hungry: 477,
    fed: 518,
    voteShare: 528,
    summary:
      'You took 52.8% of the vote and needed 50%. Approval stood at 51.3% on polling day, and the campaign moved the vote by +1.5 points.',
  },
  {
    name: 'Testland',
    file: testlandFile,
    regionId: 'sandreach',
    relief: 10,
    hungry: 590,
    fed: 631,
    voteShare: 617,
    summary:
      'You took 61.7% of the vote and needed 50%. Approval stood at 62.0% on polling day, and the campaign moved the vote by −0.3 points.',
  },
])('the vote in $name when one region is hungry', (land) => {
  it('counts each region by its people, not region by region', () => {
    const rich = structuredClone(land.file) as { start: { treasury: number } };
    rich.start.treasury = 500;
    let game = createGame(withDroughtChance(rich, { [land.regionId]: 1 }), 3);
    const budget: Budget = budgetFrom(game.budget, { spending: { foodRelief: land.relief } });

    const reports: TurnReport[] = [];
    for (let quarter = 1; quarter <= 20; quarter += 1) {
      const reliefRegionId = quarter <= 18 ? land.regionId : null;
      const result = advanceQuarter(game, { budget, reliefRegionId });
      game = result.state;
      reports.push(result.report);
    }

    for (const region of game.regions) {
      expect(region.approval).toBe(region.id === land.regionId ? land.hungry : land.fed);
    }
    const election = electionOf({ reports });
    expect(election.voteShare).toBe(land.voteShare);
    // A won election goes on to say that a new term begins.
    expect(election.entry.cause.startsWith(land.summary)).toBe(true);
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
