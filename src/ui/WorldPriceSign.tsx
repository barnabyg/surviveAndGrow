import { formatPrice, formatQuarters, type PriceStatus } from '../sim';
import { formatRange } from './format';
import { recent } from './trend';
import { TrendLine } from './TrendLine';
import { VitalSign } from './VitalSign';
import './WorldPriceSign.css';

/** A price with its sign, in dollars: `+$12` or `−$8`. */
function formatSignedDollars(dollars: number): string {
  return `${dollars > 0 ? '+' : dollars < 0 ? '−' : ''}$${Math.abs(dollars)}`;
}

interface WorldPriceSignProps {
  readonly status: PriceStatus;
  /** Which way the price moving is good news for the country. */
  readonly goodWhen: 'rising' | 'falling';
}

/**
 * A good's world price, with its trend over the quarters just gone, what moved it last quarter,
 * the range it could reach within the forecast, and any world price shock announced or in
 * force on it.
 */
export function WorldPriceSign({ status, goodWhen }: WorldPriceSignProps) {
  const name = `World ${status.name.toLowerCase()} price`;
  return (
    <div className="world-price">
      <VitalSign
        label={name}
        value={`$${status.price}`}
        unit="a tonne"
        figure={status.figure}
        formatChange={formatSignedDollars}
        formatMovement={(dollars) => `$${dollars}`}
        goodWhen={goodWhen}
        note={`Forecast ${formatRange(status.forecast, (price) => `$${price}`)} a tonne over the next ${formatQuarters(status.forecastQuarters)}`}
        breakdownTitle={`What moved the ${name.toLowerCase()}`}
        trend={
          <TrendLine
            subject={name}
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
          its usual {formatPrice(status.usual)}. A world price shock pushes it further each quarter
          it is in force. The forecast is the range it could reach if markets moved it the same way
          every quarter, with the shocks announced pushing it as they will.
        </p>
      </VitalSign>
      {status.shocks.length > 0 && (
        <ul
          className="world-price__shocks"
          aria-label={`World price shocks on ${name.toLowerCase()}`}
        >
          {status.shocks.map((shock) => (
            <li key={shock.type} className="world-price__shock">
              <strong>{shock.inForce ? shock.name : `${shock.name} ahead`}:</strong>{' '}
              {shock.description}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
