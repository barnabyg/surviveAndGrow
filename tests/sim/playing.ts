// How the simulation tests play a game: a careful player, the dilemma answer that costs
// nothing, and how far "to the end" goes. The scripted players of the balance batch are in
// tests/balance/players.ts.
import {
  FOOD_STAGES,
  onTechnology,
  pendingDilemma,
  previewQuarter,
  technologyTerms,
  type Budget,
  type Decisions,
  type GameState,
  type Technology,
} from '../../src/sim';

/**
 * A careful player: keeps the given budget and sends food relief to the hungry region that
 * is furthest gone, and among equals to the one that will go shortest. When two regions are
 * short at once this turns from one to the other, which keeps both from sliding to famine.
 * Tests that are not about hunger play this way, so that a drought does not end their game.
 */
export function steward(game: GameState, budget: Budget = game.budget): Decisions {
  const stageOf = (regionId: string) =>
    FOOD_STAGES.indexOf(
      game.regions.find((region) => region.id === regionId)?.foodStage ?? 'adequate',
    );
  const { shortfalls } = previewQuarter(game, { budget });
  const worst = [...shortfalls].sort(
    (a, b) => stageOf(b.regionId) - stageOf(a.regionId) || b.shortfall - a.shortfall,
  )[0];
  return { budget, reliefRegionId: worst?.regionId ?? null };
}

/**
 * Whether a game is still being played and its first election has not yet been held. A
 * government that wins it governs on into another term, so a test that plays a game "to the
 * end" plays it this far.
 */
export function inFirstTerm(game: GameState): boolean {
  return game.outcome.status === 'playing' && game.history.length <= 20;
}

/**
 * The same decisions with any pending dilemma answered. It takes the last option that can
 * be chosen, which in every dilemma costs neither money nor food.
 */
export function answering(game: GameState, decisions: Decisions): Decisions {
  const choice = pendingDilemma(game)?.options.findLast((option) => option.unavailable === null);
  return choice === undefined ? decisions : { ...decisions, dilemmaChoice: choice.id };
}

/** The same game with the technologies given known, as if researched before it. */
export function knowing(game: GameState, technologies: readonly Technology[]): GameState {
  return {
    ...game,
    projects: [
      ...game.projects,
      ...technologies.map((technology) => ({
        target: onTechnology(technology),
        began: game.date,
        quartersPaid: technologyTerms(technology).researchQuarters,
        status: 'known' as const,
        opened: game.date,
      })),
    ],
  };
}
