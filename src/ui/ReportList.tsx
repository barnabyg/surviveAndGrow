import {
  SERIOUSNESS_LEVELS,
  SERIOUSNESS_NAMES,
  type ReportEntry,
  type ReportKind,
  type TurnReport,
} from '../sim';
import { PlaceNote } from './PlaceNote';
import './ReportList.css';

interface ReportListProps {
  /** The report on the quarter just ended, or null before any quarter has ended. */
  readonly report: TurnReport | null;
  /** The place in the list of the report the player has selected, if any. */
  readonly selectedEntry: number | null;
  /** Called with a report's place in the list when the player selects one that has a place. */
  readonly onSelectEntry: (index: number) => void;
}

/**
 * What happened last quarter, where and why, the most serious first. A report about one
 * region or one neighbour is a button: selecting it picks that place out on the map.
 */
export function ReportList({ report, selectedEntry, onSelectEntry }: ReportListProps) {
  const count = report?.entries.length ?? 0;
  return (
    <section className="reports" aria-labelledby="reports-title" data-tour="reports">
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
              {entry.regionId === undefined && entry.neighbourId === undefined ? (
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
                  <PlaceNote className="report__place" pickedOut={index === selectedEntry} />
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
  // A soldier's shield with a chevron of rank on it.
  armyLoyalty: {
    label: 'Army report',
    path: 'M10,2 L17,5 V10 Q17,15 10,18 Q3,15 3,10 V5 Z M6.5,8 L10,11 L13.5,8 M6.5,11.5 L10,14.5 L13.5,11.5',
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
  // A flask, bubbling.
  researchStarted: {
    label: 'Research report',
    path: 'M7,2 H13 M8.5,2 V8 L3.5,17 H16.5 L11.5,8 V2 M7,13 A1,1 0 1 1 6.99,13 M11,11.5 A1,1 0 1 1 10.99,11.5',
  },
  // The same flask with work stopped: two upright bars.
  researchPaused: {
    label: 'Paused research report',
    path: 'M7,2 H13 M8.5,2 V8 L3.5,17 H16.5 L11.5,8 V2 M8.5,11.5 V15 M11.5,11.5 V15',
  },
  // The same flask, ticked.
  researchCompleted: {
    label: 'Finished research report',
    path: 'M7,2 H13 M8.5,2 V8 L3.5,17 H16.5 L11.5,8 V2 M7,13 L9,15 L13,10.5',
  },
  // A magnifying glass held over the ground.
  surveyStarted: {
    label: 'Survey report',
    path: 'M8,3 A5,5 0 1 1 7.99,3 M11.5,11.5 L16,16 M2,18 H18',
  },
  // The same glass with work stopped: two upright bars in it.
  surveyPaused: {
    label: 'Paused survey report',
    path: 'M8,3 A5,5 0 1 1 7.99,3 M11.5,11.5 L16,16 M2,18 H18 M6.5,6 V10 M9.5,6 V10',
  },
  // The same glass, ticked.
  surveyCompleted: {
    label: 'Finished survey report',
    path: 'M8,3 A5,5 0 1 1 7.99,3 M11.5,11.5 L16,16 M2,18 H18 M5.5,8 L7.5,10 L10.5,6',
  },
  // A finished building with a crack running down it.
  siteDecaying: {
    label: 'Decaying site report',
    path: 'M3,17 H17 M5,17 V9 L10,4 L15,9 V17 M10,6.5 L8.5,10 L11,12 L9.5,17',
  },
  // A finished building with a spanner beside it.
  siteRestored: {
    label: 'Restored site report',
    path: 'M2,17 H12 M3.5,17 V10 L7,6.5 L10.5,10 V17 M14,17 V9 M12,5 A2.5,2.5 0 1 0 16,5 M14,7.5 V9',
  },
  // A banknote with an arrow coming in.
  loanTaken: {
    label: 'Loan report',
    path: 'M2,6 H14 V14 H2 Z M8,8.5 A1.5,1.5 0 1 1 7.99,8.5 M18,10 H15 M16.5,8.5 L15,10 L16.5,11.5',
  },
  // A banknote, ticked.
  loanRepaid: {
    label: 'Repaid loan report',
    path: 'M2,6 H18 V14 H2 Z M6.5,10 L9,12.5 L13.5,7.5',
  },
  // A ship under sail.
  trade: {
    label: 'Trade report',
    path: 'M2,12 H18 L15,17 H5 Z M10,12 V3 M10,4 L15,10 H10',
  },
  // A price tag with an arrow leaping from it.
  priceShock: {
    label: 'World price shock report',
    path: 'M2,10 L8,4 H13 V9 L7,15 Z M10.5,6.5 A0.5,0.5 0 1 1 10.49,6.5 M12,16 L18,10 M18,10 H14 M18,10 V14',
  },
  // A lifebuoy.
  bailout: {
    label: 'Bailout report',
    path: 'M10,2 A8,8 0 1 1 9.99,2 M10,6 A4,4 0 1 1 9.99,6 M10,2 V6 M10,14 V18 M2,10 H6 M14,10 H18',
  },
  // A belt and its buckle.
  austerity: {
    label: 'Austerity report',
    path: 'M2,8 H18 M2,12 H18 M9,6.5 H13 V13.5 H9 Z M11,10 H15',
  },
  // A banknote torn through.
  missedPayment: {
    label: 'Missed payment report',
    path: 'M2,6 H18 V14 H2 Z M10,6 L8.5,8.5 L11,10.5 L9.5,14',
  },
  // Steps of a rating, rising.
  creditRating: {
    label: 'Credit rating report',
    path: 'M2,17 H6 V13 H10 V9 H14 V5 H18 M2,17 H18',
  },
  // A road that forks.
  dilemma: {
    label: 'Decision report',
    path: 'M10,18 V11 M10,11 L4,5 M10,11 L16,5 M4,9 V5 H8 M16,9 V5 H12',
  },
  // Steps climbing, with an arrow above them.
  tier: {
    label: 'Prosperity tier report',
    path: 'M2,18 H7 V14 H11 V10 H15 V6 H18 M11,6 L15,2 M12,2 H15 V5',
  },
  // A ballot dropping into a box.
  election: {
    label: 'Election report',
    path: 'M3,10 H17 V17 H3 Z M7,10 V4 H13 V10 M8.5,6.5 L10,8 L12,5.5',
  },
  // Two countries either side of a border, an arrow crossing it.
  neighbour: {
    label: 'Neighbour report',
    path: 'M10,2 V5 M10,8 V12 M10,15 V18 M2,10 H7 M13,10 H18 M15,7 L18,10 L15,13',
  },
  // A border barred: a line across it, and a bar set against the way through.
  borderIncident: {
    label: 'Border incident report',
    path: 'M10,2 V18 M3,10 H8 M12,10 H17 M6,6 L14,14 M14,6 L6,14',
  },
  // A broken column.
  collapse: {
    label: 'Collapse report',
    path: 'M3,17 H17 M6,17 V11 L8,9 L6,7 V4 M14,17 V12 L12,10 L14,8 V4 M4,4 H9 M11,4 H16',
  },
  // A soldier's shield, struck through.
  coup: {
    label: 'Coup report',
    path: 'M10,2 L17,5 V10 Q17,15 10,18 Q3,15 3,10 V5 Z M3,17 L17,3',
  },
  // A star.
  victory: {
    label: 'Victory report',
    path: 'M10,2 L12.4,7.4 L18,8 L13.8,11.8 L15,17.5 L10,14.6 L5,17.5 L6.2,11.8 L2,8 L7.6,7.4 Z',
  },
  // A tick.
  quiet: {
    label: 'Quiet quarter report',
    path: 'M4,10.5 L8.5,15 L16,5.5',
  },
};
