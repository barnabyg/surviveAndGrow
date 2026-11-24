import { describe, expect, it } from 'vitest';
import tavaraFile from '../../src/countries/tavara.json';
import {
  advanceQuarter,
  approvalStatus,
  armyLoyaltyStatus,
  ARMY_STAGE_NAMES,
  balance,
  budgetLimits,
  CIVIL_FACTIONS,
  COUNTRY_FORMAT_VERSION,
  createGame,
  FACTION_NAMES,
  FACTIONS,
  factionsStatus,
  loadCountry,
  loadSave,
  previewQuarter,
  regionFactions,
  saveGame,
  type Budget,
  type CivilFaction,
  type Country,
  type GameState,
  type TurnReport,
} from '../../src/sim';
import testlandFile from '../countries/testland.json';
import { budgetFrom, budgetOf } from '../budgets';
import { beforeFactions, bothCountries, withChances, withDroughtChance } from './countries';
import { faultsOf, withValue, without } from './files';
import { steward } from './playing';

/** The two country files as written, by the names the scenarios run under. */
const FILES = { Tavara: tavaraFile, Testland: testlandFile } as const;
const fileOf = (name: string): unknown => FILES[name as keyof typeof FILES];

/**
 * A country in which nothing is left to chance: no drought, flood, dilemma, shock or growth.
 * Its regions keep their faction mixes.
 */
const quiet = (name: string): Country => withChances(fileOf(name), { factions: true });

/** Plays quarters on one budget, keeping each state and report, the opening state first. */
function play(
  start: GameState,
  quarters: number,
  budget: Budget,
): { states: GameState[]; reports: TurnReport[] } {
  const states = [start];
  const reports: TurnReport[] = [];
  let game = start;
  for (let quarter = 0; quarter < quarters && game.outcome.status === 'playing'; quarter += 1) {
    const result = advanceQuarter(game, steward(game, budget));
    game = result.state;
    states.push(game);
    reports.push(result.report);
  }
  return { states, reports };
}

/** Each civil faction's standing, in the factions' order. */
const standingsOf = (game: GameState): number[] =>
  factionsStatus(game)
    .standings.filter((each) => each.faction !== 'army')
    .map((each) => each.standing);

/** One faction's standing. */
const standingOf = (game: GameState, faction: CivilFaction): number =>
  game.factions[faction].standing;

/** A region's approval. */
const approvalIn = (game: GameState, regionId: string): number =>
  game.regions.find((region) => region.id === regionId)?.approval ?? Number.NaN;

/** The region where a faction has the largest share of the people. */
const strongholdOf = (game: GameState, faction: CivilFaction): string =>
  [...game.regions].sort(
    (a, b) =>
      regionFactions(game, b.id).shares[faction] - regionFactions(game, a.id).shares[faction],
  )[0]?.id ?? '';

/** The game's starting budget with more spent on agriculture. */
const favouringFarmers = (game: GameState, more: number): Budget =>
  budgetFrom(game.budget, { spending: { agriculture: game.budget.spending.agriculture + more } });

/** What a budget that favours farmers adds to agriculture: half as much again, or the least step. */
const MORE_FOR_FARMS = { Tavara: 50, Testland: 10 } as const;

describe('the factions', () => {
  it('are the engine’s own: farmers, workers and business among the people, and the army', () => {
    expect(FACTIONS).toEqual(['farmers', 'workers', 'business', 'army']);
    expect(CIVIL_FACTIONS).toEqual(['farmers', 'workers', 'business']);
    expect(FACTIONS.map((faction) => FACTION_NAMES[faction])).toEqual([
      'Farmers',
      'Workers',
      'Business',
      'Army',
    ]);
  });
});

describe.each(bothCountries)('the factions in %s', (name) => {
  it('open where the starting budget settles them, so the first quarters move none', () => {
    const start = createGame(quiet(name), 7);
    const status = factionsStatus(start);

    expect(status.standings.map((each) => each.faction)).toEqual([...CIVIL_FACTIONS, 'army']);
    for (const each of status.standings) expect(each.settles).toBe(each.standing);

    const { states, reports } = play(start, 4, start.country.start.budget);
    for (const state of states) expect(standingsOf(state)).toEqual(standingsOf(start));
    for (const report of reports) {
      for (const faction of CIVIL_FACTIONS) expect(report.standings?.[faction].change).toBe(0);
    }
    // So the game does not begin with a jolt to approval either.
    expect(states.map((state) => approvalStatus(state).approval)).toEqual(
      states.map(() => approvalStatus(start).approval),
    );
  });

  it('open near neutral, so the Factions effect on each region’s approval starts small', () => {
    const start = createGame(loadCountry(fileOf(name)), 7);

    for (const region of start.regions) {
      // No more than a point and a half of approval either way, in any region.
      expect(Math.abs(regionFactions(start, region.id).effect)).toBeLessThanOrEqual(15);
    }
    for (const each of factionsStatus(start).standings) {
      if (each.faction !== 'army') expect(each.word).toBe('Content');
    }
  });

  it('show the army’s standing as national army loyalty, with its stage for a word', () => {
    const start = createGame(quiet(name), 7);
    const army = factionsStatus(start).standings.find((each) => each.faction === 'army');
    const loyalty = armyLoyaltyStatus(start);

    expect(army).toMatchObject({
      name: 'Army',
      standing: loyalty.loyalty,
      stage: loyalty.stage,
      mood: null,
      word: ARMY_STAGE_NAMES[loyalty.stage],
      settles: loyalty.settles,
    });
    // The army has no share of any region's people.
    for (const region of start.regions) {
      expect(Object.keys(regionFactions(start, region.id).shares)).toEqual([...CIVIL_FACTIONS]);
    }
  });

  it('move a share of the way each quarter towards where their levers settle them', () => {
    const start = createGame(quiet(name), 7);
    const budget = favouringFarmers(start, MORE_FOR_FARMS[name as keyof typeof MORE_FOR_FARMS]);
    const settles = factionsStatus(start, budget).standings.find(
      (each) => each.faction === 'farmers',
    )?.settles;
    if (settles === undefined) throw new Error('The farmers have no standing');
    expect(settles).toBeGreaterThan(standingOf(start, 'farmers'));

    const { states } = play(start, 2, budget);
    const [, first, second] = states.map((state) => standingOf(state, 'farmers'));
    const { adjustPermillePerQuarter } = balance.factions;
    // A fifth of the gap in the first quarter, and a fifth of what is left in the second.
    expect(adjustPermillePerQuarter).toBe(200);
    const gap = settles - standingOf(start, 'farmers');
    expect(first).toBe(standingOf(start, 'farmers') + Math.ceil(gap / 5));
    expect(second).toBeGreaterThan(first ?? 0);
    expect(second).toBeLessThan(settles);
  });

  it('cannot all be settled at their best by any budget the sliders allow', () => {
    const start = createGame(quiet(name), 7);
    const { spending, taxRatePercent } = budgetLimits;
    const amounts = Array.from(
      { length: (spending.max - spending.min) / spending.step + 1 },
      (_, index) => spending.min + index * spending.step,
    );
    const atBest = (budget: Budget) =>
      Object.fromEntries(
        factionsStatus(start, budget).standings.map((each) => [
          each.faction,
          each.settles === each.best,
        ]),
      ) as Record<CivilFaction | 'army', boolean>;

    // Farmers and workers each judge their share of what the budget spends. Every way the
    // sliders can split spending between agriculture, health and education is tried, with
    // nothing spent elsewhere, which would only take from both shares, and the tax at its
    // lowest, which is where workers and business like it best.
    const reached = { farmers: 0, workers: 0 };
    for (const agriculture of amounts) {
      for (const health of amounts) {
        for (const education of amounts) {
          const best = atBest(
            budgetOf({
              taxRatePercent: taxRatePercent.min,
              spending: { agriculture, health, education },
              elsewhere: 0,
            }),
          );
          expect(best.farmers && best.workers).toBe(false);
          if (best.farmers) reached.farmers += 1;
          if (best.workers) reached.workers += 1;
        }
      }
    }
    // Each can be settled at its best alone, so it is the two together that no budget reaches.
    expect(reached.farmers).toBeGreaterThan(0);
    expect(reached.workers).toBeGreaterThan(0);

    // Spending elsewhere and another tax rate change neither: at the least, the middle and
    // the most of every slider and of the tax rate, still no budget settles the two at their
    // best. So none settles all three, whatever business makes of it. Business is left out of
    // the check because it could not fail it here: one of its levers is the large sites in
    // use, and a game opens with none.
    const coarse = [spending.min, spending.max / 2, spending.max];
    const areas = Object.keys(start.budget.spending) as (keyof Budget['spending'])[];
    const both = (index: number, chosen: Partial<Budget['spending']>): boolean =>
      index === areas.length
        ? [taxRatePercent.min, 18, taxRatePercent.max].some((rate) => {
            const best = atBest(budgetOf({ taxRatePercent: rate, spending: chosen }));
            return best.farmers && best.workers;
          })
        : coarse.some((amount) => both(index + 1, { ...chosen, [areas[index] ?? '']: amount }));
    expect(both(0, {})).toBe(false);
    expect(atBest(start.budget).business).toBe(false);
  });

  it('set a budget that favours farmers against the starting budget: approval rises in a farming region and falls where business is strongest', () => {
    const start = createGame(quiet(name), 7);
    const farming = strongholdOf(start, 'farmers');
    const trading = strongholdOf(start, 'business');
    expect(farming).not.toBe(trading);

    const more = MORE_FOR_FARMS[name as keyof typeof MORE_FOR_FARMS];
    const kept = play(start, 3, start.budget).states.at(-1) ?? start;
    const favoured = play(start, 3, favouringFarmers(start, more)).states.at(-1) ?? start;

    // The farmers take a larger share of what is spent; the workers' share is smaller for it,
    // and business sees the same tax paying for a deeper deficit.
    expect(standingOf(favoured, 'farmers')).toBeGreaterThan(standingOf(kept, 'farmers'));
    expect(standingOf(favoured, 'workers')).toBeLessThan(standingOf(kept, 'workers'));
    expect(standingOf(favoured, 'business')).toBeLessThan(standingOf(kept, 'business'));

    expect(approvalIn(favoured, farming)).toBeGreaterThan(approvalIn(kept, farming));
    expect(approvalIn(favoured, trading)).toBeLessThan(approvalIn(kept, trading));
    // Nothing but the factions tells the two games apart in either region.
    for (const regionId of [farming, trading]) {
      expect(approvalIn(favoured, regionId) - approvalIn(kept, regionId)).toBe(
        regionFactions(favoured, regionId).effect - regionFactions(kept, regionId).effect,
      );
    }
  });

  it('are forecast by the preview: each standing next quarter is what then happens', () => {
    let game = createGame(quiet(name), 7);
    const budget = budgetFrom(game.budget, {
      taxRatePercent: 24,
      spending: { agriculture: game.budget.spending.agriculture + 20, health: 0 },
    });

    for (let quarter = 0; quarter < 6; quarter += 1) {
      const decisions = steward(game, budget);
      const preview = previewQuarter(game, decisions);
      const before = game;
      game = advanceQuarter(game, decisions).state;
      const status = factionsStatus(game);

      expect(preview.standings.map((each) => each.faction)).toEqual([...CIVIL_FACTIONS]);
      for (const outlook of preview.standings) {
        const now = status.standings.find((each) => each.faction === outlook.faction);
        expect(outlook.standing).toBe(now?.standing);
        expect(outlook.mood).toBe(now?.mood);
        // It is heading where the preview said, and has not passed it.
        const was = standingOf(before, outlook.faction);
        expect(Math.abs(outlook.heading - outlook.standing)).toBeLessThanOrEqual(
          Math.abs(outlook.heading - was),
        );
      }
    }
  });

  it('add a Factions line to approval, split by faction and adding up, in the report and in what approval is made of', () => {
    const start = createGame(quiet(name), 7);
    const more = MORE_FOR_FARMS[name as keyof typeof MORE_FOR_FARMS];
    const { states, reports } = play(start, 2, favouringFarmers(start, more));
    const game = states.at(-1) ?? start;

    for (const report of reports) {
      const line = report.approval.contributions.find((each) => each.label === 'Factions');
      expect(line?.parts?.map((part) => part.label)).toEqual(['Farmers', 'Workers', 'Business']);
      expect(line?.parts?.reduce((total, part) => total + part.amount, 0)).toBe(line?.amount);
      // Each part that moved approval says what moved that faction most.
      const moved = [
        'Agriculture’s share of spending',
        'Health and education’s share of spending',
        'The budget’s balance',
      ];
      expect(line?.parts?.map((part) => part.note)).toEqual(
        line?.parts?.map((part, index) => (part.amount === 0 ? undefined : moved[index])),
      );
      expect(line?.parts?.[0]?.note).toBe(moved[0]);
      // And each standing's own figure adds up to its change.
      for (const faction of CIVIL_FACTIONS) {
        const figure = report.standings?.[faction];
        expect(figure?.contributions.reduce((total, each) => total + each.amount, 0)).toBe(
          figure?.change,
        );
      }
    }

    const made = approvalStatus(game).causes.find((each) => each.label === 'Factions');
    expect(made?.parts?.map((part) => part.label)).toEqual(['Farmers', 'Workers', 'Business']);
    expect(made?.parts?.reduce((total, part) => total + part.amount, 0)).toBe(made?.amount);
    for (const part of made?.parts ?? [])
      expect(part.note).toMatch(/^(Pleased|Content|Uneasy|Angry), at /);
    // Every region's approval carries the effect, split the same way.
    for (const region of game.regions) {
      const { effect, parts } = regionFactions(game, region.id);
      expect(region.approvalEffects.factions).toBe(effect);
      expect(parts.farmers + parts.workers + parts.business).toBe(effect);
    }
  });

  it('answer to the tax rate where it is theirs to mind: workers and business, and not farmers', () => {
    const start = createGame(quiet(name), 7);
    const taxed = play(
      start,
      1,
      budgetFrom(start.budget, { taxRatePercent: start.budget.taxRatePercent + 6 }),
    );
    const lines = (faction: CivilFaction) =>
      taxed.reports[0]?.standings?.[faction].contributions.map((each) => each.label);

    expect(lines('farmers')).not.toContain('Tax rate');
    expect(lines('workers')).toContain('Tax rate');
    expect(lines('business')).toContain('Tax rate');
    expect(standingOf(taxed.states[1] ?? start, 'farmers')).toBe(standingOf(start, 'farmers'));
    expect(standingOf(taxed.states[1] ?? start, 'workers')).toBeLessThan(
      standingOf(start, 'workers'),
    );
  });

  it('are kept through a save, with the standings each quarter recorded', () => {
    const start = createGame(quiet(name), 7);
    const more = MORE_FOR_FARMS[name as keyof typeof MORE_FOR_FARMS];
    const { states, reports } = play(start, 3, favouringFarmers(start, more));
    const game = states.at(-1) ?? start;
    const report = reports.at(-1) ?? null;

    expect(game.history.map((record) => record.standings)).toEqual(
      states.map((state) => ({
        farmers: standingOf(state, 'farmers'),
        workers: standingOf(state, 'workers'),
        business: standingOf(state, 'business'),
      })),
    );
    const restored = loadSave(JSON.parse(JSON.stringify(saveGame(game, report))));
    expect(restored.game.factions).toEqual(game.factions);
    expect(factionsStatus(restored.game)).toEqual(factionsStatus(game));
    expect(restored.report?.standings).toEqual(report?.standings);
    expect(restored.report?.approval).toEqual(report?.approval);
  });
});

/**
 * Tavara, worked by hand. Its starting budget spends $38.0m and raises $31.0m at 18%:
 *
 * - Farmers: agriculture takes $11.0m, 289 thousandths, against the 240 they take as their
 *   due and the 480 that would please them wholly: 49/240 of their 300 is +61, so 561.
 * - Workers: health and education take $13.0m, 342 against 370: 28/370 of 300 is −22, so 478.
 * - Business: the budget runs 225 thousandths short, against the 400 at which a deficit costs
 *   its whole 150: −84. Owing nothing is worth its whole 100. Tax at 18% is neutral: 516.
 */
describe('the factions in Tavara, by the figures', () => {
  it('stand where the starting budget puts them', () => {
    const start = createGame(quiet('Tavara'), 7);

    expect(standingsOf(start)).toEqual([561, 478, 516]);
    const [farmers, workers, business] = factionsStatus(start).standings;
    expect(farmers?.causes).toEqual([
      { label: 'Neutral', amount: 500 },
      { label: 'Agriculture’s share of spending', amount: 61 },
      { label: 'Drought and flood', amount: 0 },
    ]);
    expect(workers?.causes).toEqual([
      { label: 'Neutral', amount: 500 },
      { label: 'Health and education’s share of spending', amount: -22 },
      { label: 'Tax rate', amount: 0 },
    ]);
    expect(business?.causes).toEqual([
      { label: 'Neutral', amount: 500 },
      { label: 'Tax rate', amount: 0 },
      { label: 'The budget’s balance', amount: -84 },
      { label: 'Debt burden', amount: 100 },
      { label: 'Large sites in use', amount: 0 },
    ]);
    // The best each could be: every lever it answers to at its best.
    expect([farmers?.best, workers?.best, business?.best]).toEqual([800, 950, 950]);
  });

  it('bear on each region by its mix: three tenths of a point for each point its people’s standings are from neutral', () => {
    const start = createGame(quiet('Tavara'), 7);

    expect(balance.factions.approvalScalePermille).toBe(300);
    // Lowmere Plains is 70% farmers, 20% workers and 10% business: 0.7 × 61 − 0.2 × 22 +
    // 0.1 × 16. Three tenths of each part, rounded towards nothing, are 12 (of 12.8), −1 (of
    // −1.3) and 0 (of 0.5), and the effect is the three together.
    expect(regionFactions(start, 'lowmere-plains')).toEqual({
      regionId: 'lowmere-plains',
      shares: { farmers: 700, workers: 200, business: 100 },
      effect: 11,
      parts: { farmers: 12, workers: -1, business: 0 },
    });
    // Salt Coast is 15%, 35% and 50%: three tenths of 9.15, −7.7 and 8 are 2, −2 and 2, so 2.
    expect(regionFactions(start, 'salt-coast').effect).toBe(2);
    expect(regionFactions(start, 'salt-coast').shares).toEqual({
      farmers: 150,
      workers: 350,
      business: 500,
    });
  });

  it('move as the budget does: $5.0m more for agriculture, a quarter on', () => {
    const start = createGame(quiet('Tavara'), 7);
    const { states, reports } = play(start, 1, favouringFarmers(start, 50));

    // Agriculture now takes 372 thousandths of $43.0m, which would settle the farmers at +165:
    // a fifth of the 104 between is 21. Health and education's 302 would settle the workers at
    // −55: a fifth of 33 is 7. The deficit, now 387 thousandths of revenue, would settle
    // business at −145: a fifth of 61 is 13.
    expect(standingsOf(states[1] ?? start)).toEqual([582, 471, 503]);
    expect(reports[0]?.standings?.farmers).toEqual({
      value: 582,
      change: 21,
      contributions: [
        { label: 'Agriculture’s share of spending', amount: 21 },
        { label: 'Drought and flood', amount: 0 },
      ],
    });
  });

  it('turn the farmers against a government that leaves their fields to drought', () => {
    // Drought every year in the Dry East, where three in four are farmers.
    const country = withChances(tavaraFile, { drought: { 'dry-east': 1 }, factions: true });
    const calm = createGame(quiet('Tavara'), 3);
    const start = createGame(country, 3);
    const struck = play(start, 3, start.budget).states.find((state) => state.events.length > 0);
    if (struck === undefined) throw new Error('No drought came');
    const after = advanceQuarter(struck, steward(struck)).state;

    expect(standingOf(after, 'farmers')).toBeLessThan(standingOf(calm, 'farmers'));
    expect(standingOf(after, 'workers')).toBe(standingOf(calm, 'workers'));
    expect(
      factionsStatus(after).standings[0]?.causes.find(
        (cause) => cause.label === 'Drought and flood',
      )?.amount,
    ).toBeLessThan(0);
  });
});

describe('a region’s faction mix in a country file', () => {
  const mix = ['regions', 0, 'factions'] as const;

  it('is given by Tavara and Testland as they ship, for every region', () => {
    expect(COUNTRY_FORMAT_VERSION).toBe(13);
    for (const file of [tavaraFile, testlandFile]) {
      expect(file.formatVersion).toBe(13);
      for (const region of file.regions) {
        const { farmers, workers, business } = region.factions;
        expect(farmers + workers + business).toBe(100);
      }
    }
  });

  it('is the whole percentage of its people in each faction, which need not come to everyone', () => {
    const country = loadCountry(
      withValue(tavaraFile, mix, { farmers: 40, workers: 20, business: 10 }),
    );
    const game = createGame(country, 1);

    expect(regionFactions(game, country.regions[0]?.id ?? '').shares).toEqual({
      farmers: 400,
      workers: 200,
      business: 100,
    });
    // People of no faction: the factions do nothing to the approval of a region of them.
    const apart = createGame(
      loadCountry(withValue(tavaraFile, mix, { farmers: 0, workers: 0, business: 0 })),
      1,
    );
    expect(regionFactions(apart, apart.regions[0]?.id ?? '').effect).toBe(0);
  });

  it('is checked on load, with a message naming the fault', () => {
    for (const [wrong, fault] of [
      [
        { farmers: 60, workers: 30, business: 20 },
        'regions[0].factions adds up to 110, but a region’s people come to no more than 100.',
      ],
      [
        { farmers: -5, workers: 30, business: 20 },
        'regions[0].factions.farmers is -5, but must be a whole number from 0 to 100.',
      ],
      [
        { farmers: 33.3, workers: 33, business: 33 },
        'regions[0].factions.farmers is 33.3, but must be a whole number from 0 to 100.',
      ],
      [{ farmers: 60, workers: 30 }, 'regions[0].factions.business is missing.'],
      [
        { farmers: 50, workers: 30, business: 10, army: 10 },
        'regions[0].factions.army is not a faction with a share of a region’s people, which are: farmers, workers, business.',
      ],
      ['mostly farmers', 'regions[0].factions must be an object, but is text.'],
    ] as const) {
      expect(faultsOf(withValue(tavaraFile, mix, wrong))).toEqual([fault]);
    }
  });

  it.each([
    ['Tavara', tavaraFile],
    ['Testland', testlandFile],
  ] as const)(
    'cannot be given by a file of an older format, which is read as an even mix: %s',
    (_name, file) => {
      expect(faultsOf({ ...file, formatVersion: 12 })).toEqual(
        file.regions.map(
          (_, index) => `regions[${index}].factions needs country file format 13 or later.`,
        ),
      );

      const older = loadCountry(beforeFactions(file));
      expect(older.formatVersion).toBe(12);
      const game = createGame(older, 1);
      for (const region of game.regions) {
        expect(regionFactions(game, region.id).shares).toEqual({
          farmers: 333,
          workers: 333,
          business: 333,
        });
      }
      // A region that gives none in a file of the new format is read the same way.
      const silent = createGame(loadCountry(without(file, mix)), 1);
      expect(regionFactions(silent, silent.regions[0]?.id ?? '').shares).toEqual({
        farmers: 333,
        workers: 333,
        business: 333,
      });
    },
  );
});

describe('a test country without factions', () => {
  it('is what the other tests play: its people follow none, so nothing here moves their figures', () => {
    const start = createGame(withDroughtChance(tavaraFile, {}), 1);

    for (const region of start.regions) {
      expect(regionFactions(start, region.id)).toMatchObject({
        shares: { farmers: 0, workers: 0, business: 0 },
        effect: 0,
      });
    }
  });
});
