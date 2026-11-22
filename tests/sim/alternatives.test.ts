import { describe, expect, it } from 'vitest';
import tavaraFile from '../../src/countries/tavara.json';
import {
  advanceQuarter,
  chainOf,
  createGame,
  siteStatus,
  startFault,
  type Budget,
  type Country,
  type Decisions,
  type GameState,
  type Site,
} from '../../src/sim';
import testlandFile from '../countries/testland.json';
import { withDroughtChance, withoutPoweredMines } from './countries';
import { steward } from './playing';

/** Plays one quarter for each set of decisions given, in order, sending relief where it is needed. */
function play(start: GameState, quarters: readonly Partial<Decisions>[]): GameState {
  let state = start;
  for (const decisions of quarters) {
    const budget = decisions.budget ?? state.budget;
    state = advanceQuarter(state, { ...steward(state, budget), ...decisions }).state;
  }
  return state;
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

/** The country's own spending with enough tax to pay for it, and enough upkeep for a chain. */
function solvent(country: Country): Budget {
  return { taxRatePercent: 25, spending: { ...country.start.budget.spending, upkeep: 40 } };
}

/**
 * The first mine and the trunk road its chain runs through, and the two ports that road
 * could lead to: the deep-water port it names, and the shallow port that is its alternative.
 */
function choice(country: Country): { mine: Site; road: Site; deep: Site; shallow: Site } {
  const find = (test: (site: Site) => boolean, what: string) => {
    const site = country.sites.find(test);
    if (!site) throw new Error(`The country has no ${what}`);
    return site;
  };
  const mine = find((site) => site.type === 'mine', 'mine');
  const road = find((site) => mine.dependsOn.includes(site.id), 'trunk road');
  const deep = find((site) => site.type === 'port' && road.dependsOn.includes(site.id), 'port');
  const shallow = find(
    (site) => site.type === 'shallowPort' && site.alternatives.includes(deep.id),
    'shallow port',
  );
  return { mine, road, deep, shallow };
}

const countries: [name: string, country: () => Country][] = [
  ['Tavara', () => rich(tavaraFile)],
  ['Testland', () => rich(testlandFile)],
];

describe.each(countries)('two alternative ports in %s', (_name, country) => {
  it('are both open while neither has been started', () => {
    const { deep, shallow } = choice(country());
    const game = createGame(country(), 11);

    expect(deep.alternatives).toEqual([shallow.id]);
    expect(shallow.alternatives).toEqual([deep.id]);
    for (const site of [deep, shallow]) {
      expect(siteStatus(game, site.id)).toMatchObject({ state: 'empty', closedBy: null });
    }
    expect(startFault(game, [deep.id])).toBeNull();
    expect(startFault(game, [shallow.id])).toBeNull();
  });

  it('close each other: once one is started, the other cannot be', () => {
    const { deep, shallow } = choice(country());
    const budget = solvent(country());

    for (const [chosen, closed] of [
      [deep, shallow],
      [shallow, deep],
    ] as const) {
      const started = play(createGame(country(), 11), [{ budget, startProjects: [chosen.id] }]);
      const refusal = `${closed.name} is ruled out: building began on ${chosen.name}, its alternative.`;

      expect(siteStatus(started, chosen.id).state).toBe('building');
      expect(siteStatus(started, closed.id)).toMatchObject({
        state: 'closed',
        closedBy: chosen.id,
      });
      expect(startFault(started, [closed.id])).toBe(refusal);
      expect(() => advanceQuarter(started, { budget, startProjects: [closed.id] })).toThrow(
        new RangeError(refusal),
      );

      // It stays closed once the one chosen is built.
      const built = play(
        started,
        Array.from({ length: 8 }, () => ({ budget })),
      );
      expect(siteStatus(built, chosen.id).state).toBe('operating');
      expect(siteStatus(built, closed.id).state).toBe('closed');
    }
  });

  it('cannot both be started in the same quarter', () => {
    const { deep, shallow } = choice(country());

    expect(startFault(createGame(country(), 11), [deep.id, shallow.id])).toBe(
      `${deep.name} and ${shallow.name} are alternatives: only one of them can be built.`,
    );
  });

  it('either completes the chain, and the shallow port, which costs less, ships less', () => {
    const { mine, road, deep, shallow } = choice(country());
    const budget = solvent(country());
    const game = createGame(country(), 11);

    // Until one is chosen, the chain names the port its road depends on.
    expect(chainOf(game, mine.id)?.missing).toEqual([road.id, deep.id]);

    const built = play(game, [
      { budget, startProjects: [mine.id, road.id, shallow.id] },
      ...Array.from({ length: 6 }, () => ({ budget })),
    ]);
    expect(chainOf(built, mine.id)).toMatchObject({
      complete: true,
      missing: [],
      // The shallow port ships $36.0m of the $60.0m the mine could produce.
      atUsualPrice: 360,
      bottleneck: shallow.id,
    });
    expect(chainOf(built, mine.id)?.links.map((link) => link.siteId)).toEqual([
      mine.id,
      road.id,
      shallow.id,
    ]);
    expect(siteStatus(built, shallow.id).cost).toBeLessThan(siteStatus(built, deep.id).cost);
  });
});
