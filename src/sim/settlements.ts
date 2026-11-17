import { balance } from './balance';
import { livingStandards, type ProsperitySituation } from './prosperity';
import type { SettlementSize } from './vocabulary';

/** How built up and how lit a settlement is: what the map draws of it. */
export interface SettlementLook {
  /** How many buildings it shows. */
  readonly buildings: number;
  /** How many of those are lit, never more than it shows. */
  readonly lit: number;
}

/**
 * How many buildings a settlement of each size shows: `fewest` where living standards are
 * at nothing, and `added` more spread evenly up to a living standard of 100.
 */
const BUILDINGS: Readonly<Record<SettlementSize, { fewest: number; added: number }>> = {
  town: { fewest: 7, added: 9 },
  village: { fewest: 3, added: 6 },
};

/**
 * How a settlement looks at its region's living standard, in thousandths. It grows denser as
 * living standards rise, and lights a share of its buildings in proportion, every one of them
 * once the region reaches the prosperity target. The look is worked out afresh from the living
 * standard each time, so a falling standard dims the settlement as surely as a rising one
 * lights it.
 */
export function settlementLook(size: SettlementSize, livingStandard: number): SettlementLook {
  const { fewest, added } = BUILDINGS[size];
  const standard = Math.min(Math.max(livingStandard, 0), 1000);
  const buildings = fewest + Math.floor((standard * added) / 1000);
  const fullyLit = balance.prosperity.tiers.prosperous.fromPermille;
  const lit = Math.floor((buildings * Math.min(standard, fullyLit)) / fullyLit);
  return { buildings, lit };
}

/** How every settlement of the country looks, in the country file's order. */
export function settlementLooks(
  situation: ProsperitySituation,
): (SettlementLook & { readonly settlementId: string })[] {
  const standards = livingStandards(situation);
  return situation.country.settlements.map((settlement) => {
    const standard = standards.find((entry) => entry.regionId === settlement.regionId);
    return {
      settlementId: settlement.id,
      ...settlementLook(settlement.size, standard?.value ?? 0),
    };
  });
}
