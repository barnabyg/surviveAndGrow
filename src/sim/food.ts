import { sum } from './arithmetic';
import { balance } from './balance';
import { isHarvestQuarter, nextQuarter, quartersUntilHarvest } from './calendar';
import { regionName, type Country, type Region } from './country';
import type { SiteEffects } from './projects';
import type { ReportEntry } from './report';
import type { RegionShortfall, RegionState, ReliefDelivery } from './state';
import { formatCount, formatQuarters, formatTonnes } from './text';
import type { Contribution, Money, Quarter, Range } from './types';
import { FOOD_STAGE_NAMES, FOOD_STAGES, type FoodStage } from './vocabulary';

/** What one region grew at a harvest, and where it went. All weights are in tonnes. */
export interface RegionHarvest {
  readonly regionId: string;
  readonly grown: number;
  /** What the region sent to the national reserve, beyond what it keeps for itself. */
  readonly surplus: number;
  /** The part of the surplus that was lost in transport. */
  readonly lost: number;
}

export interface Harvest {
  /** Everything the country grew. */
  readonly total: number;
  readonly regions: readonly RegionHarvest[];
}

/** The food situation that one quarter of eating, relief, spoilage and harvest starts from. */
export interface FoodSituation {
  readonly country: Country;
  readonly quarter: Quarter;
  readonly regions: readonly RegionState[];
  /** The national reserve, in tonnes. */
  readonly foodReserve: number;
}

/** What bears on a quarter of food from outside it. Each list has one entry for each region. */
export interface FoodInputs {
  /** Agriculture spending over the growing year, this quarter included. */
  readonly agricultureSpentThisYear: Money;
  /** How far this quarter's weather moves each region's coming harvest, in thousandths. */
  readonly weatherShocks: readonly number[];
  /** What events leave of each region's harvest, in thousandths. */
  readonly harvestPermille: readonly number[];
  /** What the sites in use as the quarter begins do to the weather, to transport and to spoilage. */
  readonly sites: SiteEffects;
  readonly relief: {
    /** The region relief is sent to, or null to send none. */
    readonly regionId: string | null;
    /** The most that food relief spending can move in the quarter, in tonnes. */
    readonly capacity: number;
  };
}

export interface FoodOutcome {
  readonly regions: readonly RegionState[];
  readonly foodReserve: number;
  /** Everything that moved the national reserve. */
  readonly contributions: readonly Contribution[];
  /** The harvest, in quarter 4, and null in every other quarter. */
  readonly harvest: Harvest | null;
  /** What each hungry region was short of before any relief. */
  readonly shortfalls: readonly RegionShortfall[];
  readonly relief: ReliefDelivery;
  /**
   * The share of their needs each region's people ate, relief counted, in thousandths. One
   * entry for each region.
   */
  readonly fedPermille: readonly number[];
  /** What the turn report says of the quarter's food. */
  readonly entries: readonly ReportEntry[];
  /** What moved each region's population: its growth, and deaths in famine. */
  readonly population: readonly Contribution[];
}

/** Tonnes a population eats in a quarter. */
export function quarterlyNeed(population: number): number {
  return Math.floor((population * balance.food.consumptionKgPerPersonPerQuarter) / 1000);
}

/**
 * The food a region keeps back from a harvest for its own people. It is also what each
 * region holds when a game starts.
 */
export function regionKeep(population: number): number {
  return quarterlyNeed(population) * balance.food.regionKeepQuarters;
}

/** Tonnes of food that an amount of food relief spending can move in a quarter. */
export function reliefCapacity(spent: Money): number {
  return spent * balance.relief.tonnesPerMoney;
}

/**
 * One quarter of food.
 *
 * A share of the national reserve spoils. Each region eats from its own stock, making it
 * last until the next harvest, so a region with too little goes short every quarter and
 * not only at the end. Relief makes up what the chosen region is short of, as far as its
 * capacity and the reserve allow. A region that goes hungry moves one stage towards famine,
 * and one that is fed moves one stage back. In the harvest quarter each region then harvests, keeps
 * what it needs for the year and sends the rest to the reserve, losing some on the way.
 */
export function resolveFood(situation: FoodSituation, inputs: FoodInputs): FoodOutcome {
  const { country, quarter } = situation;
  const { food } = balance;
  const quartersToLast = quartersUntilHarvest(quarter);
  const contributions: Contribution[] = [];
  const entries: ReportEntry[] = [];
  const shortfalls: RegionShortfall[] = [];
  const fedPermilles: number[] = [];
  const population: Contribution[] = [];

  const spoiled = Math.floor(
    (situation.foodReserve *
      food.reserveSpoilagePermillePerQuarter *
      inputs.sites.national.reserveSpoilage) /
      1_000_000,
  );
  if (spoiled > 0) contributions.push({ label: 'Spoiled in store', amount: -spoiled });
  let foodReserve = situation.foodReserve - spoiled;
  let relief: ReliefDelivery = { capacity: inputs.relief.capacity, shortfall: 0, delivered: 0 };

  const fed = situation.regions.map((region, index): RegionState => {
    const name = regionName(country, region.id);
    const need = quarterlyNeed(region.population);
    const ration = Math.min(need, Math.floor(region.foodStock / quartersToLast));
    const shortfall = need - ration;
    if (shortfall > 0) shortfalls.push({ regionId: region.id, shortfall });

    let delivered = 0;
    if (region.id === inputs.relief.regionId) {
      delivered = Math.min(shortfall, inputs.relief.capacity, foodReserve);
      foodReserve -= delivered;
      relief = { capacity: inputs.relief.capacity, shortfall, delivered };
      if (delivered > 0) {
        contributions.push({
          label: `Relief sent to ${name}`,
          amount: -delivered,
          regionId: region.id,
        });
      }
    }

    const fedPermille = need === 0 ? 1000 : Math.floor(((ration + delivered) * 1000) / need);
    fedPermilles.push(fedPermille);
    const foodStage = nextStage(region.foodStage, fedPermille);
    const famineQuarters = foodStage === 'famine' ? region.famineQuarters + 1 : 0;
    const deaths =
      foodStage === 'famine'
        ? Math.floor((region.population * balance.hunger.famineDeathsPermillePerQuarter) / 1000)
        : 0;
    const entry = hungerEntry({
      name,
      regionId: region.id,
      before: region.foodStage,
      after: foodStage,
      fedPermille,
      deaths,
      famineQuarters,
    });
    if (entry !== null) entries.push(entry);
    // People are born and grow up everywhere but where famine has taken hold.
    const growth =
      foodStage === 'famine'
        ? 0
        : populationGrowth(regionOf(country, region.id), region.population);
    if (growth > 0)
      population.push({ label: `Growth in ${name}`, amount: growth, regionId: region.id });
    if (deaths > 0) {
      population.push({ label: `Famine deaths in ${name}`, amount: -deaths, regionId: region.id });
    }

    return {
      ...region,
      population: region.population - deaths + growth,
      foodStock: region.foodStock - ration,
      weather: region.weather + (inputs.weatherShocks[index] ?? 0),
      foodStage,
      famineQuarters,
    };
  });

  if (!isHarvestQuarter(quarter)) {
    return {
      regions: fed,
      foodReserve,
      contributions,
      harvest: null,
      shortfalls,
      relief,
      fedPermille: fedPermilles,
      entries,
      population,
    };
  }

  const yieldPermille = agricultureYieldPermille(inputs.agricultureSpentThisYear);
  const harvests: RegionHarvest[] = [];
  const harvested = fed.map((region, index): RegionState => {
    const land = regionOf(country, region.id);
    // Irrigation leaves the weather only a part of its hold on the harvest.
    const weather = Math.trunc(
      (region.weather * (inputs.sites.inRegion.harvestWeather[index] ?? 1000)) / 1000,
    );
    const grown =
      land === undefined
        ? 0
        : grow(land, weather, yieldPermille, inputs.harvestPermille[index] ?? 1000);
    const surplus = Math.max(0, region.foodStock + grown - regionKeep(region.population));
    const lost = Math.floor(
      (surplus *
        food.transportLossPermille *
        (inputs.sites.inRegion.transportLoss[index] ?? 1000)) /
        1_000_000,
    );
    harvests.push({ regionId: region.id, grown, surplus, lost });
    if (surplus > 0) {
      contributions.push({
        label: `Surplus from ${regionName(country, region.id)}`,
        amount: surplus,
        regionId: region.id,
      });
    }
    // The weather starts afresh for the next growing year.
    return { ...region, foodStock: region.foodStock + grown - surplus, weather: 0 };
  });

  const lost = sum(harvests.map((harvest) => harvest.lost));
  if (lost > 0) contributions.push({ label: 'Lost in transport', amount: -lost });
  const delivered = sum(harvests.map((harvest) => harvest.surplus)) - lost;
  const harvest = { total: sum(harvests.map((entry) => entry.grown)), regions: harvests };
  entries.push(harvestEntry(harvest));

  return {
    regions: harvested,
    foodReserve: foodReserve + delivered,
    contributions,
    harvest,
    shortfalls,
    relief,
    fedPermille: fedPermilles,
    entries,
    population,
  };
}

/** How many people a region gains in a quarter at its rate of growth. */
function populationGrowth(region: Region | undefined, people: number): number {
  const rate =
    region?.growthPerTenThousandPerQuarter ?? balance.population.growthPerTenThousandPerQuarter;
  return Math.floor((people * rate) / 10_000);
}

/** What the forecast assumes about the rest of the growing year. */
export interface ForecastInputs {
  /** Agriculture spending since the last harvest, before this quarter. */
  readonly agricultureSpentSoFar: Money;
  /**
   * What the decisions will bring in each quarter from this one to the harvest, if they
   * are left as they are: the agriculture spending and the relief the treasury can pay for.
   */
  readonly quarters: readonly {
    readonly agricultureSpent: Money;
    readonly relief: FoodInputs['relief'];
    /** The sites that will be in use as that quarter begins. */
    readonly sites: SiteEffects;
    /** The grain bought abroad that reaches the reserve as that quarter ends, in tonnes. */
    readonly imported: number;
  }[];
  /** The least that events could leave of each region's harvest, in thousandths. */
  readonly worstHarvestPermille: readonly number[];
  /** The most that events could leave of each region's harvest, in thousandths. */
  readonly bestHarvestPermille: readonly number[];
}

/**
 * The range the coming harvest will fall in, and the national reserve once it is in, if
 * the decisions are left as they are. It plays out the rest of the growing year twice, once
 * with the worst weather and events still possible and once with the best, so the real
 * harvest always falls inside the range. It draws nothing from the random generator.
 */
export function forecastFood(
  situation: FoodSituation,
  inputs: ForecastInputs,
): { readonly harvest: Range; readonly reserveAfterHarvest: Range } {
  const swing = balance.food.weatherSwingPermillePerQuarter;
  const worst = playToHarvest(situation, inputs, -swing, inputs.worstHarvestPermille);
  const best = playToHarvest(situation, inputs, swing, inputs.bestHarvestPermille);
  return {
    harvest: { min: worst.harvest, max: best.harvest },
    reserveAfterHarvest: { min: worst.foodReserve, max: best.foodReserve },
  };
}

function playToHarvest(
  start: FoodSituation,
  inputs: ForecastInputs,
  shock: number,
  harvestPermille: readonly number[],
): { readonly harvest: number; readonly foodReserve: number } {
  let situation = start;
  let spent = inputs.agricultureSpentSoFar;
  for (const quarter of inputs.quarters) {
    spent += quarter.agricultureSpent;
    const outcome = resolveFood(situation, {
      agricultureSpentThisYear: spent,
      weatherShocks: situation.regions.map(() => shock),
      harvestPermille,
      sites: quarter.sites,
      relief: quarter.relief,
    });
    if (outcome.harvest !== null) {
      return {
        harvest: outcome.harvest.total,
        foodReserve: outcome.foodReserve + quarter.imported,
      };
    }
    situation = {
      ...situation,
      quarter: nextQuarter(situation.quarter),
      regions: outcome.regions,
      foodReserve: outcome.foodReserve + quarter.imported,
    };
  }
  throw new Error('The forecast was not given every quarter up to the harvest.');
}

/** How the national reserve stands against what the country eats. */
export interface FoodStatus {
  /** Tonnes the whole population eats in a quarter. */
  readonly quarterlyConsumption: number;
  /** The national reserve, in months of what the country eats. */
  readonly reserveMonths: number;
  readonly safeReserveMonths: number;
  readonly belowSafeLevel: boolean;
}

export function foodStatus(situation: Pick<FoodSituation, 'regions' | 'foodReserve'>): FoodStatus {
  const quarterlyConsumption = sum(
    situation.regions.map((region) => quarterlyNeed(region.population)),
  );
  const { safeReserveMonths } = balance.food;
  return {
    quarterlyConsumption,
    reserveMonths: monthsOfFood(situation.foodReserve, quarterlyConsumption),
    safeReserveMonths,
    belowSafeLevel: situation.foodReserve * 3 < safeReserveMonths * quarterlyConsumption,
  };
}

/** A weight of food as months of what a population eats, given what it eats in a quarter. */
export function monthsOfFood(tonnes: number, quarterlyConsumption: number): number {
  return quarterlyConsumption === 0 ? 0 : (tonnes * 3) / quarterlyConsumption;
}

/**
 * A region's food stage after a quarter. Fed, it moves one stage back towards adequate.
 * Hungry, it moves one stage on, but only real hunger carries it past shortage into famine.
 */
function nextStage(current: FoodStage, fedPermille: number): FoodStage {
  const { fedSharePermille, famineSharePermille } = balance.hunger;
  const stage = FOOD_STAGES.indexOf(current);
  if (fedPermille >= fedSharePermille) return FOOD_STAGES[Math.max(0, stage - 1)] ?? current;
  const worstPossible = fedPermille < famineSharePermille ? 'famine' : 'shortage';
  return FOOD_STAGES[Math.min(stage + 1, FOOD_STAGES.indexOf(worstPossible))] ?? current;
}

interface HungerChange {
  readonly name: string;
  readonly regionId: string;
  readonly before: FoodStage;
  readonly after: FoodStage;
  readonly fedPermille: number;
  readonly deaths: number;
  readonly famineQuarters: number;
}

/** What the turn report says when a region's food stage moves, or famine goes on. */
function hungerEntry(change: HungerChange): ReportEntry | null {
  const { name, regionId, before, after, fedPermille, deaths, famineQuarters } = change;
  const ate = `People there ate ${Math.floor(fedPermille / 10)}% of what they need.`;
  if (after === 'famine') {
    const left = balance.hunger.collapseAfterFamineQuarters - famineQuarters;
    const warning =
      left > 0
        ? `If the famine lasts ${formatQuarters(left, 'more')}, the state will collapse.`
        : 'The state cannot survive it.';
    return {
      kind: 'hunger',
      seriousness: 'critical',
      headline: `Famine in ${name}`,
      cause: `${ate} ${formatCount(deaths)} people have died. ${warning}`,
      regionId,
    };
  }
  if (after === before) return null;
  if (FOOD_STAGES.indexOf(after) < FOOD_STAGES.indexOf(before)) {
    return {
      kind: 'hunger',
      seriousness: 'notable',
      headline:
        after === 'adequate' ? `${name} has enough food again` : `Hunger is easing in ${name}`,
      cause: `Its food situation is now: ${FOOD_STAGE_NAMES[after]}.`,
      regionId,
    };
  }
  return after === 'tight'
    ? {
        kind: 'hunger',
        seriousness: 'warning',
        headline: `Food is tight in ${name}`,
        cause: `${ate} Left alone, this becomes a shortage.`,
        regionId,
      }
    : {
        kind: 'hunger',
        seriousness: 'serious',
        headline: `Food shortage in ${name}`,
        cause: `${ate} Left alone, a shortage this deep becomes famine.`,
        regionId,
      };
}

/** What the turn report says when the harvest comes in. */
function harvestEntry(harvest: Harvest): ReportEntry {
  const lost = sum(harvest.regions.map((region) => region.lost));
  const delivered = sum(harvest.regions.map((region) => region.surplus)) - lost;
  return {
    kind: 'harvest',
    seriousness: 'notable',
    headline: 'The harvest is in',
    cause: `The country grew ${formatTonnes(harvest.total)}. ${formatTonnes(delivered)} reached the national reserve, and ${formatTonnes(lost)} was lost on the way.`,
  };
}

/** The share of the full yield that a year of agriculture spending brings in, in thousandths. */
function agricultureYieldPermille(spentThisYear: Money): number {
  const { basePermille, bonusPermillePerThousandMoney } = balance.food.agriculture;
  return basePermille + Math.floor((spentThisYear * bonusPermillePerThousandMoney) / 1000);
}

/** Tonnes a region grows, given its year's weather, its yield and what events leave of it. */
function grow(
  region: Region,
  weatherPermille: number,
  yieldPermille: number,
  eventPermille: number,
): number {
  const fullYield = region.farmland * balance.food.harvestTonnesPerFarmland[region.terrain];
  return Math.floor(
    (fullYield * (1000 + weatherPermille) * yieldPermille * eventPermille) / 1_000_000_000,
  );
}

function regionOf(country: Country, regionId: string): Region | undefined {
  return country.regions.find((region) => region.id === regionId);
}
