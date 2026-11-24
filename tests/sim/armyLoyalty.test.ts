import { describe, expect, it } from 'vitest';
import tavaraFile from '../../src/countries/tavara.json';
import {
  advanceQuarter,
  ARMY_STAGE_NAMES,
  armyLoyaltyStatus,
  austerityStatus,
  balance,
  budgetLimits,
  createGame,
  loadCountry,
  loadSave,
  previewQuarter,
  regionName,
  saveGame,
  SPENDING_AREA_NAMES,
  SPENDING_AREAS,
  type Budget,
  type Country,
  type GameState,
  type TurnReport,
} from '../../src/sim';
import testlandFile from '../countries/testland.json';
import { budgetFrom } from '../budgets';
import { beforeDefence, bothCountries, withChances, withDroughtChance } from './countries';
import { faultsOf, withValue, without } from './files';
import { steward } from './playing';

const { stages, defence } = balance.army.loyalty;

/** The two country files as written, by the names the scenarios run under. */
const FILES = { Tavara: tavaraFile, Testland: testlandFile } as const;
const fileOf = (name: string): unknown => FILES[name as keyof typeof FILES];

/** A country in which nothing is left to chance: no drought, flood, dilemma, shock or growth. */
const quiet = (name: string): Country => withChances(fileOf(name), {});

/** The country's starting budget with Defence changed. */
const defending = (country: Country, amount: number): Budget =>
  budgetFrom(country.start.budget, { spending: { defence: amount } });

/** Plays quarters on one budget, keeping each state and report, the opening state first. */
function play(
  start: GameState,
  quarters: number,
  budgetOf: (game: GameState) => Budget,
): { states: GameState[]; reports: TurnReport[] } {
  const states = [start];
  const reports: TurnReport[] = [];
  let game = start;
  for (let quarter = 0; quarter < quarters && game.outcome.status === 'playing'; quarter += 1) {
    const result = advanceQuarter(game, steward(game, budgetOf(game)));
    game = result.state;
    states.push(game);
    reports.push(result.report);
  }
  return { states, reports };
}

/** The headlines of a report's entries about the army. */
const armyHeadlines = (report: TurnReport): string[] =>
  report.entries.filter((entry) => entry.kind === 'armyLoyalty').map((entry) => entry.headline);

describe('Defence', () => {
  it('is a spending area of its own, beside Security', () => {
    expect(SPENDING_AREAS).toContain('defence');
    expect(SPENDING_AREAS).toContain('security');
    expect(SPENDING_AREA_NAMES.defence).toBe('Defence');
  });
});

describe.each(bothCountries)('army loyalty in %s', (name, country) => {
  it('opens loyal, and falls through restless to plotting once Defence is cut to nothing', () => {
    const start = createGame(country(), 7);
    expect(armyLoyaltyStatus(start).stage).toBe('loyal');

    const { states } = play(start, 16, (game) => defending(game.country, 0));
    const stagesSeen = states.map((state) => armyLoyaltyStatus(state).stage);
    const loyalties = states.map((state) => armyLoyaltyStatus(state).loyalty);

    // It is felt over quarters and not at once: the first quarter leaves the army loyal.
    expect(stagesSeen[1]).toBe('loyal');
    expect(stagesSeen).toContain('restless');
    expect(stagesSeen.at(-1)).toBe('plotting');
    // Restless comes before plotting, and loyalty never recovers on the way down.
    expect(stagesSeen.indexOf('restless')).toBeLessThan(stagesSeen.indexOf('plotting'));
    for (let index = 1; index < loyalties.length; index += 1) {
      expect(loyalties[index]).toBeLessThanOrEqual(loyalties[index - 1] ?? 0);
    }
    // The stages are read by the marks in balance data.
    expect(loyalties.at(-1)).toBeLessThan(stages.plottingBelowPermille);
    expect(armyLoyaltyStatus(start).restlessBelow).toBe(stages.restlessBelowPermille);
    expect(armyLoyaltyStatus(start).plottingBelow).toBe(stages.plottingBelowPermille);
  });

  it('opens settled: on the budget it starts with, nothing moves', () => {
    const start = createGame(quiet(name), 7);
    const { states, reports } = play(start, 4, (game) => game.country.start.budget);
    for (const state of states) {
      expect(state.regions.map((region) => region.armyLoyalty)).toEqual(
        start.regions.map((region) => region.armyLoyalty),
      );
      // It stands where the budget would settle it, so it has nowhere to go.
      const status = armyLoyaltyStatus(state);
      expect(status.settles).toBe(status.loyalty);
      expect(status.settlesStage).toBe('loyal');
    }
    for (const report of reports) {
      expect(report.armyLoyalty?.change).toBe(0);
      expect(armyHeadlines(report)).toEqual([]);
    }
  });

  it('is less loyal in a region in protest than in a calm one under the same budget', () => {
    // The cascade: a drought left alone in the first region brings hunger there, hunger
    // protests, and protests a less loyal army. The country is taxed from the start as
    // heavily as leaves every region calm, so that hunger tips only the stricken one over.
    const file = fileOf(name) as { regions: { id: string }[] };
    const stricken = file.regions[0]?.id ?? '';
    const taxed = (taxRate: number) =>
      withDroughtChance(
        withValue(file, ['start', 'budget', 'taxRate'], taxRate),
        { [stricken]: 1 },
        0,
      );
    const { min, max } = budgetLimits.taxRatePercent;
    const rates = Array.from({ length: max - min + 1 }, (_, index) => max - index);
    const heaviest = rates.find((rate) =>
      createGame(taxed(rate), 7).regions.every((region) => region.unrest === 'calm'),
    );
    if (heaviest === undefined) throw new Error('No tax rate leaves the country calm');
    let game = createGame(taxed(heaviest), 7);
    const protesting = () => game.regions.find((region) => region.unrest === 'protests');
    for (let quarter = 0; quarter < 16 && game.outcome.status === 'playing'; quarter += 1) {
      game = advanceQuarter(game, { budget: game.budget }).state;
      if (protesting() !== undefined) break;
    }
    const inProtest = protesting();
    const calm = game.regions.find((region) => region.unrest === 'calm');
    if (inProtest === undefined || calm === undefined) {
      throw new Error('The game did not leave one region in protest and another calm');
    }
    expect(inProtest.armyLoyalty).toBeLessThan(calm.armyLoyalty);

    // The national figure is the regions' average by population.
    const people = game.regions.reduce((total, region) => total + region.population, 0);
    const weighted = game.regions.reduce(
      (total, region) => total + region.population * region.armyLoyalty,
      0,
    );
    const status = armyLoyaltyStatus(game);
    expect(status.loyalty).toBe(Math.floor(weighted / people));
    expect(status.regions.map((region) => region.loyalty)).toEqual(
      game.regions.map((region) => region.armyLoyalty),
    );
    expect(
      status.regions.find((region) => region.regionId === inProtest.id)?.causes,
    ).toContainEqual({ label: 'Unrest', amount: inProtest.armyLoyaltyEffects.unrest });
    expect(inProtest.armyLoyaltyEffects.unrest).toBeLessThan(0);
  });

  it('is forecast by the preview: next quarter exactly, and where it is heading', () => {
    const start = createGame(quiet(name), 7);
    const cut = defending(start.country, 0);
    const preview = previewQuarter(start, { budget: cut });
    const next = advanceQuarter(start, { budget: cut }).state;
    expect(preview.armyLoyalty).toEqual({
      min: armyLoyaltyStatus(next).loyalty,
      max: armyLoyaltyStatus(next).loyalty,
    });
    expect(preview.armyLoyalty.max).toBeLessThan(armyLoyaltyStatus(start).loyalty);
    // The status says the same of the budget before it is committed.
    expect(armyLoyaltyStatus(start, cut).settles).toBe(preview.armyLoyaltyHeading.max);

    // Nothing else changes in this country, so each quarter closes on where the preview said
    // it was heading, a share of the way at a time, until the army, left with nothing, takes
    // power: by then it has closed most of the way.
    const heading = preview.armyLoyaltyHeading.max;
    const { states } = play(start, 19, () => cut);
    const gaps = states.map((state) => armyLoyaltyStatus(state).loyalty - heading);
    for (let index = 1; index < gaps.length; index += 1) {
      expect(gaps[index]).toBeGreaterThanOrEqual(0);
      expect(gaps[index]).toBeLessThan(gaps[index - 1] ?? 0);
    }
    expect(states.at(-1)?.outcome).toMatchObject({ cause: 'coup' });
    expect(gaps.at(-1)).toBeLessThan((gaps[0] ?? 0) / 4);
    // Every later preview on the same budget says the same of where it is heading.
    for (const state of states.slice(0, -1)) {
      expect(previewQuarter(state, { budget: cut }).armyLoyaltyHeading.max).toBe(heading);
    }
  });

  it('is raised by spending more than the army expects, up to double', () => {
    const start = createGame(quiet(name), 7);
    const most = defending(start.country, budgetLimits.spending.max);
    // The most the slider allows is more than double what either country's army expects.
    expect(armyLoyaltyStatus(start).expected * 2).toBeLessThanOrEqual(most.spending.defence);
    expect(armyLoyaltyStatus(start, most).settles).toBe(
      balance.army.loyalty.baselinePermille + defence.weightPermille,
    );
    const { states } = play(start, 8, () => most);
    for (const [index, state] of states.entries()) {
      const status = armyLoyaltyStatus(state);
      const before = states[index - 1];
      if (before !== undefined) {
        expect(status.loyalty).toBeGreaterThanOrEqual(armyLoyaltyStatus(before).loyalty);
      }
      // The breakdown adds up to the figure.
      expect(status.causes.reduce((total, cause) => total + cause.amount, 0)).toBe(status.loyalty);
    }
  });

  it('reports each change of stage, with why, and the recovery when Defence is restored', () => {
    // Defence is cut to nothing until the army plots, and then restored.
    const start = createGame(quiet(name), 7);
    const cut = play(start, 16, (game) => defending(game.country, 0));
    const plots = cut.states.findIndex((state) => armyLoyaltyStatus(state).stage === 'plotting');
    const down = { states: cut.states.slice(0, plots + 1), reports: cut.reports.slice(0, plots) };
    const told = down.reports.flatMap((report) =>
      report.entries.filter((entry) => entry.kind === 'armyLoyalty'),
    );
    expect(told.map((entry) => entry.headline)).toEqual([
      'The army is restless',
      'The army is plotting',
    ]);
    const [restless, plotting] = told;
    expect(restless?.seriousness).toBe('warning');
    expect(plotting?.seriousness).toBe('serious');
    // Why: where loyalty stands against the mark, and what is spent against what is expected.
    expect(restless?.cause).toContain('National army loyalty has fallen to');
    expect(restless?.cause).toContain('Defence spending is $0.0m a quarter');
    expect(restless?.cause).toContain('the army expects');
    // Every region moved with the nation, so the nation's entry says so and none has its own.
    expect(restless?.cause).toContain('The army in every region is restless with it.');
    expect(restless?.regionId).toBeUndefined();

    // Each quarter's figure says what moved it, and the lines add up to the change.
    for (const report of down.reports) {
      const figure = report.armyLoyalty;
      if (figure === null) throw new Error('The report has no army loyalty');
      expect(figure.contributions.reduce((total, line) => total + line.amount, 0)).toBe(
        figure.change,
      );
      expect(figure.contributions.map((line) => line.label)).toContain('Defence spending');
    }

    const fallen = down.states.at(-1);
    if (fallen === undefined) throw new Error('No quarter was played');
    const up = play(fallen, 8, (game) => game.country.start.budget);
    expect(up.reports.flatMap(armyHeadlines)).toEqual([
      'The army is restless again',
      'The army is loyal again',
    ]);
    expect(armyLoyaltyStatus(up.states.at(-1) ?? fallen).stage).toBe('loyal');
  });

  it('reports every change of stage in a region, in its own entry or with the nation’s', () => {
    // The first region opens far from approving, as after some blow, so that it protests for
    // years while the others stay calm; and Defence is cut to nothing.
    const start = createGame(quiet(name), 7);
    const angry: GameState = {
      ...start,
      regions: start.regions.map((region, index) =>
        index === 0
          ? {
              ...region,
              approval: 0,
              unrest: 'protests',
              approvalEffects: { ...region.approvalEffects, events: -900 },
            }
          : region,
      ),
    };
    const { states, reports } = play(angry, 12, (game) => defending(game.country, 0));

    let ownEntries = 0;
    for (const [index, report] of reports.entries()) {
      const before = armyLoyaltyStatus(states[index] ?? angry);
      const after = armyLoyaltyStatus(states[index + 1] ?? angry);
      const told = report.entries.filter((entry) => entry.kind === 'armyLoyalty');
      const national = told.filter((entry) => entry.regionId === undefined);
      // The nation's change is told once, and only when it changes.
      expect(national).toHaveLength(before.stage === after.stage ? 0 : 1);
      for (const [place, region] of after.regions.entries()) {
        const own = told.filter((entry) => entry.regionId === region.regionId);
        const named = regionName(start.country, region.regionId);
        if (before.regions[place]?.stage === region.stage) {
          expect(own).toEqual([]);
        } else if (own.length > 0) {
          // Tied to its place, naming the region and the stage it is now in.
          expect(own).toHaveLength(1);
          expect(own[0]?.headline).toBe(
            `The army in ${named} is ${ARMY_STAGE_NAMES[region.stage].toLowerCase()}`,
          );
          ownEntries += 1;
        } else {
          expect(national[0]?.cause).toMatch(new RegExp(`The army in .*(every region|${named})`));
        }
      }
    }
    expect(ownEntries).toBeGreaterThan(0);
    // The protests are part of why.
    expect(reports.flatMap((report) => report.entries.map((entry) => entry.cause))).toContainEqual(
      expect.stringContaining(
        `Protests in ${regionName(start.country, angry.regions[0]?.id ?? '')} pull it down further.`,
      ),
    );
  });

  it('keeps its loyalty through a save, region by region', () => {
    const start = createGame(country(), 7);
    const { states, reports } = play(start, 3, (game) => defending(game.country, 0));
    const game = states.at(-1) ?? start;
    const restored = loadSave(JSON.parse(JSON.stringify(saveGame(game, reports.at(-1) ?? null))));
    expect(restored.game.regions).toEqual(game.regions);
    expect(restored.game.budget.spending.defence).toBe(0);
    expect(restored.game.history.map((signs) => signs.armyLoyalty)).toEqual(
      states.map((state) => armyLoyaltyStatus(state).loyalty),
    );
    expect(restored.report?.armyLoyalty).toEqual(reports.at(-1)?.armyLoyalty);
  });

  it('is capped by austerity at the same share of the starting figure as Security', () => {
    const start = createGame(country(), 7);
    const caps = austerityStatus({ ...start, austerity: { quartersLeft: 4 } })?.caps;
    const { spendingCapPermille } = balance.finance.austerity;
    expect(spendingCapPermille.defence).toBe(spendingCapPermille.security);
    expect(caps?.defence).not.toBeNull();
    expect(caps?.defence).toBeLessThanOrEqual(start.country.start.budget.spending.defence);
    expect(caps?.defence).toBeGreaterThan(0);
  });
});

describe('Defence in a country file', () => {
  it.each(Object.entries(FILES))('is named by %s as it ships, at format 11', (_name, file) => {
    expect(file.formatVersion).toBe(11);
    const country = loadCountry(file);
    expect(country.start.budget.spending.defence).toBe(file.start.budget.spending.defence * 10);
    expect(country.start.budget.spending.defence).toBeGreaterThan(0);
  });

  it.each(Object.entries(FILES))(
    'must be named by %s from format 11, and cannot be in an older file',
    (_name, file) => {
      const path = ['start', 'budget', 'spending', 'defence'];
      expect(faultsOf(without(file, path))).toEqual(['start.budget.spending.defence is missing.']);
      expect(faultsOf(withValue(beforeDefence(file), path, 2))).toEqual([
        'start.budget.spending.defence needs country file format 11 or later.',
      ]);
    },
  );

  it.each(Object.entries(FILES))(
    'is read from %s in an older format as spending what holds the army loyal',
    (_name, file) => {
      const older = loadCountry(beforeDefence(file));
      const spent = older.start.budget.spending.defence;
      expect(spent).toBeGreaterThan(0);
      expect(spent % budgetLimits.spending.step).toBe(0);
      const game = createGame(older, 7);
      const status = armyLoyaltyStatus(game);
      expect(status.stage).toBe('loyal');
      expect(status.settlesStage).toBe('loyal');
      // It is the least that does: one step less would leave the army restless.
      const less = budgetFrom(game.budget, {
        spending: { defence: spent - budgetLimits.spending.step },
      });
      expect(armyLoyaltyStatus(game, less).settlesStage).not.toBe('loyal');
    },
  );
});
