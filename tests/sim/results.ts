// A game's result as the balance batch records it, for the tests of what a batch comes to.
import type { GameResult } from '../balance/batch';

/**
 * The result of a game still in office after four quiet terms, with the figures given in
 * place of its own.
 */
export function gameResult(seed: number, figures: Partial<GameResult> = {}): GameResult {
  return {
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
    imported: 0,
    exported: 0,
    tradeIncome: 0,
    tradeSpending: 0,
    shocks: { failedHarvestsAbroad: 0, oreGlut: 0, drought: 0, flood: 0 },
    technologies: {},
    surveys: 0,
    depositsFound: 0,
    depositsMined: 0,
    ...figures,
  };
}
