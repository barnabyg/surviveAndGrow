import { clamp, PERMILLE_LIMITS, stepTowards, sum } from './arithmetic';
import { balance } from './balance';
import type { LeverBalance } from './balance/factions';
import type { Country } from './countryTypes';
import type { Contribution, Figure, Money } from './types';
import {
  CIVIL_FACTIONS,
  FACTION_LEVER_NAMES,
  FACTION_LEVERS,
  SPENDING_AREAS,
  type CivilFaction,
  type FactionLever,
  type FactionMood,
  type SpendingArea,
} from './vocabulary';

/*
 * The factions and their standing. Farmers, workers and business each have one national
 * standing, which answers to a few levers of its own and moves a share of the way each
 * quarter towards where they would settle it, as approval does. The standings then bear on
 * each region's approval by its faction mix (`factionsEffect`, which `approval.ts` reads).
 * What the interface is told of them, and the measures a quarter is judged by, are in
 * `factionStatus.ts`.
 */

/** What each lever now adds to or takes from a faction's standing, in thousandths. */
export type FactionEffects = Readonly<Record<FactionLever, number>>;

/** One civil faction's standing as the state holds it. */
export interface FactionStanding {
  /**
   * How the faction stands with the government, in thousandths: neutral plus the effects
   * below, held between nothing and the whole.
   */
  readonly standing: number;
  readonly effects: FactionEffects;
}

/** Every civil faction's standing. */
export type FactionStandings = Readonly<Record<CivilFaction, FactionStanding>>;

/** One figure for each civil faction, in thousandths: where each stands, or would settle. */
export type FactionLevels = Readonly<Record<CivilFaction, number>>;

/**
 * A region's faction mix: the share of its people who are farmers, workers and business, each
 * in parts of `MIX_WHOLE`. The three need not come to the whole: the rest of the region's
 * people follow no faction, and the factions move their approval by nothing.
 */
export type FactionMix = Readonly<Record<CivilFaction, number>>;

/**
 * All of a region's people, in the parts a mix is held in: three hundred, so that a whole
 * percentage and an even third are both whole numbers of them.
 */
export const MIX_WHOLE = 300;

/** A third of the people in each faction: what a region of an older country file is read as. */
export const EVEN_MIX: FactionMix = {
  farmers: MIX_WHOLE / 3,
  workers: MIX_WHOLE / 3,
  business: MIX_WHOLE / 3,
};

/** A mix from the whole percentage of a region's people in each faction. */
export function mixOfPercent(percent: Readonly<Record<CivilFaction, number>>): FactionMix {
  return mapFactions((faction) => (percent[faction] * MIX_WHOLE) / 100);
}

/** The mix of a region, found by its id: by its place in the country file's order if it can be. */
export function mixOf(country: Country, regionId: string, index: number): FactionMix {
  const region =
    country.regions[index]?.id === regionId
      ? country.regions[index]
      : country.regions.find((each) => each.id === regionId);
  return region?.factionMix ?? EVEN_MIX;
}

/** What the levers measure in a quarter. Nothing in it is left to chance. */
export interface FactionInputs {
  /** The tax rate the quarter is resolved with, as a whole percentage. */
  readonly taxRatePercent: number;
  /** What is actually spent on each area in the quarter, after any forced cut. */
  readonly spent: Readonly<Record<SpendingArea, Money>>;
  /** What the tax raises in the quarter. */
  readonly revenue: Money;
  /** The debt burden as the quarter begins, in thousandths. */
  readonly debtBurden: number;
  /** How many large sites are in use as the quarter begins. */
  readonly works: number;
  /**
   * What the drought and flood in force as the quarter begins leave of each region's
   * harvest, in thousandths, in the regions' order.
   */
  readonly harvestLeft: readonly number[];
}

/** Where a faction's people live: each region's people and its faction mix, in order. */
export type Homes = readonly { readonly population: number; readonly mix: FactionMix }[];

export interface FactionsOutcome {
  readonly standings: FactionStandings;
  /** Each standing after the quarter, with what each lever did to it. */
  readonly figures: Readonly<Record<CivilFaction, Figure>>;
  /** Where each standing settles if the quarter's measures stay as they are. */
  readonly settles: FactionLevels;
}

/**
 * How far the Factions effect must move a region's approval, either way and in thousandths,
 * for a standing to count as moving approval noticeably.
 */
export const factionsNoticeablePermille = balance.factions.noticeablePermille;

const LIMITS = PERMILLE_LIMITS;
const LIMIT_LABEL = 'Standing at its limit';

/**
 * The levers each faction answers to, with their marks, in the vocabulary's order. They are
 * read from balance data once: a quarter is resolved many times over when the game looks ahead.
 */
const LEVERS: Readonly<Record<CivilFaction, readonly (readonly [FactionLever, LeverBalance])[]>> =
  mapFactions((faction) => {
    const levers: Partial<Record<FactionLever, LeverBalance>> = balance.factions.levers[faction];
    return FACTION_LEVERS.flatMap((lever): [FactionLever, LeverBalance][] => {
      const marks = levers[lever];
      return marks === undefined ? [] : [[lever, marks]];
    });
  });

/** Whether a faction answers to a lever. */
function answersTo(faction: CivilFaction, lever: FactionLever): boolean {
  return LEVERS[faction].some(([answered]) => answered === lever);
}

/** The mood a standing is read as, by the marks in balance data. */
export function moodAt(standing: number): FactionMood {
  const { pleasedFromPermille, uneasyBelowPermille, angryBelowPermille } = balance.factions.moods;
  if (standing < angryBelowPermille) return 'angry';
  if (standing < uneasyBelowPermille) return 'uneasy';
  return standing >= pleasedFromPermille ? 'pleased' : 'content';
}

/**
 * The highest a faction's standing can settle: every lever it answers to at its best. No
 * budget settles farmers, workers and business all here at once (see `balance.factions`).
 */
export function bestStanding(faction: CivilFaction): number {
  return clamp(
    balance.factions.neutralPermille +
      sum(
        LEVERS[faction].map(([, marks]) =>
          marks.best === marks.neutral ? 0 : marks.weightPermille,
        ),
      ),
    LIMITS.min,
    LIMITS.max,
  );
}

/** Each standing as a single figure. */
export function levelsOf(standings: FactionStandings): FactionLevels {
  return mapFactions((faction) => standings[faction].standing);
}

/** Every faction standing at neutral, with nothing pushing it: how an earlier save is read. */
export function neutralStandings(): FactionStandings {
  return mapFactions(() => ({
    standing: balance.factions.neutralPermille,
    effects: mapLevers(() => 0),
  }));
}

/** The standings settled where a quarter's measures put them. */
export function settledStandings(inputs: FactionInputs, homes: Homes): FactionStandings {
  return mapFactions((faction) => {
    const effects = settledEffects(faction, inputs, homes);
    return { standing: standingFrom(effects), effects };
  });
}

/**
 * One quarter of the factions' standing. Each lever's effect on each standing closes part of
 * the gap to where the quarter's measure of it would settle it, so a change to the budget is
 * felt over quarters.
 */
export function resolveFactions(
  was: FactionStandings,
  inputs: FactionInputs,
  homes: Homes,
): FactionsOutcome {
  const pace = balance.factions.adjustPermillePerQuarter;
  const moves = mapFactions((faction) => {
    const before = was[faction];
    const settled = settledEffects(faction, inputs, homes);
    const effects = mapLevers((lever) => before.effects[lever]);
    const contributions: Contribution[] = [];
    let moved = 0;
    for (const lever of FACTION_LEVERS) {
      const drift = stepTowards(before.effects[lever], settled[lever], pace);
      effects[lever] += drift;
      moved += drift;
      if (drift !== 0 || answersTo(faction, lever)) {
        contributions.push({ label: FACTION_LEVER_NAMES[lever], amount: drift });
      }
    }
    const standing = standingFrom(effects);
    const change = standing - before.standing;
    // What the limits took back from the sum of the movements.
    if (change !== moved) contributions.push({ label: LIMIT_LABEL, amount: change - moved });
    return {
      standing: { standing, effects },
      figure: { value: standing, change, contributions },
      settles: standingFrom(settled),
    };
  });
  return {
    standings: mapFactions((faction) => moves[faction].standing),
    figures: mapFactions((faction) => moves[faction].figure),
    settles: mapFactions((faction) => moves[faction].settles),
  };
}

/**
 * What moved each standing most in a quarter, by the name of the lever, or null where
 * nothing moved it.
 */
export function movedMost(
  figures: Readonly<Record<CivilFaction, Figure>>,
): Record<CivilFaction, string | null> {
  return mapFactions((faction) => {
    const [most] = [...figures[faction].contributions]
      .filter((line) => line.amount !== 0)
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
    return most?.label ?? null;
  });
}

/** Neutral and what each lever adds to it, adding up to the standing. */
export function standingCauses(faction: CivilFaction, held: FactionStanding): Contribution[] {
  const { neutralPermille } = balance.factions;
  const limited =
    held.standing - neutralPermille - sum(FACTION_LEVERS.map((lever) => held.effects[lever]));
  return [
    { label: 'Neutral', amount: neutralPermille },
    ...FACTION_LEVERS.flatMap((lever): Contribution[] =>
      answersTo(faction, lever) || held.effects[lever] !== 0
        ? [{ label: FACTION_LEVER_NAMES[lever], amount: held.effects[lever] }]
        : [],
    ),
    ...(limited === 0 ? [] : [{ label: LIMIT_LABEL, amount: limited }]),
  ];
}

/**
 * The Factions effect on a region's approval, in thousandths: how far each faction stands
 * above or below neutral, weighted by its share of the region's people, on the scale in balance
 * data. Each faction's part is rounded towards nothing, so that standings as far below neutral
 * as above weigh the same, and the effect is the parts together.
 */
export function factionsEffect(
  mix: FactionMix,
  levels: FactionLevels,
): { readonly total: number; readonly parts: FactionLevels } {
  const { neutralPermille, approvalScalePermille } = balance.factions;
  const denominator = MIX_WHOLE * 1000;
  let total = 0;
  const parts = mapFactions((faction) => {
    const part =
      Math.trunc(
        (mix[faction] * (levels[faction] - neutralPermille) * approvalScalePermille) / denominator,
      ) || 0;
    total += part;
    return part;
  });
  return { total, parts };
}

/** Each faction's share of a region's people, in thousandths, to the nearest. */
export function mixShares(mix: FactionMix): FactionLevels {
  return mapFactions((faction) => Math.round((mix[faction] * 1000) / MIX_WHOLE));
}

export function mapFactions<Value>(
  of: (faction: CivilFaction, index: number) => Value,
): Record<CivilFaction, Value> {
  const mapped = {} as Record<CivilFaction, Value>;
  CIVIL_FACTIONS.forEach((faction, index) => {
    mapped[faction] = of(faction, index);
  });
  return mapped;
}

function mapLevers(effect: (lever: FactionLever) => number): Record<FactionLever, number> {
  const mapped = {} as Record<FactionLever, number>;
  for (const lever of FACTION_LEVERS) mapped[lever] = effect(lever);
  return mapped;
}

/** Where each lever would settle its effect on a faction's standing if nothing changed again. */
function settledEffects(
  faction: CivilFaction,
  inputs: FactionInputs,
  homes: Homes,
): FactionEffects {
  // A lever the faction does not answer to settles at nothing, and so fades if it once did.
  const effects = mapLevers(() => 0);
  for (const [lever, marks] of LEVERS[faction]) {
    effects[lever] = leverEffect(marks, measureOf(lever, marks, faction, inputs, homes));
  }
  return effects;
}

/** What a lever's measure settles a standing by, in thousandths (see `LeverBalance`). */
function leverEffect(marks: LeverBalance, measure: number): number {
  const { weightPermille, worst, neutral, best } = marks;
  const towards = (mark: number) =>
    mark !== neutral && Math.sign(measure - neutral) === Math.sign(mark - neutral);
  if (towards(best)) {
    return clamp(
      Math.trunc((weightPermille * (measure - neutral)) / (best - neutral)),
      0,
      weightPermille,
    );
  }
  if (towards(worst)) {
    return (
      0 -
      clamp(
        Math.trunc((weightPermille * (measure - neutral)) / (worst - neutral)),
        0,
        weightPermille,
      )
    );
  }
  return 0;
}

/** What a lever measures in a quarter, for one faction (see `FACTION_LEVERS`). */
function measureOf(
  lever: FactionLever,
  marks: LeverBalance,
  faction: CivilFaction,
  inputs: FactionInputs,
  homes: Homes,
): number {
  const spending = sum(SPENDING_AREAS.map((area) => inputs.spent[area]));
  const shareOf = (amount: Money) => (spending === 0 ? 0 : Math.floor((amount * 1000) / spending));
  switch (lever) {
    case 'agricultureShare':
      return shareOf(inputs.spent.agriculture);
    case 'servicesShare':
      return shareOf(inputs.spent.health + inputs.spent.education);
    case 'tax':
      return inputs.taxRatePercent;
    case 'budgetBalance':
      // With nothing raised, anything spent is as deep a deficit as the lever knows: its worst.
      if (inputs.revenue === 0) return spending === 0 ? 0 : marks.worst;
      return Math.trunc(((inputs.revenue - spending) * 1000) / inputs.revenue);
    case 'debtBurden':
      return inputs.debtBurden;
    case 'works':
      return inputs.works;
    case 'harvest': {
      // Judged where the faction's people live; if they live nowhere, where anyone does.
      const own = homes.map((home) => home.population * home.mix[faction]);
      const weights = sum(own) === 0 ? homes.map((home) => home.population) : own;
      const people = sum(weights);
      if (people === 0) return 1000;
      return Math.floor(
        sum(weights.map((weight, index) => weight * (inputs.harvestLeft[index] ?? 1000))) / people,
      );
    }
  }
}

function standingFrom(effects: FactionEffects): number {
  let standing = balance.factions.neutralPermille;
  for (const lever of FACTION_LEVERS) standing += effects[lever];
  return clamp(standing, LIMITS.min, LIMITS.max);
}
