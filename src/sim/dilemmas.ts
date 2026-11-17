import type { ApprovalPush } from './approval';
import { sum } from './arithmetic';
import { balance } from './balance';
import { quarterNumber } from './calendar';
import { regionName, type Country } from './country';
import { foodStatus, quarterlyNeed } from './food';
import type { ReportEntry } from './report';
import { drawAt } from './rng';
import type { GameState, RegionState } from './state';
import { termBounds, termOfQuarter } from './terms';
import { formatMoney, formatPoints, formatTonnes } from './text';
import type { Contribution, GameDate, Money, Quarter } from './types';
import { DILEMMA_TYPES, UNREST_LEVELS, type DilemmaPlace, type DilemmaType } from './vocabulary';

/**
 * What a dilemma is, as data: the story put to the player, the conditions under which it
 * can arise, and two or three options with their effects. How likely it is to arise is the
 * country file's business.
 */
export interface DilemmaDefinition {
  /** What its effects are filed under in the breakdowns: "Teachers’ pay". */
  readonly name: string;
  /** What is put to the player: "Teachers demand a pay rise". `{region}` stands for the place it concerns. */
  readonly title: string;
  /** The situation, in a few sentences, with `{region}` used the same way. */
  readonly story: string;
  readonly conditions: DilemmaConditions;
  readonly options: readonly DilemmaOptionDefinition[];
}

/** When a dilemma can arise. Every condition given must hold as the new quarter begins. */
export interface DilemmaConditions {
  /** The quarters of the year it can arise in. Left out, it can arise in any. */
  readonly inQuarters?: readonly Quarter[];
  /** How the national reserve must stand against its safe level. */
  readonly reserve?: 'belowSafe' | 'aboveSafe';
  /** The treasury must hold less than this, in Money units for each million people. */
  readonly treasuryBelowPerMillionPeople?: number;
  /**
   * The kind of place it concerns. It arises only where a region fits, and that region is
   * the one it is about. Left out, it concerns the whole country.
   */
  readonly place?: DilemmaPlace;
  /** It does not arise again until this many quarters after the last time. */
  readonly restQuarters: number;
}

export interface DilemmaOptionDefinition {
  readonly id: string;
  /** What the player is choosing to do: "Grant the rise". */
  readonly label: string;
  readonly effects: readonly DilemmaEffectRule[];
}

/**
 * What an option does, written so that the same data serves a country of any size. Money is
 * per million people; food is a share, in thousandths, of what the people concerned eat in
 * a quarter.
 */
export type DilemmaEffectRule =
  /** Money into the treasury, or out of it when negative, in Money units per million people. */
  | { readonly kind: 'treasury'; readonly perMillionPeople: number }
  /** Food into the national reserve, or out of it when negative: a share of what the country eats. */
  | { readonly kind: 'reserve'; readonly needPermille: number }
  /** Food moved from the national reserve to the region's own stock: a share of what the region eats. */
  | { readonly kind: 'regionGrain'; readonly needPermille: number }
  /** A push on approval that lands at once and then fades, in the region concerned or everywhere. */
  | { readonly kind: 'approval'; readonly permille: number; readonly where: 'nation' | 'region' };

/**
 * What an option does to this country, worked out when the dilemma arose. What the player
 * is told and what then happens are both read from these figures, so they cannot differ.
 */
export type DilemmaEffect =
  | { readonly kind: 'treasury'; readonly amount: Money }
  | { readonly kind: 'reserve'; readonly tonnes: number }
  | { readonly kind: 'regionGrain'; readonly tonnes: number }
  | { readonly kind: 'approval'; readonly permille: number; readonly regionId?: string };

/** A dilemma that has arisen and waits for the player's choice. */
export interface PendingDilemma {
  readonly type: DilemmaType;
  /** The region it concerns, or null when it concerns the whole country. */
  readonly regionId: string | null;
  readonly options: readonly {
    readonly id: string;
    readonly effects: readonly DilemmaEffect[];
  }[];
}

/** A dilemma the player has answered. */
export interface AnsweredDilemma {
  readonly type: DilemmaType;
  /** The quarter of the game it arose and was answered in, counting from 1. */
  readonly quarter: number;
  readonly regionId: string | null;
  readonly optionId: string;
}

/** A pending dilemma as the player reads it. */
export interface DilemmaView {
  readonly type: DilemmaType;
  readonly title: string;
  readonly story: string;
  /** The region it concerns, or null when it concerns the whole country. */
  readonly regionId: string | null;
  readonly options: readonly DilemmaOptionView[];
}

export interface DilemmaOptionView {
  readonly id: string;
  readonly label: string;
  /** What choosing it will do, one sentence for each effect. None means nothing changes. */
  readonly effects: readonly string[];
  /** Why it cannot be chosen as things stand, or null when it can. */
  readonly unavailable: string | null;
}

const definitions: Readonly<Record<DilemmaType, DilemmaDefinition>> = balance.dilemmas;

/** The dilemma waiting for the player's choice, in words, or null when there is none. */
export function pendingDilemma(
  game: Pick<GameState, 'country' | 'dilemma' | 'treasury' | 'foodReserve'>,
): DilemmaView | null {
  const { dilemma, country } = game;
  if (dilemma === null) return null;
  const definition = definitions[dilemma.type];
  return {
    type: dilemma.type,
    title: inPlace(definition.title, country, dilemma.regionId),
    story: inPlace(definition.story, country, dilemma.regionId),
    regionId: dilemma.regionId,
    options: dilemma.options.map((option) => ({
      id: option.id,
      label: labelOf(definition, option.id),
      effects: option.effects.map((effect) => describeEffect(country, effect)),
      unavailable: unavailable(game, option.effects),
    })),
  };
}

/**
 * What is wrong with the answer given to the pending dilemma, or null when the game allows
 * it. A quarter cannot be resolved while a dilemma is unanswered, though it can be previewed.
 */
export function choiceFault(
  game: Pick<GameState, 'country' | 'dilemma' | 'treasury' | 'foodReserve'>,
  choice: string | null,
  mustAnswer: boolean,
): string | null {
  const view = pendingDilemma(game);
  if (view === null) return choice === null ? null : 'There is no dilemma to answer.';
  if (choice === null) {
    return mustAnswer ? `“${view.title}” must be answered before the quarter can end.` : null;
  }
  const option = view.options.find((candidate) => candidate.id === choice);
  if (option === undefined) return `“${view.title}” has no option "${choice}".`;
  return option.unavailable === null
    ? null
    : `“${option.label}” cannot be chosen. ${option.unavailable}`;
}

/** What the answer to a dilemma does in the quarter it is given. */
export interface DilemmaOutcome {
  /** The treasury, the national reserve and the regions with the answer's effects applied. */
  readonly treasury: Money;
  readonly foodReserve: number;
  readonly regions: readonly RegionState[];
  /** What it did to the treasury and to the national reserve, for their breakdowns. */
  readonly money: readonly Contribution[];
  readonly food: readonly Contribution[];
  /** What it does to approval, which lands with the rest of the quarter's approval. */
  readonly pushes: readonly ApprovalPush[];
  readonly answered: readonly AnsweredDilemma[];
  readonly entries: readonly ReportEntry[];
}

/**
 * Applies the player's answer to the pending dilemma. Its effects come first in the
 * quarter: the money is there to be spent, and the food to be eaten, in the same quarter.
 * With no dilemma pending, or none answered, nothing changes.
 */
export function answerDilemma(
  state: Pick<GameState, 'country' | 'dilemma' | 'date' | 'treasury' | 'foodReserve' | 'regions'>,
  choice: string | null,
): DilemmaOutcome {
  const { country, dilemma } = state;
  const option = dilemma?.options.find((candidate) => candidate.id === choice);
  const unchanged = {
    treasury: state.treasury,
    foodReserve: state.foodReserve,
    regions: state.regions,
  };
  if (dilemma === null || option === undefined) {
    return { ...unchanged, money: [], food: [], pushes: [], answered: [], entries: [] };
  }
  const definition = definitions[dilemma.type];
  const paid = sum(
    option.effects.map((effect) => (effect.kind === 'treasury' ? effect.amount : 0)),
  );
  const stored = sum(
    option.effects.map((effect) => (effect.kind === 'reserve' ? effect.tonnes : 0)),
  );
  const sent = sum(
    option.effects.map((effect) => (effect.kind === 'regionGrain' ? effect.tonnes : 0)),
  );
  const told = option.effects.map((effect) => describeEffect(country, effect));
  return {
    treasury: state.treasury + paid,
    foodReserve: state.foodReserve + stored - sent,
    regions: state.regions.map((region) =>
      region.id === dilemma.regionId ? { ...region, foodStock: region.foodStock + sent } : region,
    ),
    money: paid === 0 ? [] : [{ label: definition.name, amount: paid }],
    food: [
      ...(stored === 0 ? [] : [{ label: definition.name, amount: stored }]),
      ...(sent === 0 || dilemma.regionId === null
        ? []
        : [
            {
              label: `${definition.name}: sent to ${regionName(country, dilemma.regionId)}`,
              amount: -sent,
              regionId: dilemma.regionId,
            },
          ]),
    ],
    pushes: option.effects.flatMap((effect): ApprovalPush[] =>
      effect.kind === 'approval'
        ? [
            {
              label: definition.name,
              permille: effect.permille,
              ...(effect.regionId === undefined ? {} : { regionId: effect.regionId }),
            },
          ]
        : [],
    ),
    answered: [
      {
        type: dilemma.type,
        quarter: quarterNumber(state.date),
        regionId: dilemma.regionId,
        optionId: option.id,
      },
    ],
    entries: [
      {
        kind: 'dilemma',
        seriousness: 'notable',
        headline: inPlace(definition.title, country, dilemma.regionId),
        cause: `You chose “${labelOf(definition, option.id)}”. ${told.length === 0 ? 'Nothing changed' : told.join('. ')}.`,
        ...(dilemma.regionId === null ? {} : { regionId: dilemma.regionId }),
      },
    ],
  };
}

/**
 * The rolls that decide which dilemma, if any, arises as the game moves into a quarter: one
 * number from 0 up to 1 for each kind, in the vocabulary's order. They depend on the seed
 * and the quarter alone, so the dilemmas a seed brings do not shift with anything else that
 * chance decides, and the weather a seed brings does not shift with them.
 */
export function rollDilemmas(seed: number, date: GameDate): number[] {
  return DILEMMA_TYPES.map((_type, index) => drawAt(seed, quarterNumber(date), index));
}

/** The position a dilemma arises from: the game as the new quarter begins. */
type Position = Pick<
  GameState,
  'country' | 'date' | 'treasury' | 'foodReserve' | 'regions' | 'events' | 'dilemmasAnswered'
>;

/**
 * The dilemma that arises as the new quarter begins, or null. One arises when its roll
 * falls under the chance the country file gives it and its conditions hold. If more than
 * one could, the one whose roll fell lowest does.
 */
export function ariseDilemma(position: Position, rolls: readonly number[]): PendingDilemma | null {
  const { earliestQuarter, quartersClearBeforeElection } = balance.dilemmaRules;
  const quarter = quarterNumber(position.date);
  // Every term ends clear of them, so none waits on a government that may not survive the vote.
  const { last } = termBounds(termOfQuarter(quarter));
  if (quarter < earliestQuarter || quarter > last - quartersClearBeforeElection) return null;

  const arising = DILEMMA_TYPES.flatMap((type, index) => {
    const roll = rolls[index] ?? 1;
    if (roll >= position.country.dilemmaLikelihood[type]) return [];
    const place = placeFor(position, definitions[type].conditions, type);
    return place === undefined ? [] : [{ type, roll, regionId: place }];
  }).sort((a, b) => a.roll - b.roll)[0];
  if (arising === undefined) return null;

  const { type, regionId } = arising;
  return {
    type,
    regionId,
    options: definitions[type].options.map((option) => ({
      id: option.id,
      effects: option.effects.flatMap((rule) => workOut(position, rule, regionId)),
    })),
  };
}

/**
 * Where a dilemma would arise: null for the whole country, a region's id for a place, or
 * undefined when its conditions do not hold and it cannot arise at all.
 */
function placeFor(
  position: Position,
  conditions: DilemmaConditions,
  type: DilemmaType,
): string | null | undefined {
  const { date, regions, treasury, dilemmasAnswered } = position;
  const quarter = quarterNumber(date);
  if (conditions.inQuarters !== undefined && !conditions.inQuarters.includes(date.quarter)) {
    return undefined;
  }
  const lastTime = dilemmasAnswered.findLast((answered) => answered.type === type);
  if (lastTime !== undefined && quarter - lastTime.quarter < conditions.restQuarters) {
    return undefined;
  }
  if (conditions.reserve !== undefined) {
    const below = foodStatus(position).belowSafeLevel;
    if (below !== (conditions.reserve === 'belowSafe')) return undefined;
  }
  if (conditions.treasuryBelowPerMillionPeople !== undefined) {
    const people = sum(regions.map((region) => region.population));
    if (treasury * 1_000_000 >= conditions.treasuryBelowPerMillionPeople * people) return undefined;
  }
  if (conditions.place === undefined) return null;
  return regionThatIs(position, conditions.place)?.id;
}

/** The region a dilemma about a kind of place concerns, chosen by rule and never by name. */
function regionThatIs(position: Position, place: DilemmaPlace): RegionState | undefined {
  const { regions, events } = position;
  switch (place) {
    case 'struckByEvent':
      // The first region, in the country file's order, that an event now holds.
      return regions.find((region) => events.some((event) => event.regionId === region.id));
    case 'inUnrest': {
      // The region whose unrest has gone furthest, and among equals the least approving.
      const level = (region: RegionState) => UNREST_LEVELS.indexOf(region.unrest);
      return regions
        .filter((region) => region.unrest !== 'calm')
        .sort((a, b) => level(b) - level(a) || a.approval - b.approval)[0];
    }
  }
}

/** What a rule comes to in this country. An effect that comes to nothing is left out. */
function workOut(
  position: Position,
  rule: DilemmaEffectRule,
  regionId: string | null,
): DilemmaEffect[] {
  const { regions } = position;
  const region = regions.find((candidate) => candidate.id === regionId);
  switch (rule.kind) {
    case 'treasury': {
      const people = sum(regions.map((candidate) => candidate.population));
      const amount = Math.round((rule.perMillionPeople * people) / 1_000_000);
      return amount === 0 ? [] : [{ kind: 'treasury', amount }];
    }
    case 'reserve': {
      const need = sum(regions.map((candidate) => quarterlyNeed(candidate.population)));
      const tonnes = Math.round((need * rule.needPermille) / 1000);
      return tonnes === 0 ? [] : [{ kind: 'reserve', tonnes }];
    }
    case 'regionGrain': {
      if (region === undefined) return [];
      const tonnes = Math.round((quarterlyNeed(region.population) * rule.needPermille) / 1000);
      return tonnes <= 0 ? [] : [{ kind: 'regionGrain', tonnes }];
    }
    case 'approval':
      if (rule.where === 'nation') return [{ kind: 'approval', permille: rule.permille }];
      return region === undefined
        ? []
        : [{ kind: 'approval', permille: rule.permille, regionId: region.id }];
  }
}

/** Why an option cannot be chosen: the treasury or the reserve does not hold what it takes. */
function unavailable(
  game: Pick<GameState, 'treasury' | 'foodReserve'>,
  effects: readonly DilemmaEffect[],
): string | null {
  const cost = -sum(effects.map((effect) => (effect.kind === 'treasury' ? effect.amount : 0)));
  if (cost > game.treasury) return `The treasury holds only ${formatMoney(game.treasury)}.`;
  const food = sum(
    effects.map((effect) =>
      effect.kind === 'reserve'
        ? -effect.tonnes
        : effect.kind === 'regionGrain'
          ? effect.tonnes
          : 0,
    ),
  );
  return food > game.foodReserve
    ? `The national reserve holds only ${formatTonnes(game.foodReserve)}.`
    : null;
}

/** The ids of the options a dilemma of one type puts to the player. */
export function optionIdsOf(type: DilemmaType): readonly string[] {
  return definitions[type].options.map((option) => option.id);
}

/** One effect in words, without a full stop: "Costs $4.2m". */
function describeEffect(country: Country, effect: DilemmaEffect): string {
  switch (effect.kind) {
    case 'treasury':
      return effect.amount < 0
        ? `Costs ${formatMoney(-effect.amount)}`
        : `Brings in ${formatMoney(effect.amount)}`;
    case 'reserve':
      return effect.tonnes < 0
        ? `Takes ${formatTonnes(-effect.tonnes)} from the national reserve`
        : `Adds ${formatTonnes(effect.tonnes)} to the national reserve`;
    case 'regionGrain':
      return `Moves ${formatTonnes(effect.tonnes)} from the national reserve to the region’s own stock`;
    case 'approval': {
      const where =
        effect.regionId === undefined
          ? 'across the country'
          : `in ${regionName(country, effect.regionId)}`;
      return `Approval ${where} ${effect.permille < 0 ? 'falls' : 'rises'} by ${formatPoints(Math.abs(effect.permille))} at once, and the effect then fades`;
    }
  }
}

/** A title or story with `{region}` filled in by the name of the place it concerns. */
function inPlace(text: string, country: Country, regionId: string | null): string {
  return regionId === null ? text : text.replaceAll('{region}', regionName(country, regionId));
}

function labelOf(definition: DilemmaDefinition, optionId: string): string {
  return definition.options.find((option) => option.id === optionId)?.label ?? optionId;
}
