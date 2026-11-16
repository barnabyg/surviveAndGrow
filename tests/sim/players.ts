import {
  FOOD_STAGES,
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
