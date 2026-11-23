import type { DilemmaDefinition } from './dilemmas';
import type { EventDefinition } from './events';
import type { PriceShockDefinition } from './priceShocks';
import type {
  CreditRating,
  DilemmaType,
  EventType,
  FoodStage,
  Good,
  LastingService,
  Likelihood,
  PriceShockType,
  ProsperityPart,
  SiteEffect,
  SiteType,
  SpendingArea,
  Technology,
  Tier,
} from './vocabulary';

/** The balance values of one step of the credit rating. */
export interface CreditStepBalance {
  /** The score, in points, the step begins at. */
  readonly fromScore: number;
  /** What it adds to the rate of a loan on the menu, in hundredths of a percent a year. */
  readonly loanRateBasisPoints: number;
  /**
   * What it adds to the rate of a bond on the menu, in hundredths of a percent a year, where
   * bonds may be issued at all (`finance.bonds.leastRating`).
   */
  readonly bondRateBasisPoints: number;
  /** The most the nation may owe, in thousandths of a year's revenue. */
  readonly debtLimitPermille: number;
}

/** The balance values of one type of site. */
export interface SiteBalance {
  readonly cost: number;
  readonly buildQuarters: number;
  /**
   * What keeping the site in good repair costs, in Money units ($100,000) a quarter, from
   * its first quarter in use. Left unpaid, the site decays (see `balance.upkeep`).
   */
  readonly upkeep: number;
  /** What the site in use leaves of each thing it bears on, in thousandths. */
  readonly effects: Readonly<Partial<Record<SiteEffect, number>>>;
  /**
   * What the site in use adds to its region's infrastructure access, in thousandths of the
   * whole. A route counts for the region it belongs to.
   */
  readonly infrastructurePermille: number;
  /**
   * For a site that plays a part in a chain (`SITE_TYPE_DEFINITIONS`), how much ore it
   * produces or carries in a quarter while in good repair, counted as what that ore is worth at
   * the usual world ore price, in Money units: at $100 a tonne, 600 is 600,000 tonnes. A chain
   * ships the least of its sites' capacities, and a decaying site has only part of its
   * capacity. What the ore shipped earns follows the world ore price.
   */
  readonly capacity?: number;
}

/**
 * The balance values of one technology: what researching it costs, in Money units, paid over
 * the `researchQuarters` it takes, and what it does once known. Each effect leaves that many
 * thousandths of what it bears on in every region, or across the nation for an effect whose
 * reach is the nation (`SITE_EFFECT_DEFINITIONS`), multiplying with what the sites in use do.
 */
export interface TechnologyBalance {
  readonly cost: number;
  readonly researchQuarters: number;
  readonly effects: Readonly<Partial<Record<SiteEffect, number>>>;
}

/**
 * How the world price of one good moves. Prices are in whole dollars a tonne. Each quarter the
 * price closes `revertPermillePerQuarter` thousandths of the gap to its usual level, and world
 * markets then move it by up to `swingPermillePerQuarter` thousandths of the usual level either
 * way, by the seed; it never leaves the range from `lowest` to `highest`.
 */
export interface GoodBalance {
  readonly usualDollarsPerTonne: number;
  readonly lowestDollarsPerTonne: number;
  readonly highestDollarsPerTonne: number;
  readonly swingPermillePerQuarter: number;
  readonly revertPermillePerQuarter: number;
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
      bonusPermillePerThousandMoney: 600,
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
  population: {
    /**
     * How fast each region's people grow in number, in ten-thousandths a quarter, unless its
     * country file sets its own rate. 30 is about 1.2% a year. A region in famine does not grow.
     */
    growthPerTenThousandPerQuarter: 30,
    /** The fastest yearly growth, in percent, that a country file may give a region. */
    maxGrowthPercentPerYear: 10,
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
    baselinePermille: 515,
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
    /**
     * A term of office, in quarters. The vote is held when the last of them ends, and a
     * government that wins it begins another term of the same length. There is no limit
     * on the number of terms.
     */
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
    /**
     * The chance, in thousandths, given to a danger that only a slump in the world ore price
     * to the low end of its forecast would bring. A slump that deep is rare, but it is what a
     * country that lives on its mine must be ready for, so it errs towards warning.
     */
    oreSlumpChancePermille: 100,
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
    irrigation: {
      cost: 120,
      buildQuarters: 3,
      upkeep: 4,
      effects: { harvestWeather: 500 },
      infrastructurePermille: 200,
    },
    farmRoad: {
      cost: 100,
      buildQuarters: 3,
      upkeep: 3,
      effects: { transportLoss: 500 },
      infrastructurePermille: 300,
    },
    grainStore: {
      cost: 60,
      buildQuarters: 2,
      upkeep: 2,
      effects: { reserveSpoilage: 750 },
      infrastructurePermille: 200,
    },
    // The large sites of a chain. Each is slow to build and costs several quarters' tax, so
    // one started late in a term opens after the election.
    mine: {
      cost: 400,
      buildQuarters: 6,
      upkeep: 6,
      effects: {},
      infrastructurePermille: 100,
      capacity: 600,
    },
    trunkRoad: {
      cost: 300,
      buildQuarters: 5,
      upkeep: 5,
      effects: {},
      infrastructurePermille: 400,
      capacity: 720,
    },
    port: {
      cost: 500,
      buildQuarters: 8,
      upkeep: 8,
      effects: {},
      infrastructurePermille: 300,
      capacity: 900,
    },
    // A port for shallow-draught ships: about half the cost of a deep-water port and quicker
    // to build, but it ships less than a mine produces. A country offers it as an
    // alternative to a deep-water port, so choosing it gives up the larger trade for good.
    shallowPort: {
      cost: 250,
      buildQuarters: 5,
      upkeep: 4,
      effects: {},
      infrastructurePermille: 200,
      capacity: 360,
    },
    // A power station does nothing alone: what power gives a region is `power`, below, and
    // it reaches a region only along a power line. So a line adds nothing of its own to
    // infrastructure access: the power it brings does.
    powerStation: {
      cost: 300,
      buildQuarters: 5,
      upkeep: 5,
      effects: {},
      infrastructurePermille: 100,
    },
    powerLine: {
      cost: 60,
      buildQuarters: 2,
      upkeep: 1,
      effects: {},
      infrastructurePermille: 0,
    },
  } satisfies Record<SiteType, SiteBalance>,
  /**
   * What can be researched (`TECHNOLOGY_DEFINITIONS` gives each its name and prerequisites).
   * Research is a project on no site: paid in instalments after the budget, paused when the
   * treasury cannot pay, and known from the quarter after its last instalment. One
   * technology is researched at a time.
   */
  technologies: {
    // Weather and drought move every region's harvest 30% less; a flood's water it does not
    // hold back. It multiplies with irrigation where a region has both.
    droughtResistantSeed: {
      cost: 80,
      researchQuarters: 4,
      effects: { weatherAndDrought: 700 },
    },
  } satisfies Record<Technology, TechnologyBalance>,
  /**
   * Surveys. A survey of a region is a project on no site, like research: it costs `cost`
   * Money units, paid over the `surveyQuarters` it takes, and is paid for, paused and barred
   * like any project. What it finds is the country file's: a hidden deposit, there or not by
   * its likelihood, of a size somewhere in its range. A deposit's size is a whole number of
   * `tonnesStep` tonnes of ore a quarter, from one step to `mostTonnes`.
   */
  surveys: {
    // Cheap beside the mine it may reveal, so that a gamble on one is worth taking, but dear
    // enough that surveying every region at once stretches an opening treasury.
    cost: 40,
    surveyQuarters: 2,
    tonnesStep: 10_000,
    mostTonnes: 1_500_000,
  },
  /**
   * What power gives a region while a power line in use links it to a power station in use:
   * `outputPermille` thousandths more output, before anything a chain adds, and
   * `infrastructurePermille` thousandths of infrastructure access. While the station or a
   * line of the link decays, the region has only `upkeep.decayingEffectPermille` of each.
   */
  power: {
    outputPermille: 200,
    infrastructurePermille: 150,
  },
  /**
   * Upkeep. Each quarter the upkeep spending keeps the sites in use in good repair one by
   * one, in the order building began on them, until what is left will not cover the next:
   * that site and every one started after it go without, so the newest decay first. A site
   * that goes without is decaying from the next quarter, and does only
   * `decayingEffectPermille` thousandths of what it does in good repair, until a quarter in
   * which its upkeep is paid restores it.
   */
  upkeep: {
    decayingEffectPermille: 500,
  },
  /**
   * Living standards and prosperity. Every score is in thousandths: a region's living
   * standard is its five parts' scores weighted by `weightsPermille`, which add up to 1000.
   * National prosperity is the regions' living standards averaged by population.
   */
  prosperity: {
    weightsPermille: {
      food: 150,
      income: 150,
      health: 150,
      education: 150,
      infrastructure: 400,
    } satisfies Record<ProsperityPart, number>,
    /** Food security by the region's food situation. */
    food: { adequate: 1000, tight: 600, shortage: 250, famine: 0 } satisfies Record<
      FoodStage,
      number
    >,
    /** Income per head scores in full at this many dollars per person a quarter, and in proportion below. */
    fullIncomeDollarsPerPersonPerQuarter: 250,
    /**
     * Health and education are levels in each region. Spending sets where a level is
     * heading: this many thousandths for each Money unit ($100,000) spent a quarter on each
     * million people, up to the whole. Each quarter the level closes a share of the gap, in
     * thousandths: `buildPermillePerQuarter` while it rises, `wearPermillePerQuarter` while it
     * falls. A game starts with each level where its starting budget would hold it.
     */
    services: {
      health: {
        permillePerMoneyPerMillionPeople: 11,
        buildPermillePerQuarter: 50,
        wearPermillePerQuarter: 50,
      },
      education: {
        permillePerMoneyPerMillionPeople: 11,
        buildPermillePerQuarter: 40,
        wearPermillePerQuarter: 40,
      },
    } satisfies Record<
      LastingService,
      {
        permillePerMoneyPerMillionPeople: number;
        buildPermillePerQuarter: number;
        wearPermillePerQuarter: number;
      }
    >,
    /**
     * Where each tier begins, in thousandths of prosperity, and how far the public's
     * expectations in it lower the approval baseline compared with the lowest tier.
     */
    tiers: {
      subsistence: { fromPermille: 0, expectationsPermille: 0 },
      developing: { fromPermille: 300, expectationsPermille: 30 },
      industrialising: { fromPermille: 380, expectationsPermille: 60 },
      // The last tier is the target the country is aiming for.
      prosperous: { fromPermille: 420, expectationsPermille: 90 },
    } satisfies Record<Tier, { fromPermille: number; expectationsPermille: number }>,
    /**
     * A tier once reached is lost only when prosperity falls this many thousandths below
     * where it begins, so that a figure hovering at the line does not pass it every quarter.
     */
    fallBackMarginPermille: 20,
  },
  /**
   * Borrowing. Money is in Money units ($100,000) and rates in hundredths of a percent a
   * year: 600 is 6% a year. A loan is repaid in equal quarterly repayments of interest and
   * principal over its term, starting the quarter after its money arrives. Interest each
   * quarter is a quarter of the yearly rate on what is still owed.
   */
  finance: {
    loans: {
      /** The sums a loan may be taken out for. */
      amounts: [100, 250, 500],
      /**
       * The terms a loan may be taken over, each with the rate it is lent at to a nation
       * rated A. The credit rating moves it (`credit.ratings`).
       */
      terms: [
        { quarters: 4, annualRateBasisPoints: 600 },
        { quarters: 8, annualRateBasisPoints: 800 },
        { quarters: 12, annualRateBasisPoints: 1000 },
      ],
    },
    /**
     * Bonds: only interest is paid each quarter, and the whole sum falls due in one payment
     * at maturity. They raise more than a loan, at a lower rate, but only a nation rated well
     * enough may issue them.
     */
    bonds: {
      /**
       * The worst credit rating at which bonds may be issued: the best there is, so a nation
       * that opens at A must earn it by repaying debt on time (25 points a quarter, about nine
       * quarters with a small loan and no deficit).
       */
      leastRating: 'aa' as CreditRating,
      /** The sums a bond may be issued for. */
      amounts: [200, 500, 1000, 2000],
      /**
       * The terms a bond may run for, each with its base rate, the one a nation rated A would
       * get. The credit rating moves it (`credit.ratings`): at AA, where bonds are issued, it
       * is half a point lower, and still below every loan's rate there.
       */
      terms: [
        { quarters: 8, annualRateBasisPoints: 400 },
        { quarters: 12, annualRateBasisPoints: 450 },
        { quarters: 16, annualRateBasisPoints: 500 },
      ],
    },
    /**
     * Debt a country file may start the game with (format 4): loans already owed, each with
     * its own rate and the quarters left to repay it, repaid level from the first quarter.
     * The limits keep a country from opening on debt it cannot carry.
     */
    startingDebt: {
      /** The most loans a country may start with. */
      mostLoans: 5,
      /** The highest yearly rate a starting loan may carry, in percent. */
      mostRatePercent: 25,
      /** The most quarters a starting loan may have left to run. */
      mostQuarters: 40,
      /**
       * The most that may be owed at the start, in thousandths of a year's output from all
       * the regions: half of it. A country's first repayments must also be payable from its
       * starting treasury and the first quarter's tax on that output. The check counts tax
       * before unrest, so a country that opens in unrest may still miss its first payment.
       */
      mostOwedPermille: 500,
    },
    /**
     * A bailout: what a missed payment on any debt brings. Lenders consolidate everything
     * owed into one bailout loan on their terms, repaid level from the quarter after, and
     * austerity follows (`austerity` below).
     */
    bailout: {
      /** The rate the bailout loan is lent at, in hundredths of a percent a year. */
      annualRateBasisPoints: 700,
      /** The quarters the bailout loan is repaid over, from the quarter after the bailout. */
      termQuarters: 16,
      /**
       * The push a bailout gives approval in every region as it lands, in thousandths. It
       * fades like any passing event. A missed payment during austerity gives none. It is
       * heavy enough that a government bailed out in the run-up to a vote is likely to lose it.
       */
      approvalPermille: -120,
    },
    /**
     * Austerity: the bailout's terms, in force for a fixed number of quarters after it. The
     * tax rate may not go below a floor, spending on some areas may not go above a cap, and
     * nothing may be borrowed nor any project started. Projects already under way carry on.
     */
    austerity: {
      /** The quarters austerity lasts, counting from the quarter after the bailout. */
      quarters: 8,
      /** What a missed payment during austerity adds to the quarters it has left. */
      extendQuarters: 4,
      /** The lowest tax rate allowed, as a whole percentage. */
      taxFloorPercent: 25,
      /**
       * The capped areas, each capped at this share, in thousandths, of what the country's
       * starting budget spends on it, brought down onto a step of the slider but never below
       * one step unless the starting budget spends nothing there. Areas left out are not
       * capped: food relief and upkeep, so that austerity starves no one and lets nothing
       * decay that the player keeps up.
       */
      spendingCapPermille: {
        agriculture: 1000,
        health: 800,
        education: 800,
        security: 800,
      } satisfies Partial<Record<SpendingArea, number>> as Partial<Record<SpendingArea, number>>,
    },
    /**
     * The credit rating, reassessed as each quarter ends. Its score is the payment record
     * less a share of the debt burden and a share of the quarter's deficit, in points: the
     * rating is the best step whose score it reaches (see `credit.ts`).
     */
    credit: {
      /** The payment record a nation starts with, in points. */
      startingRecord: 700,
      /** The best payment record there is. */
      bestRecord: 1000,
      /**
       * The payment record a quarter with a missed payment leaves: nothing. With nothing to
       * its record the score can reach no step but the lowest, which a bailout brings.
       */
      missedPaymentRecord: 0,
      /** What a quarter whose repayments were all made on time adds to the payment record. */
      onTimePoints: 25,
      /**
       * The points taken off the score for each thousandth of debt burden, in thousandths:
       * owing a whole year's revenue costs 400 points.
       */
      burdenWeightPermille: 400,
      /**
       * The points taken off for each thousandth of the quarter's revenue spent beyond it, in
       * thousandths. Repaying principal is not counted as a deficit; interest is.
       */
      deficitWeightPermille: 300,
      /** A deficit is counted up to this many thousandths of the quarter's revenue. */
      deficitCapPermille: 1000,
      /**
       * Each step of the rating: the score it begins at, what it does to the rate a loan or a
       * bond is offered at, in hundredths of a percent a year, and the most the nation may owe,
       * counting what it means to borrow this quarter, in thousandths of a year's revenue at
       * the budget in force. The worst step begins at 0, where the score stops.
       */
      ratings: {
        aa: {
          fromScore: 850,
          loanRateBasisPoints: -100,
          bondRateBasisPoints: -50,
          debtLimitPermille: 1250,
        },
        a: {
          fromScore: 550,
          loanRateBasisPoints: 0,
          bondRateBasisPoints: 0,
          debtLimitPermille: 1000,
        },
        bbb: {
          fromScore: 400,
          loanRateBasisPoints: 150,
          bondRateBasisPoints: 100,
          debtLimitPermille: 750,
        },
        bb: {
          fromScore: 200,
          loanRateBasisPoints: 300,
          bondRateBasisPoints: 200,
          debtLimitPermille: 500,
        },
        b: {
          fromScore: 0,
          loanRateBasisPoints: 500,
          bondRateBasisPoints: 350,
          debtLimitPermille: 250,
        },
      } satisfies Record<CreditRating, CreditStepBalance>,
    },
  },
  /**
   * Trade with the world. Each good has a world price that moves every quarter. Grain can be
   * ordered for the national reserve: it arrives, and is paid for at the price of the quarter
   * it was ordered in, as that quarter ends. Grain can be sold from the reserve at that price
   * less the export margin. Ore is sold abroad by a mine's chain, at the world ore price.
   */
  trade: {
    goods: {
      // The usual price is what the neighbour's grain cost when its price was fixed: $2.4m for
      // a fifth of what a million people eat in a quarter.
      grain: {
        usualDollarsPerTonne: 240,
        lowestDollarsPerTonne: 150,
        highestDollarsPerTonne: 420,
        swingPermillePerQuarter: 125,
        revertPermillePerQuarter: 250,
      },
      // Ore is what a mine's chain ships abroad. Its usual price makes a chain's capacities,
      // which are counted in Money at that price, a round number of tonnes. It swings further
      // than grain, so a country that lives on its mine lives with a riskier income.
      ore: {
        usualDollarsPerTonne: 100,
        lowestDollarsPerTonne: 45,
        highestDollarsPerTonne: 190,
        swingPermillePerQuarter: 150,
        revertPermillePerQuarter: 200,
      },
    } satisfies Record<Good, GoodBalance>,
    /** An order is for a whole number of these tonnes. */
    orderStepTonnes: 1000,
    /**
     * Grain sold abroad fetches the world price less this many thousandths of it, for the
     * shipping and the traders' cut, so that selling fetches less than buying costs.
     */
    exportMarginPermille: 200,
    /** How many quarters ahead the forecast range of a price looks, counting the next. */
    forecastQuarters: 4,
    /**
     * Border crossings, which a country file names, each with the grain it carries across the
     * border in a quarter: a whole number of order steps from `leastTonnes` to `mostTonnes`,
     * small beside a port. A file of a format older than 5 cannot name them, and is read as
     * having one crossing on each neighbour carrying `unlistedTonnes`.
     */
    crossings: {
      leastTonnes: 1000,
      mostTonnes: 100_000,
      unlistedTonnes: 45_000,
    },
  },
  /**
   * World price shocks: events abroad that push one good's world price each quarter they are
   * in force, on top of what markets do, by a share of its usual price in thousandths. Each is
   * announced `noticeQuarters` before it first moves the price, and is in force for
   * `lastsQuarters`. How likely each is to be announced in a quarter is the country file's
   * business. The notice is shorter than the risks' horizon, so a shock that could still be
   * announced is looked for there as a risk of its own. The forecast of the price allows only
   * for shocks already announced.
   */
  priceShocks: {
    failedHarvestsAbroad: {
      name: 'Failed harvests abroad',
      called: 'failed harvests abroad',
      good: 'grain',
      // $36 a tonne a quarter: with markets and the pull towards the usual price the grain
      // price stays within $90 of where it was, and three quarters of it raise it by about a
      // third.
      pushPermillePerQuarter: 150,
      noticeQuarters: 2,
      lastsQuarters: 3,
      announcement: {
        coming:
          'Harvests have failed across the grain-growing world, and buyers are bidding for what is left.',
        ends: 'A new harvest abroad is in, and grain is easier to buy again.',
      },
    },
    oreGlut: {
      name: 'Ore glut',
      called: 'an ore glut',
      good: 'ore',
      // $20 a tonne a quarter: three quarters of it take the ore price down by about two fifths,
      // and a mine's earnings with it.
      pushPermillePerQuarter: -200,
      noticeQuarters: 2,
      lastsQuarters: 3,
      announcement: {
        coming:
          'New mines abroad have flooded the world with ore, and buyers are paying less for it.',
        ends: 'The glut of ore abroad has been taken up, and buyers pay as they did.',
      },
    },
  } satisfies Record<PriceShockType, PriceShockDefinition>,
  /** How the game is won. */
  victory: {
    /**
     * The game is won once national prosperity has ended this many quarters running in the
     * top tier, with debt at a sustainable level (see `victory.ts`).
     */
    quartersToHold: 4,
    /**
     * The debt test: the most debt burden, owed against a year's revenue in thousandths,
     * that the quarter completing the hold may end with. Above it the hold goes on counting
     * but the win waits. Three tenths of a year's revenue: a nation rated A may owe more than
     * three times that, so a win reached by borrowing up to what lenders allow does not count
     * until most of it is repaid.
     */
    debtBurdenLimitPermille: 300,
  },
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
        'The national reserve is below its safe level, and a neighbouring government has noticed. It offers a shipment of grain at the world price, to be paid for at once.',
      conditions: { reserve: 'belowSafe', restQuarters: 4 },
      options: [
        {
          id: 'buy',
          label: 'Buy the whole shipment',
          effects: [
            { kind: 'atWorldPrice', good: 'grain', needPermille: 200, pricePermille: 1000 },
            { kind: 'reserve', needPermille: 200 },
          ],
        },
        {
          id: 'half',
          label: 'Buy half of it',
          effects: [
            { kind: 'atWorldPrice', good: 'grain', needPermille: 100, pricePermille: 1000 },
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
        'The harvest is in and the national reserve is above its safe level. Grain merchants offer to buy a part of it at the world price, and to fetch it themselves. The money is good, and the grain will be gone before the next harvest is known.',
      // It comes with the new year, when the harvest has just reached the reserve.
      conditions: { inQuarters: [1], reserve: 'aboveSafe', restQuarters: 4 },
      options: [
        {
          id: 'sell',
          label: 'Sell them a large part',
          effects: [
            { kind: 'reserve', needPermille: -300 },
            { kind: 'atWorldPrice', good: 'grain', needPermille: -300, pricePermille: 1000 },
          ],
        },
        {
          id: 'some',
          label: 'Sell them a little',
          effects: [
            { kind: 'reserve', needPermille: -150 },
            { kind: 'atWorldPrice', good: 'grain', needPermille: -150, pricePermille: 1000 },
          ],
        },
        { id: 'keep', label: 'Keep the grain', effects: [] },
      ],
    },
    emergencyWorks: {
      name: 'Emergency works',
      title: '{region} asks for emergency works',
      story:
        'Drought or flood has left {region} without work in its fields. Its council asks for public works to carry families through to the harvest, or failing that for grain from the national reserve.',
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
      effects: {
        harvestPermille: 600,
        decaysSites: false,
        heldBy: ['harvestWeather', 'weatherAndDrought'],
      },
      announcement: {
        begins: 'The rains have failed.',
        ends: 'The harvest it spoiled is in, and the next growing year starts afresh.',
      },
    },
    flood: {
      name: 'Flood',
      // The rivers rise with the planting rains, two quarters before the harvest it spoils.
      // It begins in the same quarter as drought, so the two share the region's roll and never
      // strike one region in the same year.
      conditions: { beginsInQuarters: [2] },
      endsAfterHarvest: true,
      // It takes less of the harvest than a drought, but the water damages every site in use
      // in the region: each decays until its upkeep is paid again. Irrigation softens what it
      // does to the harvest as it softens the weather (`sites.irrigation.effects`), but
      // drought-resistant seed does not.
      effects: { harvestPermille: 700, decaysSites: true, heldBy: ['harvestWeather'] },
      announcement: {
        begins: 'The rivers have burst their banks.',
        ends: 'The harvest it spoiled is in, and the next growing year starts afresh.',
      },
    },
  } satisfies Record<EventType, EventDefinition>,
} as const;
