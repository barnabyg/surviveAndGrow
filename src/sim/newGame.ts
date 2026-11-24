import { startingApproval } from './approval';
import { startingLoyalty } from './army';
import type { Country, Region } from './country';
import { openingCredit } from './credit';
import { startingDebts } from './debt';
import { startingDeterrence } from './deterrence';
import { levelsOf, neutralStandings } from './factions';
import { startingStandings } from './factionStatus';
import { regionKeep } from './food';
import { vitalSigns } from './history';
import { startingServices } from './prosperity';
import { seedGenerator } from './rng';
import type { GameState, RegionState } from './state';
import { tierAt } from './tiers';
import { openingPrices } from './trade';

/** Starts a game. The same country and seed always start the same game. */
export function createGame(country: Country, seed: number): GameState {
  const services = startingServices(country);
  const date = { year: 1, quarter: 1 } as const;
  const position = {
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
    borderIncidents: [],
    tradeCarried: [],
  } as const;
  const regionsWith = (
    approvalIn: (region: Region) => ReturnType<typeof startingApproval>,
  ): RegionState[] =>
    country.regions.map((region) => {
      const approval = approvalIn(region);
      return {
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
      };
    });
  // The factions open where the starting budget settles them. Business judges it by what the
  // tax raises, which turns on who is striking, so the country is first read as it would open
  // with the factions left out, and then they take their part in each region's approval.
  const unswayed = {
    ...position,
    regions: regionsWith(() => startingApproval(country)),
    factions: neutralStandings(),
  };
  const factions = startingStandings({
    ...unswayed,
    events: [],
    history: [vitalSigns(unswayed)],
  });
  const opening = {
    ...position,
    regions: regionsWith((region) =>
      startingApproval(country, { mix: region.factionMix, levels: levelsOf(factions) }),
    ),
  };
  const signs = vitalSigns({ ...opening, factions });
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
    deterrence: startingDeterrence(country),
    factions,
    austerity: null,
    outcome: { status: 'playing' },
  };
}
