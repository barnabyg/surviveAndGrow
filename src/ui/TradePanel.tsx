import { useState } from 'react';
import {
  austerityStatus,
  formatMoney,
  formatPrice,
  formatQuarters,
  formatTonnes,
  importTerms,
  ORDER_STEP_TONNES,
  plannedImport,
  priceStatus,
  type GameState,
  type Preview,
  type TradeOrder,
} from '../sim';
import { DecisionPanel } from './DecisionPanel';
import { formatRange } from './format';
import { recent } from './trend';
import { TrendLine } from './TrendLine';
import { VitalSign } from './VitalSign';
import './TradePanel.css';

interface TradePanelProps {
  readonly game: GameState;
  /** What the decisions now in force will do this quarter. */
  readonly preview: Preview;
  /** The goods the player means to buy abroad when the quarter ends. */
  readonly planned: readonly TradeOrder[];
  /** Plans what to buy this quarter, or takes a plan back. */
  readonly onPlan: (planned: readonly TradeOrder[]) => void;
}

/** A price with its sign, in dollars: `+$12` or `−$8`. */
function formatSignedDollars(dollars: number): string {
  return `${dollars > 0 ? '+' : dollars < 0 ? '−' : ''}$${Math.abs(dollars)}`;
}

/**
 * Trade with the world. The world grain price, with its trend, what moved it and the range it
 * could reach, and grain ordered for the national reserve at that price. The cost is shown
 * before the order is planned, and like a loan the order can be taken back until the quarter
 * ends, when the grain arrives and is paid for.
 */
export function TradePanel({ game, preview, planned, onPlan }: TradePanelProps) {
  const status = priceStatus(game, 'grain');
  const [tonnes, setTonnes] = useState(10 * ORDER_STEP_TONNES);
  const terms = importTerms(game, 'grain', tonnes, planned);
  const order = plannedImport(planned, 'grain');
  const austerity = austerityStatus(game);

  return (
    <DecisionPanel
      id="trade"
      title="Trade"
      note={
        <span className="section-note">
          {preview.trade.imported > 0
            ? `${formatTonnes(preview.trade.imported)} of grain ordered`
            : 'Nothing ordered'}
        </span>
      }
    >
      <div className="trade__price">
        <VitalSign
          label="World grain price"
          value={`$${status.price}`}
          unit="a tonne"
          figure={status.figure}
          formatChange={formatSignedDollars}
          formatMovement={(dollars) => `$${dollars}`}
          goodWhen="falling"
          note={`Forecast ${formatRange(status.forecast, (price) => `$${price}`)} a tonne over the next ${formatQuarters(status.forecastQuarters)}`}
          breakdownTitle="What moved the world grain price"
          trend={
            <TrendLine
              subject="World grain price"
              values={recent(status.path)}
              format={formatPrice}
              mark={{
                value: status.usual,
                label: `Usual: $${status.usual}`,
                name: `the usual price of $${status.usual}`,
              }}
            />
          }
        >
          <p className="breakdown__empty">
            World markets move the price each quarter, and it is pulled part of the way back towards
            its usual {formatPrice(status.usual)}. The forecast is the range it could reach if
            markets moved it the same way every quarter.
          </p>
        </VitalSign>
      </div>

      {order !== undefined ? (
        <div className="loan" role="group" aria-label="Grain import">
          <div className="loan__head">
            <span className="loan__name">Grain import of {formatTonnes(order.tonnes)}</span>
            <span className="loan__state">Planned</span>
          </div>
          <div className="project__planned">
            <p className="project__note">
              It reaches the national reserve, and {formatMoney(preview.trade.paid)} leaves the
              treasury, when this quarter ends.
            </p>
            <button
              type="button"
              className="button"
              aria-label="Cancel the grain import"
              onClick={() => {
                onPlan(planned.filter((each) => each !== order));
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <h3 className="label" id="import-title">
            Import grain
          </h3>
          <div className="loan__choice" role="group" aria-labelledby="import-title">
            <label htmlFor="import-tonnes">Tonnes</label>
            <input
              id="import-tonnes"
              type="number"
              min={ORDER_STEP_TONNES}
              step={ORDER_STEP_TONNES}
              value={tonnes}
              onChange={(event) => {
                setTonnes(Number(event.target.value));
              }}
            />
          </div>
          <div className="loan__terms" role="group" aria-label="Import terms">
            <div className="fixed-costs__row">
              <span>Cost</span>
              <span className="fixed-costs__note">At {formatPrice(terms.dollarsPerTonne)}</span>
              <span className="slider__value">{formatMoney(terms.cost)}</span>
            </div>
            {terms.unavailable !== null && <p className="warning-note">▲ {terms.unavailable}</p>}
            <button
              type="button"
              className="button"
              disabled={terms.unavailable !== null}
              onClick={() => {
                onPlan([...planned, { good: 'grain', direction: 'import', tonnes }]);
              }}
            >
              Order grain
            </button>
          </div>
        </>
      )}
      <p className="section-empty">
        Grain bought abroad goes to the national reserve. It arrives, and is paid for at this
        quarter’s price, when the quarter ends.
        {austerity !== null && ' Austerity does not bar it: austerity starves no one.'}
      </p>
    </DecisionPanel>
  );
}
