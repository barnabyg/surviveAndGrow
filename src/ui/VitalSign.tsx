import { useId, useState } from 'react';
import type { Figure } from '../sim';

interface VitalSignProps {
  readonly label: string;
  readonly value: string;
  /** What moved the figure last quarter, or null before any quarter has ended. */
  readonly figure: Figure | null;
  /** How a change is written, with its sign. */
  readonly formatChange: (change: number) => string;
  /** Whether a rise in this figure is good news. */
  readonly riseIsGood?: boolean;
  /** A standing remark beneath the figure, such as a warning that it is below a safe level. */
  readonly remark?: { readonly text: string; readonly tone: 'warning' | 'danger' };
  /** The heading of the breakdown, such as "What moved the treasury". */
  readonly breakdownTitle: string;
}

/**
 * One of the always-visible figures in the top bar. It shows its change this quarter, and
 * opens to list everything that contributed to the change.
 */
export function VitalSign(props: VitalSignProps) {
  const { label, value, figure, formatChange, riseIsGood = true, remark, breakdownTitle } = props;
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const titleId = useId();

  return (
    <div className="vital" role="group" aria-label={label}>
      <button
        type="button"
        className="vital__button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          setOpen(!open);
        }}
      >
        <span className="label">{label}</span>
        <span className="vital__value">{value}</span>
      </button>
      <Movement figure={figure} formatChange={formatChange} riseIsGood={riseIsGood} />
      {remark && (
        <div className={`vital__remark vital__remark--${remark.tone}`}>▲ {remark.text}</div>
      )}

      {open && (
        <section className="breakdown" id={panelId} aria-labelledby={titleId}>
          <h2 className="label" id={titleId}>
            {breakdownTitle}
          </h2>
          {figure === null ? (
            <p className="breakdown__empty">Nothing has moved it yet. End a quarter to see.</p>
          ) : (
            <table className="breakdown__table">
              <tbody>
                {figure.contributions.map((line) => (
                  <tr key={line.label}>
                    <th scope="row">{line.label}</th>
                    <td>{formatChange(line.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">Change this quarter</th>
                  <td>{formatChange(figure.change)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </section>
      )}
    </div>
  );
}

interface MovementProps {
  readonly figure: Figure | null;
  readonly formatChange: (change: number) => string;
  readonly riseIsGood: boolean;
}

/** The change this quarter. An arrow and words carry the direction; colour only adds to them. */
function Movement({ figure, formatChange, riseIsGood }: MovementProps) {
  if (figure === null) return <div className="vital__change">Opening position</div>;
  if (figure.change === 0) return <div className="vital__change">No change this quarter</div>;
  const rose = figure.change > 0;
  const tone = rose === riseIsGood ? 'good' : 'bad';
  // The arrow gives the direction, so the amount is written without its sign.
  const amount = formatChange(Math.abs(figure.change)).replace(/^\+/, '');
  return (
    <div className={`vital__change vital__change--${tone}`}>
      {rose ? '▲' : '▼'} {amount} this quarter
    </div>
  );
}
