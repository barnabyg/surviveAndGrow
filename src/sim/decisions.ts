import { austerityBudgetFault } from './austerity';
import { checkBudget } from './budget';
import { borrowFault } from './debt';
import { choiceFault } from './dilemmas';
import { startFault } from './projects';
import type { Decisions, GameState } from './state';
import { tradeFault } from './trade';

/**
 * @throws RangeError when a decision is outside what the game allows.
 * @throws Error when the game is already over.
 */
export function checkDecisions(state: GameState, decisions: Decisions, mustAnswer = true): void {
  if (state.outcome.status !== 'playing') throw new Error('The game is over.');
  const unanswered = choiceFault(state, decisions.dilemmaChoice ?? null, mustAnswer);
  if (unanswered !== null) throw new RangeError(unanswered);
  checkBudget(decisions.budget);
  const austere = austerityBudgetFault(state, decisions.budget);
  if (austere !== null) throw new RangeError(austere);
  const target = decisions.reliefRegionId ?? null;
  if (target !== null && !state.regions.some((region) => region.id === target)) {
    throw new RangeError(`There is no region "${target}" to send food relief to.`);
  }
  const fault = startFault(state, decisions.startProjects ?? []);
  if (fault !== null) throw new RangeError(fault);
  const borrowing = borrowFault(state, decisions.borrow ?? []);
  if (borrowing !== null) throw new RangeError(borrowing);
  const trading = tradeFault(state, decisions.trade ?? []);
  if (trading !== null) throw new RangeError(trading);
}
