import { nationalApproval } from './approval';
import { foodStatus } from './food';
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
}

/** The vital signs of a country at one moment. */
export function vitalSigns(position: {
  readonly date: GameDate;
  readonly treasury: Money;
  readonly foodReserve: number;
  readonly regions: readonly RegionState[];
}): VitalSigns {
  return {
    date: position.date,
    treasury: position.treasury,
    foodReserve: position.foodReserve,
    quarterlyConsumption: foodStatus(position).quarterlyConsumption,
    approval: nationalApproval(position.regions),
  };
}
