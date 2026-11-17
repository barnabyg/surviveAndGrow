import { describe, expect, it } from 'vitest';
import tavaraFile from '../../src/countries/tavara.json';
import {
  advanceQuarter,
  createGame,
  LIKELIHOODS,
  risksAhead,
  type Budget,
  type Country,
  type Decisions,
  type GameState,
  type Risk,
} from '../../src/sim';
import testlandFile from '../countries/testland.json';
import {
  bothCountries,
  tavara,
  tavaraAsShipped,
  testlandAsShipped,
  withDroughtChance,
} from './countries';
import { answering } from './players';

/** Each country with the one region that drought is made to strike in these tests. */
const scenarios = [
  { name: 'Tavara', file: tavaraFile, regionId: 'dry-east', regionName: 'The Dry East' },
  { name: 'Testland', file: testlandFile, regionId: 'sandreach', regionName: 'Sandreach' },
] as const;

/** A player who does nothing: the starting budget, no relief, nothing built. */
const idle = (game: GameState): Decisions => ({ budget: game.budget });

function play(start: GameState, quarters: number, decide = idle): GameState {
  let state = start;
  for (let quarter = 0; quarter < quarters && state.outcome.status === 'playing'; quarter += 1) {
    state = advanceQuarter(state, decide(state)).state;
  }
  return state;
}

const famineIn = (risks: readonly Risk[], regionId: string) =>
  risks.find((risk) => risk.kind === 'famine' && risk.regionId === regionId);
const ofKind = (risks: readonly Risk[], kind: Risk['kind']) =>
  risks.find((risk) => risk.kind === kind);

/** Top tax and nothing for health, education or security: approval settles far below 40%. */
function harsh(game: GameState): Budget {
  return {
    taxRatePercent: 40,
    spending: { ...game.budget.spending, health: 0, education: 0, security: 0 },
  };
}

/** The lowest tax and the most the game allows on every area: more than any treasury covers. */
const ruinous: Budget = {
  taxRatePercent: 5,
  spending: { agriculture: 200, foodRelief: 200, health: 200, education: 200, security: 200 },
};

describe.each(scenarios)('the risks ahead in $name', ({ file, regionId, regionName }) => {
  it('are none while the country is comfortable and no drought can come', () => {
    const game = createGame(withDroughtChance(file, {}), 3);

    expect(risksAhead(game, idle(game))).toEqual([]);
  });

  it('include famine in a region once a drought has spoiled its coming harvest', () => {
    // The drought begins as the calendar moves into the planting season.
    const game = play(createGame(withDroughtChance(file, { [regionId]: 1 }), 3), 1);

    const famine = risksAhead(game, idle(game)).find((risk) => risk.kind === 'famine');

    expect(famine).toMatchObject({ headline: `Famine in ${regionName}`, regionId });
  });

  it('grade the famine a drought would bring before any drought has begun', () => {
    const game = createGame(withDroughtChance(file, { [regionId]: 0.5 }), 3);

    // Half the years bring a drought, and a drought always leaves the region short.
    expect(famineIn(risksAhead(game, idle(game)), regionId)).toMatchObject({
      likelihood: 'possible',
      reason: expect.stringContaining('a 50% chance') as string,
    });
  });

  it('say that famine is all but certain once the region is going hungry', () => {
    // The failed harvest is in after four quarters, and the region goes short from the fifth.
    const game = play(createGame(withDroughtChance(file, { [regionId]: 1 }), 3), 5);

    expect(famineIn(risksAhead(game, idle(game)), regionId)).toEqual({
      kind: 'famine',
      likelihood: 'almostCertain',
      headline: `Famine in ${regionName}`,
      reason: 'Its people are going hungry. Left alone, that is famine within 2 quarters.',
      regionId,
      withinQuarters: 1,
    });
  });

  it('drop the famine once relief that reaches the region is being sent', () => {
    const game = play(createGame(withDroughtChance(file, { [regionId]: 1 }), 3), 4);
    const budget: Budget = {
      taxRatePercent: 30,
      spending: { ...game.budget.spending, foodRelief: 70 },
    };

    expect(famineIn(risksAhead(game, { budget }), regionId)).toBeDefined();
    expect(famineIn(risksAhead(game, { budget, reliefRegionId: regionId }), regionId)).toBe(
      undefined,
    );
  });

  it('warn of strikes when approval is on course to fall below the threshold', () => {
    const game = createGame(withDroughtChance(file, {}), 3);

    const strikes = ofKind(risksAhead(game, { budget: harsh(game) }), 'strikes');

    // Tax and spending bear on every region alike, so they are named together.
    expect(strikes).toMatchObject({ likelihood: 'almostCertain', headline: 'Strikes' });
    expect(strikes?.reason).toContain('Approval in every region is on course to fall below 40%');
    expect(strikes?.regionId).toBe(undefined);
  });

  it('warn of protests where strikes have already begun', () => {
    const start = createGame(withDroughtChance(file, {}), 3);
    let game = start;
    while (game.regions.every((region) => region.unrest === 'calm')) {
      game = advanceQuarter(game, { budget: harsh(start) }).state;
    }

    const risk = ofKind(risksAhead(game, { budget: harsh(start) }), 'strikes');

    expect(risk).toMatchObject({ headline: 'Protests', likelihood: 'almostCertain' });
    expect(risk?.reason).toContain('fall below 30%');
  });

  it('warn that the treasury runs out this quarter under a budget it cannot cover', () => {
    const game = createGame(withDroughtChance(file, {}), 3);

    expect(ofKind(risksAhead(game, { budget: ruinous }), 'treasury')).toEqual({
      kind: 'treasury',
      likelihood: 'almostCertain',
      headline: 'Empty treasury',
      reason:
        'As things stand the treasury cannot cover the budget this quarter, and every area will be cut.',
      withinQuarters: 1,
    });
  });
});

describe.each(bothCountries)('looking ahead for risks in %s', (_name, country) => {
  it('does not change the game', () => {
    const game = createGame(country(), 11);
    const before = structuredClone(game);

    risksAhead(game, { budget: ruinous });

    expect(game).toEqual(before);
  });

  it('leaves a game played with it identical to the same game played without', () => {
    let plain = createGame(country(), 11);
    let watched = createGame(country(), 11);

    for (let quarter = 0; quarter < 20 && plain.outcome.status === 'playing'; quarter += 1) {
      plain = advanceQuarter(plain, idle(plain)).state;

      risksAhead(watched, { budget: ruinous });
      risksAhead(watched, idle(watched));
      watched = advanceQuarter(watched, idle(watched)).state;
    }

    expect(watched).toEqual(plain);
  });

  it('lists the most likely first', () => {
    const rank = (risk: Risk) => LIKELIHOODS.indexOf(risk.likelihood);
    for (const seed of [1, 2, 3, 4, 5]) {
      let game = createGame(country(), seed);
      while (game.outcome.status === 'playing') {
        const ranks = risksAhead(game, idle(game)).map(rank);
        expect(ranks).toEqual([...ranks].sort((a, b) => b - a));
        game = advanceQuarter(game, idle(game)).state;
      }
    }
  });

  it('refuses decisions the game would refuse, and a game that is over', () => {
    const game = createGame(country(), 11);

    expect(() => risksAhead(game, { budget: { ...game.budget, taxRatePercent: 2 } })).toThrow(
      'The tax rate must be a whole number from 5 to 40, but is 2.',
    );

    const over = play(createGame(withDroughtChance(scenarios[0].file, { 'dry-east': 1 }), 1), 20);
    expect(over.outcome.status).toBe('lost');
    expect(() => risksAhead(over, idle(over))).toThrow('The game is over.');
  });
});

describe('the risks ahead in Tavara', () => {
  const calm = () => withDroughtChance(tavaraFile, {});

  it('open with the droughts the country file makes possible, the likelier first', () => {
    const game = createGame(tavara(), 3);

    // A drought would begin next quarter and spoil the harvest three quarters after that,
    // so the region would go short once four quarters have been played.
    expect(risksAhead(game, idle(game))).toEqual([
      {
        kind: 'famine',
        likelihood: 'possible',
        headline: 'Famine in The Dry East',
        reason:
          'A drought there this year, a 35% chance, would leave it short of food in 4 quarters.',
        regionId: 'dry-east',
        withinQuarters: 5,
      },
      {
        kind: 'famine',
        likelihood: 'unlikely',
        headline: 'Famine in Korr Highlands',
        reason:
          'A drought there this year, a 15% chance, would leave it short of food in 4 quarters.',
        regionId: 'korr-highlands',
        withinQuarters: 5,
      },
      {
        kind: 'famine',
        likelihood: 'unlikely',
        headline: 'Famine in Arden Vale',
        reason:
          'A drought there this year, a 10% chance, would leave it short of food in 4 quarters.',
        regionId: 'arden-vale',
        withinQuarters: 5,
      },
      {
        kind: 'famine',
        likelihood: 'remote',
        headline: 'Famine in Salt Coast',
        reason:
          'A drought there this year, a 7% chance, would leave it short of food in 4 quarters.',
        regionId: 'salt-coast',
        withinQuarters: 5,
      },
    ]);
  });

  it('say when a drought now in force will leave its region short', () => {
    const game = play(createGame(withDroughtChance(tavaraFile, { 'dry-east': 1 }), 3), 1);

    expect(risksAhead(game, idle(game))).toEqual([
      {
        kind: 'famine',
        likelihood: 'almostCertain',
        headline: 'Famine in The Dry East',
        reason:
          'The drought has cut its harvest. It runs short of food in 3 quarters, and left alone that is famine 2 quarters later.',
        regionId: 'dry-east',
        withinQuarters: 4,
      },
    ]);
  });

  it('warn of an empty treasury once the deficit will empty it inside four quarters', () => {
    // The starting budget loses $5.0m a quarter from $42.0m.
    const start = createGame(calm(), 3);
    const early = play(start, 4);
    const later = play(start, 5);

    // $22.0m covers four more quarters; $17.0m is $2.0m short of covering the fourth.
    expect(early.treasury).toBe(220);
    expect(ofKind(risksAhead(early, idle(early)), 'treasury')).toBe(undefined);
    expect(later.treasury).toBe(170);
    expect(risksAhead(later, idle(later))).toEqual([
      {
        kind: 'treasury',
        likelihood: 'almostCertain',
        headline: 'Empty treasury',
        reason:
          'As things stand the treasury cannot cover the budget in 3 quarters, and every area will be cut.',
        withinQuarters: 4,
      },
    ]);
  });

  it('warn that building will pause when the treasury cannot cover an instalment', () => {
    const start = createGame(calm(), 3);
    // Revenue is $31.0m. Spending $69.0m leaves $4.0m, which the first instalment takes.
    const spree: Budget = {
      taxRatePercent: 18,
      spending: { agriculture: 200, foodRelief: 200, health: 200, education: 60, security: 30 },
    };
    const game = advanceQuarter(start, {
      budget: spree,
      startProjects: ['lowmere-irrigation'],
    }).state;
    expect(game.treasury).toBe(0);
    // A budget that spends exactly what comes in leaves nothing for the next instalment.
    const balanced: Budget = {
      taxRatePercent: 18,
      spending: { agriculture: 110, foodRelief: 70, health: 70, education: 60, security: 0 },
    };

    expect(ofKind(risksAhead(game, { budget: balanced }), 'treasury')).toEqual({
      kind: 'treasury',
      likelihood: 'almostCertain',
      headline: 'Empty treasury',
      reason:
        'As things stand the treasury cannot cover the instalment on Lowmere irrigation this quarter, and building there will pause.',
      withinQuarters: 1,
    });
  });

  it('look no further than the election', () => {
    // Revenue and spending are both $31.0m, so the treasury stays at $42.0m. The farms get
    // what relief does not need, so every region grows enough and nobody strikes.
    const balanced: Budget = {
      taxRatePercent: 18,
      spending: { agriculture: 130, foodRelief: 0, health: 70, education: 60, security: 50 },
    };
    // Losing $13.0m a quarter, $42.0m covers three quarters and not a fourth.
    const deficit: Budget = {
      ...balanced,
      spending: { ...balanced.spending, agriculture: 200, foodRelief: 60 },
    };
    const keep = () => ({ budget: balanced });
    const fourLeft = play(createGame(calm(), 3), 16, keep);
    const threeLeft = play(createGame(calm(), 3), 17, keep);
    expect(fourLeft.date).toEqual({ year: 5, quarter: 1 });
    expect(fourLeft.treasury).toBe(420);

    expect(ofKind(risksAhead(fourLeft, { budget: deficit }), 'treasury')).toMatchObject({
      withinQuarters: 4,
    });
    expect(ofKind(risksAhead(threeLeft, { budget: deficit }), 'treasury')).toBe(undefined);
  });
});

/**
 * The fairness rule: nothing that ends the game may come unannounced. A player who does
 * nothing is played over many seeds, and every game that famine ended must have listed
 * famine in that region while the player could still act: in the quarter before the last
 * one at the latest, and in the quarters leading up to it.
 */
describe.each([
  ['Tavara as it ships', tavaraAsShipped],
  [
    'Tavara with drought likely everywhere',
    () =>
      withDroughtChance(
        tavaraFile,
        Object.fromEntries(tavaraFile.regions.map((region) => [region.id, 0.4])),
      ),
  ],
  ['Testland as it ships', testlandAsShipped],
  [
    'Testland with drought likely everywhere',
    () => withDroughtChance(testlandFile, { northfield: 0.5, sandreach: 0.5 }),
  ],
] satisfies [string, () => Country][])('a player who does nothing in %s', (_name, country) => {
  // A dilemma must be answered, so this player takes the option that costs nothing.
  const doNothing = (game: GameState) => answering(game, idle(game));

  it('is warned of famine in the region before it can end the game', () => {
    const seeds = 300;
    let famines = 0;
    for (let seed = 1; seed <= seeds; seed += 1) {
      const states = [createGame(country(), seed)];
      for (let game = states[0]; game?.outcome.status === 'playing'; game = states.at(-1)) {
        states.push(advanceQuarter(game, doNothing(game)).state);
      }
      const { outcome } = states.at(-1) ?? {};
      if (outcome?.status !== 'lost' || outcome.cause !== 'famine') continue;
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
    // The check means nothing unless famine really does end a good share of these games.
    expect(famines).toBeGreaterThan(seeds / 5);
  });
});
