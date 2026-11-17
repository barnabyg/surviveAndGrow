import {
  SERIOUSNESS_LEVELS,
  SERIOUSNESS_NAMES,
  type ReportEntry,
  type ReportKind,
  type TurnReport,
} from '../sim';

interface ReportListProps {
  /** The report on the quarter just ended, or null before any quarter has ended. */
  readonly report: TurnReport | null;
  /** The place in the list of the report the player has selected, if any. */
  readonly selectedEntry: number | null;
  /** Called with a report's place in the list when the player selects one that has a region. */
  readonly onSelectEntry: (index: number) => void;
}

/**
 * What happened last quarter, where and why, the most serious first. A report about one
 * region is a button: selecting it picks that region out on the map.
 */
export function ReportList({ report, selectedEntry, onSelectEntry }: ReportListProps) {
  const count = report?.entries.length ?? 0;
  return (
    <section className="reports" aria-labelledby="reports-title">
      <div className="section-head">
        <h2 className="section-title" id="reports-title">
          This quarter
        </h2>
        {report !== null && (
          <span className="section-note">
            {count} {count === 1 ? 'report' : 'reports'}
          </span>
        )}
      </div>
      {report === null ? (
        <p className="section-empty">Reports arrive when a quarter ends.</p>
      ) : (
        <ul className="reports__list">
          {report.entries.map((entry, index) => (
            <li key={`${entry.headline}|${entry.cause}`}>
              {entry.regionId === undefined ? (
                <div className="report">
                  <ReportBody entry={entry} />
                </div>
              ) : (
                <button
                  type="button"
                  className="report report--place"
                  aria-pressed={index === selectedEntry}
                  onClick={() => {
                    onSelectEntry(index);
                  }}
                >
                  <ReportBody entry={entry} />
                  <span className="report__place" aria-hidden="true">
                    On the map ›
                  </span>
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Reports from this level up are marked with a warning triangle and their seriousness in words. */
const MARKED_FROM = SERIOUSNESS_LEVELS.indexOf('warning');

/**
 * One report: an icon for its kind, then its headline and cause. The icon's shape says
 * what kind of report it is and a word says how serious, so neither rests on colour.
 */
function ReportBody({ entry }: { readonly entry: ReportEntry }) {
  const icon = ICONS[entry.kind];
  const marked = SERIOUSNESS_LEVELS.indexOf(entry.seriousness) >= MARKED_FROM;
  return (
    <>
      <svg
        className={`report__icon report__icon--${entry.seriousness}`}
        viewBox="0 0 20 20"
        role="img"
        aria-label={icon.label}
      >
        <path d={icon.path} />
      </svg>
      <span className="report__text">
        {marked && (
          <span className={`report__rank report__rank--${entry.seriousness}`}>
            <span aria-hidden="true">▲ </span>
            {SERIOUSNESS_NAMES[entry.seriousness]}
          </span>
        )}
        <span className="report__headline">{entry.headline}</span>
        <span className="report__cause">{entry.cause}</span>
      </span>
    </>
  );
}

/**
 * The icon for each kind of report, drawn as strokes in a 20 by 20 box, and what it is
 * called. A new kind of report needs its icon here before the game will build.
 */
const ICONS: Readonly<Record<ReportKind, { readonly label: string; readonly path: string }>> = {
  // A line of figures heading across a chart.
  budget: {
    label: 'Budget report',
    path: 'M2,5 L7,10 L11,7 L18,15 M18,10 V15 H13',
  },
  // A coin struck through.
  spendingCut: {
    label: 'Spending cut report',
    path: 'M10,3 A7,7 0 1 1 9.99,3 M10,6.5 V13.5 M3.5,16.5 L16.5,3.5',
  },
  // An ear of grain.
  harvest: {
    label: 'Harvest report',
    path: 'M10,18 V6 M10,6 Q7,4 10,2 Q13,4 10,6 M10,10 Q6,9 6,6 M10,10 Q14,9 14,6 M10,14 Q6,13 6,10 M10,14 Q14,13 14,10',
  },
  // An empty bowl.
  hunger: {
    label: 'Food report',
    path: 'M3,9 H17 M4,9 Q4,16 10,16 Q16,16 16,9 M7,16 V18 H13 V16',
  },
  // A sun with its rays.
  event: {
    label: 'Event report',
    path: 'M10,6.5 A3.5,3.5 0 1 1 9.99,6.5 M10,2 V4.5 M10,15.5 V18 M2,10 H4.5 M15.5,10 H18 M4.4,4.4 L6.1,6.1 M13.9,13.9 L15.6,15.6 M4.4,15.6 L6.1,13.9 M13.9,6.1 L15.6,4.4',
  },
  // A raised placard.
  strike: {
    label: 'Strike report',
    path: 'M5,3 H15 V10 H5 Z M10,10 V18 M7.5,6.5 H12.5',
  },
  // A crowd of raised arms.
  protest: {
    label: 'Protest report',
    path: 'M4,18 V11 M4,11 L2,6 M10,18 V9 M10,9 L10,3 M16,18 V11 M16,11 L18,6 M7,18 V14 M13,18 V14',
  },
  // A frame going up, with an arrow rising from it.
  projectStarted: {
    label: 'Building report',
    path: 'M3,17 H17 M5,17 V9 H15 V17 M5,13 H15 M10,9 V3 M7,5.5 L10,3 L13,5.5',
  },
  // The same frame with work stopped: two upright bars.
  projectPaused: {
    label: 'Paused building report',
    path: 'M3,17 H17 M5,17 V7 H15 V17 M8.5,10 V14 M11.5,10 V14',
  },
  // A finished building, ticked.
  projectCompleted: {
    label: 'Finished building report',
    path: 'M3,17 H17 M5,17 V9 L10,4 L15,9 V17 M7.5,12.5 L9.5,14.5 L13,10.5',
  },
  // A road that forks.
  dilemma: {
    label: 'Decision report',
    path: 'M10,18 V11 M10,11 L4,5 M10,11 L16,5 M4,9 V5 H8 M16,9 V5 H12',
  },
  // A ballot dropping into a box.
  election: {
    label: 'Election report',
    path: 'M3,10 H17 V17 H3 Z M7,10 V4 H13 V10 M8.5,6.5 L10,8 L12,5.5',
  },
  // A broken column.
  collapse: {
    label: 'Collapse report',
    path: 'M3,17 H17 M6,17 V11 L8,9 L6,7 V4 M14,17 V12 L12,10 L14,8 V4 M4,4 H9 M11,4 H16',
  },
  // A tick.
  quiet: {
    label: 'Quiet quarter report',
    path: 'M4,10.5 L8.5,15 L16,5.5',
  },
};
