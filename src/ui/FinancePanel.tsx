import { useState } from 'react';
import {
  debtStatus,
  formatMoney,
  formatPercent,
  formatQuarters,
  formatRate,
  loanOffers,
  type Borrowing,
  type GameState,
  type Preview,
} from '../sim';
import { DecisionPanel } from './DecisionPanel';
import './FinancePanel.css';

interface FinancePanelProps {
  readonly game: GameState;
  /** What the decisions now in force will do this quarter. */
  readonly preview: Preview;
  /** The loans the player means to take when the quarter ends. */
  readonly planned: readonly Borrowing[];
  /** Plans the loans to take this quarter, or takes a plan back. */
  readonly onPlan: (planned: readonly Borrowing[]) => void;
}

/**
 * Borrowing. A loan is chosen from a menu of sums and terms, with what it costs shown before
 * it is planned. Like a project, its money arrives when the quarter ends, so a plan can be
 * taken back until then.
 */
export function FinancePanel({ game, preview, planned, onPlan }: FinancePanelProps) {
  const status = debtStatus(game);
  const offers = loanOffers(game, planned);
  const amounts = [...new Set(offers.map((offer) => offer.amount))];
  const terms = [...new Set(offers.map((offer) => offer.quarters))];
  const [amount, setAmount] = useState(amounts[0] ?? 0);
  const [quarters, setQuarters] = useState(terms[0] ?? 0);
  const chosen = offers.find((offer) => offer.amount === amount && offer.quarters === quarters);

  return (
    <DecisionPanel
      id="finance"
      title="Finance"
      note={
        <span className="section-note">
          {status.debt === 0 && planned.length === 0
            ? 'No debt'
            : `Owes ${formatMoney(preview.debt.max)} after this quarter`}
        </span>
      }
    >
      {planned.map((loan, index) => {
        const offer = loanOffers(game).find(
          (candidate) => candidate.amount === loan.amount && candidate.quarters === loan.quarters,
        );
        const name = `Loan of ${formatMoney(loan.amount)} over ${formatQuarters(loan.quarters)}`;
        return (
          <div
            key={`${loan.amount}-${loan.quarters}-${index}`}
            className="loan"
            role="group"
            aria-label={name}
          >
            <div className="loan__head">
              <span className="loan__name">{name}</span>
              <span className="loan__state">Planned</span>
            </div>
            <div className="project__planned">
              <p className="project__note">
                The money arrives when this quarter ends. Repaid at{' '}
                {formatMoney(offer?.repayment ?? 0)} a quarter from next quarter.
              </p>
              <button
                type="button"
                className="button"
                aria-label={`Cancel ${name}`}
                onClick={() => {
                  onPlan(planned.filter((_, other) => other !== index));
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        );
      })}

      {preview.missedPayment > 0 && (
        <p className="warning-note">
          ▲ The treasury and revenue cannot cover this quarter’s repayments. A payment of{' '}
          {formatMoney(preview.missedPayment)} will be missed and added to the debt.
        </p>
      )}

      <h3 className="label" id="loan-title">
        Take a loan
      </h3>
      <div className="loan__choice" role="group" aria-labelledby="loan-title">
        <label htmlFor="loan-amount">Borrow</label>
        <select
          id="loan-amount"
          value={amount}
          onChange={(event) => {
            setAmount(Number(event.target.value));
          }}
        >
          {amounts.map((each) => (
            <option key={each} value={each}>
              {formatMoney(each)}
            </option>
          ))}
        </select>
        <label htmlFor="loan-term">Over</label>
        <select
          id="loan-term"
          value={quarters}
          onChange={(event) => {
            setQuarters(Number(event.target.value));
          }}
        >
          {terms.map((each) => (
            <option key={each} value={each}>
              {formatQuarters(each)}
            </option>
          ))}
        </select>
      </div>
      {chosen !== undefined && (
        <div className="loan__terms" role="group" aria-label="Loan terms">
          <div className="fixed-costs__row">
            <span>Repayment</span>
            <span className="fixed-costs__note">Each quarter, from next quarter</span>
            <span className="slider__value">{formatMoney(chosen.repayment)}</span>
          </div>
          <div className="fixed-costs__row">
            <span>Interest in all</span>
            <span className="fixed-costs__note">
              At {formatRate(chosen.annualRateBasisPoints)} a year
            </span>
            <span className="slider__value">{formatMoney(chosen.totalInterest)}</span>
          </div>
          {chosen.unavailable !== null && <p className="warning-note">▲ {chosen.unavailable}</p>}
          <button
            type="button"
            className="button"
            disabled={chosen.unavailable !== null}
            onClick={() => {
              onPlan([
                ...planned,
                { kind: 'loan', amount: chosen.amount, quarters: chosen.quarters },
              ]);
            }}
          >
            Plan loan
          </button>
        </div>
      )}
      <p className="section-empty">
        Repayments are paid before anything else each quarter. At the budget in force the nation may
        owe up to {formatMoney(status.limit)}. Its debt now stands at {formatPercent(status.burden)}{' '}
        of a year’s revenue.
      </p>
    </DecisionPanel>
  );
}
