import { useEffect, useRef } from 'react';
import {
  electionStatus,
  formatMoney,
  formatPercent,
  monthsOfFood,
  type GameState,
  type VitalSigns,
  formatQuarters,
} from '../sim';
import { TrendLine } from './TrendLine';

interface GameSummaryProps {
  readonly game: GameState;
  /** Starts the same game again: the same country and the same seed. */
  readonly onReplay: () => void;
  /** Leaves this game for a new one. */
  readonly onNewGame: () => void;
}

/** One vital sign over the term, as the summary's table and trend line show it. */
interface TermFigure {
  readonly label: string;
  readonly valueOf: (record: VitalSigns) => number;
  readonly format: (value: number) => string;
}

const FIGURES: readonly TermFigure[] = [
  { label: 'Treasury', valueOf: (record) => record.treasury, format: formatMoney },
  {
    label: 'Food reserve',
    valueOf: (record) => monthsOfFood(record.foodReserve, record.quarterlyConsumption),
    format: (months) => `${months.toFixed(1)} months`,
  },
  { label: 'Approval', valueOf: (record) => record.approval, format: formatPercent },
];

/**
 * The end of the game, whichever way it ended: the outcome, its cause, and the main
 * figures over the term. From here the player replays the same game or starts another.
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
  const played = history.length - 1;
  const term = electionStatus(game).termQuarters;

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
          {played === term
            ? `The term ran its full ${formatQuarters(term)}.`
            : `Your government fell after ${formatQuarters(played)} of a ${term}-quarter term.`}
          {outcome.cause === 'famine' &&
            ' The warnings were in the quarterly reports and on the map: food relief sent in time would have held the famine off.'}
        </p>
      </div>

      <table className="term-figures" aria-label="The term in figures">
        <thead>
          <tr>
            <td />
            <th scope="col">Start</th>
            <th scope="col">End</th>
            <th scope="col">Lowest</th>
            <th scope="col">Highest</th>
            <th scope="col">Over the term</th>
          </tr>
        </thead>
        <tbody>
          {FIGURES.map(({ label, valueOf, format }) => {
            const values = history.map(valueOf);
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
