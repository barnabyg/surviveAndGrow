import { describe, expect, it } from 'vitest';
import tavaraFile from '../../src/countries/tavara.json';
import {
  advanceQuarter,
  balance,
  createGame,
  describeEvent,
  knownTechnologies,
  onSite,
  onTechnology,
  previewQuarter,
  projectStartFault,
  researchFault,
  researchStatuses,
  risksAhead,
  technologyTerms,
  TECHNOLOGIES,
  TECHNOLOGY_DEFINITIONS,
  type Budget,
  type Decisions,
  type GameState,
  type TurnReport,
} from '../../src/sim';
import testlandFile from '../countries/testland.json';
import { bothCountries, tavara, withChances } from './countries';
import { steward } from './playing';
import { budgetOf } from '../budgets';

const SEED = 'droughtResistantSeed';

/** A budget the treasury cannot cover: spending is cut and nothing is left over. */
const ruinous: Budget = budgetOf({ taxRatePercent: 5, elsewhere: 200 });

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

const { cost, researchQuarters } = balance.technologies[SEED];

describe('the technology tree', () => {
  it('is the engine’s, with each technology’s terms in the balance data', () => {
    for (const technology of TECHNOLOGIES) {
      const terms = technologyTerms(technology);
      expect(terms.name).toBe(TECHNOLOGY_DEFINITIONS[technology].name);
      expect(terms.cost).toBe(balance.technologies[technology].cost);
      expect(terms.researchQuarters).toBe(balance.technologies[technology].researchQuarters);
      for (const needed of terms.prerequisites) {
        expect(technologyTerms(needed).leadsTo).toContain(technology);
      }
    }
  });

  it('says what drought-resistant seed does, from the figure it does it with', () => {
    const percent = Math.round((1000 - balance.technologies[SEED].effects.weatherAndDrought) / 10);
    expect(technologyTerms(SEED).effect).toBe(
      `Weather and drought move every region’s harvest ${percent}% less.`,
    );
  });

  it.each(bothCountries)(
    'starts in %s with nothing known and each root available',
    (_, country) => {
      const game = createGame(country(), 1);
      expect(knownTechnologies(game.projects)).toEqual([]);
      // The seed needs nothing, nor do public health and teacher training, a branch each of its
      // own; everything else builds on the seed, so is locked.
      const statuses = researchStatuses(game, null);
      expect(statuses.map((status) => [status.technology, status.state])).toEqual(
        TECHNOLOGIES.map((technology) => [
          technology,
          TECHNOLOGY_DEFINITIONS[technology].prerequisites.length === 0 ? 'available' : 'locked',
        ]),
      );
      expect(statuses[0]?.fault).toBeNull();
    },
  );
});

describe('research', () => {
  it.each(bothCountries)(
    'in %s is paid in instalments after the budget, and the technology is known from the quarter after the last',
    (_, country) => {
      const game = createGame(country(), 1);
      const { state, reports } = play(game, [
        { startResearch: SEED },
        ...Array.from({ length: researchQuarters - 1 }, () => ({})),
      ]);

      expect(headlines(reports[0])).toContain('Research begins: Drought-resistant seed');
      const [first] = reports;
      expect(first?.treasury.contributions).toContainEqual({
        label: 'Researching Drought-resistant seed',
        amount: -Math.floor(cost / researchQuarters),
      });
      expect(headlines(reports.at(-1))).toContain('Research finished: Drought-resistant seed');
      expect(reports.at(-1)?.entries.find((entry) => entry.kind === 'researchCompleted')).toEqual({
        kind: 'researchCompleted',
        seriousness: 'notable',
        headline: 'Research finished: Drought-resistant seed',
        cause: `It is known from next quarter. ${technologyTerms(SEED).effect}`,
      });
      expect(state.projects).toEqual([
        {
          target: onTechnology(SEED),
          began: { year: 1, quarter: 1 },
          quartersPaid: researchQuarters,
          status: 'known',
          opened: state.date,
        },
      ]);
      expect(knownTechnologies(state.projects)).toEqual([SEED]);
      expect(researchStatuses(state, null)[0]).toMatchObject({
        state: 'known',
        known: state.date,
        fault: 'Drought-resistant seed is already known.',
      });
    },
  );

  it('is shown as being researched, with how far it has got', () => {
    const { state } = play(createGame(tavara(), 1), [{ startResearch: SEED }]);
    expect(researchStatuses(state, null)[0]).toMatchObject({
      state: 'researching',
      quartersPaid: 1,
      researchQuarters,
      fault: `${technologyTerms(SEED).name} is already being researched.`,
    });
  });

  it('pauses when the treasury cannot pay, after the sites started before it, and resumes', () => {
    const game = createGame(tavara(), 1);
    const { state, reports } = play(game, [
      { startProjects: ['lowmere-store'], startResearch: SEED },
      { budget: ruinous },
      { budget: { ...game.budget, taxRatePercent: 40 } },
    ]);
    // Instalments are paid oldest first: the site was listed first, so it is paid first.
    const lines = reports[0]?.treasury.contributions.map((line) => line.label) ?? [];
    expect(lines.indexOf('Building Lowmere grain store')).toBeLessThan(
      lines.indexOf('Researching Drought-resistant seed'),
    );
    expect(reports[1]?.entries).toContainEqual(
      expect.objectContaining({
        kind: 'researchPaused',
        seriousness: 'warning',
        headline: 'Research paused: Drought-resistant seed',
        cause: `The treasury could not cover its $${((cost / researchQuarters) * 0.1).toFixed(1)}m instalment, so no research was done this quarter.`,
      }),
    );
    expect(headlines(reports[2])).toContain('Research resumes: Drought-resistant seed');
    expect(state.projects[1]?.quartersPaid).toBe(2);
  });

  describe('can be started only', () => {
    const game = createGame(tavara(), 1);

    it('when the treasury holds its whole cost beside the sites started', () => {
      const poor = { ...game, treasury: cost - 1 };
      const irrigation = balance.sites.irrigation.cost;
      expect(researchFault(poor, SEED, [])).toBe(
        `The treasury holds $${((cost - 1) / 10).toFixed(1)}m, which does not cover the $${(cost / 10).toFixed(1)}m needed to start Drought-resistant seed.`,
      );
      const both = { ...game, treasury: irrigation + cost - 1 };
      expect(researchFault(both, SEED, [])).toBeNull();
      expect(researchFault(both, SEED, ['lowmere-irrigation'])).toMatch(
        /which does not cover the .* needed to start 2 projects\.$/,
      );
      expect(projectStartFault(both, [onSite('lowmere-irrigation'), onTechnology(SEED)])).toBe(
        researchFault(both, SEED, ['lowmere-irrigation']),
      );
    });

    it('outside austerity', () => {
      const austere = { ...game, austerity: { quartersLeft: 2 } };
      expect(researchFault(austere, SEED, [])).toMatch(
        /^No project can be started during austerity/,
      );
      expect(() =>
        advanceQuarter(austere, { budget: austere.budget, startResearch: SEED }),
      ).toThrow(RangeError);
    });

    it('while nothing else is being researched, and once', () => {
      const { state } = play(game, [{ startResearch: SEED }]);
      expect(() => advanceQuarter(state, { budget: state.budget, startResearch: SEED })).toThrow(
        'Drought-resistant seed is already being researched.',
      );
      expect(projectStartFault(game, [onTechnology(SEED), onTechnology(SEED)])).toBe(
        'One technology is researched at a time, and Drought-resistant seed is planned.',
      );
    });

    it('for a technology the engine knows', () => {
      expect(() =>
        previewQuarter(game, {
          budget: game.budget,
          startResearch: 'cold-fusion' as typeof SEED,
        }),
      ).toThrow('There is no technology "cold-fusion" to research.');
    });
  });

  it('takes no upkeep and nothing decays it', () => {
    const game = createGame(tavara(), 1);
    const { state } = play(game, [
      { startResearch: SEED },
      ...Array.from({ length: researchQuarters }, () => ({ budget: ruinous })),
    ]);
    const preview = previewQuarter(state, { budget: state.budget });
    expect(preview.upkeep.needed).toBe(0);
    expect(preview.schedule).toEqual([]);
  });
});

/**
 * A country with drought in one region every year, played by a careful player who, if told
 * to, researches drought-resistant seed from the first quarter. It is known by the second
 * year's planting season, which the drought strikes.
 */
function droughtYears(file: unknown, regionId: string, research: boolean, drought = 1) {
  const country = withChances(file, { drought: { [regionId]: drought } });
  return play(
    createGame(country, 7),
    Array.from({ length: 8 }, (_, quarter) =>
      quarter === 0 && research ? { startResearch: SEED } : {},
    ),
  );
}

/** What a region grew at the last harvest of a game. */
function grownIn(played: Played, regionId: string): number {
  const harvest = played.reports.findLast((report) => report.harvest !== null)?.harvest;
  return harvest?.regions.find((region) => region.regionId === regionId)?.grown ?? 0;
}

describe('drought-resistant seed', () => {
  const scenarios = [
    { name: 'Tavara', file: tavaraFile, regionId: 'dry-east' },
    { name: 'Testland', file: testlandFile, regionId: 'sandreach' },
  ] as const;

  it.each(scenarios)(
    'in a whole game of $name, makes a drought’s harvest loss smaller than the same game without it',
    ({ file, regionId }) => {
      const lossWith =
        grownIn(droughtYears(file, regionId, true, 0), regionId) -
        grownIn(droughtYears(file, regionId, true), regionId);
      const lossWithout =
        grownIn(droughtYears(file, regionId, false, 0), regionId) -
        grownIn(droughtYears(file, regionId, false), regionId);

      expect(lossWithout).toBeGreaterThan(0);
      expect(lossWith).toBeGreaterThan(0);
      expect(lossWith).toBeLessThan(lossWithout);
    },
  );

  it('is named in the harvest report once known', () => {
    const played = droughtYears(tavaraFile, 'dry-east', true);
    const harvest = played.reports.findLast((report) => report.harvest !== null);
    const entry = harvest?.entries.find((each) => each.kind === 'harvest');
    expect(entry?.cause).toContain(
      `Drought-resistant seed is known: ${technologyTerms(SEED).effect}`,
    );
    const before = played.reports.find((report) => report.harvest !== null);
    expect(before?.entries.find((each) => each.kind === 'harvest')?.cause).not.toContain(
      'Drought-resistant seed',
    );
  });

  it('lessens a drought’s cut as the map describes it, but not a flood’s', () => {
    const { state } = droughtYears(tavaraFile, 'dry-east', true, 1);
    const known = { ...state, events: [] };
    const drought = { type: 'drought', regionId: 'dry-east', began: state.date } as const;
    const flood = { type: 'flood', regionId: 'dry-east', began: state.date } as const;
    const left = balance.technologies[SEED].effects.weatherAndDrought;
    const cut = Math.round((1000 - balance.events.drought.effects.harvestPermille) / 10);
    const softened = Math.round(
      ((1000 - balance.events.drought.effects.harvestPermille) * left) / 10_000,
    );
    expect(describeEvent(createGame(tavara(), 1), drought)).toBe(`Drought · harvest −${cut}%`);
    expect(describeEvent(known, drought)).toBe(`Drought · harvest −${softened}%`);
    expect(describeEvent(known, flood)).toBe(describeEvent(createGame(tavara(), 1), flood));
  });

  it('is counted in the preview’s harvest forecast', () => {
    const without = droughtYears(tavaraFile, 'dry-east', false).state;
    const known = droughtYears(tavaraFile, 'dry-east', true).state;
    // Each game played its second harvest; the next year's is forecast from its first quarter.
    const forecast = (game: GameState) => previewQuarter(game, steward(game)).harvest;
    const width = (game: GameState) => forecast(game).max - forecast(game).min;
    expect(width(known)).toBeLessThan(width(without));
  });

  it('is counted in the risks ahead', () => {
    const country = withChances(tavaraFile, { drought: { 'dry-east': 1 } });
    // The reserve is emptied, so the Dry East lives off its own harvest.
    const hungry = (game: GameState): GameState => ({ ...game, foodReserve: 0 });
    const without = hungry(createGame(country, 7));
    const knownGame = hungry({
      ...without,
      projects: [
        {
          target: onTechnology(SEED),
          began: without.date,
          quartersPaid: researchQuarters,
          status: 'known',
          opened: without.date,
        },
      ],
    });
    const famine = (game: GameState) =>
      risksAhead(game, { budget: game.budget }).find(
        (risk) => risk.kind === 'famine' && risk.regionId === 'dry-east',
      );
    // The same drought threatens famine, but the seed makes it far less likely.
    expect(famine(without)?.likelihood).toBe('almostCertain');
    expect(famine(knownGame)?.likelihood).toBe('unlikely');
  });
});
