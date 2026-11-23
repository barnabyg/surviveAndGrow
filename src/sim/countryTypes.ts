/**
 * What a country file describes, once read and checked: the country, its regions, settlements,
 * sites, hidden deposits, border crossings and map. How a file is read into these is in
 * `country.ts` (`loadCountry`), `countrySites.ts` and `countryDeposits.ts`.
 */

import type { Budget } from './budget';
import type { StartingLoan } from './debt';
import type { Money, Range } from './types';
import type {
  DecorationKind,
  DilemmaType,
  EventType,
  LabelSide,
  PriceShockType,
  SettlementSize,
  SiteType,
  Technology,
  Terrain,
} from './vocabulary';

/** A position in the map frame: x from the left edge, y from the top edge. */
export type Point = readonly [x: number, y: number];

export interface Region {
  readonly id: string;
  readonly name: string;
  readonly terrain: Terrain;
  /** The outline of the region, as the corners of a closed shape. */
  readonly shape: readonly Point[];
  /** Where the region's name is written. */
  readonly label: Point;
  /** How many people live in the region when the game starts. */
  readonly population: number;
  /** What the region produces in a quarter when the game starts, before tax. */
  readonly output: Money;
  /** The region's farmland, in units of 1,000 hectares. */
  readonly farmland: number;
  /**
   * How fast the region's people grow in number, in ten-thousandths a quarter: the country
   * file's own rate for the region, or the game's.
   */
  readonly growthPerTenThousandPerQuarter: number;
  /** The chance, from 0 to 1, that each kind of event strikes the region in a year. */
  readonly eventLikelihood: Readonly<Record<EventType, number>>;
}

export interface Settlement {
  readonly id: string;
  readonly name: string;
  readonly regionId: string;
  readonly at: Point;
  readonly size: SettlementSize;
  /** Which side of the settlement its name is written on. */
  readonly labelSide: LabelSide;
}

export interface SiteDetails {
  readonly id: string;
  readonly type: SiteType;
  readonly name: string;
  /** The region the site belongs to, which is the region its effect falls on. */
  readonly regionId: string;
  /**
   * The ids of the other sites this one depends on, as the country file lists them. A site
   * with alternatives stands for whichever of them is chosen.
   */
  readonly dependsOn: readonly string[];
  /**
   * What the site produces in a quarter in good repair, counted as `balance.sites` counts a
   * capacity, when it is not its type's: only the mine of a deposit a survey has found has
   * one, the size the survey revealed.
   */
  readonly capacity?: Money;
  /**
   * The ids of the sites this one is an alternative to, in the country file's order. Building
   * on either rules the other out. The file may say so on either side or on both.
   */
  readonly alternatives: readonly string[];
  /**
   * The technology the country file says must be known before the site can be started, if it
   * says one. A type research unlocks needs its own as well (`technologiesNeeded`).
   */
  readonly needs?: Technology;
}

/**
 * Somewhere the country file allows something to be built. A site of one type stands in
 * one place; a site of another runs along a route, which may cross into other regions.
 */
export type Site = SiteDetails &
  (
    | { readonly form: 'place'; readonly at: Point }
    /** The line the route follows from one end to the other. */
    | { readonly form: 'route'; readonly route: readonly Point[] }
  );

export interface Neighbour {
  readonly id: string;
  readonly name: string;
  readonly shape: readonly Point[];
  readonly label: Point;
}

/**
 * A border crossing: a trade link to a neighbour, open from the start, that carries so many
 * tonnes across the border a quarter.
 */
export interface Crossing {
  readonly id: string;
  readonly name: string;
  /** The neighbour it leads to. */
  readonly neighbourId: string;
  /** What it carries across the border in a quarter, in tonnes. */
  readonly tonnes: number;
}

/**
 * A deposit of ore the country file hides: a mine and the trunk road that would carry its ore
 * towards a port, in a region. It is not on the map, and nothing can be built on it, until a
 * survey of its region finds it. Whether it is there, by its likelihood, and how large it is,
 * within its range, are drawn from the seed and the deposit (`deposits.ts`).
 */
export interface Deposit {
  readonly id: string;
  /** The region it lies in, which its mine stands in. A region holds at most one. */
  readonly regionId: string;
  /** The chance, above 0 and at most 1, that a survey of its region finds it there. */
  readonly likelihood: number;
  /** The least and the most ore its mine could produce a quarter, in tonnes. */
  readonly tonnes: Range;
  /** The mine, which depends on the route and on any of the country's sites it names. */
  readonly mine: Site;
  /** The trunk road that serves the mine, which depends on the country's sites it names. */
  readonly route: Site;
}

/** Sea is whatever the regions and neighbours leave uncovered. A sea entry only names it. */
export interface Sea {
  readonly name: string;
  readonly label: Point;
}

export interface River {
  readonly id: string;
  readonly name: string;
  /** The line the river follows, from source to mouth. */
  readonly course: readonly Point[];
}

export interface Decoration {
  readonly kind: DecorationKind;
  readonly at: Point;
}

/** A country, checked and ready to start a game from. The engine holds no country of its own. */
export interface Country {
  readonly formatVersion: number;
  readonly id: string;
  readonly name: string;
  readonly map: {
    readonly seas: readonly Sea[];
    readonly neighbours: readonly Neighbour[];
    readonly rivers: readonly River[];
    readonly decorations: readonly Decoration[];
  };
  readonly regions: readonly Region[];
  readonly settlements: readonly Settlement[];
  /**
   * Where things can be built, in the country file's order, and then the sites of each
   * deposit a survey has found, in the order the deposits are listed (`withFinds`).
   */
  readonly sites: readonly Site[];
  /** The deposits the file hides, found or not, in the file's order. */
  readonly deposits: readonly Deposit[];
  /** The border crossings, in the country file's order. */
  readonly crossings: readonly Crossing[];
  /**
   * The chance, from 0 to 1, that each dilemma arises as a quarter begins, when the
   * conditions it needs hold. One the file does not mention never arises.
   */
  readonly dilemmaLikelihood: Readonly<Record<DilemmaType, number>>;
  /**
   * The chance, from 0 to 1, that each world price shock is announced as a quarter begins,
   * unless one of its kind is already announced or in force. One the file does not mention
   * never comes.
   */
  readonly priceShockLikelihood: Readonly<Record<PriceShockType, number>>;
  readonly start: {
    readonly treasury: Money;
    /** The budget in force when the game starts. */
    readonly budget: Budget;
    /** The national food reserve when the game starts, in tonnes. */
    readonly foodReserve: number;
    /** The loans owed when the game starts, in the file's order: none unless it says. */
    readonly loans: readonly StartingLoan[];
  };
  /**
   * The country file this country was read from, as its author wrote it. A saved game
   * carries it, and reading it again gives this same country.
   */
  readonly source: unknown;
}

/** The name of a region, as reports and the interface write it. */
export function regionName(country: Country, regionId: string): string {
  return country.regions.find((region) => region.id === regionId)?.name ?? regionId;
}
