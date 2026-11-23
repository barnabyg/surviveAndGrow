import { describe, expect, it } from 'vitest';
import tavaraFile from '../../src/countries/tavara.json';
import {
  advanceQuarter,
  chainOf,
  createGame,
  livingStandards,
  regionName,
  regionPower,
  siteOf,
  siteTerms,
  type Budget,
  type Country,
  type Decisions,
  type GameState,
  type Site,
  type TurnReport,
} from '../../src/sim';
import testlandFile from '../countries/testland.json';
import { withDroughtChance } from './countries';
import { faultsOf, valueAt, withValue } from './files';
import { steward } from './playing';

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

/** A country with a treasury that can pay for anything, and no drought or dilemma. */
function rich(file: unknown): Country {
  const copy = structuredClone(file) as { start: { treasury: number } };
  copy.start.treasury = 2000;
  return withDroughtChance(copy, {});
}

/** The country's own spending with enough tax to pay for it, and upkeep set as given. */
function solvent(country: Country, upkeep: number): Budget {
  return { taxRatePercent: 25, spending: { ...country.start.budget.spending, upkeep } };
}

/** The first power line that leads straight to a power station, and that station. */
function firstLine(country: Country): { line: Site; station: Site } {
  const line = country.sites.find(
    (site) =>
      site.type === 'powerLine' &&
      site.dependsOn.some(
        (id) => country.sites.find((other) => other.id === id)?.type === 'powerStation',
      ),
  );
  const station = country.sites.find(
    (site) => site.type === 'powerStation' && line?.dependsOn.includes(site.id),
  );
  if (!line || !station) throw new Error('The country has no power line leading to a station');
  return { line, station };
}

/** What power paid in tax in a region over a quarter, or 0 when the report has no line for it. */
function taxFromPower(report: TurnReport | undefined, country: Country, regionId: string): number {
  const label = `Tax from power in ${regionName(country, regionId)}`;
  return report?.treasury.contributions.find((entry) => entry.label === label)?.amount ?? 0;
}

describe('the power sites', () => {
  it('have terms, and say what power gives a region, which decay halves', () => {
    expect(siteTerms('powerStation')).toEqual({
      cost: 300,
      buildQuarters: 5,
      upkeep: 5,
      improvedBy: [],
      effect:
        'Powers each region a power line links to it: the region produces 20% more and gains 15.0 points of infrastructure access.',
      decayingEffect:
        'Powers each region a power line links to it: the region produces 10% more and gains 7.5 points of infrastructure access.',
    });
    expect(siteTerms('powerLine')).toEqual({
      cost: 60,
      buildQuarters: 2,
      upkeep: 1,
      improvedBy: [],
      effect:
        'Brings power from a power station to its region: the region produces 20% more and gains 15.0 points of infrastructure access.',
      decayingEffect:
        'Brings power from a power station to its region: the region produces 10% more and gains 7.5 points of infrastructure access.',
    });
  });
});

const countries: [name: string, country: () => Country][] = [
  ['Tavara', () => rich(tavaraFile)],
  ['Testland', () => rich(testlandFile)],
];

describe.each(countries)('power in %s', (_name, country) => {
  it('has a station and lines, each line leading to the station', () => {
    const sites = country().sites;
    const stations = sites.filter((site) => site.type === 'powerStation');
    const lines = sites.filter((site) => site.type === 'powerLine');

    expect(stations.length).toBeGreaterThanOrEqual(1);
    expect(lines.length).toBeGreaterThanOrEqual(2);
    for (const line of lines) expect(line.form).toBe('route');
  });

  it('reaches no region while nothing is built', () => {
    const game = createGame(country(), 5);

    expect(regionPower(game).every((power) => power.stationId === null)).toBe(true);
    expect(regionPower(game).map((power) => power.regionId)).toEqual(
      game.country.regions.map((region) => region.id),
    );
  });

  it('reaches a region once a line links it to a station, and not before', () => {
    const { line, station } = firstLine(country());
    const budget = solvent(country(), 40);
    // The line is finished well before the station: alone, it carries nothing.
    const early = play(createGame(country(), 5), [
      { budget, startProjects: [line.id, station.id] },
      ...quarters(3, { budget }),
    ]);
    expect(early.state.projects.find((project) => siteOf(project) === line.id)?.status).toBe(
      'operating',
    );
    expect(
      regionPower(early.state).find((power) => power.regionId === line.regionId),
    ).toMatchObject({
      lineId: null,
      stationId: null,
      outputPermille: 0,
      infrastructurePermille: 0,
    });

    const { state } = play(early.state, quarters(2, { budget }));

    expect(regionPower(state).find((power) => power.regionId === line.regionId)).toEqual({
      regionId: line.regionId,
      lineId: line.id,
      stationId: station.id,
      weakened: false,
      outputPermille: 200,
      infrastructurePermille: 150,
      unimproved: { outputPermille: 200, infrastructurePermille: 150 },
      improvedBy: [],
    });
  });

  it('makes a powered region produce more and gives it infrastructure access, shown in its breakdown', () => {
    const { line, station } = firstLine(country());
    const budget = solvent(country(), 40);
    const regionIndex = country().regions.findIndex((region) => region.id === line.regionId);
    const start = createGame(country(), 5);
    const without = play(start, quarters(7, { budget }));
    const powered = play(start, [
      { budget, startProjects: [line.id, station.id] },
      ...quarters(6, { budget }),
    ]);

    const before = livingStandards(without.state)[regionIndex];
    const after = livingStandards(powered.state)[regionIndex];
    const base = powered.state.regions[regionIndex]?.output ?? 0;
    const gain = Math.floor((base * 200) / 1000);
    const label = `Power from ${station.name}`;
    expect(after?.output).toContainEqual({ label, amount: gain, regionId: line.regionId });
    expect(before?.output.some((part) => part.label === label)).toBe(false);
    expect(after?.infrastructure).toContainEqual({ label, amount: 150, regionId: line.regionId });
    // Infrastructure access is what its parts add up to, and power adds to the score.
    const access = (after?.infrastructure ?? []).reduce((total, part) => total + part.amount, 0);
    expect(after?.scores.infrastructure).toBe(Math.min(1000, access));
    expect((after?.scores.infrastructure ?? 0) - (before?.scores.infrastructure ?? 0)).toBe(
      150 + (station.regionId === line.regionId ? 100 : 0),
    );
    expect(after?.value).toBeGreaterThan(before?.value ?? 0);
    // The extra output is taxed as a line of its own, and only once power arrives.
    expect(taxFromPower(powered.reports.at(-1), country(), line.regionId)).toBe(
      Math.floor((gain * 25) / 100),
    );
    expect(taxFromPower(without.reports.at(-1), country(), line.regionId)).toBe(0);
    expect(
      powered.reports.slice(0, 5).map((report) => taxFromPower(report, country(), line.regionId)),
    ).toEqual([0, 0, 0, 0, 0]);
  });

  it('gives a region half as much while the station or the line decays', () => {
    const { line, station } = firstLine(country());
    const budget = solvent(country(), 40);
    const built = play(createGame(country(), 5), [
      { budget, startProjects: [line.id, station.id] },
      ...quarters(5, { budget }),
    ]);
    // A quarter without upkeep leaves both decaying from the next.
    const { state } = play(built.state, quarters(2, { budget: solvent(country(), 0) }));

    expect(state.projects.find((project) => siteOf(project) === station.id)?.status).toBe(
      'decaying',
    );
    expect(regionPower(state).find((power) => power.regionId === line.regionId)).toMatchObject({
      lineId: line.id,
      stationId: station.id,
      weakened: true,
      outputPermille: 100,
      infrastructurePermille: 75,
    });
  });
});

describe('a site that depends on power', () => {
  it('is a mine in Testland, whose chain needs a power line and its station', () => {
    const country = rich(testlandFile);
    const mine = country.sites.find((site) => site.type === 'mine');
    const line = country.sites.find(
      (site) => site.type === 'powerLine' && mine?.dependsOn.includes(site.id),
    );
    if (!mine || !line) throw new Error('Testland’s mine depends on no power line');
    const station = country.sites.find((site) => line.dependsOn.includes(site.id));
    expect(station?.type).toBe('powerStation');
    const road = country.sites.find((site) => site.type === 'trunkRoad');
    const port = country.sites.find((site) => site.type === 'port');
    if (!road || !port || !station) throw new Error('Testland’s chain is incomplete');
    const budget = solvent(country, 40);

    // With its road and port but no power, the mine earns nothing for want of power.
    const unpowered = play(createGame(country, 5), [
      { budget, startProjects: [mine.id, road.id, port.id] },
      ...quarters(8, { budget }),
    ]);
    const idle = chainOf(unpowered.state, mine.id);
    expect(idle).toMatchObject({ complete: false, output: 0, bottleneck: line.id });
    expect(idle?.missing).toEqual([line.id, station.id]);

    const { state } = play(unpowered.state, [
      { budget, startProjects: [line.id, station.id] },
      ...quarters(5, { budget }),
    ]);
    expect(chainOf(state, mine.id)).toMatchObject({ complete: true, atUsualPrice: 600 });
  });
});

describe('a country file with power', () => {
  /** Testland's first power line is its eighth site, after the station. */
  const lineIndex = (valueAt(testlandFile, ['sites']) as { type: string }[]).findIndex(
    (site) => site.type === 'powerLine',
  );

  it('is rejected when a power line does not lead to a power station', () => {
    const file = withValue(testlandFile, ['sites', lineIndex, 'dependsOn'], ['alpha-store']);

    expect(faultsOf(file)).toEqual([
      `sites[${lineIndex}].dependsOn must lead, directly or through other power lines, to a power station or dam: a power line carries power only from one.`,
    ]);
  });

  it('may lead one power line through another, which then powers both regions', () => {
    const sites = valueAt(testlandFile, ['sites']) as { id: string; type: string }[];
    const [first, second] = sites.filter((site) => site.type === 'powerLine');
    const station = sites.find((site) => site.type === 'powerStation');
    if (!first || !second || !station) throw new Error('Testland has too little power');
    const file = withValue(testlandFile, ['sites', sites.indexOf(second), 'dependsOn'], [first.id]);
    const country = rich(file);
    const budget = solvent(country, 40);

    const { state } = play(createGame(country, 5), [
      { budget, startProjects: [station.id, first.id, second.id] },
      ...quarters(5, { budget }),
    ]);

    expect(regionPower(state).map((power) => [power.lineId, power.stationId])).toEqual(
      country.regions.map((region) => {
        const line = country.sites.find(
          (site) => site.type === 'powerLine' && site.regionId === region.id,
        );
        return [line?.id ?? null, line === undefined ? null : station.id];
      }),
    );
  });

  it('is rejected when a power line is an alternative to a site that brings no power', () => {
    const index = lineIndex;
    const file = withValue(testlandFile, ['sites', index, 'alternatives'], ['sand-road']);

    expect(faultsOf(file)).toEqual([
      `sites[${index}].alternatives[0] is "sand-road", a farm road, but a power line can only be an alternative to a site that plays the same part in bringing power.`,
    ]);
  });
});
