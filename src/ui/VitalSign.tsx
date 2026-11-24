import { useId, useState, type ReactNode } from 'react';
import type { Contribution, Figure } from '../sim';
import './VitalSign.css';

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
  /** Which way the figure moving is good news, coloured so. It is rising unless said. */
  readonly goodWhen?: 'rising' | 'falling';
  /**
   * A standing remark beneath the figure: a warning, such as that it is below a safe level, or
   * in the plain tone how the figure stands in a word, such as the stage it is read as.
   */
  readonly remark?:
    { readonly text: string; readonly tone: 'plain' | 'warning' | 'danger' } | undefined;
  /** A standing fact worth keeping in view, such as the level at which trouble begins. */
  readonly note?: string | undefined;
  /** The figure's trend line, drawn beside it. */
  readonly trend?: ReactNode;
  /** The heading of the breakdown, such as "What moved the treasury". */
  readonly breakdownTitle: string;
  /** More to show in the breakdown, beneath what moved the figure. */
  readonly children?: ReactNode;
}

/**
 * One of the always-visible figures in the top bar. It shows its change this quarter, and
 * opens to list everything that contributed to the change. A remark stays in view beneath it,
 * marked with a sign when it is a warning; the standing note is in the tooltip, and read out
 * with the figure.
 */
export function VitalSign(props: VitalSignProps) {
  const { label, value, unit, figure, formatChange, formatMovement, breakdownTitle } = props;
  const { remark, note, trend, children, goodWhen = 'rising' } = props;
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const titleId = useId();

  return (
    <div
      className="vital"
      role="group"
      aria-label={label}
      title={[remark?.text, note].filter((text) => text !== undefined).join(' · ') || undefined}
    >
      <div className="vital__figures">
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
        <Movement figure={figure} formatMovement={formatMovement} goodWhen={goodWhen} />
        {remark && (
          <div className={`vital__remark vital__remark--${remark.tone}`}>
            {remark.tone !== 'plain' && '▲ '}
            {remark.text}
          </div>
        )}
        {note !== undefined && <span className="visually-hidden">{note}</span>}
      </div>
      {trend}

      {open && (
        <section className="breakdown" id={panelId} aria-labelledby={titleId}>
          <h2 className="label" id={titleId}>
            {breakdownTitle}
          </h2>
          {note !== undefined && <p className="vital__note">{note}</p>}
          {figure === null ? (
            <p className="breakdown__empty">Nothing has moved it yet. End a quarter to see.</p>
          ) : (
            <table className="breakdown__table" aria-labelledby={titleId}>
              <tbody>
                {figure.contributions.map((line) => (
                  <BreakdownRows key={line.label} line={line} format={formatChange} />
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

/**
 * One line of a breakdown, and beneath it the parts it is split into, each with the few words
 * that say what lies behind it.
 */
export function BreakdownRows({
  line,
  format,
}: {
  readonly line: Contribution;
  readonly format: (amount: number) => string;
}) {
  return (
    <>
      <tr>
        <th scope="row">{line.label}</th>
        <td>{format(line.amount)}</td>
      </tr>
      {line.parts?.map((part) => (
        <tr key={part.label} className="breakdown__part">
          <th scope="row">
            {part.label}
            {part.note !== undefined && <span className="breakdown__why"> · {part.note}</span>}
          </th>
          <td>{format(part.amount)}</td>
        </tr>
      ))}
    </>
  );
}

interface MovementProps {
  readonly figure: Figure | null;
  readonly formatMovement: (size: number) => string;
  readonly goodWhen: 'rising' | 'falling';
}

/** The change this quarter. An arrow and words carry the direction; colour only adds to them. */
function Movement({ figure, formatMovement, goodWhen }: MovementProps) {
  if (figure === null) return <div className="vital__change">Opening position</div>;
  if (figure.change === 0) return <div className="vital__change">No change this quarter</div>;
  const rose = figure.change > 0;
  const good = rose === (goodWhen === 'rising');
  // The arrow gives the direction, so the amount is written without a sign.
  return (
    <div className={`vital__change vital__change--${good ? 'good' : 'bad'}`}>
      {rose ? '▲' : '▼'} {formatMovement(Math.abs(figure.change))} this quarter
    </div>
  );
}
