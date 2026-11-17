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
import { steward } from './players';

const generous: Budget = {
  taxRatePercent: 5,
  spending: {
    agriculture: 200,
    foodRelief: 200,
    health: 200,
    education: 200,
    security: 200,
    upkeep: 200,
  },
};

/** A different budget each quarter, so the previews are tested across a range of settings. */
function budgetFor(game: GameState, quarter: number): Budget {
  const spending = { ...game.budget.spending, health: (quarter % 5) * 40 };
  return { taxRatePercent: 10 + quarter * 3, spending };
}

describe('previewing a quarter in Tavara', () => {
  it('projects the budget and the treasury for the next quarter', () => {
    const game = createGame(tavara(), 1);

    const preview = previewQuarter(game, { budget: game.budget });

    // Revenue $31.0m, spending $36.0m: the treasury will fall from $42.0m to $37.0m.
    expect(preview.revenue).toEqual({ min: 310, max: 310 });
    expect(preview.spending).toEqual({ min: 360, max: 360 });
    expect(preview.balance).toEqual({ min: -50, max: -50 });
    expect(preview.treasury).toEqual({ min: 370, max: 370 });
    expect(preview.spendingCut).toBe(false);
  });

  it('projects the effect of a change before it is made', () => {
    const game = createGame(tavara(), 1);
    const spending = { ...game.budget.spending, agriculture: 130 };

    const preview = previewQuarter(game, { budget: { ...game.budget, spending } });

    expect(preview.balance).toEqual({ min: -70, max: -70 });
    expect(preview.treasury).toEqual({ min: 350, max: 350 });
  });

  it('warns that spending would be cut when the treasury cannot cover it', () => {
    const game = createGame(tavara(), 1);

    const preview = previewQuarter(game, { budget: generous });

    expect(preview.spendingCut).toBe(true);
    expect(preview.spending).toEqual({ min: 505, max: 505 });
    expect(preview.treasury).toEqual({ min: 1, max: 1 });
  });
});

describe.each(bothCountries)('previewing a quarter in %s', (_name, country) => {
  it('does not change the game', () => {
    const game = createGame(country(), 11);
    const before = structuredClone(game);

    previewQuarter(game, { budget: generous });

    expect(game).toEqual(before);
  });

  it('leaves a game played with previews identical to the same game played without', () => {
    let plain = createGame(country(), 11);
    let previewed = createGame(country(), 11);

    for (let quarter = 0; quarter < 10; quarter += 1) {
      const decisions: Decisions = steward(plain, budgetFor(plain, quarter));
      plain = advanceQuarter(plain, decisions).state;

      previewQuarter(previewed, { budget: generous });
      previewQuarter(previewed, decisions);
      previewed = advanceQuarter(previewed, decisions).state;
    }

    expect(previewed).toEqual(plain);
  });

  it('gives figures with no random element exactly as they then turn out', () => {
    let game = createGame(country(), 11);

    for (let quarter = 0; quarter < 10; quarter += 1) {
      const decisions: Decisions = steward(
        game,
        quarter === 7 ? generous : budgetFor(game, quarter),
      );
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

  it('refuses decisions the game would refuse', () => {
    const game = createGame(country(), 11);

    expect(() => previewQuarter(game, { budget: { ...game.budget, taxRatePercent: 2 } })).toThrow(
      'The tax rate must be a whole number from 5 to 40, but is 2.',
    );
  });
});
