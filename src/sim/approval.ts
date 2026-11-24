import { apportion, clamp, percentOff, stepTowards, sum } from './arithmetic';
import { balance } from './balance';
import type { BudgetOutcome } from './budget';
import { regionName, type Country } from './country';
import type { DilemmaOutcome } from './dilemmas';
import {
  factionsEffect,
  levelsOf,
  mapFactions,
  mixOf,
  moodAt,
  type FactionLevels,
  type FactionMix,
  type FactionStandings,
} from './factions';
import type { ReportEntry } from './report';
import type { Decisions, RegionState } from './state';
import { formatPercent } from './text';
import { expectationsIn } from './tiers';
import type { Contribution, Figure, Money } from './types';
import {
  APPROVAL_DRIVER_NAMES,
  APPROVAL_DRIVERS,
  CIVIL_FACTIONS,
  FACTION_MOOD_NAMES,
  FACTION_NAMES,
  UNREST_NAMES,
  type ApprovalDriver,
  type CivilFaction,
  type FoodStage,
  type SpendingArea,
  type Tier,
  type Unrest,
} from './vocabulary';

/**
 * What each driver now adds to or takes from a region's approval, in thousandths. A
 * region's approval is the baseline plus these, held between nothing and everyone.
 */
export type ApprovalEffects = Readonly<Record<ApprovalDriver, number>>;

/**
 * A one-off push on approval, such as the consequence of a choice the player made. It
 * lands at once under its own label in the breakdown, and then fades like any passing event.
 */
export interface ApprovalPush {
  readonly label: string;
  /** How far it moves approval, in thousandths; negative to push it down. */
  readonly permille: number;
  /** The one region it lands in. Left out, it lands in every region. */
  readonly regionId?: string;
}

/** What bears on a quarter of approval from outside the regions themselves. */
export interface ApprovalInputs {
  /** The tax rate the quarter was resolved with. */
  readonly taxRatePercent: number;
  /** What was actually spent on each area in the quarter, after any forced cut. */
  readonly spent: Readonly<Record<SpendingArea, Money>>;
  /** One-off pushes landing this quarter. */
  readonly pushes?: readonly ApprovalPush[];
  /**
   * How far the public's expectations lowered the approval baseline as the quarter began
   * (`was`) and lower it once it ends (`now`), in thousandths. Left out, there are none.
   */
  readonly expectations?: { readonly was: number; readonly now: number };
  /**
   * How the factions bear on the quarter. The Factions effect in a region is the standings
   * as the quarter ends weighted by its mix: it moves as they do, and no more slowly. Left
   * out, it stays as it is.
   */
  readonly factions?: FactionsNow;
}

/** The factions' standings over a quarter, as approval reads them. */
export interface FactionsNow {
  /** Each standing as the quarter began, and as it ends. */
  readonly was: FactionLevels;
  readonly now: FactionLevels;
  /** Where the quarter's measures would settle each. */
  readonly settles: FactionLevels;
  /** What moved each most in the quarter, in a few words, or null if nothing did. */
  readonly movedBy?: Readonly<Record<CivilFaction, string | null>>;
}

/** Approval answers to the tax rate decided and to what was actually spent. */
export function approvalInputs(
  decisions: Decisions,
  finances: BudgetOutcome,
  answer: DilemmaOutcome,
): ApprovalInputs {
  return {
    taxRatePercent: decisions.budget.taxRatePercent,
    spent: finances.spent,
    pushes: answer.pushes,
  };
}

export interface RegionUnrest {
  readonly regionId: string;
  readonly unrest: Exclude<Unrest, 'calm'>;
}

export interface ApprovalOutcome {
  /** The regions with their approval, its effects and their unrest brought up to date. */
  readonly regions: readonly RegionState[];
  /** National approval after the quarter, in thousandths, with everything that moved it. */
  readonly approval: Figure;
  /** Where national approval settles if the same inputs and food situation go on. */
  readonly heading: number;
  readonly entries: readonly ReportEntry[];
}

/** How national approval stands, and what it is made of. All figures are in thousandths. */
export interface ApprovalStatus {
  /** National approval: the regions' approval averaged by population. */
  readonly approval: number;
  /** A region strikes while its approval is below this. */
  readonly strikesBelow: number;
  /** A region protests while its approval is below this. */
  readonly protestsBelow: number;
  /**
   * The baseline and what each driver now adds to or takes from it, adding up to approval.
   * The Factions line is split by faction when the factions' standings are given.
   */
  readonly causes: readonly Contribution[];
  /** The regions now striking or protesting, in the country file's order. */
  readonly unrest: readonly RegionUnrest[];
}

/** The drivers whose effect is a matter of public spending per head. */
type Service = keyof typeof balance.approval.services;

const LIMITS = { min: 0, max: 1000 } as const;
const LIMIT_LABEL = 'Approval at its limit';

/**
 * Approval and unrest as a region starts the game: settled where the starting budget puts
 * it, so that nothing moves until the player or the weather changes something. Given the
 * region's faction mix and the standings the game opens with, it counts what the factions do
 * there; without them it leaves the factions out.
 */
export function startingApproval(
  country: Country,
  factions?: { readonly mix: FactionMix; readonly levels: FactionLevels },
): Pick<RegionState, 'approval' | 'approvalEffects' | 'unrest'> {
  const people = sum(country.regions.map((region) => region.population));
  const approvalEffects = settledEffects(
    {
      foodStage: 'adequate',
      factions: factions === undefined ? 0 : factionsEffect(factions.mix, factions.levels).total,
    },
    toInputs(country.start.budget),
    people,
  );
  const approval = approvalFrom(approvalEffects, 0);
  return { approval, approvalEffects, unrest: unrestAt(approval) };
}

/**
 * One quarter of approval.
 *
 * `before` is the regions as the quarter began and `after` the same regions once the
 * quarter's food is settled, still carrying the approval they began with. Each driver's
 * effect on each region closes part of the gap to where that driver would settle it, so
 * approval builds and recovers over several quarters. One-off pushes land in full. A
 * region's unrest for the quarters that follow is then read off its new approval.
 */
export function resolveApproval(
  country: Country,
  before: readonly RegionState[],
  after: readonly RegionState[],
  inputs: ApprovalInputs,
): ApprovalOutcome {
  const people = sum(after.map((region) => region.population));
  const pushes = inputs.pushes ?? [];
  const expectations = inputs.expectations ?? { was: 0, now: 0 };
  const raised = expectations.now - expectations.was;
  const { factions } = inputs;
  const moves = after.map((region, index) => {
    const mix = mixOf(country, region.id, index);
    // What the factions do here as the quarter began and as it ends, and where they are heading.
    const followed =
      factions === undefined
        ? null
        : {
            was: factionsEffect(mix, factions.was).parts,
            now: factionsEffect(mix, factions.now),
            settles: factionsEffect(mix, factions.settles).total,
          };
    const settled = settledEffects(
      {
        foodStage: region.foodStage,
        factions: followed?.settles ?? region.approvalEffects.factions,
      },
      inputs,
      people,
    );
    const landing = pushes.filter(
      (push) => push.regionId === undefined || push.regionId === region.id,
    );
    // What each driver's effect moves by this quarter, pushes aside. The factions' standings
    // have already moved their share of the way, so their effect here follows them at once.
    const drift = mapDrivers((driver) =>
      driver === 'factions'
        ? (followed?.now.total ?? region.approvalEffects.factions) - region.approvalEffects.factions
        : stepTowards(
            region.approvalEffects[driver],
            settled[driver],
            balance.approval.adjustPermillePerQuarter,
          ),
    );
    // Each faction's part of that movement, adding up to it.
    const byFaction = splitAmong(
      drift.factions,
      mapFactions((faction) =>
        followed === null ? 0 : followed.now.parts[faction] - followed.was[faction],
      ),
    );
    const approvalEffects = mapDrivers(
      (driver) =>
        region.approvalEffects[driver] +
        drift[driver] +
        (driver === 'events' ? sum(landing.map((push) => push.permille)) : 0),
    );
    const approval = approvalFrom(approvalEffects, expectations.now);
    const unrest = unrestAt(approval);
    return {
      region: { ...region, approval, approvalEffects, unrest },
      was: region,
      drift,
      byFaction,
      landing,
      // What the limits took back from the sum of the movements.
      limited:
        approval -
        region.approval +
        raised -
        sum(
          APPROVAL_DRIVERS.map(
            (driver) => approvalEffects[driver] - region.approvalEffects[driver],
          ),
        ),
      settlesAt: approvalFrom(settled, expectations.now),
    };
  });
  const regions = moves.map((move) => move.region);

  // Each line is the movement in every region weighted by the people who live there.
  const weighted = (amount: (move: (typeof moves)[number]) => number) =>
    sum(moves.map((move) => move.region.population * amount(move)));
  const labels = [...new Set(pushes.map((push) => push.label))];
  const lines: Line[] = [
    ...APPROVAL_DRIVERS.map((driver) => ({
      label: driver === 'events' ? 'Earlier events fading' : APPROVAL_DRIVER_NAMES[driver],
      numerator: weighted((move) => move.drift[driver]),
      always: driver !== 'events',
      ...(driver === 'factions' && factions !== undefined
        ? {
            parts: CIVIL_FACTIONS.map((faction) => ({
              label: FACTION_NAMES[faction],
              numerator: weighted((move) => move.byFaction[faction]),
              // What moved the faction most, left out where its part comes to nothing.
              note: factions.movedBy?.[faction] ?? null,
            })),
          }
        : {}),
    })),
    ...labels.map((label) => ({
      label,
      numerator: weighted((move) =>
        sum(move.landing.filter((push) => push.label === label).map((push) => push.permille)),
      ),
      always: true,
    })),
    {
      label: raised > 0 ? 'Rising expectations' : 'Easing expectations',
      numerator: -raised * people,
      always: false,
    },
    { label: LIMIT_LABEL, numerator: weighted((move) => move.limited), always: false },
    {
      // Where people live changed, which moves the average even where no opinion did.
      label: 'Changes in population',
      numerator: Math.round(
        weightedApproval(after) - (weightedApproval(before) * people) / populationOf(before),
      ),
      always: false,
    },
  ];
  const value = nationalApproval(regions);
  const change = value - nationalApproval(before);
  const amounts = apportion(
    lines.map((entry) => entry.numerator),
    people,
    change,
  );

  return {
    regions,
    approval: {
      value,
      change,
      contributions: contributionsOf(lines, amounts, people),
    },
    heading: Math.floor(sum(moves.map((move) => move.region.population * move.settlesAt)) / people),
    entries: moves.flatMap((move) => unrestEntries(country, move.was, move.region)),
  };
}

/** National approval, in thousandths: the regions' approval averaged by population. */
export function nationalApproval(regions: readonly RegionState[]): number {
  const people = populationOf(regions);
  return people === 0 ? 0 : Math.floor(weightedApproval(regions) / people);
}

export function approvalStatus(situation: {
  readonly regions: readonly RegionState[];
  /**
   * The tier of prosperity in force and the one the game began in, whose difference sets how
   * far the public's expectations lower the baseline. Left out, they lower it not at all.
   */
  readonly tier?: Tier;
  readonly startingTier?: Tier;
  /**
   * The country and the factions' standings, which split the Factions line by faction. Left
   * out, the line stands whole.
   */
  readonly country?: Country;
  readonly factions?: FactionStandings;
}): ApprovalStatus {
  const { regions, tier, startingTier, country, factions } = situation;
  const expectations =
    tier === undefined || startingTier === undefined ? 0 : expectationsIn(tier, startingTier);
  const people = populationOf(regions);
  const approval = nationalApproval(regions);
  const { baselinePermille } = balance.approval;
  const weighted = (amount: (region: RegionState) => number) =>
    sum(regions.map((region) => region.population * amount(region)));
  // What each faction adds to the Factions effect in each region, adding up to it there.
  const byFaction =
    country === undefined || factions === undefined
      ? null
      : regions.map((region, index) =>
          splitAmong(
            region.approvalEffects.factions,
            factionsEffect(mixOf(country, region.id, index), levelsOf(factions)).parts,
          ),
        );
  const lines: Line[] = [
    ...APPROVAL_DRIVERS.map((driver) => ({
      label: APPROVAL_DRIVER_NAMES[driver],
      numerator: weighted((region) => region.approvalEffects[driver]),
      always: driver !== 'events',
      ...(driver === 'factions' && byFaction !== null && factions !== undefined
        ? {
            parts: CIVIL_FACTIONS.map((faction) => ({
              label: FACTION_NAMES[faction],
              numerator: sum(
                regions.map(
                  (region, index) => region.population * (byFaction[index]?.[faction] ?? 0),
                ),
              ),
              // How the faction stands is worth saying whatever it comes to here.
              note: `${FACTION_MOOD_NAMES[moodAt(factions[faction].standing)]}, at ${formatPercent(factions[faction].standing)}`,
              noteAlways: true,
            })),
          }
        : {}),
    })),
    {
      label: LIMIT_LABEL,
      numerator: weighted(
        (region) =>
          region.approval -
          baselinePermille +
          expectations -
          sum(Object.values(region.approvalEffects)),
      ),
      always: false,
    },
  ];
  const amounts =
    people === 0
      ? lines.map(() => 0)
      : apportion(
          lines.map((entry) => entry.numerator),
          people,
          approval - baselinePermille + expectations,
        );
  return {
    approval,
    strikesBelow: balance.unrest.strikes.belowPermille,
    protestsBelow: balance.unrest.protests.belowPermille,
    causes: [
      { label: 'Baseline', amount: people === 0 ? 0 : baselinePermille },
      ...(expectations === 0 || people === 0
        ? []
        : [{ label: 'Expectations', amount: -expectations }]),
      ...contributionsOf(lines, amounts, Math.max(1, people)),
    ],
    unrest: regions.flatMap((region): RegionUnrest[] =>
      region.unrest === 'calm' ? [] : [{ regionId: region.id, unrest: region.unrest }],
    ),
  };
}

/** What unrest leaves of a region's output, in thousandths. */
export function outputPermille(unrest: Unrest): number {
  return unrest === 'calm' ? 1000 : balance.unrest[unrest].outputPermille;
}

/** Unrest and what it does, in a few words: "Strikes · output −30%". Nothing when calm. */
export function describeUnrest(unrest: Unrest): string | null {
  return unrest === 'calm'
    ? null
    : `${UNREST_NAMES[unrest]} · output −${outputCutPercent(unrest)}%`;
}

/** The budget's part in approval: the tax rate and what it asks to spend. */
function toInputs(budget: {
  readonly taxRatePercent: number;
  readonly spending: Readonly<Record<SpendingArea, Money>>;
}): ApprovalInputs {
  return { taxRatePercent: budget.taxRatePercent, spent: budget.spending };
}

function mapDrivers(effect: (driver: ApprovalDriver) => number): ApprovalEffects {
  return Object.fromEntries(APPROVAL_DRIVERS.map((driver) => [driver, effect(driver)])) as Record<
    ApprovalDriver,
    number
  >;
}

/** One line of a breakdown before its share of the whole is worked out. */
interface Line {
  readonly label: string;
  /** The line's amount in every region, weighted by the people who live there. */
  readonly numerator: number;
  /** Whether the line is shown even when it comes to nothing. */
  readonly always: boolean;
  /** What the line is split into, on the same footing, adding up to it. */
  readonly parts?: readonly {
    readonly label: string;
    readonly numerator: number;
    /** A few words on what lies behind the part, or null for none. */
    readonly note: string | null;
    /** Whether the note is given even when the part comes to nothing. */
    readonly noteAlways?: boolean;
  }[];
}

/** The lines as the player reads them, each split into its parts where it has any. */
function contributionsOf(
  lines: readonly Line[],
  amounts: readonly number[],
  people: number,
): Contribution[] {
  return lines.flatMap((entry, index): Contribution[] => {
    const amount = amounts[index] ?? 0;
    if (!entry.always && amount === 0) return [];
    if (entry.parts === undefined) return [{ label: entry.label, amount }];
    const shares = apportion(
      entry.parts.map((part) => part.numerator),
      people,
      amount,
    );
    return [
      {
        label: entry.label,
        amount,
        parts: entry.parts.map((part, at) => ({
          label: part.label,
          amount: shares[at] ?? 0,
          ...(part.note === null || (part.noteAlways !== true && (shares[at] ?? 0) === 0)
            ? {}
            : { note: part.note }),
        })),
      },
    ];
  });
}

/**
 * A whole shared among the factions as nearly as their parts allow: the parts as they are
 * when they add up to it, and otherwise in proportion to them.
 */
function splitAmong(whole: number, parts: FactionLevels): FactionLevels {
  const total = sum(CIVIL_FACTIONS.map((faction) => parts[faction]));
  if (total === whole) return parts;
  if (total === 0) return mapFactions((_, index) => (index === 0 ? whole : 0));
  const shares = apportion(
    CIVIL_FACTIONS.map((faction) => parts[faction] * whole),
    total,
    whole,
  );
  return mapFactions((_, index) => shares[index] ?? 0);
}

/** Where each driver would settle its effect on a region if nothing changed again. */
function settledEffects(
  region: { readonly foodStage: FoodStage; readonly factions: number },
  inputs: ApprovalInputs,
  people: number,
): ApprovalEffects {
  const { food, tax } = balance.approval;
  return mapDrivers((driver) => {
    switch (driver) {
      case 'food':
        return food[region.foodStage];
      case 'factions':
        // Where the factions' standings are heading, weighted by the region's mix.
        return region.factions;
      case 'tax':
        return (tax.neutralPercent - inputs.taxRatePercent) * tax.permillePerPoint;
      case 'events':
        // A passing event fades to nothing.
        return 0;
      default:
        return serviceEffect(driver, inputs.spent[driver], people);
    }
  });
}

/**
 * Where spending on a public service settles approval. It is judged per head, so the same
 * data serves a country of any size: nothing spent settles the whole weight lower, double
 * what people expect or more settles the whole weight higher.
 */
function serviceEffect(service: Service, spent: Money, people: number): number {
  const { expectedPerMillionPeople, weightPermille } = balance.approval.services[service];
  const expected = expectedPerMillionPeople * people;
  if (expected === 0) return 0;
  const effect = Math.floor((weightPermille * (spent * 1_000_000 - expected)) / expected);
  return clamp(effect, -weightPermille, weightPermille);
}

function approvalFrom(effects: ApprovalEffects, expectations: number): number {
  return clamp(
    balance.approval.baselinePermille -
      expectations +
      sum(APPROVAL_DRIVERS.map((driver) => effects[driver])),
    LIMITS.min,
    LIMITS.max,
  );
}

function unrestAt(approval: number): Unrest {
  const { strikes, protests } = balance.unrest;
  if (approval < protests.belowPermille) return 'protests';
  return approval < strikes.belowPermille ? 'strikes' : 'calm';
}

function populationOf(regions: readonly RegionState[]): number {
  return sum(regions.map((region) => region.population));
}

function weightedApproval(regions: readonly RegionState[]): number {
  return sum(regions.map((region) => region.population * region.approval));
}

function outputCutPercent(unrest: Exclude<Unrest, 'calm'>): number {
  return percentOff(balance.unrest[unrest].outputPermille);
}

/** What the turn report says when a region's unrest begins, deepens, eases or ends. */
function unrestEntries(country: Country, was: RegionState, now: RegionState): ReportEntry[] {
  if (was.unrest === now.unrest) return [];
  const name = regionName(country, now.id);
  const stands = formatPercent(now.approval);
  const { strikes, protests } = balance.unrest;
  const begun = (unrest: Exclude<Unrest, 'calm'>): ReportEntry => ({
    kind: unrest === 'strikes' ? 'strike' : 'protest',
    seriousness: unrest === 'strikes' ? 'warning' : 'serious',
    headline: `${UNREST_NAMES[unrest]} in ${name}`,
    cause: `Approval there has fallen to ${stands}, below the ${formatPercent(balance.unrest[unrest].belowPermille, 0)} at which ${unrest} begin. While they last the region produces ${outputCutPercent(unrest)}% less.`,
    regionId: now.id,
  });
  if (now.unrest === 'protests') return [begun('protests')];
  if (was.unrest === 'calm') return [begun('strikes')];

  const protestsOver: ReportEntry = {
    kind: 'protest',
    seriousness: 'notable',
    headline: `The protests in ${name} have ended`,
    cause:
      now.unrest === 'strikes'
        ? `Approval there has recovered to ${stands}. The strikes go on until it reaches ${formatPercent(strikes.belowPermille, 0)}.`
        : `Approval there has recovered to ${stands}, above the ${formatPercent(protests.belowPermille, 0)} at which protests begin.`,
    regionId: now.id,
  };
  const strikesOver: ReportEntry = {
    kind: 'strike',
    seriousness: 'notable',
    headline: `The strikes in ${name} have ended`,
    cause: `Approval there has recovered to ${stands}. The region is producing in full again.`,
    regionId: now.id,
  };
  return [
    ...(was.unrest === 'protests' ? [protestsOver] : []),
    ...(now.unrest === 'calm' ? [strikesOver] : []),
  ];
}
