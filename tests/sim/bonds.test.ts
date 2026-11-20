import { describe, expect, it } from 'vitest';
import {
  advanceQuarter,
  bondOffers,
  bondMaturities,
  bondsClosedBecause,
  createGame,
  creditStatus,
  debtStatus,
  loanOffers,
  maturityOfTaking,
  risksAhead,
  type Borrowing,
  type Budget,
  type CreditRating,
  type Decisions,
  type GameState,
  type TurnReport,
} from '../../src/sim';
import { bothCountries, tavara, testland } from './countries';
import { steward } from './players';

/** A bond of a sum maturing after a term, in Money units ($100,000) and quarters. */
function bond(amount: number, quarters: number): Borrowing {
  return { kind: 'bond', amount, quarters };
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

describe.each(bothCountries)('a bond in %s', (_name, country) => {
  it('raises its sum, pays only interest each quarter, and repays the whole at maturity', () => {
    const game = createGame(country(), 7);

    const issued = play(game, [{ borrow: [bond(200, 8)] }]);
    const [first] = issued.reports;

    expect(line(first, 'Bond 1 received')).toBe(200);
    expect(first?.debt).toMatchObject({ value: 200, change: 200 });
    expect(entriesOf(first, 'loanTaken')).toEqual([
      expect.objectContaining({ headline: 'Issued $20.0m in bonds: Bond 1' }),
    ]);

    // 4% a year on $20.0m: $0.2m a quarter, to the nearest $0.1m.
    const held = play(
      issued.state,
      Array.from({ length: 8 }, () => ({})),
    );
    expect(held.reports.map((report) => line(report, 'Interest on Bond 1'))).toEqual(
      Array.from({ length: 8 }, () => -2),
    );
    expect(held.reports.map((report) => line(report, 'Repaying Bond 1'))).toEqual([
      ...Array.from({ length: 7 }, () => undefined),
      -200,
    ]);
    expect(held.reports.map((report) => report.debt?.value)).toEqual([
      ...Array.from({ length: 7 }, () => 200),
      0,
    ]);
    expect(held.state.debts).toEqual([]);
    expect(entriesOf(held.reports.at(-1), 'loanRepaid')).toEqual([
      expect.objectContaining({ headline: 'Repaid: Bond 1' }),
    ]);
    expect(entriesOf(held.reports.at(-1), 'missedPayment')).toEqual([]);
    expect(debtStatus(held.state).debt).toBe(0);
  });
});

describe('the bonds on offer', () => {
  it('are every sum on the menu over every term, each with its interest and its maturity', () => {
    const game = createGame(tavara(), 1);

    const offers = bondOffers(game);

    expect(offers.map((offer) => [offer.amount, offer.quarters])).toEqual(
      [200, 500, 1000, 2000].flatMap((amount) => [8, 12, 16].map((term) => [amount, term])),
    );
    // $50.0m for twelve quarters at 4.5% a year: $0.6m of interest a quarter, to the
    // nearest $0.1m, and the whole $50.0m at maturity.
    expect(offers.find((offer) => offer.amount === 500 && offer.quarters === 12)).toMatchObject({
      kind: 'bond',
      annualRateBasisPoints: 450,
      repayment: 6,
      totalInterest: 72,
      unavailable: null,
    });
    // Tavara raises $124.0m a year, so at A it may owe no more than that.
    expect(offers.find((offer) => offer.amount === 2000)?.unavailable).toMatch(/past the/);
    expect(maturityOfTaking({ year: 1, quarter: 1 }, 12)).toEqual({ year: 4, quarter: 1 });
  });

  it('cost less than any loan at the same rating, and less again at a better one', () => {
    for (const rating of ['aa', 'a'] as const) {
      const game = rated(createGame(tavara(), 1), rating);
      const dearestBond = Math.max(...bondOffers(game).map((offer) => offer.annualRateBasisPoints));
      const cheapestLoan = Math.min(
        ...loanOffers(game).map((offer) => offer.annualRateBasisPoints),
      );
      expect(dearestBond).toBeLessThan(cheapestLoan);
    }
    const atA = bondOffers(rated(createGame(tavara(), 1), 'a'))[0];
    const atAA = bondOffers(rated(createGame(tavara(), 1), 'aa'))[0];
    expect(atAA?.annualRateBasisPoints).toBeLessThan(atA?.annualRateBasisPoints ?? 0);
  });

  it('cannot be issued below the rating balance data sets, and say what rating is needed', () => {
    const game = rated(createGame(tavara(), 1), 'bbb');

    expect(bondOffers(game)).toEqual([]);
    expect(bondsClosedBecause(game.credit.rating)).toBe(
      'Bonds can be issued only at a credit rating of A or better. The nation is rated BBB.',
    );
    expect(() => advanceQuarter(game, { ...steward(game), borrow: [bond(200, 8)] })).toThrow(
      new RangeError(
        'Bonds can be issued only at a credit rating of A or better. The nation is rated BBB.',
      ),
    );
    expect(bondsClosedBecause('aa')).toBeNull();
    // The rating's steps say where bonds may be issued, and at what rates.
    const { current, above } = creditStatus(game);
    expect(current.bondRates).toEqual([]);
    expect(above?.bondRates).toEqual([
      { quarters: 8, annualRateBasisPoints: 400 },
      { quarters: 12, annualRateBasisPoints: 450 },
      { quarters: 16, annualRateBasisPoints: 500 },
    ]);
  });
});

describe('a bond’s maturity the treasury cannot cover', () => {
  /** Testland with an empty treasury and a bond of $20.0m whose maturity is this quarter. */
  function maturing(): GameState {
    const game = createGame(testland(), 1);
    return {
      ...game,
      treasury: 0,
      debts: [
        {
          kind: 'bond',
          number: 1,
          taken: game.date,
          borrowed: 200,
          annualRateBasisPoints: 400,
          termQuarters: 8,
          owed: 200,
          repayment: 2,
          quartersLeft: 1,
        },
      ],
    };
  }

  it('is a missed payment: what goes unpaid is added to the debt and repaid over a year', () => {
    const game = maturing();

    const result = advanceQuarter(game, { ...steward(game), budget: ruinous });

    const [missed] = entriesOf(result.report, 'missedPayment');
    expect(missed).toMatchObject({ seriousness: 'serious', headline: 'Missed payment: Bond 1' });
    expect(missed?.cause).toMatch(/due at its maturity/);
    const paid = -(
      (line(result.report, 'Interest on Bond 1') ?? 0) +
      (line(result.report, 'Repaying Bond 1') ?? 0)
    );
    expect(paid).toBeLessThan(202);
    const [left] = result.state.debts;
    expect(left).toMatchObject({ kind: 'bond', owed: 202 - paid, quartersLeft: 4 });
    // It is now repaid level, a quarter of it and interest each quarter.
    expect(left?.repayment).toBeGreaterThan((202 - paid) / 4);
    expect(result.state.credit.record).toBe(game.credit.record - 400);
    expect(debtStatus(result.state).debt).toBe(202 - paid);
  });

  it('then falls to level repayments that clear it', () => {
    const game = maturing();
    const missed = advanceQuarter(game, { ...steward(game), budget: ruinous }).state;
    const generous = { ...missed, treasury: 1000, budget: game.budget };

    const repaid = play(generous, [{}, {}, {}, {}]);

    const paid = repaid.reports.map(
      (report) =>
        (line(report, 'Interest on Bond 1') ?? 0) + (line(report, 'Repaying Bond 1') ?? 0),
    );
    expect(new Set(paid.slice(0, 3)).size).toBe(1);
    expect(repaid.state.debts).toEqual([]);
    expect(repaid.reports.flatMap((report) => entriesOf(report, 'missedPayment'))).toEqual([]);
  });
});

/** The same game with its credit rating set, as if lenders had come to judge it so. */
function rated(game: GameState, rating: CreditRating): GameState {
  return { ...game, credit: { ...game.credit, rating } };
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

describe('bonds in the debt', () => {
  it('count in the debt, the debt burden, the most that may yet be owed and the rating', () => {
    const game = createGame(tavara(), 1);

    const { state } = play(game, [{ borrow: [bond(1000, 16)] }]);

    // $100.0m against a year's revenue of $124.0m.
    expect(debtStatus(state)).toMatchObject({ debt: 1000, burden: 806 });
    expect(loanOffers(state).find((offer) => offer.amount === 100)?.unavailable).toMatch(/past/);
    // A burden of 80.6% costs 322 points, which with the quarter's deficit cuts it to BB.
    const credit = creditStatus(state);
    expect(credit.parts).toContainEqual({ label: 'Debt burden of 80.6%', amount: -322 });
    expect(credit.rating).toBe('bb');
  });
});

describe('the maturities on the term timeline', () => {
  it('mark every bond owed or planned, those after the vote among them', () => {
    const game = createGame(tavara(), 1);
    // Bond 1 is issued in the game's first quarter and Bond 2 in its fifth; the term's vote
    // is held as its twentieth ends.
    const { state } = play(game, [
      { borrow: [bond(200, 8)] },
      {},
      {},
      {},
      { borrow: [bond(200, 16)] },
    ]);

    const marks = bondMaturities(state, [bond(500, 12)]);

    expect(marks).toEqual([
      {
        name: 'Bond 1',
        quarter: 9,
        date: { year: 3, quarter: 1 },
        due: 200,
        planned: false,
        afterVote: false,
      },
      {
        name: 'Bond 2',
        quarter: 21,
        date: { year: 6, quarter: 1 },
        due: 200,
        planned: false,
        afterVote: true,
      },
      {
        name: 'Planned bond',
        quarter: 18,
        date: { year: 5, quarter: 2 },
        due: 500,
        planned: true,
        afterVote: false,
      },
    ]);
  });
});

describe('the risks ahead', () => {
  /** Tavara owing a $100.0m bond with the quarters given to run, and the treasury given. */
  function owingBond(quartersLeft: number, treasury: number): GameState {
    const game = createGame(tavara(), 1);
    return {
      ...game,
      treasury,
      debts: [
        {
          kind: 'bond',
          number: 1,
          taken: game.date,
          borrowed: 1000,
          annualRateBasisPoints: 450,
          termQuarters: 12,
          owed: 1000,
          repayment: 11,
          quartersLeft,
        },
      ],
    };
  }

  const maturityRisks = (game: GameState) =>
    risksAhead(game, steward(game)).filter((risk) => risk.kind === 'bondMaturity');

  it('warn of a maturity beyond the horizon that the treasury is not on course to cover', () => {
    const game = owingBond(10, 420);

    expect(maturityRisks(game)).toEqual([
      expect.objectContaining({
        headline: 'Bond 1 cannot be repaid',
        withinQuarters: 10,
        likelihood: 'almostCertain',
      }),
    ]);
    expect(maturityRisks(game)[0]?.reason).toMatch(
      /^Bond 1’s \$100\.0m falls due in full in 9 quarters, in Year 3 · Quarter 2\./,
    );
  });

  it('say nothing of a maturity the treasury is on course to cover', () => {
    expect(maturityRisks(owingBond(10, 20_000))).toEqual([]);
  });

  it('warn of a maturity inside the horizon once, not as a missed payment besides', () => {
    const game = owingBond(2, 420);

    const risks = risksAhead(game, steward(game));

    expect(risks.filter((risk) => risk.kind === 'bondMaturity')).toEqual([
      expect.objectContaining({ headline: 'Bond 1 cannot be repaid', withinQuarters: 2 }),
    ]);
    expect(risks.filter((risk) => risk.kind === 'missedPayment')).toEqual([]);
  });
});
