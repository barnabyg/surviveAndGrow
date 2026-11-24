import { armyLoyaltyStatus } from './army';
import { balance } from './balance';
import { revenueOf, type Budget } from './budget';
import type { Country } from './country';
import { eventsLeave } from './events';
import {
  bestStanding,
  factionsEffect,
  levelsOf,
  mixOf,
  mixShares,
  moodAt,
  resolveFactions,
  settledStandings,
  standingCauses,
  type FactionInputs,
  type FactionLevels,
  type FactionStandings,
  type Homes,
} from './factions';
import { siteEffects, sitesInUse, type SiteEffects } from './projects';
import type { GameState, RegionState } from './state';
import type { Contribution, Money } from './types';
import { upkeepNeeded } from './upkeep';
import {
  ARMY_STAGE_NAMES,
  CIVIL_FACTIONS,
  FACTION_MOOD_NAMES,
  FACTION_NAMES,
  SITE_TYPE_DEFINITIONS,
  type ArmyStage,
  type CivilFaction,
  type Faction,
  type FactionMood,
  type SpendingArea,
} from './vocabulary';

/*
 * What a quarter is judged by for the factions, and what the interface is told of them. The
 * rules themselves are in `factions.ts`.
 */

/** How one faction stands. All figures are in thousandths. */
export interface FactionStatus {
  readonly faction: Faction;
  readonly name: string;
  /** Its standing: for the army, national army loyalty. */
  readonly standing: number;
  /** A civil faction's mood, and null for the army. */
  readonly mood: FactionMood | null;
  /** The army's stage, and null for a civil faction. */
  readonly stage: ArmyStage | null;
  /** The word for how it stands: the mood's name, or the stage's. */
  readonly word: string;
  /** Where it settles if the budget judged and the country stay as they are. */
  readonly settles: number;
  readonly settlesWord: string;
  /**
   * The highest a civil faction's levers could settle it, every one at its best, and null for
   * the army.
   */
  readonly best: number | null;
  /** What it rests at and what each thing that moves it adds, adding up to the standing. */
  readonly causes: readonly Contribution[];
}

/** How the four factions stand, the army last. */
export interface FactionsStatus {
  readonly standings: readonly FactionStatus[];
  /** A civil faction is pleased from this up. */
  readonly pleasedFrom: number;
  /** A civil faction is uneasy below this. */
  readonly uneasyBelow: number;
  /** A civil faction is angry below this. */
  readonly angryBelow: number;
}

/** What a civil faction's standing will be once a quarter is over, and where that is heading. */
export interface FactionOutlook {
  readonly faction: CivilFaction;
  readonly standing: number;
  readonly mood: FactionMood;
  /** Where it settles if the quarter's budget and the country stay as they are. */
  readonly heading: number;
  readonly headingMood: FactionMood;
}

/** A region's faction mix and what the factions do to its approval. */
export interface RegionFactions {
  readonly regionId: string;
  /** Each faction's share of the region's people, in thousandths. */
  readonly shares: FactionLevels;
  /** The Factions effect on the region's approval, in thousandths. */
  readonly effect: number;
  /** What each faction adds to that effect, adding up to it. */
  readonly parts: FactionLevels;
}

/** What judging the factions needs of the game. */
type Judged = Pick<
  GameState,
  | 'country'
  | 'regions'
  | 'projects'
  | 'events'
  | 'history'
  | 'worldPrices'
  | 'date'
  | 'borderIncidents'
>;

/** Where the factions' people live: each region's people and mix, in the regions' order. */
export function homesOf(country: Country, regions: readonly RegionState[]): Homes {
  return regions.map((region, index) => ({
    population: region.population,
    mix: mixOf(country, region.id, index),
  }));
}

/** How many large sites are in use: those that play a part in a chain or make power. */
export function worksInUse(building: Pick<GameState, 'country' | 'projects'>): number {
  return sitesInUse(building).filter(({ site }) => {
    const { chainRole, powerRole } = SITE_TYPE_DEFINITIONS[site.type];
    return chainRole !== null || powerRole === 'station';
  }).length;
}

/**
 * What the levers measure in a quarter that raises `revenue` at a tax rate and spends `spent`,
 * for the country as the quarter begins. The turn and the preview give what was really
 * raised and spent; `factionsStatus` supposes a budget spent in full.
 */
export function factionInputs(
  state: Judged,
  quarter: {
    readonly taxRatePercent: number;
    readonly spent: Readonly<Record<SpendingArea, Money>>;
    readonly revenue: Money;
  },
  sites: SiteEffects = siteEffects(state),
): FactionInputs {
  return {
    ...quarter,
    // The burden as the quarter began: the last record is the position now.
    debtBurden: state.history.at(-1)?.debtBurden ?? 0,
    works: worksInUse(state),
    harvestLeft: eventsLeave(state, sites),
  };
}

/** What a budget measures if it is spent in full: upkeep only as far as the sites need it. */
function inputsUnder(state: Judged, budget: Budget): FactionInputs {
  return factionInputs(state, {
    taxRatePercent: budget.taxRatePercent,
    spent: {
      ...budget.spending,
      upkeep: Math.min(budget.spending.upkeep, upkeepNeeded(state)),
    },
    revenue: revenueOf(state, budget),
  });
}

/**
 * The standings as a game opens: settled where the starting budget and the country as it
 * opens put them, so that nothing moves until something changes.
 */
export function startingStandings(opening: Judged & { readonly budget: Budget }): FactionStandings {
  return settledStandings(
    inputsUnder(opening, opening.budget),
    homesOf(opening.country, opening.regions),
  );
}

/**
 * How the four factions stand, and where the budget given, the one in force unless another
 * is, would settle each. The quarter's own reckoning (`resolveFactions`) reads the same sums.
 */
export function factionsStatus(
  state: Judged & Pick<GameState, 'budget' | 'factions'>,
  budget: Budget = state.budget,
): FactionsStatus {
  const { moods } = balance.factions;
  const { settles } = resolveFactions(
    state.factions,
    inputsUnder(state, budget),
    homesOf(state.country, state.regions),
  );
  const army = armyLoyaltyStatus(state, budget);
  return {
    standings: [
      ...CIVIL_FACTIONS.map((faction): FactionStatus => {
        const held = state.factions[faction];
        const mood = moodAt(held.standing);
        return {
          faction,
          name: FACTION_NAMES[faction],
          standing: held.standing,
          mood,
          stage: null,
          word: FACTION_MOOD_NAMES[mood],
          settles: settles[faction],
          settlesWord: FACTION_MOOD_NAMES[moodAt(settles[faction])],
          best: bestStanding(faction),
          causes: standingCauses(faction, held),
        };
      }),
      {
        faction: 'army',
        name: FACTION_NAMES.army,
        standing: army.loyalty,
        mood: null,
        stage: army.stage,
        word: ARMY_STAGE_NAMES[army.stage],
        settles: army.settles,
        settlesWord: ARMY_STAGE_NAMES[army.settlesStage],
        best: null,
        causes: army.causes,
      },
    ],
    pleasedFrom: moods.pleasedFromPermille,
    uneasyBelow: moods.uneasyBelowPermille,
    angryBelow: moods.angryBelowPermille,
  };
}

/** Each civil faction's standing after a quarter and where it is heading, for the preview. */
export function factionOutlooks(
  standings: FactionStandings,
  settles: FactionLevels,
): FactionOutlook[] {
  return CIVIL_FACTIONS.map((faction) => ({
    faction,
    standing: standings[faction].standing,
    mood: moodAt(standings[faction].standing),
    heading: settles[faction],
    headingMood: moodAt(settles[faction]),
  }));
}

/** A region's faction mix, and what the factions as they stand do to its approval. */
export function regionFactions(
  state: Pick<GameState, 'country' | 'regions' | 'factions'>,
  regionId: string,
): RegionFactions {
  const index = state.regions.findIndex((region) => region.id === regionId);
  const mix = mixOf(state.country, regionId, index);
  const { total, parts } = factionsEffect(mix, levelsOf(state.factions));
  return { regionId, shares: mixShares(mix), effect: total, parts };
}
