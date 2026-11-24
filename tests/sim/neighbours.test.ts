import { describe, expect, it } from 'vitest';
import tavaraFile from '../../src/countries/tavara.json';
import {
  advanceQuarter,
  balance,
  budgetLimits,
  COUNTRY_FORMAT_VERSION,
  createGame,
  deterrenceStatus,
  INTENTION_NAMES,
  INTENTIONS,
  loadCountry,
  loadSave,
  previewQuarter,
  risksAhead,
  saveGame,
  TIER_NAMES,
  TIERS,
  type Budget,
  type Country,
  type GameState,
  type Intention,
  type TurnReport,
} from '../../src/sim';
import { budgetFrom } from '../budgets';
import {
  beforeAmbition,
  beforeFactions,
  bothCountries,
  tavaraAsShipped,
  testlandAsShipped,
  withChances,
} from './countries';
import { faultsOf, withValue } from './files';
import { steward } from './playing';
import { GAME_TIMEOUT, playerNamed } from './scripted';
import { enriched, established, fileOf, FILES } from './worthTaking';

const { deterrence: pace, worthTakingPermille, intentions: marks } = balance.neighbours;

/** A country in which nothing is left to chance: no drought, flood, dilemma, shock or growth. */
const quiet = (name: string): Country => withChances(fileOf(name), {});

/**
 * A country that grows rich: its regions produce many times over, its treasury is full, and
 * it starts with nothing spent on health or education, so that spending on them then carries
 * it up through the tiers. Nothing in it is left to chance.
 */
function rich(name: string): Country {
  const copy = enriched(fileOf(name), name);
  copy.start.budget.spending.health = 0;
  copy.start.budget.spending.education = 0;
  return withChances(copy, {});
}

/** The budget in force with Defence as given. */
const defending = (game: GameState, defence: number): Budget =>
  budgetFrom(game.budget, { spending: { defence } });

/**
 * The budget in force with health and education spending raised as far as either can usefully
 * go, and Defence as given.
 */
function prospering(game: GameState, defence: number): Budget {
  const people = game.regions.reduce((total, region) => total + region.population, 0);
  const most = budgetLimits.spending.max;
  const amount = Math.min(most, Math.ceil((1000 * people) / 11_000_000 / 10) * 10);
  return budgetFrom(game.budget, { spending: { health: amount, education: amount, defence } });
}

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

/** Each neighbour's intention, in the country file's order. */
const intentionsIn = (game: GameState): Intention[] =>
  deterrenceStatus(game).neighbours.map((neighbour) => neighbour.intention);

/** The worst any neighbour intends. */
const worstIn = (game: GameState): Intention =>
  INTENTIONS.findLast((intention) => intentionsIn(game).includes(intention)) ?? 'peaceful';

/** A report's entries about the neighbours. */
const told = (report: TurnReport) => report.entries.filter((entry) => entry.kind === 'neighbour');

describe('intentions', () => {
  it('are peaceful, watchful and hostile, from the best to the worst', () => {
    expect(INTENTIONS).toEqual(['peaceful', 'watchful', 'hostile']);
    expect(INTENTIONS.map((intention) => INTENTION_NAMES[intention])).toEqual([
      'Peaceful',
      'Watchful',
      'Hostile',
    ]);
  });
});

describe.each(bothCountries)('neighbours of %s', (name, country) => {
  it('open peaceful, every one, with deterrence settled where the starting Defence holds it', () => {
    const start = createGame(country(), 7);
    const status = deterrenceStatus(start);
    expect(status.neighbours.map((neighbour) => neighbour.neighbourId)).toEqual(
      start.country.map.neighbours.map((neighbour) => neighbour.id),
    );
    expect(status.neighbours.length).toBeGreaterThan(0);
    for (const neighbour of status.neighbours) {
      expect(neighbour.ambition).toBeGreaterThan(0);
      expect(neighbour.intention).toBe('peaceful');
    }
    expect(status.tier).toBe('subsistence');
    expect(status.deterrence).toBeGreaterThan(0);
    expect(status.settles).toBe(status.deterrence);

    // On the budget it starts with, nothing moves.
    const { states, reports } = play(
      createGame(quiet(name), 7),
      4,
      (game) => game.country.start.budget,
    );
    for (const state of states) {
      expect(deterrenceStatus(state).deterrence).toBe(status.deterrence);
      expect(worstIn(state)).toBe('peaceful');
    }
    for (const report of reports) {
      expect(report.deterrence).toEqual({
        value: status.deterrence,
        change: 0,
        contributions: [{ label: 'Defence spending', amount: 0 }],
      });
      expect(told(report)).toEqual([]);
    }
  });

  it('turn hostile as the country passes tiers with Defence left where it started, and stay short of it with Defence raised ahead', () => {
    const start = createGame(rich(name), 7);
    expect(start.tier).toBe('subsistence');
    expect(worstIn(start)).toBe('peaceful');
    const kept = start.country.start.budget.spending.defence;

    // Left low: the country grows rich on the Defence it started with.
    const low = play(start, 40, (game) => prospering(game, kept));
    const turns = low.states.findIndex((state) => worstIn(state) === 'hostile');
    expect(turns).toBeGreaterThan(0);
    const hostile = low.states[turns];
    const before = low.states[turns - 1];
    if (hostile === undefined || before === undefined) throw new Error('No neighbour turned');
    // It took passing tiers: deterrence never moved, and the country is no longer where it began.
    expect(TIERS.indexOf(hostile.tier)).toBeGreaterThan(TIERS.indexOf('developing'));
    expect(hostile.deterrence).toBe(start.deterrence);
    for (const state of low.states.slice(0, turns)) expect(worstIn(state)).not.toBe('hostile');

    // The quarter it turned says so, names the neighbour and gives the tier as why.
    const neighbour = deterrenceStatus(hostile).neighbours.find(
      (each) => each.intention === 'hostile',
    );
    const entry = told(low.reports[turns - 1] ?? reportless()).find(
      (each) => each.neighbourId === neighbour?.neighbourId,
    );
    expect(entry).toMatchObject({
      kind: 'neighbour',
      seriousness: 'serious',
      headline: `${neighbour?.name ?? ''} has turned hostile`,
    });
    expect(entry?.cause).toContain('The country has reached');
    expect(entry?.cause).toContain('a state more worth taking');
    expect(entry?.cause).toContain('Defence spending is');

    // And the risks ahead listed it, with a likelihood, before it came.
    const warned = risksAhead(before, steward(before, prospering(before, kept))).find(
      (risk) => risk.kind === 'neighbour' && risk.neighbourId === neighbour?.neighbourId,
    );
    expect(warned).toMatchObject({ headline: `${neighbour?.name ?? ''} turning hostile` });
    expect(warned?.likelihood).toBeDefined();
    expect(warned?.withinQuarters).toBe(1);
    expect(warned?.reason).toContain('The country is on course to reach');
    // It names the mark the neighbour is hostile below, not what its ambition weighs.
    expect(warned?.reason).toMatch(/is hostile while deterrence is below \d+\.\d%/);

    // Raised ahead: the same game with Defence doubled from the first quarter. The country
    // passes the same tiers, and no neighbour turns hostile.
    const raised = play(start, 40, (game) => prospering(game, kept * 2));
    expect(raised.states.map((state) => state.tier).slice(0, turns + 1)).toEqual(
      low.states.map((state) => state.tier).slice(0, turns + 1),
    );
    for (const state of raised.states) expect(worstIn(state)).not.toBe('hostile');
    expect(raised.states.at(-1)?.deterrence).toBeGreaterThan(start.deterrence);
    expect(
      raised.reports.flatMap(told).filter((each) => each.headline.endsWith('turned hostile')),
    ).toEqual([]);
  });

  it('are deterred by a figure that moves a share of the way each quarter, slow to lose and slow to build', () => {
    const start = createGame(quiet(name), 7);
    const cut = budgetFrom(start.country.start.budget, { spending: { defence: 0 } });
    expect(deterrenceStatus(start, cut).settles).toBe(0);

    // Lost slowly: each quarter closes the same share of what is left, rounded up.
    const down = play(start, 6, () => cut);
    for (const [index, state] of down.states.slice(1).entries()) {
      const was = down.states[index]?.deterrence ?? 0;
      expect(was - state.deterrence).toBe(Math.ceil((was * pace.adjustPermillePerQuarter) / 1000));
      const figure = down.reports[index]?.deterrence;
      expect(figure?.value).toBe(state.deterrence);
      expect(figure?.contributions.reduce((total, line) => total + line.amount, 0)).toBe(
        figure?.change,
      );
    }
    expect(down.states.at(-1)?.deterrence).toBeGreaterThan(start.deterrence / 3);

    // Built slowly: the most the slider allows settles it higher, and it climbs there a share
    // of the way at a time, never reaching the whole.
    const most = budgetFrom(start.country.start.budget, {
      spending: { defence: budgetLimits.spending.max },
    });
    const top = deterrenceStatus(start, most).settles;
    expect(top).toBeGreaterThan(start.deterrence);
    expect(top).toBeLessThan(1000);
    // It is played where the treasury can pay for it.
    const up = play(createGame(established(name), 7), 6, () => most);
    for (const [index, state] of up.states.slice(1).entries()) {
      const was = up.states[index]?.deterrence ?? 0;
      expect(state.deterrence - was).toBe(
        Math.ceil(((top - was) * pace.adjustPermillePerQuarter) / 1000),
      );
    }
    expect(up.states.at(-1)?.deterrence).toBeLessThan(top);
  });

  it('is judged per head against what the army expects: half at the share balance data gives', () => {
    const start = createGame(quiet(name), 7);
    const status = deterrenceStatus(start);
    expect(status.spent).toBe(start.country.start.budget.spending.defence);
    const people = start.regions.reduce((total, region) => total + region.population, 0);
    const expected = (balance.army.loyalty.defence.expectedPerMillionPeople * people) / 1_000_000;
    expect(status.expected).toBe(Math.round(expected));
    const half = (pace.halfAtPermilleOfExpected * expected) / 1000;
    expect(status.settles).toBe(Math.floor((1000 * status.spent) / (status.spent + half)));
  });

  it('are forecast by the preview: deterrence and each intention next quarter, and where they are heading', () => {
    // The country is worth taking, and Defence is cut to nothing.
    let game = createGame(established(name), 7);
    expect(game.tier).toBe('developing');
    const seen: Intention[] = [];
    for (let quarter = 0; quarter < 10 && game.outcome.status === 'playing'; quarter += 1) {
      const decisions = steward(game, defending(game, 0));
      const preview = previewQuarter(game, decisions);
      const next = advanceQuarter(game, decisions).state;
      expect(preview.deterrence).toEqual({ min: next.deterrence, max: next.deterrence });
      expect(preview.deterrenceHeading).toEqual({ min: 0, max: 0 });
      expect(preview.neighbours.map((neighbour) => neighbour.intention)).toEqual(
        intentionsIn(next),
      );
      expect(preview.neighbours.map((neighbour) => neighbour.neighbourId)).toEqual(
        next.country.map.neighbours.map((neighbour) => neighbour.id),
      );
      // With nothing spent every neighbour is heading for hostile, and the status says the same.
      expect(preview.neighbours.map((neighbour) => neighbour.heading)).toEqual(
        intentionsIn(next).map(() => 'hostile'),
      );
      expect(
        deterrenceStatus(game, decisions.budget).neighbours.map((each) => each.settlesIntention),
      ).toEqual(intentionsIn(game).map(() => 'hostile'));
      seen.push(worstIn(next));
      game = next;
    }
    expect(seen.at(-1)).toBe('hostile');
  });

  it('report each change of intention as deterrence falls, and again as it is rebuilt', () => {
    const grown = createGame(established(name), 7);
    const [first] = deterrenceStatus(grown).neighbours;
    if (first === undefined) throw new Error('The country has no neighbour');
    const about = (reports: readonly TurnReport[]) =>
      reports.flatMap(told).filter((entry) => entry.neighbourId === first.neighbourId);

    // Defence is cut to nothing until the neighbour is hostile.
    const down = play(grown, 10, (game) => defending(game, 0));
    const turned = down.states.findIndex(
      (state) => deterrenceStatus(state).neighbours[0]?.intention === 'hostile',
    );
    expect(turned).toBeGreaterThan(0);
    const fallen = about(down.reports.slice(0, turned));
    expect(fallen.at(-1)).toMatchObject({
      headline: `${first.name} has turned hostile`,
      seriousness: 'serious',
    });
    expect(fallen.at(-1)?.cause).toContain('Deterrence has fallen to');
    expect(fallen.at(-1)?.cause).toContain(`under which ${first.name} is hostile`);
    expect(fallen.at(-1)?.cause).toContain('Defence spending is $0.0m a quarter');
    // A neighbour that was peaceful grew watchful on the way, with a warning.
    if (first.intention === 'peaceful') {
      expect(fallen.map((entry) => [entry.headline, entry.seriousness])).toEqual([
        [`${first.name} has turned watchful`, 'warning'],
        [`${first.name} has turned hostile`, 'serious'],
      ]);
    }

    // Defence restored at the most the slider allows: deterrence is rebuilt, and it eases.
    const hostile = down.states[turned];
    if (hostile === undefined) throw new Error('The neighbour never turned');
    const up = play(hostile, 12, (game) => defending(game, budgetLimits.spending.max));
    const eased = about(up.reports);
    expect(eased.map((entry) => [entry.headline, entry.seriousness])).toEqual([
      [`${first.name} is watchful again`, 'notable'],
      [`${first.name} is peaceful again`, 'notable'],
    ]);
    expect(eased[0]?.cause).toContain('Deterrence has risen to');
    expect(eased[0]?.cause).toContain(`no longer below the`);
    expect(eased[1]?.cause).toContain(`under which ${first.name} is watchful`);
  });

  it('are read by the marks in balance data, from what the ambition weighs in the tier in force', () => {
    const grown = createGame(established(name), 7);
    const status = deterrenceStatus(grown);
    expect(status.worthTaking).toBe(worthTakingPermille[grown.tier]);
    for (const neighbour of status.neighbours) {
      expect(neighbour.weighs).toBe(Math.floor((neighbour.ambition * status.worthTaking) / 1000));
      expect(neighbour.hostileBelow).toBe(
        Math.ceil((neighbour.weighs * marks.hostileBelowPermilleOfWeight) / 1000),
      );
      expect(neighbour.watchfulBelow).toBe(
        Math.ceil((neighbour.weighs * marks.watchfulBelowPermilleOfWeight) / 1000),
      );
      const expected: Intention =
        status.deterrence < neighbour.hostileBelow
          ? 'hostile'
          : status.deterrence < neighbour.watchfulBelow
            ? 'watchful'
            : 'peaceful';
      expect(neighbour.intention).toBe(expected);
    }
    // At Subsistence the country has nothing worth taking, whatever is spent on Defence.
    expect(worthTakingPermille.subsistence).toBe(0);
  });

  it('are kept through a save: deterrence, and with it every intention', () => {
    const grown = play(createGame(rich(name), 7), 5, (game) => prospering(game, 0));
    const game = grown.states.at(-1);
    const report = grown.reports.at(-1) ?? null;
    if (game === undefined) throw new Error('No quarter was played');
    const restored = loadSave(JSON.parse(JSON.stringify(saveGame(game, report))));
    expect(restored.game.deterrence).toBe(game.deterrence);
    expect(deterrenceStatus(restored.game)).toEqual(deterrenceStatus(game));
    expect(restored.report?.deterrence).toEqual(report?.deterrence);
    expect(restored.report?.entries).toEqual(report?.entries);
  });
});

/**
 * The countries as they ship, each played by a scripted player that carries it past a tier
 * within its game, once with Defence low and once with it high. Tavara's neighbours stir at
 * the Defence it ships with, so its low game is as shipped and its high one raises Defence
 * from the first quarter. Testland ships spending six times what its army expects, which
 * deters Elsewhere at every tier a scripted player reaches, so its low game cuts Defence to
 * nothing and its high one keeps what it ships with.
 */
const shippedGames = [
  {
    name: 'Tavara',
    country: tavaraAsShipped,
    player: 'Timing trader',
    seed: 1,
    quarters: 30,
    low: null,
    high: 50,
  },
  {
    name: 'Testland',
    country: testlandAsShipped,
    player: 'Sensible',
    seed: 1,
    quarters: 8,
    low: 0,
    high: null,
  },
] as const;

describe.each(shippedGames)(
  'the neighbours of $name as it ships, in a game of $player',
  ({ country, player, seed, quarters, low, high }) => {
    /** The player's game with Defence held at a figure, or left as the player has it. */
    function played(defence: number | null): GameState[] {
      const { decide } = playerNamed(player);
      const states = [createGame(country(), seed)];
      for (let quarter = 0; quarter < quarters; quarter += 1) {
        const game = states.at(-1);
        if (game?.outcome.status !== 'playing') break;
        const decided = decide(game);
        const budget =
          defence === null ? decided.budget : budgetFrom(decided.budget, { spending: { defence } });
        states.push(advanceQuarter(game, { ...decided, budget }).state);
      }
      return states;
    }

    it(
      'are peaceful at Subsistence, turn hostile past a tier with Defence low, and stay short of it in the same game with Defence high',
      () => {
        const lowGame = played(low);
        // At Subsistence the country has nothing worth taking, whatever is spent on Defence.
        const poor = lowGame.filter((state) => state.tier === 'subsistence');
        expect(poor.length).toBeGreaterThan(0);
        for (const state of poor) expect(worstIn(state)).toBe('peaceful');

        // Past a tier, a neighbour turns hostile.
        const turnedAt = lowGame.findIndex((state) => worstIn(state) === 'hostile');
        expect(turnedAt).toBeGreaterThan(0);
        const turned = lowGame[turnedAt];
        if (turned === undefined) throw new Error('No neighbour turned hostile');
        const hostile = deterrenceStatus(turned).neighbours.find(
          (neighbour) => neighbour.intention === 'hostile',
        );
        expect(turned.tier).not.toBe('subsistence');
        expect(hostile).toBeDefined();

        // The same game with Defence high passes the same tiers by then, and that neighbour
        // has stayed short of hostile all the way.
        const highGame = played(high);
        const there = highGame[turnedAt];
        expect(there).toBeDefined();
        expect(TIERS.indexOf(there?.tier ?? 'subsistence')).toBeGreaterThanOrEqual(
          TIERS.indexOf(turned.tier),
        );
        expect(there?.deterrence).toBeGreaterThan(turned.deterrence);
        for (const state of highGame.slice(0, turnedAt + 1)) {
          const intends = deterrenceStatus(state).neighbours.find(
            (neighbour) => neighbour.neighbourId === hostile?.neighbourId,
          )?.intention;
          expect(intends).not.toBe('hostile');
        }
      },
      GAME_TIMEOUT,
    );
  },
);

describe('a tier that only the world ore price carries the country past', () => {
  // Tavara as it ships, played by the chain builder: late in the game its mines earn and its
  // prosperity hovers just under Prosperous, where Selama weighs more than deterrence. Whether
  // a quarter passes the tier then turns on that quarter's world ore price alone.
  const next = (game: GameState) => TIERS[TIERS.indexOf(game.tier) + 1];
  /** Whether a neighbour not yet hostile would be in the next tier, with deterrence as it is. */
  const wouldTurn = (game: GameState, neighbourId: string): boolean => {
    const above = next(game);
    const neighbour = deterrenceStatus(game).neighbours.find(
      (each) => each.neighbourId === neighbourId,
    );
    if (above === undefined || neighbour === undefined || neighbour.intention === 'hostile') {
      return false;
    }
    const mark = Math.ceil((neighbour.weighsIn[above] * marks.hostileBelowPermilleOfWeight) / 1000);
    return game.deterrence < mark;
  };

  it(
    'is listed in the risks ahead as what a rise in the ore price would bring',
    () => {
      const player = playerNamed('Chain builder');
      let game: GameState = createGame(tavaraAsShipped(), 3);
      let onTheEdge = 0;
      let byTheRise = 0;
      let turnedForReal = 0;
      for (let quarter = 0; quarter < 44 && game.outcome.status === 'playing'; quarter += 1) {
        const decisions = player.decide(game);
        const above = next(game);
        // The preview gives prosperity as the range the world prices' limits allow. A quarter
        // is on the edge when the next tier begins inside that range.
        const { prosperity } = previewQuarter(game, decisions);
        const from = above === undefined ? null : balance.prosperity.tiers[above].fromPermille;
        if (from !== null && prosperity.min < from && prosperity.max >= from) {
          const risks = risksAhead(game, decisions);
          for (const neighbour of game.country.map.neighbours) {
            if (!wouldTurn(game, neighbour.id)) continue;
            onTheEdge += 1;
            const listed = risks.find(
              (risk) => risk.kind === 'neighbour' && risk.neighbourId === neighbour.id,
            );
            expect(listed, `quarter ${quarter}, ${neighbour.name}`).toBeDefined();
            if (listed?.reason.startsWith('Should the world ore price rise to') !== true) continue;
            byTheRise += 1;
            expect(listed.likelihood).toBe('unlikely');
            expect(listed.reason).toContain(
              `the country would reach ${TIER_NAMES[above ?? 'prosperous']}`,
            );
            // And it is no idle warning: the same quarter on other seeds, whose markets move
            // the ore price otherwise, does turn the neighbour hostile on some and not others.
            const turned = Array.from({ length: 30 }, (_, index) => index + 1).filter((seed) => {
              const after = advanceQuarter({ ...game, seed }, decisions).state;
              return (
                deterrenceStatus(after).neighbours.find((each) => each.neighbourId === neighbour.id)
                  ?.intention === 'hostile'
              );
            });
            expect(turned.length).toBeGreaterThan(0);
            expect(turned.length).toBeLessThan(30);
            turnedForReal += turned.length;
          }
        }
        game = advanceQuarter(game, decisions).state;
      }
      // The game does come to that edge, and at least once only the rise would carry it over.
      expect(onTheEdge).toBeGreaterThan(0);
      expect(byTheRise).toBeGreaterThan(0);
      expect(turnedForReal).toBeGreaterThan(0);
    },
    GAME_TIMEOUT,
  );
});

describe('a neighbour’s ambition in a country file', () => {
  const ambition = ['map', 'neighbours', 0, 'ambition'] as const;

  it('is a whole percentage from 0 to 100, held in thousandths', () => {
    expect(COUNTRY_FORMAT_VERSION).toBe(13);
    const { mostAmbitionPercent } = balance.neighbours;
    expect(mostAmbitionPercent).toBe(100);
    const country = loadCountry(withValue(tavaraFile, ambition, 35));
    expect(country.map.neighbours[0]?.ambition).toBe(350);
    for (const [wrong, problem] of [
      [101, 'is 101, but must be a whole number from 0 to 100'],
      [-1, 'is -1, but must be a whole number from 0 to 100'],
      [12.5, 'is 12.5, but must be a whole number from 0 to 100'],
      ['high', 'must be a number, but is text'],
    ] as const) {
      expect(faultsOf(withValue(tavaraFile, ambition, wrong))).toEqual([
        `map.neighbours[0].ambition ${problem}.`,
      ]);
    }
  });

  it('may be left out, and a neighbour without one stays peaceful whatever the country does', () => {
    const file = structuredClone(tavaraFile) as { map: { neighbours: { ambition?: number }[] } };
    for (const neighbour of file.map.neighbours) delete neighbour.ambition;
    const country = loadCountry(file);
    expect(country.map.neighbours.map((neighbour) => neighbour.ambition)).toEqual([0, 0]);
  });

  it.each(Object.entries(FILES))(
    'cannot be given by a file of an older format, whose neighbours stay peaceful for good: %s',
    (name, file) => {
      expect(faultsOf({ ...(beforeFactions(file) as typeof file), formatVersion: 11 })).toEqual(
        file.map.neighbours.map(
          (_, index) => `map.neighbours[${index}].ambition needs country file format 12 or later.`,
        ),
      );

      // The same file as format 11 could write it grows rich with nothing spent on Defence,
      // and its neighbours never stir.
      const older = withChances(enriched(beforeAmbition(file), name), {});
      expect(older.formatVersion).toBe(11);
      const { states, reports } = play(createGame(older, 7), 8, (game) => prospering(game, 0));
      expect(states.at(-1)?.tier).not.toBe('subsistence');
      for (const state of states) {
        expect(deterrenceStatus(state).neighbours.map((each) => each.ambition)).toEqual(
          state.country.map.neighbours.map(() => 0),
        );
        expect(worstIn(state)).toBe('peaceful');
      }
      expect(reports.flatMap(told)).toEqual([]);
    },
  );
});

/** Stands in for a report that a test has already shown to be there. */
function reportless(): TurnReport {
  throw new Error('The quarter has no report');
}
