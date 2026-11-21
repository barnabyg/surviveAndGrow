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
 * A good's world price, with its trend over the quarters just gone, what moved it last quarter
 * and the range it could reach within the forecast.
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
          its usual {formatPrice(status.usual)}. The forecast is the range it could reach if markets
          moved it the same way every quarter.
        </p>
      </VitalSign>
    </div>
  );
}
