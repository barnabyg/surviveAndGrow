/**
 * The migrations that lift a save written in an older format to the current one. Raising the
 * save format means raising `SAVE_FORMAT_VERSION` here and adding the migration from the
 * version before it to `MIGRATIONS`; `loadSave` passes an old save through them in turn.
 */
import { balance } from './balance';
import { loadCountry } from './country';
import { ratingOfScore } from './credit';
import type { Project } from './projects';
import { prosperityStatus, settledServiceLevel } from './prosperity';
import { damaged, isRecord, SaveError, type Json } from './saveChecks';
import type { RegionState } from './state';
import { tierAt } from './tiers';
import { openingPrices } from './trade';
import type { Money } from './types';
import { upkeepForEvery } from './upkeep';
import { TIERS, type LastingService, type Tier } from './vocabulary';

/**
 * The version of the save format this game writes. The format is a compatibility contract:
 * a later release must still load a save written in any earlier version. Changing what a
 * save holds means raising this number and adding a migration below, never editing in place.
 */
export const SAVE_FORMAT_VERSION = 9;

/** Lifts a save written in one format version to the version after it. */
export type SaveMigration = (older: Json) => Json;

/**
 * The migrations this release knows, each under the version it lifts a save from. A save
 * older than the current format is passed through them in turn until it is current.
 */
export const MIGRATIONS: Readonly<Record<number, SaveMigration>> = {
  1: fromFormat1,
  2: fromFormat2,
  3: fromFormat3,
  4: fromFormat4,
  5: fromFormat5,
  6: fromFormat6,
  7: fromFormat7,
  8: fromFormat8,
};

/**
 * Format 2 added prosperity, its tiers and a growing population. Each region gains levels of
 * health and education, set where the budget in force would hold them, as a new game's are
 * set by its starting budget. The game is put in the tier its prosperity then reaches, and
 * counts as having begun there, so the public expects no more of it than before. The
 * quarters already recorded, and the last report, measured neither prosperity nor growth,
 * so they say so.
 */
function fromFormat1(older: Json): Json {
  const state = isRecord(older.state) ? older.state : {};
  const regions = Array.isArray(state.regions) ? (state.regions as unknown[]) : [];
  const budget = isRecord(state.budget) ? state.budget : {};
  const spending = isRecord(budget.spending) ? budget.spending : {};
  const people = regions.reduce<number>(
    (total, region) =>
      total + (isRecord(region) && typeof region.population === 'number' ? region.population : 0),
    0,
  );
  const level = (service: LastingService) => {
    const spent = spending[service];
    return typeof spent === 'number' ? settledServiceLevel(service, spent, people) : 0;
  };
  const lifted = regions.map((region) =>
    isRecord(region)
      ? { ...region, health: level('health'), education: level('education') }
      : region,
  );
  const tier = tierOfOldSave(older, lifted, state.projects);
  return {
    ...older,
    formatVersion: 2,
    state: {
      ...state,
      regions: lifted,
      tier,
      startingTier: tier,
      history: Array.isArray(state.history)
        ? (state.history as unknown[]).map((record) =>
            isRecord(record) ? { ...record, prosperity: null } : record,
          )
        : state.history,
    },
    report: isRecord(older.report)
      ? { ...older.report, prosperity: null, population: null }
      : older.report,
  };
}

/**
 * The tier an old save's game has reached, judged by the same rules as a game in play. A save
 * too damaged to judge is put in the lowest tier, and checking the rest of it will refuse it.
 */
function tierOfOldSave(older: Json, regions: readonly unknown[], projects: unknown): Tier {
  try {
    const carried = isRecord(older.country) ? older.country.file : undefined;
    const { value } = prosperityStatus({
      country: loadCountry(carried),
      regions: regions as RegionState[],
      projects: Array.isArray(projects) ? (projects as Project[]) : [],
      // Before format 7 there were no world prices: a mine earned what it earns at the usual
      // ore price.
      worldPrices: openingPrices(),
    });
    return Number.isFinite(value) ? tierAt(value) : TIERS[0];
  } catch {
    return TIERS[0];
  }
}

/**
 * Format 3 added terms of office and the win on prosperity. A won election no longer ends
 * the game: a game that format 2 ended that way plays on into its second term. The game also
 * counts the quarters it has held prosperity in the top tier. Format 2 kept no such count,
 * so it starts from nothing. The last report gains the election held in its quarter, which
 * format 2 kept only in a game that the election ended, and which is otherwise none.
 */
function fromFormat2(older: Json): Json {
  const state = isRecord(older.state) ? older.state : {};
  const { outcome } = state;
  const voted = isRecord(outcome) && outcome.cause === 'election';
  const reelected = voted && outcome.status === 'won';
  const election = voted
    ? { voteShare: outcome.voteShare, needed: outcome.needed, won: reelected }
    : null;
  return {
    ...older,
    formatVersion: 3,
    state: {
      ...state,
      prosperousQuarters: 0,
      outcome: reelected ? { status: 'playing' } : outcome,
    },
    report: isRecord(older.report) ? { ...older.report, election } : older.report,
  };
}

/**
 * Format 4 added upkeep: a spending area of its own, and sites that decay when it falls
 * short. A game written before it gains upkeep enough to keep every one of its country's
 * sites in good repair, the same as a new game on that country starts with, so that nothing
 * in it decays unless the player cuts it. Its sites are all in good repair.
 */
function fromFormat3(older: Json): Json {
  const state = isRecord(older.state) ? older.state : {};
  const budget = isRecord(state.budget) ? state.budget : {};
  const spending = isRecord(budget.spending) ? budget.spending : {};
  return {
    ...older,
    formatVersion: 4,
    state: {
      ...state,
      budget: { ...budget, spending: { ...spending, upkeep: upkeepForOldSave(older) } },
    },
  };
}

/**
 * Format 5 added borrowing: the debts owed, the debt and debt burden in each quarter
 * recorded, the credit rating, and the debt and credit score in the last report. Nothing
 * could be borrowed before it, so a game written in format 4 owes nothing and never has, and
 * starts with the payment record a new game has. The deficit its rating counts is the next
 * quarter's: until that ends it is taken as none. Its last report, written before debt and
 * credit were reported, has neither.
 *
 * The later finance features of the same release (the credit rating, bonds) extend this
 * migration rather than adding another: format 5 is not released until they are in. Each
 * debt says how it is repaid (`schedule`); a game from format 4 owes none, so there is
 * nothing to fill in.
 */
function fromFormat4(older: Json): Json {
  const state = isRecord(older.state) ? older.state : {};
  return {
    ...older,
    formatVersion: 5,
    state: {
      ...state,
      debts: [],
      credit: {
        rating: ratingOfScore(balance.finance.credit.startingRecord),
        record: balance.finance.credit.startingRecord,
        deficit: 0,
      },
      history: Array.isArray(state.history)
        ? (state.history as unknown[]).map((record) =>
            isRecord(record) ? { ...record, debt: 0, debtBurden: 0 } : record,
          )
        : state.history,
    },
    report: isRecord(older.report) ? { ...older.report, debt: null, credit: null } : older.report,
  };
}

/**
 * Format 6 added the bailout: a missed payment no longer adds what went unpaid to the debt,
 * but brings a bailout and austerity. A game written in format 5 is not in austerity. Its
 * debts are carried as they were, even one that a missed payment re-spread under the old
 * rule: they are still owed on those terms, and a payment missed from now on brings a
 * bailout. Its last report may hold a missed payment of the old kind, which is still a kind
 * the report knows.
 */
function fromFormat5(older: Json): Json {
  const state = isRecord(older.state) ? older.state : {};
  return { ...older, formatVersion: 6, state: { ...state, austerity: null } };
}

/**
 * Format 7 added trade: a world price for each good, which moves every quarter. A game written
 * in format 6 never saw one, so its path begins where a new game's does, at the usual price,
 * in the quarter it is opened in. Grain was the only good format 7 knew. Its last report has
 * nothing of trade in it.
 */
function fromFormat6(older: Json): Json {
  const state = isRecord(older.state) ? older.state : {};
  const grain = [balance.trade.goods.grain.usualDollarsPerTonne];
  return { ...older, formatVersion: 7, state: { ...state, worldPrices: { grain } } };
}

/**
 * Format 8 added ore to the goods: a mine's chain earns at the world ore price. A game written
 * in format 7 earned as if ore stood at its usual price, so the ore price's path begins there,
 * in the quarter it is opened in, and the game earns from it exactly what it earned before
 * until the price first moves. Its grain price is carried as it was.
 */
function fromFormat7(older: Json): Json {
  const state = isRecord(older.state) ? older.state : {};
  const prices = state.worldPrices;
  const ore = [balance.trade.goods.ore.usualDollarsPerTonne];
  return {
    ...older,
    formatVersion: 8,
    state: { ...state, worldPrices: isRecord(prices) ? { ...prices, ore } : prices },
  };
}

/**
 * Format 9 added world price shocks, announced ahead and in force for a set time, and what
 * each trade link carried in the quarter last played. A game written in format 8 has no shock
 * announced: its prices move as before until one is, and its country, of a file format that
 * cannot say how likely they are, never sees one. It did not keep what its links carried, so
 * it is read as having carried nothing.
 */
function fromFormat8(older: Json): Json {
  const state = isRecord(older.state) ? older.state : {};
  return { ...older, formatVersion: 9, state: { ...state, priceShocks: [], tradeCarried: [] } };
}

/**
 * Upkeep for every site of the country an old save carries. A save whose country will not
 * load is given none, and checking the rest of it will refuse it.
 */
function upkeepForOldSave(older: Json): Money {
  try {
    const carried = isRecord(older.country) ? older.country.file : undefined;
    return upkeepForEvery(loadCountry(carried).sites.map((site) => site.type));
  } catch {
    return 0;
  }
}

/** The save in the current format, lifted there one version at a time if it is older. */
export function toCurrentFormat(
  saved: Json,
  migrations: Readonly<Record<number, SaveMigration>>,
): Json {
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
