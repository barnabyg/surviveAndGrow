import { describe, expect, it } from 'vitest';
import tavaraFile from '../../src/countries/tavara.json';
import {
  advanceQuarter,
  approvalStatus,
  createGame,
  electionStatus,
  loadSave,
  pendingDilemma,
  SAVE_FORMAT_VERSION,
  SaveError,
  saveGame,
  siteStatus,
  termRecords,
  victoryStatus,
  type Budget,
  type Country,
  type Decisions,
  type GameState,
  type SaveMigration,
  type TurnReport,
} from '../../src/sim';
import testlandFile from '../countries/testland.json';
import format1Save from '../saves/format-1.json';
import format2Save from '../saves/format-2.json';
import format3Save from '../saves/format-3.json';
import format4Save from '../saves/format-4.json';
import {
  bothCountries,
  tavara,
  tavaraAsShipped,
  testlandAsShipped,
  withChances,
} from './countries';
import { valueAt, withValue, without, type Path } from './files';
import { answering, inFirstTerm, steward } from './players';

/** A save as it comes back out of storage: text, read again. */
function stored(save: unknown): unknown {
  return JSON.parse(JSON.stringify(save)) as unknown;
}

/** Each country, and the region that drought is made to strike in it. */
const countries = [
  { name: 'Tavara', file: tavaraFile, shipped: tavaraAsShipped, dry: 'dry-east' },
  { name: 'Testland', file: testlandFile, shipped: testlandAsShipped, dry: 'sandreach' },
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

    expect(save.formatVersion).toBe(4);
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
  ({ file, shipped, dry }) => {
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

    expect(refusal(withValue(save, ['formatVersion'], 5))).toBe(
      'The saved game was written by a newer release of the game (save format 5; this release reads format 4). Open it with that release.',
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

    expect(refusal(withValue(save, ['country', 'file', 'formatVersion'], 4))).toBe(
      'The saved game’s country cannot be loaded, so the game cannot be opened. formatVersion is 4, but this game reads versions 1 to 3.',
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
      ['state', 'projects', 0, 'siteId'],
      'moon-base',
      'state.projects[0].siteId is "moon-base", which is not a site this game has',
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
    expect(game.projects.map((project) => [project.siteId, project.status])).toEqual([
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
    expect(victoryStatus(game)).toEqual({ tier: 'prosperous', held: 2, needed: 4 });
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
      budget: {
        taxRatePercent: 10,
        spending: { ...state.budget.spending, health: 200, education: 200 },
      },
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
        budget: { ...game.budget, spending: { ...game.budget.spending, upkeep: 20 } },
      }),
    );
    game = result.state;

    expect(siteStatus(game, 'lowmere-road').state).toBe('operating');
    expect(result.report.entries.map((entry) => entry.headline)).toContain(
      'Restored: Farm road, Arden to Lowmere',
    );
  });

  // This holds for as long as format 4 is the current format: saving must write exactly
  // what the kept save holds. If it fails, what a save holds has changed, which needs a new
  // format version and a migration, and then this check moves to the newer kept save.
  it('is exactly what the game still writes', () => {
    expect(SAVE_FORMAT_VERSION).toBe(4);
    const { game, report } = loadSave(format4Save);

    expect(stored(saveGame(game, report))).toEqual(format4Save);
  });
});
