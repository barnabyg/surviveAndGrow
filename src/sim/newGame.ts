import { startingApproval } from './approval';
import { startingLoyalty } from './army';
import type { Country } from './country';
import { openingCredit } from './credit';
import { startingDebts } from './debt';
import { regionKeep } from './food';
import { vitalSigns } from './history';
import { startingServices } from './prosperity';
import { seedGenerator } from './rng';
import type { GameState, RegionState } from './state';
import { tierAt } from './tiers';
import { openingPrices } from './trade';

/** Starts a game. The same country and seed always start the same game. */
export function createGame(country: Country, seed: number): GameState {
  const approval = startingApproval(country);
  const services = startingServices(country);
  const date = { year: 1, quarter: 1 } as const;
  const opening = {
    country,
    projects: [],
    // The rating the game opens at follows from the debt it starts with.
    debts: startingDebts(country.start.loans, date),
    budget: country.start.budget,
    date,
    treasury: country.start.treasury,
    foodReserve: country.start.foodReserve,
    worldPrices: openingPrices(),
    priceShocks: [],
    tradeCarried: [],
    regions: country.regions.map((region): RegionState => ({
      id: region.id,
      population: region.population,
      output: region.output,
      foodStock: regionKeep(region.population),
      weather: 0,
      foodStage: 'adequate',
      famineQuarters: 0,
      ...approval,
      ...services,
      ...startingLoyalty(country, approval.unrest),
    })),
  } as const;
  const signs = vitalSigns(opening);
  // The game begins in whatever tier its starting prosperity reaches.
  const tier = tierAt(signs.prosperity ?? 0);
  return {
    seed,
    rng: seedGenerator(seed),
    ...opening,
    reliefRegionId: null,
    agricultureSpentThisYear: 0,
    events: [],
    history: [signs],
    dilemma: null,
    dilemmasAnswered: [],
    credit: openingCredit(opening),
    tier,
    startingTier: tier,
    prosperousQuarters: 0,
    plottingQuarters: 0,
    austerity: null,
    outcome: { status: 'playing' },
  };
}
