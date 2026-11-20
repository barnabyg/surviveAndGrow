import { describe, expect, it } from 'vitest';
import {
  advanceQuarter,
  bondOffers,
  bondMaturities,
  bondsClosedBecause,
  createGame,
  formatMoney,
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

/** A loan of a sum over a term. */
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

describe.each(bothCountries)('a bond in %s', (_name, country) => {
  it('is earned by repaying a loan on time, then pays only interest and repays the whole at maturity', () => {
    // Taxed at 30% the budget runs a surplus, so the rating is not dragged down by a deficit,
    // and enough is spent on agriculture that the harvests feed every region.
    const start = createGame(country(), 7);
    const earning: Budget = {
      taxRatePercent: 30,
      spending: {
        ...start.budget.spending,
        agriculture: Math.max(30, start.budget.spending.agriculture),
      },
    };
    expect(bondsClosedBecause(start.credit.rating)).toBe(
      'Bonds can be issued only at a credit rating of AA or better. The nation is rated A.',
    );

    // A small loan repaid on time puts 25 points a quarter on the payment record, until the
    // nation is rated AA.
    let played = play(start, [{ budget: earning, borrow: [loan(100, 12)] }]);
    let quarters = 1;
    while (played.state.credit.rating !== 'aa' && quarters < 12) {
      played = play(played.state, [{ budget: earning }]);
      quarters += 1;
    }
    const game = played.state;
    expect(game.credit.rating).toBe('aa');
    expect(bondOffers(game).length).toBeGreaterThan(0);
    // The report of the rise says that bonds can now be issued.
    const [raised] = entriesOf(played.reports.at(-1), 'creditRating');
    expect(raised?.headline).toBe('Credit rating raised to AA');
    expect(raised?.cause).toMatch(
      / Bonds can now be issued, at \d+(\.\d+)?% to \d+(\.\d+)?% a year\.$/,
    );

    const issued = play(game, [{ budget: earning, borrow: [bond(200, 8)] }]);
    const [first] = issued.reports;

    // The loan is still owed, so the bond is numbered after it.
    expect(line(first, 'Bond 2 received')).toBe(200);
    expect(first?.debt?.contributions).toContainEqual({ label: 'Bond 2 taken', amount: 200 });
    expect(entriesOf(first, 'loanTaken')).toEqual([
      expect.objectContaining({ headline: 'Issued $20.0m in bonds: Bond 2' }),
    ]);
    expect(issued.state.debts.at(-1)).toMatchObject({
      kind: 'bond',
      annualRateBasisPoints: 350,
      schedule: 'atMaturity',
    });

    // 3.5% a year on $20.0m: $0.2m a quarter, to the nearest $0.1m.
    const held = play(
      issued.state,
      Array.from({ length: 8 }, () => ({ budget: earning })),
    );
    expect(held.reports.map((report) => line(report, 'Interest on Bond 2'))).toEqual(
      Array.from({ length: 8 }, () => -2),
    );
    expect(held.reports.map((report) => line(report, 'Repaying Bond 2'))).toEqual([
      ...Array.from({ length: 7 }, () => undefined),
      -200,
    ]);
    expect(held.state.debts.filter((debt) => debt.kind === 'bond')).toEqual([]);
    expect(entriesOf(held.reports.at(-1), 'loanRepaid')).toContainEqual(
      expect.objectContaining({ headline: 'Repaid: Bond 2' }),
    );
    expect(held.reports.flatMap((report) => entriesOf(report, 'missedPayment'))).toEqual([]);
  });
});

describe('the bonds on offer', () => {
  it('are every sum on the menu over every term, each with its interest and its maturity', () => {
    const game = rated(createGame(tavara(), 1), 'aa');

    const offers = bondOffers(game);

    expect(offers.map((offer) => [offer.amount, offer.quarters])).toEqual(
      [200, 500, 1000, 2000].flatMap((amount) => [8, 12, 16].map((term) => [amount, term])),
    );
    // $50.0m for twelve quarters at 4% a year, AA's rate: $0.5m of interest a quarter, to
    // the nearest $0.1m, and the whole $50.0m at maturity.
    expect(offers.find((offer) => offer.amount === 500 && offer.quarters === 12)).toMatchObject({
      kind: 'bond',
      annualRateBasisPoints: 400,
      repayment: 5,
      totalInterest: 60,
      unavailable: null,
    });
    // Tavara raises $124.0m a year, so at AA it may owe no more than $155.0m.
    expect(offers.find((offer) => offer.amount === 2000)?.unavailable).toMatch(/past the/);
    expect(maturityOfTaking({ year: 1, quarter: 1 }, 12)).toEqual({ year: 4, quarter: 1 });
  });

  it('cost less than any loan at the same rating', () => {
    const game = rated(createGame(tavara(), 1), 'aa');

    const dearestBond = Math.max(...bondOffers(game).map((offer) => offer.annualRateBasisPoints));
    const cheapestLoan = Math.min(...loanOffers(game).map((offer) => offer.annualRateBasisPoints));

    expect(dearestBond).toBe(450);
    expect(cheapestLoan).toBe(500);
  });

  it('cannot be issued below AA, and say what rating is needed', () => {
    const game = createGame(tavara(), 1);
    const closed =
      'Bonds can be issued only at a credit rating of AA or better. The nation is rated A.';

    expect(game.credit.rating).toBe('a');
    expect(bondOffers(game)).toEqual([]);
    expect(bondsClosedBecause(game.credit.rating)).toBe(closed);
    expect(() => advanceQuarter(game, { ...steward(game), borrow: [bond(200, 8)] })).toThrow(
      new RangeError(closed),
    );
    expect(bondsClosedBecause('aa')).toBeNull();
    // The rating's steps say where bonds may be issued, and at what rates: AA takes half a
    // point off the rates balance data sets for A.
    const { current, above } = creditStatus(game);
    expect(current.bondRates).toEqual([]);
    expect(above?.bondRates).toEqual([
      { quarters: 8, annualRateBasisPoints: 350 },
      { quarters: 12, annualRateBasisPoints: 400 },
      { quarters: 16, annualRateBasisPoints: 450 },
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
          schedule: 'atMaturity',
        },
      ],
    };
  }

  it('is a missed payment: what goes unpaid is still owed and repaid over a year', () => {
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
    // The interest was paid, so nothing was added to the debt: the principal unpaid was owed
    // already.
    expect(paid).toBeGreaterThan(2);
    expect(missed?.cause).not.toMatch(/added to the debt/);
    expect(missed?.cause).toContain(
      `${formatMoney(200 - (paid - 2))} of principal went unpaid, and ${formatMoney(202 - paid)} is still owed`,
    );
    const [left] = result.state.debts;
    expect(left).toMatchObject({ kind: 'bond', owed: 202 - paid, quartersLeft: 4 });
    // It is now repaid level, a quarter of it and interest each quarter.
    expect(left?.repayment).toBeGreaterThan((202 - paid) / 4);
    expect(result.state.credit.record).toBe(game.credit.record - 400);
    expect(debtStatus(result.state).debt).toBe(202 - paid);
  });

  it('before maturity adds only the interest it could not pay to the debt', () => {
    // A bond so large that its interest, $20.0m a quarter, is more than everything there is.
    const game = maturing();
    const [due] = game.debts;
    if (due === undefined) throw new Error('No bond.');
    const owing = {
      ...game,
      debts: [{ ...due, borrowed: 20_000, owed: 20_000, repayment: 200, quartersLeft: 3 }],
    };

    const result = advanceQuarter(owing, { ...steward(owing), budget: ruinous });

    const [missed] = entriesOf(result.report, 'missedPayment');
    const paid = -(line(result.report, 'Interest on Bond 1') ?? 0);
    expect(paid).toBeLessThan(200);
    expect(result.state.debts[0]?.owed).toBe(20_000 + 200 - paid);
    expect(missed?.cause).toContain(
      `The ${formatMoney(200 - paid)} of interest it could not pay was added to the debt: ${formatMoney(20_200 - paid)} is now owed.`,
    );
  });

  it('cuts a rating of AA, and the report says bonds can no longer be issued', () => {
    const game = rated(maturing(), 'aa');

    const result = advanceQuarter(game, { ...steward(game), budget: ruinous });

    const [cut] = entriesOf(result.report, 'creditRating');
    expect(cut?.headline).toMatch(/^Credit rating cut to /);
    expect(cut?.cause).toMatch(/ Bonds can no longer be issued\.$/);
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

    const { state } = play(rated(game, 'aa'), [{ borrow: [bond(1000, 16)] }]);

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
    // Each is issued as if the nation were rated AA at the time.
    const first = play(rated(game, 'aa'), [{ borrow: [bond(200, 8)] }, {}, {}, {}]).state;
    const { state } = play(rated(first, 'aa'), [{ borrow: [bond(200, 16)] }]);

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

  it('give each of several planned bonds a name of its own', () => {
    const game = rated(createGame(tavara(), 1), 'aa');

    const marks = bondMaturities(game, [bond(200, 8), bond(200, 8)]);

    expect(marks.map((mark) => mark.name)).toEqual(['Planned bond 1', 'Planned bond 2']);
  });
});

describe('the risks ahead', () => {
  /**
   * Tavara owing a $100.0m bond at 4.5% with the quarters given to run, and the treasury
   * given. Its maturity asks $101.1m: the sum and the quarter's interest.
   */
  function owingBond(quartersLeft: number, treasury: number, termQuarters = 12): GameState {
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
          termQuarters,
          owed: 1000,
          repayment: 11,
          quartersLeft,
          schedule: 'atMaturity',
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
      /^Bond 1’s \$101\.1m falls due in full in 9 quarters, in Year 3 · Quarter 2\./,
    );
  });

  it('count the maturity quarter’s interest in what falls due', () => {
    // On its course the treasury holds about $100.5m by then: the sum, but not its interest.
    const game = owingBond(10, 1615);

    const [risk] = maturityRisks(game);

    expect(risk?.reason).toMatch(
      /^Bond 1’s \$101\.1m falls due in full in 9 quarters, in Year 3 · Quarter 2\. On the course it is on, the treasury will hold about \$100\.\dm by then\./,
    );
  });

  it('say over how many quarters a missed maturity is repaid, never more than its term', () => {
    const game = owingBond(2, 420, 3);

    const [risk] = maturityRisks(game);

    expect(risk?.reason).toContain('repaid over 3 quarters');
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
