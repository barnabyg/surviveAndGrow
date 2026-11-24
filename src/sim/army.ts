import { apportion, clamp, stepTowards, sum } from './arithmetic';
import { balance } from './balance';
import type { Budget } from './budget';
import { regionName, type Country } from './country';
import type { ReportEntry } from './report';
import type { RegionState } from './state';
import { capitalised, formatMoney, formatPercent, listed } from './text';
import type { Contribution, Figure, Money } from './types';
import {
  ARMY_STAGE_NAMES,
  ARMY_STAGES,
  LOYALTY_DRIVER_NAMES,
  LOYALTY_DRIVERS,
  UNREST_NAMES,
  type ArmyStage,
  type LoyaltyDriver,
  type Unrest,
} from './vocabulary';

/**
 * What each driver now adds to or takes from the loyalty of the army in a region, in
 * thousandths. A region's army loyalty is the baseline plus these, held between nothing and
 * the whole, as its approval is.
 */
export type ArmyLoyaltyEffects = Readonly<Record<LoyaltyDriver, number>>;

/** A region's army loyalty as the state holds it. */
type RegionLoyalty = Pick<RegionState, 'armyLoyalty' | 'armyLoyaltyEffects'>;

/** How the army in one region stands. All figures are in thousandths. */
export interface RegionArmyLoyalty {
  readonly regionId: string;
  readonly loyalty: number;
  readonly stage: ArmyStage;
  /** Where it settles if Defence spending and the region's unrest stay as they are. */
  readonly settles: number;
  /** The stage it settles in. */
  readonly settlesStage: ArmyStage;
  /** The baseline and what each driver now adds to or takes from it, adding up to loyalty. */
  readonly causes: readonly Contribution[];
}

/** How national army loyalty stands, and what it is made of. All figures are in thousandths. */
export interface ArmyLoyaltyStatus {
  /** National army loyalty: the regions' loyalty averaged by population. */
  readonly loyalty: number;
  readonly stage: ArmyStage;
  /** The army is restless while its loyalty is below this. */
  readonly restlessBelow: number;
  /** The army is plotting while its loyalty is below this. */
  readonly plottingBelow: number;
  /** Where national loyalty settles if Defence spending and each region's unrest stay as they are. */
  readonly settles: number;
  readonly settlesStage: ArmyStage;
  /** What is spent on Defence a quarter under the budget judged. */
  readonly spent: Money;
  /** What the army expects to be spent a quarter, for the people the country now has. */
  readonly expected: Money;
  /** The baseline and what each driver now adds to or takes from it, adding up to loyalty. */
  readonly causes: readonly Contribution[];
  /** Each region's army, in the country file's order. */
  readonly regions: readonly RegionArmyLoyalty[];
}

export interface ArmyLoyaltyOutcome {
  /** The regions with their army loyalty and its effects brought up to date. */
  readonly regions: readonly RegionState[];
  /** National army loyalty after the quarter, in thousandths, with everything that moved it. */
  readonly loyalty: Figure;
  /** Where national loyalty settles if the same spending and unrest go on. */
  readonly heading: number;
  readonly entries: readonly ReportEntry[];
}

const LIMITS = { min: 0, max: 1000 } as const;
const LIMIT_LABEL = 'Army loyalty at its limit';

/** The stage a loyalty is read as, by the marks in balance data. */
export function armyStageAt(loyalty: number): ArmyStage {
  const { restlessBelowPermille, plottingBelowPermille } = balance.army.loyalty.stages;
  if (loyalty < plottingBelowPermille) return 'plotting';
  return loyalty < restlessBelowPermille ? 'restless' : 'loyal';
}

/** National army loyalty, in thousandths: the regions' loyalty averaged by population. */
export function nationalLoyalty(regions: readonly RegionState[]): number {
  return averaged(regions, (region) => region.armyLoyalty);
}

/** What the army expects to be spent on Defence a quarter, for a number of people, unrounded. */
function expectedFor(people: number): number {
  return (balance.army.loyalty.defence.expectedPerMillionPeople * people) / 1_000_000;
}

/**
 * The least Defence spending the slider allows that holds the army loyal in a calm region,
 * for a number of people. An older country file and an earlier save, which say nothing of
 * Defence, are read as spending this.
 */
export function defenceToHoldLoyal(people: number): Money {
  const { min, max, step } = balance.budget.spending;
  const { restlessBelowPermille } = balance.army.loyalty.stages;
  const amounts = Array.from(
    { length: Math.floor((max - min) / step) + 1 },
    (_, index) => min + index * step,
  );
  return (
    amounts.find(
      (amount) => loyaltyFrom(settledEffects('calm', amount, people)) >= restlessBelowPermille,
    ) ?? max
  );
}

/**
 * Army loyalty as a region starts the game: settled where the starting budget and the
 * region's unrest put it, so that nothing moves until something changes.
 */
export function startingLoyalty(country: Country, unrest: Unrest): RegionLoyalty {
  return settledLoyalty(
    unrest,
    country.start.budget.spending.defence,
    sum(country.regions.map((region) => region.population)),
  );
}

/** A region's army loyalty settled where Defence spending and its unrest put it. */
export function settledLoyalty(unrest: Unrest, spent: Money, people: number): RegionLoyalty {
  const armyLoyaltyEffects = settledEffects(unrest, spent, people);
  return { armyLoyalty: loyaltyFrom(armyLoyaltyEffects), armyLoyaltyEffects };
}

/**
 * One quarter of army loyalty.
 *
 * `before` is the regions as the quarter began and `after` the same regions once the
 * quarter's approval is settled, carrying the unrest it leaves and the loyalty they began
 * with. Each driver's effect on each region closes part of the gap to where that driver
 * would settle it, as approval's do, so a cut to Defence is felt over quarters.
 */
export function resolveLoyalty(
  country: Country,
  before: readonly RegionState[],
  after: readonly RegionState[],
  spent: Money,
): ArmyLoyaltyOutcome {
  const people = populationOf(after);
  const moves = after.map((region) => {
    const settled = settledEffects(region.unrest, spent, people);
    const drift = mapDrivers((driver) =>
      stepTowards(
        region.armyLoyaltyEffects[driver],
        settled[driver],
        balance.army.loyalty.adjustPermillePerQuarter,
      ),
    );
    const armyLoyaltyEffects = mapDrivers(
      (driver) => region.armyLoyaltyEffects[driver] + drift[driver],
    );
    const armyLoyalty = loyaltyFrom(armyLoyaltyEffects);
    return {
      region: { ...region, armyLoyalty, armyLoyaltyEffects },
      was: region,
      drift,
      // What the limits took back from the sum of the movements.
      limited:
        armyLoyalty - region.armyLoyalty - sum(LOYALTY_DRIVERS.map((driver) => drift[driver])),
      settlesAt: loyaltyFrom(settled),
    };
  });
  const regions = moves.map((move) => move.region);

  // Each line is the movement in every region weighted by the people who live there.
  const weighted = (amount: (move: (typeof moves)[number]) => number) =>
    sum(moves.map((move) => move.region.population * amount(move)));
  const lines = [
    ...LOYALTY_DRIVERS.map((driver) => ({
      label: LOYALTY_DRIVER_NAMES[driver],
      numerator: weighted((move) => move.drift[driver]),
      always: true,
    })),
    { label: LIMIT_LABEL, numerator: weighted((move) => move.limited), always: false },
    {
      // Where people live changed, which moves the average even where no loyalty did.
      label: 'Changes in population',
      numerator: Math.round(
        weightedLoyalty(after) - (weightedLoyalty(before) * people) / populationOf(before),
      ),
      always: false,
    },
  ];
  const value = nationalLoyalty(regions);
  const was = nationalLoyalty(before);
  const amounts = apportion(
    lines.map((entry) => entry.numerator),
    people,
    value - was,
  );
  const heading = Math.floor(
    sum(moves.map((move) => move.region.population * move.settlesAt)) / people,
  );

  return {
    regions,
    loyalty: {
      value,
      change: value - was,
      contributions: lines.flatMap((entry, index): Contribution[] => {
        const amount = amounts[index] ?? 0;
        return entry.always || amount !== 0 ? [{ label: entry.label, amount }] : [];
      }),
    },
    heading,
    entries: stageEntries(country, before, regions, { spent, people }),
  };
}

/**
 * How army loyalty stands, nationally and in each region, and where the budget given, the one
 * in force unless another is, would settle it. The quarter's own reckoning (`resolveLoyalty`)
 * reads the same sums.
 */
export function armyLoyaltyStatus(
  state: { readonly regions: readonly RegionState[]; readonly budget: Budget },
  budget: Budget = state.budget,
): ArmyLoyaltyStatus {
  const { regions } = state;
  const { stages } = balance.army.loyalty;
  const people = populationOf(regions);
  const spent = budget.spending.defence;
  const loyalty = nationalLoyalty(regions);
  const settles = averaged(regions, (region) =>
    loyaltyFrom(settledEffects(region.unrest, spent, people)),
  );
  return {
    loyalty,
    stage: armyStageAt(loyalty),
    restlessBelow: stages.restlessBelowPermille,
    plottingBelow: stages.plottingBelowPermille,
    settles,
    settlesStage: armyStageAt(settles),
    spent,
    expected: Math.round(expectedFor(people)),
    causes: causesOf(regions, loyalty),
    regions: regions.map((region) => {
      const regionSettles = loyaltyFrom(settledEffects(region.unrest, spent, people));
      return {
        regionId: region.id,
        loyalty: region.armyLoyalty,
        stage: armyStageAt(region.armyLoyalty),
        settles: regionSettles,
        settlesStage: armyStageAt(regionSettles),
        causes: causesOf([region], region.armyLoyalty),
      };
    }),
  };
}

/** The baseline and what each driver adds to it, averaged over the regions by population. */
function causesOf(regions: readonly RegionState[], loyalty: number): Contribution[] {
  const { baselinePermille } = balance.army.loyalty;
  const people = populationOf(regions);
  if (people === 0) return [{ label: 'Baseline', amount: 0 }];
  const weighted = (amount: (region: RegionState) => number) =>
    sum(regions.map((region) => region.population * amount(region)));
  const lines = [
    ...LOYALTY_DRIVERS.map((driver) => ({
      label: LOYALTY_DRIVER_NAMES[driver],
      numerator: weighted((region) => region.armyLoyaltyEffects[driver]),
      always: true,
    })),
    {
      label: LIMIT_LABEL,
      numerator: weighted(
        (region) =>
          region.armyLoyalty - baselinePermille - sum(Object.values(region.armyLoyaltyEffects)),
      ),
      always: false,
    },
  ];
  const amounts = apportion(
    lines.map((entry) => entry.numerator),
    people,
    loyalty - baselinePermille,
  );
  return [
    { label: 'Baseline', amount: baselinePermille },
    ...lines.flatMap((entry, index): Contribution[] => {
      const amount = amounts[index] ?? 0;
      return entry.always || amount !== 0 ? [{ label: entry.label, amount }] : [];
    }),
  ];
}

function mapDrivers(effect: (driver: LoyaltyDriver) => number): ArmyLoyaltyEffects {
  return Object.fromEntries(LOYALTY_DRIVERS.map((driver) => [driver, effect(driver)])) as Record<
    LoyaltyDriver,
    number
  >;
}

/** Where each driver would settle its effect on a region's army if nothing changed again. */
function settledEffects(unrest: Unrest, spent: Money, people: number): ArmyLoyaltyEffects {
  const { defence, unrest: byUnrest } = balance.army.loyalty;
  return mapDrivers((driver) => {
    switch (driver) {
      case 'defence': {
        // Judged per head, as the public services are: nothing spent settles the whole weight
        // lower, double what the army expects or more the whole weight higher.
        const expected = defence.expectedPerMillionPeople * people;
        if (expected === 0) return 0;
        const effect = Math.floor(
          (defence.weightPermille * (spent * 1_000_000 - expected)) / expected,
        );
        return clamp(effect, -defence.weightPermille, defence.weightPermille);
      }
      case 'unrest':
        return byUnrest[unrest];
    }
  });
}

function loyaltyFrom(effects: ArmyLoyaltyEffects): number {
  return clamp(
    balance.army.loyalty.baselinePermille + sum(LOYALTY_DRIVERS.map((driver) => effects[driver])),
    LIMITS.min,
    LIMITS.max,
  );
}

function populationOf(regions: readonly RegionState[]): number {
  return sum(regions.map((region) => region.population));
}

function weightedLoyalty(regions: readonly RegionState[]): number {
  return sum(regions.map((region) => region.population * region.armyLoyalty));
}

/** A figure of each region averaged by population, rounded down. */
function averaged(regions: readonly RegionState[], of: (region: RegionState) => number): number {
  const people = populationOf(regions);
  return people === 0
    ? 0
    : Math.floor(sum(regions.map((region) => region.population * of(region))) / people);
}

/** The mark a stage is entered below, as a percentage: "45%". */
function markOf(stage: Exclude<ArmyStage, 'loyal'>): string {
  const { restlessBelowPermille, plottingBelowPermille } = balance.army.loyalty.stages;
  return formatPercent(stage === 'restless' ? restlessBelowPermille : plottingBelowPermille, 0);
}

/** Whether one stage is worse than another. */
const worse = (now: ArmyStage, was: ArmyStage) =>
  ARMY_STAGES.indexOf(now) > ARMY_STAGES.indexOf(was);

/**
 * What the turn report says when the army's stage changes, nationally or in a region. A
 * region whose army moved to the stage the nation moved to in the same quarter is named in
 * the nation's entry; any other region's change has an entry of its own, tied to its place.
 */
function stageEntries(
  country: Country,
  before: readonly RegionState[],
  after: readonly RegionState[],
  defence: { readonly spent: Money; readonly people: number },
): ReportEntry[] {
  const was = armyStageAt(nationalLoyalty(before));
  const loyalty = nationalLoyalty(after);
  const now = armyStageAt(loyalty);
  const changed = after.flatMap((region, index) => {
    const from = armyStageAt(before[index]?.armyLoyalty ?? region.armyLoyalty);
    const to = armyStageAt(region.armyLoyalty);
    return from === to ? [] : [{ region, from, to }];
  });
  const expected = Math.round(expectedFor(defence.people));
  const spending = `Defence spending is ${formatMoney(defence.spent)} a quarter, and the army expects ${formatMoney(expected)}.`;
  const unrestIn = (regions: readonly RegionState[]) => {
    const unsettled = regions.filter((region) => region.unrest !== 'calm');
    return unsettled.length === 0
      ? ''
      : ` ${capitalised(listed(unsettled.map((region) => `${UNREST_NAMES[region.unrest].toLowerCase()} in ${regionName(country, region.id)}`)))} pull it down further.`;
  };
  const seriousnessOf = (to: ArmyStage, from: ArmyStage): ReportEntry['seriousness'] => {
    if (!worse(to, from)) return 'notable';
    return to === 'plotting' ? 'serious' : 'warning';
  };
  const stands = (value: number, to: ArmyStage, from: ArmyStage) => {
    if (to === 'loyal') {
      return `has recovered to ${formatPercent(value)}, above the ${markOf('restless')} below which the army grows restless`;
    }
    return worse(to, from)
      ? `has fallen to ${formatPercent(value)}, below the ${markOf(to)} at which the army ${to === 'plotting' ? 'begins to plot' : 'grows restless'}`
      : `has recovered to ${formatPercent(value)}, above the ${markOf('plotting')} below which the army plots`;
  };

  const withNation = was === now ? [] : changed.filter((change) => change.to === now);
  const apart = changed.filter((change) => !withNation.includes(change));
  const moved =
    withNation.length === after.length
      ? 'every region'
      : listed(withNation.map((change) => regionName(country, change.region.id)));
  const national: ReportEntry[] =
    was === now
      ? []
      : [
          {
            kind: 'armyLoyalty',
            seriousness: seriousnessOf(now, was),
            headline: `The army is ${ARMY_STAGE_NAMES[now].toLowerCase()}${worse(now, was) ? '' : ' again'}`,
            cause: `National army loyalty ${stands(loyalty, now, was)}. ${spending}${unrestIn(after)}${
              withNation.length === 0
                ? ''
                : ` The army in ${moved} is ${ARMY_STAGE_NAMES[now].toLowerCase()} with it.`
            }`,
          },
        ];
  return [
    ...national,
    ...apart.map(({ region, from, to }): ReportEntry => ({
      kind: 'armyLoyalty',
      seriousness: seriousnessOf(to, from),
      headline: `The army in ${regionName(country, region.id)} is ${ARMY_STAGE_NAMES[to].toLowerCase()}${worse(to, from) ? '' : ' again'}`,
      cause: `Army loyalty there ${stands(region.armyLoyalty, to, from)}. ${spending}${unrestIn([region])}`,
      regionId: region.id,
    })),
  ];
}
