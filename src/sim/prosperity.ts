import { apportion, clamp, sum } from './arithmetic';
import { balance } from './balance';
import { chainEarnings, earningLines } from './chains';
import type { Budget } from './budget';
import type { WorldPrices } from './trade';
import type { Country } from './country';
import { poweredOutput, powerLines, regionPower, unpowered, type RegionPower } from './power';
import { infrastructureFrom, sitesInUse, type Project } from './projects';
import { serviceOf } from './sites';
import type { RegionState } from './state';
import { DOLLARS_PER_MONEY, type Contribution, type Figure, type Money } from './types';
import {
  LASTING_SERVICE_SPENDING,
  LASTING_SERVICES,
  PROSPERITY_PART_NAMES,
  PROSPERITY_PARTS,
  type LastingService,
  type ProsperityPart,
} from './vocabulary';

/** How a region or the nation scores on each part of its living standard, in thousandths. */
export type ProsperityScores = Readonly<Record<ProsperityPart, number>>;

/** A region's living standard, in thousandths, and the scores it is built from. */
export interface LivingStandard {
  readonly regionId: string;
  readonly value: number;
  readonly scores: ProsperityScores;
  /**
   * What the region produces this quarter, part by part, in Money: its own output, what each
   * chain earns there, and what power adds. Its income per head is judged from their sum.
   */
  readonly output: readonly Contribution[];
  /**
   * What gives the region its infrastructure access, in thousandths: each site in use there
   * that adds to it, and power. The score is their sum, up to the whole.
   */
  readonly infrastructure: readonly Contribution[];
  /** How power reaches the region. */
  readonly power: RegionPower;
}

/** How national prosperity stands, and what it is made of. All figures are in thousandths. */
export interface ProsperityStatus {
  /** National prosperity: the regions' living standards averaged by population. */
  readonly value: number;
  /** The prosperity the country is aiming for. */
  readonly target: number;
  /** What each part adds to national prosperity, in the vocabulary's order, adding up to it. */
  readonly parts: readonly Contribution[];
  /** Each region's living standard, in the country file's order. */
  readonly regions: readonly LivingStandard[];
}

/** What prosperity is judged from: the regions as they stand and the sites in use. */
export interface ProsperitySituation {
  readonly country: Country;
  readonly regions: readonly RegionState[];
  readonly projects: readonly Project[];
  /** The world prices, which set what a mine's chain earns. */
  readonly worldPrices: WorldPrices;
}

/** What the sites in use are read from. */
interface Building {
  readonly country: Country;
  readonly projects: readonly Project[];
}

/** Each region's living standard. */
export function livingStandards(situation: ProsperitySituation): LivingStandard[] {
  const earnings = chainEarnings(situation);
  const inUse = sitesInUse(situation);
  const powers = regionPower(situation);
  const nameOf = (siteId: string | null) =>
    situation.country.sites.find((site) => site.id === siteId)?.name ?? '';
  return situation.regions.map((region) => {
    const regionId = region.id;
    const power = powers.find((entry) => entry.regionId === regionId) ?? unpowered(regionId);
    const fromPower = `Power from ${nameOf(power.stationId)}`;
    // What a chain earns is part of its region's output, and so of its people's income.
    const output: Contribution[] = [
      { label: 'Own output', amount: region.output, regionId },
      ...earnings
        .filter(({ site }) => site.regionId === regionId)
        .flatMap((earning) =>
          earningLines(earning.site.name, earning).map((line) => ({ ...line, regionId })),
        ),
      ...(power.outputPermille > 0
        ? powerLines(fromPower, power, (gain) => poweredOutput(region.output, gain))
        : []
      ).map((line) => ({ ...line, regionId })),
    ];
    const infrastructure: Contribution[] = [
      ...inUse
        .filter(({ site }) => site.regionId === regionId)
        .map((entry) => ({ label: entry.site.name, amount: infrastructureFrom(entry), regionId }))
        .filter((part) => part.amount > 0),
      ...(power.infrastructurePermille > 0
        ? powerLines(fromPower, power, (gain) => gain.infrastructurePermille)
        : []
      ).map((line) => ({ ...line, regionId })),
    ];
    const scores = scoresOf(
      { ...region, output: sum(output.map((part) => part.amount)) },
      Math.min(1000, sum(infrastructure.map((part) => part.amount))),
    );
    return { regionId, value: weigh(scores), scores, output, infrastructure, power };
  });
}

export function prosperityStatus(situation: ProsperitySituation): ProsperityStatus {
  const regions = livingStandards(situation);
  const populations = situation.regions.map((region) => region.population);
  const people = sum(populations);
  const value =
    people === 0
      ? 0
      : Math.floor(
          sum(regions.map((standard, index) => (populations[index] ?? 0) * standard.value)) /
            people,
        );
  const { weightsPermille } = balance.prosperity;
  const numerators = PROSPERITY_PARTS.map((part) =>
    sum(
      regions.map(
        (standard, index) =>
          (populations[index] ?? 0) * weightsPermille[part] * standard.scores[part],
      ),
    ),
  );
  const amounts =
    people === 0 ? numerators.map(() => 0) : apportion(numerators, people * 1000, value);
  return {
    value,
    target: balance.prosperity.tiers.prosperous.fromPermille,
    parts: PROSPERITY_PARTS.map((part, index) => ({
      label: PROSPERITY_PART_NAMES[part],
      amount: amounts[index] ?? 0,
    })),
    regions,
  };
}

/** How prosperity moved from one position to another, part by part. */
export function prosperityFigure(before: ProsperityStatus, after: ProsperityStatus): Figure {
  return {
    value: after.value,
    change: after.value - before.value,
    contributions: after.parts.map((part, index) => ({
      label: part.label,
      amount: part.amount - (before.parts[index]?.amount ?? 0),
    })),
  };
}

/**
 * Where spending on a lasting service would hold its level, in thousandths. It is judged
 * per head, so the same data serves a country of any size.
 */
export function settledServiceLevel(service: LastingService, spent: Money, people: number): number {
  if (people <= 0) return 0;
  const { permillePerMoneyPerMillionPeople } = balance.prosperity.services[service];
  return clamp(
    Math.floor((spent * 1_000_000 * permillePerMoneyPerMillionPeople) / people),
    0,
    1000,
  );
}

/** The levels of the lasting services as a game starts: where the starting budget holds them. */
export function startingServices(country: Country): Readonly<Record<LastingService, number>> {
  const people = sum(country.regions.map((region) => region.population));
  return servicesFrom((service) =>
    settledServiceLevel(service, country.start.budget.spending[service], people),
  );
}

/**
 * One quarter of the lasting services. Each region's level closes a share of the gap to
 * where the quarter's spending and the sites in use there would hold it: it builds up while
 * that is above the level and wears down while it is below, so neither happens at once.
 */
export function resolveServices(
  regions: readonly RegionState[],
  spent: Readonly<Record<LastingService, Money>>,
  building: Building,
): RegionState[] {
  const held = serviceParts(regions, spent, building);
  return regions.map((region, index) => ({
    ...region,
    ...servicesFrom((service) => {
      const { buildPermillePerQuarter, wearPermillePerQuarter } =
        balance.prosperity.services[service];
      const gap = settlesAt(held[index]?.[service] ?? []) - region[service];
      const rate = gap > 0 ? buildPermillePerQuarter : wearPermillePerQuarter;
      // Rounded away from nothing, so a level arrives in the end and does not stall short.
      const step = Math.ceil((Math.abs(gap) * rate) / 1000);
      return region[service] + Math.sign(gap) * Math.min(step, Math.abs(gap));
    }),
  }));
}

/** How a lasting service stands in a region, and what holds it where it is heading. */
export interface ServiceLevel {
  readonly regionId: string;
  readonly service: LastingService;
  /** The level as it stands, in thousandths. */
  readonly level: number;
  /** Where the level settles if spending and the sites in use stay as they are. */
  readonly settles: number;
  /**
   * What holds it there, in thousandths: spending on the service, then each site in use in
   * the region that raises it. The level settles at their sum, up to the whole.
   */
  readonly parts: readonly Contribution[];
}

/**
 * Each region's lasting services, in the country file's order: where each stands and where
 * the budget given, the one in force unless another is, and the sites in use would hold it.
 * The quarter's own reckoning (`resolveServices`) reads the same parts.
 */
export function serviceLevels(
  state: Building & { readonly regions: readonly RegionState[]; readonly budget: Budget },
  budget: Budget = state.budget,
): ServiceLevel[] {
  const held = serviceParts(state.regions, budget.spending, state);
  return state.regions.flatMap((region, index) =>
    LASTING_SERVICES.map((service) => {
      const parts = held[index]?.[service] ?? [];
      return {
        regionId: region.id,
        service,
        level: region[service],
        settles: settlesAt(parts),
        parts,
      };
    }),
  );
}

/**
 * What holds each region's lasting services where they settle: what is spent on the service,
 * judged per head across the nation, and each site in use in the region that raises it.
 */
function serviceParts(
  regions: readonly RegionState[],
  spent: Readonly<Record<LastingService, Money>>,
  building: Building,
): Record<LastingService, Contribution[]>[] {
  const people = sum(regions.map((region) => region.population));
  const inUse = sitesInUse(building);
  return regions.map(({ id: regionId }) =>
    servicesFrom((service) => [
      {
        label: LASTING_SERVICE_SPENDING[service],
        amount: settledServiceLevel(service, spent[service], people),
        regionId,
      },
      ...inUse
        .filter(({ site }) => site.regionId === regionId)
        .map(({ site, decaying }) => ({
          label: site.name,
          amount: serviceOf(site.type, service, decaying),
          regionId,
        }))
        .filter((part) => part.amount > 0),
    ]),
  );
}

/** Where a service settles under what holds it: the sum of the parts, up to the whole. */
function settlesAt(parts: readonly Contribution[]): number {
  return Math.min(1000, sum(parts.map((part) => part.amount)));
}

function scoresOf(region: RegionState, infrastructure: number): ProsperityScores {
  return {
    food: balance.prosperity.food[region.foodStage],
    income: incomeScore(region.output, region.population),
    health: region.health,
    education: region.education,
    infrastructure,
  };
}

/** Income per head as a score: in proportion to the income that scores in full. */
function incomeScore(output: Money, population: number): number {
  if (population <= 0) return 0;
  const full = balance.prosperity.fullIncomeDollarsPerPersonPerQuarter;
  return clamp(Math.floor((output * DOLLARS_PER_MONEY * 1000) / (population * full)), 0, 1000);
}

function weigh(scores: ProsperityScores): number {
  const { weightsPermille } = balance.prosperity;
  return Math.floor(
    sum(PROSPERITY_PARTS.map((part) => weightsPermille[part] * scores[part])) / 1000,
  );
}

function servicesFrom<Value>(
  of: (service: LastingService) => Value,
): Record<LastingService, Value> {
  return Object.fromEntries(LASTING_SERVICES.map((service) => [service, of(service)])) as Record<
    LastingService,
    Value
  >;
}
