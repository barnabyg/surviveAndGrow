import { nationalApproval } from './approval';
import { nationalLoyalty } from './army';
import type { BorderIncident } from './borderIncidents';
import type { Budget } from './budget';
import type { Country } from './country';
import { debtBurden, debtOf, type Debt } from './debt';
import { levelsOf, type FactionLevels, type FactionStandings } from './factions';
import { foodStatus } from './food';
import type { Project } from './projects';
import { prosperityStatus } from './prosperity';
import type { RegionState } from './state';
import type { WorldPrices } from './trade';
import type { GameDate, Money } from './types';

/**
 * How the country's vital signs stood as one quarter began. The game keeps one of these
 * for the start and one for every quarter since, which is what trend lines and the
 * end-of-game summary are drawn from.
 */
export interface VitalSigns {
  /** The quarter the figures stand at the start of. */
  readonly date: GameDate;
  readonly treasury: Money;
  /** The national food reserve, in tonnes. */
  readonly foodReserve: number;
  /** What the whole population eats in a quarter, in tonnes. It turns the reserve into months. */
  readonly quarterlyConsumption: number;
  /** National approval, in thousandths. */
  readonly approval: number;
  /**
   * National prosperity, in thousandths, or null for a quarter recorded by a release that
   * did not yet measure it.
   */
  readonly prosperity: number | null;
  /**
   * National army loyalty, in thousandths, or null for a quarter recorded by a release that
   * kept no army.
   */
  readonly armyLoyalty: number | null;
  /**
   * The standing of farmers, workers and business, in thousandths, or null for a quarter
   * recorded by a release that had no factions.
   */
  readonly standings: FactionLevels | null;
  /** What the nation owed. */
  readonly debt: Money;
  /** The debt against a year's revenue at the budget in force, in thousandths. */
  readonly debtBurden: number;
}

/** The vital signs of a country at one moment. */
export function vitalSigns(position: {
  readonly country: Country;
  readonly projects: readonly Project[];
  readonly date: GameDate;
  readonly treasury: Money;
  readonly foodReserve: number;
  readonly regions: readonly RegionState[];
  readonly budget: Budget;
  readonly debts: readonly Debt[];
  readonly worldPrices: WorldPrices;
  readonly borderIncidents: readonly BorderIncident[];
  readonly factions: FactionStandings;
  /** National prosperity, when it has already been worked out for this position. */
  readonly prosperity?: number;
  /** The debt burden, when it has already been worked out for this position. */
  readonly debtBurden?: number;
}): VitalSigns {
  return {
    date: position.date,
    treasury: position.treasury,
    foodReserve: position.foodReserve,
    quarterlyConsumption: foodStatus(position).quarterlyConsumption,
    approval: nationalApproval(position.regions),
    prosperity: position.prosperity ?? prosperityStatus(position).value,
    armyLoyalty: nationalLoyalty(position.regions),
    standings: levelsOf(position.factions),
    debt: debtOf(position.debts),
    debtBurden: position.debtBurden ?? debtBurden(position),
  };
}
