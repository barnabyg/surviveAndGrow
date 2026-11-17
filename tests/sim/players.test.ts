import { describe, expect, it } from 'vitest';
import { createGame, electionStatus } from '../../src/sim';
import { playGame, summarise } from '../balance/batch';
import { DEGENERATE_PLAYERS, SCRIPTED_PLAYERS } from '../balance/players';
import { tavaraAsShipped, testlandAsShipped } from './countries';

/**
 * A short run of the scripted players, as a smoke test: whole games on the countries as
 * they ship, dilemmas included. The large batch that judges the balance is a separate
 * command (`npm run balance`) and gates nothing.
 */
const SEEDS = [1, 2, 3];

const shipped = [
  ['Tavara', tavaraAsShipped],
  ['Testland', testlandAsShipped],
] as const;

describe('the scripted players', () => {
  it('are the three the balance is judged by', () => {
    expect(SCRIPTED_PLAYERS.map((player) => player.name)).toEqual([
      'Does nothing',
      'Popularity',
      'Sensible',
    ]);
  });
});

describe.each(shipped)('a scripted player in %s', (_name, country) => {
  describe.each(SCRIPTED_PLAYERS)('$name', ({ decide }) => {
    it.each(SEEDS)('plays seed %i to an ending or through its first term', (seed) => {
      const result = playGame(country(), seed, decide);
      const { termQuarters } = electionStatus(createGame(country(), seed));

      expect(['won', 'reelected', 'lostElection', 'famine']).toContain(result.ending);
      expect(result.quarters).toBeGreaterThan(0);
      expect(result.quarters).toBeLessThanOrEqual(termQuarters);
      if (result.ending === 'famine') {
        expect(country().regions.map((region) => region.id)).toContain(result.regionId);
        expect(result.voteShare).toBe(null);
      } else if (result.ending !== 'won') {
        // An election is only ever held at the end of the term.
        expect(result.quarters).toBe(termQuarters);
        expect(result.voteShare).not.toBe(null);
      }
    });

    it('plays on into later terms when asked to', () => {
      const result = playGame(country(), 1, decide, 2);
      const { termQuarters } = electionStatus(createGame(country(), 1));

      expect(result.quarters).toBeLessThanOrEqual(2 * termQuarters);
      if (result.ending === 'reelected') expect(result.quarters).toBe(2 * termQuarters);
    });

    it('plays the same game again from the same seed', () => {
      expect(playGame(country(), 7, decide)).toEqual(playGame(country(), 7, decide));
    });
  });
});

describe.each(shipped)('a one-lever player in %s', (_name, country) => {
  // These probe for a trick that wins on its own. Here they only have to finish their games.
  it.each(DEGENERATE_PLAYERS)('$name plays to an ending', ({ decide }) => {
    expect(['won', 'reelected', 'lostElection', 'famine']).toContain(
      playGame(country(), 1, decide).ending,
    );
  });
});

describe('a batch of games', () => {
  it('is summed up by how each ended', () => {
    const summary = summarise([
      {
        seed: 1,
        ending: 'reelected',
        regionId: null,
        quarters: 20,
        voteShare: 520,
        treasury: 100,
        approval: 510,
      },
      {
        seed: 2,
        ending: 'lostElection',
        regionId: null,
        quarters: 20,
        voteShare: 480,
        treasury: 300,
        approval: 470,
      },
      {
        seed: 3,
        ending: 'famine',
        regionId: 'dry-east',
        quarters: 9,
        voteShare: null,
        treasury: 0,
        approval: 300,
      },
      {
        seed: 4,
        ending: 'famine',
        regionId: 'dry-east',
        quarters: 13,
        voteShare: null,
        treasury: 50,
        approval: 350,
      },
    ]);

    expect(summary.games).toBe(4);
    expect(summary.won).toBe(0);
    expect(summary.reelected).toBe(1);
    expect(summary.lostElection).toBe(1);
    expect(summary.famine).toEqual([{ regionId: 'dry-east', games: 2 }]);
    expect(summary.winPermille).toBe(0);
    // The spread of each figure: the least, the middle and the most.
    expect(summary.voteShare).toEqual({ min: 480, median: 500, max: 520 });
    expect(summary.treasury).toEqual({ min: 0, median: 75, max: 300 });
    expect(summary.approval).toEqual({ min: 300, median: 410, max: 510 });
    expect(summary.famineQuarter).toEqual({ min: 9, median: 11, max: 13 });
  });
});
