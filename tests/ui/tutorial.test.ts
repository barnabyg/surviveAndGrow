import { describe, expect, it } from 'vitest';
import { advanceQuarter, createGame, type Decisions, type GameState } from '../../src/sim';
import { TUTORIAL_SEED } from '../../src/ui/tutorialGame';
import { tavaraAsShipped } from '../sim/countries';

/** How the year goes with the given decisions each quarter, quarter by quarter. */
function firstYear(decide: (game: GameState) => Decisions): GameState[] {
  const states = [createGame(tavaraAsShipped(), TUTORIAL_SEED)];
  for (let quarter = 0; quarter < 4; quarter += 1) {
    const game = states.at(-1);
    if (game === undefined) break;
    states.push(advanceQuarter(game, decide(game)).state);
  }
  return states;
}

const answerFirst = (game: GameState) => game.dilemma?.options[0]?.id ?? null;

const paths: [string, (game: GameState) => Decisions][] = [
  [
    'a player who changes nothing',
    (game) => ({ budget: game.budget, reliefRegionId: null, dilemmaChoice: answerFirst(game) }),
  ],
  [
    'a player who does what the lessons ask',
    (game) => ({
      budget: {
        ...game.budget,
        spending: { ...game.budget.spending, health: game.budget.spending.health + 10 },
      },
      reliefRegionId: null,
      startProjects: game.date.year === 1 && game.date.quarter === 1 ? ['lowmere-road'] : [],
      dilemmaChoice: answerFirst(game),
    }),
  ],
];

describe.each(paths)('the tutorial game, for %s', (_, decide) => {
  const states = firstYear(decide);

  it('lasts the year, which ends in the first quarter of the second', () => {
    expect(states.at(-1)?.outcome.status).toBe('playing');
    expect(states.at(-1)?.date).toEqual({ year: 2, quarter: 1 });
  });

  it('has no drought, flood or world price shock in its first year', () => {
    for (const game of states) {
      expect(game.events).toEqual([]);
      expect(game.priceShocks).toEqual([]);
    }
  });

  it('puts one dilemma, as the second quarter begins', () => {
    expect(states.map((game) => game.dilemma !== null)).toEqual([false, true, false, false, false]);
  });
});
