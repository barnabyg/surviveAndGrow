import { useState, type ReactNode } from 'react';
import {
  austerityStatus,
  belowSafeAfterExport,
  EXPORT_MARGIN_PERMILLE,
  exportTerms,
  formatMoney,
  formatPercent,
  formatPrice,
  formatQuarters,
  formatTonnes,
  importTerms,
  ORDER_STEP_TONNES,
  plannedExport,
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
  /** The goods the player means to buy or sell abroad when the quarter ends. */
  readonly planned: readonly TradeOrder[];
  /** Plans what to buy or sell this quarter, or takes a plan back. */
  readonly onPlan: (planned: readonly TradeOrder[]) => void;
}

/** A price with its sign, in dollars: `+$12` or `−$8`. */
function formatSignedDollars(dollars: number): string {
  return `${dollars > 0 ? '+' : dollars < 0 ? '−' : ''}$${Math.abs(dollars)}`;
}

/**
 * Trade with the world. The world grain price, with its trend, what moved it and the range it
 * could reach; grain ordered for the national reserve at that price, and grain sold from it at
 * that price less the export margin. The cost or income is shown before the order is planned,
 * with a warning when a sale would take the reserve below its safe level, and like a loan the
 * order can be taken back until the quarter ends, when the grain is shipped and paid for.
 */
export function TradePanel({ game, preview, planned, onPlan }: TradePanelProps) {
  const status = priceStatus(game, 'grain');
  const [tonnes, setTonnes] = useState(10 * ORDER_STEP_TONNES);
  const terms = importTerms(game, 'grain', tonnes, planned);
  const [selling, setSelling] = useState(10 * ORDER_STEP_TONNES);
  const sale = exportTerms(game, 'grain', selling, planned);
  const imported = plannedImport(planned, 'grain');
  const exported = plannedExport(planned, 'grain');
  const austerity = austerityStatus(game);

  return (
    <DecisionPanel
      id="trade"
      title="Trade"
      note={
        <span className="section-note">
          {preview.trade.imported > 0
            ? `${formatTonnes(preview.trade.imported)} of grain ordered`
            : preview.trade.exported > 0
              ? `${formatTonnes(preview.trade.exported)} of grain to sell`
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

      {imported !== undefined && (
        <PlannedOrder
          title={`Grain import of ${formatTonnes(imported.tonnes)}`}
          group="Grain import"
          cancel="Cancel the grain import"
          onCancel={() => {
            onPlan(planned.filter((each) => each !== imported));
          }}
        >
          It reaches the national reserve, and {formatMoney(preview.trade.paid)} leaves the
          treasury, when this quarter ends.
        </PlannedOrder>
      )}
      {exported !== undefined && (
        <PlannedOrder
          title={`Grain export of ${formatTonnes(exported.tonnes)}`}
          group="Grain export"
          cancel="Cancel the grain export"
          onCancel={() => {
            onPlan(planned.filter((each) => each !== exported));
          }}
          warning={belowSafeAfterExport(game, planned)}
        >
          It is set aside from the national reserve at once, and is shipped and{' '}
          {formatMoney(preview.trade.earned)} reaches the treasury when this quarter ends.
        </PlannedOrder>
      )}
      {imported === undefined && exported === undefined && (
        <>
          <h3 className="label" id="import-title">
            Import grain
          </h3>
          <div className="loan__choice" role="group" aria-labelledby="import-title">
            <label htmlFor="import-tonnes">Tonnes to buy</label>
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

          <h3 className="label" id="export-title">
            Export grain
          </h3>
          <div className="loan__choice" role="group" aria-labelledby="export-title">
            <label htmlFor="export-tonnes">Tonnes to sell</label>
            <input
              id="export-tonnes"
              type="number"
              min={ORDER_STEP_TONNES}
              step={ORDER_STEP_TONNES}
              value={selling}
              onChange={(event) => {
                setSelling(Number(event.target.value));
              }}
            />
          </div>
          <div className="loan__terms" role="group" aria-label="Export terms">
            <div className="fixed-costs__row">
              <span>Income</span>
              <span className="fixed-costs__note">
                At {formatPrice(sale.dollarsPerTonne)}, the world price less{' '}
                {formatPercent(EXPORT_MARGIN_PERMILLE, 0)}
              </span>
              <span className="slider__value">{formatMoney(sale.income)}</span>
            </div>
            {sale.unavailable !== null && <p className="warning-note">▲ {sale.unavailable}</p>}
            {sale.unavailable === null && sale.belowSafe && (
              <p className="warning-note">
                ▲{' '}
                {belowSafeAfterExport(game, [
                  { good: 'grain', direction: 'export', tonnes: selling },
                ])}
              </p>
            )}
            <button
              type="button"
              className="button"
              disabled={sale.unavailable !== null}
              onClick={() => {
                onPlan([...planned, { good: 'grain', direction: 'export', tonnes: selling }]);
              }}
            >
              Sell grain
            </button>
          </div>
        </>
      )}
      <p className="section-empty">
        Grain bought abroad goes to the national reserve. It arrives, and is paid for at this
        quarter’s price, when the quarter ends. Grain sold abroad comes from the reserve and fetches
        that price less {formatPercent(EXPORT_MARGIN_PERMILLE, 0)}, paid when the quarter ends.
        Grain cannot be both bought and sold in one quarter.
        {austerity !== null && ' Austerity bars neither: austerity starves no one.'}
      </p>
    </DecisionPanel>
  );
}

interface PlannedOrderProps {
  readonly title: string;
  /** The accessible name of the order's group. */
  readonly group: string;
  /** The accessible name of the button that takes it back. */
  readonly cancel: string;
  readonly onCancel: () => void;
  /** A danger the order brings, or null. */
  readonly warning?: string | null;
  readonly children: ReactNode;
}

/** An order planned for this quarter, which can be taken back until the quarter ends. */
function PlannedOrder({ title, group, cancel, onCancel, warning, children }: PlannedOrderProps) {
  return (
    <div className="loan" role="group" aria-label={group}>
      <div className="loan__head">
        <span className="loan__name">{title}</span>
        <span className="loan__state">Planned</span>
      </div>
      <div className="project__planned">
        <p className="project__note">{children}</p>
        <button type="button" className="button" aria-label={cancel} onClick={onCancel}>
          Cancel
        </button>
      </div>
      {warning !== undefined && warning !== null && <p className="warning-note">▲ {warning}</p>}
    </div>
  );
}
