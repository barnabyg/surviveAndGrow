import { describe, expect, it } from 'vitest';
import {
  advanceQuarter,
  createGame,
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

function line(report: TurnReport | undefined, label: string): number | undefined {
  return report?.treasury.contributions.find((entry) => entry.label === label)?.amount;
}

function entriesOf(report: TurnReport | undefined, kind: string) {
  return (report?.entries ?? []).filter((entry) => entry.kind === kind);
}

describe('the loans on offer', () => {
  it('are every sum on the menu over every term, each with its repayment and its interest', () => {
    const game = createGame(testland(), 1);

    const offers = loanOffers(game);

    expect(offers.map((offer) => [offer.amount, offer.quarters])).toEqual([
      [100, 4],
      [100, 8],
      [100, 12],
      [250, 4],
      [250, 8],
      [250, 12],
      [500, 4],
      [500, 8],
      [500, 12],
    ]);
    // $10.0m over four quarters at 6% a year: 1.5% a quarter on what is still owed. Interest
    // is counted to the nearest $0.1m, so $2.6m a quarter repays it with $0.4m of interest.
    expect(offers[0]).toMatchObject({
      annualRateBasisPoints: 600,
      repayment: 26,
      totalInterest: 4,
      unavailable: null,
    });
  });
});

describe.each(bothCountries)('a loan in %s', (_name, country) => {
  it('arrives as the quarter ends, is repaid from the next, and leaves the nation debt-free', () => {
    const game = createGame(country(), 7);

    const taken = play(game, [{ borrow: [loan(100, 4)] }]);
    const [first] = taken.reports;

    expect(line(first, 'Loan 1 received')).toBe(100);
    expect(line(first, 'Interest on Loan 1')).toBeUndefined();
    expect(first?.debt).toMatchObject({ value: 100, change: 100 });
    expect(debtStatus(taken.state).debt).toBe(100);
    expect(entriesOf(first, 'loanTaken')).toEqual([
      expect.objectContaining({ headline: 'Borrowed $10.0m: Loan 1' }),
    ]);

    const repaid = play(taken.state, [{}, {}, {}, {}]);
    // Each repayment is interest on what is still owed, and the rest off the principal.
    const paid = repaid.reports.map(
      (report) =>
        (line(report, 'Interest on Loan 1') ?? 0) + (line(report, 'Repaying Loan 1') ?? 0),
    );
    expect(paid).toEqual([-26, -26, -26, -26]);
    expect(repaid.reports.map((report) => report.debt?.value)).toEqual([76, 51, 26, 0]);
    expect(repaid.state.debts).toEqual([]);
    expect(entriesOf(repaid.reports.at(-1), 'loanRepaid')).toEqual([
      expect.objectContaining({ headline: 'Repaid: Loan 1' }),
    ]);
    expect(repaid.state.history.at(-1)).toMatchObject({ debt: 0, debtBurden: 0 });
  });

  it('is paid before the budget, so a heavy repayment cuts spending', () => {
    const game = createGame(country(), 7);
    const lavish: Budget = {
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
    const { state } = play(game, [{ borrow: [loan(100, 4)] }]);

    const result = advanceQuarter(state, { ...steward(state), budget: lavish });

    // The repayment is paid in full; the budget gets what is left, and is cut to it.
    expect(
      (line(result.report, 'Interest on Loan 1') ?? 0) +
        (line(result.report, 'Repaying Loan 1') ?? 0),
    ).toBe(-26);
    expect(entriesOf(result.report, 'spendingCut')).toHaveLength(1);
    expect(entriesOf(result.report, 'missedPayment')).toEqual([]);
    // Rounding the cut down leaves less than one unit for each area.
    expect(result.state.treasury).toBeLessThan(6);
  });
});

describe('borrowing', () => {
  it('cannot take the debt past a year’s revenue', () => {
    const game = createGame(testland(), 1);
    const { limit } = debtStatus(game);
    const tooMuch = loanOffers(game).filter((offer) => offer.amount > limit);

    expect(tooMuch.length).toBeGreaterThan(0);
    for (const offer of tooMuch) expect(offer.unavailable).toMatch(/past the/);
    expect(() => advanceQuarter(game, { budget: game.budget, borrow: [loan(500, 4)] })).toThrow(
      RangeError,
    );
  });

  it('refuses a loan that is not on the menu', () => {
    const game = createGame(testland(), 1);

    expect(() => previewQuarter(game, { budget: game.budget, borrow: [loan(120, 4)] })).toThrow(
      new RangeError('No loan of $12.0m over 4 quarters is on offer.'),
    );
  });

  it('is shown in the preview before the quarter ends', () => {
    const game = createGame(testland(), 1);

    const preview = previewQuarter(game, { budget: game.budget, borrow: [loan(100, 4)] });

    expect(preview.borrowed).toBe(100);
    expect(preview.debt).toEqual({ min: 100, max: 100 });
    expect(preview.repayments).toEqual({ min: 0, max: 0 });
  });
});

describe('a missed payment', () => {
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

  /** Testland's biggest loan over a year, then a budget that leaves nothing in the treasury. */
  function overstretched(): GameState {
    const game = createGame(testland(), 1);
    return play(game, [{ borrow: [loan(100, 4)], budget: ruinous }, { budget: ruinous }]).state;
  }

  it('is reported, and what went unpaid is added to the debt', () => {
    const game = overstretched();
    expect(game.treasury).toBeLessThan(26);
    const before = debtStatus(game).debt;

    const result = advanceQuarter(game, { ...steward(game), budget: ruinous });

    const [missed] = entriesOf(result.report, 'missedPayment');
    expect(missed).toMatchObject({ seriousness: 'serious', headline: 'Missed payment: Loan 1' });
    const paid = -(
      (line(result.report, 'Interest on Loan 1') ?? 0) +
      (line(result.report, 'Repaying Loan 1') ?? 0)
    );
    expect(paid).toBeLessThan(26);
    // What is owed falls by only what was paid beyond the interest: 1.5% of $7.6m, $0.1m.
    expect(before).toBe(76);
    const interest = 1;
    expect(result.state.debts[0]?.owed).toBe(before + interest - paid);
    expect(result.report.debt?.contributions.reduce((total, l) => total + l.amount, 0)).toBe(
      result.report.debt?.change,
    );
    // The repayments still to come rise to clear what went unpaid.
    expect(result.state.debts[0]?.repayment).toBeGreaterThan(26);
  });

  it('is foreseen among the risks ahead', () => {
    const game = overstretched();

    const risks = risksAhead(game, { ...steward(game), budget: ruinous });

    expect(risks).toContainEqual(
      expect.objectContaining({
        kind: 'missedPayment',
        headline: 'Missed payment',
        withinQuarters: 1,
      }),
    );
  });

  it('is foreseen by the empty-treasury risk, which counts repayments', () => {
    const game = overstretched();

    const risks = risksAhead(game, { ...steward(game), budget: ruinous });

    expect(risks.find((risk) => risk.kind === 'treasury')?.reason).toMatch(
      'Repayments on debts come first: $2.6m this quarter.',
    );
  });
});

describe('the debt burden', () => {
  it('is what is owed against a year’s revenue at the budget in force', () => {
    // Testland's regions produce $25.0m a quarter, taxed at 20%: $5.0m, or $20.0m a year.
    const game = createGame(testland(), 1);
    expect(debtStatus(game)).toMatchObject({ debt: 0, yearRevenue: 200, burden: 0, limit: 200 });

    const { state } = play(game, [{ borrow: [loan(100, 8)] }]);

    expect(debtStatus(state)).toMatchObject({ debt: 100, burden: 500 });
    expect(state.history.at(-1)).toMatchObject({ debt: 100, debtBurden: 500 });
    expect(
      previewQuarter(game, { budget: game.budget, borrow: [loan(100, 8)] }).debtBurden,
    ).toEqual({ min: 500, max: 500 });
  });
});
