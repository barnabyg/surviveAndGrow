import { balance } from './balance';
import type { Country, Region } from './country';
import type { Notice, RegionState } from './state';
import { formatTonnes } from './text';
import type { Contribution, Money, Quarter, Range } from './types';

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

/** The food situation that one quarter of eating, spoilage and harvest starts from. */
export interface FoodSituation {
  readonly country: Country;
  readonly quarter: Quarter;
  readonly regions: readonly RegionState[];
  /** The national reserve, in tonnes. */
  readonly foodReserve: number;
}

export interface FoodOutcome {
  readonly regions: readonly RegionState[];
  readonly foodReserve: number;
  /** Everything that moved the national reserve. */
  readonly contributions: readonly Contribution[];
  /** The harvest, in quarter 4, and null in every other quarter. */
  readonly harvest: Harvest | null;
}

/** Tonnes a population eats in a quarter. */
export function quarterlyNeed(population: number): number {
  return Math.floor((population * balance.food.consumptionKgPerPersonPerQuarter) / 1000);
}

/** The food a region holds when a game starts: what it keeps back from a harvest. */
export function startingStock(population: number): number {
  return quarterlyNeed(population) * balance.food.regionKeepQuarters;
}

/**
 * One quarter of food. Each region eats from its own stock, making it last until the next
 * harvest. A share of the national reserve spoils. In quarter 4 each region then harvests,
 * keeps what it needs for the year and sends the rest to the reserve, losing some on the way.
 *
 * @param agricultureSpentThisYear agriculture spending over the growing year, this quarter included.
 * @param weatherShocks how far this quarter's weather moves each region's coming harvest, in thousandths.
 */
export function resolveFood(
  situation: FoodSituation,
  agricultureSpentThisYear: Money,
  weatherShocks: readonly number[],
): FoodOutcome {
  const { country, quarter } = situation;
  const { food } = balance;
  const quartersUntilHarvest = 5 - quarter;

  const fed = situation.regions.map((region, index) => {
    const eaten = Math.min(
      quarterlyNeed(region.population),
      Math.floor(region.foodStock / quartersUntilHarvest),
    );
    return {
      ...region,
      foodStock: region.foodStock - eaten,
      weather: region.weather + (weatherShocks[index] ?? 0),
    };
  });

  const spoiled = Math.floor(
    (situation.foodReserve * food.reserveSpoilagePermillePerQuarter) / 1000,
  );
  const contributions: Contribution[] = [];
  if (spoiled > 0) contributions.push({ label: 'Spoiled in store', amount: -spoiled });

  if (quarter !== 4) {
    return {
      regions: fed,
      foodReserve: situation.foodReserve - spoiled,
      contributions,
      harvest: null,
    };
  }

  const yieldPermille = agricultureYieldPermille(agricultureSpentThisYear);
  const harvests: RegionHarvest[] = [];
  const harvested = fed.map((region): RegionState => {
    const land = regionOf(country, region.id);
    const grown = land === undefined ? 0 : grow(land, region.weather, yieldPermille);
    const keep = quarterlyNeed(region.population) * food.regionKeepQuarters;
    const surplus = Math.max(0, region.foodStock + grown - keep);
    const lost = Math.floor((surplus * food.transportLossPermille) / 1000);
    harvests.push({ regionId: region.id, grown, surplus, lost });
    if (surplus > 0) {
      contributions.push({
        label: `Surplus from ${land?.name ?? region.id}`,
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

  return {
    regions: harvested,
    foodReserve: situation.foodReserve - spoiled + delivered,
    contributions,
    harvest: { total: sum(harvests.map((harvest) => harvest.grown)), regions: harvests },
  };
}

/**
 * The range the coming harvest will fall in, and the national reserve once it is in, if
 * agriculture spending carries on at the given level. It plays out the rest of the growing
 * year twice, once with the worst weather still possible and once with the best, so the
 * real harvest always falls inside the range. It draws nothing from the random generator.
 */
export function forecastFood(
  situation: FoodSituation,
  agricultureSpentSoFar: Money,
  agriculturePerQuarter: Money,
): { readonly harvest: Range; readonly reserveAfterHarvest: Range } {
  const swing = balance.food.weatherSwingPermillePerQuarter;
  const worst = playToHarvest(situation, agricultureSpentSoFar, agriculturePerQuarter, -swing);
  const best = playToHarvest(situation, agricultureSpentSoFar, agriculturePerQuarter, swing);
  return {
    harvest: { min: worst.harvest, max: best.harvest },
    reserveAfterHarvest: { min: worst.foodReserve, max: best.foodReserve },
  };
}

function playToHarvest(
  start: FoodSituation,
  agricultureSpentSoFar: Money,
  agriculturePerQuarter: Money,
  shock: number,
): { readonly harvest: number; readonly foodReserve: number } {
  let situation = start;
  let spent = agricultureSpentSoFar;
  for (;;) {
    spent += agriculturePerQuarter;
    const outcome = resolveFood(
      situation,
      spent,
      situation.regions.map(() => shock),
    );
    if (outcome.harvest !== null) {
      return { harvest: outcome.harvest.total, foodReserve: outcome.foodReserve };
    }
    situation = {
      ...situation,
      quarter: (situation.quarter + 1) as Quarter,
      regions: outcome.regions,
      foodReserve: outcome.foodReserve,
    };
  }
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
    reserveMonths:
      quarterlyConsumption === 0 ? 0 : (situation.foodReserve * 3) / quarterlyConsumption,
    safeReserveMonths,
    belowSafeLevel: situation.foodReserve * 3 < safeReserveMonths * quarterlyConsumption,
  };
}

/** The notice the turn report carries when the harvest comes in. */
export function harvestNotice(harvest: Harvest): Notice {
  const lost = sum(harvest.regions.map((region) => region.lost));
  const delivered = sum(harvest.regions.map((region) => region.surplus)) - lost;
  return {
    title: 'The harvest is in',
    detail: `The country grew ${formatTonnes(harvest.total)}. ${formatTonnes(delivered)} reached the national reserve, and ${formatTonnes(lost)} was lost on the way.`,
    tone: 'info',
  };
}

/** The share of the full yield that a year of agriculture spending brings in, in thousandths. */
function agricultureYieldPermille(spentThisYear: Money): number {
  const { basePermille, bonusPermillePerThousandMoney } = balance.food.agriculture;
  return basePermille + Math.floor((spentThisYear * bonusPermillePerThousandMoney) / 1000);
}

/** Tonnes a region grows, given its year's weather and the yield spending has earned. */
function grow(region: Region, weatherPermille: number, yieldPermille: number): number {
  const fullYield = region.farmland * balance.food.harvestTonnesPerFarmland[region.terrain];
  return Math.floor((fullYield * (1000 + weatherPermille) * yieldPermille) / 1_000_000);
}

function regionOf(country: Country, regionId: string): Region | undefined {
  return country.regions.find((region) => region.id === regionId);
}

function sum(amounts: readonly number[]): number {
  return amounts.reduce((total, amount) => total + amount, 0);
}
