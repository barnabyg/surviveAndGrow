import { describe, expect, it } from 'vitest';
import tavaraFile from '../../src/countries/tavara.json';
import {
  advanceQuarter,
  createGame,
  exportTerms,
  importTerms,
  siteStatus,
  tradeCapacity,
  type Budget,
  type Country,
  type Decisions,
  type GameState,
  type Site,
  type TradeOrder,
  type TurnReport,
} from '../../src/sim';
import testlandFile from '../countries/testland.json';
import { withDroughtChance, withoutPoweredMines } from './countries';

/**
 * A country with a treasury that can pay for a whole chain and a great deal of grain, and no
 * drought or dilemma. Its mines need no power, which `power.test.ts` covers.
 */
function rich(file: unknown): Country {
  const copy = withoutPoweredMines(file) as { start: { treasury: number } };
  copy.start.treasury = 5000;
  return withDroughtChance(copy, {});
}

/** Each country with what its border crossings carry between them, from its file. */
const countries = [
  { name: 'Tavara', country: () => rich(tavaraFile), crossings: 90_000 },
  { name: 'Testland', country: () => rich(testlandFile), crossings: 15_000 },
] as const;

const grain = (tonnes: number): TradeOrder => ({ good: 'grain', direction: 'import', tonnes });
const sale = (tonnes: number): TradeOrder => ({ good: 'grain', direction: 'export', tonnes });

/** The country's own spending with enough tax to pay for it, and upkeep set as given. */
function solvent(country: Country, upkeep: number): Budget {
  return { taxRatePercent: 25, spending: { ...country.start.budget.spending, upkeep } };
}

/** Plays quarters, each decided by the function given, and keeps every state and report. */
function play(start: GameState, quarters: number, decide: (game: GameState) => Decisions) {
  const states = [start];
  const reports: TurnReport[] = [];
  for (let quarter = 0; quarter < quarters; quarter += 1) {
    const game = states.at(-1) ?? start;
    const result = advanceQuarter(game, decide(game));
    states.push(result.state);
    reports.push(result.report);
  }
  return { states, reports, state: states.at(-1) ?? start };
}

/** A site of a type, the first in the country file. */
function first(country: Country, type: string): Site {
  const site = country.sites.find((candidate) => candidate.type === type);
  if (site === undefined) throw new Error(`The country has no ${type} site`);
  return site;
}

/** Plays until the sites given are all in use, starting them in the first quarter. */
function built(country: Country, siteIds: readonly string[], upkeep = 40): GameState {
  const budget = solvent(country, upkeep);
  let { state } = play(createGame(country, 5), 1, () => ({ budget, startProjects: siteIds }));
  while (!siteIds.every((id) => siteStatus(state, id).state === 'operating')) {
    state = advanceQuarter(state, { budget }).state;
  }
  return state;
}

describe.each(countries)('trade capacity in $name', ({ country, crossings }) => {
  it('is what the border crossings carry before any port is in use', () => {
    const game = createGame(country(), 1);
    const capacity = tradeCapacity(game);

    expect(capacity).toMatchObject({ total: crossings, ore: 0, grain: 0, free: crossings });
    expect(capacity.links.map((link) => [link.name, link.kind, link.tonnes])).toEqual(
      game.country.crossings.map((crossing) => [crossing.name, 'crossing', crossing.tonnes]),
    );
  });

  it('counts the grain ordered against what is left', () => {
    const game = createGame(country(), 1);

    expect(tradeCapacity(game, [grain(5000)])).toMatchObject({
      grain: 5000,
      free: crossings - 5000,
    });
  });

  it('refuses grain bought or sold beyond it, and allows it up to it', () => {
    const game = createGame(country(), 1);
    const over = `The trade links carry ${crossings.toLocaleString('en-GB')} t a quarter, so no more than ${crossings.toLocaleString('en-GB')} t of grain can cross the border, but ${(crossings + 1000).toLocaleString('en-GB')} t would.`;

    expect(importTerms(game, 'grain', crossings).unavailable).toBeNull();
    expect(importTerms(game, 'grain', crossings + 1000).unavailable).toBe(over);
    expect(exportTerms(game, 'grain', crossings).unavailable).toBeNull();
    expect(exportTerms(game, 'grain', crossings + 1000).unavailable).toBe(over);
    expect(() =>
      advanceQuarter(game, { budget: game.budget, trade: [sale(crossings + 1000)] }),
    ).toThrow(over);
  });

  it('is widened by a port in use, and the port carries half while it decays', () => {
    const port = first(country(), 'port');
    const open = built(country(), [port.id]);

    expect(tradeCapacity(open)).toMatchObject({ total: crossings + 900_000, ore: 0 });
    expect(tradeCapacity(open).links.at(-1)).toEqual({
      id: port.id,
      name: port.name,
      kind: 'port',
      tonnes: 900_000,
      decaying: false,
      unimproved: 900_000,
      improvedBy: [],
    });

    // Upkeep cut to nothing: the port goes without, and decays from the next quarter.
    const budget = solvent(country(), 0);
    const { state } = play(open, 2, () => ({ budget }));
    expect(siteStatus(state, port.id).state).toBe('decaying');
    expect(tradeCapacity(state)).toMatchObject({ total: crossings + 450_000 });
    expect(tradeCapacity(state).links.at(-1)).toMatchObject({ tonnes: 450_000, decaying: true });
  });

  it('gives the mine’s ore its share first, and grain what is left', () => {
    const mine = first(country(), 'mine');
    const road = first(country(), 'trunkRoad');
    const port = first(country(), 'port');
    const chain = built(country(), [mine.id, road.id, port.id]);

    // The mine ships 600,000 t of the port's 900,000 t.
    expect(tradeCapacity(chain)).toMatchObject({
      total: crossings + 900_000,
      ore: 600_000,
      free: crossings + 300_000,
    });
    expect(importTerms(chain, 'grain', crossings + 300_000).unavailable).toBeNull();
    expect(importTerms(chain, 'grain', crossings + 301_000).unavailable).toMatch(
      /600,000 t of it the mines’ ore/,
    );
  });

  it('leaves grain the crossings alone when the ore fills a shallow port', () => {
    const mine = first(country(), 'mine');
    const road = first(country(), 'trunkRoad');
    const quay = first(country(), 'shallowPort');
    const chain = built(country(), [mine.id, road.id, quay.id]);

    // The quay carries 360,000 t, and the mine fills it.
    expect(tradeCapacity(chain)).toMatchObject({
      total: crossings + 360_000,
      ore: 360_000,
      free: crossings,
    });
  });
});

describe.each(countries)('grain bought in bulk in $name', ({ country, crossings }) => {
  // The player wants more grain each quarter than the crossings carry, and orders all the
  // trade links leave room for while building a port.
  const wanted = crossings + 20_000;
  const port = () => first(country(), 'port');

  const decide = (game: GameState): Decisions => {
    const room = Math.floor(tradeCapacity(game).free / 1000) * 1000;
    return {
      budget: solvent(game.country, 40),
      startProjects: siteStatus(game, port().id).state === 'empty' ? [port().id] : [],
      trade: [grain(Math.min(wanted, room))],
    };
  };

  it('is limited to the crossings before the port opens, and widened after', () => {
    const played = play(createGame(country(), 5), 11, decide);
    const imported = played.reports.map(
      (report) =>
        report.food.contributions.find((line) => line.label === 'Grain imported')?.amount ?? 0,
    );
    const opened = played.states.findIndex(
      (state) => siteStatus(state, port().id).state === 'operating',
    );

    expect(opened).toBeGreaterThan(0);
    expect(imported.slice(0, opened)).toEqual(imported.slice(0, opened).map(() => crossings));
    expect(imported.slice(opened)).not.toHaveLength(0);
    expect(imported.slice(opened)).toEqual(imported.slice(opened).map(() => wanted));
    expect(played.state.outcome).toEqual({ status: 'playing' });
  });
});
