import './MapLegend.css';

/**
 * What the marks for sites and routes mean. Each state has its own shape of line, so the
 * legend can be read without telling the colours apart.
 */
export function MapLegend() {
  return (
    <ul className="legend" aria-label="Map legend">
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
        <svg width="26" height="16" viewBox="0 0 26 16" aria-hidden="true">
          <path d="M1,8 H25" stroke="currentColor" strokeWidth="2" strokeDasharray="7 5" />
        </svg>
        Possible route
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
    </ul>
  );
}
