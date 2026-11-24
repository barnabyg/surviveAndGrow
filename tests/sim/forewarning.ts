import { describe, expect, it } from 'vitest';
import {
  advanceQuarter,
  createGame,
  intentionIn,
  quarterNumber,
  riskHorizonQuarters,
  risksAhead,
  shockName,
  type Country,
  type Decisions,
  type GameState,
  type ActiveEvent,
  type BorderIncident,
  type PriceShock,
  type Risk,
} from '../../src/sim';
import { budgetFrom } from '../budgets';
import { answering, inFirstTerm } from './playing';

/**
 * The seeds the unit suite plays. Seeds 1 to 24 are ordinary games; the rest add the rarer
 * ends, so that each check below has cases to check: 40, 64, 68 and 71 are lost at the vote
 * in Tavara or Testland as they ship, 92 is survived in Testland with drought likely, and 208
 * is the one game of Tavara as it ships that is survived. Among 1 to 24, 20 is lost at the vote
 * in Tavara, 1 in Testland and 11 in Testland with floods likely, and Testland survives 11, 12,
 * 16 and 21. In every sweep famine ends far more than a fifth of these games, and floods and
 * shocks come far more often than that where they are counted.
 */
const SAMPLE = [...Array.from({ length: 24 }, (_, index) => index + 1), 40, 64, 68, 71, 92, 208];

/**
 * The seeds the sweep plays: the sample, or seeds 1 to 300 when `npm run forewarning` sets
 * FOREWARNING_SEEDS to `all`.
 */
const SEEDS: readonly number[] =
  process.env.FOREWARNING_SEEDS === 'all'
    ? Array.from({ length: 300 }, (_, index) => index + 1)
    : SAMPLE;

/** The seeds in runs of a number of seeds each: the first and last seed of a run, and its seeds. */
const runsOf = (seedsPerTest: number) =>
  Array.from({ length: Math.ceil(SEEDS.length / seedsPerTest) }, (_, index) => {
    const seeds = SEEDS.slice(index * seedsPerTest, (index + 1) * seedsPerTest);
    return [seeds[0] ?? 0, seeds.at(-1) ?? 0, seeds] as const;
  });

/** How a player who does nothing decides a quarter. */
type Idler = (game: GameState) => Decisions;

const idle = (game: GameState): Decisions => ({ budget: game.budget });
// A dilemma must be answered, so this player takes the option that costs nothing.
const doNothing: Idler = (game) => answering(game, idle(game));
// The same player, but for spending nothing on Defence from the first quarter.
const starveArmy: Idler = (game) =>
  answering(game, { budget: budgetFrom(game.budget, { spending: { defence: 0 } }) });
// The same player, but for paying for Defence only every other quarter: enough that the army
// never plots, and too little to deter a neighbour once the country is worth taking.
const underDefend: Idler = (game) =>
  answering(game, {
    budget: budgetFrom(game.budget, {
      spending: {
        defence:
          quarterNumber(game.date) % 2 === 1 ? 0 : game.country.start.budget.spending.defence,
      },
    }),
  });

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
/** A border incident with a neighbour among the risks: one announced, or one that could be. */
const incidentIn = (risks: readonly Risk[], neighbourId: string, announced: boolean) =>
  risks.find(
    (risk) =>
      risk.kind === 'borderIncident' &&
      risk.neighbourId === neighbourId &&
      risk.headline.endsWith(' ahead') === announced,
  );

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
 * Nor does a coup: every game the army ended must have listed a coup in each quarter from
 * which the look-ahead reaches it. Nor does a neighbour turn hostile unannounced: each must
 * have been listed as turning in the quarter before it did. Nor does any loss from a border
 * incident: every incident must have been listed as one that could come in the quarter before
 * it was announced, and as announced in every quarter from then until it began or was called
 * off. With `floods` or `shocks` set, the sweep also checks that they really do come. With
 * `coups` set, the player also spends nothing on Defence, so that the army ends a good share of
 * the games, and the sweep checks that it does. With `incidents` set, the player pays for
 * Defence only every other quarter, in a country that must be worth taking from the start, so
 * that neighbours turn hostile and announce incidents, and the sweep checks that they do.
 *
 * The unit suite plays a fixed sample of seeds; `npm run forewarning` plays three hundred.
 * Whole games, each looked ahead from every quarter, take seconds, so each test
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
    coups = false,
    incidents = false,
    seedsPerTest = 15,
  }: {
    readonly floods?: boolean;
    readonly shocks?: boolean;
    /** Whether the player starves the army, so that coups end games for the sweep to check. */
    readonly coups?: boolean;
    /**
     * Whether the player under-defends a country worth taking, so that neighbours turn hostile
     * and announce border incidents for the sweep to check.
     */
    readonly incidents?: boolean;
    /** How many seeds each test plays: few enough to stay well inside a test's time limit. */
    readonly seedsPerTest?: number;
  } = {},
): void {
  const runs = runsOf(seedsPerTest);
  const decide = coups ? starveArmy : incidents ? underDefend : doNothing;
  const who = coups
    ? 'a player who does nothing but starve the army'
    : incidents
      ? 'a player who does nothing but under-defend the country'
      : 'a player who does nothing';
  describe(`${who} in ${name}`, () => {
    // What each run found, by its first seed. The last tests play any run not yet played, so
    // they hold however the tests are filtered or ordered.
    const foundByRun = new Map<number, Found>();
    const foundIn = (first: number, seeds: readonly number[]): Found => {
      const known = foundByRun.get(first);
      if (known !== undefined) return known;
      const found = playRun(country, seeds, decide);
      foundByRun.set(first, found);
      return found;
    };
    const total = (count: (found: Found) => number) =>
      runs.reduce((sum, [first, , seeds]) => sum + count(foundIn(first, seeds)), 0);

    it.each(runs)(
      'is warned of famine, a coup, defeat, floods, price shocks, hostile neighbours and border incidents before any comes in games %i to %i',
      (first, _last, seeds) => {
        foundIn(first, seeds);
      },
      // A run takes about 3 s on a CI runner, too close to vitest's default of 5 s: a busy
      // runner once took longer. This allows for that without hiding a game that hangs.
      SWEEP_TIMEOUT_MS,
    );

    if (coups) {
      it('has a coup end a good share of those games', () => {
        // The check means nothing unless the army really does end a good share of these games.
        expect(total((found) => found.coups)).toBeGreaterThan(SEEDS.length / 5);
      });
    } else if (incidents) {
      it('has neighbours turn hostile and announce border incidents in a good share of those games', () => {
        // The checks mean nothing unless neighbours really do turn and incidents really come.
        expect(total((found) => found.hostileTurns)).toBeGreaterThan(SEEDS.length / 5);
        expect(total((found) => found.incidents)).toBeGreaterThan(SEEDS.length / 5);
        expect(total((found) => found.incidentsBegun)).toBeGreaterThan(SEEDS.length / 5);
      });
    } else {
      it('has famine end a good share of those games', () => {
        // The check means nothing unless famine really does end a good share of these games.
        expect(total((found) => found.famines)).toBeGreaterThan(SEEDS.length / 5);
      });
    }

    if (floods) {
      it('has floods come in a good share of those games', () => {
        expect(total((found) => found.floods)).toBeGreaterThan(SEEDS.length / 5);
      });
    }

    if (shocks) {
      it('has world price shocks come in a good share of those games', () => {
        expect(total((found) => found.shocks)).toBeGreaterThan(SEEDS.length / 5);
      });
    }
  });
}

/**
 * What a run of games found: how many famine ended, how many a coup ended, how many floods and
 * shocks came, how many times a neighbour turned hostile, and how many border incidents were
 * announced and how many of those began.
 */
interface Found {
  readonly famines: number;
  readonly coups: number;
  readonly floods: number;
  readonly shocks: number;
  readonly hostileTurns: number;
  readonly incidents: number;
  readonly incidentsBegun: number;
}

/**
 * Plays the given seeds, checks every game was warned in time of what ended it
 * and of every flood, and gives back how many games famine ended and how many floods came.
 */
function playRun(country: () => Country, seeds: readonly number[], decide: Idler): Found {
  let famines = 0;
  let coups = 0;
  let floods = 0;
  let shocks = 0;
  let hostileTurns = 0;
  let incidents = 0;
  let incidentsBegun = 0;
  for (const seed of seeds) {
    const states = [createGame(country(), seed)];
    for (let game = states[0]; game !== undefined && inFirstTerm(game); game = states.at(-1)) {
      states.push(advanceQuarter(game, decide(game)).state);
    }
    // Looking ahead is slow, so each quarter is looked ahead from once at most.
    const looked = new Map<GameState, readonly Risk[]>();
    const risksIn = (game: GameState) => {
      const known = looked.get(game);
      if (known !== undefined) return known;
      const risks = risksAhead(game, decide(game));
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
    for (const [index, game] of states.slice(0, -1).entries()) {
      const next = states[index + 1];
      if (next === undefined) continue;
      const turned = next.country.map.neighbours.filter(
        (neighbour) =>
          intentionIn(next, neighbour.id) === 'hostile' &&
          intentionIn(game, neighbour.id) !== 'hostile',
      );
      hostileTurns += turned.length;
      for (const neighbour of turned) {
        const warned = risksIn(game).find(
          (risk) => risk.kind === 'neighbour' && risk.neighbourId === neighbour.id,
        );
        expect(warned, `seed ${seed}, ${game.date.year}/${game.date.quarter}`).toBeDefined();
      }
    }
    for (const [index, game] of states.slice(1).entries()) {
      const before = states[index];
      if (before === undefined) continue;
      const announced = game.borderIncidents.filter(
        (incident) => !before.borderIncidents.some((was) => sameIncident(was, incident)),
      );
      for (const incident of announced) {
        incidents += 1;
        const where = `seed ${seed}, ${before.date.year}/${before.date.quarter}`;
        // The quarter before, while the player could still raise Defence, it could come.
        expect(incidentIn(risksIn(before), incident.neighbourId, false), where).toBeDefined();
        // From its announcement until it begins or is called off, it is listed as announced.
        const waiting = states.filter(
          (later) =>
            later.outcome.status === 'playing' &&
            quarterNumber(later.date) >= quarterNumber(incident.announced) &&
            quarterNumber(later.date) < quarterNumber(incident.begins),
        );
        for (const later of waiting) {
          const when = `seed ${seed}, ${later.date.year}/${later.date.quarter}`;
          expect(incidentIn(risksIn(later), incident.neighbourId, true), when).toBeDefined();
        }
        const begun = states.some(
          (later) =>
            quarterNumber(later.date) === quarterNumber(incident.begins) &&
            later.borderIncidents.some((each) => sameIncident(each, incident)),
        );
        if (begun) incidentsBegun += 1;
      }
    }
    const { outcome } = states.at(-1) ?? {};
    if (outcome?.status !== 'lost') continue;

    if (outcome.cause === 'election') {
      // The last state is the result. The two before it are the election quarter and
      // the quarter before, in both of which the player could still have acted.
      for (const game of states.slice(-3, -1)) {
        const warned = ofKind(risksAhead(game, decide(game)), 'election');
        expect(warned, `seed ${seed}, ${game.date.year}/${game.date.quarter}`).toBeDefined();
      }
      continue;
    }
    if (outcome.cause === 'coup') {
      coups += 1;
      // The last state is the coup. Every quarter before it from which the look-ahead reaches
      // it must have listed it: the player could still have acted in each of them.
      const inTime = states.slice(-1 - riskHorizonQuarters, -1);
      expect(inTime.length).toBeGreaterThan(0);
      for (const game of inTime) {
        const warned = ofKind(risksIn(game), 'coup');
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
      const warned = famineIn(risksAhead(game, decide(game)), outcome.regionId);
      expect(warned, `seed ${seed}, ${game.date.year}/${game.date.quarter}`).toBeDefined();
    }
  }
  return { famines, coups, floods, shocks, hostileTurns, incidents, incidentsBegun };
}

const sameShock = (a: PriceShock, b: PriceShock) =>
  a.type === b.type && quarterNumber(a.announced) === quarterNumber(b.announced);

const sameIncident = (a: BorderIncident, b: BorderIncident) =>
  a.neighbourId === b.neighbourId && quarterNumber(a.announced) === quarterNumber(b.announced);

const sameEvent = (a: ActiveEvent, b: ActiveEvent) =>
  a.type === b.type && a.regionId === b.regionId && a.began.year === b.began.year;
