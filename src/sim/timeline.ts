import { balance } from './balance';
import { dateOfQuarter, isHarvestQuarter, quarterNumber } from './calendar';
import type { Country } from './country';
import type { Project } from './projects';
import { siteTerms } from './sites';
import type { GameDate } from './types';
import type { ProjectStatus } from './vocabulary';

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
  readonly termQuarters: number;
  /** The quarter being decided, counted like a quarter's number. */
  readonly now: number;
  readonly quarters: readonly TermQuarter[];
}

export function termCalendar(game: { readonly date: GameDate }): TermCalendar {
  const { termQuarters } = balance.election;
  const now = quarterNumber(game.date);
  return {
    termQuarters,
    now,
    quarters: Array.from({ length: termQuarters }, (_, index): TermQuarter => {
      const number = index + 1;
      const date = dateOfQuarter(number);
      return {
        number,
        date,
        harvest: isHarvestQuarter(date.quarter),
        election: number === termQuarters,
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
  readonly state: 'planned' | ProjectStatus;
  /** The first quarter of building. */
  readonly begins: number;
  /**
   * The first quarter the site is in use. Until the site is built this supposes that every
   * instalment from now on is paid, so it slips by a quarter each time building pauses.
   */
  readonly opens: number;
  /**
   * How many quarters of the term the site is in use for, the election quarter included.
   * It is 0 when the site would open only after the vote.
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
  return [...game.projects.map((project) => project.siteId), ...starts].map((siteId) =>
    scheduleOf(game, siteId, paused.includes(siteId) ? 1 : 0),
  );
}

function scheduleOf(game: Building, siteId: string, delay: number): SiteSchedule {
  const site = game.country.sites.find((candidate) => candidate.id === siteId);
  if (site === undefined) throw new RangeError(`There is no site "${siteId}".`);
  const project = game.projects.find((candidate) => candidate.siteId === siteId);
  const now = quarterNumber(game.date);
  const quartersLeft = siteTerms(site.type).buildQuarters - (project?.quartersPaid ?? 0);
  const opens =
    project?.opened == null ? now + quartersLeft + delay : quarterNumber(project.opened);
  return {
    siteId,
    state: project?.status ?? 'planned',
    begins: project === undefined ? now : quarterNumber(project.began),
    opens,
    inUseBeforeVote: Math.max(0, balance.election.termQuarters - opens + 1),
  };
}
