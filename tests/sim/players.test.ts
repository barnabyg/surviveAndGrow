import { describe, expect, it } from 'vitest';
import {
  advanceQuarter,
  bondOffers,
  createGame,
  electionStatus,
  loanOffers,
  technologyTerms,
  TIERS,
  type Borrowing,
  type Country,
  type GameState,
  type Technology,
} from '../../src/sim';
import { DEFAULT_TERMS, playGame, summarise, type GameResult } from '../balance/batch';
import { SCRIPTED_PLAYERS, withinRules } from '../balance/players';
import { tavaraAsShipped, testlandAsShipped } from './countries';
import { gameResult } from './results';
import { ENDINGS, GAME_TIMEOUT, playerNamed } from './scripted';

/**
 * A short run of the scripted players, as a smoke test: whole games of several terms on the
 * countries as they ship, dilemmas included, and what each game records of its research and
 * surveys. The large batch that judges the balance is a separate command (`npm run balance`)
 * and gates nothing.
 */
const SEEDS = [1];

const shipped = [
  ['Tavara', tavaraAsShipped],
  ['Testland', testlandAsShipped],
] as const;

/** The chain builder, the player that builds most without borrowing. */
const chainBuilder = () => playerNamed('Chain builder');

/** The scripted players that research, and the one that surveys. The rest do neither. */
const RESEARCHERS: readonly string[] = ['Improver', 'Unlocker'];
const SURVEYORS: readonly string[] = ['Prospector'];

/**
 * The games played here in which a player that researches never has the money for it. In
 * Testland on seed 1 floods in Northfield in the second and third years leave the reserve
 * below its safe level from quarter 10 to quarter 16, so the improver funds the farms more
 * each quarter while its power station is still being paid for. From quarter 13, when the
 * station is in use, until it is voted out in quarter 20 it never has more than $1.0m, and
 * the first technology on its way costs $8.0m. On seed 2 the reserve holds until quarter 16:
 * the improver has $8.7m in quarter 13, and researches.
 */
const TOO_POOR_TO_RESEARCH: readonly string[] = ['Improver in Testland on seed 1'];

/**
 * What any game records of its research and surveys, whoever played it: a technology is known
 * only after everything it needs, and no later than the game ends; only a region where ore may
 * lie is surveyed, a deposit is found only by a survey, and only a found deposit is mined.
 */
function expectResearchAndSurveysInOrder(result: GameResult, country: Country): void {
  for (const [technology, quarter] of Object.entries(result.technologies) as [
    Technology,
    number,
  ][]) {
    expect(quarter).toBeLessThanOrEqual(result.quarters);
    for (const needed of technologyTerms(technology).prerequisites) {
      expect(result.technologies[needed]).toBeLessThan(quarter);
    }
  }
  expect(result.surveys).toBeLessThanOrEqual(country.deposits.length);
  expect(result.depositsFound).toBeLessThanOrEqual(result.surveys);
  expect(result.depositsMined).toBeLessThanOrEqual(result.depositsFound);
}

/**
 * Each player does what it is for: the prospector alone surveys, and only the improver and
 * the unlocker research. `game` names the game, as `TOO_POOR_TO_RESEARCH` does.
 */
function expectResearchAndSurveysOfItsKind(result: GameResult, name: string, game: string): void {
  const known = Object.keys(result.technologies);
  if (SURVEYORS.includes(name)) {
    expect(result.surveys).toBeGreaterThan(0);
  } else {
    expect(result.surveys).toBe(0);
  }
  if (RESEARCHERS.includes(name) && !TOO_POOR_TO_RESEARCH.includes(game)) {
    expect(known.length).toBeGreaterThan(0);
  } else {
    expect(known).toEqual([]);
  }
}

describe('the scripted players', () => {
  it('are the eleven the balance is judged by', () => {
    expect(SCRIPTED_PLAYERS.map((player) => player.name)).toEqual([
      'Does nothing',
      'Popularity',
      'Sensible',
      'Chain builder',
      'Sensible borrower',
      'Reckless borrower',
      'Timing trader',
      'Mine only',
      'Improver',
      'Unlocker',
      'Prospector',
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

  it('include a sensible borrower that borrows to start the mine’s chain in Tavara', () => {
    let game: GameState = createGame(tavaraAsShipped(), 1);
    const started: string[] = [];
    const borrowed: Borrowing[] = [];
    for (let quarter = 0; quarter < 12 && game.outcome.status === 'playing'; quarter += 1) {
      const decisions = playerNamed('Sensible borrower').decide(game);
      started.push(...(decisions.startProjects ?? []));
      borrowed.push(...(decisions.borrow ?? []));
      game = advanceQuarter(game, decisions).state;
    }
    const types = started.map((id) => game.country.sites.find((site) => site.id === id)?.type);

    expect(types.slice(0, 3)).toEqual(['port', 'trunkRoad', 'mine']);
    expect(borrowed.length).toBeGreaterThan(0);
    expect(borrowed.every((each) => each.kind === 'loan' && each.quarters === 12)).toBe(true);
  });

  it('include a reckless borrower that borrows all the lenders allow', () => {
    const game = createGame(tavaraAsShipped(), 1);
    const borrow = playerNamed('Reckless borrower').decide(game).borrow ?? [];
    const open = (offers: { unavailable: string | null }[]) =>
      offers.filter((offer) => offer.unavailable === null);

    expect(borrow.length).toBeGreaterThan(0);
    expect(open(loanOffers(game, borrow))).toEqual([]);
    expect(open(bondOffers(game, borrow))).toEqual([]);
  });

  it('borrow nothing and start nothing during austerity', () => {
    const game = createGame(tavaraAsShipped(), 1);
    const decisions = playerNamed('Reckless borrower').decide(game);
    const austere = { ...game, austerity: { quartersLeft: 4 } };

    expect(decisions.borrow?.length).toBeGreaterThan(0);
    expect(withinRules(austere, decisions).borrow).toBeUndefined();
    expect(withinRules(austere, decisions).startProjects).toBeUndefined();
  });
});

describe.each(shipped)('a scripted player in %s', (land, country) => {
  describe.each(SCRIPTED_PLAYERS)('$name', ({ name, decide }) => {
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
        // The same game is the one whose research and surveys are checked: it is played once.
        expectResearchAndSurveysInOrder(result, country());
        expectResearchAndSurveysOfItsKind(result, name, `${name} in ${land} on seed ${seed}`);
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
  it('is summed up by how each ended', () => {
    const summary = summarise([
      gameResult(1, {
        heldByDebt: 2,
        borrowed: 400,
        debtBurden: 600,
        peakDebtBurden: 700,
        exported: 90_000,
        tradeIncome: 170,
        shocks: { failedHarvestsAbroad: 1, oreGlut: 0, drought: 2, flood: 0 },
      }),
      gameResult(2, {
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
        imported: 40_000,
        tradeSpending: 120,
        shocks: { failedHarvestsAbroad: 2, oreGlut: 1, drought: 0, flood: 1 },
      }),
      gameResult(3, {
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
      gameResult(4, {
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
    // Trade, and the shocks met.
    expect(summary.imported).toEqual({ min: 0, median: 0, max: 40_000 });
    expect(summary.exported).toEqual({ min: 0, median: 0, max: 90_000 });
    expect(summary.tradeIncome).toEqual({ min: 0, median: 0, max: 170 });
    expect(summary.tradeSpending).toEqual({ min: 0, median: 0, max: 120 });
    expect(summary.gamesMeeting).toEqual({
      failedHarvestsAbroad: 2,
      oreGlut: 1,
      drought: 1,
      flood: 1,
    });
    expect(summary.shocks.failedHarvestsAbroad).toEqual({ min: 0, median: 1, max: 2 });
  });
});
