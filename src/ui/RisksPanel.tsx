import { useState } from 'react';
import {
  LIKELIHOOD_NAMES,
  LIKELIHOODS,
  riskHorizonQuarters,
  type Likelihood,
  type Risk,
} from '../sim';
import { PlaceNote } from './PlaceNote';
import './RisksPanel.css';

interface RisksPanelProps {
  /** The dangers ahead under the decisions now in force, the most likely first. */
  readonly risks: readonly Risk[];
  /** The place in the list of the risk the player has selected, if any. */
  readonly selectedRisk: number | null;
  /** Called with a risk's place in the list when the player selects one that has a place. */
  readonly onSelectRisk: (index: number) => void;
}

/** How many risks are listed before the rest are folded away. */
const SHOWN_RISKS = 4;

/**
 * What could go wrong in the coming quarters if the player changes nothing, the most
 * likely first. Each risk takes two lines: what it is and how likely, and why, cut short
 * with its whole text in a tooltip. Beyond the first few, the least likely are folded away
 * until the player asks for them. A risk to one region, or from one neighbour, is a button:
 * selecting it picks that place out on the map and shows the whole of why.
 */
export function RisksPanel({ risks, selectedRisk, onSelectRisk }: RisksPanelProps) {
  const [all, setAll] = useState(false);
  const folded = all ? 0 : Math.max(0, risks.length - SHOWN_RISKS);
  return (
    <section className="risks" aria-labelledby="risks-title" data-tour="risks">
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
            <li
              key={`${risk.kind}|${risk.headline}`}
              hidden={index >= SHOWN_RISKS && folded > 0 && index !== selectedRisk}
              title={risk.reason}
            >
              {risk.regionId === undefined && risk.neighbourId === undefined ? (
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
                  <PlaceNote className="risk__place" pickedOut={index === selectedRisk} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {risks.length > SHOWN_RISKS && (
        <button
          type="button"
          className="risks__more"
          aria-expanded={all}
          onClick={() => {
            setAll(!all);
          }}
        >
          {all ? 'Show fewer' : `Show ${folded} more`}
        </button>
      )}
    </section>
  );
}

/** One risk: what it is and why, with how likely it is as a meter and in words. */
function RiskBody({ risk }: { readonly risk: Risk }) {
  return (
    <>
      <span className="risk__headline">{risk.headline}</span>
      <span className="risk__likelihood">
        <Meter likelihood={risk.likelihood} />
        <span className={`risk__level risk__level--${risk.likelihood}`}>
          {LIKELIHOOD_NAMES[risk.likelihood]}
        </span>
      </span>
      <span className="risk__reason">{risk.reason}</span>
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
