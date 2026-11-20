import { describe, expect, it } from 'vitest';
import { advanceQuarter, createGame, electionStatus, TIERS, type GameState } from '../../src/sim';
import { DEFAULT_TERMS, playGame, summarise, type GameResult } from '../balance/batch';
import { SCRIPTED_PLAYERS, type ScriptedPlayer } from '../balance/players';
import { tavaraAsShipped, testlandAsShipped } from './countries';

/**
 * A short run of the scripted players, as a smoke test: whole games of several terms on the
 * countries as they ship, dilemmas included. The large batch that judges the balance is a
 * separate command (`npm run balance`) and gates nothing.
 */
const SEEDS = [1];

/**
 * Whole games of several terms take a second or two each, and longer while the rest of the
 * suite runs alongside; the default limit of five seconds is too close.
 */
const GAME_TIMEOUT = 30_000;

const shipped = [
  ['Tavara', tavaraAsShipped],
  ['Testland', testlandAsShipped],
] as const;

/** The chain builder, the player that builds most. */
function chainBuilder(): ScriptedPlayer {
  const player = SCRIPTED_PLAYERS.find((candidate) => candidate.name === 'Chain builder');
  if (player === undefined) throw new Error('There is no chain builder among the players.');
  return player;
}

const ENDINGS: readonly GameResult['ending'][] = ['won', 'inOffice', 'lostElection', 'famine'];

describe('the scripted players', () => {
  it('are the four the balance is judged by', () => {
    expect(SCRIPTED_PLAYERS.map((player) => player.name)).toEqual([
      'Does nothing',
      'Popularity',
      'Sensible',
      'Chain builder',
    ]);
  });

  it('include a chain builder that starts on the large sites in Tavara', () => {
    let game: GameState = createGame(tavaraAsShipped(), 1);
    const started: string[] = [];
    for (let quarter = 0; quarter < 8 && game.outcome.status === 'playing'; quarter += 1) {
      const decisions = chainBuilder().decide(game);
      started.push(...(decisions.startProjects ?? []));
      game = advanceQuarter(game, decisions).state;
    }
    const types = started.map((id) => game.country.sites.find((site) => site.id === id)?.type);

    expect(types).toContain('powerStation');
    expect(types).toContain('powerLine');
  });
});

describe.each(shipped)('a scripted player in %s', (_name, country) => {
  describe.each(SCRIPTED_PLAYERS)('$name', ({ decide }) => {
    it.each(SEEDS)(
      'plays seed %i through its terms to an ending',
      (seed) => {
        const result = playGame(country(), seed, decide);
        const { termQuarters } = electionStatus(createGame(country(), seed));

        expect(ENDINGS).toContain(result.ending);
        expect(result.quarters).toBeGreaterThan(0);
        expect(result.quarters).toBeLessThanOrEqual(DEFAULT_TERMS * termQuarters);
        expect(result.terms).toBe(Math.ceil(result.quarters / termQuarters));
        expect(TIERS).toContain(result.peakTier);
        expect(result.peakProsperity).toBeGreaterThanOrEqual(result.prosperity);
        if (result.ending === 'won') {
          expect(result.winQuarter).toBe(result.quarters);
        } else {
          expect(result.winQuarter).toBe(null);
        }
        if (result.ending === 'famine') {
          expect(country().regions.map((region) => region.id)).toContain(result.regionId);
        } else if (result.ending === 'lostElection') {
          // An election is only ever held at the end of a term.
          expect(result.quarters % termQuarters).toBe(0);
          expect(result.voteShare).not.toBe(null);
        } else if (result.ending === 'inOffice') {
          expect(result.quarters).toBe(DEFAULT_TERMS * termQuarters);
        }
      },
      GAME_TIMEOUT,
    );

    it(
      'stops when the terms asked for are up',
      () => {
        const result = playGame(country(), 3, decide, 1);
        const { termQuarters } = electionStatus(createGame(country(), 3));

        expect(result.quarters).toBeLessThanOrEqual(termQuarters);
        expect(result.terms).toBe(1);
        if (result.ending === 'inOffice') expect(result.quarters).toBe(termQuarters);
      },
      GAME_TIMEOUT,
    );
  });

  it(
    'plays the same game again from the same seed',
    () => {
      const { decide } = chainBuilder();
      expect(playGame(country(), 7, decide, 1)).toEqual(playGame(country(), 7, decide, 1));
    },
    GAME_TIMEOUT,
  );
});

describe('a batch of games', () => {
  const game = (seed: number, figures: Partial<GameResult>): GameResult => ({
    seed,
    ending: 'inOffice',
    regionId: null,
    quarters: 80,
    terms: 4,
    winQuarter: null,
    voteShare: 520,
    treasury: 100,
    approval: 510,
    prosperity: 400,
    peakTier: 'industrialising',
    peakProsperity: 410,
    borrowed: 0,
    bailouts: 0,
    heldByDebt: 0,
    debtBurden: 0,
    peakDebtBurden: 0,
    ...figures,
  });

  it('is summed up by how each ended', () => {
    const summary = summarise([
      game(1, { heldByDebt: 2, borrowed: 400, debtBurden: 600, peakDebtBurden: 700 }),
      game(2, {
        ending: 'lostElection',
        quarters: 40,
        terms: 2,
        voteShare: 480,
        treasury: 300,
        approval: 470,
        prosperity: 350,
        peakTier: 'developing',
        peakProsperity: 360,
        borrowed: 900,
        bailouts: 2,
        debtBurden: 800,
        peakDebtBurden: 1200,
      }),
      game(3, {
        ending: 'famine',
        regionId: 'dry-east',
        quarters: 9,
        terms: 1,
        voteShare: null,
        treasury: 0,
        approval: 300,
        prosperity: 200,
        peakTier: 'subsistence',
        peakProsperity: 300,
      }),
      game(4, {
        ending: 'won',
        quarters: 53,
        terms: 3,
        winQuarter: 53,
        voteShare: 540,
        treasury: 50,
        approval: 530,
        prosperity: 440,
        peakTier: 'prosperous',
        peakProsperity: 450,
        borrowed: 300,
        bailouts: 1,
        heldByDebt: 3,
        debtBurden: 200,
        peakDebtBurden: 500,
      }),
    ]);

    expect(summary.games).toBe(4);
    expect(summary.won).toBe(1);
    expect(summary.inOffice).toBe(1);
    expect(summary.lostElection).toBe(1);
    expect(summary.lostElectionByTerm).toEqual([{ term: 2, games: 1 }]);
    expect(summary.famine).toEqual([{ regionId: 'dry-east', games: 1 }]);
    expect(summary.winPermille).toBe(250);
    expect(summary.winQuarter).toEqual({ min: 53, median: 53, max: 53 });
    expect(summary.peakTier).toEqual([
      { tier: 'subsistence', games: 1 },
      { tier: 'developing', games: 1 },
      { tier: 'industrialising', games: 1 },
      { tier: 'prosperous', games: 1 },
    ]);
    // The spread of each figure: the least, the middle and the most.
    expect(summary.terms).toEqual({ min: 1, median: 3, max: 4 });
    expect(summary.voteShare).toEqual({ min: 480, median: 520, max: 540 });
    expect(summary.treasury).toEqual({ min: 0, median: 75, max: 300 });
    expect(summary.approval).toEqual({ min: 300, median: 490, max: 530 });
    expect(summary.prosperity).toEqual({ min: 200, median: 375, max: 440 });
    expect(summary.peakProsperity).toEqual({ min: 300, median: 385, max: 450 });
    expect(summary.famineQuarter).toEqual({ min: 9, median: 9, max: 9 });
    // Borrowing, bailouts and the debt test.
    expect(summary.borrowed).toEqual({ min: 0, median: 350, max: 900 });
    expect(summary.bailedOut).toBe(2);
    expect(summary.bailouts).toEqual({ min: 1, median: 2, max: 2 });
    expect(summary.heldByDebt).toBe(2);
    expect(summary.wonAfterHold).toBe(1);
    expect(summary.heldQuarters).toEqual({ min: 2, median: 3, max: 3 });
    expect(summary.debtBurden).toEqual({ min: 0, median: 400, max: 800 });
    expect(summary.peakDebtBurden).toEqual({ min: 0, median: 600, max: 1200 });
  });
});
