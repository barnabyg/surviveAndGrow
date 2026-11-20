import { describe, expect, it } from 'vitest';
import {
  advanceQuarter,
  createGame,
  risksAhead,
  type Country,
  type Decisions,
  type GameState,
  type Risk,
} from '../../src/sim';
import { answering, inFirstTerm } from './players';

/** How many seeds the sweep plays, and how many each test plays of them. */
const SEEDS = 300;
const SEEDS_PER_TEST = 25;

/** The seeds from 1 to SEEDS, in runs of SEEDS_PER_TEST: [first, last] of each run. */
const runs = Array.from({ length: SEEDS / SEEDS_PER_TEST }, (_, index): [number, number] => [
  index * SEEDS_PER_TEST + 1,
  (index + 1) * SEEDS_PER_TEST,
]);

const idle = (game: GameState): Decisions => ({ budget: game.budget });
// A dilemma must be answered, so this player takes the option that costs nothing.
const doNothing = (game: GameState) => answering(game, idle(game));

const famineIn = (risks: readonly Risk[], regionId: string) =>
  risks.find((risk) => risk.kind === 'famine' && risk.regionId === regionId);
const ofKind = (risks: readonly Risk[], kind: Risk['kind']) =>
  risks.find((risk) => risk.kind === kind);

/**
 * The fairness rule: nothing that ends the game may come unannounced. A player who does
 * nothing is played over many seeds. Every game that famine ended must have listed famine in
 * that region while the player could still act: in the quarter before the last one at the
 * latest, and in the quarters leading up to it. Every game lost at the vote must have listed
 * defeat in the election quarter and in the quarter before it.
 *
 * Three hundred whole games, each looked ahead from every quarter, take seconds, so each test
 * plays a run of them and the last test checks the runs together. Each country is swept in a
 * file of its own, so that the sweeps share out across the workers.
 */
export function sweepDoingNothing(name: string, country: () => Country): void {
  describe(`a player who does nothing in ${name}`, () => {
    // How many games famine ended in each run, by its first seed. The last test plays any run
    // not yet played, so it holds however the tests are filtered or ordered.
    const faminesByRun = new Map<number, number>();
    const faminesIn = (first: number, last: number): number => {
      const known = faminesByRun.get(first);
      if (known !== undefined) return known;
      const famines = playRun(country, first, last);
      faminesByRun.set(first, famines);
      return famines;
    };

    it.each(runs)(
      'is warned of famine in the region, or of defeat, before either ends games %i to %i',
      (first, last) => {
        faminesIn(first, last);
      },
    );

    it('has famine end a good share of those games', () => {
      const famines = runs.reduce((total, [first, last]) => total + faminesIn(first, last), 0);
      // The check means nothing unless famine really does end a good share of these games.
      expect(famines).toBeGreaterThan(SEEDS / 5);
    });
  });
}

/**
 * Plays the seeds from first to last, checks every game was warned in time of what ended it,
 * and gives back how many famine ended.
 */
function playRun(country: () => Country, first: number, last: number): number {
  let famines = 0;
  for (let seed = first; seed <= last; seed += 1) {
    const states = [createGame(country(), seed)];
    for (let game = states[0]; game !== undefined && inFirstTerm(game); game = states.at(-1)) {
      states.push(advanceQuarter(game, doNothing(game)).state);
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
  return famines;
}
