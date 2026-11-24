import { describe, expect, it } from 'vitest';
import tavaraFile from '../../src/countries/tavara.json';
import {
  advanceQuarter,
  chainOf,
  costOf,
  createGame,
  livingStandards,
  oreEarnings,
  previewQuarter,
  priceStatus,
  risksAhead,
  type Budget,
  type Country,
  type Debt,
  type Decisions,
  type GameState,
  type Site,
  type TurnReport,
} from '../../src/sim';
import testlandFile from '../countries/testland.json';
import {
  bothCountries,
  withDroughtChance,
  withoutPoweredMines,
  withoutPriceShocks,
} from './countries';
import { steward } from './playing';
import { budgetFrom, budgetOf } from '../budgets';

/** A country with a treasury that can pay for a whole chain, and no drought or dilemma. */
function rich(file: unknown): Country {
  const copy = withoutPoweredMines(file) as { start: { treasury: number } };
  copy.start.treasury = 2000;
  return withDroughtChance(copy, {});
}

const withMine: [name: string, country: () => Country][] = [
  ['Tavara', () => rich(tavaraFile)],
  ['Testland', () => rich(testlandFile)],
];

/** The country's own spending with a 25% tax, and upkeep enough for a chain. */
function solvent(country: Country): Budget {
  return budgetFrom(country.start.budget, { taxRatePercent: 25, spending: { upkeep: 40 } });
}

/** The first mine in the country, and the trunk road and port its chain runs through. */
function firstChain(country: Country): Site[] {
  const mine = country.sites.find((site) => site.type === 'mine');
  const road = country.sites.find(
    (site) => site.type === 'trunkRoad' && mine?.dependsOn.includes(site.id),
  );
  const port = country.sites.find(
    (site) => site.type === 'port' && road?.dependsOn.includes(site.id),
  );
  if (!mine || !road || !port) throw new Error('The country has no chain of mine, road and port');
  return [mine, road, port];
}

/** Plays quarters, each decided by the function given, and keeps every state and report. */
function play(start: GameState, quarters: number, decide: (game: GameState) => Decisions) {
  const states = [start];
  const reports: TurnReport[] = [];
  for (let quarter = 0; quarter < quarters; quarter += 1) {
    const game = states.at(-1);
    if (game?.outcome.status !== 'playing') break;
    const result = advanceQuarter(game, decide(game));
    states.push(result.state);
    reports.push(result.report);
  }
  return { states, reports, state: states.at(-1) ?? start };
}

/** The game, seed 11, once the whole chain of the country's first mine has been built. */
function minesEarning(country: Country): { game: GameState; mine: Site } {
  const sites = firstChain(country);
  const budget = solvent(country);
  const { state } = play(createGame(country, 11), 9, (game) => ({
    ...steward(game, budget),
    startProjects: game.history.length === 1 ? sites.map((site) => site.id) : [],
  }));
  const [mine] = sites;
  if (!mine || chainOf(state, mine.id)?.complete !== true)
    throw new Error('The chain is not built');
  return { game: state, mine };
}

/** A quarter's tax at a rate, rounded as the budget rounds it. */
const taxAt = (output: number, percent: number) => Math.floor((output * percent + 50) / 100);

/** The tax the mine paid over a quarter, its line at the usual price and the price's together. */
function taxFrom(report: TurnReport | undefined, mine: Site): number {
  return (report?.treasury.contributions ?? [])
    .filter((line) => line.label.startsWith(`Tax from ${mine.name}`))
    .reduce((total, line) => total + line.amount, 0);
}

/** The game with the world ore price moved to a price, as if world markets had moved it. */
function atOrePrice(game: GameState, price: number): GameState {
  return { ...game, worldPrices: { ...game.worldPrices, ore: [...game.worldPrices.ore, price] } };
}

describe.each(bothCountries)('the world ore price in %s', (_name, country) => {
  const keep = (game: GameState): Decisions => ({ budget: game.budget });

  it('opens at its usual price, $100 a tonne, beside grain at $240', () => {
    expect(createGame(country(), 1).worldPrices).toEqual({ grain: [240], ore: [100] });
  });

  it('moves each quarter, and the same seed always moves it the same way', () => {
    const pathOf = (seed: number) => play(createGame(country(), seed), 10, keep).state.worldPrices;

    const path = pathOf(7).ore;
    expect(path).toHaveLength(11);
    expect(new Set(path).size).toBeGreaterThan(5);
    expect(pathOf(7).ore).toEqual(path);
    expect(pathOf(8).ore).not.toEqual(path);
    // Each good's price has its own draw: ore does not follow grain.
    expect(pathOf(7).grain.map((price) => price - 240)).not.toEqual(path.map((p) => p - 100));
  });

  it('stays from $45 to $190 a tonne', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const { ore } = play(createGame(country(), seed), 40, keep).state.worldPrices;
      expect(Math.min(...ore)).toBeGreaterThanOrEqual(45);
      expect(Math.max(...ore)).toBeLessThanOrEqual(190);
    }
  });

  it('leaves the world grain price moving as it did before ore was traded', () => {
    // The grain price of seed 2026 as format 7, which knew no ore, kept it. A world price shock
    // would push it further, so none is let come.
    const { grain } = play(createGame(withoutPriceShocks(country()), 2026), 3, keep).state
      .worldPrices;

    expect(grain).toEqual([240, 223, 209, 247]);
  });

  it('has a forecast range over the next four quarters', () => {
    const status = priceStatus(createGame(country(), 1), 'ore');

    expect(status).toMatchObject({ name: 'Ore', price: 100, usual: 100, forecastQuarters: 4 });
    expect(status.forecast.min).toBeLessThan(100);
    expect(status.forecast.max).toBeGreaterThan(100);
  });

  it('cannot be ordered: ore is sold abroad only by a mine’s chain', () => {
    const game = createGame(country(), 1);

    expect(() =>
      advanceQuarter(game, {
        budget: game.budget,
        trade: [{ good: 'ore', direction: 'export', tonnes: 1000 }],
      }),
    ).toThrow('Ore cannot be ordered: it is sold abroad only by a mine’s chain.');
  });
});

describe.each(withMine)('a mine’s earnings in %s', (_name, country) => {
  const { game, mine } = minesEarning(country());
  const atUsual = atOrePrice(game, 100);

  it('at the usual ore price are what the mine earned before ore had a price', () => {
    expect(chainOf(atUsual, mine.id)).toMatchObject({ shipped: 600_000, output: 600 });
    const output = livingStandards(atUsual).find((each) => each.regionId === mine.regionId)?.output;
    expect(output).toContainEqual({ label: mine.name, amount: 600, regionId: mine.regionId });
    expect(output?.filter((line) => line.label.startsWith(mine.name))).toHaveLength(1);

    const { report } = advanceQuarter(atUsual, steward(atUsual, solvent(country())));
    const lines = report.treasury.contributions.filter((line) =>
      line.label.startsWith(`Tax from ${mine.name}`),
    );
    // A quarter's tax at 25% on the $60.0m the mine adds to its region's output.
    expect(lines).toEqual([
      { label: `Tax from ${mine.name}`, amount: 150, regionId: mine.regionId },
    ]);
  });

  it('are shown on the mine’s card at the price now and across its forecast', () => {
    const before = createGame(country(), 11);
    expect(oreEarnings(before, mine.id)).toEqual({
      tonnes: 600_000,
      shipping: false,
      price: 100,
      earns: 600,
      forecast: {
        min: costOf(600_000, priceStatus(before, 'ore').forecast.min),
        max: costOf(600_000, priceStatus(before, 'ore').forecast.max),
      },
    });
    expect(oreEarnings(atOrePrice(game, 80), mine.id)).toMatchObject({
      tonnes: 600_000,
      shipping: true,
      price: 80,
      earns: 480,
    });
  });

  it('are the ore shipped at the world ore price, with the price’s effect shown beside them', () => {
    const slumped = atOrePrice(game, 80);

    // 600,000 tonnes at $80 a tonne is $48.0m.
    expect(chainOf(slumped, mine.id)).toMatchObject({ shipped: 600_000, output: 480 });
    const output = livingStandards(slumped).find((each) => each.regionId === mine.regionId)?.output;
    expect(output).toContainEqual({ label: mine.name, amount: 600, regionId: mine.regionId });
    expect(output).toContainEqual({
      label: `${mine.name}: ore at $80 a tonne`,
      amount: -120,
      regionId: mine.regionId,
    });

    const { report } = advanceQuarter(slumped, steward(slumped, solvent(country())));
    expect(report.treasury.contributions).toContainEqual({
      label: `Tax from ${mine.name}: ore at $80 a tonne`,
      amount: -30,
      regionId: mine.regionId,
    });
    expect(taxFrom(report, mine)).toBe(120);
  });
});

// Testland's mine makes its people as rich as can be measured, and wins the game soon after,
// so a whole game of earnings is played in Tavara.
describe('a mine’s earnings in Tavara, game long', () => {
  const country = rich(tavaraFile);
  const { game, mine } = minesEarning(country);

  it('follow the world ore price quarter by quarter over a whole game', () => {
    const budget = solvent(country);
    const { states, reports } = play(game, 10, (each) => steward(each, budget));

    const prices = states.slice(0, -1).map((each) => each.worldPrices.ore.at(-1) ?? 0);
    expect(new Set(prices).size).toBeGreaterThan(4);
    expect(reports.map((report) => taxFrom(report, mine))).toEqual(
      prices.map((price) => taxAt(costOf(600_000, price), 25)),
    );
  });

  it('leave prosperity next quarter to chance in the preview, as the ore price moves', () => {
    const { prosperity } = previewQuarter(game, { budget: game.budget });

    expect(prosperity.min).toBeLessThan(prosperity.max);
    // With nothing earning at the ore price, it is exact.
    const fresh = createGame(country, 11);
    const exact = previewQuarter(fresh, { budget: fresh.budget }).prosperity;
    expect(exact.min).toBe(exact.max);
  });
});

describe('a slump in the world ore price inside its forecast, in Tavara', () => {
  const country = rich(tavaraFile);
  const { game } = minesEarning(country);

  it('is warned of when it would empty the treasury, before the treasury suffers', () => {
    // Health and education raised until the budget only just balances on the mine's tax.
    const budget: Budget = budgetFrom(solvent(country), {
      taxRatePercent: 25,
      spending: { health: 200, education: 90 },
    });
    const poor: GameState = { ...game, treasury: 20 };

    const warning = risksAhead(poor, { budget }).find((risk) => risk.kind === 'treasury');
    expect(warning).toMatchObject({ headline: 'Empty treasury', likelihood: 'unlikely' });
    expect(warning?.reason).toMatch(
      /^Should the world ore price slump to \$\d+ a tonne, the low end of its forecast over the next 4 quarters, .*the treasury could not cover the budget in \d quarters/,
    );

    // A seed whose ore price holds up never empties it; one whose ore price slumps does, after
    // the warning.
    const cut = (seed: number) =>
      play({ ...poor, seed }, 5, (each) => steward(each, budget)).reports.findIndex((report) =>
        report.entries.some((entry) => entry.kind === 'spendingCut'),
      );
    expect(cut(11)).toBe(-1);
    expect(cut(156)).toBeGreaterThan(0);
    const slumped = play({ ...poor, seed: 156 }, 5, (each) => steward(each, budget)).states;
    expect(slumped.at(4)?.worldPrices.ore.at(-1)).toBeLessThan(80);
  });

  it('is warned of when it would pause research, in the research’s own words', () => {
    // The budget of the test above, which only just balances on the mine’s tax, and a
    // treasury that covers the seed’s $2.0m instalments while the ore price holds.
    const budget: Budget = budgetFrom(solvent(country), {
      taxRatePercent: 25,
      spending: { health: 200, education: 90 },
    });
    const poor: GameState = { ...game, treasury: 140 };
    const treasuryRisk = (decisions: Decisions) =>
      risksAhead(poor, decisions).find((risk) => risk.kind === 'treasury');

    expect(treasuryRisk({ budget })).toBe(undefined);
    const warning = treasuryRisk({ budget, startResearch: 'droughtResistantSeed' });
    expect(warning).toMatchObject({ headline: 'Empty treasury', likelihood: 'unlikely' });
    expect(warning?.reason).toMatch(
      /^Should the world ore price slump to \$\d+ a tonne, the low end of its forecast over the next 4 quarters, .*: the treasury could not cover the instalment on research into Drought-resistant seed in 3 quarters, and the research would pause\.$/,
    );
  });

  it('is warned of when it would cause a missed payment on a debt', () => {
    const loan: Debt = {
      kind: 'loan',
      number: 1,
      taken: game.date,
      borrowed: 4000,
      annualRateBasisPoints: 500,
      termQuarters: 8,
      owed: 4000,
      repayment: 560,
      quartersLeft: 8,
      schedule: 'level',
    };
    const lean: Budget = budgetOf({ taxRatePercent: 25, spending: { upkeep: 40 } });
    const owing: GameState = { ...game, treasury: 100, debts: [loan] };

    const warning = risksAhead(owing, { budget: lean }).find((risk) => risk.kind === 'bailout');
    expect(warning).toMatchObject({ headline: 'Bailout', likelihood: 'unlikely' });
    expect(warning?.reason).toMatch(
      /^Should the world ore price slump to \$\d+ a tonne.*could not cover the repayment on Loan 1/,
    );
  });

  it('is not warned of while no mine earns', () => {
    const fresh = createGame(country, 11);

    expect(
      risksAhead(fresh, { budget: fresh.budget }).filter((risk) =>
        risk.reason.includes('world ore price'),
      ),
    ).toEqual([]);
  });
});
