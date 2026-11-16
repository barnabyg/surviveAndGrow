import { describe, expect, it } from 'vitest';
import {
  advanceQuarter,
  createGame,
  CountryFileError,
  loadCountry,
  type Budget,
  type GameState,
  type TurnResult,
} from '../../src/sim';
import tavaraFile from '../../src/countries/tavara.json';
import { bothCountries, tavara, testland } from './countries';
import { steward } from './players';

/** Ends a quarter with the given budget. Money is in units of $100,000. */
function endQuarter(game: GameState, budget: Budget = game.budget): TurnResult {
  return advanceQuarter(game, steward(game, budget));
}

function amountOf(result: TurnResult, label: string): number | undefined {
  return result.report.treasury.contributions.find((line) => line.label === label)?.amount;
}

const everythingAtMost: Budget = {
  taxRatePercent: 5,
  spending: { agriculture: 200, foodRelief: 200, health: 200, education: 200, security: 200 },
};

describe('revenue', () => {
  it('is the tax rate applied to the output of each region', () => {
    const game = createGame(tavara(), 1);

    const result = endQuarter(game);

    // Tavara starts at 18%. Arden Vale produces $52.0m a quarter: 18% of that is $9.4m.
    expect(amountOf(result, 'Tax from Arden Vale')).toBe(94);
    expect(amountOf(result, 'Tax from Lowmere Plains')).toBe(68);
    expect(amountOf(result, 'Tax from Salt Coast')).toBe(50);
    expect(amountOf(result, 'Tax from South Delta')).toBe(47);
    expect(amountOf(result, 'Tax from Korr Highlands')).toBe(29);
    expect(amountOf(result, 'Tax from The Dry East')).toBe(22);
  });

  it('rises with the tax rate', () => {
    const game = createGame(tavara(), 1);

    const result = endQuarter(game, { ...game.budget, taxRatePercent: 25 });

    expect(amountOf(result, 'Tax from Arden Vale')).toBe(130);
  });
});

describe('the treasury', () => {
  it('falls by the deficit when spending is more than revenue', () => {
    const game = createGame(tavara(), 1);

    const { state, report } = endQuarter(game);

    // Revenue $31.0m, spending $36.0m: the treasury falls from $42.0m to $37.0m.
    expect(state.treasury).toBe(370);
    expect(report.treasury).toMatchObject({ value: 370, change: -50 });
  });

  it('rises by the surplus when revenue is more than spending', () => {
    const game = createGame(testland(), 1);

    const { state, report } = endQuarter(game);

    // Revenue $5.0m, spending $4.0m: the treasury rises from $10.0m to $11.0m.
    expect(state.treasury).toBe(110);
    expect(report.treasury).toMatchObject({ value: 110, change: 10 });
  });

  it('lists each spending area as a cost', () => {
    const result = endQuarter(createGame(tavara(), 1));

    expect(amountOf(result, 'Agriculture')).toBe(-110);
    expect(amountOf(result, 'Food relief')).toBe(-70);
    expect(amountOf(result, 'Health')).toBe(-70);
    expect(amountOf(result, 'Education')).toBe(-60);
    expect(amountOf(result, 'Security')).toBe(-50);
  });

  it('keeps the budget in force for the quarters that follow', () => {
    const game = createGame(tavara(), 1);
    const budget: Budget = { ...game.budget, taxRatePercent: 30 };

    const { state } = endQuarter(game, budget);

    expect(state.budget).toEqual(budget);
  });
});

describe('when the treasury cannot cover the budget', () => {
  it('cuts every area to what can be afforded, and says so', () => {
    const game = createGame(tavara(), 1);

    const result = endQuarter(game, everythingAtMost);

    // $42.0m in hand and $8.6m of revenue against $100.0m of spending: 50.6% can be paid.
    for (const area of ['Agriculture', 'Food relief', 'Health', 'Education', 'Security']) {
      expect(amountOf(result, area)).toBe(-101);
    }
    expect(result.state.treasury).toBe(1);
    expect(result.report.notices).toContainEqual(
      expect.objectContaining({
        title: 'Spending was cut',
        detail:
          'The treasury could not cover the $100.0m budget. Every area was cut to what could be afforded: $50.5m in all.',
      }),
    );
  });

  it('leaves the budget the player set in force', () => {
    const game = createGame(tavara(), 1);

    const { state } = endQuarter(game, everythingAtMost);

    expect(state.budget).toEqual(everythingAtMost);
  });

  it('says nothing about cuts when the budget is covered', () => {
    const { report } = endQuarter(createGame(tavara(), 1));

    expect(report.notices.map((notice) => notice.title)).not.toContain('Spending was cut');
  });
});

describe.each(bothCountries)('the budget in %s', (_name, country) => {
  it('explains the whole change in the treasury', () => {
    let game = createGame(country(), 3);
    for (let quarter = 0; quarter < 6; quarter += 1) {
      const { state, report } = endQuarter(game);
      const explained = report.treasury.contributions.reduce((sum, line) => sum + line.amount, 0);

      expect(explained).toBe(report.treasury.change);
      expect(state.treasury - game.treasury).toBe(report.treasury.change);
      game = state;
    }
  });

  it('never lets the treasury fall below zero', () => {
    let game = createGame(country(), 3);
    for (let quarter = 0; quarter < 8; quarter += 1) {
      game = endQuarter(game, everythingAtMost).state;

      expect(game.treasury).toBeGreaterThanOrEqual(0);
    }
  });

  it('refuses a tax rate outside the range the game allows', () => {
    const game = createGame(country(), 3);

    expect(() => endQuarter(game, { ...game.budget, taxRatePercent: 80 })).toThrow(
      'The tax rate must be a whole number from 5 to 40, but is 80.',
    );
  });

  it('refuses spending outside the range the game allows', () => {
    const game = createGame(country(), 3);
    const spending = { ...game.budget.spending, health: 205 };

    expect(() => endQuarter(game, { ...game.budget, spending })).toThrow(
      'Health spending must be from $0.0m to $20.0m in steps of $1.0m, but is $20.5m.',
    );
  });
});

describe('the starting figures in a country file', () => {
  /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access --
     These tests break a country file on purpose, in ways the types would not allow. */
  function faultsWith(change: (file: any) => void): readonly string[] {
    const file: any = structuredClone(tavaraFile);
    change(file);
    try {
      loadCountry(file);
    } catch (error) {
      if (error instanceof CountryFileError) return error.faults;
      throw error;
    }
    throw new Error('The country file was accepted');
  }

  it('give each region a population and an output', () => {
    const [highlands] = tavara().regions;

    expect(highlands).toMatchObject({ name: 'Korr Highlands', population: 500_000, output: 160 });
  });

  it('are rejected when a tax rate is out of range', () => {
    const faults = faultsWith((file) => {
      file.start.budget.taxRate = 60;
    });

    expect(faults).toEqual([
      'start.budget.taxRate is 60, but must be a whole number from 5 to 40.',
    ]);
  });

  it('are rejected when a spending area is left out', () => {
    const faults = faultsWith((file) => {
      delete file.start.budget.spending.health;
    });

    expect(faults).toEqual(['start.budget.spending.health is missing.']);
  });

  it('are rejected when spending is not in whole millions within the range', () => {
    const faults = faultsWith((file) => {
      file.start.budget.spending.security = 25;
    });

    expect(faults).toEqual([
      'start.budget.spending.security is 25, but must be a whole number from 0 to 20.',
    ]);
  });

  it('are rejected when the budget names a spending area the game does not have', () => {
    const faults = faultsWith((file) => {
      file.start.budget.spending.palaces = 3;
    });

    expect(faults).toEqual([
      'start.budget.spending.palaces is not a spending area this game has (agriculture, foodRelief, health, education, security).',
    ]);
  });

  it('are rejected when a region has no people', () => {
    const faults = faultsWith((file) => {
      file.regions[0].population = 0;
    });

    expect(faults).toEqual([
      'regions[0].population is 0, but must be a whole number of at least 1.',
    ]);
  });
});
