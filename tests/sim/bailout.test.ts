import { describe, expect, it } from 'vitest';
import {
  advanceQuarter,
  austerityStatus,
  budgetBounds,
  createGame,
  debtStatus,
  loanOffers,
  previewQuarter,
  risksAhead,
  siteOf,
  startFault,
  type Borrowing,
  type Budget,
  type Decisions,
  type GameState,
  type TurnReport,
  withinAusterity,
} from '../../src/sim';
import { bothCountries, tavara, testland, testlandInDebt } from './countries';
import { answering, inFirstTerm, steward } from './playing';

/** A loan of a sum over a term, in Money units ($100,000) and quarters. */
function loan(amount: number, quarters: number): Borrowing {
  return { kind: 'loan', amount, quarters };
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

function entriesOf(report: TurnReport | undefined, kind: string) {
  return (report?.entries ?? []).filter((entry) => entry.kind === kind);
}

/** Testland's biggest loan over a year, then a budget that leaves nothing in the treasury. */
function overstretched(): GameState {
  const game = createGame(testland(), 1);
  return play(game, [{ borrow: [loan(100, 4)], budget: ruinous }, { budget: ruinous }]).state;
}

/**
 * Testland rated AA, with an empty treasury and a $10.0m loan whose $2.6m repayment falls due
 * this quarter: at the lowest tax its revenue cannot cover it.
 */
function owingAtAA(): GameState {
  const game = createGame(testland(), 1);
  return {
    ...game,
    treasury: 0,
    credit: { ...game.credit, rating: 'aa' },
    debts: [
      {
        kind: 'loan',
        number: 1,
        taken: game.date,
        borrowed: 100,
        annualRateBasisPoints: 600,
        termQuarters: 4,
        owed: 100,
        repayment: 26,
        quartersLeft: 4,
        schedule: 'level',
      },
    ],
  };
}

/** The quarter after the one a payment was missed in. */
function bailedOut(): { readonly before: GameState; readonly after: TurnReport; state: GameState } {
  const before = overstretched();
  const result = advanceQuarter(before, { ...steward(before), budget: ruinous });
  return { before, after: result.report, state: result.state };
}

describe('a missed payment', () => {
  it('brings a bailout, reported, and the game plays on', () => {
    const { after, state } = bailedOut();

    const [bailout] = entriesOf(after, 'bailout');
    expect(bailout).toMatchObject({
      seriousness: 'serious',
      headline: 'Bailout: the nation’s debts taken over',
    });
    expect(bailout?.cause).toMatch(/could not cover \$[\d.]+m due on Loan 1\./);
    expect(bailout?.cause).toMatch(/one bailout loan at 7% a year/);
    expect(bailout?.cause).toMatch(/austerity holds for 8 quarters, until Year 3 · Quarter 3 ends/);
    expect(entriesOf(after, 'missedPayment')).toEqual([]);
    expect(state.outcome).toEqual({ status: 'playing' });
  });

  it('consolidates everything owed into one bailout loan on the lenders’ terms', () => {
    const { before, after, state } = bailedOut();

    expect(state.debts).toHaveLength(1);
    const [owed] = state.debts;
    expect(owed).toMatchObject({
      kind: 'bailout',
      taken: before.date,
      annualRateBasisPoints: 700,
      termQuarters: 16,
      quartersLeft: 16,
      schedule: 'level',
    });
    expect(owed?.borrowed).toBe(owed?.owed);
    expect(debtStatus(state).debts[0]?.name).toBe('Bailout loan');
    // What the debt did in the quarter adds up: consolidating it neither adds nor takes away.
    expect(after.debt?.contributions.reduce((total, line) => total + line.amount, 0)).toBe(
      after.debt?.change,
    );
    expect(debtStatus(state).debt).toBe((before.debts[0]?.owed ?? 0) + (after.debt?.change ?? 0));
  });

  it('consolidates a bond and a loan alike', () => {
    const game = createGame(testland(), 1);
    const owing: GameState = {
      ...game,
      treasury: 0,
      debts: [
        {
          kind: 'loan',
          number: 1,
          taken: game.date,
          borrowed: 100,
          annualRateBasisPoints: 600,
          termQuarters: 4,
          owed: 100,
          repayment: 26,
          quartersLeft: 4,
          schedule: 'level',
        },
        {
          kind: 'bond',
          number: 2,
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

    const result = advanceQuarter(owing, { ...steward(owing), budget: ruinous });

    expect(result.state.debts.map((debt) => debt.kind)).toEqual(['bailout']);
    expect(debtStatus(result.state).debt).toBe(300 + (result.report.debt?.change ?? 0));
  });

  it('puts the credit rating at its lowest step', () => {
    const game = owingAtAA();

    const result = advanceQuarter(game, { ...steward(game), budget: ruinous });

    expect(result.state.credit).toMatchObject({ rating: 'b', record: 0 });
    expect(entriesOf(result.report, 'creditRating')[0]?.headline).toBe('Credit rating cut to B');
  });

  it('deals approval a blow as it lands', () => {
    const { after } = bailedOut();

    expect(after.approval.contributions).toContainEqual({ label: 'Bailout', amount: -120 });
  });

  it('stops what was to be borrowed that quarter', () => {
    const game = owingAtAA();

    const result = advanceQuarter(game, {
      ...steward(game),
      budget: ruinous,
      borrow: [loan(100, 4)],
    });

    expect(result.state.debts.map((debt) => debt.kind)).toEqual(['bailout']);
    expect(entriesOf(result.report, 'loanTaken')).toEqual([]);
    expect(entriesOf(result.report, 'bailout')[0]?.cause).toMatch(
      'What was to be borrowed this quarter was not lent.',
    );
  });

  it('is shown in the preview', () => {
    const game = overstretched();

    expect(
      previewQuarter(game, { ...steward(game), budget: ruinous }).missedPayment,
    ).toBeGreaterThan(0);
  });
});

describe('austerity', () => {
  it('begins with the bailout and counts down', () => {
    const { state } = bailedOut();

    expect(state.austerity).toEqual({ quartersLeft: 8 });
    expect(austerityStatus(state)).toMatchObject({
      quartersLeft: 8,
      lastQuarter: { year: 3, quarter: 3 },
      taxFloorPercent: 25,
      reason: 'The bailout’s terms hold for 8 quarters more, until Year 3 · Quarter 3 ends.',
    });
    expect(austerityStatus(createGame(testland(), 1))).toBeNull();
  });

  it('brings the budget in force within it', () => {
    const { state } = bailedOut();
    const bounds = budgetBounds(state);

    expect(state.budget.taxRatePercent).toBe(25);
    expect(bounds.taxRatePercent.min).toBe(25);
    for (const area of ['agriculture', 'health', 'education', 'security'] as const) {
      expect(state.budget.spending[area]).toBe(bounds.spending[area].max);
      expect(bounds.spending[area].max).toBeLessThan(ruinous.spending[area]);
    }
    // Food relief and upkeep are not capped.
    expect(state.budget.spending.foodRelief).toBe(200);
    expect(bounds.spending.upkeep.max).toBe(200);
  });

  it('caps spending at a share of the starting budget, on a step, never below one step', () => {
    const country = tavara();
    const game = { ...createGame(country, 1), austerity: { quartersLeft: 3 } };
    const { start } = country;

    const { caps } = austerityStatus(game) ?? { caps: null };

    // Tavara starts with $7.0m on health: four fifths of it is $5.6m, and $5.0m on the step.
    expect(start.budget.spending.health).toBe(70);
    expect(caps).toMatchObject({ health: 50, agriculture: start.budget.spending.agriculture });
    expect(caps?.foodRelief).toBeNull();
    // Testland starts with $1.0m on health, which four fifths of would bring to nothing.
    expect(
      austerityStatus({ ...createGame(testland(), 1), austerity: { quartersLeft: 3 } }),
    ).toMatchObject({ caps: { health: 10 } });
  });

  it('refuses a tax rate below the floor, spending above a cap, borrowing and new projects', () => {
    const { state } = bailedOut();
    const decide = (decisions: Partial<Decisions>) => () =>
      advanceQuarter(state, { ...steward(state), ...decisions });

    expect(decide({ budget: { ...state.budget, taxRatePercent: 24 } })).toThrow(
      new RangeError(
        'The tax rate cannot go below 25% during austerity, until Year 3 · Quarter 3 ends.',
      ),
    );
    expect(
      decide({ budget: { ...state.budget, spending: { ...state.budget.spending, health: 20 } } }),
    ).toThrow(
      new RangeError(
        'Health spending cannot go above $1.0m during austerity, until Year 3 · Quarter 3 ends.',
      ),
    );
    const barred =
      'Nothing can be borrowed during austerity, until Year 3 · Quarter 3 ends: the bailout’s terms forbid it.';
    expect(decide({ borrow: [loan(100, 4)] })).toThrow(new RangeError(barred));
    expect(loanOffers(state).every((offer) => offer.unavailable === barred)).toBe(true);
    const site = state.country.sites[0]?.id ?? '';
    const generous = { ...state, treasury: 10_000 };
    expect(startFault(generous, [site])).toMatch(
      /^No project can be started during austerity, until Year 3 · Quarter 3 ends/,
    );
    expect(() => advanceQuarter(generous, { ...steward(generous), startProjects: [site] })).toThrow(
      RangeError,
    );
  });

  it('lets projects already under way carry on', () => {
    const game = { ...createGame(tavara(), 1), treasury: 5000 };
    const site = 'lowmere-irrigation';
    const started = advanceQuarter(game, { ...steward(game), startProjects: [site] }).state;
    const austere = { ...started, austerity: { quartersLeft: 2 } };

    const next = advanceQuarter(austere, steward(austere, withinAusterity(austere, game.budget)));

    expect(next.state.projects.find((project) => siteOf(project) === site)?.quartersPaid).toBe(2);
  });

  it('ends on schedule when every payment is made, and is reported', () => {
    const { state } = bailedOut();
    const funded = { ...state, treasury: 10_000 };

    const lived = play(
      funded,
      Array.from({ length: 8 }, () => ({})),
    );

    expect(lived.reports.slice(0, 7).flatMap((report) => entriesOf(report, 'austerity'))).toEqual(
      [],
    );
    expect(lived.state.austerity).toBeNull();
    const [ended] = entriesOf(lived.reports.at(-1), 'austerity');
    expect(ended).toMatchObject({ seriousness: 'notable', headline: 'Austerity ends' });
    expect(ended?.cause).toMatch(
      /The bailout loan is still repaid at \$[\d.]+m a quarter, 8 quarters to go\./,
    );
    expect(budgetBounds(lived.state).taxRatePercent.min).toBe(5);
    expect(loanOffers(lived.state).some((offer) => offer.unavailable?.includes('austerity'))).toBe(
      false,
    );
  });

  it('is extended by a missed payment during it, which does not end the game', () => {
    const { state } = bailedOut();
    const broke = { ...state, treasury: 0, austerity: { quartersLeft: 3 } };
    const strapped = { ...state.budget, taxRatePercent: 25 };
    // Testland's revenue at the floor covers the bailout loan, so take it all away first.
    const ruined = {
      ...broke,
      regions: broke.regions.map((region) => ({ ...region, output: 0 })),
    };

    const result = advanceQuarter(ruined, { ...steward(ruined), budget: strapped });

    const [missed] = entriesOf(result.report, 'missedPayment');
    expect(missed).toMatchObject({
      seriousness: 'serious',
      headline: 'Missed payment: austerity extended',
    });
    expect(missed?.cause).toMatch(/Austerity is extended by 4 quarters/);
    expect(entriesOf(result.report, 'bailout')).toEqual([]);
    expect(result.state.austerity).toEqual({ quartersLeft: 6 });
    expect(result.state.debts.map((debt) => [debt.kind, debt.quartersLeft])).toEqual([
      ['bailout', 16],
    ]);
    // No second blow to approval.
    expect(result.report.approval.contributions.map((line) => line.label)).not.toContain('Bailout');
    expect(result.state.outcome).toEqual({ status: 'playing' });
  });
});

describe('the risks ahead', () => {
  it('warn of a bailout on the current course', () => {
    const game = overstretched();

    const risks = risksAhead(game, { ...steward(game), budget: ruinous });

    const bailout = risks.find((risk) => risk.kind === 'bailout');
    expect(bailout).toMatchObject({ headline: 'Bailout', withinQuarters: 1 });
    expect(bailout?.reason).toMatch(
      /^As things stand the treasury and revenue cannot cover the repayment on Loan 1 this quarter\. A missed payment brings a bailout: everything owed becomes one bailout loan, the credit rating falls to B, approval takes a blow of 12.0 points, and austerity holds for 8 quarters: the tax rate no lower than 25%/,
    );
  });

  it('warn during austerity that a missed payment would extend it', () => {
    const { state } = bailedOut();
    const ruined = {
      ...state,
      treasury: 0,
      regions: state.regions.map((region) => ({ ...region, output: 0 })),
    };

    const risks = risksAhead(ruined, steward(ruined));

    expect(risks.find((risk) => risk.kind === 'bailout')).toMatchObject({
      headline: 'Austerity extended',
      reason: expect.stringMatching(/extends it by 4 quarters\.$/) as string,
    });
  });
});

describe.each([...bothCountries, ['Testland, starting in debt', testlandInDebt] as const])(
  'a whole game in %s',
  (_name, country) => {
    it('over-borrows into a bailout, lives through austerity and comes out of it', () => {
      let state = createGame(country(), 2026);
      const reports: TurnReport[] = [];
      const advance = (decisions: Decisions) => {
        const result = advanceQuarter(state, answering(state, decisions));
        reports.push(result.report);
        state = result.state;
      };
      // Read through a function, since the quarters played change the state under the loops.
      const inAusterity = () => state.austerity !== null;

      // The largest loan lenders allow, over a year, if they allow one beside the debt the
      // country starts with, and then every area at its most on the lowest tax until a
      // repayment cannot be met.
      const [largest] = loanOffers(state)
        .filter((offer) => offer.unavailable === null && offer.quarters === 4)
        .sort((a, b) => b.amount - a.amount);
      const owing = state.debts.length;
      if (largest === undefined && owing === 0) throw new Error('No loan is on offer.');
      advance({
        ...steward(state, ruinous),
        borrow: largest === undefined ? [] : [loan(largest.amount, 4)],
      });
      while (!inAusterity()) {
        if (reports.length > 6) throw new Error('No bailout came.');
        advance(steward(state, ruinous));
      }
      const bailedAt = reports.length;
      expect(entriesOf(reports.at(-1), 'bailout')).toHaveLength(1);
      expect(state.debts.map((debt) => debt.kind)).toEqual(['bailout']);
      expect(state.credit.rating).toBe('b');

      // Through austerity on the budget the game began with, brought within it, and with
      // enough food relief, which austerity does not cap, to carry a region through a drought.
      const sensible = (game: GameState) => {
        const { start } = game.country;
        const foodRelief = Math.max(50, start.budget.spending.foodRelief);
        return withinAusterity(game, {
          ...start.budget,
          spending: { ...start.budget.spending, foodRelief },
        });
      };
      while (inAusterity()) {
        expect(state.outcome).toEqual({ status: 'playing' });
        advance(steward(state, sensible(state)));
      }
      expect(reports.length - bailedAt).toBe(8);
      expect(entriesOf(reports.at(-1), 'austerity')[0]?.headline).toBe('Austerity ends');

      // And on to the vote that closes the term, every repayment made.
      while (inFirstTerm(state)) advance(steward(state, sensible(state)));
      expect(reports).toHaveLength(20);
      expect(
        reports.slice(bailedAt).flatMap((report) => entriesOf(report, 'missedPayment')),
      ).toEqual([]);
      expect(state.austerity).toBeNull();
      // What is still owed, if anything, is the bailout loan, repaid on schedule.
      expect(state.debts.every((debt) => debt.kind === 'bailout')).toBe(true);
    });
  },
);
