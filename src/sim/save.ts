import { fitBudget, type Budget } from './budget';
import { CountryFileError, loadCountry, type Country } from './country';
import type { AnsweredDilemma, DilemmaEffect, PendingDilemma } from './dilemmas';
import type { ActiveEvent } from './events';
import type { Harvest } from './food';
import type { VitalSigns } from './history';
import type { Project } from './projects';
import type { ReportEntry } from './report';
import type { RngState } from './rng';
import type { GameState, Outcome, RegionState, TurnReport } from './state';
import type { Contribution, Figure, GameDate, Money, Quarter } from './types';
import {
  APPROVAL_DRIVERS,
  DILEMMA_TYPES,
  EVENT_TYPES,
  FOOD_STAGES,
  PROJECT_STATUSES,
  REPORT_KINDS,
  SERIOUSNESS_LEVELS,
  SPENDING_AREAS,
  UNREST_LEVELS,
  type ApprovalDriver,
  type SpendingArea,
} from './vocabulary';

/**
 * The version of the save format this game writes. The format is a compatibility contract:
 * a later release must still load a save written in any earlier version. Changing what a
 * save holds means raising this number and adding a migration below, never editing in place.
 */
export const SAVE_FORMAT_VERSION = 1;

/** Everything about a game except what a save records beside it. */
export type SavedState = Omit<GameState, 'country' | 'seed' | 'rng'>;

/**
 * A game as it is stored. It is plain data that survives being written out as text, and it
 * is complete in itself: it carries the country the game was started on, so the game
 * resumes on that country whatever has since become of the file it came from.
 */
export interface SavedGame {
  /** The version of the save format this was written in. */
  readonly formatVersion: number;
  readonly country: {
    readonly id: string;
    /** The version of the country file format the country was written in. */
    readonly formatVersion: number;
    /** The country file itself, as its author wrote it. It is read again on loading. */
    readonly file: unknown;
  };
  /** The seed the game was started from. */
  readonly seed: number;
  /** The state of the random generator. */
  readonly rng: RngState;
  readonly state: SavedState;
  /**
   * The report on the quarter that ended just before the save was made, or null when none
   * has ended. It is kept so that a resumed player still sees what happened last quarter.
   */
  readonly report: TurnReport | null;
}

/** What a save gives back: the game, and the last quarter's report if there was one. */
export interface RestoredGame {
  readonly game: GameState;
  readonly report: TurnReport | null;
}

/** Thrown when a save is refused. Its message is written for the player. */
export class SaveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SaveError';
  }
}

type Json = Readonly<Record<string, unknown>>;

/** Lifts a save written in one format version to the version after it. */
export type SaveMigration = (older: Json) => Json;

/**
 * The migrations this release knows, each under the version it lifts a save from. A save
 * older than the current format is passed through them in turn until it is current. There
 * has only ever been one format, so there is nothing here yet.
 */
const MIGRATIONS: Readonly<Record<number, SaveMigration>> = {};

/**
 * Puts a game into the form it is stored in, with the report on the quarter just ended, or
 * null when the game has only begun.
 */
export function saveGame(game: GameState, report: TurnReport | null): SavedGame {
  return {
    formatVersion: SAVE_FORMAT_VERSION,
    country: {
      id: game.country.id,
      formatVersion: game.country.formatVersion,
      file: game.country.source,
    },
    seed: game.seed,
    rng: game.rng,
    state: {
      date: game.date,
      treasury: game.treasury,
      budget: game.budget,
      reliefRegionId: game.reliefRegionId,
      foodReserve: game.foodReserve,
      agricultureSpentThisYear: game.agricultureSpentThisYear,
      regions: game.regions,
      events: game.events,
      projects: game.projects,
      history: game.history,
      dilemma: game.dilemma,
      dilemmasAnswered: game.dilemmasAnswered,
      outcome: game.outcome,
    },
    report,
  };
}

/**
 * Restores a game, and the last report with it, from what was stored. Nothing in it is
 * trusted: every part is checked,
 * and a save written in an older format is first lifted to the current one. `migrations`
 * is the table of lifts to use, which is this release's own unless a test gives another.
 * @throws SaveError saying, in words for the player, why the save cannot be opened.
 */
export function loadSave(
  saved: unknown,
  migrations: Readonly<Record<number, SaveMigration>> = MIGRATIONS,
): RestoredGame {
  if (!isRecord(saved)) throw new SaveError(damaged('it is not a saved game'));
  const current = toCurrentFormat(saved, migrations);

  const country = readCountry(record(current.country, 'country'));
  const state = record(current.state, 'state');
  const regionIds = country.regions.map((region) => region.id);
  const region = (value: unknown, path: string) => oneOf(value, path, regionIds, 'a region');
  const regionOrNone = (value: unknown, path: string) =>
    value === null ? null : region(value, path);

  const game: GameState = {
    country,
    seed: whole(current.seed, 'seed'),
    rng: whole(current.rng, 'rng', 0, 2 ** 32 - 1),
    date: date(state.date, 'state.date'),
    treasury: whole(state.treasury, 'state.treasury'),
    budget: readBudget(record(state.budget, 'state.budget'), 'state.budget'),
    reliefRegionId: regionOrNone(state.reliefRegionId, 'state.reliefRegionId'),
    foodReserve: whole(state.foodReserve, 'state.foodReserve', 0),
    agricultureSpentThisYear: whole(
      state.agricultureSpentThisYear,
      'state.agricultureSpentThisYear',
      0,
    ),
    regions: readRegions(state.regions, 'state.regions', regionIds),
    events: list(state.events, 'state.events', (item, path): ActiveEvent => ({
      type: oneOf(item.type, `${path}.type`, EVENT_TYPES, 'an event'),
      regionId: region(item.regionId, `${path}.regionId`),
      began: date(item.began, `${path}.began`),
    })),
    projects: readProjects(state.projects, 'state.projects', country),
    history: readHistory(state.history, 'state.history'),
    dilemma:
      state.dilemma === null
        ? null
        : readDilemma(record(state.dilemma, 'state.dilemma'), 'state.dilemma', regionOrNone),
    dilemmasAnswered: list(
      state.dilemmasAnswered,
      'state.dilemmasAnswered',
      (item, path): AnsweredDilemma => ({
        type: oneOf(item.type, `${path}.type`, DILEMMA_TYPES, 'a dilemma'),
        quarter: whole(item.quarter, `${path}.quarter`, 1),
        regionId: regionOrNone(item.regionId, `${path}.regionId`),
        optionId: text(item.optionId, `${path}.optionId`),
      }),
    ),
    outcome: readOutcome(record(state.outcome, 'state.outcome'), 'state.outcome', region),
  };
  const report =
    current.report === null ? null : readReport(record(current.report, 'report'), region);
  return { game, report };
}

/** The save in the current format, lifted there one version at a time if it is older. */
function toCurrentFormat(saved: Json, migrations: Readonly<Record<number, SaveMigration>>): Json {
  const written = saved.formatVersion;
  if (typeof written !== 'number' || !Number.isInteger(written)) {
    throw new SaveError(damaged('it does not say which save format it was written in'));
  }
  if (written > SAVE_FORMAT_VERSION) {
    throw new SaveError(
      `The saved game was written by a newer release of the game (save format ${written}; this release reads format ${SAVE_FORMAT_VERSION}). Open it with that release.`,
    );
  }
  let current = saved;
  for (let version = written; version < SAVE_FORMAT_VERSION; version += 1) {
    const lift = migrations[version];
    if (lift === undefined) {
      throw new SaveError(
        `The saved game was written in save format ${written}, which this release cannot read.`,
      );
    }
    current = lift(current);
  }
  return current;
}

/** The country a save carries, read from its file by the same check as any country file. */
function readCountry(saved: Json): Country {
  let country: Country;
  try {
    country = loadCountry(saved.file);
  } catch (error) {
    if (!(error instanceof CountryFileError)) throw error;
    throw new SaveError(
      `The saved game’s country cannot be loaded, so the game cannot be opened. ${error.faults.join(' ')}`,
    );
  }
  if (saved.id !== country.id) fail('country.id', 'does not match the country the save carries');
  return country;
}

/**
 * The budget in force. It is brought inside the limits the game now sets, so that a save
 * written under other limits still opens on a budget the game allows.
 */
function readBudget(saved: Json, path: string): Budget {
  const spending = record(saved.spending, `${path}.spending`);
  return fitBudget({
    taxRatePercent: whole(saved.taxRatePercent, `${path}.taxRatePercent`),
    spending: Object.fromEntries(
      SPENDING_AREAS.map((area) => [area, whole(spending[area], `${path}.spending.${area}`, 0)]),
    ) as Record<SpendingArea, Money>,
  });
}

/** The regions' state, which must be the country's regions in the country's order. */
function readRegions(saved: unknown, path: string, regionIds: readonly string[]): RegionState[] {
  const regions = list(saved, path, (item, itemPath): RegionState => {
    const effects = record(item.approvalEffects, `${itemPath}.approvalEffects`);
    return {
      id: text(item.id, `${itemPath}.id`),
      population: whole(item.population, `${itemPath}.population`, 0),
      output: whole(item.output, `${itemPath}.output`, 0),
      foodStock: whole(item.foodStock, `${itemPath}.foodStock`, 0),
      weather: whole(item.weather, `${itemPath}.weather`),
      foodStage: oneOf(item.foodStage, `${itemPath}.foodStage`, FOOD_STAGES, 'a food stage'),
      famineQuarters: whole(item.famineQuarters, `${itemPath}.famineQuarters`, 0),
      approval: whole(item.approval, `${itemPath}.approval`, 0, 1000),
      approvalEffects: Object.fromEntries(
        APPROVAL_DRIVERS.map((driver) => [
          driver,
          whole(effects[driver], `${itemPath}.approvalEffects.${driver}`),
        ]),
      ) as Record<ApprovalDriver, number>,
      unrest: oneOf(item.unrest, `${itemPath}.unrest`, UNREST_LEVELS, 'a state of unrest'),
    };
  });
  const ids = regions.map((region) => region.id);
  if (ids.length !== regionIds.length || ids.some((id, index) => id !== regionIds[index])) {
    fail(path, 'does not hold the regions of the country the save carries, in its order');
  }
  return regions;
}

/** The projects, each on a site the country has and no two on the same one. */
function readProjects(saved: unknown, path: string, country: Country): Project[] {
  const siteIds = country.sites.map((site) => site.id);
  const projects = list(saved, path, (item, itemPath): Project => ({
    siteId: oneOf(item.siteId, `${itemPath}.siteId`, siteIds, 'a site'),
    began: date(item.began, `${itemPath}.began`),
    quartersPaid: whole(item.quartersPaid, `${itemPath}.quartersPaid`, 0),
    status: oneOf(item.status, `${itemPath}.status`, PROJECT_STATUSES, 'a state of building'),
    opened: item.opened === null ? null : date(item.opened, `${itemPath}.opened`),
  }));
  if (new Set(projects.map((project) => project.siteId)).size !== projects.length) {
    fail(path, 'builds on the same site twice');
  }
  return projects;
}

function readHistory(saved: unknown, path: string): VitalSigns[] {
  const history = list(saved, path, (item, itemPath): VitalSigns => ({
    date: date(item.date, `${itemPath}.date`),
    treasury: whole(item.treasury, `${itemPath}.treasury`),
    foodReserve: whole(item.foodReserve, `${itemPath}.foodReserve`, 0),
    quarterlyConsumption: whole(item.quarterlyConsumption, `${itemPath}.quarterlyConsumption`, 0),
    approval: whole(item.approval, `${itemPath}.approval`, 0, 1000),
  }));
  if (history.length === 0) fail(path, 'must hold at least the opening position');
  return history;
}

function readDilemma(
  saved: Json,
  path: string,
  regionOrNone: (value: unknown, path: string) => string | null,
): PendingDilemma {
  return {
    type: oneOf(saved.type, `${path}.type`, DILEMMA_TYPES, 'a dilemma'),
    regionId: regionOrNone(saved.regionId, `${path}.regionId`),
    options: list(saved.options, `${path}.options`, (option, optionPath) => ({
      id: text(option.id, `${optionPath}.id`),
      effects: list(option.effects, `${optionPath}.effects`, (effect, effectPath) =>
        readEffect(effect, effectPath, regionOrNone),
      ),
    })),
  };
}

function readEffect(
  saved: Json,
  path: string,
  regionOrNone: (value: unknown, path: string) => string | null,
): DilemmaEffect {
  const kind = oneOf(
    saved.kind,
    `${path}.kind`,
    ['treasury', 'reserve', 'regionGrain', 'approval'] satisfies DilemmaEffect['kind'][],
    'an effect',
  );
  switch (kind) {
    case 'treasury':
      return { kind, amount: whole(saved.amount, `${path}.amount`) };
    case 'reserve':
    case 'regionGrain':
      return { kind, tonnes: whole(saved.tonnes, `${path}.tonnes`) };
    case 'approval': {
      const permille = whole(saved.permille, `${path}.permille`);
      const regionId = regionOrNone(saved.regionId ?? null, `${path}.regionId`);
      return regionId === null ? { kind, permille } : { kind, permille, regionId };
    }
  }
}

function readOutcome(
  saved: Json,
  path: string,
  region: (value: unknown, path: string) => string,
): Outcome {
  const status = oneOf(
    saved.status,
    `${path}.status`,
    ['playing', 'won', 'lost'] satisfies Outcome['status'][],
    'an outcome',
  );
  if (status === 'playing') return { status };
  const ending = {
    headline: text(saved.headline, `${path}.headline`),
    summary: text(saved.summary, `${path}.summary`),
  };
  const cause = oneOf(saved.cause, `${path}.cause`, ['famine', 'election'], 'a way to end');
  if (cause === 'election') {
    return {
      ...ending,
      status,
      cause,
      voteShare: whole(saved.voteShare, `${path}.voteShare`, 0, 1000),
      needed: whole(saved.needed, `${path}.needed`, 0, 1000),
    };
  }
  if (status !== 'lost') fail(`${path}.status`, 'cannot be a win when the cause is famine');
  return { ...ending, status, cause, regionId: region(saved.regionId, `${path}.regionId`) };
}

function readReport(saved: Json, region: (value: unknown, path: string) => string): TurnReport {
  /** The region something belongs to, kept only where the save names one. */
  const place = (item: Json, path: string) =>
    item.regionId === undefined ? {} : { regionId: region(item.regionId, `${path}.regionId`) };
  const figure = (value: unknown, path: string): Figure => {
    const written = record(value, path);
    return {
      value: whole(written.value, `${path}.value`),
      change: whole(written.change, `${path}.change`),
      contributions: list(
        written.contributions,
        `${path}.contributions`,
        (line, linePath): Contribution => ({
          label: text(line.label, `${linePath}.label`),
          amount: whole(line.amount, `${linePath}.amount`),
          ...place(line, linePath),
        }),
      ),
    };
  };
  const harvest = (value: unknown, path: string): Harvest => {
    const written = record(value, path);
    return {
      total: whole(written.total, `${path}.total`, 0),
      regions: list(written.regions, `${path}.regions`, (item, itemPath) => ({
        regionId: region(item.regionId, `${itemPath}.regionId`),
        grown: whole(item.grown, `${itemPath}.grown`, 0),
        surplus: whole(item.surplus, `${itemPath}.surplus`, 0),
        lost: whole(item.lost, `${itemPath}.lost`, 0),
      })),
    };
  };
  return {
    date: date(saved.date, 'report.date'),
    treasury: figure(saved.treasury, 'report.treasury'),
    food: figure(saved.food, 'report.food'),
    approval: figure(saved.approval, 'report.approval'),
    harvest: saved.harvest === null ? null : harvest(saved.harvest, 'report.harvest'),
    entries: list(saved.entries, 'report.entries', (entry, path): ReportEntry => ({
      kind: oneOf(entry.kind, `${path}.kind`, REPORT_KINDS, 'a kind of report'),
      seriousness: oneOf(
        entry.seriousness,
        `${path}.seriousness`,
        SERIOUSNESS_LEVELS,
        'a seriousness',
      ),
      headline: text(entry.headline, `${path}.headline`),
      cause: text(entry.cause, `${path}.cause`),
      ...place(entry, path),
    })),
  };
}

function damaged(why: string): string {
  return `The saved game is damaged and cannot be opened: ${why}.`;
}

function fail(path: string, problem: string): never {
  throw new SaveError(damaged(`${path} ${problem}`));
}

function isRecord(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function record(value: unknown, path: string): Json {
  return isRecord(value) ? value : fail(path, 'is missing or is not an object');
}

function list<Item>(
  value: unknown,
  path: string,
  read: (item: Json, itemPath: string) => Item,
): Item[] {
  if (!Array.isArray(value)) return fail(path, 'is missing or is not a list');
  return value.map((item: unknown, index) => {
    const itemPath = `${path}[${index}]`;
    return read(record(item, itemPath), itemPath);
  });
}

/** A whole number, no smaller than `min` and no larger than `max` where they are given. */
function whole(value: unknown, path: string, min?: number, max?: number): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    return fail(path, 'is missing or is not a whole number');
  }
  if ((min !== undefined && value < min) || (max !== undefined && value > max)) {
    return fail(path, `is ${value}, which is out of range`);
  }
  return value;
}

function text(value: unknown, path: string): string {
  return typeof value === 'string' && value !== '' ? value : fail(path, 'is missing or is blank');
}

/** One of a closed list of words: the engine's vocabulary, or the ids the country has. */
function oneOf<Word extends string>(
  value: unknown,
  path: string,
  words: readonly Word[],
  kind: string,
): Word {
  const word = words.find((candidate) => candidate === value);
  if (word !== undefined) return word;
  return fail(
    path,
    typeof value === 'string' ? `is "${value}", which is not ${kind} this game has` : 'is missing',
  );
}

function date(value: unknown, path: string): GameDate {
  const saved = record(value, path);
  return {
    year: whole(saved.year, `${path}.year`, 1),
    quarter: whole(saved.quarter, `${path}.quarter`, 1, 4) as Quarter,
  };
}
