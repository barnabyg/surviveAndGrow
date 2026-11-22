import { describe, expect, it } from 'vitest';
import { advanceQuarter, createGame, risksAhead, type GameState } from '../../src/sim';
import { TIPS, tipsDue, type TipCondition } from '../../src/ui/tips';
import { SCRIPTED_PLAYERS, withinRules } from '../balance/players';
import { tavaraAsShipped } from '../sim/countries';

/**
 * A game in the country as it ships in which each tip's condition arises: the scripted player,
 * the seed, and the quarter it arises in, counted from 0. Risks ahead are worked out apart,
 * since they take long to work out every quarter. A change to the rules or the country that
 * moves one of these breaks the test; a search over the scripted players and the first few
 * seeds finds another.
 */
const ARISES: readonly [TipCondition, player: string, seed: number, quarter: number][] = [
  ['dilemma', 'Does nothing', 2, 1],
  ['price-shock', 'Does nothing', 4, 1],
  ['missing-link', 'Sensible borrower', 1, 1],
  ['decay', 'Sensible', 2, 5],
  ['unrest', 'Does nothing', 4, 7],
  ['tier-passed', 'Sensible', 1, 7],
  ['bailout', 'Reckless borrower', 5, 13],
  ['election-near', 'Sensible', 1, 16],
];

/** The tip conditions that hold as the given quarter is decided in a scripted player's game. */
function dueIn(playerName: string, seed: number, quarter: number): ReadonlySet<TipCondition> {
  const player = SCRIPTED_PLAYERS.find((candidate) => candidate.name === playerName);
  if (player === undefined) throw new Error(`No scripted player is named ${playerName}.`);
  let game: GameState = createGame(tavaraAsShipped(), seed);
  for (let played = 0; played < quarter; played += 1) {
    game = advanceQuarter(game, withinRules(game, player.decide(game))).state;
  }
  const decisions = withinRules(game, player.decide(game));
  return tipsDue({ game, risks: [], plannedSiteIds: decisions.startProjects ?? [] });
}

describe('the first-time tips', () => {
  it('each wait for a different condition', () => {
    const conditions = TIPS.map((tip) => tip.when);
    expect(new Set(conditions).size).toBe(conditions.length);
    expect(new Set(TIPS.map((tip) => tip.id)).size).toBe(TIPS.length);
  });

  it('can each arise in the country as it ships', () => {
    const covered = new Set([...ARISES.map(([condition]) => condition), 'weather-warning']);
    expect(TIPS.filter((tip) => !covered.has(tip.when))).toEqual([]);
  });

  it.each(ARISES)(
    'wait for %s, which arises in a game of %s',
    (condition, player, seed, quarter) => {
      expect(dueIn(player, seed, quarter).has(condition)).toBe(true);
    },
  );

  it('wait for a drought or flood that risks ahead warns of', () => {
    const game = createGame(tavaraAsShipped(), 1);
    const risks = risksAhead(game, { budget: game.budget });
    expect(tipsDue({ game, risks, plannedSiteIds: [] }).has('weather-warning')).toBe(true);
  });

  it('wait for nothing in a game that has only just begun, risks ahead aside', () => {
    const game = createGame(tavaraAsShipped(), 1);
    expect([...tipsDue({ game, risks: [], plannedSiteIds: [] })]).toEqual([]);
  });
});
