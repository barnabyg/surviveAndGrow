import { BORDER_INCIDENT_NAME, INTENTION_NAMES, INTENTIONS } from '../sim';
import { IncidentMark } from './IncidentMark';
import { IntentionMark } from './IntentionSign';
import './MapLegend.css';

/**
 * What the marks for sites, routes, trade routes, neighbours and border incidents mean. Each state has its own
 * shape or line, so the legend can be read without telling the colours apart.
 */
export function MapLegend() {
  return (
    <ul className="legend" aria-label="Map legend" data-tour="legend">
      <li>
        <svg width="16" height="16" viewBox="-8 -8 16 16" aria-hidden="true">
          <circle
            r="6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="2.5 2.5"
          />
        </svg>
        Empty site
      </li>
      <li>
        <svg width="16" height="16" viewBox="-8 -8 16 16" aria-hidden="true">
          <circle r="6.5" fill="none" stroke="var(--amber)" strokeWidth="2.5" />
          <circle r="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        Under construction
      </li>
      <li>
        <svg width="16" height="16" viewBox="-8 -8 16 16" aria-hidden="true">
          <circle r="6.5" fill="currentColor" />
        </svg>
        Operating
      </li>
      <li>
        <svg width="16" height="16" viewBox="-8 -8 16 16" aria-hidden="true">
          <circle r="5" cx="-1.5" cy="1.5" fill="currentColor" />
          <path
            d="M3,-7.5 L7.5,0.5 H-1.5 Z"
            fill="var(--amber)"
            stroke="currentColor"
            strokeWidth="1"
          />
        </svg>
        Decaying
      </li>
      <li>
        <svg width="16" height="16" viewBox="-8 -8 16 16" aria-hidden="true">
          <circle
            r="6"
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.5"
            strokeWidth="1.5"
            strokeDasharray="2.5 2.5"
          />
          <path d="M-6,6 L6,-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        Closed by an alternative
      </li>
      <li>
        <svg width="16" height="16" viewBox="-8 -8 16 16" aria-hidden="true">
          <circle
            r="5"
            cx="1.5"
            cy="1.5"
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.5"
            strokeWidth="1.5"
            strokeDasharray="2.5 2.5"
          />
          <path d="M-6,-3 V-5 A2.5,2.5 0 0 1 -1,-5 V-3" fill="none" stroke="currentColor" />
          <rect x="-7" y="-3" width="7" height="5" rx="1" fill="currentColor" />
        </svg>
        Locked: research must unlock it first
      </li>
      <li>
        <svg width="26" height="16" viewBox="0 0 26 16" aria-hidden="true">
          <path d="M1,8 H25" stroke="currentColor" strokeWidth="2" strokeDasharray="7 5" />
        </svg>
        Possible route
      </li>
      <li>
        <svg width="16" height="16" viewBox="-8 -8 16 16" aria-hidden="true">
          <circle cx="-1.5" cy="-1.5" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M1,1 L5,5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        Not yet surveyed: a deposit may lie there (filled while a survey is under way)
      </li>
      <li>
        <svg width="26" height="16" viewBox="0 0 26 16" aria-hidden="true">
          <path d="M2,8 H24" stroke="#f1e6c6" strokeWidth="3.5" strokeLinecap="round" />
        </svg>
        Road
      </li>
      <li>
        <svg width="26" height="16" viewBox="0 0 26 16" aria-hidden="true">
          <path d="M2,8 H24" stroke="#f1e6c6" strokeWidth="1.5" strokeDasharray="3 2" />
        </svg>
        Power line
      </li>
      <li>
        <svg width="26" height="16" viewBox="0 0 26 16" aria-hidden="true">
          <path
            d="M3,8 H23"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeDasharray="0.1 6"
            strokeLinecap="round"
          />
        </svg>
        ✕ Missing link in a chain
      </li>
      <li>
        <svg width="26" height="16" viewBox="0 0 26 16" aria-hidden="true">
          <path d="M1,8 H25" stroke="#f1e6c6" strokeWidth="10" strokeOpacity="0.8" />
          <path d="M1,8 H25" stroke="#2b2622" strokeWidth="8" />
          <path d="M1,8 H25" stroke="#f1e6c6" strokeWidth="4" />
        </svg>
        Trade route: its width is its capacity, its pale core what it carries
      </li>
      <li>
        <svg width="16" height="16" viewBox="-8 -8 16 16" aria-hidden="true">
          <path d="M-6,0 H6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <path d="M0,0 V-8" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        Border crossing
      </li>
      <li>
        <svg width="26" height="16" viewBox="0 0 26 16" aria-hidden="true">
          <path
            d="M3,8 H23"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeDasharray="0.1 6"
            strokeLinecap="round"
          />
        </svg>
        ✕ Missing trade link (infrastructure lens)
      </li>
      <li>
        <svg width="26" height="16" viewBox="0 0 26 16" aria-hidden="true">
          <path d="M1,8 H25" stroke="currentColor" strokeWidth="5" strokeDasharray="6 3" />
        </svg>
        ▲ Weak trade link: a decaying port
      </li>
      {INTENTIONS.map((intention) => (
        <li key={intention}>
          <svg width="16" height="16" viewBox="-8 -8 16 16" aria-hidden="true">
            <IntentionMark intention={intention} ink="currentColor" />
          </svg>
          {INTENTION_NAMES[intention]} {LEGEND_OF_INTENTION[intention]}
        </li>
      ))}
      {[false, true].map((inForce) => (
        <li key={inForce ? 'in force' : 'announced'}>
          <svg width="18" height="18" viewBox="-9 -9 18 18" aria-hidden="true">
            <IncidentMark inForce={inForce} ink="currentColor" ground="var(--panel)" />
          </svg>
          {inForce
            ? `▲ ${BORDER_INCIDENT_NAME} in force: its crossings closed, its border regions produce less`
            : `▲ ${BORDER_INCIDENT_NAME} announced: a hostile neighbour, on its border`}
        </li>
      ))}
      <li>
        <svg width="26" height="16" viewBox="0 0 26 16" aria-hidden="true">
          <path d="M1,8 H25" stroke="currentColor" strokeWidth="4" strokeDasharray="3 5" />
          <path d="M8,3 L18,13 M18,3 L8,13" stroke="currentColor" strokeWidth="2" />
        </svg>
        ✕ Border crossing closed by a border incident
      </li>
    </ul>
  );
}

/** What the legend adds to each intention's mark and word: how the border is drawn for it. */
const LEGEND_OF_INTENTION = {
  peaceful: 'neighbour',
  watchful: 'neighbour: its border dashed',
  hostile: 'neighbour: its border solid and toothed',
} as const;
