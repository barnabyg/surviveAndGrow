import { describe, expect, it } from 'vitest';
import tavaraFile from '../../src/countries/tavara.json';
import {
  advanceQuarter,
  createGame,
  LIKELIHOODS,
  risksAhead,
  type Budget,
  type Decisions,
  type GameState,
  type Risk,
} from '../../src/sim';
import testlandFile from '../countries/testland.json';
import { bothCountries, startingAt, tavara, withDroughtChance } from './countries';
import { inFirstTerm } from './players';

/**
 * Each country with the one region that drought is made to strike in these tests, and how
 * many quarters of the harsh budget bring its approval within four quarters of strikes.
 */
const scenarios = [
  {
    name: 'Tavara',
    file: tavaraFile,
    regionId: 'dry-east',
    regionName: 'The Dry East',
    harshQuarters: 0,
  },
  {
    name: 'Testland',
    file: testlandFile,
    regionId: 'sandreach',
    regionName: 'Sandreach',
    harshQuarters: 4,
  },
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
  spending: {
    agriculture: 200,
    foodRelief: 200,
    health: 200,
    education: 200,
    security: 200,
    upkeep: 200,
  },
};

describe.each(scenarios)(
  'the risks ahead in $name',
  ({ file, regionId, regionName, harshQuarters }) => {
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

    it.each([
      [0.07, 'a 7% chance'],
      [0.08, 'an 8% chance'],
      [0.11, 'an 11% chance'],
      [0.18, 'an 18% chance'],
      [0.8, 'an 80% chance'],
      [0.81, 'an 81% chance'],
      [0.1, 'a 10% chance'],
    ])('write a drought’s chance of %f as it is said: “%s”', (chance, said) => {
      const game = createGame(withDroughtChance(file, { [regionId]: chance }), 3);

      expect(famineIn(risksAhead(game, idle(game)), regionId)?.reason).toContain(`, ${said},`);
    });

    it('leave out a famine too unlikely to matter, and list it once it is not', () => {
      // A drought always leaves the region short, so the famine is as likely as the drought.
      // Under 2% it is negligible; from 2% it is remote.
      const rare = createGame(withDroughtChance(file, { [regionId]: 0.01 }), 3);
      const lessRare = createGame(withDroughtChance(file, { [regionId]: 0.03 }), 3);

      expect(risksAhead(rare, idle(rare))).toEqual([]);
      expect(risksAhead(lessRare, idle(lessRare))).toMatchObject([
        { kind: 'famine', regionId, likelihood: 'remote' },
      ]);
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
      const start = createGame(withDroughtChance(file, {}), 3);
      const game = play(start, harshQuarters, (state) => ({ budget: harsh(state) }));

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
  },
);

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
      while (inFirstTerm(game)) {
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

  it('open with the droughts and floods the country file makes possible, the likelier first', () => {
    const game = createGame(tavara(), 3);

    // A drought would begin next quarter and spoil the harvest three quarters after that,
    // so the region would go short once four quarters have been played. A flood would do
    // its damage as soon as it began.
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
        kind: 'event',
        likelihood: 'unlikely',
        headline: 'Flood in Lowmere Plains',
        reason:
          'A flood there next quarter, a 10% chance, would take 30% of its harvest and set any site in use there decaying until its upkeep is paid.',
        regionId: 'lowmere-plains',
        withinQuarters: 2,
      },
      {
        kind: 'event',
        likelihood: 'unlikely',
        headline: 'Flood in South Delta',
        reason:
          'A flood there next quarter, a 20% chance, would take 30% of its harvest and set any site in use there decaying until its upkeep is paid.',
        regionId: 'south-delta',
        withinQuarters: 2,
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
        // Farm spending now lifts the harvest enough that only the best weather would spare it.
        reason: 'Poor weather before the harvest would leave it short of food in 3 quarters.',
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
      spending: {
        agriculture: 200,
        foodRelief: 200,
        health: 200,
        education: 60,
        security: 30,
        upkeep: 0,
      },
    };
    const game = advanceQuarter(start, {
      budget: spree,
      startProjects: ['lowmere-irrigation'],
    }).state;
    expect(game.treasury).toBe(0);
    // A budget that spends exactly what comes in leaves nothing for the next instalment.
    const balanced: Budget = {
      taxRatePercent: 18,
      spending: {
        agriculture: 110,
        foodRelief: 70,
        health: 70,
        education: 60,
        security: 0,
        upkeep: 0,
      },
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
    // Revenue and spending are both $31.0m, so the treasury stays at $42.0m. Nothing goes on
    // health or education, so approval sinks towards 41.3%: the vote is lost, but nobody
    // strikes. The farms get all they can use, so every region grows enough.
    const balanced: Budget = {
      taxRatePercent: 18,
      spending: {
        agriculture: 200,
        foodRelief: 60,
        health: 0,
        education: 0,
        security: 50,
        upkeep: 0,
      },
    };
    // Losing $13.0m a quarter, $42.0m covers three quarters and not a fourth.
    const deficit: Budget = {
      ...balanced,
      spending: { ...balanced.spending, foodRelief: 190 },
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
 * Each country started at a tax rate that holds approval where it can be worked out by hand,
 * as the election tests do: the baseline is 51.5%, each point of tax above 18% costs 1.2
 * points, and the starting spending on health, education and security is worth +0.3 in
 * Tavara and +14.0 in Testland. The campaign moves the vote by a whole number of tenths of a
 * point from 3.0 down to 3.0 up, 61 swings in all, and 50.0% wins.
 */
const polls = [
  {
    name: 'Tavara',
    file: tavaraFile,
    // Tax at 17% holds approval at 53.0%: the worst swing still leaves 50.0%.
    safeTax: 17,
    // Tax at 20% holds it at 49.4%: the 36 swings of +0.5 or less lose, 590 in a thousand.
    closeTax: 20,
    closeApproval: '49.4%',
    // Tax at 26% holds it at 42.2%: no swing wins.
    lostTax: 26,
    lostApproval: '42.2%',
  },
  {
    name: 'Testland',
    file: testlandFile,
    // Tax at 20% holds approval at 63.1%.
    safeTax: 20,
    // Tax at 31% holds it at 49.9%: the 31 swings of 0.0 or less lose, 508 in a thousand.
    closeTax: 31,
    closeApproval: '49.9%',
    // Tax at 35% holds it at 45.1%.
    lostTax: 35,
    lostApproval: '45.1%',
  },
] as const;

describe.each(polls)('the risk of losing the vote in $name', (poll) => {
  it('is not listed while the vote lies beyond the four quarters looked at', () => {
    const game = play(createGame(startingAt(poll.file, poll.lostTax), 3), 15);
    expect(game.date).toEqual({ year: 4, quarter: 4 });

    expect(ofKind(risksAhead(game, idle(game)), 'election')).toBe(undefined);
  });

  it('is all but certain once the vote is in sight and no swing could win it', () => {
    const game = play(createGame(startingAt(poll.file, poll.lostTax), 3), 16);
    expect(game.date).toEqual({ year: 5, quarter: 1 });

    expect(risksAhead(game, idle(game))).toEqual([
      {
        kind: 'election',
        likelihood: 'almostCertain',
        headline: 'Election defeat',
        reason: `The vote is held in 3 quarters. Approval is on course for ${poll.lostApproval} by then, the campaign can move the vote by 3.0 points either way, and 50% is needed to win.`,
        withinQuarters: 4,
      },
    ]);
  });

  it('is graded by the share of the campaign’s swings that would lose a close vote', () => {
    const game = play(createGame(startingAt(poll.file, poll.closeTax), 3), 19);
    expect(game.date).toEqual({ year: 5, quarter: 4 });

    expect(ofKind(risksAhead(game, idle(game)), 'election')).toEqual({
      kind: 'election',
      likelihood: 'possible',
      headline: 'Election defeat',
      reason: `The vote is held this quarter. Approval is on course for ${poll.closeApproval} by then, the campaign can move the vote by 3.0 points either way, and 50% is needed to win.`,
      withinQuarters: 1,
    });
  });

  it('is not listed when no swing could lose the vote', () => {
    let game = play(createGame(startingAt(poll.file, poll.safeTax), 3), 16);

    for (; inFirstTerm(game); game = play(game, 1)) {
      expect(ofKind(risksAhead(game, idle(game)), 'election')).toBe(undefined);
    }
    // Re-elected, the government governs on into its second term.
    expect(game.outcome).toEqual({ status: 'playing' });
    expect(game.date).toEqual({ year: 6, quarter: 1 });
  });
});

describe('the risk of losing the vote in Tavara', () => {
  it('is listed as remote when only the worst swing would lose, however small that chance', () => {
    const game = play(createGame(startingAt(tavaraFile, 17), 3), 19);
    // Health cut from $7.0m to $6.0m in the last quarter takes approval from 53.0% to 52.9%.
    // Only the swing of 3.0 points down then loses: one in 61, under the 2% that would
    // otherwise be too little to list. An outcome that ends the game is never left out.
    const budget: Budget = { ...game.budget, spending: { ...game.budget.spending, health: 60 } };

    expect(ofKind(risksAhead(game, { budget }), 'election')).toMatchObject({
      likelihood: 'remote',
      reason: expect.stringContaining('on course for 52.9%') as string,
    });
  });
});

/**
 * The fairness rule of `forewarning.ts` for the vote, where it is close enough for the
 * campaign to decide it. Few of the games a player who does nothing plays there reach
 * polling day, so these countries are started where approval holds
 * within a point of the 50% needed, and the seed's swing settles each game.
 */
describe.each(polls)('a government on a knife edge in $name', (poll) => {
  it('is warned of defeat in the election quarter and the one before', () => {
    const seeds = 200;
    let defeats = 0;
    let wins = 0;
    for (let seed = 1; seed <= seeds; seed += 1) {
      const states = [createGame(startingAt(poll.file, poll.closeTax), seed)];
      for (let game = states[0]; game !== undefined && inFirstTerm(game); game = states.at(-1)) {
        states.push(advanceQuarter(game, idle(game)).state);
      }
      // Every game reaches the vote: one that wins it plays on into a second term.
      const { outcome } = states.at(-1) ?? {};
      expect(states).toHaveLength(21);
      if (outcome?.status === 'playing') wins += 1;
      if (outcome?.status !== 'lost') continue;
      expect(outcome.cause).toBe('election');
      defeats += 1;

      for (const game of states.slice(-3, -1)) {
        const warned = ofKind(risksAhead(game, idle(game)), 'election');
        expect(warned, `seed ${seed}, ${game.date.year}/${game.date.quarter}`).toBeDefined();
      }
    }
    // The check means nothing unless the vote really does go both ways.
    expect(defeats).toBeGreaterThan(seeds / 5);
    expect(wins).toBeGreaterThan(seeds / 5);
  });
});
