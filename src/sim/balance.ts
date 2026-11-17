import type { DilemmaDefinition } from './dilemmas';
import type { EventDefinition } from './events';
import type {
  DilemmaType,
  EventType,
  FoodStage,
  Likelihood,
  SiteEffect,
  SiteType,
  SpendingArea,
} from './vocabulary';

/** The balance values of one type of site. */
export interface SiteBalance {
  readonly cost: number;
  readonly buildQuarters: number;
  /** What the site in use leaves of each thing it bears on, in thousandths. */
  readonly effects: Readonly<Partial<Record<SiteEffect, number>>>;
}

/**
 * Every value that tunes the game lives here as data. The rules in the rest of the
 * simulation read these values and hold none of their own.
 */
export const balance = {
  calendar: {
    /** The season of each quarter. */
    seasons: { 1: 'Dry season', 2: 'Planting season', 3: 'Growing season', 4: 'Harvest season' },
    /** The quarter at the end of which every region brings its harvest in. */
    harvestQuarter: 4,
  },
  budget: {
    /** The tax rate, as a whole percentage of each region's output. */
    taxRatePercent: { min: 5, max: 40 },
    /** What may be spent on one area in a quarter, in Money units ($100,000). */
    spending: { min: 0, max: 200, step: 10 },
  },
  food: {
    /** What one person eats in a quarter, in kilograms. */
    consumptionKgPerPersonPerQuarter: 50,
    /** Tonnes grown on one unit (1,000 hectares) of farmland in an average year, by terrain. */
    harvestTonnesPerFarmland: {
      plains: 1200,
      highlands: 600,
      coast: 900,
      arid: 500,
      delta: 1300,
      valley: 1400,
    },
    /**
     * Each quarter the weather moves a region's coming harvest by up to this many
     * thousandths either way. Four quarters of it make the year's weather.
     */
    weatherSwingPermillePerQuarter: 40,
    agriculture: {
      /** The share of the full yield, in thousandths, grown with no agriculture spending. */
      basePermille: 850,
      /** Thousandths of yield added for each 1,000 Money units spent over the growing year. */
      bonusPermillePerThousandMoney: 375,
    },
    /** How many quarters of its own needs a region keeps back from its harvest. */
    regionKeepQuarters: 4,
    /** The share, in thousandths, of what a region sends to the reserve that never arrives. */
    transportLossPermille: 150,
    /** The share, in thousandths, of the national reserve that spoils each quarter. */
    reserveSpoilagePermillePerQuarter: 80,
    /** The reserve is safe when it holds at least this many months of what the country eats. */
    safeReserveMonths: 3,
  },
  relief: {
    /** Tonnes of food that one Money unit ($100,000) of food relief spending can move. */
    tonnesPerMoney: 200,
  },
  hunger: {
    /** A region is fed when its people eat at least this share of their needs, in thousandths. */
    fedSharePermille: 950,
    /** A shortage deepens into famine only when people eat less than this share. */
    famineSharePermille: 800,
    /** The share of a region's people who die in each quarter of famine, in thousandths. */
    famineDeathsPermillePerQuarter: 30,
    /** The state collapses when one region has been in famine this many quarters running. */
    collapseAfterFamineQuarters: 2,
  },
  approval: {
    /** Where a region's approval stands when nothing pushes it either way, in thousandths. */
    baselinePermille: 455,
    /**
     * Approval does not jump. Each quarter, the effect of each thing that moves it closes
     * this share, in thousandths, of the gap to where that thing would settle it.
     */
    adjustPermillePerQuarter: 100,
    /** Where a region's food situation settles its approval, in thousandths. */
    food: { adequate: 0, tight: -120, shortage: -300, famine: -600 } satisfies Record<
      FoodStage,
      number
    >,
    tax: {
      /** The tax rate people accept without complaint, as a whole percentage. */
      neutralPercent: 18,
      /** Thousandths of approval lost for each point of tax above that, or won for each below. */
      permillePerPoint: 12,
    },
    /**
     * The spending that serves the public. People expect a certain amount per head: spend
     * nothing and approval settles the whole weight lower, spend double what is expected
     * or more and it settles the whole weight higher, and in between in proportion.
     */
    services: {
      /** Expected spending is in Money units ($100,000) a quarter for each million people. */
      health: { expectedPerMillionPeople: 12, weightPermille: 60 },
      education: { expectedPerMillionPeople: 12, weightPermille: 40 },
      security: { expectedPerMillionPeople: 10, weightPermille: 40 },
    } satisfies Partial<
      Record<SpendingArea, { expectedPerMillionPeople: number; weightPermille: number }>
    >,
  },
  unrest: {
    /**
     * A region strikes while its approval is below `belowPermille`, and protests while it
     * is below the lower mark. While either lasts the region produces only `outputPermille`
     * thousandths of its output, which is what it pays tax on.
     */
    strikes: { belowPermille: 400, outputPermille: 700 },
    protests: { belowPermille: 300, outputPermille: 400 },
  },
  election: {
    /** The government's term, in quarters. The vote is held when the last of them ends. */
    termQuarters: 20,
    /** The share of the vote the government needs to stay in office, in thousandths. */
    winSharePermille: 500,
    /**
     * People vote as they approve, and the campaign then moves the result by up to this
     * many thousandths either way, by the seed.
     */
    swingPermille: 30,
  },
  /** How the game looks ahead for danger, holding the player's decisions as they are. */
  risks: {
    /** How many quarters ahead the dangers are looked for, counting the one being decided. */
    horizonQuarters: 4,
    /**
     * A harvest that fails leaves its region hungry from the quarter after it. So that a
     * harvest inside the horizon is judged by what it leaves, hunger alone is looked for
     * this many quarters further on.
     */
    hungerShowsQuartersLater: 1,
    /**
     * The weather that is supposed, from the worst to the best: each quarter's weather as a
     * share of its full swing, in thousandths, and how much of the chance that course of
     * weather stands for, in thousandths that add up to 1000. The two ends are the limits of
     * what can happen, so nothing possible is left out, and they are given more weight than
     * a run of such weather really has: the list errs towards warning.
     */
    weatherOutlooks: [
      { swingSharePermille: -1000, weightPermille: 100 },
      { swingSharePermille: -500, weightPermille: 200 },
      { swingSharePermille: 0, weightPermille: 400 },
      { swingSharePermille: 500, weightPermille: 200 },
      { swingSharePermille: 1000, weightPermille: 100 },
    ],
    /**
     * A risk is given a likelihood when its chance, in thousandths, is at least this much.
     * A chance below the first is negligible, and the risk is not listed.
     */
    likelihoodFromPermille: {
      remote: 20,
      unlikely: 100,
      possible: 300,
      likely: 600,
      almostCertain: 900,
    } satisfies Record<Likelihood, number>,
  },
  /**
   * What can be built. Each type costs `cost` in Money units ($100,000), paid over the
   * `buildQuarters` it takes to build, and then has its effects for good: each leaves that
   * many thousandths of what it bears on (see `SITE_EFFECT_DEFINITIONS`).
   */
  sites: {
    irrigation: { cost: 120, buildQuarters: 3, effects: { harvestWeather: 500 } },
    farmRoad: { cost: 100, buildQuarters: 3, effects: { transportLoss: 500 } },
    grainStore: { cost: 60, buildQuarters: 2, effects: { reserveSpoilage: 750 } },
  } satisfies Record<SiteType, SiteBalance>,
  dilemmaRules: {
    /** No dilemma arises before this quarter of the game, counting the first as 1. */
    earliestQuarter: 2,
    /** None arises in this many of the term's last quarters, the election quarter among them. */
    quartersClearBeforeElection: 1,
  },
  /**
   * The dilemmas. Money is in Money units ($100,000) for each million people, and food is a
   * share, in thousandths, of what the people concerned eat in a quarter, so the same data
   * serves a country of any size. Approval is in thousandths: it lands at once and fades.
   */
  dilemmas: {
    grainOffer: {
      name: 'Grain from a neighbour',
      title: 'A neighbour offers grain',
      story:
        'The national reserve is below its safe level, and a neighbouring government has noticed. It offers a shipment of grain at its own price, to be paid for at once.',
      conditions: { reserve: 'belowSafe', restQuarters: 4 },
      options: [
        {
          id: 'buy',
          label: 'Buy the whole shipment',
          effects: [
            { kind: 'treasury', perMillionPeople: -24 },
            { kind: 'reserve', needPermille: 200 },
          ],
        },
        {
          id: 'half',
          label: 'Buy half of it',
          effects: [
            { kind: 'treasury', perMillionPeople: -12 },
            { kind: 'reserve', needPermille: 100 },
          ],
        },
        { id: 'decline', label: 'Decline the offer', effects: [] },
      ],
    },
    merchantOffer: {
      name: 'Grain sold to merchants',
      title: 'Merchants offer to buy grain',
      story:
        'The harvest is in and the national reserve is above its safe level. Grain merchants offer to buy a part of it for export. The money is good, and the grain will be gone before the next harvest is known.',
      // It comes with the new year, when the harvest has just reached the reserve.
      conditions: { inQuarters: [1], reserve: 'aboveSafe', restQuarters: 4 },
      options: [
        {
          id: 'sell',
          label: 'Sell them a large part',
          effects: [
            { kind: 'reserve', needPermille: -300 },
            { kind: 'treasury', perMillionPeople: 24 },
          ],
        },
        {
          id: 'some',
          label: 'Sell them a little',
          effects: [
            { kind: 'reserve', needPermille: -150 },
            { kind: 'treasury', perMillionPeople: 12 },
          ],
        },
        { id: 'keep', label: 'Keep the grain', effects: [] },
      ],
    },
    emergencyWorks: {
      name: 'Emergency works',
      title: '{region} asks for emergency works',
      story:
        'The failed rains have left {region} without work in its fields. Its council asks for public works to carry families through to the harvest, or failing that for grain from the national reserve.',
      conditions: { place: 'struckByEvent', restQuarters: 3 },
      options: [
        {
          id: 'works',
          label: 'Pay for the works',
          effects: [
            { kind: 'treasury', perMillionPeople: -6 },
            { kind: 'approval', permille: 60, where: 'region' },
          ],
        },
        {
          id: 'grain',
          label: 'Send grain instead',
          effects: [
            { kind: 'regionGrain', needPermille: 500 },
            { kind: 'approval', permille: 20, where: 'region' },
          ],
        },
        {
          id: 'refuse',
          label: 'Refuse both',
          effects: [{ kind: 'approval', permille: -50, where: 'region' }],
        },
      ],
    },
    strikeTalks: {
      name: 'Talks with the strikers',
      title: 'Strikers in {region} ask for talks',
      story:
        'The strike committee in {region} offers to send people back to work if their grievances are met. Giving way costs money and shows that striking pays. Holding out costs nothing today and hardens them.',
      conditions: { place: 'inUnrest', restQuarters: 4 },
      options: [
        {
          id: 'concede',
          label: 'Meet their demands',
          effects: [
            { kind: 'treasury', perMillionPeople: -8 },
            { kind: 'approval', permille: 80, where: 'region' },
          ],
        },
        {
          id: 'refuse',
          label: 'Hold out',
          effects: [{ kind: 'approval', permille: -30, where: 'region' }],
        },
      ],
    },
    teachersPay: {
      name: 'Teachers’ pay',
      title: 'Teachers demand a pay rise',
      story:
        'The teachers’ union says its members cannot live on their pay and threatens to close the schools. Parents everywhere are watching what you do.',
      conditions: { restQuarters: 8 },
      options: [
        {
          id: 'grant',
          label: 'Grant the rise',
          effects: [
            { kind: 'treasury', perMillionPeople: -8 },
            { kind: 'approval', permille: 20, where: 'nation' },
          ],
        },
        {
          id: 'refuse',
          label: 'Refuse it',
          effects: [{ kind: 'approval', permille: -30, where: 'nation' }],
        },
      ],
    },
    donorGrant: {
      name: 'Donor grant',
      title: 'A donor offers a grant with conditions',
      story:
        'The treasury is low, and a foreign donor offers to fill it. In return it wants an end to subsidies that many households rely on, and people will know why prices rose.',
      conditions: { treasuryBelowPerMillionPeople: 60, restQuarters: 8 },
      options: [
        {
          id: 'accept',
          label: 'Accept the grant',
          effects: [
            { kind: 'treasury', perMillionPeople: 30 },
            { kind: 'approval', permille: -40, where: 'nation' },
          ],
        },
        { id: 'decline', label: 'Decline it', effects: [] },
      ],
    },
  } satisfies Record<DilemmaType, DilemmaDefinition>,
  events: {
    drought: {
      name: 'Drought',
      // It begins in the planting season, two quarters before the harvest it spoils.
      conditions: { beginsInQuarters: [2] },
      endsAfterHarvest: true,
      effects: { harvestPermille: 600 },
      announcement: {
        begins: 'The rains have failed.',
        ends: 'The harvest it spoiled is in, and the next growing year starts afresh.',
      },
    },
  } satisfies Record<EventType, EventDefinition>,
} as const;
