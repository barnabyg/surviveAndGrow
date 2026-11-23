import { balance } from './balance';
import { dateOfQuarter, isHarvestQuarter, quarterNumber } from './calendar';
import type { Country } from './country';
import { debtName, maturityOf, paysAtMaturity, type Borrowing, type Debt } from './debt';
import {
  projectOnSite,
  siteOf,
  siteStateOf,
  type Project,
  type SiteProjectState,
} from './projects';
import { siteTerms } from './sites';
import type { Outcome } from './state';
import { termBounds, termOf } from './terms';
import type { GameDate, Money } from './types';

/** One quarter of the term, as the timeline shows it. */
export interface TermQuarter {
  /** Which quarter of the game it is, counting the first quarter of year 1 as quarter 1. */
  readonly number: number;
  readonly date: GameDate;
  /** The harvest comes in as this quarter ends. */
  readonly harvest: boolean;
  /** The election is held as this quarter ends. */
  readonly election: boolean;
  /** Whether the quarter is over, is the one being decided, or is still to come. */
  readonly when: 'past' | 'now' | 'ahead';
}

/** The whole term, quarter by quarter, up to and including the election quarter. */
export interface TermCalendar {
  /** Which term it is, counted from 1. */
  readonly term: number;
  readonly termQuarters: number;
  /** The term's first quarter and its last, the election quarter, counted like a quarter's number. */
  readonly first: number;
  readonly last: number;
  /** The quarter being decided, counted like a quarter's number. */
  readonly now: number;
  readonly quarters: readonly TermQuarter[];
}

/**
 * The term the game is in, or, once it is over, the term it ended in. A government that wins
 * the election moves on to the next term's calendar.
 */
export function termCalendar(game: {
  readonly date: GameDate;
  readonly outcome?: Outcome;
}): TermCalendar {
  const { termQuarters } = balance.election;
  const term = termOf(game);
  const { first, last } = termBounds(term);
  const now = quarterNumber(game.date);
  return {
    term,
    termQuarters,
    first,
    last,
    now,
    quarters: Array.from({ length: termQuarters }, (_, index): TermQuarter => {
      const number = first + index;
      const date = dateOfQuarter(number);
      return {
        number,
        date,
        harvest: isHarvestQuarter(date.quarter),
        election: number === last,
        when: number < now ? 'past' : number === now ? 'now' : 'ahead',
      };
    }),
  };
}

/**
 * When a site is built and when it comes into use, in quarters of the game counted from 1.
 * This is what tells the player whether an investment pays off before the election.
 */
export interface SiteSchedule {
  readonly siteId: string;
  /**
   * How the site stands. A site nothing has been built on yet is `planned`: its schedule
   * is drawn as if building began in the quarter being decided.
   */
  readonly state: 'planned' | SiteProjectState;
  /** The first quarter of building. */
  readonly begins: number;
  /**
   * The first quarter the site is in use. Until the site is built this supposes that every
   * instalment from now on is paid, so it slips by a quarter each time building pauses.
   */
  readonly opens: number;
  /**
   * How many quarters of the current term the site is in use for, the election quarter
   * included. It is 0 when the site would open only after the vote.
   */
  readonly inUseBeforeVote: number;
}

interface Building {
  readonly country: Country;
  readonly projects: readonly Project[];
  readonly date: GameDate;
}

/**
 * The schedule of one site as things stand: the one it kept if it is built, the one it is
 * on if it is being built, and the one it would have if building began this quarter.
 * @throws RangeError when the country has no such site.
 */
export function siteSchedule(game: Building, siteId: string): SiteSchedule {
  return scheduleOf(game, siteId, 0);
}

/**
 * The schedule of every project there is and of every one about to be started, in the order
 * they were started, given the sites whose instalment will go unpaid this quarter. Those
 * make no progress, so their opening slips by a quarter.
 */
export function scheduleAhead(
  game: Building,
  starts: readonly string[],
  paused: readonly string[],
): SiteSchedule[] {
  return [...game.projects.flatMap((project) => siteOf(project) ?? []), ...starts].map((siteId) =>
    scheduleOf(game, siteId, paused.includes(siteId) ? 1 : 0),
  );
}

function scheduleOf(game: Building, siteId: string, delay: number): SiteSchedule {
  const site = game.country.sites.find((candidate) => candidate.id === siteId);
  if (site === undefined) throw new RangeError(`There is no site "${siteId}".`);
  const project = projectOnSite(game.projects, siteId);
  const now = quarterNumber(game.date);
  const quartersLeft = siteTerms(site.type).buildQuarters - (project?.quartersPaid ?? 0);
  const opens =
    project?.opened == null ? now + quartersLeft + delay : quarterNumber(project.opened);
  const { first, last } = termBounds(termOf(game));
  return {
    siteId,
    state: project === undefined ? 'planned' : siteStateOf(project),
    begins: project === undefined ? now : quarterNumber(project.began),
    opens,
    inUseBeforeVote: Math.max(0, last - Math.max(opens, first) + 1),
  };
}

/** A bond's maturity, when its whole sum falls due, as the timeline marks it. */
export interface Maturity {
  /**
   * The bond: "Bond 2", or "Planned bond" for one to be issued as this quarter ends, numbered
   * "Planned bond 1", "Planned bond 2" when several are planned. No two marks share a name.
   */
  readonly name: string;
  /** The quarter it falls due in, counted like a quarter's number. */
  readonly quarter: number;
  readonly date: GameDate;
  /** The principal that falls due, besides the quarter's interest. */
  readonly due: Money;
  /** True for a bond still only planned this quarter. */
  readonly planned: boolean;
  /** True when it falls due after the vote that closes the current term. */
  readonly afterVote: boolean;
}

/**
 * The maturity of every bond owed and of every one planned for this quarter, in the order
 * they were issued, the planned last. A bond whose missed maturity has turned it into level
 * repayments has no maturity left to mark.
 */
export function bondMaturities(
  game: { readonly date: GameDate; readonly debts: readonly Debt[]; readonly outcome?: Outcome },
  planned: readonly Borrowing[],
): Maturity[] {
  const { last } = termBounds(termOf(game));
  const now = quarterNumber(game.date);
  const mark = (name: string, quarter: number, due: Money, isPlanned: boolean): Maturity => ({
    name,
    quarter,
    date: dateOfQuarter(quarter),
    due,
    planned: isPlanned,
    afterVote: quarter > last,
  });
  const bonds = planned.filter((each) => each.kind === 'bond');
  const plannedName = (index: number) =>
    bonds.length === 1 ? 'Planned bond' : `Planned bond ${index + 1}`;
  return [
    ...game.debts
      .filter(paysAtMaturity)
      .map((debt) =>
        mark(debtName(debt), quarterNumber(maturityOf(debt, game.date)), debt.owed, false),
      ),
    ...bonds.map((each, index) => mark(plannedName(index), now + each.quarters, each.amount, true)),
  ];
}
