import { describe, expect, it } from 'vitest';
import {
  advanceQuarter,
  createGame,
  previewQuarter,
  siteSchedule,
  siteStatus,
  termCalendar,
  type Budget,
  type Decisions,
  type GameState,
} from '../../src/sim';
import { bothCountries, tavara } from './countries';
import { steward } from './playing';
import { budgetFrom, budgetOf } from '../budgets';

/**
 * Every tax the country can bear and nothing spent but the upkeep of what is built, so every
 * instalment can be paid and every site in use stays in good repair.
 */
const austere: Budget = budgetOf({ taxRatePercent: 40, spending: { upkeep: 200 } });

/** A budget the treasury cannot cover: spending is cut and nothing is left for building. */
const ruinous: Budget = budgetOf({ taxRatePercent: 5, elsewhere: 200 });

/** Plays one quarter for each set of decisions given, in order. */
function play(start: GameState, quarters: readonly Partial<Decisions>[]): GameState {
  return quarters.reduce(
    (state, decisions) => advanceQuarter(state, { budget: state.budget, ...decisions }).state,
    start,
  );
}

/** Plays carefully, with money for relief, so that hunger does not end the game early. */
function playCarefully(start: GameState, quarters: number): GameState {
  let state = start;
  const budget = budgetFrom(start.budget, {
    taxRatePercent: 30,
    spending: { foodRelief: 70, security: 0 },
  });
  for (let quarter = 0; quarter < quarters; quarter += 1) {
    state = advanceQuarter(state, steward(state, budget)).state;
  }
  return state;
}

function siteOfType(game: GameState, type: string): string {
  const site = game.country.sites.find((candidate) => candidate.type === type);
  if (!site) throw new Error(`The country has no ${type} site`);
  return site.id;
}

describe.each(bothCountries)('the term’s calendar in %s', (_name, country) => {
  it('lays out the 20 quarters of the term, year by year', () => {
    const calendar = termCalendar(createGame(country(), 5));

    expect(calendar.termQuarters).toBe(20);
    expect(calendar.quarters).toHaveLength(20);
    expect(calendar.quarters.map((quarter) => quarter.number)).toEqual(
      Array.from({ length: 20 }, (_, index) => index + 1),
    );
    expect(calendar.quarters[0]?.date).toEqual({ year: 1, quarter: 1 });
    expect(calendar.quarters[6]?.date).toEqual({ year: 2, quarter: 3 });
    expect(calendar.quarters[19]?.date).toEqual({ year: 5, quarter: 4 });
  });

  it('marks the harvest in the fourth quarter of every year, and the election in the last', () => {
    const { quarters } = termCalendar(createGame(country(), 5));

    expect(quarters.filter((quarter) => quarter.harvest).map((quarter) => quarter.number)).toEqual([
      4, 8, 12, 16, 20,
    ]);
    expect(quarters.filter((quarter) => quarter.election).map((quarter) => quarter.number)).toEqual(
      [20],
    );
  });

  it('starts with the first quarter as now and every other still ahead', () => {
    const calendar = termCalendar(createGame(country(), 5));

    expect(calendar.now).toBe(1);
    expect(calendar.quarters.map((quarter) => quarter.when)).toEqual([
      'now',
      ...Array.from({ length: 19 }, () => 'ahead'),
    ]);
  });

  it('moves now on as quarters end, leaving the past behind it', () => {
    const calendar = termCalendar(playCarefully(createGame(country(), 5), 5));

    expect(calendar.now).toBe(6);
    expect(calendar.quarters.map((quarter) => quarter.when)).toEqual([
      ...Array.from({ length: 5 }, () => 'past'),
      'now',
      ...Array.from({ length: 14 }, () => 'ahead'),
    ]);
  });

  it('has the whole term behind it once the election has been held', () => {
    const calendar = termCalendar(playCarefully(createGame(country(), 5), 20));

    expect(calendar.now).toBe(21);
    expect(calendar.quarters.every((quarter) => quarter.when === 'past')).toBe(true);
  });
});

describe.each(bothCountries)('the schedule of a site in %s', (_name, country) => {
  it('is drawn for an empty site as if building began now', () => {
    const game = createGame(country(), 5);

    // A grain store takes 2 quarters: built in quarters 1 and 2, in use for 3 to 20.
    expect(siteSchedule(game, siteOfType(game, 'grainStore'))).toEqual({
      siteId: siteOfType(game, 'grainStore'),
      state: 'planned',
      begins: 1,
      opens: 3,
      inUseBeforeVote: 18,
    });
    // Irrigation takes 3 quarters: in use for quarters 4 to 20.
    expect(siteSchedule(game, siteOfType(game, 'irrigation'))).toMatchObject({
      state: 'planned',
      begins: 1,
      opens: 4,
      inUseBeforeVote: 17,
    });
  });

  it('moves with the calendar while the site stays empty', () => {
    const game = playCarefully(createGame(country(), 5), 6);

    expect(siteSchedule(game, siteOfType(game, 'grainStore'))).toMatchObject({
      state: 'planned',
      begins: 7,
      opens: 9,
      inUseBeforeVote: 12,
    });
  });

  it('holds still once building has begun, and agrees with when the site opened', () => {
    // Two quarters of saving first, so that either country can afford to start.
    const start = play(createGame(country(), 5), [{ budget: austere }, { budget: austere }]);
    const store = siteOfType(start, 'grainStore');
    const expected = { siteId: store, begins: 3, opens: 5, inUseBeforeVote: 16 };

    const building = play(start, [{ budget: austere, startProjects: [store] }]);
    expect(siteSchedule(building, store)).toEqual({ ...expected, state: 'building' });

    const operating = play(building, [{ budget: austere }, { budget: austere }]);
    expect(siteSchedule(operating, store)).toEqual({ ...expected, state: 'operating' });
    expect(siteStatus(operating, store).opened).toEqual({ year: 2, quarter: 1 });
  });

  it('slips by a quarter for every quarter the building is paused', () => {
    const game = createGame(country(), 5);
    const store = siteOfType(game, 'grainStore');

    // Nothing can be paid in quarter 1, so both quarters of building are still to do.
    const paused = play(game, [{ budget: ruinous, startProjects: [store] }]);
    expect(siteSchedule(paused, store)).toEqual({
      siteId: store,
      state: 'paused',
      begins: 1,
      opens: 4,
      inUseBeforeVote: 17,
    });

    const pausedAgain = play(paused, [{ budget: ruinous }]);
    expect(siteSchedule(pausedAgain, store)).toMatchObject({ opens: 5, inUseBeforeVote: 16 });
  });

  it('says a site that would open only after the vote is not in use before it', () => {
    const late = playCarefully(createGame(country(), 5), 18);

    // In quarter 19 a grain store would be built in 19 and 20 and open in 21.
    expect(siteSchedule(late, siteOfType(late, 'grainStore'))).toMatchObject({
      begins: 19,
      opens: 21,
      inUseBeforeVote: 0,
    });
    // Irrigation would open in quarter 22.
    expect(siteSchedule(late, siteOfType(late, 'irrigation'))).toMatchObject({
      opens: 22,
      inUseBeforeVote: 0,
    });
  });

  it('counts the election quarter itself as a quarter in use', () => {
    const late = playCarefully(createGame(country(), 5), 17);

    expect(siteSchedule(late, siteOfType(late, 'grainStore'))).toMatchObject({
      begins: 18,
      opens: 20,
      inUseBeforeVote: 1,
    });
  });
});

describe.each(bothCountries)('the schedule in the preview in %s', (_name, country) => {
  it('is empty while nothing is being built or planned', () => {
    const game = createGame(country(), 5);

    expect(previewQuarter(game, { budget: game.budget }).schedule).toEqual([]);
  });

  it('lists a project queued to start this quarter as planned', () => {
    const game = createGame(country(), 5);
    const store = siteOfType(game, 'grainStore');

    const preview = previewQuarter(game, { budget: austere, startProjects: [store] });

    expect(preview.schedule).toEqual([
      { siteId: store, state: 'planned', begins: 1, opens: 3, inUseBeforeVote: 18 },
    ]);
  });

  it('lists projects under way and in use in the order they were started', () => {
    const start = createGame(country(), 5);
    const store = siteOfType(start, 'grainStore');
    const road = siteOfType(start, 'farmRoad');
    const game = play(start, [
      { budget: austere, startProjects: [store] },
      { budget: austere },
      { budget: austere, startProjects: [road] },
    ]);

    expect(previewQuarter(game, { budget: austere }).schedule).toEqual([
      { siteId: store, state: 'operating', begins: 1, opens: 3, inUseBeforeVote: 18 },
      // A farm road takes 3 quarters: begun in quarter 3, it opens in quarter 6.
      { siteId: road, state: 'building', begins: 3, opens: 6, inUseBeforeVote: 15 },
    ]);
  });

  it('lets the opening slip when this quarter’s instalment cannot be paid', () => {
    const start = createGame(country(), 5);
    const store = siteOfType(start, 'grainStore');
    const game = play(start, [{ startProjects: [store] }]);

    // Paid for, the store opens in quarter 3. Left unpaid this quarter, it opens in 4.
    expect(previewQuarter(game, { budget: austere }).schedule).toMatchObject([{ opens: 3 }]);
    const preview = previewQuarter(game, { budget: ruinous });
    expect(preview.pausedSites).toEqual([store]);
    expect(preview.schedule).toEqual([
      { siteId: store, state: 'building', begins: 1, opens: 4, inUseBeforeVote: 17 },
    ]);
  });

  it('agrees with what then happens when every instalment is paid', () => {
    let game = createGame(country(), 5);
    const store = siteOfType(game, 'grainStore');
    const promised = previewQuarter(game, { budget: austere, startProjects: [store] }).schedule[0];

    game = play(game, [{ budget: austere, startProjects: [store] }, { budget: austere }]);

    expect(siteStatus(game, store).state).toBe('operating');
    expect(termCalendar(game).quarters[(promised?.opens ?? 0) - 1]?.date).toEqual(
      siteStatus(game, store).opened,
    );
  });
});

describe('the schedule in Tavara', () => {
  it('does not change the game or draw on its randomness', () => {
    const game = createGame(tavara(), 5);
    const before = structuredClone(game);

    termCalendar(game);
    siteSchedule(game, 'lowmere-store');

    expect(game).toEqual(before);
  });

  it('refuses a site the country does not have', () => {
    const game = createGame(tavara(), 5);

    expect(() => siteSchedule(game, 'nowhere')).toThrow('There is no site "nowhere".');
  });
});
