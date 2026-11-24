import { describe, expect, it } from 'vitest';
import tavaraFile from '../../src/countries/tavara.json';
import {
  advanceQuarter,
  createGame,
  DILEMMA_TYPES,
  loadCountry,
  nationalApproval,
  pendingDilemma,
  previewQuarter,
  risksAhead,
  type Budget,
  type Country,
  type Decisions,
  type DilemmaType,
  type Figure,
  type GameState,
} from '../../src/sim';
import testlandFile from '../countries/testland.json';
import { tavaraAsShipped, testlandAsShipped, withChances } from './countries';
import { faultsOf, withValue, without } from './files';
import { answering, inFirstTerm } from './playing';
import { budgetFrom, budgetOf } from '../budgets';

type Chances = Parameters<typeof withChances>[1];

/** Each country, and the region that drought is made to strike in it. */
const countries = [
  { name: 'Tavara', file: tavaraFile, dry: 'dry-east', first: 'korr-highlands' },
  { name: 'Testland', file: testlandFile, dry: 'sandreach', first: 'northfield' },
] as const;

const keep = (game: GameState): Budget => game.budget;

/**
 * Twice the country's usual spending on its farms, paid for by dropping relief and adding
 * two points of tax: every region grows enough to eat whatever the weather, so nobody goes
 * hungry and approval stays well clear of strikes.
 */
const provident = (game: GameState): Budget => {
  const usual = game.country.start.budget;
  return budgetFrom(usual, {
    taxRatePercent: usual.taxRatePercent + 2,
    spending: { agriculture: Math.min(200, usual.spending.agriculture * 2), foodRelief: 0 },
  });
};

/** Top tax and nothing for health, education or security: approval settles far below 40%. */
const harsh = (game: GameState): Budget =>
  budgetFrom(game.country.start.budget, {
    taxRatePercent: 40,
    spending: { health: 0, education: 0, security: 0 },
  });

/** The lowest tax and the most the game allows on every area, which empties any treasury. */
const ruinous = (): Budget => budgetOf({ taxRatePercent: 5, elsewhere: 200 });

/** The tax as it stands and nothing spent, so that no answer can force a spending cut. */
const austere = (game: GameState): Budget =>
  budgetOf({ taxRatePercent: game.budget.taxRatePercent, elsewhere: 0 });

/**
 * How each dilemma is brought about: the chances written into the country file, and the
 * budget played until it arises. Nothing here reaches past the country file and the decisions.
 */
const ways = {
  // A token reserve, so that both twins have something in store to spoil.
  grainOffer: { chances: () => ({ reserve: 1000 }), budget: keep },
  merchantOffer: { chances: () => ({ reserve: 3_000_000 }), budget: keep },
  emergencyWorks: { chances: (dry: string) => ({ drought: { [dry]: 1 } }), budget: keep },
  strikeTalks: { chances: () => ({}), budget: harsh },
  teachersPay: { chances: () => ({}), budget: keep },
  donorGrant: { chances: () => ({}), budget: ruinous },
} satisfies Record<
  DilemmaType,
  { chances: (dry: string) => Chances; budget: (game: GameState) => Budget }
>;

interface Reached {
  /** The game with the dilemma pending. */
  readonly game: GameState;
  /** The same seed and decisions in the same country without the dilemma: nothing is pending. */
  readonly control: GameState;
}

/** Plays until the dilemma arises, with a twin game in which it cannot. */
function reach(type: DilemmaType, file: unknown, dry: string, seed = 5): Reached {
  const { chances, budget } = ways[type];
  let game = createGame(withChances(file, { ...chances(dry), dilemmas: { [type]: 1 } }), seed);
  let control = createGame(withChances(file, chances(dry)), seed);
  for (let quarter = 0; quarter < 8 && game.dilemma === null; quarter += 1) {
    game = advanceQuarter(game, { budget: budget(game) }).state;
    control = advanceQuarter(control, { budget: budget(control) }).state;
  }
  if (game.dilemma?.type !== type) throw new Error(`${type} did not arise`);
  return { game, control };
}

const adds = (figure: Figure) =>
  figure.contributions.reduce((total, line) => total + line.amount, 0);

const region = (game: GameState, regionId: string) => {
  const found = game.regions.find((candidate) => candidate.id === regionId);
  if (!found) throw new Error(`No region ${regionId}`);
  return found;
};

describe.each(countries)('a dilemma in $name', ({ file, dry }) => {
  it('arises as a quarter begins and waits for the player to choose', () => {
    const start = createGame(withChances(file, { dilemmas: { teachersPay: 1 } }), 5);
    expect(pendingDilemma(start)).toBe(null);

    const game = advanceQuarter(start, { budget: start.budget }).state;

    expect(pendingDilemma(game)).toMatchObject({
      type: 'teachersPay',
      title: 'Teachers demand a pay rise',
      regionId: null,
    });
    expect(pendingDilemma(game)?.options.map((option) => option.label)).toEqual([
      'Grant the rise',
      'Refuse it',
    ]);
    expect(() => advanceQuarter(game, { budget: game.budget })).toThrow(
      new RangeError('“Teachers demand a pay rise” must be answered before the quarter can end.'),
    );
  });

  it('refuses an answer that is not one of its options, and an answer to nothing', () => {
    const { game, control } = reach('teachersPay', file, dry);

    expect(() => advanceQuarter(game, { budget: game.budget, dilemmaChoice: 'strike' })).toThrow(
      new RangeError('“Teachers demand a pay rise” has no option "strike".'),
    );
    expect(() =>
      advanceQuarter(control, { budget: control.budget, dilemmaChoice: 'grant' }),
    ).toThrow(new RangeError('There is no dilemma to answer.'));
  });

  it('refuses an option the treasury cannot pay for, and says so before it is chosen', () => {
    // A ruinous first quarter leaves the treasury all but empty when the offer comes.
    const start = createGame(withChances(file, { dilemmas: { grainOffer: 1 }, reserve: 0 }), 5);
    const game = advanceQuarter(start, { budget: ruinous() }).state;

    const [buy, , decline] = pendingDilemma(game)?.options ?? [];

    expect(buy?.unavailable).toMatch(/^The treasury holds only \$0\.\dm\.$/);
    expect(() => advanceQuarter(game, { budget: austere(game), dilemmaChoice: 'buy' })).toThrow(
      /^“Buy the whole shipment” cannot be chosen\. The treasury holds only/,
    );
    expect(decline?.unavailable).toBe(null);
  });

  it('can be previewed before it is answered, as the quarter stands with nothing chosen', () => {
    const { game, control } = reach('teachersPay', file, dry);

    const preview = previewQuarter(game, { budget: austere(game) });

    expect(preview).toEqual(previewQuarter(control, { budget: austere(control) }));
    expect(risksAhead(game, { budget: austere(game) })).toEqual(
      risksAhead(control, { budget: austere(control) }),
    );
  });

  describe.each(DILEMMA_TYPES)('%s', (type) => {
    it('offers two or three options, each stating what it will do, one of them free', () => {
      const view = pendingDilemma(reach(type, file, dry).game);

      expect(view?.options.length).toBeGreaterThanOrEqual(2);
      expect(view?.options.length).toBeLessThanOrEqual(3);
      // Whatever the treasury and the reserve hold, there is always something to choose.
      expect(view?.options.some((option) => option.unavailable === null)).toBe(true);
    });

    it('does exactly what each option says, and nothing else', () => {
      const { game, control } = reach(type, file, dry);
      const { dilemma } = game;
      if (dilemma === null) throw new Error('Nothing is pending');

      for (const option of dilemma.options) {
        const decisions: Decisions = { budget: austere(game), dilemmaChoice: option.id };
        const preview = previewQuarter(game, decisions);
        const chosen = advanceQuarter(game, decisions);
        const plain = advanceQuarter(control, { budget: austere(control) });

        // Money: the treasury differs from the twin's by what the option said, to the unit.
        const money = option.effects.reduce(
          (total, effect) => total + (effect.kind === 'treasury' ? effect.amount : 0),
          0,
        );
        expect(chosen.state.treasury - plain.state.treasury).toBe(money);

        // Food: each movement is a line of its own in the reserve's breakdown.
        const moved = chosen.report.food.contributions.filter(
          (line) => !plain.report.food.contributions.some((other) => other.label === line.label),
        );
        expect(moved.map((line) => line.amount)).toEqual(
          option.effects.flatMap((effect) =>
            effect.kind === 'reserve'
              ? [effect.tonnes]
              : effect.kind === 'regionGrain'
                ? [-effect.tonnes]
                : [],
          ),
        );
        for (const effect of option.effects) {
          if (effect.kind !== 'regionGrain' || dilemma.regionId === null) continue;
          expect(
            region(chosen.state, dilemma.regionId).foodStock -
              region(plain.state, dilemma.regionId).foodStock,
          ).toBe(effect.tonnes);
        }

        // Approval: the push lands in full where it was aimed, and nowhere else.
        for (const place of chosen.state.regions) {
          const pushed = option.effects.reduce(
            (total, effect) =>
              effect.kind === 'approval' &&
              (effect.regionId === undefined || effect.regionId === place.id)
                ? total + effect.permille
                : total,
            0,
          );
          expect(
            place.approvalEffects.events - region(plain.state, place.id).approvalEffects.events,
          ).toBe(pushed);
        }

        // Every figure still adds up, and the preview said exactly what then happened.
        expect(adds(chosen.report.treasury)).toBe(chosen.report.treasury.change);
        expect(adds(chosen.report.food)).toBe(chosen.report.food.change);
        expect(adds(chosen.report.approval)).toBe(chosen.report.approval.change);
        expect(preview.treasury).toEqual({
          min: chosen.state.treasury,
          max: chosen.state.treasury,
        });
        const approval = nationalApproval(chosen.state.regions);
        expect(preview.approval).toEqual({ min: approval, max: approval });

        // The choice is on the record and in the report, and nothing is left pending.
        expect(chosen.state.dilemmasAnswered).toEqual([
          { type, quarter: game.history.length, regionId: dilemma.regionId, optionId: option.id },
        ]);
        const view = pendingDilemma(game);
        const label = view?.options.find((candidate) => candidate.id === option.id)?.label ?? '';
        expect(chosen.report.entries.find((entry) => entry.kind === 'dilemma')).toMatchObject({
          headline: view?.title,
          cause: expect.stringMatching(`^You chose “${label}”\\. `) as string,
        });
        expect(chosen.state.dilemma).toBe(null);
      }
    });
  });

  it('concerns the region an event has struck, chosen by rule', () => {
    expect(reach('emergencyWorks', file, dry).game.dilemma?.regionId).toBe(dry);
  });
});

describe('the dilemmas in Tavara', () => {
  const view = (type: DilemmaType) => pendingDilemma(reach(type, tavaraFile, 'dry-east').game);

  // Tavara has 5.2 million people, who eat 260,000 t a quarter.
  it('offers grain from a neighbour while the reserve is below its safe level', () => {
    // It is priced at the world price as the quarter begins, here $231 a tonne.
    expect(reach('grainOffer', tavaraFile, 'dry-east').game.worldPrices.grain.at(-1)).toBe(231);
    expect(view('grainOffer')).toEqual({
      type: 'grainOffer',
      title: 'A neighbour offers grain',
      story:
        'The national reserve is below its safe level, and a neighbouring government has noticed. It offers a shipment of grain at the world price, to be paid for at once.',
      regionId: null,
      options: [
        {
          id: 'buy',
          label: 'Buy the whole shipment',
          effects: ['Costs $12.0m', 'Adds 52,000 t to the national reserve'],
          unavailable: null,
        },
        {
          id: 'half',
          label: 'Buy half of it',
          effects: ['Costs $6.0m', 'Adds 26,000 t to the national reserve'],
          unavailable: null,
        },
        { id: 'decline', label: 'Decline the offer', effects: [], unavailable: null },
      ],
    });
  });

  it('lets merchants buy from a reserve that is above its safe level', () => {
    // They pay the world price, $255 a tonne by the quarter they call in.
    expect(view('merchantOffer')?.options).toEqual([
      {
        id: 'sell',
        label: 'Sell them a large part',
        effects: ['Takes 78,000 t from the national reserve', 'Brings in $19.9m'],
        unavailable: null,
      },
      {
        id: 'some',
        label: 'Sell them a little',
        effects: ['Takes 39,000 t from the national reserve', 'Brings in $9.9m'],
        unavailable: null,
      },
      { id: 'keep', label: 'Keep the grain', effects: [], unavailable: null },
    ]);
  });

  it('puts a region in drought’s plea for emergency works', () => {
    // The Dry East has 600,000 people, who eat 30,000 t a quarter.
    expect(view('emergencyWorks')).toMatchObject({
      title: 'The Dry East asks for emergency works',
      regionId: 'dry-east',
      options: [
        {
          id: 'works',
          label: 'Pay for the works',
          effects: [
            'Costs $3.1m',
            'Approval in The Dry East rises by 6.0 points at once, and the effect then fades',
          ],
        },
        {
          id: 'grain',
          label: 'Send grain instead',
          effects: [
            'Moves 15,000 t from the national reserve to the region’s own stock',
            'Approval in The Dry East rises by 2.0 points at once, and the effect then fades',
          ],
        },
        {
          id: 'refuse',
          label: 'Refuse both',
          effects: [
            'Approval in The Dry East falls by 5.0 points at once, and the effect then fades',
          ],
        },
      ],
    });
    expect(view('emergencyWorks')?.story).toContain('left The Dry East without work');
  });

  it('brings strikers to the table in the region where unrest has gone furthest', () => {
    // Every region strikes together under this budget, so the first in the file is taken.
    expect(view('strikeTalks')).toMatchObject({
      title: 'Strikers in Korr Highlands ask for talks',
      regionId: 'korr-highlands',
      options: [
        {
          id: 'concede',
          effects: [
            'Costs $4.2m',
            'Approval in Korr Highlands rises by 8.0 points at once, and the effect then fades',
          ],
        },
        {
          id: 'refuse',
          effects: [
            'Approval in Korr Highlands falls by 3.0 points at once, and the effect then fades',
          ],
        },
      ],
    });
  });

  it('puts the teachers’ pay claim and the donor’s grant to the whole country', () => {
    expect(view('teachersPay')?.options.map((option) => option.effects)).toEqual([
      [
        'Costs $4.2m',
        'Approval across the country rises by 2.0 points at once, and the effect then fades',
      ],
      ['Approval across the country falls by 3.0 points at once, and the effect then fades'],
    ]);
    expect(view('donorGrant')?.options.map((option) => option.effects)).toEqual([
      [
        'Brings in $15.6m',
        'Approval across the country falls by 4.0 points at once, and the effect then fades',
      ],
      [],
    ]);
  });

  it('records the choice and what it did in the turn report', () => {
    const { game } = reach('grainOffer', tavaraFile, 'dry-east');

    const bought = advanceQuarter(game, { budget: game.budget, dilemmaChoice: 'buy' }).report;
    const declined = advanceQuarter(game, { budget: game.budget, dilemmaChoice: 'decline' }).report;

    expect(bought.entries).toContainEqual({
      kind: 'dilemma',
      seriousness: 'notable',
      headline: 'A neighbour offers grain',
      cause:
        'You chose “Buy the whole shipment”. Costs $12.0m. Adds 52,000 t to the national reserve.',
    });
    expect(bought.treasury.contributions).toContainEqual({
      label: 'Grain from a neighbour',
      amount: -120,
    });
    expect(bought.food.contributions).toContainEqual({
      label: 'Grain from a neighbour',
      amount: 52_000,
    });
    expect(declined.entries.find((entry) => entry.kind === 'dilemma')?.cause).toBe(
      'You chose “Decline the offer”. Nothing changed.',
    );
  });

  it('files a push on approval under the dilemma’s name in the breakdown', () => {
    const { game } = reach('teachersPay', tavaraFile, 'dry-east');

    const { approval } = advanceQuarter(game, {
      budget: game.budget,
      dilemmaChoice: 'refuse',
    }).report;

    // Nothing else is moving approval, so the three points are the whole change.
    expect(approval.contributions).toContainEqual({ label: 'Teachers’ pay', amount: -30 });
    expect(approval.change).toBe(-30);
  });

  it('counts an answer in the risks ahead', () => {
    // Spending as the country started, with next to nothing in the treasury to cover it.
    const { game } = reach('donorGrant', tavaraFile, 'dry-east');
    const budget = game.country.start.budget;
    const treasury = (decisions: Decisions) =>
      risksAhead(game, decisions).find((risk) => risk.kind === 'treasury');

    expect(treasury({ budget })?.withinQuarters).toBe(1);
    // The grant's $15.6m covers the $7.0m deficit for two quarters and not a third.
    expect(treasury({ budget, dilemmaChoice: 'accept' })?.withinQuarters).toBe(3);
  });
});

/** The quarters of the game, counting from 1, in which a dilemma was put to the player. */
function arisals(
  country: Country,
  seed: number,
  budget: (game: GameState) => Budget = keep,
): { quarter: number; type: DilemmaType }[] {
  const met: { quarter: number; type: DilemmaType }[] = [];
  let game = createGame(country, seed);
  while (inFirstTerm(game)) {
    if (game.dilemma !== null) met.push({ quarter: game.history.length, type: game.dilemma.type });
    game = advanceQuarter(game, answering(game, { budget: budget(game) })).state;
  }
  return met;
}

describe.each(countries)('when dilemmas arise in $name', ({ file, dry }) => {
  const quarters = (chances: Chances, budget?: (game: GameState) => Budget) =>
    arisals(withChances(file, chances), 5, budget).map((met) => met.quarter);

  it('leaves the same one alone for a while after it has been answered', () => {
    // The teachers rest eight quarters between claims.
    expect(quarters({ dilemmas: { teachersPay: 1 } })).toEqual([2, 10, 18]);
  });

  it('offers grain only while the reserve is below its safe level', () => {
    expect(quarters({ dilemmas: { grainOffer: 1 }, reserve: 3_000_000 })).toEqual([]);
  });

  it('brings the merchants only with the new year, when the harvest has reached the reserve', () => {
    expect(quarters({ dilemmas: { merchantOffer: 1 }, reserve: 3_000_000 })).toEqual([
      5, 9, 13, 17,
    ]);
  });

  it('asks for emergency works only while an event holds a region', () => {
    expect(quarters({ dilemmas: { emergencyWorks: 1 } })).toEqual([]);
    // A drought begins each planting season and ends with the harvest. Left without
    // relief, the region's famine ends the game in the eighth quarter.
    expect(quarters({ dilemmas: { emergencyWorks: 1 }, drought: { [dry]: 1 } })).toEqual([2, 6]);
  });

  it('brings strikers to talks only while a region is in unrest', () => {
    expect(quarters({ dilemmas: { strikeTalks: 1 } }, provident)).toEqual([]);
    expect(quarters({ dilemmas: { strikeTalks: 1 } }, harsh).length).toBeGreaterThan(0);
  });

  it('brings the donor only to a treasury that is low', () => {
    const surplus = (game: GameState): Budget => ({ ...austere(game), taxRatePercent: 20 });
    expect(quarters({ dilemmas: { donorGrant: 1 } }, surplus)).toEqual([]);
  });

  it('puts none in the election quarter', () => {
    // Nothing is spent for two quarters and everything from the third, which empties the
    // treasury and keeps it empty. The donor comes in the fourth quarter and, resting eight
    // quarters each time, in the twelfth, and would come again in the twentieth.
    const met = quarters({ dilemmas: { donorGrant: 1 } }, (game) =>
      game.history.length < 3 ? { ...austere(game), taxRatePercent: 5 } : ruinous(),
    );

    expect(met).toEqual([4, 12]);
  });

  it('are fixed by the seed, whatever else the country file says', () => {
    const chances: Chances = { dilemmas: { teachersPay: 0.3, grainOffer: 0.3 }, reserve: 0 };
    const country = () => withChances(file, chances);

    expect(arisals(country(), 9)).toEqual(arisals(country(), 9));
    const others = [1, 2, 3, 4, 5, 6].map((seed) => JSON.stringify(arisals(country(), seed)));
    expect(new Set(others).size).toBeGreaterThan(1);
  });

  it('leave the weather a seed brings exactly as it was', () => {
    const harvests = (country: Country) => {
      const grown: number[] = [];
      let game = createGame(country, 9);
      while (inFirstTerm(game)) {
        const { state, report } = advanceQuarter(game, answering(game, { budget: game.budget }));
        if (report.harvest !== null) grown.push(report.harvest.total);
        game = state;
      }
      return grown;
    };

    // Declining the donor changes nothing, so only the weather could make these differ.
    expect(harvests(withChances(file, { dilemmas: { donorGrant: 1 } }))).toEqual(
      harvests(withChances(file, {})),
    );
  });
});

describe.each([
  ['Tavara', tavaraAsShipped],
  ['Testland', testlandAsShipped],
] as const)('%s as it ships', (_name, country) => {
  it('puts dilemmas to a player who can always answer them and finish the term', () => {
    let met = 0;
    for (let seed = 1; seed <= 30; seed += 1) {
      let game = createGame(country(), seed);
      while (inFirstTerm(game)) {
        if (game.dilemma !== null) met += 1;
        game = advanceQuarter(game, answering(game, { budget: game.budget })).state;
      }
      // A game that is over waits on no answer.
      if (game.outcome.status !== 'playing') expect(game.dilemma).toBe(null);
    }
    expect(met).toBeGreaterThan(0);
  });
});

describe('dilemma likelihoods in a country file', () => {
  it('set how likely each dilemma is, and one the file does not mention never arises', () => {
    expect(tavaraAsShipped().dilemmaLikelihood).toEqual({
      grainOffer: 0.35,
      merchantOffer: 0.5,
      emergencyWorks: 0.6,
      strikeTalks: 0.4,
      teachersPay: 0.08,
      donorGrant: 0.3,
    });
    expect(testlandAsShipped().dilemmaLikelihood).toMatchObject({
      emergencyWorks: 0.5,
      strikeTalks: 0,
      donorGrant: 0,
    });
    expect(Object.keys(testlandAsShipped().dilemmaLikelihood)).toEqual([...DILEMMA_TYPES]);
  });

  it('may be left out altogether', () => {
    expect(loadCountry(without(tavaraFile, ['dilemmaLikelihood'])).dilemmaLikelihood).toEqual(
      Object.fromEntries(DILEMMA_TYPES.map((type) => [type, 0])),
    );
  });

  it('are rejected for a dilemma the game does not have', () => {
    expect(faultsOf(withValue(tavaraFile, ['dilemmaLikelihood'], { landReform: 0.2 }))).toEqual([
      `dilemmaLikelihood.landReform is not a dilemma this game has (${DILEMMA_TYPES.join(', ')}).`,
    ]);
  });

  it('are rejected when they are not a chance from 0 to 1', () => {
    expect(faultsOf(withValue(tavaraFile, ['dilemmaLikelihood', 'teachersPay'], 2))).toEqual([
      'dilemmaLikelihood.teachersPay is 2, but must be a chance from 0 to 1.',
    ]);
  });
});
