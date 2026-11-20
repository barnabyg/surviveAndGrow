import { useState } from 'react';
import {
  bondOffers,
  bondRateSpan,
  borrowingBarred,
  bondsClosedBecause,
  CREDIT_RATING_NAMES,
  creditStatus,
  DEBT_KIND_NAMES,
  debtStatus,
  loanRateSpan,
  maturityOf,
  maturityOfTaking,
  missedPaymentMeans,
  paysAtMaturity,
  ratingRank,
  formatMoney,
  formatPercent,
  formatQuarters,
  formatRate,
  loanOffers,
  type Borrowing,
  type CreditStep,
  type GameState,
  type LoanOffer,
  type Preview,
} from '../sim';
import { DecisionPanel } from './DecisionPanel';
import { formatDate } from './format';
import './FinancePanel.css';

interface FinancePanelProps {
  readonly game: GameState;
  /** What the decisions now in force will do this quarter. */
  readonly preview: Preview;
  /** The loans and bonds the player means to take when the quarter ends. */
  readonly planned: readonly Borrowing[];
  /** Plans the loans and bonds to take this quarter, or takes a plan back. */
  readonly onPlan: (planned: readonly Borrowing[]) => void;
}

/**
 * Borrowing. A loan or a bond is chosen from a menu of sums and terms, with what it costs
 * shown before it is planned. Like a project, its money arrives when the quarter ends, so a
 * plan can be taken back until then. Everything owed is listed, each bond with its maturity.
 */
export function FinancePanel({ game, preview, planned, onPlan }: FinancePanelProps) {
  const status = debtStatus(game);
  const credit = creditStatus(game);
  const ratingAfter = preview.creditRating;
  const movement = ratingRank(ratingAfter) - ratingRank(credit.rating);
  const stepAfter = credit.steps.find((step) => step.rating === ratingAfter) ?? credit.current;
  const offers = loanOffers(game, planned);
  const amounts = [...new Set(offers.map((offer) => offer.amount))];
  const terms = [...new Set(offers.map((offer) => offer.quarters))];
  const [amount, setAmount] = useState(amounts[0] ?? 0);
  const [quarters, setQuarters] = useState(terms[0] ?? 0);
  const chosen = offers.find((offer) => offer.amount === amount && offer.quarters === quarters);
  const bonds = bondOffers(game, planned);
  const bondAmounts = [...new Set(bonds.map((offer) => offer.amount))];
  const bondTerms = [...new Set(bonds.map((offer) => offer.quarters))];
  const [bondPick, setBondAmount] = useState(bondAmounts[0] ?? 0);
  const [bondTermPick, setBondQuarters] = useState(bondTerms[0] ?? 0);
  // Bonds may have been closed when the panel opened, and open since.
  const bondAmount = bondAmounts.includes(bondPick) ? bondPick : (bondAmounts[0] ?? 0);
  const bondQuarters = bondTerms.includes(bondTermPick) ? bondTermPick : (bondTerms[0] ?? 0);
  const chosenBond = bonds.find(
    (offer) => offer.amount === bondAmount && offer.quarters === bondQuarters,
  );
  const closed = bondsClosedBecause(game.credit.rating);
  // Austerity bars every loan and bond, whatever the rating.
  const barred = borrowingBarred(game);
  const plan = (offer: LoanOffer) => {
    onPlan([...planned, { kind: offer.kind, amount: offer.amount, quarters: offer.quarters }]);
  };

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
        const offer = (loan.kind === 'bond' ? bondOffers(game) : loanOffers(game)).find(
          (candidate) => candidate.amount === loan.amount && candidate.quarters === loan.quarters,
        );
        const name = `${DEBT_KIND_NAMES[loan.kind]} of ${formatMoney(loan.amount)} over ${formatQuarters(loan.quarters)}`;
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
                {loan.kind === 'bond'
                  ? `The money arrives when this quarter ends. Interest of ${formatMoney(offer?.repayment ?? 0)} a quarter from next quarter, and the whole sum falls due ${formatDate(maturityOfTaking(game.date, loan.quarters))}.`
                  : `The money arrives when this quarter ends. Repaid at ${formatMoney(offer?.repayment ?? 0)} a quarter from next quarter.`}
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

      {status.debts.length > 0 && (
        <ul className="finance__owed" aria-label="What is owed">
          {status.debts.map((owed) => (
            <li key={owed.number} className="fixed-costs__row">
              <span>
                {owed.name} · {formatMoney(owed.owed)} at {formatRate(owed.annualRateBasisPoints)}
              </span>
              <span className="fixed-costs__note">
                {paysAtMaturity(owed)
                  ? `Interest ${formatMoney(owed.repayment)} a quarter · matures ${formatDate(maturityOf(owed, game.date))}`
                  : `${formatMoney(owed.repayment)} a quarter · last ${formatDate(maturityOf(owed, game.date))}`}
              </span>
            </li>
          ))}
        </ul>
      )}

      {preview.missedPayment > 0 && (
        <p className="warning-note">
          ▲ The treasury and revenue cannot cover this quarter’s repayments. A payment of{' '}
          {formatMoney(preview.missedPayment)} will be missed. {missedPaymentMeans(game)}
        </p>
      )}

      <div className="credit" role="group" aria-label="Credit rating">
        <div className="fixed-costs__row">
          <span>Credit rating {credit.name}</span>
          <span className="fixed-costs__note">{stepTerms(credit.current)}</span>
        </div>
        {credit.above !== null && (
          <div className="fixed-costs__row">
            <span>One step up, {credit.above.name}</span>
            <span className="fixed-costs__note">{stepTerms(credit.above)}</span>
          </div>
        )}
        {credit.below !== null && (
          <div className="fixed-costs__row">
            <span>One step down, {credit.below.name}</span>
            <span className="fixed-costs__note">{stepTerms(credit.below)}</span>
          </div>
        )}
        {movement !== 0 && (
          <p className={movement < 0 ? 'warning-note' : 'section-empty'}>
            {movement < 0 ? '▲ ' : ''}As things stand, the rating is{' '}
            {movement < 0 ? 'cut' : 'raised'} to {CREDIT_RATING_NAMES[ratingAfter]} when this
            quarter ends. {afterTerms(stepAfter)} Loans and bonds already taken keep their rate.
          </p>
        )}
      </div>

      <h3 className="label" id="loan-title">
        Take a loan
      </h3>
      {barred !== null ? (
        <p className="warning-note" role="note" aria-label="Loans">
          ▲ {barred}
        </p>
      ) : (
        <>
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
              {chosen.unavailable !== null && (
                <p className="warning-note">▲ {chosen.unavailable}</p>
              )}
              <button
                type="button"
                className="button"
                disabled={chosen.unavailable !== null}
                onClick={() => {
                  plan(chosen);
                }}
              >
                Plan loan
              </button>
            </div>
          )}
        </>
      )}

      <h3 className="label" id="bond-title">
        Issue a bond
      </h3>
      {barred !== null ? (
        <p className="warning-note" role="note" aria-label="Bonds">
          ▲ {barred}
        </p>
      ) : closed !== null ? (
        <p className="section-empty" role="note" aria-label="Bonds">
          {closed} A bond pays only interest each quarter, and its whole sum at maturity.
        </p>
      ) : (
        <>
          <div className="loan__choice" role="group" aria-labelledby="bond-title">
            <label htmlFor="bond-amount">Raise</label>
            <select
              id="bond-amount"
              value={bondAmount}
              onChange={(event) => {
                setBondAmount(Number(event.target.value));
              }}
            >
              {bondAmounts.map((each) => (
                <option key={each} value={each}>
                  {formatMoney(each)}
                </option>
              ))}
            </select>
            <label htmlFor="bond-term">Maturing in</label>
            <select
              id="bond-term"
              value={bondQuarters}
              onChange={(event) => {
                setBondQuarters(Number(event.target.value));
              }}
            >
              {bondTerms.map((each) => (
                <option key={each} value={each}>
                  {formatQuarters(each)}
                </option>
              ))}
            </select>
          </div>
          {chosenBond !== undefined && (
            <BondTerms
              offer={chosenBond}
              matures={maturityOfTaking(game.date, chosenBond.quarters)}
              onPlan={() => {
                plan(chosenBond);
              }}
            />
          )}
        </>
      )}
      <p className="section-empty">
        Repayments and interest are paid before anything else each quarter. At the budget in force
        the nation may owe up to {formatMoney(status.limit)}. Its debt now stands at{' '}
        {formatPercent(status.burden)} of a year’s revenue.
      </p>
    </DecisionPanel>
  );
}

/** What a bond on the menu costs and when it falls due, before it is planned. */
function BondTerms(props: {
  readonly offer: LoanOffer;
  readonly matures: GameState['date'];
  readonly onPlan: () => void;
}) {
  const { offer, matures, onPlan } = props;
  return (
    <div className="loan__terms" role="group" aria-label="Bond terms">
      <div className="fixed-costs__row">
        <span>Interest</span>
        <span className="fixed-costs__note">
          Each quarter, from next quarter, at {formatRate(offer.annualRateBasisPoints)} a year
        </span>
        <span className="slider__value">{formatMoney(offer.repayment)}</span>
      </div>
      <div className="fixed-costs__row">
        <span>Repaid at maturity</span>
        <span className="fixed-costs__note">In one payment, {formatDate(matures)}</span>
        <span className="slider__value">{formatMoney(offer.amount)}</span>
      </div>
      <div className="fixed-costs__row">
        <span>Interest in all</span>
        <span className="fixed-costs__note">Over {formatQuarters(offer.quarters)}</span>
        <span className="slider__value">{formatMoney(offer.totalInterest)}</span>
      </div>
      {offer.unavailable !== null && <p className="warning-note">▲ {offer.unavailable}</p>}
      <button
        type="button"
        className="button"
        disabled={offer.unavailable !== null}
        onClick={onPlan}
      >
        Plan bond
      </button>
    </div>
  );
}

/** What new loans and bonds cost once the rating has moved to a step, in a sentence. */
function afterTerms(step: CreditStep): string {
  const bonds = bondRateSpan(step);
  return `Loans taken after it cost ${loanRateSpan(step)} a year, and ${bonds === null ? `bonds cannot be issued at ${step.name}` : `bonds ${bonds}`}.`;
}

/** What a step of the rating means for borrowing, in a few words. */
function stepTerms(step: CreditStep): string {
  const bonds = bondRateSpan(step);
  return `Loans at ${loanRateSpan(step)} a year${bonds === null ? '' : ` · bonds at ${bonds}`} · may owe ${formatPercent(step.debtLimitPermille, 0)} of a year’s revenue`;
}
