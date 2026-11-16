import { balance } from './balance';
import { checkBudget, cutNotice, resolveBudget } from './budget';
import type { Country } from './country';
import { forecastFood, harvestNotice, resolveFood, startingStock } from './food';
import { nextRandom, seedGenerator, type RngState } from './rng';
import type { Decisions, GameState, Notice, Preview, TurnResult } from './state';
import type { GameDate, Quarter, Range } from './types';

/** Starts a game. The same country and seed always start the same game. */
export function createGame(country: Country, seed: number): GameState {
  return {
    country,
    seed,
    rng: seedGenerator(seed),
    date: { year: 1, quarter: 1 },
    treasury: country.start.treasury,
    budget: country.start.budget,
    foodReserve: country.start.foodReserve,
    agricultureSpentThisYear: 0,
    regions: country.regions.map((region) => ({
      id: region.id,
      population: region.population,
      output: region.output,
      foodStock: startingStock(region.population),
      weather: 0,
    })),
  };
}

/**
 * Resolves the current quarter with the player's decisions and moves the date on.
 * @throws RangeError when a decision is outside what the game allows.
 */
export function advanceQuarter(state: GameState, decisions: Decisions): TurnResult {
  checkBudget(decisions.budget);
  const finances = resolveBudget(state, decisions.budget);

  const weather = rollWeather(state.rng, state.regions.length);
  const agricultureSpent = state.agricultureSpentThisYear + finances.spent.agriculture;
  const food = resolveFood(foodSituation(state), agricultureSpent, weather.shocks);

  const notices: Notice[] = [];
  if (finances.cut) notices.push(cutNotice(finances));
  if (food.harvest !== null) notices.push(harvestNotice(food.harvest));

  return {
    state: {
      ...state,
      rng: weather.rng,
      date: nextDate(state.date),
      treasury: finances.treasury,
      budget: decisions.budget,
      foodReserve: food.foodReserve,
      // The growing year ends with the harvest.
      agricultureSpentThisYear: food.harvest === null ? agricultureSpent : 0,
      regions: food.regions,
    },
    report: {
      date: state.date,
      treasury: {
        value: finances.treasury,
        change: finances.treasury - state.treasury,
        contributions: finances.contributions,
      },
      food: {
        value: food.foodReserve,
        change: food.foodReserve - state.foodReserve,
        contributions: food.contributions,
      },
      harvest: food.harvest,
      notices,
    },
  };
}

/**
 * Projects what a set of decisions would do in the current quarter. It changes nothing and
 * draws nothing from the random generator, so previewing never alters the game that follows.
 * @throws RangeError when a decision is outside what the game allows.
 */
export function previewQuarter(state: GameState, decisions: Decisions): Preview {
  checkBudget(decisions.budget);
  const finances = resolveBudget(state, decisions.budget);
  const food = forecastFood(
    foodSituation(state),
    state.agricultureSpentThisYear,
    finances.spent.agriculture,
  );
  return {
    revenue: exactly(finances.revenue),
    spending: exactly(finances.spending),
    balance: exactly(finances.balance),
    treasury: exactly(finances.treasury),
    spendingCut: finances.cut,
    harvest: food.harvest,
    foodReserveAfterHarvest: food.reserveAfterHarvest,
  };
}

/** The ranges the budget may be set within. */
export const budgetLimits = balance.budget;

export function seasonOf(date: GameDate): string {
  return balance.calendar.seasons[date.quarter];
}

function foodSituation(state: GameState) {
  return {
    country: state.country,
    quarter: state.date.quarter,
    regions: state.regions,
    foodReserve: state.foodReserve,
  };
}

/** This quarter's weather: one shock for each region, drawn in the regions' order. */
function rollWeather(
  rng: RngState,
  regionCount: number,
): { readonly shocks: readonly number[]; readonly rng: RngState } {
  const swing = balance.food.weatherSwingPermillePerQuarter;
  const shocks: number[] = [];
  let current = rng;
  for (let region = 0; region < regionCount; region += 1) {
    const roll = nextRandom(current);
    shocks.push((roll.value % (2 * swing + 1)) - swing);
    current = roll.state;
  }
  return { shocks, rng: current };
}

/** A projection with nothing left to chance. */
function exactly(value: number): Range {
  return { min: value, max: value };
}

function nextDate(date: GameDate): GameDate {
  return date.quarter === 4
    ? { year: date.year + 1, quarter: 1 }
    : { year: date.year, quarter: (date.quarter + 1) as Quarter };
}
