import { describe, expect, it } from 'vitest';
import {
  advanceQuarter,
  createGame,
  risksAhead,
  type Country,
  type Decisions,
  type GameState,
  type ActiveEvent,
  type Risk,
} from '../../src/sim';
import { answering, inFirstTerm } from './players';

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
const ofKind = (risks: readonly Risk[], kind: Risk['kind']) =>
  risks.find((risk) => risk.kind === kind);

/**
 * The fairness rule: nothing that ends the game may come unannounced. A player who does
 * nothing is played over many seeds. Every game that famine ended must have listed famine in
 * that region while the player could still act: in the quarter before the last one at the
 * latest, and in the quarters leading up to it. Every game lost at the vote must have listed
 * defeat in the election quarter and in the quarter before it. And no loss from a flood comes
 * unannounced: every flood must have been listed in the quarter before it began, the last in
 * which the player could act before its damage was done. With `floods` set, the sweep also
 * checks that floods really do come.
 *
 * Three hundred whole games, each looked ahead from every quarter, take seconds, so each test
 * plays a run of them and the last tests check the runs together. Where floods are likely,
 * looking ahead before each of them takes longer, so the runs are shorter. Each country is
 * swept in a file of its own, so that the sweeps share out across the workers.
 */
export function sweepDoingNothing(
  name: string,
  country: () => Country,
  {
    floods = false,
    seedsPerTest = 25,
  }: {
    readonly floods?: boolean;
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
      'is warned of famine, defeat and floods before any comes in games %i to %i',
      (first, last) => {
        foundIn(first, last);
      },
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
  });
}

/** What a run of games found: how many famine ended, and how many floods came. */
interface Found {
  readonly famines: number;
  readonly floods: number;
}

/**
 * Plays the seeds from first to last, checks every game was warned in time of what ended it
 * and of every flood, and gives back how many games famine ended and how many floods came.
 */
function playRun(country: () => Country, first: number, last: number): Found {
  let famines = 0;
  let floods = 0;
  for (let seed = first; seed <= last; seed += 1) {
    const states = [createGame(country(), seed)];
    for (let game = states[0]; game !== undefined && inFirstTerm(game); game = states.at(-1)) {
      states.push(advanceQuarter(game, doNothing(game)).state);
    }
    for (const [index, game] of states.slice(0, -1).entries()) {
      const begun = (states[index + 1]?.events ?? []).filter(
        (event) => event.type === 'flood' && !game.events.some((was) => sameEvent(was, event)),
      );
      if (begun.length === 0) continue;
      floods += begun.length;
      const risks = risksAhead(game, doNothing(game));
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
  return { famines, floods };
}

const sameEvent = (a: ActiveEvent, b: ActiveEvent) =>
  a.type === b.type && a.regionId === b.regionId && a.began.year === b.began.year;
