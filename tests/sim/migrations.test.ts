import { describe, expect, it } from 'vitest';
import {
  advanceQuarter,
  approvalStatus,
  austerityStatus,
  debtStatus,
  electionStatus,
  knownTechnologies,
  loadCountry,
  loadSave,
  pendingDilemma,
  priceStatus,
  siteOf,
  siteStatus,
  termRecords,
  victoryStatus,
  type TurnReport,
} from '../../src/sim';
import format1Save from '../saves/format-1.json';
import format2Save from '../saves/format-2.json';
import format3Save from '../saves/format-3.json';
import format4Save from '../saves/format-4.json';
import format5Save from '../saves/format-5.json';
import format6Save from '../saves/format-6.json';
import format7Save from '../saves/format-7.json';
import format8Save from '../saves/format-8.json';
import format9Save from '../saves/format-9.json';
import format10Save from '../saves/format-10.json';
import format11Save from '../saves/format-11.json';
import { withValue } from './files';
import { answering, inFirstTerm, steward } from './playing';
import { budgetFrom, budgetOf } from '../budgets';

// The saves kept from every format before the current one, each lifted by the migrations to
// the current format. The save kept from the current format is checked in save.test.ts.

describe('the save kept from save format 1', () => {
  it('still opens on the game it was written from', () => {
    const { game, report } = loadSave(format1Save);

    expect(game.country.name).toBe('Republic of Tavara');
    expect(game.seed).toBe(2026);
    expect(game.rng).toBe(1007908578);
    expect(game.date).toEqual({ year: 1, quarter: 4 });
    expect(game.treasury).toBe(30);
    expect(game.foodReserve).toBe(144803);
    expect(game.agricultureSpentThisYear).toBe(330);
    expect(game.reliefRegionId).toBe('dry-east');
    expect(game.budget.taxRatePercent).toBe(18);
    expect(game.regions.map((region) => [region.id, region.approval, region.weather])).toEqual([
      ['korr-highlands', 458, 73],
      ['salt-coast', 458, 13],
      ['lowmere-plains', 458, -29],
      // Refusing the emergency works cost 5.0 points there, and a tenth of that has faded.
      ['dry-east', 413, 17],
      ['south-delta', 458, -13],
      ['arden-vale', 458, 2],
    ]);
    expect(game.events).toEqual([
      { type: 'drought', regionId: 'dry-east', began: { year: 1, quarter: 2 } },
    ]);
    expect(game.projects.map((project) => [siteOf(project), project.status])).toEqual([
      ['lowmere-store', 'operating'],
      ['lowmere-road', 'operating'],
      ['lowmere-irrigation', 'building'],
    ]);
    expect(siteStatus(game, 'lowmere-irrigation')).toMatchObject({ quartersPaid: 2 });
    expect(game.history.map((signs) => signs.treasury)).toEqual([420, 307, 154, 30]);
    // The Dry East's 600,000 of the country's 5,200,000 people, 5.0 and then 4.5 points down.
    expect(game.history.map((signs) => signs.approval)).toEqual([458, 458, 452, 452]);
    expect(game.dilemmasAnswered.map((answered) => answered.type)).toEqual([
      'emergencyWorks',
      'grainOffer',
    ]);
    expect(pendingDilemma(game)).toMatchObject({
      type: 'teachersPay',
      title: 'Teachers demand a pay rise',
    });
    expect(game.outcome).toEqual({ status: 'playing' });
    expect(report?.date).toEqual({ year: 1, quarter: 3 });
    expect(report?.treasury.change).toBe(-124);
    expect(report?.entries.map((entry) => entry.headline)).toContain('The treasury is shrinking');
  });

  it('can be played on from there through the first election', () => {
    let { game } = loadSave(format1Save);

    while (inFirstTerm(game)) game = advanceQuarter(game, answering(game, steward(game))).state;

    // It ended, or the government was re-elected and governs on into its second term.
    expect(game.outcome.status !== 'playing' || electionStatus(game).term === 2).toBe(true);
    expect(game.history.length).toBeGreaterThan(4);
  });

  it('is lifted to format 3 still being played, with no quarters yet held in the top tier', () => {
    const { game, report } = loadSave(format1Save);

    expect(game.prosperousQuarters).toBe(0);
    expect(game.outcome).toEqual({ status: 'playing' });
    expect(report?.election).toBeNull();
  });

  it('is lifted to format 2 with health and education where its budget held them', () => {
    const { game, report } = loadSave(format1Save);

    // Health 0.7 and education 0.6 Money units for 5.2 million people.
    expect(game.regions.map((region) => [region.health, region.education])).toEqual(
      game.regions.map(() => [148, 126]),
    );
    // It is put in the tier its prosperity reaches, with the grain store and farm road in use
    // in Lowmere, and counts as having begun there, so nobody expects more of it.
    expect(game.tier).toBe('subsistence');
    expect(game.startingTier).toBe('subsistence');
    expect(approvalStatus(game).causes.map((cause) => cause.label)).not.toContain('Expectations');
    // Nothing recorded before format 2 measured prosperity.
    expect(game.history.map((signs) => signs.prosperity)).toEqual([null, null, null, null]);
    expect(report?.prosperity).toBeNull();
  });

  it('measures prosperity from the quarter it is played on', () => {
    const { game } = loadSave(format1Save);

    const next = advanceQuarter(game, answering(game, steward(game)));

    expect(next.state.history.at(-1)?.prosperity).toEqual(expect.any(Number));
    expect(next.report.prosperity?.value).toBe(next.state.history.at(-1)?.prosperity);
  });
});

describe('the save kept from save format 2', () => {
  it('still opens on the game it was written from, prosperity, tiers and growth and all', () => {
    const { game, report } = loadSave(format2Save);

    expect(game.date).toEqual({ year: 1, quarter: 4 });
    expect(game.treasury).toBe(10);
    // Three quarters of growth at 0.6% each, region by region.
    expect(game.regions.map((region) => region.population)).toEqual([
      509054, 814485, 1425351, 610864, 1018108, 916296,
    ]);
    expect(game.regions.map((region) => [region.health, region.education])).toEqual(
      game.regions.map(() => [game.regions[0]?.health, game.regions[0]?.education]),
    );
    expect(game.history.map((signs) => signs.prosperity)).toEqual([237, 237, 243, 251]);
    // It passed into Developing as the farm road came into use, and people expect more.
    expect(game.tier).toBe('developing');
    expect(game.startingTier).toBe('subsistence');
    expect(approvalStatus(game).causes).toContainEqual({ label: 'Expectations', amount: -30 });
    expect(game.regions.map((region) => region.unrest)).toContain('strikes');
    expect(report?.prosperity?.value).toBe(251);
    expect(report?.population?.contributions.map((line) => line.label)).toContain(
      'Growth in Lowmere Plains',
    );
    expect(report?.entries.map((entry) => entry.headline)).toContain(
      'Prosperity has reached a new tier: Developing',
    );
  });

  it('can be played on from there through the first election', () => {
    let { game } = loadSave(format2Save);

    while (inFirstTerm(game)) game = advanceQuarter(game, answering(game, steward(game))).state;

    expect(game.outcome.status !== 'playing' || electionStatus(game).term === 2).toBe(true);
  });

  it('is lifted to format 3 with no quarters yet held in the top tier, and no vote reported', () => {
    const { game, report } = loadSave(format2Save);

    expect(game.prosperousQuarters).toBe(0);
    expect(game.outcome).toEqual({ status: 'playing' });
    expect(report?.election).toBeNull();
  });

  it('plays on into its second term when format 2 ended it with a won election', () => {
    // Format 2 ended the game at a won election. Format 3 does not, so the game reopens in
    // the quarter after the vote, still being played, and its report keeps the result.
    const won = {
      status: 'won',
      cause: 'election',
      voteShare: 523,
      needed: 500,
      headline: 'You won the election',
      summary: 'You took 52.3% of the vote and needed 50%.',
    };
    const ended = withValue(
      withValue(format2Save, ['state', 'date'], { year: 6, quarter: 1 }),
      ['state', 'outcome'],
      won,
    );

    const { game, report } = loadSave(ended);

    expect(game.outcome).toEqual({ status: 'playing' });
    expect(electionStatus(game)).toMatchObject({ term: 2, date: { year: 10, quarter: 4 } });
    expect(report?.election).toEqual({ voteShare: 523, needed: 500, won: true });
    expect(() => advanceQuarter(game, answering(game, steward(game)))).not.toThrow();
  });

  it('still ends the game where format 2 ended it with a lost election', () => {
    const lost = {
      status: 'lost',
      cause: 'election',
      voteShare: 470,
      needed: 500,
      headline: 'You lost the election',
      summary: 'You took 47.0% of the vote and needed 50%.',
    };

    const { game, report } = loadSave(withValue(format2Save, ['state', 'outcome'], lost));

    expect(game.outcome).toEqual(lost);
    expect(report?.election).toEqual({ voteShare: 470, needed: 500, won: false });
  });
});

describe('the save kept from save format 3', () => {
  it('still opens on the game it was written from, in its second term and Prosperous', () => {
    const { game, report } = loadSave(format3Save);

    expect(game.date).toEqual({ year: 7, quarter: 4 });
    expect(electionStatus(game)).toMatchObject({ term: 2, quartersAway: 12 });
    expect(game.tier).toBe('prosperous');
    expect(victoryStatus(game)).toMatchObject({ tier: 'prosperous', held: 2, needed: 4 });
    expect(game.outcome).toEqual({ status: 'playing' });
    expect(game.history.map((signs) => signs.prosperity).slice(-3)).toEqual([696, 701, 704]);
    expect(
      termRecords(game).map((record) => [record.term, record.quarters, record.ending]),
    ).toEqual([
      [1, 20, 'reelected'],
      [2, 7, 'inOffice'],
    ]);
    expect(report?.date).toEqual({ year: 7, quarter: 3 });
    expect(report?.election).toBeNull();
  });

  it('is won on prosperity two quarters on, if the top tier is held', () => {
    let { game } = loadSave(format3Save);
    const generous = (state: typeof game) => ({
      budget: budgetFrom(state.budget, {
        taxRatePercent: 10,
        spending: { health: 200, education: 200 },
      }),
    });

    game = advanceQuarter(game, answering(game, generous(game))).state;
    expect(victoryStatus(game).held).toBe(3);
    expect(game.outcome.status).toBe('playing');
    game = advanceQuarter(game, answering(game, generous(game))).state;

    expect(game.outcome).toMatchObject({ status: 'won', cause: 'prosperity' });
  });

  it('is lifted to format 4 with upkeep enough for every site, so nothing decays', () => {
    let { game } = loadSave(format3Save);
    const sites = game.country.sites.map((site) => siteStatus(game, site.id));
    const needed = sites.reduce((total, status) => total + status.upkeep, 0);

    // Every site's upkeep, $2.1m, brought up to the next step of the budget.
    expect(needed).toBe(21);
    expect(game.budget.spending.upkeep).toBe(30);
    expect(game.budget.spending).toMatchObject({ health: 200, education: 200 });
    for (let quarter = 0; quarter < 2; quarter += 1) {
      game = advanceQuarter(game, answering(game, { budget: game.budget })).state;
    }
    expect(game.projects.map((project) => project.status)).toEqual(['operating', 'operating']);
  });
});

describe('the save kept from save format 4', () => {
  it('still opens on the game it was written from, with the farm road decaying', () => {
    const { game, report } = loadSave(format4Save);

    expect(game.date).toEqual({ year: 2, quarter: 1 });
    expect(game.budget.spending.upkeep).toBe(10);
    expect(
      ['lowmere-irrigation', 'dustwell-irrigation', 'lowmere-road'].map(
        (siteId) => siteStatus(game, siteId).state,
      ),
    ).toEqual(['operating', 'operating', 'decaying']);
    expect(report?.entries.filter((entry) => entry.kind === 'siteDecaying')).toEqual([
      expect.objectContaining({ headline: 'Decaying: Farm road, Arden to Lowmere' }),
    ]);
  });

  it('restores the farm road once its upkeep is paid again', () => {
    let { game } = loadSave(format4Save);

    const result = advanceQuarter(
      game,
      answering(game, {
        ...steward(game),
        budget: budgetFrom(game.budget, { spending: { upkeep: 20 } }),
      }),
    );
    game = result.state;

    expect(siteStatus(game, 'lowmere-road').state).toBe('operating');
    expect(result.report.entries.map((entry) => entry.headline)).toContain(
      'Restored: Farm road, Arden to Lowmere',
    );
  });

  it('is lifted to format 5 owing nothing, with nothing owed in the quarters recorded', () => {
    const { game, report } = loadSave(format4Save);

    expect(game.debts).toEqual([]);
    expect(game.history.every((signs) => signs.debt === 0 && signs.debtBurden === 0)).toBe(true);
    expect(report?.debt).toBeNull();
  });

  it('is lifted to format 5 with the payment record of a new game, rated A', () => {
    const { game, report } = loadSave(format4Save);

    expect(game.credit).toEqual({ rating: 'a', record: 700, deficit: 0 });
    expect(report?.credit).toBeNull();
  });
});

describe('the save kept from save format 5', () => {
  it('still opens on the game it was written from, owing on a loan and a bond', () => {
    const { game, report } = loadSave(format5Save);

    expect(game.date).toEqual({ year: 3, quarter: 2 });
    expect(
      game.debts.map((debt) => [
        debt.kind,
        debt.number,
        debt.borrowed,
        debt.owed,
        debt.quartersLeft,
        debt.schedule,
      ]),
    ).toEqual([
      ['loan', 1, 100, 100, 4, 'level'],
      ['bond', 2, 200, 200, 8, 'atMaturity'],
    ]);
    expect(debtStatus(game).debt).toBe(300);
    expect(report?.debt).toMatchObject({ value: 300, change: 273 });
  });

  it('plays on to repay the loan on schedule, and the bond at its maturity', () => {
    let { game } = loadSave(format5Save);

    for (let quarter = 0; quarter < 8; quarter += 1) {
      game = advanceQuarter(game, answering(game, steward(game))).state;
    }

    expect(game.debts).toEqual([]);
    expect(game.history.at(-1)?.debt).toBe(0);
  });

  it('refuses a debt repaid on a schedule there is not', () => {
    const damaged = withValue(format5Save, ['state', 'debts', 1, 'schedule'], 'whenever');

    expect(() => loadSave(damaged)).toThrow(/state\.debts\[1\]\.schedule/);
  });

  it('is lifted to format 6 not in austerity', () => {
    const { game } = loadSave(format5Save);

    expect(game.austerity).toBeNull();
  });
});

describe('the save kept from save format 6', () => {
  it('still opens on the game it was written from, in austerity after a bailout', () => {
    const { game, report } = loadSave(format6Save);

    expect(game.date).toEqual({ year: 2, quarter: 1 });
    expect(game.austerity).toEqual({ quartersLeft: 7 });
    expect(austerityStatus(game)).toMatchObject({ lastQuarter: { year: 3, quarter: 3 } });
    expect(game.credit).toMatchObject({ rating: 'b', record: 25 });
    expect(
      game.debts.map((debt) => [debt.kind, debt.borrowed, debt.owed, debt.quartersLeft]),
    ).toEqual([['bailout', 296, 279, 15]]);
    expect(game.budget.taxRatePercent).toBe(25);
    expect(game.projects.map((project) => [siteOf(project), project.status])).toEqual([
      ['lowmere-irrigation', 'building'],
    ]);
    expect(report?.entries.map((entry) => entry.kind)).toContain('projectStarted');
  });

  it('plays on through austerity to its end, building carrying on', () => {
    let { game } = loadSave(format6Save);
    const reports: TurnReport[] = [];

    for (let quarter = 0; quarter < 7; quarter += 1) {
      const result = advanceQuarter(game, answering(game, steward(game)));
      reports.push(result.report);
      game = result.state;
    }

    expect(game.outcome).toEqual({ status: 'playing' });
    expect(game.austerity).toBeNull();
    expect(reports.at(-1)?.entries.map((entry) => entry.headline)).toContain('Austerity ends');
    expect(siteStatus(game, 'lowmere-irrigation').state).toBe('operating');
  });

  it('refuses austerity with no quarter left of it', () => {
    const damaged = withValue(format6Save, ['state', 'austerity', 'quartersLeft'], 0);

    expect(() => loadSave(damaged)).toThrow(/state\.austerity\.quartersLeft/);
  });

  it('is lifted with each world price at its usual level', () => {
    const { game } = loadSave(format6Save);

    expect(game.worldPrices).toEqual({ grain: [240], ore: [100] });
  });
});

describe('the save kept from save format 7', () => {
  it('still opens on the game it was written from, with grain bought abroad', () => {
    const { game, report } = loadSave(format7Save);

    expect(game.date).toEqual({ year: 1, quarter: 4 });
    expect(game.worldPrices.grain).toEqual([240, 223, 209, 247]);
    expect(report?.food.contributions).toContainEqual({ label: 'Grain imported', amount: 20_000 });
    expect(report?.treasury.contributions).toContainEqual({ label: 'Grain imported', amount: -42 });
    expect(report?.entries.map((entry) => entry.headline)).toContain('Grain imported');
  });

  it('plays on, its world price moving on from where it was and grain bought at it', () => {
    const { game } = loadSave(format7Save);
    const decisions = {
      ...answering(game, steward(game)),
      trade: [{ good: 'grain', direction: 'import', tonnes: 10_000 }] as const,
    };

    const { state, report } = advanceQuarter(game, decisions);

    expect(state.worldPrices.grain.slice(0, 4)).toEqual([240, 223, 209, 247]);
    expect(state.worldPrices.grain).toHaveLength(5);
    // 10,000 tonnes at $247 a tonne is $2.5m.
    expect(report.treasury.contributions).toContainEqual({ label: 'Grain imported', amount: -25 });
  });

  it('refuses a world price that is not a whole number of dollars', () => {
    const damaged = withValue(format7Save, ['state', 'worldPrices', 'grain', 1], 22.5);

    expect(() => loadSave(damaged)).toThrow(/state\.worldPrices\.grain\[1\]/);
  });

  it('refuses a good with no price', () => {
    const damaged = withValue(format7Save, ['state', 'worldPrices', 'grain'], []);

    expect(() => loadSave(damaged)).toThrow(/state\.worldPrices\.grain/);
  });

  it('is lifted to format 8 with the world ore price at its usual level, as the game opens', () => {
    const { game } = loadSave(format7Save);

    expect(game.worldPrices).toEqual({ grain: [240, 223, 209, 247], ore: [100] });
  });
});

describe('the save kept from save format 8', () => {
  it('still opens on the game it was written from, with the ore price moving beside grain', () => {
    const { game, report } = loadSave(format8Save);

    expect(game.date).toEqual({ year: 1, quarter: 4 });
    expect(game.worldPrices).toEqual({ grain: [240, 223, 209, 247], ore: [100, 107, 96, 99] });
    expect(game.projects.map((project) => [siteOf(project), project.status])).toEqual([
      ['korr-mine', 'building'],
    ]);
    expect(report?.food.contributions).toContainEqual({ label: 'Grain imported', amount: 20_000 });
  });

  it('plays on, each world price moving on from where it was', () => {
    const { game } = loadSave(format8Save);

    const { state } = advanceQuarter(game, answering(game, steward(game)));

    expect(state.worldPrices.grain.slice(0, 4)).toEqual([240, 223, 209, 247]);
    expect(state.worldPrices.ore.slice(0, 4)).toEqual([100, 107, 96, 99]);
    expect(state.worldPrices.ore).toHaveLength(5);
  });

  it('refuses an ore price that is not a whole number of dollars', () => {
    const damaged = withValue(format8Save, ['state', 'worldPrices', 'ore', 1], 10.5);

    expect(() => loadSave(damaged)).toThrow(/state\.worldPrices\.ore\[1\]/);
  });

  it('refuses a save with no ore price', () => {
    const damaged = withValue(format8Save, ['state', 'worldPrices', 'ore'], []);

    expect(() => loadSave(damaged)).toThrow(/state\.worldPrices\.ore/);
  });

  it('is lifted to format 9 with no world price shock announced', () => {
    const { game } = loadSave(format8Save);

    expect(game.priceShocks).toEqual([]);
  });

  it('is lifted to format 9 having carried nothing by its trade links, which it did not keep', () => {
    const { game } = loadSave(format8Save);

    expect(game.tradeCarried).toEqual([]);
  });
});

describe('the save kept from save format 9', () => {
  it('still opens on the game it was written from, with two world price shocks announced', () => {
    const { game, report } = loadSave(format9Save);

    expect(game.date).toEqual({ year: 1, quarter: 3 });
    expect(game.priceShocks).toEqual([
      {
        type: 'failedHarvestsAbroad',
        announced: { year: 1, quarter: 2 },
        begins: { year: 1, quarter: 4 },
      },
      { type: 'oreGlut', announced: { year: 1, quarter: 2 }, begins: { year: 1, quarter: 4 } },
    ]);
    expect(report?.food.contributions).toContainEqual({ label: 'Grain imported', amount: 20_000 });
  });

  it('plays on, each shock moving its price as it begins', () => {
    const { game } = loadSave(format9Save);

    const { state, report } = advanceQuarter(game, answering(game, steward(game)));

    expect(priceStatus(state, 'grain').figure?.contributions).toContainEqual({
      label: 'Failed harvests abroad',
      amount: 36,
    });
    expect(priceStatus(state, 'ore').figure?.contributions).toContainEqual({
      label: 'Ore glut',
      amount: -20,
    });
    expect(report.entries.map((entry) => entry.headline)).toContain(
      'Ore glut pushes the world ore price down',
    );
  });

  it('remembers what each trade link carried in the quarter before it was saved', () => {
    const { game } = loadSave(format9Save);

    // The 20,000 t bought in its second quarter crossed the border at Korr Pass.
    expect(game.tradeCarried).toEqual([{ routeId: 'korr-pass', ore: 0, grain: 20_000 }]);
  });

  it('refuses what was carried by a link the country does not have, or one listed twice', () => {
    const unknown = withValue(format9Save, ['state', 'tradeCarried', 0, 'routeId'], 'nowhere');
    const doubled = withValue(
      format9Save,
      ['state', 'tradeCarried'],
      [
        { routeId: 'korr-pass', ore: 0, grain: 1000 },
        { routeId: 'korr-pass', ore: 0, grain: 1000 },
      ],
    );
    const negative = withValue(format9Save, ['state', 'tradeCarried', 0, 'grain'], -1000);

    expect(() => loadSave(unknown)).toThrow(/state\.tradeCarried\[0\]\.routeId/);
    expect(() => loadSave(doubled)).toThrow(/state\.tradeCarried lists one trade link twice/);
    expect(() => loadSave(negative)).toThrow(/state\.tradeCarried\[0\]\.grain/);
  });

  it('refuses a shock the game does not have, or two of one kind', () => {
    const unknown = withValue(format9Save, ['state', 'priceShocks', 0, 'type'], 'locusts');
    const twice = withValue(format9Save, ['state', 'priceShocks', 1, 'type'], 'oreGlut');
    const doubled = withValue(twice, ['state', 'priceShocks', 0, 'type'], 'oreGlut');

    expect(() => loadSave(unknown)).toThrow(/state\.priceShocks\[0\]\.type/);
    expect(() => loadSave(doubled)).toThrow(/state\.priceShocks holds two shocks of one kind/);
  });

  it('is lifted to format 10 with each project naming the site it is on', () => {
    const { game } = loadSave(format9Save);

    expect(game.projects.map((project) => project.target)).toEqual([
      { kind: 'site', siteId: 'korr-mine' },
    ]);
  });
});

describe('the save kept from save format 10', () => {
  it('still opens on the game it was written from, a site in use and decaying and another paused', () => {
    const { game, report } = loadSave(format10Save);

    expect(game.date).toEqual({ year: 1, quarter: 4 });
    expect(game.projects.map((project) => [project.target, project.status])).toEqual([
      [{ kind: 'site', siteId: 'lowmere-store' }, 'decaying'],
      [{ kind: 'site', siteId: 'lowmere-irrigation' }, 'paused'],
    ]);
    expect(report?.entries.map((entry) => entry.headline)).toContain('Paused: Lowmere irrigation');
  });

  it('plays on, building where it left off once the treasury can pay', () => {
    const { game } = loadSave(format10Save);

    const decisions = answering(
      game,
      // Every tax the country can bear and nothing spent but upkeep, so the treasury grows.
      steward(game, budgetOf({ taxRatePercent: 40, spending: { upkeep: 200 } })),
    );
    const { state, report } = advanceQuarter(game, decisions);

    expect(state.projects.map((project) => [project.quartersPaid, project.status])).toEqual([
      [2, 'operating'],
      [2, 'building'],
    ]);
    expect(report.entries.map((entry) => entry.headline)).toContain(
      'Building resumes: Lowmere irrigation',
    );
  });

  it('is lifted to format 11 as it was, knowing no technology', () => {
    const { game } = loadSave(format10Save);

    expect(game.projects.every((project) => project.target.kind === 'site')).toBe(true);
    expect(game.projects.map((project) => project.status)).toEqual(['decaying', 'paused']);
  });
});

describe('the save kept from save format 11', () => {
  it('still opens on the game it was written from, a site in use and research under way', () => {
    const { game } = loadSave(format11Save);

    expect(game.date).toEqual({ year: 1, quarter: 4 });
    expect(
      game.projects.map((project) => [project.target, project.status, project.quartersPaid]),
    ).toEqual([
      [{ kind: 'site', siteId: 'lowmere-store' }, 'operating', 2],
      [{ kind: 'technology', technology: 'droughtResistantSeed' }, 'building', 3],
    ]);
    expect(knownTechnologies(game.projects)).toEqual([]);
  });

  it('plays on, the research finishing and the seed known from the next quarter', () => {
    const { game } = loadSave(format11Save);

    const { state, report } = advanceQuarter(game, answering(game, steward(game)));

    expect(report.entries.map((entry) => entry.headline)).toContain(
      'Research finished: Drought-resistant seed',
    );
    expect(state.projects[1]).toMatchObject({ status: 'known', opened: state.date });
    expect(knownTechnologies(state.projects)).toEqual(['droughtResistantSeed']);
  });

  it('is lifted to format 12 as it was, having surveyed nothing and found no deposit', () => {
    const { game } = loadSave(format11Save);

    expect(game.projects.some((project) => project.target.kind === 'survey')).toBe(false);
    expect(game.country.sites).toEqual(loadCountry(game.country.source).sites);
  });
});
