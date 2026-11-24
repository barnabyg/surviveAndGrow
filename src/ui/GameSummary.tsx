import { useEffect, useRef } from 'react';
import {
  formatIndex,
  formatMoney,
  formatPercent,
  monthsOfFood,
  termRecords,
  type GameState,
  type TermRecord,
  type VitalSigns,
  formatQuarters,
} from '../sim';
import { formatDate } from './format';
import { TrendLine } from './TrendLine';
import './GameSummary.css';

interface GameSummaryProps {
  readonly game: GameState;
  /** Starts the same game again: the same country and the same seed. */
  readonly onReplay: () => void;
  /** Leaves this game for a new one. */
  readonly onNewGame: () => void;
}

/** One vital sign over the game, as the summary's table and trend line show it. */
interface GameFigure {
  readonly label: string;
  /** The figure in a record, or null where the record does not hold it. */
  readonly valueOf: (record: VitalSigns) => number | null;
  readonly format: (value: number) => string;
}

const FIGURES: readonly GameFigure[] = [
  { label: 'Treasury', valueOf: (record) => record.treasury, format: formatMoney },
  { label: 'Debt', valueOf: (record) => record.debt, format: formatMoney },
  { label: 'Debt burden', valueOf: (record) => record.debtBurden, format: formatPercent },
  {
    label: 'Food reserve',
    valueOf: (record) => monthsOfFood(record.foodReserve, record.quarterlyConsumption),
    format: (months) => `${months.toFixed(1)} months`,
  },
  { label: 'Approval', valueOf: (record) => record.approval, format: formatPercent },
  // Quarters recorded before the army was kept are left out.
  { label: 'Army loyalty', valueOf: (record) => record.armyLoyalty, format: formatPercent },
  // Quarters recorded before prosperity was measured are left out.
  {
    label: 'Prosperity',
    valueOf: (record) => record.prosperity,
    format: (value) => formatIndex(value),
  },
];

/** How each term ended, in a few words. */
const TERM_ENDINGS: Readonly<Record<TermRecord['ending'], string>> = {
  reelected: 'Re-elected',
  defeated: '▲ Lost the election',
  collapsed: '▲ The state collapsed',
  overthrown: '▲ The army took power',
  won: '★ Won on prosperity',
  inOffice: 'In office',
};

/** How long the government lasted, over how many terms, in a sentence. */
function tenure(terms: readonly TermRecord[]): string {
  const quarters = terms.reduce((total, term) => total + term.quarters, 0);
  const count = terms.length === 1 ? 'one term' : `${terms.length} terms`;
  return `Your government was in office for ${formatQuarters(quarters)}, over ${count}.`;
}

/**
 * The end of the game, whichever way it ended: the outcome and its cause, the terms served,
 * and the main figures over the whole game, debt, army loyalty and prosperity among them, term by
 * term. From here
 * the player replays the same game or starts another.
 */
export function GameSummary({ game, onReplay, onNewGame }: GameSummaryProps) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
  }, []);

  const { outcome, history } = game;
  if (outcome.status === 'playing') return null;
  const won = outcome.status === 'won';
  const terms = termRecords(game);

  return (
    <dialog
      ref={dialog}
      className={won ? 'dialog dialog--summary' : 'dialog dialog--summary dialog--danger'}
      aria-labelledby="game-summary-title"
      onCancel={(event) => {
        // The game is over; there is nothing behind this to go back to.
        event.preventDefault();
      }}
    >
      <div className={won ? 'label label--good' : 'label label--danger'}>
        {won ? '★ You have won' : '▲ You have lost'}
      </div>
      <h2 className="dialog__title" id="game-summary-title">
        {outcome.headline}
      </h2>
      <div className="dialog__body">
        <p>{outcome.summary}</p>
        <p>
          {tenure(terms)}
          {outcome.cause === 'famine' &&
            ' The warnings were in the quarterly reports and on the map: food relief sent in time would have held the famine off.'}
          {outcome.cause === 'coup' &&
            ' The count was in the top bar, the quarterly reports and the risks ahead: Defence spending restored in time would have brought the army back from plotting.'}
        </p>
      </div>

      <table className="term-figures" aria-label="The game in figures">
        <thead>
          <tr>
            <td />
            <th scope="col">Start</th>
            <th scope="col">End</th>
            <th scope="col">Lowest</th>
            <th scope="col">Highest</th>
            <th scope="col">Over the game</th>
          </tr>
        </thead>
        <tbody>
          {FIGURES.map(({ label, valueOf, format }) => {
            const values = history.flatMap((record) => valueOf(record) ?? []);
            if (values.length === 0) return null;
            return (
              <tr key={label}>
                <th scope="row">{label}</th>
                <td>{format(values[0] ?? 0)}</td>
                <td>{format(values.at(-1) ?? 0)}</td>
                <td>{format(Math.min(...values))}</td>
                <td>{format(Math.max(...values))}</td>
                <td className="term-figures__trend">
                  <TrendLine subject={label} values={values} format={format} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <table className="term-figures" aria-label="Term by term">
        <thead>
          <tr>
            <td />
            <th scope="col">From</th>
            <th scope="col">To</th>
            <th scope="col">Prosperity</th>
            <th scope="col">How it ended</th>
          </tr>
        </thead>
        <tbody>
          {terms.map((term) => (
            <tr key={term.term}>
              <th scope="row">Term {term.term}</th>
              <td>{formatDate(term.from)}</td>
              <td>{formatDate(term.to)}</td>
              <td>{prosperityOver(term)}</td>
              <td className="term-figures__ending">{TERM_ENDINGS[term.ending]}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="dialog__seed">
        Seed {game.seed}. Replaying starts the same game again: the same weather and the same
        campaign, to play differently.
      </p>
      <div className="button-row">
        <button type="button" className="button" onClick={onReplay}>
          Replay this game
        </button>
        <button type="button" className="button button--commit" onClick={onNewGame}>
          Start a new game
        </button>
      </div>
    </dialog>
  );
}

/** Prosperity from the start of a term to the end of it: `23.7 → 41.2`. */
function prosperityOver({ prosperity }: TermRecord): string {
  const { start, end } = prosperity;
  if (start === null && end === null) return 'Not measured';
  if (start === null || end === null) return formatIndex(start ?? end ?? 0);
  return `${formatIndex(start)} → ${formatIndex(end)}`;
}
