import { describe, expect, it } from 'vitest';
import {
  advanceQuarter,
  createGame,
  quarterNumber,
  risksAhead,
  shockName,
  type Country,
  type Decisions,
  type GameState,
  type ActiveEvent,
  type PriceShock,
  type Risk,
} from '../../src/sim';
import { answering, inFirstTerm } from './playing';

/** How many seeds the sweep plays. */
const SEEDS = 300;

/** The seeds from 1 to SEEDS, in runs of a number of seeds each: [first, last] of each run. */
const runsOf = (seedsPerTest: number) =>
  Array.from({ length: SEEDS / seedsPerTest }, (_, index): [number, number] => [
    index * seedsPerTest + 1,
    (index + 1) * seedsPerTest,
  ]);

const idle = (game: GameState): Decisions => ({ budget: game.budget });
// A dilemma must be answered, so this player takes the option that costs nothing.
const doNothing = (game: GameState) => answering(game, idle(game));

const famineIn = (risks: readonly Risk[], regionId: string) =>
  risks.find((risk) => risk.kind === 'famine' && risk.regionId === regionId);
const floodIn = (risks: readonly Risk[], regionId: string) =>
  risks.find(
    (risk) =>
      risk.kind === 'event' && risk.regionId === regionId && risk.headline.startsWith('Flood'),
  );
const shockIn = (risks: readonly Risk[], headline: string) =>
  risks.find((risk) => risk.kind === 'priceShock' && risk.headline === headline);
const ofKind = (risks: readonly Risk[], kind: Risk['kind']) =>
  risks.find((risk) => risk.kind === kind);

/**
 * The fairness rule: nothing that ends the game may come unannounced. A player who does
 * nothing is played over many seeds. Every game that famine ended must have listed famine in
 * that region while the player could still act: in the quarter before the last one at the
 * latest, and in the quarters leading up to it. Every game lost at the vote must have listed
 * defeat in the election quarter and in the quarter before it. And no loss from a flood comes
 * unannounced: every flood must have been listed in the quarter before it began, the last in
 * which the player could act before its damage was done. Nor does any from a world price
 * shock: every shock must have been listed as one that could come in the quarter before it
 * was announced, and as announced in every quarter from then until it first moved its price.
 * With `floods` or `shocks` set, the sweep also checks that they really do come.
 *
 * Three hundred whole games, each looked ahead from every quarter, take seconds, so each test
 * plays a run of them and the last tests check the runs together. Where floods or shocks are
 * likely, looking ahead before each of them takes longer, so the runs are shorter. Each country is
 * swept in a file of its own, so that the sweeps share out across the workers.
 */
/** How long one run of a sweep may take. */
const SWEEP_TIMEOUT_MS = 20_000;

export function sweepDoingNothing(
  name: string,
  country: () => Country,
  {
    floods = false,
    shocks = false,
    seedsPerTest = 25,
  }: {
    readonly floods?: boolean;
    readonly shocks?: boolean;
    /** How many seeds each test plays: few enough to stay well inside a test's time limit. */
    readonly seedsPerTest?: number;
  } = {},
): void {
  const runs = runsOf(seedsPerTest);
  describe(`a player who does nothing in ${name}`, () => {
    // What each run found, by its first seed. The last tests play any run not yet played, so
    // they hold however the tests are filtered or ordered.
    const foundByRun = new Map<number, Found>();
    const foundIn = (first: number, last: number): Found => {
      const known = foundByRun.get(first);
      if (known !== undefined) return known;
      const found = playRun(country, first, last);
      foundByRun.set(first, found);
      return found;
    };
    const total = (count: (found: Found) => number) =>
      runs.reduce((sum, [first, last]) => sum + count(foundIn(first, last)), 0);

    it.each(runs)(
      'is warned of famine, defeat, floods and price shocks before any comes in games %i to %i',
      (first, last) => {
        foundIn(first, last);
      },
      // A run takes about 3 s on a CI runner, too close to vitest's default of 5 s: a busy
      // runner once took longer. This allows for that without hiding a game that hangs.
      SWEEP_TIMEOUT_MS,
    );

    it('has famine end a good share of those games', () => {
      // The check means nothing unless famine really does end a good share of these games.
      expect(total((found) => found.famines)).toBeGreaterThan(SEEDS / 5);
    });

    if (floods) {
      it('has floods come in a good share of those games', () => {
        expect(total((found) => found.floods)).toBeGreaterThan(SEEDS / 5);
      });
    }

    if (shocks) {
      it('has world price shocks come in a good share of those games', () => {
        expect(total((found) => found.shocks)).toBeGreaterThan(SEEDS / 5);
      });
    }
  });
}

/** What a run of games found: how many famine ended, and how many floods and shocks came. */
interface Found {
  readonly famines: number;
  readonly floods: number;
  readonly shocks: number;
}

/**
 * Plays the seeds from first to last, checks every game was warned in time of what ended it
 * and of every flood, and gives back how many games famine ended and how many floods came.
 */
function playRun(country: () => Country, first: number, last: number): Found {
  let famines = 0;
  let floods = 0;
  let shocks = 0;
  for (let seed = first; seed <= last; seed += 1) {
    const states = [createGame(country(), seed)];
    for (let game = states[0]; game !== undefined && inFirstTerm(game); game = states.at(-1)) {
      states.push(advanceQuarter(game, doNothing(game)).state);
    }
    // Looking ahead is slow, so each quarter is looked ahead from once at most.
    const looked = new Map<GameState, readonly Risk[]>();
    const risksIn = (game: GameState) => {
      const known = looked.get(game);
      if (known !== undefined) return known;
      const risks = risksAhead(game, doNothing(game));
      looked.set(game, risks);
      return risks;
    };
    for (const [index, game] of states.slice(1).entries()) {
      const before = states[index];
      if (before === undefined) continue;
      const announced = game.priceShocks.filter(
        (shock) => !before.priceShocks.some((was) => sameShock(was, shock)),
      );
      for (const shock of announced) {
        shocks += 1;
        const name = shockName(shock.type);
        const where = `seed ${seed}, ${before.date.year}/${before.date.quarter}`;
        expect(shockIn(risksIn(before), name), where).toBeDefined();
        // From its announcement until it first moves the price, it is listed as announced.
        const waiting = states.filter(
          (later) =>
            later.outcome.status === 'playing' &&
            quarterNumber(later.date) >= quarterNumber(shock.announced) &&
            quarterNumber(later.date) < quarterNumber(shock.begins),
        );
        for (const later of waiting) {
          const when = `seed ${seed}, ${later.date.year}/${later.date.quarter}`;
          expect(shockIn(risksIn(later), `${name} ahead`), when).toBeDefined();
        }
      }
    }
    for (const [index, game] of states.slice(0, -1).entries()) {
      const begun = (states[index + 1]?.events ?? []).filter(
        (event) => event.type === 'flood' && !game.events.some((was) => sameEvent(was, event)),
      );
      if (begun.length === 0) continue;
      floods += begun.length;
      const risks = risksIn(game);
      for (const flood of begun) {
        const warned = floodIn(risks, flood.regionId);
        expect(warned, `seed ${seed}, ${game.date.year}/${game.date.quarter}`).toBeDefined();
      }
    }
    const { outcome } = states.at(-1) ?? {};
    if (outcome?.status !== 'lost') continue;

    if (outcome.cause === 'election') {
      // The last state is the result. The two before it are the election quarter and
      // the quarter before, in both of which the player could still have acted.
      for (const game of states.slice(-3, -1)) {
        const warned = ofKind(risksAhead(game, doNothing(game)), 'election');
        expect(warned, `seed ${seed}, ${game.date.year}/${game.date.quarter}`).toBeDefined();
      }
      continue;
    }
    famines += 1;

    // The last state is the collapse and the one before it the fatal quarter. The three
    // before that are the quarters in which the player could still have acted.
    const inTime = states.slice(-5, -2);
    expect(inTime.length).toBeGreaterThan(0);
    for (const game of inTime) {
      const warned = famineIn(risksAhead(game, doNothing(game)), outcome.regionId);
      expect(warned, `seed ${seed}, ${game.date.year}/${game.date.quarter}`).toBeDefined();
    }
  }
  return { famines, floods, shocks };
}

const sameShock = (a: PriceShock, b: PriceShock) =>
  a.type === b.type && quarterNumber(a.announced) === quarterNumber(b.announced);

const sameEvent = (a: ActiveEvent, b: ActiveEvent) =>
  a.type === b.type && a.regionId === b.regionId && a.began.year === b.began.year;
