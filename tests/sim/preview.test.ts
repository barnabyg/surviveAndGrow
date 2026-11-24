import { describe, expect, it } from 'vitest';
import {
  advanceQuarter,
  createGame,
  previewQuarter,
  type Budget,
  type Decisions,
  type GameState,
} from '../../src/sim';
import { bothCountries, tavara } from './countries';
import { steward } from './playing';
import { budgetFrom, budgetOf, lavish } from '../budgets';

/** A different budget each quarter, so the previews are tested across a range of settings. */
function budgetFor(game: GameState, quarter: number): Budget {
  return budgetFrom(game.budget, {
    taxRatePercent: 10 + quarter * 3,
    spending: { health: (quarter % 5) * 40 },
  });
}

describe('previewing a quarter in Tavara', () => {
  it('projects the budget and the treasury for the next quarter', () => {
    const game = createGame(tavara(), 1);

    const preview = previewQuarter(game, { budget: game.budget });

    // Revenue $31.0m, spending $38.0m: the treasury will fall from $42.0m to $35.0m.
    expect(preview.revenue).toEqual({ min: 310, max: 310 });
    expect(preview.spending).toEqual({ min: 380, max: 380 });
    expect(preview.balance).toEqual({ min: -70, max: -70 });
    expect(preview.treasury).toEqual({ min: 350, max: 350 });
    expect(preview.spendingCut).toBe(false);
  });

  it('projects the effect of a change before it is made', () => {
    const game = createGame(tavara(), 1);
    const budget = budgetFrom(game.budget, { spending: { agriculture: 130 } });

    const preview = previewQuarter(game, { budget });

    expect(preview.balance).toEqual({ min: -90, max: -90 });
    expect(preview.treasury).toEqual({ min: 330, max: 330 });
  });

  it('warns that spending would be cut when the treasury cannot cover it', () => {
    const game = createGame(tavara(), 1);

    const preview = previewQuarter(game, { budget: lavish });

    expect(preview.spendingCut).toBe(true);
    expect(preview.spending).toEqual({ min: 505, max: 505 });
    expect(preview.treasury).toEqual({ min: 1, max: 1 });
  });
});

describe.each(bothCountries)('previewing a quarter in %s', (_name, country) => {
  it('does not change the game', () => {
    const game = createGame(country(), 11);
    const before = structuredClone(game);

    previewQuarter(game, { budget: lavish });

    expect(game).toEqual(before);
  });

  it('leaves a game played with previews identical to the same game played without', () => {
    let plain = createGame(country(), 11);
    let previewed = createGame(country(), 11);

    for (let quarter = 0; quarter < 10; quarter += 1) {
      const decisions: Decisions = steward(plain, budgetFor(plain, quarter));
      plain = advanceQuarter(plain, decisions).state;

      previewQuarter(previewed, { budget: lavish });
      previewQuarter(previewed, decisions);
      previewed = advanceQuarter(previewed, decisions).state;
    }

    expect(previewed).toEqual(plain);
  });

  it('gives figures with no random element exactly as they then turn out', () => {
    let game = createGame(country(), 11);

    for (let quarter = 0; quarter < 10; quarter += 1) {
      const decisions: Decisions = steward(game, quarter === 7 ? lavish : budgetFor(game, quarter));
      const preview = previewQuarter(game, decisions);
      const { state, report } = advanceQuarter(game, decisions);

      expect(preview.treasury).toEqual({ min: state.treasury, max: state.treasury });
      expect(preview.balance).toEqual({
        min: report.treasury.change,
        max: report.treasury.change,
      });
      expect(preview.spendingCut).toBe(
        report.entries.some((entry) => entry.headline === 'Spending was cut'),
      );
      game = state;
    }
  });

  it('gives the debt burden the quarter then records, though strikes it brings cut revenue', () => {
    // So harsh a budget turns regions to unrest, which cuts the revenue the burden is
    // judged against from the next quarter.
    const harsh: Budget = budgetOf({ taxRatePercent: 40 });
    let game = createGame(country(), 11);
    let unrestBegan = false;

    for (let quarter = 0; quarter < 8 && game.outcome.status === 'playing'; quarter += 1) {
      const decisions: Decisions = {
        budget: harsh,
        borrow: quarter === 0 ? [{ kind: 'loan', amount: 100, quarters: 8 }] : [],
      };
      const preview = previewQuarter(game, decisions);
      const { state } = advanceQuarter(game, decisions);
      const recorded = state.history.at(-1)?.debtBurden;
      unrestBegan ||= state.regions.some(
        (region, index) => region.unrest !== game.regions[index]?.unrest,
      );

      expect(preview.debtBurden).toEqual({ min: recorded, max: recorded });
      game = state;
    }
    expect(unrestBegan).toBe(true);
  });

  it('refuses decisions the game would refuse', () => {
    const game = createGame(country(), 11);

    expect(() => previewQuarter(game, { budget: { ...game.budget, taxRatePercent: 2 } })).toThrow(
      'The tax rate must be a whole number from 5 to 40, but is 2.',
    );
  });
});
