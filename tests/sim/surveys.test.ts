import { describe, expect, it } from 'vitest';
import tavaraFile from '../../src/countries/tavara.json';
import {
  advanceQuarter,
  balance,
  chainOf,
  createGame,
  depositFind,
  DOLLARS_PER_MONEY,
  formatTonnes,
  loadSave,
  onSurvey,
  planFault,
  previewQuarter,
  projectStartFault,
  researchStatuses,
  saveGame,
  siteStatus,
  surveyStatuses,
  surveyTerms,
  type Country,
  type Decisions,
  type GameState,
  type TurnReport,
} from '../../src/sim';
import testlandFile from '../countries/testland.json';
import { tavara, testland, withChances } from './countries';
import { withValue } from './files';
import { steward } from './playing';

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

const headlines = (report: TurnReport | undefined) =>
  (report?.entries ?? []).map((entry) => entry.headline);

const { cost, surveyQuarters } = balance.surveys;

/**
 * The two countries, each with the region it hides a deposit in, the deposit's sites, the
 * outlet its route leads to, a seed whose survey finds it, with the size found, and a seed
 * whose survey finds nothing. Each starts with a treasury that builds the whole chain at once,
 * and with no drought, dilemma or debt to get in the way.
 */
const cases = [
  {
    name: 'Tavara',
    country: (): Country => withChances(withValue(tavaraFile, ['start', 'treasury'], 400), {}),
    region: 'salt-coast',
    regionName: 'Salt Coast',
    mine: 'westhaven-mine',
    mineName: 'Westhaven mine',
    route: 'westhaven-trunk-road',
    routeName: 'Trunk road, Westhaven mine to Saltmouth',
    outlet: 'saltmouth-port',
    finds: { seed: 3, tonnes: 290_000 },
    empty: 1,
  },
  {
    name: 'Testland',
    country: (): Country => withChances(withValue(testlandFile, ['start', 'treasury'], 400), {}),
    region: 'northfield',
    regionName: 'Northfield',
    mine: 'north-mine',
    mineName: 'Northfield mine',
    route: 'north-trunk-road',
    routeName: 'Trunk road, Northfield mine to Alpha port',
    outlet: 'alpha-port',
    finds: { seed: 2, tonnes: 390_000 },
    empty: 9,
  },
] as const;

describe('a deposit’s find', () => {
  it('comes from the seed and the deposit alone, the same every time', () => {
    for (const country of [tavara(), testland()]) {
      for (const deposit of country.deposits) {
        for (const seed of [1, 2, 3, 2026]) {
          expect(depositFind(seed, deposit)).toBe(depositFind(seed, deposit));
        }
      }
    }
  });

  it('is either nothing or a whole number of steps within the deposit’s range', () => {
    const { tonnesStep } = balance.surveys;
    for (const country of [tavara(), testland()]) {
      for (const deposit of country.deposits) {
        for (let seed = 1; seed <= 200; seed += 1) {
          const tonnes = depositFind(seed, deposit);
          if (tonnes === null) continue;
          expect(tonnes).toBeGreaterThanOrEqual(deposit.tonnes.min);
          expect(tonnes).toBeLessThanOrEqual(deposit.tonnes.max);
          expect(tonnes % tonnesStep).toBe(0);
        }
      }
    }
  });

  it('is found about as often as its likelihood says', () => {
    for (const country of [tavara(), testland()]) {
      for (const deposit of country.deposits) {
        let found = 0;
        for (let seed = 1; seed <= 2000; seed += 1) {
          if (depositFind(seed, deposit) !== null) found += 1;
        }
        expect(found / 2000).toBeCloseTo(deposit.likelihood, 1);
      }
    }
  });
});

describe('a survey', () => {
  it.each(cases)('in $name shows its cost, time, chance and range before it starts', (each) => {
    const game = createGame(each.country(), each.finds.seed);
    const deposit = game.country.deposits.find((one) => one.regionId === each.region);
    expect(surveyTerms(game.country, each.region)).toEqual({
      regionId: each.region,
      name: each.regionName,
      cost,
      surveyQuarters,
      likelihood: deposit?.likelihood,
      tonnes: deposit?.tonnes,
    });
    expect(surveyStatuses(game, {}).find((status) => status.regionId === each.region)).toEqual(
      expect.objectContaining({ state: 'unsurveyed', fault: null, found: null }),
    );
  });

  it.each(cases)('in $name cannot be made where no deposit is hidden', (each) => {
    const game = createGame(each.country(), 1);
    const barren = surveyStatuses(game, {}).filter((status) => status.state === 'barren');
    expect(barren.length).toBe(game.country.regions.length - game.country.deposits.length);
    for (const status of barren) {
      expect(status.fault).toBe(
        `The geologists see no sign of ore in ${status.name}, so there is nothing there to survey.`,
      );
    }
  });

  it.each(cases)('in $name is planned once, beside what else is planned', (each) => {
    const game = createGame(each.country(), 1);
    const planned = surveyStatuses(game, { startSurveys: [each.region] }).find(
      (status) => status.regionId === each.region,
    );
    expect(planned).toEqual(
      expect.objectContaining({ state: 'planned', fault: `${each.regionName} is planned.` }),
    );
    expect(projectStartFault(game, [onSurvey(each.region), onSurvey(each.region)])).toBe(
      `${each.regionName} is listed twice.`,
    );
  });

  it.each(cases)('in $name needs the whole cost in the treasury', (each) => {
    const game = { ...createGame(each.country(), 1), treasury: cost - 1 };
    expect(projectStartFault(game, [onSurvey(each.region)])).toMatch(/does not cover/);
  });

  it.each(cases)('in $name is counted with every other project planned', (each) => {
    const game = { ...createGame(each.country(), 1), treasury: cost };
    const research = { startResearch: 'droughtResistantSeed' } as const;
    expect(planFault(game, research, onSurvey(each.region))).toMatch(/does not cover/);
    expect(researchStatuses(game, null, [], [each.region])[0]?.fault).toMatch(/does not cover/);
    expect(planFault(game, {}, onSurvey(each.region))).toBeNull();
  });

  it.each(cases)('in $name is barred during austerity', (each) => {
    const game = { ...createGame(each.country(), 1), austerity: { quartersLeft: 3 } };
    expect(projectStartFault(game, [onSurvey(each.region)])).toMatch(/austerity/i);
  });

  it.each(cases)(
    'in $name is paid in instalments, reports what it found and opens the deposit to building',
    (each) => {
      const game = createGame(each.country(), each.finds.seed);
      const { state, reports } = play(game, [
        { startSurveys: [each.region] },
        ...Array.from({ length: surveyQuarters - 1 }, () => ({})),
      ]);

      expect(headlines(reports[0])).toContain(`Survey begins: ${each.regionName}`);
      expect(reports[0]?.treasury.contributions).toContainEqual({
        label: `Surveying ${each.regionName}`,
        amount: -Math.floor(cost / surveyQuarters),
        regionId: each.region,
      });
      expect(reports.at(-1)?.entries).toContainEqual({
        kind: 'surveyCompleted',
        seriousness: 'notable',
        headline: `Survey finished: ${each.regionName}`,
        cause: `The surveyors have reported. They found a deposit of ore whose mine could yield ${formatTonnes(each.finds.tonnes)} a quarter. ${each.mineName} and ${each.routeName} can be built from next quarter.`,
        regionId: each.region,
      });
      expect(state.country.sites.map((site) => site.id)).toEqual(
        expect.arrayContaining([each.mine, each.route]),
      );
      expect(siteStatus(state, each.mine).state).toBe('empty');
      expect(surveyStatuses(state, {}).find((status) => status.regionId === each.region)).toEqual(
        expect.objectContaining({
          state: 'surveyed',
          found: each.finds.tonnes,
          fault: `${each.regionName} has already been surveyed.`,
        }),
      );
    },
  );

  it.each(cases)('in $name that finds nothing says so, and the region is surveyed', (each) => {
    const game = createGame(each.country(), each.empty);
    const { state, reports } = play(game, [
      { startSurveys: [each.region] },
      ...Array.from({ length: surveyQuarters - 1 }, () => ({})),
    ]);

    expect(reports.at(-1)?.entries).toContainEqual(
      expect.objectContaining({
        kind: 'surveyCompleted',
        headline: `Survey finished: ${each.regionName}`,
        cause: 'The surveyors have reported. They found no deposit of ore worth mining.',
      }),
    );
    expect(state.country.sites).toBe(game.country.sites);
    expect(surveyStatuses(state, {}).find((status) => status.regionId === each.region)).toEqual(
      expect.objectContaining({ state: 'surveyed', found: null }),
    );
    expect(() => advanceQuarter(state, { ...steward(state), startProjects: [each.mine] })).toThrow(
      `There is no site "${each.mine}" to build on.`,
    );
  });

  it.each(cases)(
    'in $name leaves the random generator, the weather and the events as they were',
    (each) => {
      const game = createGame(each.country(), each.finds.seed);
      const quiet = play(game, [{}, {}, {}, {}]);
      const surveying = play(game, [{ startSurveys: [each.region] }, {}, {}, {}]);
      expect(surveying.state.rng).toBe(quiet.state.rng);
      expect(surveying.state.events).toEqual(quiet.state.events);
      expect(surveying.state.worldPrices).toEqual(quiet.state.worldPrices);
      expect(surveying.state.regions.map((region) => region.weather)).toEqual(
        quiet.state.regions.map((region) => region.weather),
      );
    },
  );

  it.each(cases)('in $name is counted by the preview like any project', (each) => {
    const game = createGame(each.country(), 1);
    const preview = previewQuarter(game, { budget: game.budget, startSurveys: [each.region] });
    expect(preview.projectSpending).toEqual({
      min: Math.floor(cost / surveyQuarters),
      max: Math.floor(cost / surveyQuarters),
    });
  });
});

describe('a whole game', () => {
  it.each(cases)(
    'in $name surveys, finds a deposit, builds its chain and earns from its revealed size',
    (each) => {
      const game = createGame(each.country(), each.finds.seed);
      const surveyed = play(game, [
        { startSurveys: [each.region] },
        ...Array.from({ length: surveyQuarters - 1 }, () => ({})),
      ]);
      const chain = [each.outlet, each.route, each.mine];
      const longest = Math.max(
        ...chain.map((id) => {
          const site = surveyed.state.country.sites.find((one) => one.id === id);
          return site === undefined ? 0 : balance.sites[site.type].buildQuarters;
        }),
      );
      const built = play(surveyed.state, [
        { startProjects: chain },
        ...Array.from({ length: longest }, () => ({})),
      ]);
      const { state, reports } = built;

      expect(state.outcome.status).toBe('playing');
      for (const id of chain) expect(siteStatus(state, id).state).toBe('operating');
      const mine = chainOf(state, each.mine);
      expect(mine?.shipped).toBe(each.finds.tonnes);
      expect(mine?.output).toBe(
        Math.round((each.finds.tonnes * (mine?.orePrice ?? 0)) / DOLLARS_PER_MONEY),
      );
      const earned = reports
        .at(-1)
        ?.treasury.contributions.filter((line) => line.label.includes(each.mineName));
      expect(earned?.reduce((total, line) => total + line.amount, 0)).toBeGreaterThan(0);

      // A saved game keeps what was found and goes on earning from it.
      const restored = loadSave(JSON.parse(JSON.stringify(saveGame(state, null))) as unknown);
      expect(restored.game).toEqual(state);
    },
  );

  it.each(cases)('in $name surveys, finds nothing and plays on as before', (each) => {
    const game = createGame(each.country(), each.empty);
    const { state } = play(game, [
      { startSurveys: [each.region] },
      ...Array.from({ length: 8 }, () => ({})),
    ]);
    expect(state.outcome.status).toBe('playing');
    expect(state.country.sites.some((site) => site.id === each.mine)).toBe(false);
    expect(state.projects).toEqual([
      {
        target: onSurvey(each.region),
        began: { year: 1, quarter: 1 },
        quartersPaid: surveyQuarters,
        status: 'surveyed',
        opened: { year: 1, quarter: surveyQuarters + 1 },
      },
    ]);
  });
});
