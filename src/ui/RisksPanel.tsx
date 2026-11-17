import {
  LIKELIHOOD_NAMES,
  LIKELIHOODS,
  riskHorizonQuarters,
  type Likelihood,
  type Risk,
} from '../sim';

interface RisksPanelProps {
  /** The dangers ahead under the decisions now in force, the most likely first. */
  readonly risks: readonly Risk[];
  /** The place in the list of the risk the player has selected, if any. */
  readonly selectedRisk: number | null;
  /** Called with a risk's place in the list when the player selects one that has a region. */
  readonly onSelectRisk: (index: number) => void;
}

/**
 * What could go wrong in the coming quarters if the player changes nothing, the most
 * likely first. A risk to one region is a button: selecting it picks that region out on
 * the map.
 */
export function RisksPanel({ risks, selectedRisk, onSelectRisk }: RisksPanelProps) {
  return (
    <section className="risks" aria-labelledby="risks-title">
      <div className="section-head">
        <h2 className="section-title" id="risks-title">
          Risks ahead
        </h2>
        <span className="section-note">Next {riskHorizonQuarters} quarters</span>
      </div>
      {risks.length === 0 ? (
        <p className="section-empty">No danger is in sight.</p>
      ) : (
        <ul className="risks__list">
          {risks.map((risk, index) => (
            <li key={`${risk.kind}|${risk.headline}`}>
              {risk.regionId === undefined ? (
                <div className="risk">
                  <RiskBody risk={risk} />
                </div>
              ) : (
                <button
                  type="button"
                  className="risk risk--place"
                  aria-pressed={index === selectedRisk}
                  onClick={() => {
                    onSelectRisk(index);
                  }}
                >
                  <RiskBody risk={risk} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** One risk: what it is and why, with how likely it is as a meter and in words. */
function RiskBody({ risk }: { readonly risk: Risk }) {
  return (
    <>
      <span className="risk__text">
        <span className="risk__headline">{risk.headline}</span>
        <span className="risk__reason">{risk.reason}</span>
      </span>
      <span className="risk__likelihood">
        <Meter likelihood={risk.likelihood} />
        <span className={`risk__level risk__level--${risk.likelihood}`}>
          {LIKELIHOOD_NAMES[risk.likelihood]}
        </span>
      </span>
    </>
  );
}

/**
 * Likelihood as five steps. The steps reached are solid and the rest are hollow, so the
 * meter reads by shape; the word beside it says the same.
 */
function Meter({ likelihood }: { readonly likelihood: Likelihood }) {
  const reached = LIKELIHOODS.indexOf(likelihood) + 1;
  return (
    <svg
      className={`risk__meter risk__meter--${likelihood}`}
      width="96"
      height="12"
      viewBox="0 0 96 12"
      role="img"
      aria-label={`Likelihood ${reached} of ${LIKELIHOODS.length}`}
    >
      {LIKELIHOODS.map((step, index) => (
        <rect
          key={step}
          className={index < reached ? 'risk__step risk__step--reached' : 'risk__step'}
          x={index * 20 + 0.75}
          y="2.75"
          width="14.5"
          height="6.5"
          rx="2"
        />
      ))}
    </svg>
  );
}
