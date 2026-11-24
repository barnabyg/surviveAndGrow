import { withinAusterity, type Austerity } from './austerity';
import { fitBudget, type Budget } from './budget';
import { CountryFileError, loadCountry, type Country } from './country';
import {
  optionIdsOf,
  type AnsweredDilemma,
  type DilemmaEffect,
  type PendingDilemma,
} from './dilemmas';
import type { Credit } from './credit';
import type { Debt } from './debt';
import { depositIn, withFinds } from './deposits';
import type { ActiveEvent } from './events';
import type { FactionLevels, FactionStandings } from './factions';
import type { Harvest } from './food';
import type { VitalSigns } from './history';
import { MIGRATIONS, SAVE_FORMAT_VERSION, toCurrentFormat, type SaveMigration } from './migrations';
import type { PriceShock } from './priceShocks';
import type { BorderIncident } from './borderIncidents';
import {
  projectTerms,
  siteOf,
  standsAs,
  targetKey,
  type Project,
  type ProjectTarget,
} from './projects';
import type { ReportEntry } from './report';
import { knownTechnologies, technologyOf } from './technology';
import type { RngState } from './rng';
import { technologiesNeeded } from './sites';
import {
  damaged,
  date,
  fail,
  isRecord,
  list,
  oneOf,
  record,
  SaveError,
  text,
  whole,
  type Json,
} from './saveChecks';
import type { ElectionResult, GameState, Outcome, RegionState, TurnReport } from './state';
import { formatQuarters } from './text';
import type { WorldPrices } from './trade';
import type { RouteCarriage } from './tradeRoutes';
import type { Contribution, Figure, Money } from './types';
import {
  APPROVAL_DRIVERS,
  CIVIL_FACTIONS,
  CREDIT_RATINGS,
  DEBT_KINDS,
  DEBT_SCHEDULES,
  DILEMMA_EFFECT_KINDS,
  DILEMMA_TYPES,
  ENDING_CAUSES,
  EVENT_TYPES,
  FACTION_LEVERS,
  FOOD_STAGES,
  GOODS,
  LOYALTY_DRIVERS,
  OUTCOME_STATUSES,
  PRICE_SHOCK_TYPES,
  PROJECT_STATUSES,
  PROJECT_TARGET_KINDS,
  PROJECT_TARGET_WORDS,
  REPORT_KINDS,
  SERIOUSNESS_LEVELS,
  SITE_CHAIN_ROLES,
  SPENDING_AREAS,
  TECHNOLOGIES,
  TECHNOLOGY_DEFINITIONS,
  TIERS,
  UNREST_LEVELS,
  type ApprovalDriver,
  type CivilFaction,
  type LoyaltyDriver,
  type SpendingArea,
} from './vocabulary';

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
      debts: game.debts,
      credit: game.credit,
      worldPrices: game.worldPrices,
      priceShocks: game.priceShocks,
      tradeCarried: game.tradeCarried,
      history: game.history,
      dilemma: game.dilemma,
      dilemmasAnswered: game.dilemmasAnswered,
      tier: game.tier,
      startingTier: game.startingTier,
      prosperousQuarters: game.prosperousQuarters,
      plottingQuarters: game.plottingQuarters,
      deterrence: game.deterrence,
      factions: game.factions,
      borderIncidents: game.borderIncidents,
      austerity: game.austerity,
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
  const state = record(current.state, 'state');

  const fileCountry = readCountry(record(current.country, 'country'));
  const seed = whole(current.seed, 'seed');
  const projects = readProjects(state.projects, 'state.projects', fileCountry);
  // The deposits found so far are on the map: the seed and the surveys finished say which.
  const country = withFinds(fileCountry, projects, seed);
  const unfound = projects.flatMap((project) => {
    const siteId = siteOf(project);
    return siteId === null || country.sites.some((site) => site.id === siteId) ? [] : [siteId];
  });
  if (unfound.length > 0) {
    fail(
      'state.projects',
      `builds on ${unfound[0] ?? ''}, a site of a deposit no survey has found`,
    );
  }
  const regionIds = country.regions.map((region) => region.id);
  const region = (value: unknown, path: string) => oneOf(value, path, regionIds, 'a region');
  const regionOrNone = (value: unknown, path: string) =>
    value === null ? null : region(value, path);

  const game: GameState = {
    country,
    seed,
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
    projects,
    debts: readDebts(state.debts, 'state.debts'),
    credit: readCredit(record(state.credit, 'state.credit'), 'state.credit'),
    worldPrices: readWorldPrices(
      record(state.worldPrices, 'state.worldPrices'),
      'state.worldPrices',
    ),
    priceShocks: readPriceShocks(state.priceShocks, 'state.priceShocks'),
    tradeCarried: readTradeCarried(state.tradeCarried, 'state.tradeCarried', country),
    history: readHistory(state.history, 'state.history'),
    dilemma:
      state.dilemma === null
        ? null
        : readDilemma(record(state.dilemma, 'state.dilemma'), 'state.dilemma', regionOrNone),
    dilemmasAnswered: list(
      state.dilemmasAnswered,
      'state.dilemmasAnswered',
      (item, path): AnsweredDilemma => {
        const type = oneOf(item.type, `${path}.type`, DILEMMA_TYPES, 'a dilemma');
        return {
          type,
          quarter: whole(item.quarter, `${path}.quarter`, 1),
          regionId: regionOrNone(item.regionId, `${path}.regionId`),
          optionId: optionOf(type, item.optionId, `${path}.optionId`),
        };
      },
    ),
    tier: oneOf(state.tier, 'state.tier', TIERS, 'a tier of prosperity'),
    startingTier: oneOf(state.startingTier, 'state.startingTier', TIERS, 'a tier of prosperity'),
    prosperousQuarters: whole(state.prosperousQuarters, 'state.prosperousQuarters', 0),
    plottingQuarters: whole(state.plottingQuarters, 'state.plottingQuarters', 0),
    deterrence: whole(state.deterrence, 'state.deterrence', 0, 1000),
    factions: readFactions(record(state.factions, 'state.factions'), 'state.factions'),
    borderIncidents: readBorderIncidents(state.borderIncidents, 'state.borderIncidents', country),
    austerity:
      state.austerity === null
        ? null
        : readAusterity(record(state.austerity, 'state.austerity'), 'state.austerity'),
    outcome: readOutcome(record(state.outcome, 'state.outcome'), 'state.outcome', region),
  };
  const report =
    current.report === null
      ? null
      : readReport(record(current.report, 'report'), region, (value, path) =>
          oneOf(
            value,
            path,
            country.map.neighbours.map((neighbour) => neighbour.id),
            'a neighbour',
          ),
        );
  // Austerity's limits are this release's, so the budget in force is brought within them too.
  return { game: { ...game, budget: withinAusterity(game, game.budget) }, report };
}

/** Austerity in force: at least the quarter being decided is left of it. */
function readAusterity(saved: Json, path: string): Austerity {
  return { quartersLeft: whole(saved.quartersLeft, `${path}.quartersLeft`, 1) };
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
  if (saved.formatVersion !== country.formatVersion) {
    fail('country.formatVersion', 'does not match the country the save carries');
  }
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
    const loyaltyEffects = record(item.armyLoyaltyEffects, `${itemPath}.armyLoyaltyEffects`);
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
      health: whole(item.health, `${itemPath}.health`, 0, 1000),
      education: whole(item.education, `${itemPath}.education`, 0, 1000),
      armyLoyalty: whole(item.armyLoyalty, `${itemPath}.armyLoyalty`, 0, 1000),
      armyLoyaltyEffects: Object.fromEntries(
        LOYALTY_DRIVERS.map((driver) => [
          driver,
          whole(loyaltyEffects[driver], `${itemPath}.armyLoyaltyEffects.${driver}`),
        ]),
      ) as Record<LoyaltyDriver, number>,
    };
  });
  const ids = regions.map((region) => region.id);
  if (ids.length !== regionIds.length || ids.some((id, index) => id !== regionIds[index])) {
    fail(path, 'does not hold the regions of the country the save carries, in its order');
  }
  return regions;
}

/**
 * The projects, each for something the country has, no two for the same thing, and none paid
 * for beyond the quarters it takes to finish. A project on a site is never known nor surveyed,
 * research never in use nor surveyed, and a survey only ever being done or surveyed. A site
 * may be one of a deposit's, found or not: which are found is for the seed to say. A survey is
 * of a region where the country hides a deposit. At most one technology is being researched,
 * and none is researched before its prerequisites are known.
 */
function readProjects(saved: unknown, path: string, country: Country): Project[] {
  // Every site the country has or hides: which of a deposit's are found is checked later.
  const every = {
    ...country,
    sites: [...country.sites, ...country.deposits.flatMap(({ mine, route }) => [mine, route])],
  };
  const projects = list(saved, path, (item, itemPath): Project => {
    const target = readTarget(
      record(item.target, `${itemPath}.target`),
      `${itemPath}.target`,
      every,
    );
    const quartersPaid = whole(item.quartersPaid, `${itemPath}.quartersPaid`, 0);
    const buildQuarters = projectTerms(every, target)?.buildQuarters ?? 0;
    if (quartersPaid > buildQuarters) {
      const { subject, toFinish } = PROJECT_TARGET_WORDS[target.kind];
      fail(
        `${itemPath}.quartersPaid`,
        `is ${quartersPaid}, but ${subject} takes ${formatQuarters(buildQuarters)} ${toFinish}`,
      );
    }
    const status = oneOf(
      item.status,
      `${itemPath}.status`,
      PROJECT_STATUSES,
      'a state of building',
    );
    if (!standsAs(target.kind, status))
      fail(`${itemPath}.status`, `is "${status}", which a ${target.kind} never is`);
    if (target.kind === 'survey' && depositIn(country, target.regionId) === null) {
      fail(`${itemPath}.target.regionId`, 'is a region where the country hides no deposit');
    }
    return {
      target,
      began: date(item.began, `${itemPath}.began`),
      quartersPaid,
      status,
      opened: item.opened === null ? null : date(item.opened, `${itemPath}.opened`),
    };
  });
  const targets = projects.map((project) => targetKey(project.target));
  if (new Set(targets).size !== projects.length) {
    fail(
      path,
      projects.some((project) => siteOf(project) === null)
        ? 'has two projects for the same thing'
        : 'builds on the same site twice',
    );
  }
  const research = projects.filter(
    (project) => technologyOf(project) !== null && project.status !== 'known',
  );
  if (research.length > 1) fail(path, 'researches more than one technology at a time');
  const known = knownTechnologies(projects);
  const early = projects.flatMap((project) => {
    const technology = technologyOf(project);
    return technology === null
      ? []
      : TECHNOLOGY_DEFINITIONS[technology].prerequisites.filter(
          (needed) => !known.includes(needed),
        );
  });
  if (early.length > 0) fail(path, `researches a technology before ${early[0] ?? ''} is known`);
  const locked = projects.flatMap((project) => {
    const site = every.sites.find((candidate) => candidate.id === siteOf(project));
    const needed = site === undefined ? [] : technologiesNeeded(site);
    const unknown = needed.find((technology) => !known.includes(technology));
    return site === undefined || unknown === undefined ? [] : [{ site, unknown }];
  });
  if (locked[0] !== undefined) {
    const { site, unknown } = locked[0];
    fail(path, `builds on ${site.id} before ${unknown} is known`);
  }
  return projects;
}

/**
 * What a project is for: a site the country has or hides in a deposit, a technology the
 * engine knows, or a region of the country.
 */
function readTarget(saved: Json, path: string, country: Country): ProjectTarget {
  const kind = oneOf(saved.kind, `${path}.kind`, PROJECT_TARGET_KINDS, 'a kind of project');
  if (kind === 'technology') {
    return {
      kind,
      technology: oneOf(saved.technology, `${path}.technology`, TECHNOLOGIES, 'a technology'),
    };
  }
  if (kind === 'survey') {
    const regionIds = country.regions.map((region) => region.id);
    return {
      kind,
      regionId: oneOf(saved.regionId, `${path}.regionId`, regionIds, 'a region'),
    };
  }
  const siteIds = country.sites.map((site) => site.id);
  return { kind, siteId: oneOf(saved.siteId, `${path}.siteId`, siteIds, 'a site') };
}

/**
 * The debts owed, each numbered apart from the others. A debt keeps the terms it was taken
 * on, so they are read as saved, not looked up on the menu as it now stands.
 */
function readDebts(saved: unknown, path: string): Debt[] {
  const debts = list(saved, path, (item, itemPath): Debt => {
    const termQuarters = whole(item.termQuarters, `${itemPath}.termQuarters`, 1);
    return {
      kind: oneOf(item.kind, `${itemPath}.kind`, DEBT_KINDS, 'a kind of debt'),
      number: whole(item.number, `${itemPath}.number`, 1),
      taken: date(item.taken, `${itemPath}.taken`),
      borrowed: whole(item.borrowed, `${itemPath}.borrowed`, 1),
      annualRateBasisPoints: whole(
        item.annualRateBasisPoints,
        `${itemPath}.annualRateBasisPoints`,
        0,
      ),
      termQuarters,
      owed: whole(item.owed, `${itemPath}.owed`, 1),
      repayment: whole(item.repayment, `${itemPath}.repayment`, 1),
      quartersLeft: whole(item.quartersLeft, `${itemPath}.quartersLeft`, 1, termQuarters),
      schedule: oneOf(
        item.schedule,
        `${itemPath}.schedule`,
        DEBT_SCHEDULES,
        'a repayment schedule',
      ),
    };
  });
  if (new Set(debts.map((debt) => debt.number)).size !== debts.length) {
    fail(path, 'numbers two debts the same');
  }
  return debts;
}

/** The credit rating in force and what it is reassessed from. */
function readCredit(saved: Json, path: string): Credit {
  return {
    rating: oneOf(saved.rating, `${path}.rating`, CREDIT_RATINGS, 'a credit rating'),
    record: whole(saved.record, `${path}.record`, 0),
    deficit: whole(saved.deficit, `${path}.deficit`, 0),
  };
}

/**
 * The path of each good's world price: at least the price now, each a whole number of dollars
 * a tonne of at least one. A price outside this release's limits is still read as saved, and
 * the next quarter's move brings it within them.
 */
function readWorldPrices(saved: Json, path: string): WorldPrices {
  return Object.fromEntries(
    GOODS.map((good) => {
      const pricePath = `${path}.${good}`;
      const prices = saved[good];
      if (!Array.isArray(prices) || prices.length === 0) {
        return fail(pricePath, 'is missing or does not hold the price now');
      }
      return [
        good,
        prices.map((price: unknown, index) => whole(price, `${pricePath}[${index}]`, 1)),
      ];
    }),
  ) as Record<string, readonly number[]> as WorldPrices;
}

/** The world price shocks announced and not yet ended, at most one of each kind. */
function readPriceShocks(saved: unknown, path: string): PriceShock[] {
  const shocks = list(saved, path, (item, itemPath): PriceShock => ({
    type: oneOf(item.type, `${itemPath}.type`, PRICE_SHOCK_TYPES, 'a world price shock'),
    announced: date(item.announced, `${itemPath}.announced`),
    begins: date(item.begins, `${itemPath}.begins`),
  }));
  if (new Set(shocks.map((shock) => shock.type)).size !== shocks.length) {
    fail(path, 'holds two shocks of one kind');
  }
  return shocks;
}

/**
 * The border incidents announced and not yet ended: each on the border of one of the
 * country's neighbours, and no neighbour with two.
 */
function readBorderIncidents(saved: unknown, path: string, country: Country): BorderIncident[] {
  const neighbourIds = country.map.neighbours.map((neighbour) => neighbour.id);
  const incidents = list(saved, path, (item, itemPath): BorderIncident => ({
    neighbourId: oneOf(item.neighbourId, `${itemPath}.neighbourId`, neighbourIds, 'a neighbour'),
    announced: date(item.announced, `${itemPath}.announced`),
    begins: date(item.begins, `${itemPath}.begins`),
  }));
  if (new Set(incidents.map((incident) => incident.neighbourId)).size !== incidents.length) {
    fail(path, 'holds two incidents on one neighbour’s border');
  }
  return incidents;
}

/**
 * What each trade link carried in the quarter last played: each a crossing or a port of the
 * country, listed once, with whole tonnes of ore and grain.
 */
function readTradeCarried(saved: unknown, path: string, country: Country): RouteCarriage[] {
  const links = new Set([
    ...country.crossings.map((crossing) => crossing.id),
    ...country.sites
      .filter((site) => SITE_CHAIN_ROLES[site.type] === 'outlet')
      .map((site) => site.id),
  ]);
  const carried = list(saved, path, (item, itemPath): RouteCarriage => {
    const routeId = text(item.routeId, `${itemPath}.routeId`);
    if (!links.has(routeId))
      fail(`${itemPath}.routeId`, `is "${routeId}", which is not a trade link`);
    return {
      routeId,
      ore: whole(item.ore, `${itemPath}.ore`, 0),
      grain: whole(item.grain, `${itemPath}.grain`, 0),
    };
  });
  if (new Set(carried.map((each) => each.routeId)).size !== carried.length) {
    fail(path, 'lists one trade link twice');
  }
  return carried;
}

/**
 * The standing of each civil faction with what each lever adds to it. Every lever the engine
 * knows is held for every faction, whichever of them the faction answers to in this release.
 */
function readFactions(saved: Json, path: string): FactionStandings {
  return Object.fromEntries(
    CIVIL_FACTIONS.map((faction) => {
      const at = `${path}.${faction}`;
      const held = record(saved[faction], at);
      const effects = record(held.effects, `${at}.effects`);
      return [
        faction,
        {
          standing: whole(held.standing, `${at}.standing`, 0, 1000),
          effects: Object.fromEntries(
            FACTION_LEVERS.map((lever) => [lever, whole(effects[lever], `${at}.effects.${lever}`)]),
          ),
        },
      ];
    }),
  ) as FactionStandings;
}

/** One figure for each civil faction, in thousandths. */
function readLevels(saved: Json, path: string): FactionLevels {
  return Object.fromEntries(
    CIVIL_FACTIONS.map((faction) => [
      faction,
      whole(saved[faction], `${path}.${faction}`, 0, 1000),
    ]),
  ) as FactionLevels;
}

function readHistory(saved: unknown, path: string): VitalSigns[] {
  const history = list(saved, path, (item, itemPath): VitalSigns => ({
    date: date(item.date, `${itemPath}.date`),
    treasury: whole(item.treasury, `${itemPath}.treasury`),
    foodReserve: whole(item.foodReserve, `${itemPath}.foodReserve`, 0),
    quarterlyConsumption: whole(item.quarterlyConsumption, `${itemPath}.quarterlyConsumption`, 0),
    approval: whole(item.approval, `${itemPath}.approval`, 0, 1000),
    prosperity:
      item.prosperity === null ? null : whole(item.prosperity, `${itemPath}.prosperity`, 0, 1000),
    armyLoyalty:
      item.armyLoyalty === null
        ? null
        : whole(item.armyLoyalty, `${itemPath}.armyLoyalty`, 0, 1000),
    standings:
      item.standings === null
        ? null
        : readLevels(record(item.standings, `${itemPath}.standings`), `${itemPath}.standings`),
    debt: whole(item.debt, `${itemPath}.debt`, 0),
    debtBurden: whole(item.debtBurden, `${itemPath}.debtBurden`, 0),
  }));
  if (history.length === 0) fail(path, 'must hold at least the opening position');
  return history;
}

/**
 * A dilemma waiting for its answer. Its options must be ones that dilemma has, each once,
 * and one that concerns no region cannot move grain to a region's own stock.
 */
function readDilemma(
  saved: Json,
  path: string,
  regionOrNone: (value: unknown, path: string) => string | null,
): PendingDilemma {
  const type = oneOf(saved.type, `${path}.type`, DILEMMA_TYPES, 'a dilemma');
  const regionId = regionOrNone(saved.regionId, `${path}.regionId`);
  const options = list(saved.options, `${path}.options`, (option, optionPath) => ({
    id: optionOf(type, option.id, `${optionPath}.id`),
    effects: list(option.effects, `${optionPath}.effects`, (effect, effectPath) => {
      const read = readEffect(effect, effectPath, regionOrNone);
      if (read.kind === 'regionGrain' && regionId === null) {
        fail(effectPath, 'moves grain to a region, but the dilemma concerns no region');
      }
      return read;
    }),
  }));
  if (new Set(options.map((option) => option.id)).size !== options.length) {
    fail(`${path}.options`, 'offers the same option twice');
  }
  return { type, regionId, options };
}

/** The id of an option, which must be one that a dilemma of the type puts to the player. */
function optionOf(type: PendingDilemma['type'], value: unknown, path: string): string {
  const id = text(value, path);
  if (!optionIdsOf(type).includes(id)) {
    fail(path, `is "${id}", which is not an option this dilemma has`);
  }
  return id;
}

function readEffect(
  saved: Json,
  path: string,
  regionOrNone: (value: unknown, path: string) => string | null,
): DilemmaEffect {
  const kind = oneOf(
    saved.kind,
    `${path}.kind`,
    DILEMMA_EFFECT_KINDS satisfies readonly DilemmaEffect['kind'][],
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
    OUTCOME_STATUSES satisfies readonly Outcome['status'][],
    'an outcome',
  );
  if (status === 'playing') return { status };
  const ending = {
    headline: text(saved.headline, `${path}.headline`),
    summary: text(saved.summary, `${path}.summary`),
  };
  const cause = oneOf(saved.cause, `${path}.cause`, ENDING_CAUSES, 'a way to end');
  if (cause === 'prosperity') {
    if (status !== 'won') fail(`${path}.status`, 'must be a win when the cause is prosperity');
    return { ...ending, status, cause };
  }
  if (status !== 'lost') fail(`${path}.status`, `cannot be a win when the cause is ${cause}`);
  if (cause === 'coup') {
    return {
      ...ending,
      status,
      cause,
      loyalty: whole(saved.loyalty, `${path}.loyalty`, 0, 1000),
      quarters: whole(saved.quarters, `${path}.quarters`, 0),
    };
  }
  if (cause === 'election') {
    return {
      ...ending,
      status,
      cause,
      voteShare: whole(saved.voteShare, `${path}.voteShare`, 0, 1000),
      needed: whole(saved.needed, `${path}.needed`, 0, 1000),
    };
  }
  return { ...ending, status, cause, regionId: region(saved.regionId, `${path}.regionId`) };
}

function readReport(
  saved: Json,
  region: (value: unknown, path: string) => string,
  neighbour: (value: unknown, path: string) => string,
): TurnReport {
  /** The region something belongs to, kept only where the save names one. */
  const place = (item: Json, path: string) =>
    item.regionId === undefined ? {} : { regionId: region(item.regionId, `${path}.regionId`) };
  const contribution = (line: Json, linePath: string): Contribution => ({
    label: text(line.label, `${linePath}.label`),
    amount: whole(line.amount, `${linePath}.amount`),
    ...place(line, linePath),
    // A line may be split into parts, and may carry a few words on what lies behind it.
    ...(line.parts === undefined
      ? {}
      : { parts: list(line.parts, `${linePath}.parts`, contribution) }),
    ...(line.note === undefined ? {} : { note: text(line.note, `${linePath}.note`) }),
  });
  const figure = (value: unknown, path: string): Figure => {
    const written = record(value, path);
    return {
      value: whole(written.value, `${path}.value`),
      change: whole(written.change, `${path}.change`),
      contributions: list(written.contributions, `${path}.contributions`, contribution),
    };
  };
  const standings = (value: unknown, path: string) => {
    const written = record(value, path);
    return Object.fromEntries(
      CIVIL_FACTIONS.map((faction) => [faction, figure(written[faction], `${path}.${faction}`)]),
    ) as Record<CivilFaction, Figure>;
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
  const election = (value: unknown, path: string): ElectionResult => {
    const written = record(value, path);
    if (typeof written.won !== 'boolean') fail(`${path}.won`, 'is missing or is not true or false');
    return {
      voteShare: whole(written.voteShare, `${path}.voteShare`, 0, 1000),
      needed: whole(written.needed, `${path}.needed`, 0, 1000),
      won: written.won,
    };
  };
  return {
    date: date(saved.date, 'report.date'),
    treasury: figure(saved.treasury, 'report.treasury'),
    food: figure(saved.food, 'report.food'),
    approval: figure(saved.approval, 'report.approval'),
    armyLoyalty:
      saved.armyLoyalty === null ? null : figure(saved.armyLoyalty, 'report.armyLoyalty'),
    deterrence: saved.deterrence === null ? null : figure(saved.deterrence, 'report.deterrence'),
    standings: saved.standings === null ? null : standings(saved.standings, 'report.standings'),
    debt: saved.debt === null ? null : figure(saved.debt, 'report.debt'),
    credit: saved.credit === null ? null : figure(saved.credit, 'report.credit'),
    prosperity: saved.prosperity === null ? null : figure(saved.prosperity, 'report.prosperity'),
    population: saved.population === null ? null : figure(saved.population, 'report.population'),
    harvest: saved.harvest === null ? null : harvest(saved.harvest, 'report.harvest'),
    election: saved.election === null ? null : election(saved.election, 'report.election'),
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
      ...(entry.neighbourId === undefined
        ? {}
        : { neighbourId: neighbour(entry.neighbourId, `${path}.neighbourId`) }),
    })),
  };
}
