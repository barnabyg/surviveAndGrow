import { approvalStatus, resolveApproval, startingApproval, type ApprovalInputs } from './approval';
import { balance } from './balance';
import { nextDate, quartersUntilHarvest } from './calendar';
import { budgetEntry, checkBudget, cutEntry, resolveBudget, type BudgetOutcome } from './budget';
import { regionName, type Country } from './country';
import { forecastVoteShare, holdElection, isElectionQuarter } from './election';
import {
  beginEntry,
  beginEvents,
  endEntry,
  endEventsAfterHarvest,
  harvestPermille,
  worstHarvestPermille,
} from './events';
import {
  forecastFood,
  reliefCapacity,
  resolveFood,
  regionKeep,
  type FoodInputs,
  type FoodSituation,
} from './food';
import { vitalSigns } from './history';
import { compileReport, type ReportEntry } from './report';
import { nextRandom, seedGenerator, type RngState } from './rng';
import type { Decisions, GameState, Outcome, Preview, RegionState, TurnResult } from './state';
import { exactly } from './types';

/** Starts a game. The same country and seed always start the same game. */
export function createGame(country: Country, seed: number): GameState {
  const approval = startingApproval(country);
  const opening = {
    date: { year: 1, quarter: 1 },
    treasury: country.start.treasury,
    foodReserve: country.start.foodReserve,
    regions: country.regions.map((region): RegionState => ({
      id: region.id,
      population: region.population,
      output: region.output,
      foodStock: regionKeep(region.population),
      weather: 0,
      foodStage: 'adequate',
      famineQuarters: 0,
      ...approval,
    })),
  } as const;
  return {
    country,
    seed,
    rng: seedGenerator(seed),
    ...opening,
    budget: country.start.budget,
    agricultureSpentThisYear: 0,
    events: [],
    history: [vitalSigns(opening)],
    outcome: { status: 'playing' },
  };
}

/**
 * Resolves the current quarter with the player's decisions and moves the date on.
 * @throws RangeError when a decision is outside what the game allows.
 * @throws Error when the game is already over.
 */
export function advanceQuarter(state: GameState, decisions: Decisions): TurnResult {
  checkDecisions(state, decisions);
  const finances = resolveBudget(state, decisions.budget);

  const weather = rollWeather(state.rng, state.regions.length);
  const agricultureSpent = state.agricultureSpentThisYear + finances.spent.agriculture;
  const food = resolveFood(foodSituation(state), {
    agricultureSpentThisYear: agricultureSpent,
    weatherShocks: weather.shocks,
    harvestPermille: state.regions.map((region) => harvestPermille(state.events, region.id)),
    relief: reliefFor(decisions, finances),
  });
  // Strikes in force as the quarter began have already cut its revenue. The approval the
  // quarter leaves behind decides who strikes in the next.
  const approval = resolveApproval(
    state.country,
    state.regions,
    food.regions,
    approvalInputs(decisions, finances),
  );

  // A harvest ends the events that were waiting on it; then the new quarter may bring more.
  const date = nextDate(state.date);
  const { ended, remaining } =
    food.harvest === null
      ? { ended: [], remaining: state.events }
      : endEventsAfterHarvest(state.events);
  const rolled = beginEvents(state.country, remaining, date, weather.rng);
  const collapse = collapseOf(state.country, approval.regions);
  // The vote is held as the term's last quarter ends, unless the state has already fallen.
  const election =
    collapse === null && isElectionQuarter(state.date)
      ? holdElection(approval.regions, rolled.rng)
      : null;
  const outcome: Outcome = collapse ?? election?.outcome ?? { status: 'playing' };

  // Within one seriousness the report keeps this order, so what ends the game leads it.
  const entries: ReportEntry[] = [
    ...(collapse === null ? [] : [collapseEntry(collapse)]),
    ...(election === null ? [] : [election.entry]),
    ...(finances.cut ? [cutEntry(finances)] : []),
    ...food.entries,
    ...approval.entries,
    ...ended.map((event) => endEntry(state.country, event)),
    ...rolled.begun.map((event) => beginEntry(state.country, event)),
    budgetEntry(finances),
  ];

  return {
    state: {
      ...state,
      rng: election?.rng ?? rolled.rng,
      date,
      treasury: finances.treasury,
      budget: decisions.budget,
      foodReserve: food.foodReserve,
      // The growing year ends with the harvest.
      agricultureSpentThisYear: food.harvest === null ? agricultureSpent : 0,
      regions: approval.regions,
      events: [...remaining, ...rolled.begun],
      history: [
        ...state.history,
        vitalSigns({
          date,
          treasury: finances.treasury,
          foodReserve: food.foodReserve,
          regions: approval.regions,
        }),
      ],
      outcome,
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
      approval: approval.approval,
      harvest: food.harvest,
      entries: compileReport(entries),
    },
  };
}

/**
 * Projects what a set of decisions would do in the current quarter. It changes nothing and
 * draws nothing from the random generator, so previewing never alters the game that follows.
 * @throws RangeError when a decision is outside what the game allows.
 * @throws Error when the game is already over.
 */
export function previewQuarter(state: GameState, decisions: Decisions): Preview {
  checkDecisions(state, decisions);
  const finances = resolveBudget(state, decisions.budget);
  const situation = foodSituation(state);
  const relief = reliefFor(decisions, finances);
  const { quarter } = state.date;

  // Who goes short this quarter, and what relief reaches them, does not turn on the weather.
  const thisQuarter = resolveFood(situation, {
    agricultureSpentThisYear: state.agricultureSpentThisYear + finances.spent.agriculture,
    weatherShocks: state.regions.map(() => 0),
    harvestPermille: state.regions.map((region) => harvestPermille(state.events, region.id)),
    relief,
  });
  const forecast = forecastFood(situation, {
    agricultureSpentSoFar: state.agricultureSpentThisYear,
    quarters: financesToHarvest(state, decisions).map((quarterly) => ({
      agricultureSpent: quarterly.spent.agriculture,
      relief: reliefFor(decisions, quarterly),
    })),
    // At worst, every event that could still begin this growing year does.
    worstHarvestPermille: state.regions.map((region) =>
      worstHarvestPermille(state.country, state.events, region.id, quarter),
    ),
    bestHarvestPermille: state.regions.map((region) => harvestPermille(state.events, region.id)),
  });
  // Nothing in approval turns on the weather either, so it is projected exactly.
  const approval = resolveApproval(
    state.country,
    state.regions,
    thisQuarter.regions,
    approvalInputs(decisions, finances),
  );

  return {
    revenue: exactly(finances.revenue),
    spending: exactly(finances.spending),
    balance: exactly(finances.balance),
    treasury: exactly(finances.treasury),
    spendingCut: finances.cut,
    harvest: forecast.harvest,
    foodReserveAfterHarvest: forecast.reserveAfterHarvest,
    shortfalls: thisQuarter.shortfalls,
    relief: thisQuarter.relief,
    approval: exactly(approval.approval.value),
    approvalHeading: exactly(approval.heading),
    unrest: approvalStatus({ regions: approval.regions }).unrest,
    voteShare: forecastVoteShare(approval.approval.value),
  };
}

/** The ranges the budget may be set within. */
export const budgetLimits = balance.budget;

function checkDecisions(state: GameState, decisions: Decisions): void {
  if (state.outcome.status !== 'playing') throw new Error('The game is over.');
  checkBudget(decisions.budget);
  const target = decisions.reliefRegionId ?? null;
  if (target !== null && !state.regions.some((region) => region.id === target)) {
    throw new RangeError(`There is no region "${target}" to send food relief to.`);
  }
}

/** Relief goes where the player sends it, as far as what was actually spent on it can move. */
function reliefFor(decisions: Decisions, finances: BudgetOutcome): FoodInputs['relief'] {
  return {
    regionId: decisions.reliefRegionId ?? null,
    capacity: reliefCapacity(finances.spent.foodRelief),
  };
}

/** Approval answers to the tax rate decided and to what was actually spent. */
function approvalInputs(decisions: Decisions, finances: BudgetOutcome): ApprovalInputs {
  return { taxRatePercent: decisions.budget.taxRatePercent, spent: finances.spent };
}

/**
 * What the budget will bring in and pay out in each quarter from this one to the harvest
 * if it is left as it is. A treasury that runs dry on the way cuts the later quarters'
 * spending, and the forecast must know it.
 */
function financesToHarvest(state: GameState, decisions: Decisions): BudgetOutcome[] {
  const quarterly: BudgetOutcome[] = [];
  let { treasury } = state;
  for (let ahead = quartersUntilHarvest(state.date.quarter); ahead > 0; ahead -= 1) {
    const finances = resolveBudget({ ...state, treasury }, decisions.budget);
    quarterly.push(finances);
    treasury = finances.treasury;
  }
  return quarterly;
}

function foodSituation(state: GameState): FoodSituation {
  return {
    country: state.country,
    quarter: state.date.quarter,
    regions: state.regions,
    foodReserve: state.foodReserve,
  };
}

type Collapse = Extract<Outcome, { readonly cause: 'famine' }>;

/** The state collapses when famine has held one region for too many quarters running. */
function collapseOf(country: Country, regions: readonly RegionState[]): Collapse | null {
  const limit = balance.hunger.collapseAfterFamineQuarters;
  const stricken = regions.find((region) => region.famineQuarters >= limit);
  if (stricken === undefined) return null;
  return {
    status: 'lost',
    cause: 'famine',
    regionId: stricken.id,
    headline: 'The state has collapsed',
    summary: `Famine held ${regionName(country, stricken.id)} for ${limit} quarters running. The state has collapsed.`,
  };
}

/** What the turn report says when famine brings the state down. */
function collapseEntry(outcome: Collapse): ReportEntry {
  return {
    kind: 'collapse',
    seriousness: 'critical',
    headline: outcome.headline,
    cause: outcome.summary,
    regionId: outcome.regionId,
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
