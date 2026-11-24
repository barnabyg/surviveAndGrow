import { describe, expect, it } from 'vitest';
import tavaraFile from '../../src/countries/tavara.json';
import {
  advanceQuarter,
  createGame,
  depositFind,
  loadCountry,
  onSite,
  siteStatus,
  surveyStatuses,
  technologiesNeeded,
  technologyTerms,
  type Country,
  type GameState,
  type Technology,
} from '../../src/sim';
import { tavaraAsShipped } from './countries';
import { knowing } from './playing';
import { GAME_TIMEOUT, playerNamed } from './scripted';

// What the players that research and survey decide, quarter by quarter. Their whole games, and
// what each records of its research and surveys, are played once, in `players.test.ts`, with
// every other scripted player's.

const chainBuilder = () => playerNamed('Chain builder');

/** The same game with a treasury that pays for anything. */
const rich = (game: GameState): GameState => ({ ...game, treasury: 5000 });

/** The same game with the sites given built and in use, as if built before it. */
function withInUse(game: GameState, siteIds: readonly string[]): GameState {
  return {
    ...game,
    projects: [
      ...game.projects,
      ...siteIds.map((siteId) => ({
        target: onSite(siteId),
        began: game.date,
        quartersPaid: siteStatus(game, siteId).buildQuarters,
        status: 'operating' as const,
        opened: game.date,
      })),
    ],
  };
}

/** The id of the country's first site of a type. */
function siteOfType(country: Country, type: string): string {
  const site = country.sites.find((candidate) => candidate.type === type);
  if (site === undefined) throw new Error(`The country has no ${type}.`);
  return site.id;
}

describe('the improver', () => {
  const improver = () => playerNamed('Improver');
  const fresh = () => createGame(tavaraAsShipped(), 1);
  /** Tavara with its power station in use and money for anything. */
  const withStation = () => {
    const game = fresh();
    return rich(withInUse(game, [siteOfType(game.country, 'powerStation')]));
  };

  it('researches nothing while no site in use stands to gain', () => {
    expect(improver().decide(rich(fresh())).startResearch).toBeUndefined();
  });

  it('plays as the chain builder does until a site is in use', () => {
    let game: GameState = fresh();
    let quarters = 0;
    while (game.projects.every((project) => project.status === 'building')) {
      const decisions = improver().decide(game);
      expect(decisions).toEqual(chainBuilder().decide(game));
      game = advanceQuarter(game, decisions).state;
      quarters += 1;
    }

    expect(quarters).toBeGreaterThan(2);
  });

  it('makes for the technology that improves a site in use, by what that needs first', () => {
    // Grid efficiency improves the station; it needs cold storage, which needs the seed.
    expect(improver().decide(withStation()).startResearch).toBe('droughtResistantSeed');
    expect(improver().decide(knowing(withStation(), ['droughtResistantSeed'])).startResearch).toBe(
      'coldStorage',
    );
    expect(
      improver().decide(knowing(withStation(), ['droughtResistantSeed', 'coldStorage']))
        .startResearch,
    ).toBe('gridEfficiency');
  });

  it('stops once everything that improves what it has in use is known', () => {
    const game = knowing(withStation(), ['droughtResistantSeed', 'coldStorage', 'gridEfficiency']);

    expect(improver().decide(game).startResearch).toBeUndefined();
  });

  it('researches one technology at a time', () => {
    const game = withStation();
    const next = advanceQuarter(game, improver().decide(game)).state;

    expect(improver().decide(rich(next)).startResearch).toBeUndefined();
  });

  it('waits until the money free covers the research', () => {
    const game = { ...withStation(), treasury: 79 };

    expect(improver().decide(game).startResearch).toBeUndefined();
    expect(improver().decide({ ...game, treasury: 80 }).startResearch).toBe('droughtResistantSeed');
  });
});

/** Every technology a technology needs, directly or through others, and itself. */
function wayTo(technology: Technology): Technology[] {
  return [...technologyTerms(technology).prerequisites.flatMap(wayTo), technology];
}

/** The technologies the country's locked sites wait on, with all that those need first. */
function lockingTechnologies(game: GameState): Set<Technology> {
  return new Set(
    game.country.sites.flatMap((site) => siteStatus(game, site.id).lockedBy.flatMap(wayTo)),
  );
}

const typeOf = (game: GameState, siteId: string | undefined) =>
  game.country.sites.find((site) => site.id === siteId)?.type;

const isPowerLine = (game: GameState) => (siteId: string) => typeOf(game, siteId) === 'powerLine';

describe('the unlocker', () => {
  const unlocker = () => playerNamed('Unlocker');
  const fresh = () => createGame(tavaraAsShipped(), 1);

  it('makes for what a locked site needs from the first quarter the money covers it', () => {
    const game = fresh();
    const { startResearch } = unlocker().decide(rich(game));

    expect(unlocker().decide({ ...game, treasury: 20 }).startResearch).toBeUndefined();
    expect(startResearch).toBeDefined();
    expect(lockingTechnologies(game)).toContain(startResearch);
  });

  it('researches on, one technology after another, until nothing is locked', () => {
    let game = rich(fresh());
    const needed = lockingTechnologies(game);
    const researched: Technology[] = [];
    for (;;) {
      const { startResearch } = unlocker().decide(game);
      if (startResearch === undefined || startResearch === null) break;
      researched.push(startResearch);
      game = knowing(game, [startResearch]);
    }

    expect(new Set(researched)).toEqual(needed);
    expect(
      game.country.sites.filter((site) => siteStatus(game, site.id).state === 'locked'),
    ).toEqual([]);
  });

  it('gives up nothing for a locked site: it builds the power station, and then researches nothing for the dam that closes', () => {
    let game = rich(fresh());
    const dam = siteOfType(game.country, 'dam');
    const started: string[] = [];
    const researched: Technology[] = [];
    for (let quarter = 0; quarter < 12; quarter += 1) {
      const decisions = unlocker().decide(game);
      started.push(...(decisions.startProjects ?? []));
      if (decisions.startResearch) researched.push(decisions.startResearch);
      game = rich(advanceQuarter(game, decisions).state);
    }

    // Tavara's dam is an alternative to its power station, which the chain builder builds first.
    expect(typeOf(game, started[0])).toBe('powerStation');
    expect(siteStatus(game, dam)).toMatchObject({ state: 'closed', lockedBy: [] });
    // Only what the clinics and schools wait on is researched: hydropower's long way is not.
    expect(researched).toEqual(['publicHealth', 'teacherTraining']);
    expect(started.map((id) => typeOf(game, id))).toEqual(
      expect.arrayContaining(['clinic', 'school']),
    );
  });

  it('builds what it has unlocked before anything else, clinics and schools among it', () => {
    let game = rich(knowing(fresh(), [...lockingTechnologies(fresh())]));
    const unlocked = game.country.sites
      .filter((site) => technologiesNeeded(site).length > 0)
      .map((site) => site.id);
    const started: string[] = [];
    for (let quarter = 0; quarter < 40 && !started.some(isPowerLine(game)); quarter += 1) {
      const decisions = unlocker().decide(game);
      started.push(...(decisions.startProjects ?? []));
      game = rich(advanceQuarter(game, decisions).state);
    }
    const types = started.map((id) => typeOf(game, id));

    expect(started.slice(0, unlocked.length)).toEqual(unlocked);
    expect(types).toEqual(expect.arrayContaining(['dam', 'clinic', 'school']));
    expect(types.at(-1)).toBe('powerLine');
    expect(types).not.toContain('powerStation');
  });
});

describe('the unlocker holding out', () => {
  const holdingOut = () => playerNamed('Unlocker holding out');
  const fresh = () => createGame(tavaraAsShipped(), 1);

  it('leaves alone the power station its dam would stand in for, and the lines from it', () => {
    let game = rich(fresh());
    const started: string[] = [];
    for (let quarter = 0; quarter < 6; quarter += 1) {
      const decisions = holdingOut().decide(game);
      started.push(...(decisions.startProjects ?? []));
      game = rich(advanceQuarter(game, decisions).state);
    }
    const types = started.map((id) => typeOf(game, id));

    // Tavara's dam is an alternative to its power station, which the lines depend on.
    expect(types[0]).toBe('port');
    expect(types).not.toContain('powerStation');
    expect(types).not.toContain('powerLine');
  });

  it('researches on to the dam, and builds the lines once it is begun', () => {
    let game = rich(knowing(fresh(), [...lockingTechnologies(fresh())]));
    const started: string[] = [];
    for (let quarter = 0; quarter < 40 && !started.some(isPowerLine(game)); quarter += 1) {
      const decisions = holdingOut().decide(game);
      started.push(...(decisions.startProjects ?? []));
      game = rich(advanceQuarter(game, decisions).state);
    }
    const types = started.map((id) => typeOf(game, id));

    expect(types).toContain('dam');
    expect(types.at(-1)).toBe('powerLine');
    expect(types).not.toContain('powerStation');
  });
});

describe('the prospector', () => {
  const prospector = () => playerNamed('Prospector');
  const fresh = (seed = 1) => createGame(tavaraAsShipped(), seed);
  const unsurveyed = (game: GameState) =>
    surveyStatuses(game, {})
      .filter((region) => region.state === 'unsurveyed')
      .map((region) => region.regionId);

  it('surveys every region where ore may lie as soon as the money covers it', () => {
    const game = fresh();

    expect(unsurveyed(game).length).toBeGreaterThan(1);
    expect(prospector().decide(rich(game)).startSurveys).toEqual(unsurveyed(game));
  });

  it('surveys ahead of its first site, one region at a time if that is all it can pay for', () => {
    const game = { ...fresh(), treasury: surveyStatuses(fresh(), {})[0]?.cost ?? 0 };
    const decisions = prospector().decide(game);

    expect(decisions.startSurveys).toEqual(unsurveyed(game).slice(0, 1));
    expect(decisions.startProjects).toEqual([]);
  });

  it('surveys a region once', () => {
    const game = rich(fresh());
    const next = rich(advanceQuarter(game, prospector().decide(game)).state);

    expect(prospector().decide(next).startSurveys).toBeUndefined();
  });

  it('plays as the chain builder does where there is nothing to survey', () => {
    let game: GameState = createGame(loadCountry({ ...tavaraFile, deposits: [] }), 1);
    for (let quarter = 0; quarter < 8 && game.outcome.status === 'playing'; quarter += 1) {
      const decisions = prospector().decide(game);
      expect(decisions).toEqual(chainBuilder().decide(game));
      game = advanceQuarter(game, decisions).state;
    }
  });

  it(
    'builds the road and the mine of a deposit found after the chain’s own',
    () => {
      const country = tavaraAsShipped();
      const seed = Array.from({ length: 50 }, (_, index) => index + 1).find((each) =>
        country.deposits.some((deposit) => depositFind(each, deposit) !== null),
      );
      if (seed === undefined) throw new Error('No seed finds a deposit.');
      const found = country.deposits.filter((deposit) => depositFind(seed, deposit) !== null);
      let game = rich(fresh(seed));
      const started: string[] = [];
      for (let quarter = 0; quarter < 16; quarter += 1) {
        const decisions = prospector().decide(game);
        started.push(...(decisions.startProjects ?? []));
        game = rich(advanceQuarter(game, decisions).state);
      }
      const types = started.map((id) => typeOf(game, id));
      const ownMine = types.indexOf('mine');
      const firstSmall = types.indexOf('irrigation');

      expect(ownMine).toBeGreaterThan(-1);
      expect(firstSmall).toBeGreaterThan(-1);
      for (const deposit of found) {
        const route = started.indexOf(deposit.route.id);
        expect(route).toBeGreaterThan(ownMine);
        expect(started.indexOf(deposit.mine.id)).toBe(route + 1);
        expect(firstSmall).toBeGreaterThan(route + 1);
      }
      // Sixteen quarters of a scripted player, which takes longer while the suite runs alongside.
    },
    GAME_TIMEOUT,
  );
});
