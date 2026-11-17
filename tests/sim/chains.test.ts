import { describe, expect, it } from 'vitest';
import tavaraFile from '../../src/countries/tavara.json';
import {
  advanceQuarter,
  chainOf,
  createGame,
  livingStandards,
  siteStatus,
  type Budget,
  type Country,
  type Decisions,
  type GameState,
  type Site,
  type TurnReport,
} from '../../src/sim';
import testlandFile from '../countries/testland.json';
import { withDroughtChance, withoutPoweredMines } from './countries';
import { steward } from './players';

interface Played {
  readonly state: GameState;
  readonly reports: readonly TurnReport[];
}

/** Plays one quarter for each set of decisions given, in order, sending relief where it is needed. */
function play(start: GameState, quarters: readonly Partial<Decisions>[]): Played {
  let state = start;
  const reports: TurnReport[] = [];
  for (const decisions of quarters) {
    const budget = decisions.budget ?? state.budget;
    const result = advanceQuarter(state, { ...steward(state, budget), ...decisions });
    reports.push(result.report);
    state = result.state;
  }
  return { state, reports };
}

/** The same decisions for a number of quarters. */
function quarters(count: number, decisions: Partial<Decisions>): Partial<Decisions>[] {
  return Array.from({ length: count }, () => decisions);
}

/**
 * A country with a treasury that can pay for a whole chain, and no drought or dilemma. Its
 * mines need no power, which `power.test.ts` covers.
 */
function rich(file: unknown): Country {
  const copy = withoutPoweredMines(file) as { start: { treasury: number } };
  copy.start.treasury = 2000;
  return withDroughtChance(copy, {});
}

/** The country's own spending with enough tax to pay for it, and upkeep set as given. */
function solvent(country: Country, upkeep: number): Budget {
  return {
    taxRatePercent: 25,
    spending: { ...country.start.budget.spending, upkeep },
  };
}

/** The first mine in the country, and the trunk road and port its chain runs through. */
function firstChain(country: Country): { mine: Site; road: Site; port: Site } {
  const find = (type: string, ids?: readonly string[]) => {
    const site = country.sites.find(
      (candidate) => candidate.type === type && (ids === undefined || ids.includes(candidate.id)),
    );
    if (!site) throw new Error(`The country has no ${type} site`);
    return site;
  };
  const mine = find('mine');
  const road = find('trunkRoad', mine.dependsOn);
  const port = find('port', road.dependsOn);
  return { mine, road, port };
}

/** What the mine paid in tax over a quarter, or 0 when the report has no line for it. */
function taxFrom(report: TurnReport | undefined, mine: Site): number {
  const line = report?.treasury.contributions.find(
    (entry) => entry.label === `Tax from ${mine.name}`,
  );
  return line?.amount ?? 0;
}

const countries: [name: string, country: () => Country][] = [
  ['Tavara', () => rich(tavaraFile)],
  ['Testland', () => rich(testlandFile)],
];

describe.each(countries)('a mine in %s', (_name, country) => {
  it('earns nothing until its trunk road and port are in use, and then earns', () => {
    const { mine, road, port } = firstChain(country());
    const budget = solvent(country(), 40);

    // The mine alone: six quarters to build, then in use with nowhere to send its ore.
    const alone = play(createGame(country(), 11), [
      { budget, startProjects: [mine.id] },
      ...quarters(7, { budget }),
    ]);
    expect(siteStatus(alone.state, mine.id).state).toBe('operating');
    expect(alone.reports.map((report) => taxFrom(report, mine))).toEqual(
      alone.reports.map(() => 0),
    );
    expect(chainOf(alone.state, mine.id)).toMatchObject({
      complete: false,
      missing: [road.id, port.id],
      output: 0,
      bottleneck: road.id,
    });

    // The road is finished first; the mine still earns nothing without the port.
    const roadOnly = play(alone.state, [
      { budget, startProjects: [road.id, port.id] },
      ...quarters(5, { budget }),
    ]);
    expect(siteStatus(roadOnly.state, road.id).state).toBe('operating');
    expect(siteStatus(roadOnly.state, port.id).state).toBe('building');
    expect(roadOnly.reports.map((report) => taxFrom(report, mine))).toEqual(
      roadOnly.reports.map(() => 0),
    );
    expect(chainOf(roadOnly.state, mine.id)).toMatchObject({ missing: [port.id], output: 0 });

    // Once the port is in use too, the mine's output reaches its region and is taxed.
    const before = livingStandards(roadOnly.state).find(
      (standard) => standard.regionId === mine.regionId,
    );
    const whole = play(roadOnly.state, quarters(3, { budget }));
    expect(siteStatus(whole.state, port.id).state).toBe('operating');
    expect(chainOf(whole.state, mine.id)).toMatchObject({
      complete: true,
      missing: [],
      output: 200,
      bottleneck: mine.id,
    });
    const earning = play(whole.state, [{ budget }]);
    // A quarter's tax at 25% on the $20.0m the mine adds to its region's output.
    expect(taxFrom(earning.reports[0], mine)).toBe(50);
    const after = livingStandards(earning.state).find(
      (standard) => standard.regionId === mine.regionId,
    );
    expect(after?.scores.income).toBeGreaterThan(before?.scores.income ?? Infinity);
  });

  it('sends no more through its chain than the weakest link carries, and says which it is', () => {
    const { mine, road, port } = firstChain(country());
    const built = play(createGame(country(), 11), [
      { budget: solvent(country(), 40), startProjects: [mine.id, road.id, port.id] },
      ...quarters(8, { budget: solvent(country(), 40) }),
    ]);
    expect(chainOf(built.state, mine.id)).toMatchObject({ output: 200, bottleneck: mine.id });

    // $1.0m of upkeep keeps the mine, started first, but not the road or the port after it.
    const starved = play(built.state, [{ budget: solvent(country(), 10) }]);
    expect(siteStatus(starved.state, mine.id).state).toBe('operating');
    expect(siteStatus(starved.state, road.id).state).toBe('decaying');
    expect(siteStatus(starved.state, port.id).state).toBe('decaying');
    // A decaying road carries $12.0m of its $24.0m, less than the decaying port's $15.0m.
    const chain = chainOf(starved.state, mine.id);
    expect(chain).toMatchObject({ complete: true, output: 120, bottleneck: road.id });
    expect(chain?.links).toEqual([
      { siteId: mine.id, state: 'operating', carries: 200 },
      { siteId: road.id, state: 'decaying', carries: 120 },
      { siteId: port.id, state: 'decaying', carries: 150 },
    ]);

    const next = play(starved.state, [{ budget: solvent(country(), 10) }]);
    expect(taxFrom(next.reports[0], mine)).toBe(30);
  });

  it('has no chain of its own when the site is not a mine', () => {
    const { road } = firstChain(country());
    expect(chainOf(createGame(country(), 11), road.id)).toBeNull();
  });
});
