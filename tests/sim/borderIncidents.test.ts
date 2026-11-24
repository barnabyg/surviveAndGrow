import { describe, expect, it } from 'vitest';
import {
  advanceQuarter,
  balance,
  borderIncidentStatuses,
  borderRegions,
  budgetLimits,
  createGame,
  creditStatus,
  intentionIn,
  loadSave,
  loanOffers,
  previewQuarter,
  quarterNumber,
  risksAhead,
  SaveError,
  saveGame,
  tradeCapacity,
  type BorderIncident,
  type Budget,
  type GameState,
  type TurnReport,
} from '../../src/sim';
import { budgetFrom } from '../budgets';
import { bothCountries } from './countries';
import { steward } from './playing';
import { established } from './worthTaking';

const { incident: rules } = balance.neighbours;

/** The budget in force with Defence as given. */
const defending = (game: GameState, defence: number): Budget =>
  budgetFrom(game.budget, { spending: { defence } });

/** Plays quarters, keeping each state and report, the opening state first. */
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

/** A report's entries about border incidents. */
const told = (report: TurnReport | undefined, neighbourId?: string) =>
  (report?.entries ?? []).filter(
    (entry) =>
      entry.kind === 'borderIncident' &&
      (neighbourId === undefined || entry.neighbourId === neighbourId),
  );

/** Whether an incident is in force in the quarter a game is deciding. */
const inForce = (game: GameState, incident: BorderIncident) =>
  quarterNumber(incident.begins) <= quarterNumber(game.date) &&
  quarterNumber(game.date) < quarterNumber(incident.begins) + rules.lastsQuarters;

/** The treasury's lines for the tax a region lost to an incident. */
const lostTo = (report: TurnReport | undefined, name: string) =>
  (report?.treasury.contributions ?? []).filter((line) =>
    line.label.startsWith(`Lost to the border incident with ${name}`),
  );

/**
 * Defence paid only every other quarter: enough that the army never plots, and too little to
 * deter, so that the neighbours turn hostile and the game goes on.
 */
const lean = (game: GameState): Budget =>
  defending(
    game,
    quarterNumber(game.date) % 2 === 1 ? 0 : game.country.start.budget.spending.defence,
  );

/**
 * A game on a country worth taking that is under-defended: deterrence falls, a neighbour
 * turns hostile, and sooner or later its draw announces an incident.
 */
function underDefended(name: string, quarters = 18) {
  return play(createGame(established(name), 7), quarters, lean);
}

describe.each(bothCountries)('a border incident in %s', (name) => {
  it('is announced only by a hostile neighbour, with notice, closes its crossings and cuts its border regions’ output for a set time, and is not met when Defence was raised in time', () => {
    const { states, reports } = underDefended(name);
    const announcedAt = states.findIndex((state) => state.borderIncidents.length > 0);
    expect(announcedAt).toBeGreaterThan(0);
    const announcing = states[announcedAt];
    const before = states[announcedAt - 1];
    if (announcing === undefined || before === undefined) throw new Error('No incident came');
    const [incident] = announcing.borderIncidents;
    if (incident === undefined) throw new Error('No incident came');
    const neighbour = announcing.country.map.neighbours.find(
      (each) => each.id === incident.neighbourId,
    );
    if (neighbour === undefined) throw new Error('The incident names no neighbour');

    // No neighbour announced one while none was hostile.
    for (const state of states.slice(0, announcedAt)) expect(state.borderIncidents).toEqual([]);
    // The neighbour was hostile as the quarter that announced it ended.
    expect(intentionIn(announcing, neighbour.id)).toBe('hostile');

    // It is announced as a quarter begins, to begin the set notice later.
    expect(incident.announced).toEqual(announcing.date);
    expect(quarterNumber(incident.begins)).toBe(
      quarterNumber(incident.announced) + rules.noticeQuarters,
    );
    expect(told(reports[announcedAt - 1], neighbour.id)).toMatchObject([
      {
        seriousness: 'warning',
        headline: `Border incident with ${neighbour.name} ahead`,
        neighbourId: neighbour.id,
      },
    ]);

    // Where: the regions that border the neighbour, worked out from the map.
    const regionIds = borderRegions(announcing.country, neighbour.id);
    expect(regionIds.length).toBeGreaterThan(0);
    const crossings = announcing.country.crossings.filter(
      (crossing) => crossing.neighbourId === neighbour.id,
    );
    expect(crossings.length).toBeGreaterThan(0);

    // Through its notice nothing is closed and nothing lost.
    const beginsAt = announcedAt + rules.noticeQuarters;
    for (const state of states.slice(announcedAt, beginsAt)) {
      expect(inForce(state, incident)).toBe(false);
      for (const link of tradeCapacity(state).links) expect(link.closed).toBeNull();
    }
    for (const report of reports.slice(announcedAt, beginsAt)) {
      expect(lostTo(report, neighbour.name)).toEqual([]);
    }
    expect(told(reports[beginsAt - 1], neighbour.id)).toMatchObject([
      {
        seriousness: 'serious',
        headline: `Border incident with ${neighbour.name}`,
        neighbourId: neighbour.id,
      },
    ]);

    // While it lasts the neighbour's crossings carry nothing, and each region on the border
    // pays tax on less, under a line of its own that names the incident.
    const open = tradeCapacity(before);
    for (let quarter = 0; quarter < rules.lastsQuarters; quarter += 1) {
      const state = states[beginsAt + quarter];
      if (state === undefined) throw new Error('The game ended first');
      expect(inForce(state, incident)).toBe(true);
      const capacity = tradeCapacity(state);
      for (const crossing of crossings) {
        expect(capacity.links.find((link) => link.id === crossing.id)).toMatchObject({
          tonnes: 0,
          closed: {
            neighbourId: neighbour.id,
            name: neighbour.name,
            quartersLeft: rules.lastsQuarters - quarter,
          },
        });
      }
      expect(capacity.total).toBe(capacity.links.reduce((total, link) => total + link.tonnes, 0));
      expect(capacity.total).toBeLessThan(open.total);
      const lost = lostTo(reports[beginsAt + quarter], neighbour.name);
      expect(lost.map((line) => line.regionId)).toEqual(regionIds);
      for (const line of lost) expect(line.amount).toBeLessThan(0);
    }

    // The blow to approval lands as it begins, under the incident's name, in those regions.
    const struck = reports[beginsAt];
    expect(
      struck?.approval.contributions.find(
        (line) => line.label === `Border incident with ${neighbour.name}`,
      )?.amount,
    ).toBeLessThan(0);
    const first = states[beginsAt];
    const after = states[beginsAt + 1];
    for (const region of after?.regions ?? []) {
      const was = first?.regions.find((each) => each.id === region.id);
      const blow = region.approvalEffects.events - (was?.approvalEffects.events ?? 0);
      expect(blow).toBe(regionIds.includes(region.id) ? rules.approvalPermille : 0);
    }

    // When its time is up it ends: the crossings carry again and nothing more is lost.
    const endsAt = beginsAt + rules.lastsQuarters;
    const over = states[endsAt];
    if (over === undefined) throw new Error('The game ended first');
    expect(over.borderIncidents).not.toContainEqual(incident);
    expect(told(reports[endsAt - 1], neighbour.id)[0]).toMatchObject({
      seriousness: 'notable',
      headline: `Border incident with ${neighbour.name} has ended`,
      neighbourId: neighbour.id,
    });
    for (const crossing of crossings) {
      expect(tradeCapacity(over).links.find((link) => link.id === crossing.id)).toMatchObject({
        tonnes: crossing.tonnes,
        closed: null,
      });
    }
    expect(lostTo(reports[endsAt], neighbour.name)).toEqual([]);

    // The same game with Defence raised ahead: no neighbour turns hostile, and nothing comes.
    const raised = play(createGame(established(name), 7), states.length - 1, (game) =>
      defending(game, budgetLimits.spending.max),
    );
    for (const state of raised.states) {
      expect(state.borderIncidents).toEqual([]);
      expect(borderIncidentStatuses(state)).toEqual([]);
      expect(tradeCapacity(state).total).toBe(open.total);
    }
    expect(raised.reports.flatMap((report) => told(report))).toEqual([]);
  });

  it('is called off, and reported so, when its neighbour is no longer hostile as it would begin', () => {
    const { states } = underDefended(name);
    const announcedAt = states.findIndex((state) => state.borderIncidents.length > 0);
    const announcing = states[announcedAt];
    const [incident] = announcing?.borderIncidents ?? [];
    if (announcing === undefined || incident === undefined) throw new Error('No incident came');
    const neighbourName = announcing.country.map.neighbours.find(
      (each) => each.id === incident.neighbourId,
    )?.name;

    // Defence is raised to the most the slider allows through the notice.
    const rebuilt = play(announcing, rules.noticeQuarters + rules.lastsQuarters, (game) =>
      defending(game, budgetLimits.spending.max),
    );
    const due = rebuilt.states[rules.noticeQuarters];
    if (due === undefined) throw new Error('The game ended first');
    expect(due.date).toEqual(incident.begins);
    expect(intentionIn(due, incident.neighbourId)).not.toBe('hostile');
    expect(due.borderIncidents.filter((each) => each.neighbourId === incident.neighbourId)).toEqual(
      [],
    );
    expect(told(rebuilt.reports[rules.noticeQuarters - 1], incident.neighbourId)).toMatchObject([
      {
        seriousness: 'notable',
        headline: `Border incident with ${neighbourName ?? ''} called off`,
      },
    ]);
    // It never closes a crossing or costs a region anything.
    for (const state of rebuilt.states) {
      for (const link of tradeCapacity(state).links) {
        if (link.closed !== null) expect(link.closed.neighbourId).not.toBe(incident.neighbourId);
      }
    }
    for (const report of rebuilt.reports) expect(lostTo(report, neighbourName ?? '')).toEqual([]);
  });

  it('is drawn from the seed and the quarter alone, and leaves the generator as it was', () => {
    // The same seed, under-defended and well defended: one meets incidents and the other none,
    // and the generator, which draws the weather and the events, moves alike in both.
    const met = underDefended(name);
    const spared = play(createGame(established(name), 7), met.states.length - 1, (game) =>
      defending(game, budgetLimits.spending.max),
    );
    expect(met.states.some((state) => state.borderIncidents.length > 0)).toBe(true);
    expect(spared.states.map((state) => state.rng)).toEqual(met.states.map((state) => state.rng));
    expect(spared.states.map((state) => state.regions.map((region) => region.weather))).toEqual(
      met.states.map((state) => state.regions.map((region) => region.weather)),
    );
    // And the same game played again meets the same incidents in the same quarters.
    expect(underDefended(name).states.map((state) => state.borderIncidents)).toEqual(
      met.states.map((state) => state.borderIncidents),
    );
  });

  it('is announced for a neighbour only while it has none of its own announced or in force', () => {
    const { states } = underDefended(name, 40);
    for (const state of states) {
      const ids = state.borderIncidents.map((incident) => incident.neighbourId);
      expect(new Set(ids).size).toBe(ids.length);
    }
    // Over ten years more than one comes, each begun only after the last had ended.
    const all = new Map<string, BorderIncident>();
    for (const state of states) {
      for (const incident of state.borderIncidents) {
        all.set(`${incident.neighbourId} ${quarterNumber(incident.announced)}`, incident);
      }
    }
    const [first, ...later] = [...all.values()].filter(
      (incident) => incident.neighbourId === [...all.values()][0]?.neighbourId,
    );
    expect(later.length).toBeGreaterThan(0);
    let last = first;
    for (const incident of later) {
      if (last === undefined) break;
      expect(quarterNumber(incident.announced)).toBeGreaterThanOrEqual(
        quarterNumber(last.begins) + rules.lastsQuarters,
      );
      last = incident;
    }
  });

  it('is counted by the preview: the closed crossing, the lost output and the blow to approval', () => {
    const { states } = underDefended(name);
    const beginsAt = states.findIndex((state) =>
      state.borderIncidents.some((incident) => inForce(state, incident)),
    );
    const game = states[beginsAt];
    if (game === undefined) throw new Error('No incident began');
    const decisions = steward(game, lean(game));
    const preview = previewQuarter(game, decisions);
    const { state: next, report } = advanceQuarter(game, decisions);
    const lost = report.treasury.contributions
      .filter((line) => line.label.startsWith('Lost to the border incident'))
      .reduce((total, line) => total + line.amount, 0);
    expect(lost).toBeLessThan(0);
    expect(preview.treasury).toEqual({ min: next.treasury, max: next.treasury });
    expect(preview.approval).toEqual({ min: report.approval.value, max: report.approval.value });
    // Without the incident the same quarter would raise that much more.
    const without = previewQuarter({ ...game, borderIncidents: [] }, decisions);
    expect(without.revenue.min - preview.revenue.min).toBe(-lost);
    expect(without.approval.min).toBeGreaterThan(preview.approval.min);

    // An order for more grain than the links left open carry is refused, as the trade panel
    // would refuse it, and one within it goes through.
    const capacity = tradeCapacity(game);
    const closed = capacity.links.filter((link) => link.closed !== null);
    expect(closed.length).toBeGreaterThan(0);
    const step = 1000;
    const room = Math.floor(capacity.free / step) * step;
    const order = (tonnes: number) => ({
      ...decisions,
      trade: [{ good: 'grain', direction: 'import', tonnes } as const],
    });
    expect(() => advanceQuarter(game, order(room + step))).toThrow(
      /no more than .* of grain can cross/,
    );
    if (room > 0) expect(() => advanceQuarter(game, order(room))).not.toThrow();
  });

  it('counts against the debt burden, which is judged on the revenue the quarter leaves', () => {
    const { states } = underDefended(name);
    const beginsAt = states.findIndex((state) =>
      state.borderIncidents.some((incident) => inForce(state, incident)),
    );
    const game = states[beginsAt];
    if (game === undefined) throw new Error('No incident began');
    const [largest] = loanOffers(game)
      .filter((offer) => offer.unavailable === null)
      .sort((a, b) => b.amount - a.amount);
    if (largest === undefined) throw new Error('Nothing is on offer');
    const { state: owing } = advanceQuarter(game, {
      ...steward(game, lean(game)),
      borrow: [{ kind: 'loan', amount: largest.amount, quarters: largest.quarters }],
    });
    expect(owing.borderIncidents.some((incident) => inForce(owing, incident))).toBe(true);
    // The loan is small beside a rich country's revenue, so the same debt is judged many
    // times over: the burden is heavier for the tax the incident costs.
    const heavy = (state: GameState): GameState => ({
      ...state,
      debts: state.debts.map((debt) => ({ ...debt, owed: debt.owed * 50 })),
    });
    expect(creditStatus(heavy(owing)).burden).toBeGreaterThan(
      creditStatus(heavy({ ...owing, borderIncidents: [] })).burden,
    );
    expect(owing.history.at(-1)?.debtBurden).toBe(creditStatus(owing).burden);
  });

  it('is kept through a save, announced and in force', () => {
    const { states, reports } = underDefended(name);
    for (const [index, game] of states.entries()) {
      if (game.borderIncidents.length === 0) continue;
      const report = reports[index - 1] ?? null;
      const restored = loadSave(JSON.parse(JSON.stringify(saveGame(game, report))));
      expect(restored.game.borderIncidents).toEqual(game.borderIncidents);
      expect(borderIncidentStatuses(restored.game)).toEqual(borderIncidentStatuses(game));
      expect(restored.report?.entries).toEqual(report?.entries);
    }
  });
});

describe.each(bothCountries)('the risks ahead of a border incident in %s', (name) => {
  /** The risks listed for a game played lean, about incidents on one neighbour's border. */
  const listed = (game: GameState, neighbourId: string) =>
    risksAhead(game, steward(game, lean(game))).filter(
      (risk) => risk.kind === 'borderIncident' && risk.neighbourId === neighbourId,
    );

  it('list the chance of one while a neighbour is hostile, with what it would cost', () => {
    const { states } = underDefended(name);
    const announcedAt = states.findIndex((state) => state.borderIncidents.length > 0);
    const before = states[announcedAt - 1];
    const [incident] = states[announcedAt]?.borderIncidents ?? [];
    if (before === undefined || incident === undefined) throw new Error('No incident came');
    const neighbour = before.country.map.neighbours.find(
      (each) => each.id === incident.neighbourId,
    );
    const [risk, ...others] = listed(before, incident.neighbourId);
    expect(others).toEqual([]);
    expect(risk).toMatchObject({
      headline: `Border incident with ${neighbour?.name ?? ''}`,
      likelihood: 'unlikely',
      // Announced as this quarter ends, it would begin once its notice has run.
      withinQuarters: rules.noticeQuarters + 2,
    });
    const percent = rules.chancePermillePerQuarter / 10;
    expect(risk?.reason).toContain(`${percent}% chance`);
    expect(risk?.reason).toContain('would carry nothing');
    expect(risk?.reason).toContain(`would produce ${100 - rules.outputPermille / 10}% less`);
    expect(risk?.reason).toMatch(/about \$\d+\.\dm a quarter in tax/);

    // No neighbour that is not hostile, and not on course to be, is listed.
    const calm = createGame(established(name), 7);
    expect(
      risksAhead(calm, steward(calm, defending(calm, budgetLimits.spending.max))).filter(
        (each) => each.kind === 'borderIncident',
      ),
    ).toEqual([]);
  });

  it('list one announced in every quarter until it begins, and then while it lasts', () => {
    const { states } = underDefended(name);
    const announcedAt = states.findIndex((state) => state.borderIncidents.length > 0);
    const [incident] = states[announcedAt]?.borderIncidents ?? [];
    if (incident === undefined) throw new Error('No incident came');
    const { neighbourId } = incident;
    const neighbour = states[0]?.country.map.neighbours.find((each) => each.id === neighbourId);
    const title = `Border incident with ${neighbour?.name ?? ''}`;

    for (let waited = 0; waited < rules.noticeQuarters; waited += 1) {
      const game = states[announcedAt + waited];
      if (game === undefined) throw new Error('The game ended first');
      const [risk, ...others] = listed(game, neighbourId);
      expect(others).toEqual([]);
      expect(risk).toMatchObject({
        headline: `${title} ahead`,
        withinQuarters: rules.noticeQuarters - waited + 1,
      });
      expect(risk?.reason).toContain('Announced: from Year');
      expect(risk?.reason).toContain('will carry nothing');
    }
    // In its last quarter of notice the look-ahead plays the very quarter that decides it.
    const last = states[announcedAt + rules.noticeQuarters - 1];
    if (last === undefined) throw new Error('The game ended first');
    expect(listed(last, neighbourId)[0]?.likelihood).toBe('almostCertain');

    for (let lasted = 0; lasted < rules.lastsQuarters; lasted += 1) {
      const game = states[announcedAt + rules.noticeQuarters + lasted];
      if (game === undefined) throw new Error('The game ended first');
      expect(listed(game, neighbourId)[0]).toMatchObject({
        headline: title,
        likelihood: 'almostCertain',
        withinQuarters: 1,
      });
    }
  });

  it('say an incident announced is on course to be called off once Defence is raised', () => {
    const { states } = underDefended(name);
    const game = states.find((state) => state.borderIncidents.length > 0);
    const [incident] = game?.borderIncidents ?? [];
    if (game === undefined || incident === undefined) throw new Error('No incident came');
    const raised = steward(game, defending(game, budgetLimits.spending.max));
    const [risk] = risksAhead(game, raised).filter(
      (each) => each.kind === 'borderIncident' && each.neighbourId === incident.neighbourId,
    );
    expect(risk?.likelihood).toBe('remote');
    expect(risk?.reason).toContain('it is on course to be called off');
  });
});

describe('a saved border incident', () => {
  const saved = () => {
    const { states } = underDefended('Tavara');
    const game = states.find((state) => state.borderIncidents.length > 0);
    if (game === undefined) throw new Error('No incident came');
    return JSON.parse(JSON.stringify(saveGame(game, null))) as {
      state: { borderIncidents: { neighbourId: string }[] };
    };
  };

  it('must be on the border of one of the country’s neighbours', () => {
    const save = saved();
    const [incident] = save.state.borderIncidents;
    if (incident !== undefined) incident.neighbourId = 'atlantis';
    expect(() => loadSave(save)).toThrow(SaveError);
    expect(() => loadSave(save)).toThrow(/state\.borderIncidents\[0\]\.neighbourId/);
  });

  it('must be the only one on its neighbour’s border', () => {
    const save = saved();
    const [incident] = save.state.borderIncidents;
    if (incident !== undefined) save.state.borderIncidents.push({ ...incident });
    expect(() => loadSave(save)).toThrow(/two incidents on one neighbour’s border/);
  });
});
