import { describe, expect, it } from 'vitest';
import tavaraFile from '../../src/countries/tavara.json';
import {
  advanceQuarter,
  capacityOfTonnes,
  createGame,
  loadCountry,
  loadSave,
  SAVE_FORMAT_VERSION,
  SaveError,
  saveGame,
  startFault,
  surveyedRegions,
  type Budget,
  type Country,
  type Decisions,
  type GameState,
  type SaveMigration,
  type TurnReport,
} from '../../src/sim';
import testlandFile from '../countries/testland.json';
import format11Save from '../saves/format-11.json';
import format12Save from '../saves/format-12.json';
import {
  bothCountries,
  tavara,
  tavaraAsShipped,
  testlandAsShipped,
  testlandInDebt,
  withChances,
} from './countries';
import { valueAt, withValue, without, type Path } from './files';
import { answering, steward } from './playing';

/** A save as it comes back out of storage: text, read again. */
function stored(save: unknown): unknown {
  return JSON.parse(JSON.stringify(save)) as unknown;
}

/** Each country, and the regions that drought and flood are made to strike in it. */
const countries = [
  {
    name: 'Tavara',
    file: tavaraFile,
    shipped: tavaraAsShipped,
    dry: 'dry-east',
    wet: 'lowmere-plains',
  },
  {
    name: 'Testland',
    file: testlandFile,
    shipped: testlandAsShipped,
    dry: 'sandreach',
    wet: 'northfield',
  },
] as const;

/** Every tax the country can bear and nothing spent, so the treasury only grows. */
const austere: Budget = {
  taxRatePercent: 40,
  spending: { agriculture: 0, foodRelief: 0, health: 0, education: 0, security: 0, upkeep: 0 },
};

/** A budget the treasury cannot cover: spending is cut and nothing is left over. */
const ruinous: Budget = {
  taxRatePercent: 5,
  spending: {
    agriculture: 200,
    foodRelief: 200,
    health: 200,
    education: 200,
    security: 200,
    upkeep: 200,
  },
};

/**
 * Plays the same game along two lines: one never saved, and one saved, stored and restored
 * before every quarter. The two must agree on every state and every report. It returns each
 * state the game passed through, so a test can show that it met what it was written for.
 */
function playThroughSaves(
  start: GameState,
  quarters: number,
  decide: (game: GameState, quarter: number) => Decisions,
): GameState[] {
  const passed: GameState[] = [];
  let plain = start;
  let resumed = start;
  let report: TurnReport | null = null;
  for (let quarter = 0; quarter < quarters && plain.outcome.status === 'playing'; quarter += 1) {
    const restored = loadSave(stored(saveGame(resumed, report)));
    expect(restored).toEqual({ game: plain, report });
    resumed = restored.game;
    passed.push(plain);

    const decisions = decide(plain, quarter);
    const played = advanceQuarter(plain, decisions);
    const replayed = advanceQuarter(resumed, decisions);
    expect(replayed.report).toEqual(played.report);
    expect(replayed.state).toEqual(played.state);
    plain = played.state;
    resumed = replayed.state;
    report = played.report;
  }
  // The last position is saved too: a finished game opens again on how it ended.
  expect(loadSave(stored(saveGame(plain, report)))).toEqual({ game: plain, report });
  passed.push(plain);
  return passed;
}

describe.each(bothCountries)('saving a game in %s', (_name, country) => {
  it('records the save format, the country and its version, the seed and the generator', () => {
    const start = createGame(country(), 2026);
    const game = advanceQuarter(start, steward(start)).state;

    const save = saveGame(game, null);

    expect(save.formatVersion).toBe(12);
    expect(save.country.id).toBe(country().id);
    expect(save.country.formatVersion).toBe(country().formatVersion);
    expect(save.seed).toBe(2026);
    expect(save.rng).toBe(game.rng);
    expect(save.rng).not.toBe(start.rng);
  });

  it('restores a new game exactly as it was, with no report since no quarter has ended', () => {
    const game = createGame(country(), 2026);

    expect(loadSave(stored(saveGame(game, null)))).toEqual({ game, report: null });
  });

  it('restores the report on the quarter just ended along with the game', () => {
    const start = createGame(country(), 2026);
    const { state, report } = advanceQuarter(start, steward(start));

    const restored = loadSave(stored(saveGame(state, report)));

    expect(restored.report).toEqual(report);
    expect(restored.report?.entries.map((entry) => entry.kind)).toContain('budget');
  });

  it('leaves the game it saves untouched', () => {
    const game = createGame(country(), 2026);
    const before = structuredClone(game);

    saveGame(game, null);

    expect(game).toEqual(before);
  });
});

describe.each(countries)(
  'a game in $name that is saved, restored and continued',
  ({ file, shipped, dry, wet }) => {
    it.each([1, 2, 3])(
      'is the same game as one never saved, through the first election as shipped (seed %i)',
      (seed) => {
        const passed = playThroughSaves(createGame(shipped(), seed), 22, (game) =>
          answering(game, steward(game)),
        );

        // It ends, or it is re-elected and plays on into its second term.
        const last = passed.at(-1);
        expect(last?.outcome.status !== 'playing' || last.history.length === 23).toBe(true);
      },
    );

    it('is the same with a project being built, paused for want of money, finished, decaying and restored', () => {
      const country = withChances(file, {});
      const store = country.sites.find((site) => site.type === 'grainStore');
      if (!store) throw new Error('The country has no grain store site');

      const passed = playThroughSaves(createGame(country, 4), 7, (_game, quarter) => ({
        // Building is begun in a quarter that empties the treasury, which then fills again.
        // Austere pays no upkeep, so the store decays once in use, until upkeep is paid.
        budget:
          quarter === 0
            ? ruinous
            : quarter === 6
              ? { ...austere, spending: { ...austere.spending, upkeep: 10 } }
              : austere,
        ...(quarter === 0 ? { startProjects: [store.id] } : {}),
      }));

      const statuses = passed.map((game) => game.projects[0]?.status);
      expect(statuses).toContain('paused');
      expect(statuses).toContain('building');
      expect(statuses).toContain('decaying');
      expect(statuses.at(-1)).toBe('operating');
    });

    it('is the same through a drought left alone until famine brings the state down', () => {
      const country = withChances(file, { drought: { [dry]: 1 } });

      const passed = playThroughSaves(createGame(country, 4), 20, (game) => ({
        budget: game.budget,
      }));

      expect(passed.some((game) => game.events.length > 0)).toBe(true);
      expect(
        passed.some((game) => game.regions.some((region) => region.foodStage === 'famine')),
      ).toBe(true);
      expect(passed.at(-1)?.outcome).toMatchObject({ status: 'lost', cause: 'famine' });
    });

    it('is the same through a flood that sets a site in use decaying', () => {
      const country = withChances(file, { flood: { [wet]: 1 } });
      const store = country.sites.find(
        (site) => site.type === 'grainStore' && site.regionId === wet,
      );
      if (!store) throw new Error('The flooded region has no grain store site');

      // The store is paid for out of a high tax, and its upkeep is paid every quarter.
      const passed = playThroughSaves(createGame(country, 4), 10, (_game, quarter) => ({
        budget: { ...austere, spending: { ...austere.spending, upkeep: 10 } },
        ...(quarter === 0 ? { startProjects: [store.id] } : {}),
      }));

      expect(passed.some((game) => game.events.some((event) => event.type === 'flood'))).toBe(true);
      expect(passed.map((game) => game.projects[0]?.status)).toContain('decaying');
    });

    it('is the same with regions on strike and in protest', () => {
      const passed = playThroughSaves(createGame(withChances(file, {}), 4), 10, () => ({
        budget: austere,
      }));

      const unrest = passed.flatMap((game) => game.regions.map((region) => region.unrest));
      expect(unrest).toContain('strikes');
      expect(unrest).toContain('protests');
    });

    it('is the same with a dilemma waiting for its answer, and after it is answered', () => {
      const country = withChances(file, { dilemmas: { teachersPay: 1 } });

      const passed = playThroughSaves(createGame(country, 5), 4, (game) =>
        answering(game, { budget: game.budget }),
      );

      expect(passed.some((game) => game.dilemma?.type === 'teachersPay')).toBe(true);
      expect(passed.at(-1)?.dilemmasAnswered.length).toBeGreaterThan(0);
    });

    it('is the same with a dilemma about one region, and relief being sent there', () => {
      const country = withChances(file, {
        drought: { [dry]: 1 },
        dilemmas: { emergencyWorks: 1 },
      });

      const passed = playThroughSaves(createGame(country, 5), 8, (game) =>
        answering(game, { budget: game.budget, reliefRegionId: dry }),
      );

      expect(passed.some((game) => game.dilemma?.regionId === dry)).toBe(true);
      expect(passed.at(-1)?.reliefRegionId).toBe(dry);
    });
  },
);

describe('a game on a country that starts in debt', () => {
  it('is the same game as one never saved, its starting loans repaid', () => {
    const passed = playThroughSaves(createGame(testlandInDebt(), 5), 13, (game) => steward(game));

    expect(passed[0]?.debts.map((debt) => debt.number)).toEqual([1, 2]);
    expect(passed.at(-1)?.debts).toEqual([]);
  });

  it('resumes on the debt it began with after its country file changes', () => {
    const file = structuredClone(testlandFile) as { start: { loans: unknown[] } };
    const start = createGame(loadCountry(file), 2026);
    const { state, report } = advanceQuarter(start, steward(start));
    const save = stored(saveGame(state, report));

    // The author edits the file the game was started on: the country now starts owing more.
    file.start.loans = [...file.start.loans, { amount: 5, rate: 12, quarters: 4 }];
    expect(loadCountry(file).start.loans).toHaveLength(3);

    const resumed = loadSave(save);
    expect(resumed).toEqual({ game: state, report });
    expect(resumed.game.country.formatVersion).toBe(9);
    expect(resumed.game.country.start.loans).toEqual(start.country.start.loans);
    expect(resumed.game.debts.map((debt) => debt.number)).toEqual([1, 2]);
    expect(advanceQuarter(resumed.game, steward(resumed.game))).toEqual(
      advanceQuarter(state, steward(state)),
    );
  });
});

describe.each(bothCountries)('where food relief stands directed in %s', (_name, country) => {
  it('is nowhere when a game starts', () => {
    expect(createGame(country(), 3).reliefRegionId).toBe(null);
  });

  it('is the region the last quarter sent it to, until a quarter sends it elsewhere', () => {
    const start = createGame(country(), 3);
    const target = start.regions[0]?.id ?? '';

    const sent = advanceQuarter(start, { budget: start.budget, reliefRegionId: target }).state;
    const stopped = advanceQuarter(sent, { budget: sent.budget }).state;

    expect(sent.reliefRegionId).toBe(target);
    expect(stopped.reliefRegionId).toBe(null);
  });
});

/** A game a few quarters in, with a project under way, saved and read back from storage. */
function midGameSave(country: () => Country): {
  game: GameState;
  report: TurnReport;
  save: unknown;
} {
  const start = createGame(country(), 9);
  const site = start.country.sites.find((candidate) => candidate.type === 'grainStore');
  const begun = advanceQuarter(start, { budget: austere, startProjects: site ? [site.id] : [] });
  const { state: game, report } = advanceQuarter(begun.state, { budget: austere });
  return { game, report, save: stored(saveGame(game, report)) };
}

/** Why a save is refused, in the words the player is shown. */
function refusal(save: unknown, migrations?: Record<number, SaveMigration>): string {
  try {
    loadSave(save, migrations);
  } catch (error) {
    if (error instanceof SaveError) return error.message;
    throw error;
  }
  throw new Error('The save was accepted');
}

describe.each(bothCountries)('a save of a game in %s is refused', (_name, country) => {
  it.each([null, 'a saved game', 7, [], undefined])('when it is not a save at all: %j', (save) => {
    expect(refusal(save)).toBe(
      'The saved game is damaged and cannot be opened: it is not a saved game.',
    );
  });

  it.each([undefined, '1', 1.5, null])('when its format version is %j', (version) => {
    const { save } = midGameSave(country);

    expect(refusal(withValue(save, ['formatVersion'], version))).toBe(
      'The saved game is damaged and cannot be opened: it does not say which save format it was written in.',
    );
  });

  it('when it was written by a newer release', () => {
    const { save } = midGameSave(country);

    expect(refusal(withValue(save, ['formatVersion'], 13))).toBe(
      'The saved game was written by a newer release of the game (save format 13; this release reads format 12). Open it with that release.',
    );
  });

  it('when it was written in an older format that nothing lifts to this one', () => {
    const { save } = midGameSave(country);

    expect(refusal(withValue(save, ['formatVersion'], 0))).toBe(
      'The saved game was written in save format 0, which this release cannot read.',
    );
  });

  it('when the country it carries will not load', () => {
    const { save } = midGameSave(country);

    expect(refusal(withValue(save, ['country', 'file', 'formatVersion'], 10))).toBe(
      'The saved game’s country cannot be loaded, so the game cannot be opened. formatVersion is 10, but this game reads versions 1 to 9.',
    );
    expect(refusal(without(save, ['country', 'file']))).toMatch(/country cannot be loaded/);
    expect(refusal(without(save, ['country']))).toBe(
      'The saved game is damaged and cannot be opened: country is missing or is not an object.',
    );
  });

  it('when the country it names is not the one it carries', () => {
    const { save } = midGameSave(country);

    expect(refusal(withValue(save, ['country', 'id'], 'elsewhere'))).toBe(
      'The saved game is damaged and cannot be opened: country.id does not match the country the save carries.',
    );
  });

  it.each([
    'date',
    'treasury',
    'budget',
    'reliefRegionId',
    'foodReserve',
    'agricultureSpentThisYear',
    'regions',
    'events',
    'projects',
    'history',
    'dilemma',
    'dilemmasAnswered',
    'prosperousQuarters',
    'outcome',
  ])('when its state has no %s', (part) => {
    const { save } = midGameSave(country);

    expect(refusal(without(save, ['state', part]))).toContain(
      `The saved game is damaged and cannot be opened: state.${part} is missing`,
    );
  });

  it('when its outcome is a win at an election, or a loss on prosperity', () => {
    const { save } = midGameSave(country);
    const ending = { headline: 'It is over', summary: 'It is over.' };
    const elected = { ...ending, status: 'won', cause: 'election', voteShare: 510, needed: 500 };

    expect(refusal(withValue(save, ['state', 'outcome'], elected))).toBe(
      'The saved game is damaged and cannot be opened: state.outcome.status cannot be a win when the cause is election.',
    );
    expect(
      refusal(
        withValue(save, ['state', 'outcome'], { ...ending, status: 'lost', cause: 'prosperity' }),
      ),
    ).toBe(
      'The saved game is damaged and cannot be opened: state.outcome.status must be a win when the cause is prosperity.',
    );
  });

  it.each(['seed', 'rng', 'state', 'report'])('when it has no %s', (part) => {
    const { save } = midGameSave(country);

    expect(refusal(without(save, [part]))).toContain(
      `The saved game is damaged and cannot be opened: ${part} is missing`,
    );
  });

  it.each<[string, Path, unknown, string]>([
    [
      'money that is not a whole number',
      ['state', 'treasury'],
      12.5,
      'state.treasury is missing or is not a whole number',
    ],
    ['a generator state out of range', ['rng'], -1, 'rng is -1, which is out of range'],
    [
      'a quarter the year does not have',
      ['state', 'date', 'quarter'],
      5,
      'state.date.quarter is 5, which is out of range',
    ],
    [
      'a food stage the game does not have',
      ['state', 'regions', 0, 'foodStage'],
      'feast',
      'state.regions[0].foodStage is "feast", which is not a food stage this game has',
    ],
    [
      'approval beyond everyone',
      ['state', 'regions', 0, 'approval'],
      1001,
      'state.regions[0].approval is 1001, which is out of range',
    ],
    [
      'a region the country does not have',
      ['state', 'regions', 0, 'id'],
      'atlantis',
      'state.regions does not hold the regions of the country the save carries, in its order',
    ],
    [
      'relief sent to a region the country does not have',
      ['state', 'reliefRegionId'],
      'atlantis',
      'state.reliefRegionId is "atlantis", which is not a region this game has',
    ],
    [
      'a project on a site the country does not have',
      ['state', 'projects', 0, 'target', 'siteId'],
      'moon-base',
      'state.projects[0].target.siteId is "moon-base", which is not a site this game has',
    ],
    [
      'a project for something the game does not have',
      ['state', 'projects', 0, 'target', 'kind'],
      'laboratory',
      'state.projects[0].target.kind is "laboratory", which is not a kind of project this game has',
    ],
    [
      'a project in a state of building the game does not have',
      ['state', 'projects', 0, 'status'],
      'abandoned',
      'state.projects[0].status is "abandoned", which is not a state of building this game has',
    ],
    [
      'an outcome the game does not have',
      ['state', 'outcome', 'status'],
      'drawn',
      'state.outcome.status is "drawn", which is not an outcome this game has',
    ],
    [
      'quarters held in the top tier that are fewer than none',
      ['state', 'prosperousQuarters'],
      -1,
      'state.prosperousQuarters is -1, which is out of range',
    ],
    [
      'an election result that is neither won nor lost',
      ['report', 'election'],
      { voteShare: 510, needed: 500, won: 'yes' },
      'report.election.won is missing or is not true or false',
    ],
    [
      'no history at all',
      ['state', 'history'],
      [],
      'state.history must hold at least the opening position',
    ],
    [
      'a report of a kind the game does not have',
      ['report', 'entries', 0, 'kind'],
      'gossip',
      'report.entries[0].kind is "gossip", which is not a kind of report this game has',
    ],
    [
      'a report with a figure that is not a whole number',
      ['report', 'treasury', 'change'],
      'lots',
      'report.treasury.change is missing or is not a whole number',
    ],
  ])('when it holds %s', (_what, path, value, why) => {
    const { save } = midGameSave(country);

    expect(refusal(withValue(save, path, value))).toBe(
      `The saved game is damaged and cannot be opened: ${why}.`,
    );
  });

  it('when its regions are not in the country’s order', () => {
    const { game, save } = midGameSave(country);
    const reversed = [...saveGame(game, null).state.regions].reverse();

    expect(refusal(withValue(save, ['state', 'regions'], reversed))).toMatch(
      /state\.regions does not hold the regions of the country/,
    );
  });

  it('when it builds on one site twice', () => {
    const { game, save } = midGameSave(country);
    const [project] = saveGame(game, null).state.projects;

    expect(refusal(withValue(save, ['state', 'projects'], [project, project]))).toBe(
      'The saved game is damaged and cannot be opened: state.projects builds on the same site twice.',
    );
  });

  it('when a project has paid for more quarters than its site takes to build', () => {
    // The grain store takes two quarters, and both have been paid for.
    const { game, save } = midGameSave(country);
    expect(game.projects[0]).toMatchObject({ quartersPaid: 2, status: 'operating' });

    expect(refusal(withValue(save, ['state', 'projects', 0, 'quartersPaid'], 3))).toBe(
      'The saved game is damaged and cannot be opened: state.projects[0].quartersPaid is 3, but the site takes 2 quarters to build.',
    );
  });

  it('when the country file format it records is not the one its country was written in', () => {
    const { save } = midGameSave(country);

    expect(refusal(withValue(save, ['country', 'formatVersion'], 1))).toBe(
      'The saved game is damaged and cannot be opened: country.formatVersion does not match the country the save carries.',
    );
    expect(refusal(without(save, ['country', 'formatVersion']))).toBe(
      'The saved game is damaged and cannot be opened: country.formatVersion does not match the country the save carries.',
    );
  });
});

describe.each(countries)('a save of a game in $name with a dilemma is refused', ({ file, dry }) => {
  /** A game saved with the teachers' dilemma waiting, or answered a quarter later. */
  function teachersSave(answered: boolean): unknown {
    const start = createGame(withChances(file, { dilemmas: { teachersPay: 1 } }), 5);
    let { state: game, report } = advanceQuarter(start, { budget: start.budget });
    expect(game.dilemma?.type).toBe('teachersPay');
    if (answered) {
      ({ state: game, report } = advanceQuarter(game, answering(game, { budget: game.budget })));
      expect(game.dilemmasAnswered).toMatchObject([{ type: 'teachersPay', optionId: 'refuse' }]);
    }
    return stored(saveGame(game, report));
  }

  it('when the waiting dilemma offers an option that dilemma does not have', () => {
    const save = withValue(teachersSave(false), ['state', 'dilemma', 'options', 0, 'id'], 'bribe');

    expect(refusal(save)).toBe(
      'The saved game is damaged and cannot be opened: state.dilemma.options[0].id is "bribe", which is not an option this dilemma has.',
    );
  });

  it('when the waiting dilemma offers the same option twice', () => {
    const save = teachersSave(false);
    const [option] = valueAt(save, ['state', 'dilemma', 'options']) as unknown[];

    expect(refusal(withValue(save, ['state', 'dilemma', 'options'], [option, option]))).toBe(
      'The saved game is damaged and cannot be opened: state.dilemma.options offers the same option twice.',
    );
  });

  it('when an answered dilemma records an option that dilemma does not have', () => {
    const save = withValue(teachersSave(true), ['state', 'dilemmasAnswered', 0, 'optionId'], 'run');

    expect(refusal(save)).toBe(
      'The saved game is damaged and cannot be opened: state.dilemmasAnswered[0].optionId is "run", which is not an option this dilemma has.',
    );
  });

  it('when a dilemma that concerns no region would move grain to its region', () => {
    const country = withChances(file, { drought: { [dry]: 1 }, dilemmas: { emergencyWorks: 1 } });
    const start = createGame(country, 5);
    const { state: game, report } = advanceQuarter(start, { budget: start.budget });
    // The second option sends grain from the national reserve to the region's own stock.
    expect(game.dilemma).toMatchObject({ type: 'emergencyWorks', regionId: dry });
    expect(game.dilemma?.options[1]?.effects[0]).toMatchObject({ kind: 'regionGrain' });
    const save = stored(saveGame(game, report));

    expect(refusal(withValue(save, ['state', 'dilemma', 'regionId'], null))).toBe(
      'The saved game is damaged and cannot be opened: state.dilemma.options[1].effects[0] moves grain to a region, but the dilemma concerns no region.',
    );
  });
});

describe.each(bothCountries)('a save of a game in %s from an older format', (_name, country) => {
  /** The format before the current one. */
  const previous = SAVE_FORMAT_VERSION - 1;

  /** The save as an imagined earlier format wrote it: the treasury was called the purse. */
  function olderSave(save: unknown): unknown {
    const purse = withValue(save, ['state', 'purse'], valueAt(save, ['state', 'treasury']));
    return withValue(without(purse, ['state', 'treasury']), ['formatVersion'], previous);
  }

  /** What a release does when it renames something: it lifts the old save to the new shape. */
  const renamePurse: SaveMigration = (older) => {
    const { purse, ...state } = older.state as Record<string, unknown>;
    return { ...older, state: { ...state, treasury: purse } };
  };

  it('is lifted to the current format by the migration for its version, and then opens', () => {
    const { game, report, save } = midGameSave(country);

    expect(loadSave(olderSave(save), { [previous]: renamePurse })).toEqual({ game, report });
  });

  it('is lifted one version at a time, in order, when it is several formats old', () => {
    const { game, save } = midGameSave(country);
    const lifted: number[] = [];
    const oldest = withValue(olderSave(save), ['formatVersion'], previous - 1);

    const restored = loadSave(oldest, {
      [previous - 1]: (older) => {
        lifted.push(previous - 1);
        return older;
      },
      [previous]: (older) => {
        lifted.push(previous);
        return renamePurse(older);
      },
    });

    expect(lifted).toEqual([previous - 1, previous]);
    expect(restored.game).toEqual(game);
  });

  it('is refused when the lift leaves it short of what the current format holds', () => {
    const { save } = midGameSave(country);

    expect(refusal(olderSave(save), { [previous]: (older) => older })).toBe(
      'The saved game is damaged and cannot be opened: state.treasury is missing or is not a whole number.',
    );
  });

  it('does not pass a save already in the current format through any migration', () => {
    const { game, save } = midGameSave(country);

    const restored = loadSave(save, {
      [previous]: () => {
        throw new Error('A current save was migrated');
      },
    });

    expect(restored.game).toEqual(game);
  });
});

describe('a save written under other budget limits', () => {
  it('opens on the nearest budget the game now allows', () => {
    const { save } = midGameSave(tavara);
    const outside = {
      taxRatePercent: 90,
      spending: {
        agriculture: 205,
        foodRelief: 1000,
        health: 0,
        education: 70,
        security: 13,
        upkeep: 0,
      },
    };

    const restored = loadSave(withValue(save, ['state', 'budget'], outside));

    expect(restored.game.budget).toEqual({
      taxRatePercent: 40,
      spending: {
        agriculture: 200,
        foodRelief: 200,
        health: 0,
        education: 70,
        security: 10,
        upkeep: 0,
      },
    });
  });
});

describe('the save kept from save format 12', () => {
  it('still opens on the game it was written from, a deposit found and a survey under way', () => {
    const { game, report } = loadSave(format12Save);

    expect(game.date).toEqual({ year: 1, quarter: 3 });
    expect(
      game.projects.map((project) => [project.target, project.status, project.quartersPaid]),
    ).toEqual([
      [{ kind: 'survey', regionId: 'salt-coast' }, 'surveyed', 2],
      [{ kind: 'survey', regionId: 'dry-east' }, 'building', 1],
    ]);
    expect(surveyedRegions(game.projects)).toEqual(['salt-coast']);
    expect(game.country.sites.slice(-2).map((site) => [site.id, site.capacity])).toEqual([
      ['westhaven-mine', capacityOfTonnes(290_000)],
      ['westhaven-trunk-road', undefined],
    ]);
    expect(report?.entries.map((entry) => entry.headline)).toEqual(
      expect.arrayContaining(['Survey finished: Salt Coast', 'Survey begins: The Dry East']),
    );
  });

  it('plays on, the Dry East surveyed, with the Westhaven mine there to be built', () => {
    const { game } = loadSave(format12Save);

    const { state, report } = advanceQuarter(game, answering(game, steward(game)));

    expect(report.entries).toContainEqual(
      expect.objectContaining({
        headline: 'Survey finished: The Dry East',
        cause:
          'The surveyors have reported. They found a deposit of ore whose mine could yield 800,000 t a quarter. Dustwell mine and Trunk road, Dustwell mine to Saltmouth can be built from next quarter.',
      }),
    );
    expect(surveyedRegions(state.projects)).toEqual(['salt-coast', 'dry-east']);
    expect(
      startFault({ ...state, treasury: 2000 }, ['westhaven-mine', 'dustwell-mine']),
    ).toBeNull();
  });

  // This holds for as long as format 12 is the current format: saving must write exactly
  // what the kept save holds. If it fails, what a save holds has changed, which needs a new
  // format version and a migration, and then this check moves to the newer kept save.
  it('is exactly what the game still writes', () => {
    expect(SAVE_FORMAT_VERSION).toBe(12);
    const { game, report } = loadSave(format12Save);

    expect(stored(saveGame(game, report))).toEqual(format12Save);
  });
});

describe('a saved survey is refused', () => {
  const projects = ['state', 'projects'];

  it('when its region is not one of the country’s, or hides no deposit', () => {
    expect(
      refusal(withValue(format12Save, [...projects, 0, 'target', 'regionId'], 'atlantis')),
    ).toBe(
      'The saved game is damaged and cannot be opened: state.projects[0].target.regionId is "atlantis", which is not a region this game has.',
    );
    expect(
      refusal(withValue(format12Save, [...projects, 0, 'target', 'regionId'], 'arden-vale')),
    ).toBe(
      'The saved game is damaged and cannot be opened: state.projects[0].target.regionId is a region where the country hides no deposit.',
    );
  });

  it('when a survey is in use, or a site surveyed', () => {
    expect(refusal(withValue(format12Save, [...projects, 1, 'status'], 'operating'))).toBe(
      'The saved game is damaged and cannot be opened: state.projects[1].status is "operating", which a survey never is.',
    );
    expect(refusal(withValue(format11Save, [...projects, 0, 'status'], 'surveyed'))).toBe(
      'The saved game is damaged and cannot be opened: state.projects[0].status is "surveyed", which a site never is.',
    );
  });

  it('when it has paid for more quarters than the survey takes', () => {
    expect(refusal(withValue(format12Save, [...projects, 1, 'quartersPaid'], 3))).toBe(
      'The saved game is damaged and cannot be opened: state.projects[1].quartersPaid is 3, but the region takes 2 quarters to survey.',
    );
  });

  it('when it builds on a deposit no survey has found', () => {
    const { game } = loadSave(format12Save);
    const [found] = saveGame(game, null).state.projects;
    const building = {
      ...found,
      target: { kind: 'site', siteId: 'dustwell-mine' },
      status: 'building',
      quartersPaid: 0,
      opened: null,
    };
    expect(refusal(withValue(format12Save, projects, [found, building]))).toBe(
      'The saved game is damaged and cannot be opened: state.projects builds on dustwell-mine, a site of a deposit no survey has found.',
    );
  });
});

describe('a saved project for a technology is refused', () => {
  const projects = ['state', 'projects'];
  const research = [...projects, 1];

  it('when the technology is not one the game has', () => {
    expect(refusal(withValue(format11Save, [...research, 'target', 'technology'], 'x'))).toBe(
      'The saved game is damaged and cannot be opened: state.projects[1].target.technology is "x", which is not a technology this game has.',
    );
  });

  it('when research is in use, or a site known', () => {
    expect(refusal(withValue(format11Save, [...research, 'status'], 'decaying'))).toBe(
      'The saved game is damaged and cannot be opened: state.projects[1].status is "decaying", which a technology never is.',
    );
    expect(refusal(withValue(format11Save, [...projects, 0, 'status'], 'known'))).toBe(
      'The saved game is damaged and cannot be opened: state.projects[0].status is "known", which a site never is.',
    );
  });

  it('when it has paid for more quarters than the technology takes to research', () => {
    expect(refusal(withValue(format11Save, [...research, 'quartersPaid'], 5))).toBe(
      'The saved game is damaged and cannot be opened: state.projects[1].quartersPaid is 5, but the technology takes 4 quarters to research.',
    );
  });

  it('when it researches one technology twice', () => {
    const { game } = loadSave(format11Save);
    const [, seed] = saveGame(game, null).state.projects;
    expect(refusal(withValue(format11Save, projects, [seed, seed]))).toBe(
      'The saved game is damaged and cannot be opened: state.projects has two projects for the same thing.',
    );
  });
});
