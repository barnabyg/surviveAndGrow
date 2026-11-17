import {
  FOOD_STAGES,
  pendingDilemma,
  previewQuarter,
  type Budget,
  type Decisions,
  type GameState,
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
 * The same decisions with any pending dilemma answered. It takes the last option that can
 * be chosen, which in every dilemma costs neither money nor food.
 */
export function answering(game: GameState, decisions: Decisions): Decisions {
  const choice = pendingDilemma(game)?.options.findLast((option) => option.unavailable === null);
  return choice === undefined ? decisions : { ...decisions, dilemmaChoice: choice.id };
}
