import { describe, expect, it } from 'vitest';
import tavaraFile from '../../src/countries/tavara.json';
import {
  advanceQuarter,
  armyLoyaltyStatus,
  balance,
  budgetLimits,
  coupStatus,
  createGame,
  loadSave,
  riskHorizonQuarters,
  risksAhead,
  saveGame,
  type Budget,
  type Country,
  type GameState,
  type TurnReport,
} from '../../src/sim';
import testlandFile from '../countries/testland.json';
import { budgetFrom } from '../budgets';
import { bothCountries, prosperousTavara, withChances } from './countries';
import { withValue } from './files';
import { steward } from './playing';

const { afterPlottingQuarters } = balance.army.coup;
const { loyalty } = balance.army;
const { plottingBelowPermille } = loyalty.stages;

/** The two country files as written, by the names the scenarios run under. */
const FILES = { Tavara: tavaraFile, Testland: testlandFile } as const;
const fileOf = (name: string): unknown => FILES[name as keyof typeof FILES];

/** A country in which nothing is left to chance: no drought, flood, dilemma, shock or growth. */
const quiet = (name: string): Country => withChances(fileOf(name), {});

/** The country's starting budget with Defence changed. */
const defending = (country: Country, amount: number): Budget =>
  budgetFrom(country.start.budget, { spending: { defence: amount } });

/** Plays quarters on a budget chosen each quarter, keeping each state and report. */
function play(
  start: GameState,
  quarters: number,
  budgetOf: (game: GameState, quarter: number) => Budget,
): { states: GameState[]; reports: TurnReport[] } {
  const states = [start];
  const reports: TurnReport[] = [];
  let game = start;
  for (let quarter = 0; quarter < quarters && game.outcome.status === 'playing'; quarter += 1) {
    const result = advanceQuarter(game, steward(game, budgetOf(game, quarter)));
    game = result.state;
    states.push(game);
    reports.push(result.report);
  }
  return { states, reports };
}

/** A whole first term with Defence at nothing throughout. */
/**
 * A game whose government is well liked on polling day: every region's approval lifted by a
 * passing push, as good news would leave it, enough to win any vote.
 */
const wellLiked = (game: GameState): GameState => ({
  ...game,
  regions: game.regions.map((region) => ({
    ...region,
    approval: Math.min(1000, region.approval + GOOD_NEWS),
    approvalEffects: {
      ...region.approvalEffects,
      events: region.approvalEffects.events + GOOD_NEWS,
    },
  })),
});
const GOOD_NEWS = 400;

/** A game with the army far gone in every region and one quarter from the coup. */
const aboutToFall = (game: GameState): GameState => ({
  ...game,
  plottingQuarters: afterPlottingQuarters - 1,
  regions: game.regions.map((region) => ({
    ...region,
    armyLoyalty: 0,
    armyLoyaltyEffects: {
      defence: -loyalty.defence.weightPermille,
      unrest: loyalty.unrest.protests,
    },
  })),
});

const starved = (country: Country) =>
  play(createGame(country, 7), 20, (game) => defending(game.country, 0));

/** How many states into a game the army is first seen to plot. */
const plotsFrom = (states: readonly GameState[]) =>
  states.findIndex((state) => armyLoyaltyStatus(state).stage === 'plotting');

const coupEntries = (report: TurnReport | undefined) =>
  (report?.entries ?? []).filter((entry) => entry.kind === 'coup');

describe.each(bothCountries)('a coup in %s', (name, country) => {
  it('ends a game whose army has plotted for the set number of quarters running', () => {
    const { states } = starved(country());
    const last = states.at(-1);
    expect(last?.outcome).toMatchObject({ status: 'lost', cause: 'coup' });

    // The army began to plot, and the coup came that many quarter-ends later, no sooner.
    const began = plotsFrom(states);
    expect(began).toBeGreaterThan(0);
    expect(states.length - 1).toBe(began + afterPlottingQuarters - 1);
    expect(states.map((state) => state.plottingQuarters).slice(began)).toEqual(
      Array.from({ length: afterPlottingQuarters }, (_, index) => index + 1),
    );
    // Before it plotted nothing was counted.
    expect(states.slice(0, began).every((state) => state.plottingQuarters === 0)).toBe(true);
  });

  it('does not come when Defence is restored in time', () => {
    // The same game, with Defence put back to what the country starts by spending as soon as
    // the army is seen to plot.
    const lost = starved(country());
    const began = plotsFrom(lost.states);
    const restored = play(createGame(country(), 7), 20, (game, quarter) =>
      quarter < began ? defending(game.country, 0) : game.country.start.budget,
    );
    expect(restored.states.length).toBeGreaterThan(lost.states.length);
    const end = restored.states.at(-1);
    if (end === undefined) throw new Error('No quarter was played');
    expect(end.outcome).not.toMatchObject({ cause: 'coup' });
    expect(end.plottingQuarters).toBe(0);
    expect(coupStatus(end).plotting).toBe(false);
    expect(armyLoyaltyStatus(end).stage).toBe('loyal');
  });

  it('is counted down in the report from the quarter the army begins to plot', () => {
    const { reports } = starved(country());
    const told = reports.flatMap(coupEntries);
    const counted = afterPlottingQuarters - 1;
    expect(told.map((entry) => entry.headline)).toEqual([
      ...Array.from({ length: counted }, (_, index) => {
        const left = counted - index;
        return `The army plots: ${left} ${left === 1 ? 'quarter' : 'quarters'} to a coup`;
      }),
      'The army has taken power',
    ]);
    expect(told.map((entry) => entry.seriousness)).toEqual([
      ...Array.from({ length: counted }, () => 'serious'),
      'critical',
    ]);
    // The count begins in the quarter the army is reported plotting, and says how to end it.
    const first = reports.findIndex((report) => coupEntries(report).length > 0);
    expect(reports[first]?.entries.map((entry) => entry.headline)).toContain(
      'The army is plotting',
    );
    expect(told[0]?.cause).toContain('has ended 1 quarter running below 30%');
    expect(told[0]?.cause).toContain('Loyalty back at 30% or above ends the count.');
    // What ends the game leads its report, and says why. No vote is held.
    const last = reports.at(-1);
    expect(last?.entries[0]).toMatchObject({ kind: 'coup', seriousness: 'critical' });
    expect(last?.entries[0]?.cause).toContain(`for ${afterPlottingQuarters} quarters running`);
    expect(last?.election).toBeNull();
  });

  it('starts the count afresh once loyalty is back above plotting, and reports it', () => {
    // No drought comes in this country, so that hunger does not end the longer game first.
    const lost = starved(quiet(name));
    const began = plotsFrom(lost.states);
    // Defence is restored a quarter after the army is seen to plot, so two quarters are counted.
    const restored = play(createGame(quiet(name), 7), began + 3, (game, quarter) =>
      quarter <= began ? defending(game.country, 0) : game.country.start.budget,
    );
    expect(restored.states.map((state) => state.plottingQuarters).slice(began)).toEqual([
      1, 2, 0, 0,
    ]);
    const [off] = coupEntries(restored.reports[began + 1]);
    expect(off).toMatchObject({ seriousness: 'notable', headline: 'The coup is off' });
    expect(off?.cause).toContain('after 2 quarters of plotting');
    expect(coupEntries(restored.reports[began + 2])).toEqual([]);

    // Plotting again later is counted from nothing.
    const recovered = restored.states.at(-1);
    if (recovered === undefined) throw new Error('No quarter was played');
    const again = play(recovered, 12, (game) => defending(game.country, 0));
    expect(again.states.at(-1)?.outcome).toMatchObject({ cause: 'coup' });
    const counts = again.states.map((state) => state.plottingQuarters);
    expect(counts.filter((count) => count > 0)).toEqual(
      Array.from({ length: afterPlottingQuarters }, (_, index) => index + 1),
    );
  });

  it('is in the risks ahead in every quarter from which it could come', () => {
    const { states } = starved(country());
    const starving = (game: GameState) => defending(game.country, 0);
    const coupIn = (game: GameState, held: Budget) =>
      risksAhead(game, steward(game, held)).find((risk) => risk.kind === 'coup');
    // The last state is the coup. From each of the quarters before it that the look-ahead
    // reaches it from, the risks ahead list it, with how soon it comes.
    const inTime = states.slice(-1 - riskHorizonQuarters, -1);
    expect(inTime).toHaveLength(riskHorizonQuarters);
    for (const [index, game] of inTime.entries()) {
      const risk = coupIn(game, starving(game));
      expect(risk, `${riskHorizonQuarters - index} quarters before`).toBeDefined();
      expect(risk?.headline).toBe('Coup');
      expect(risk?.likelihood).toBe('almostCertain');
      expect(risk?.withinQuarters).toBe(riskHorizonQuarters - index);
      expect(risk?.regionId).toBeUndefined();
    }
    // The line says why: where loyalty stands, the count, and what is spent on Defence.
    const fatal = inTime.at(-1);
    if (fatal === undefined) throw new Error('No quarter was played');
    const reason = coupIn(fatal, starving(fatal))?.reason ?? '';
    expect(reason).toContain('below the 30% where the army plots');
    expect(reason).toContain('the army takes power this quarter');
    expect(reason).toContain('Defence is $0.0m a quarter');
    // It answers to the decisions: with Defence at the most the slider allows, none comes.
    const most = defending(fatal.country, budgetLimits.spending.max);
    expect(coupIn(fatal, most)).toBeUndefined();
    // And while the army is loyal on the budget it starts with, none is listed.
    const [start] = states;
    if (start === undefined) throw new Error('No game');
    expect(coupIn(start, start.country.start.budget)).toBeUndefined();
  });

  it('is kept by a save, the count and the lost game alike', () => {
    const { states, reports } = starved(country());
    const counting = states.at(-2);
    const lost = states.at(-1);
    if (counting === undefined || lost === undefined) throw new Error('No quarter was played');
    expect(counting.plottingQuarters).toBe(afterPlottingQuarters - 1);
    expect(loadSave(saveGame(counting, null)).game.plottingQuarters).toBe(
      counting.plottingQuarters,
    );
    const loaded = loadSave(saveGame(lost, reports.at(-1) ?? null));
    expect(loaded.game.outcome).toEqual(lost.outcome);
    expect(loaded.report?.entries[0]?.kind).toBe('coup');
    // Nothing in a save is trusted: a count or an ending that cannot be is refused.
    expect(() =>
      loadSave(withValue(saveGame(counting, null), ['state', 'plottingQuarters'], -1)),
    ).toThrow('state.plottingQuarters');
    expect(() =>
      loadSave(withValue(saveGame(lost, null), ['state', 'outcome', 'loyalty'], 1001)),
    ).toThrow('state.outcome.loyalty');
  });

  it('comes before the vote: a quarter that would have held an election falls to it', () => {
    // The last quarter of the first term, with the army far gone and one quarter from the coup.
    const start = createGame(quiet(name), 7);
    const { states } = play(start, 19, (game) => game.country.start.budget);
    const last = states.at(-1);
    if (last === undefined) throw new Error('No quarter was played');
    const polling = wellLiked(last);
    // Left alone, the quarter holds the election and the government wins it.
    const voted = advanceQuarter(polling, steward(polling));
    expect(voted.report.election?.won).toBe(true);
    expect(voted.state.outcome.status).toBe('playing');

    const plotting = aboutToFall(polling);
    expect(coupStatus(plotting)).toMatchObject({
      plotting: true,
      held: afterPlottingQuarters - 1,
      needed: afterPlottingQuarters,
      left: 1,
    });
    const fell = advanceQuarter(plotting, steward(plotting));
    expect(armyLoyaltyStatus(fell.state).loyalty).toBeLessThan(plottingBelowPermille);
    expect(fell.state.outcome).toMatchObject({ status: 'lost', cause: 'coup' });
    expect(fell.report.election).toBeNull();
  });
});

describe('a coup in a quarter that would have won the game', () => {
  it('comes before the win: the quarter falls to it', () => {
    // A country that starts in Prosperous and holds it: its fourth quarter wins the game.
    const start = createGame(prosperousTavara(), 3);
    const { states } = play(start, 3, (game) => game.budget);
    const winning = states.at(-1);
    if (winning === undefined) throw new Error('No quarter was played');
    expect(advanceQuarter(winning, steward(winning)).state.outcome).toMatchObject({
      status: 'won',
      cause: 'prosperity',
    });

    // The same quarter with the army far gone and one quarter from the coup.
    const fell = advanceQuarter(aboutToFall(winning), steward(winning));
    expect(fell.state.outcome).toMatchObject({ status: 'lost', cause: 'coup' });
    expect(fell.report.entries[0]?.kind).toBe('coup');
  });
});
