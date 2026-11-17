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
        <svg width="26" height="16" viewBox="0 0 26 16" aria-hidden="true">
          <path d="M1,8 H25" stroke="currentColor" strokeWidth="2" strokeDasharray="7 5" />
        </svg>
        Possible route
      </li>
    </ul>
  );
}
