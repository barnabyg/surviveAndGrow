import {
  dateOfQuarter,
  formatMoney,
  siteTerms,
  termCalendar,
  type GameState,
  type SiteSchedule,
  type TermCalendar,
  type TermQuarter,
  formatQuarters,
} from '../sim';
import { formatDate } from './format';
import { opening } from './schedule';

interface TimelineProps {
  readonly game: GameState;
  /** When each project is built and in use, those planned for this quarter included. */
  readonly schedule: readonly SiteSchedule[];
  /**
   * The schedule an empty site picked out on the map would have if building began now, or
   * null when no such site is picked out.
   */
  readonly considered: SiteSchedule | null;
  /** The sites whose instalment the treasury will not cover this quarter. */
  readonly pausedSites: readonly string[];
  readonly onSelectSite: (siteId: string) => void;
}

/**
 * The whole of the current term under the map: every quarter to the election that closes it,
 * with the harvests and the vote marked, and each project as a bar followed by the quarters
 * it will be in use before the vote. A government that is re-elected moves on to the next
 * term's timeline. It is a table, so every mark is also read out in words.
 */
export function Timeline(props: TimelineProps) {
  const { game, schedule, considered, pausedSites, onSelectSite } = props;
  const calendar = termCalendar(game);
  const years = [...new Set(calendar.quarters.map((quarter) => quarter.date.year))];
  const rows = [
    ...schedule.map((entry) => ({ entry, supposed: false })),
    ...(considered === null ? [] : [{ entry: considered, supposed: true }]),
  ];

  return (
    <section className="timeline" aria-labelledby="timeline-title">
      <div className="timeline__head">
        <h2 className="section-title" id="timeline-title">
          This term
        </h2>
        <span className="section-note">
          Term {calendar.term} ·{' '}
          {calendar.now <= calendar.last
            ? `Quarter ${calendar.now - calendar.first + 1} of ${calendar.termQuarters}`
            : 'The term is over'}{' '}
          · An underlined quarter brings in the harvest · Hatched quarters are over
        </span>
      </div>
      <table className="timeline__table">
        <colgroup>
          <col className="timeline__names" />
          {calendar.quarters.map((quarter) => (
            <col key={quarter.number} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th scope="row">Year</th>
            {years.map((year) => (
              <th
                key={year}
                scope="colgroup"
                className="timeline__year"
                aria-label={`Year ${year}`}
                colSpan={calendar.quarters.filter((quarter) => quarter.date.year === year).length}
              >
                <span>{year}</span>
              </th>
            ))}
          </tr>
          <tr>
            <th scope="row">Quarter</th>
            {calendar.quarters.map((quarter) => (
              <QuarterHead key={quarter.number} quarter={quarter} />
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ entry, supposed }) => (
            <ProjectRow
              key={entry.siteId}
              game={game}
              calendar={calendar}
              schedule={entry}
              supposed={supposed}
              unpaid={pausedSites.includes(entry.siteId)}
              onSelectSite={onSelectSite}
            />
          ))}
        </tbody>
      </table>
      {rows.length === 0 && (
        <p className="section-empty">
          Nothing is being built. Pick a site on the map to see when it would be finished.
        </p>
      )}
    </section>
  );
}

/** One quarter in the head of the timeline. Its marks are spelt out in its name. */
function QuarterHead({ quarter }: { readonly quarter: TermQuarter }) {
  const { date, harvest, election, when } = quarter;
  const name = [
    formatDate(date),
    ...(harvest ? ['harvest'] : []),
    ...(election ? ['the vote'] : []),
    ...(when === 'ahead' ? [] : [when]),
  ].join(', ');
  const classes = [
    'timeline__quarter',
    `timeline__quarter--${when}`,
    ...(harvest ? ['timeline__quarter--harvest'] : []),
    ...(election && when !== 'now' ? ['timeline__quarter--vote'] : []),
  ].join(' ');
  return (
    <th scope="col" className={classes} aria-label={name}>
      <span>{when === 'now' ? 'Now' : election ? 'Vote' : date.quarter}</span>
    </th>
  );
}

interface ProjectRowProps {
  readonly game: GameState;
  readonly calendar: TermCalendar;
  readonly schedule: SiteSchedule;
  /** The site is empty and unplanned: the bar supposes that building began now. */
  readonly supposed: boolean;
  /** The treasury will not cover this quarter's instalment. */
  readonly unpaid: boolean;
  readonly onSelectSite: (siteId: string) => void;
}

/**
 * One project: a bar over the quarters it is built in, then a bar over the quarters it is
 * in use before the vote. A bar that is only planned is drawn dashed.
 */
function ProjectRow(props: ProjectRowProps) {
  const { game, calendar, schedule, supposed, unpaid, onSelectSite } = props;
  const site = game.country.sites.find((candidate) => candidate.id === schedule.siteId);
  if (!site) return null;
  const { first, last } = calendar;
  const { state, begins, opens, inUseBeforeVote } = schedule;
  // A site that began after the term, or would, has no place on the term's timeline.
  if (begins > last) return null;

  // Building that began in an earlier term is drawn from the start of this one, and building
  // that ended in an earlier term not at all.
  const buildFrom = Math.max(begins, first);
  const lastBuilt = Math.min(opens - 1, last);
  const tentative = state === 'planned';
  const buildLabel = {
    planned: supposed ? 'If started now' : 'Planned',
    building: 'Building',
    paused: '▲ Paused',
    operating: 'Built',
    decaying: 'Built',
  }[state];
  const inUse = `In use for ${formatQuarters(inUseBeforeVote)} before the vote`;

  return (
    <tr>
      <th scope="row" className="timeline__site">
        <button
          type="button"
          onClick={() => {
            onSelectSite(site.id);
          }}
        >
          {site.name}
        </button>
        <span className="timeline__status">
          {statusLine(schedule, calendar, supposed, unpaid, siteTerms(site.type))}
        </span>
      </th>
      {buildFrom > first && <td colSpan={buildFrom - first} />}
      {lastBuilt >= buildFrom && (
        <td colSpan={lastBuilt - buildFrom + 1}>
          <div className={`timeline__bar timeline__bar--${state}`} title={buildLabel}>
            {buildLabel}
          </div>
        </td>
      )}
      {inUseBeforeVote > 0 ? (
        <td colSpan={inUseBeforeVote}>
          <div
            className={`timeline__bar timeline__bar--in-use${tentative ? ' timeline__bar--tentative' : ''}`}
            title={inUse}
          >
            {/* A short bar has no room for the sentence, so it shows the count alone. */}
            {inUseBeforeVote >= 5 ? (
              inUse
            ) : (
              <>
                <span className="visually-hidden">{inUse}</span>
                <span aria-hidden="true">{formatQuarters(inUseBeforeVote)}</span>
              </>
            )}
          </div>
        </td>
      ) : (
        lastBuilt < last && <td colSpan={last - Math.max(lastBuilt, buildFrom - 1)} />
      )}
    </tr>
  );
}

/** How a project stands, in a line beneath its name. */
function statusLine(
  schedule: SiteSchedule,
  calendar: TermCalendar,
  supposed: boolean,
  unpaid: boolean,
  terms: { readonly cost: number; readonly buildQuarters: number },
): string {
  const { state, inUseBeforeVote } = schedule;
  if (state === 'operating') return `In use since ${formatDate(dateOfQuarter(schedule.opens))}`;
  if (state === 'decaying') return '▲ Decaying for want of upkeep';
  if (inUseBeforeVote === 0) {
    return `▲ ${state === 'planned' ? 'Would' : 'Will'} not be finished before the vote`;
  }
  const opens = opening(schedule, calendar);
  if (unpaid) return `▲ Cannot be paid for this quarter · would open ${opens}`;
  switch (state) {
    case 'planned':
      return `${supposed ? 'If started now' : 'Planned'} · ${formatQuarters(terms.buildQuarters)}, ${formatMoney(terms.cost)}`;
    case 'building':
      return `Building · opens ${opens}`;
    case 'paused':
      return `▲ Paused · opens ${opens} once it is paid for`;
  }
}
