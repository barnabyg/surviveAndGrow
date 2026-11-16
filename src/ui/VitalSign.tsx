import { useId, useState, type ReactNode } from 'react';
import type { Figure } from '../sim';

interface VitalSignProps {
  readonly label: string;
  readonly value: string;
  /** The unit the value is counted in, when it is not part of the value itself. */
  readonly unit?: string;
  /** What moved the figure last quarter, or null before any quarter has ended. */
  readonly figure: Figure | null;
  /** How one contribution is written in the breakdown, with its sign. */
  readonly formatChange: (change: number) => string;
  /** How the size of the quarter's change is written beneath the figure, without a sign. */
  readonly formatMovement: (size: number) => string;
  /** A standing remark beneath the figure, such as a warning that it is below a safe level. */
  readonly remark?: { readonly text: string; readonly tone: 'warning' | 'danger' } | undefined;
  /** A standing fact worth keeping in view, such as the level at which trouble begins. */
  readonly note?: string | undefined;
  /** The heading of the breakdown, such as "What moved the treasury". */
  readonly breakdownTitle: string;
  /** More to show in the breakdown, beneath what moved the figure. */
  readonly children?: ReactNode;
}

/**
 * One of the always-visible figures in the top bar. It shows its change this quarter, and
 * opens to list everything that contributed to the change.
 */
export function VitalSign(props: VitalSignProps) {
  const { label, value, unit, figure, formatChange, formatMovement, breakdownTitle } = props;
  const { remark, note, children } = props;
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
        <span className="vital__value">
          {value}
          {unit !== undefined && <span className="vital__unit"> {unit}</span>}
        </span>
      </button>
      <Movement figure={figure} formatMovement={formatMovement} />
      {remark && (
        <div className={`vital__remark vital__remark--${remark.tone}`}>▲ {remark.text}</div>
      )}
      {note !== undefined && <div className="vital__note">{note}</div>}

      {open && (
        <section className="breakdown" id={panelId} aria-labelledby={titleId}>
          <h2 className="label" id={titleId}>
            {breakdownTitle}
          </h2>
          {figure === null ? (
            <p className="breakdown__empty">Nothing has moved it yet. End a quarter to see.</p>
          ) : (
            <table className="breakdown__table" aria-labelledby={titleId}>
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
          {children}
        </section>
      )}
    </div>
  );
}

interface MovementProps {
  readonly figure: Figure | null;
  readonly formatMovement: (size: number) => string;
}

/** The change this quarter. An arrow and words carry the direction; colour only adds to them. */
function Movement({ figure, formatMovement }: MovementProps) {
  if (figure === null) return <div className="vital__change">Opening position</div>;
  if (figure.change === 0) return <div className="vital__change">No change this quarter</div>;
  const rose = figure.change > 0;
  // The arrow gives the direction, so the amount is written without a sign.
  return (
    <div className={`vital__change vital__change--${rose ? 'good' : 'bad'}`}>
      {rose ? '▲' : '▼'} {formatMovement(Math.abs(figure.change))} this quarter
    </div>
  );
}
