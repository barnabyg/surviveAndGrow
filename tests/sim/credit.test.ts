import { describe, expect, it } from 'vitest';
import {
  advanceQuarter,
  createGame,
  creditStatus,
  debtStatus,
  loanOffers,
  previewQuarter,
  risksAhead,
  type Borrowing,
  type Budget,
  type Decisions,
  type GameState,
  type TurnReport,
} from '../../src/sim';
import { bothCountries, testland } from './countries';
import { steward } from './players';

/** A loan of a sum over a term, in Money units ($100,000) and quarters. */
function loan(amount: number, quarters: number): Borrowing {
  return { kind: 'loan', amount, quarters };
}

interface Played {
  readonly state: GameState;
  readonly reports: readonly TurnReport[];
}

/** Plays one quarter for each set of decisions given, in order, as a careful player would. */
function play(start: GameState, quarters: readonly Partial<Decisions>[]): Played {
  let state = start;
  const reports: TurnReport[] = [];
  for (const decisions of quarters) {
    const result = advanceQuarter(state, { ...steward(state), ...decisions });
    reports.push(result.report);
    state = result.state;
  }
  return { state, reports };
}

const ratingEntries = (report: TurnReport | undefined) =>
  (report?.entries ?? []).filter((entry) => entry.kind === 'creditRating');

/** The rate a loan over four quarters is offered at, in hundredths of a percent a year. */
function fourQuarterRate(game: GameState): number | undefined {
  return loanOffers(game).find((offer) => offer.quarters === 4)?.annualRateBasisPoints;
}

/** Everything at its most, at the lowest tax: it spends whatever the treasury holds. */
const ruinous: Budget = {
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

describe('the credit rating of a new game', () => {
  it('is A, made of a payment record with no debt and no deficit against it', () => {
    const game = createGame(testland(), 1);

    const credit = creditStatus(game);

    expect(credit).toMatchObject({ rating: 'a', name: 'A', score: 700, record: 700 });
    expect(credit.parts).toEqual([
      { label: 'Payment record', amount: 700 },
      { label: 'Debt burden of 0.0%', amount: 0 },
      { label: 'No deficit', amount: 0 },
    ]);
    // A lends at the rates of the menu, and up to a year's revenue.
    expect(fourQuarterRate(game)).toBe(600);
    expect(debtStatus(game).limit).toBe(200);
  });

  it('shows what the steps either side would mean for a loan', () => {
    const credit = creditStatus(createGame(testland(), 1));

    expect(credit.above).toMatchObject({ rating: 'aa', name: 'AA', from: 850 });
    expect(credit.above?.loanRates).toEqual([
      { quarters: 4, annualRateBasisPoints: 500 },
      { quarters: 8, annualRateBasisPoints: 700 },
      { quarters: 12, annualRateBasisPoints: 900 },
    ]);
    expect(credit.below).toMatchObject({ rating: 'bbb', name: 'BBB', from: 400 });
    expect(credit.below?.loanRates[0]).toEqual({ quarters: 4, annualRateBasisPoints: 750 });
    expect(credit.steps.map((step) => step.name)).toEqual(['AA', 'A', 'BBB', 'BB', 'B']);
  });
});

describe.each(bothCountries)('the credit rating in %s', (_name, country) => {
  it('falls with heavy borrowing, making the next loan dearer, and rises again as it is repaid on time', () => {
    const game = createGame(country(), 7);
    const heavy = loanOffers(game)
      .filter((offer) => offer.quarters === 4 && offer.unavailable === null)
      .at(-1);
    expect(heavy).toBeDefined();
    const rateBefore = fourQuarterRate(game);

    const borrowed = play(game, [{ borrow: [loan(heavy?.amount ?? 0, 4)] }]);

    expect(creditStatus(borrowed.state).rating).toBe('bbb');
    const [fell] = ratingEntries(borrowed.reports[0]);
    expect(fell).toMatchObject({ seriousness: 'warning', headline: 'Credit rating cut to BBB' });
    expect(fell?.cause).toMatch(/debt burden/);
    expect(fourQuarterRate(borrowed.state)).toBeGreaterThan(rateBefore ?? Infinity);
    // The loan already taken keeps the rate it was taken at.
    expect(borrowed.state.debts[0]?.annualRateBasisPoints).toBe(rateBefore);

    const repaid = play(borrowed.state, [{}, {}, {}, {}]);

    expect(creditStatus(repaid.state).rating).toBe('a');
    const rose = repaid.reports.flatMap(ratingEntries);
    expect(rose).toContainEqual(
      expect.objectContaining({ seriousness: 'notable', headline: 'Credit rating raised to A' }),
    );
    expect(fourQuarterRate(repaid.state)).toBe(rateBefore);
    expect(creditStatus(repaid.state).record).toBe(800);
  });

  it('reports the score and what moved it each quarter', () => {
    const game = createGame(country(), 7);

    const { state, reports } = play(game, [{ borrow: [loan(100, 4)] }]);

    const credit = reports[0]?.credit;
    expect(credit?.value).toBe(creditStatus(state).score);
    expect(credit?.contributions.reduce((total, line) => total + line.amount, 0)).toBe(
      credit?.change,
    );
  });
});

describe('a missed payment', () => {
  /** Testland with an empty treasury and a loan whose last repayment its revenue cannot cover. */
  function overstretched(): GameState {
    const game = createGame(testland(), 1);
    return {
      ...game,
      treasury: 0,
      debts: [
        {
          kind: 'loan',
          number: 1,
          taken: game.date,
          borrowed: 60,
          annualRateBasisPoints: 600,
          termQuarters: 4,
          owed: 60,
          repayment: 60,
          quartersLeft: 1,
          schedule: 'level',
        },
      ],
    };
  }

  it('cuts the payment record sharply, and the rating with it', () => {
    const game = overstretched();
    const before = creditStatus(game);

    const result = advanceQuarter(game, steward(game));

    const after = creditStatus(result.state);
    expect(after.record).toBe(before.record - 400);
    expect(ratingEntries(result.report)).toEqual([
      expect.objectContaining({
        headline: 'Credit rating cut to BB',
        cause: expect.stringMatching(/missed payment on Loan 1/) as string,
      }),
    ]);
  });

  it('is slowly made good by repayments on time', () => {
    const game = createGame(testland(), 1);

    const { state } = play(game, [{ borrow: [loan(100, 12)] }, {}, {}, {}]);

    // Three repayments on time, each worth 25 points on the record.
    expect(creditStatus(state).record).toBe(775);
  });
});

describe('the rating sets what may be borrowed', () => {
  it('lowers the most that may be owed when it falls', () => {
    const game = createGame(testland(), 1);

    const { state } = play(game, [{ borrow: [loan(100, 4)] }]);

    // BBB lends up to three quarters of a year's revenue.
    expect(creditStatus(state).rating).toBe('bbb');
    expect(debtStatus(state).limit).toBe(Math.floor((debtStatus(state).yearRevenue * 750) / 1000));
  });
});

describe('the preview', () => {
  it('shows what borrowing would do to the rating', () => {
    const game = createGame(testland(), 1);

    expect(previewQuarter(game, { budget: game.budget }).creditRating).toBe('a');
    expect(previewQuarter(game, { budget: game.budget, borrow: [loan(100, 4)] })).toMatchObject({
      creditRating: 'bbb',
      creditScore: { min: 500, max: 500 },
    });
  });

  it('shows what a budget in deficit would do to the rating', () => {
    const game = createGame(testland(), 1);

    expect(previewQuarter(game, { budget: ruinous }).creditScore.max).toBeLessThan(
      creditStatus(game).score,
    );
  });
});

describe('the risks ahead', () => {
  it('warn when the rating is on course to fall, and say why', () => {
    const game = createGame(testland(), 1);

    const risks = risksAhead(game, { ...steward(game), borrow: [loan(100, 4)] });

    expect(risks).toContainEqual(
      expect.objectContaining({
        kind: 'creditRating',
        headline: 'Credit rating cut to BBB',
        withinQuarters: 1,
        reason: expect.stringMatching(/debt burden/) as string,
      }),
    );
  });
});
