import { nationalApproval } from './approval';
import type { Country } from './country';
import { foodStatus } from './food';
import type { Project } from './projects';
import { prosperityStatus } from './prosperity';
import type { RegionState } from './state';
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
}

/** The vital signs of a country at one moment. */
export function vitalSigns(position: {
  readonly country: Country;
  readonly projects: readonly Project[];
  readonly date: GameDate;
  readonly treasury: Money;
  readonly foodReserve: number;
  readonly regions: readonly RegionState[];
  /** National prosperity, when it has already been worked out for this position. */
  readonly prosperity?: number;
}): VitalSigns {
  return {
    date: position.date,
    treasury: position.treasury,
    foodReserve: position.foodReserve,
    quarterlyConsumption: foodStatus(position).quarterlyConsumption,
    approval: nationalApproval(position.regions),
    prosperity: position.prosperity ?? prosperityStatus(position).value,
  };
}
