import { describe, expect, it } from 'vitest';
import {
  advanceQuarter,
  createGame,
  previewQuarter,
  risksAhead,
  siteStatus,
  type Budget,
  type Country,
  type Decisions,
  type GameState,
  type TurnReport,
} from '../../src/sim';
import { bothCountries, tavara } from './countries';
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

/** The country's own spending with enough tax to pay for it, and upkeep set as given. */
function solvent(country: Country, upkeep?: number): Budget {
  const { spending } = country.start.budget;
  return {
    taxRatePercent: 25,
    spending: { ...spending, upkeep: upkeep ?? spending.upkeep },
  };
}

function siteOfType(country: Country, type: string) {
  const site = country.sites.find((candidate) => candidate.type === type);
  if (!site) throw new Error(`The country has no ${type} site`);
  return site;
}

function spoiled(report: TurnReport | undefined): number {
  const line = report?.food.contributions.find((entry) => entry.label === 'Spoiled in store');
  return -(line?.amount ?? 0);
}

function upkeepSpent(report: TurnReport | undefined): number {
  const line = report?.treasury.contributions.find((entry) => entry.label === 'Upkeep');
  return 0 - (line?.amount ?? 0);
}

function entriesOf(report: TurnReport | undefined, kind: string) {
  return (report?.entries ?? []).filter((entry) => entry.kind === kind);
}

/** Builds a grain store from the first quarter: it is in use from the third. */
function withStore(country: Country): Played & { readonly storeId: string } {
  const store = siteOfType(country, 'grainStore');
  const built = play(createGame(country, 7), [
    { budget: solvent(country), startProjects: [store.id] },
    { budget: solvent(country) },
  ]);
  return { ...built, storeId: store.id };
}

describe.each(bothCountries)('upkeep in %s', (_name, country) => {
  it('keeps a site in use in good repair while it is paid', () => {
    const { state, storeId } = withStore(country());

    const { state: later } = play(state, [
      { budget: solvent(country()) },
      { budget: solvent(country()) },
    ]);

    expect(siteStatus(later, storeId).state).toBe('operating');
  });

  it('left unpaid puts the site into decay, which the turn report tells', () => {
    const { state, storeId } = withStore(country());
    const store = state.country.sites.find((site) => site.id === storeId);

    const { state: later, reports } = play(state, [{ budget: solvent(country(), 0) }]);

    expect(siteStatus(later, storeId).state).toBe('decaying');
    expect(entriesOf(reports[0], 'siteDecaying')).toEqual([
      expect.objectContaining({
        seriousness: 'warning',
        headline: `Decaying: ${store?.name ?? ''}`,
        regionId: store?.regionId,
      }),
    ]);
  });

  it('paid again restores a decaying site, which the turn report tells', () => {
    const { state, storeId } = withStore(country());

    const { state: later, reports } = play(state, [
      { budget: solvent(country(), 0) },
      { budget: solvent(country()) },
    ]);

    expect(siteStatus(later, storeId).state).toBe('operating');
    expect(entriesOf(reports[1], 'siteRestored')).toHaveLength(1);
    expect(entriesOf(reports[1], 'siteDecaying')).toEqual([]);
  });
});

describe.each(bothCountries)('a grain store in %s', (_name, country) => {
  it('does less to keep the reserve from spoiling when its upkeep is not paid', () => {
    const { state } = withStore(country());
    const { state: bare } = play(createGame(country(), 7), [
      { budget: solvent(country()) },
      { budget: solvent(country()) },
    ]);
    const twoQuarters = (upkeep?: number) => [
      { budget: solvent(country(), upkeep) },
      { budget: solvent(country(), upkeep) },
    ];

    // The first quarter decides the store's repair; the second shows what that does.
    const paid = play(state, twoQuarters()).reports[1];
    const unpaid = play(state, twoQuarters(0)).reports[1];
    const none = play(bare, twoQuarters()).reports[1];

    expect(spoiled(paid)).toBeLessThan(spoiled(unpaid));
    expect(spoiled(unpaid)).toBeLessThan(spoiled(none));
  });

  it('adds less to its region’s prosperity when its upkeep is not paid', () => {
    const { state } = withStore(country());

    const paid = play(state, [{ budget: solvent(country()) }]).state;
    const unpaid = play(state, [{ budget: solvent(country(), 0) }]).state;

    expect(paid.history.at(-1)?.prosperity).toBeGreaterThan(unpaid.history.at(-1)?.prosperity ?? 0);
  });

  it('costs its upkeep each quarter it is in use, and only that', () => {
    const { state, reports } = withStore(country());

    const later = play(state, [{ budget: solvent(country(), 200) }]).reports;

    // Nothing is spent on upkeep while the store is being built.
    expect(reports.map(upkeepSpent)).toEqual([0, 0]);
    expect(upkeepSpent(later[0])).toBe(
      siteStatus(state, siteOfType(country(), 'grainStore').id).upkeep,
    );
    expect(upkeepSpent(later[0])).toBeGreaterThan(0);
  });
});

describe('when upkeep cannot keep every site in good repair', () => {
  it('keeps up the sites in the order building began on them, so the newest decay first', () => {
    const country = tavara();
    const starts = ['lowmere-irrigation', 'dustwell-irrigation', 'lowmere-road'];
    const built = play(createGame(country, 7), [
      { budget: solvent(country), startProjects: starts },
      { budget: solvent(country) },
      { budget: solvent(country) },
    ]);

    // $1.0m keeps up both irrigation schemes ($0.4m each) but not the farm road ($0.3m).
    const { state, reports } = play(built.state, [{ budget: solvent(country, 10) }]);

    expect(starts.map((siteId) => siteStatus(state, siteId).state)).toEqual([
      'operating',
      'operating',
      'decaying',
    ]);
    expect(upkeepSpent(reports[0])).toBe(8);
    expect(entriesOf(reports[0], 'siteDecaying').map((entry) => entry.headline)).toEqual([
      'Decaying: Farm road, Arden to Lowmere',
    ]);
  });
});

describe('a country file that leaves its starting upkeep out', () => {
  it.each(bothCountries)(
    'starts %s with enough upkeep to keep every one of its sites in good repair',
    (_name, country) => {
      const game = createGame(country(), 1);
      const needed = game.country.sites.reduce(
        (total, site) => total + siteStatus(game, site.id).upkeep,
        0,
      );

      expect(game.budget.spending.upkeep).toBeGreaterThanOrEqual(needed);
      expect(game.budget.spending.upkeep - needed).toBeLessThan(10);
    },
  );
});

describe.each(bothCountries)('looking ahead at upkeep in %s', (_name, country) => {
  it('previews what the sites in use need against what would be spent', () => {
    const { state, storeId } = withStore(country());
    const { upkeep } = siteStatus(state, storeId);

    expect(previewQuarter(state, { budget: solvent(country()) }).upkeep).toEqual({
      needed: upkeep,
      spent: upkeep,
      short: [],
    });
    expect(previewQuarter(state, { budget: solvent(country(), 0) }).upkeep).toEqual({
      needed: upkeep,
      spent: 0,
      short: [storeId],
    });
  });

  it('warns of decay when upkeep will fall short, and not while it is paid', () => {
    const { state, storeId } = withStore(country());
    const store = state.country.sites.find((site) => site.id === storeId);

    const short = risksAhead(state, { budget: solvent(country(), 0) }).filter(
      (risk) => risk.kind === 'upkeep',
    );
    const paid = risksAhead(state, { budget: solvent(country()) }).filter(
      (risk) => risk.kind === 'upkeep',
    );

    expect(short).toEqual([
      expect.objectContaining({
        likelihood: 'almostCertain',
        headline: 'Upkeep falls short',
        withinQuarters: 1,
      }),
    ]);
    expect(short[0]?.reason).toContain(store?.name);
    expect(paid).toEqual([]);
  });

  it('warns ahead of time when a site about to open will need more upkeep than is set', () => {
    const country_ = country();
    const store = siteOfType(country_, 'grainStore');
    const { state } = play(createGame(country_, 7), [
      { budget: solvent(country_, 0), startProjects: [store.id] },
    ]);

    const risk = risksAhead(state, { budget: solvent(country_, 0) }).find(
      (candidate) => candidate.kind === 'upkeep',
    );

    // It opens next quarter, and goes without upkeep the quarter after.
    expect(risk).toMatchObject({ withinQuarters: 2 });
  });
});
