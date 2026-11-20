import type { DilemmaView } from '../sim';
import { effectLines } from './DilemmaDialog';
import { DecisionPanel } from './DecisionPanel';
import './DilemmaPanel.css';

interface DilemmaPanelProps {
  readonly dilemma: DilemmaView;
  /** The option chosen so far, or null while the dilemma is unanswered. */
  readonly chosen: string | null;
  /** Opens the dilemma again, to choose or to choose differently. */
  readonly onOpen: () => void;
}

/**
 * The dilemma of the quarter among the player's other decisions: what was chosen and what
 * it will do, or a warning that it is still waiting. It can be reopened until the quarter ends.
 */
export function DilemmaPanel({ dilemma, chosen, onOpen }: DilemmaPanelProps) {
  const option = dilemma.options.find((candidate) => candidate.id === chosen);
  return (
    <DecisionPanel
      id="dilemma-panel"
      title="Decision"
      note={
        <span className={option === undefined ? 'pending-note' : 'section-note'}>
          {option === undefined ? 'Waiting for you' : 'Takes effect when the quarter ends'}
        </span>
      }
    >
      <p className="dilemma-panel__title">{dilemma.title}</p>
      {option === undefined ? (
        <p className="warning-note">▲ The quarter cannot end until you choose.</p>
      ) : (
        <div>
          <p className="dilemma-panel__choice">You chose: {option.label}</p>
          <ul className="dilemma-panel__effects">
            {effectLines(option).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="button-row">
        <button
          type="button"
          className={option === undefined ? 'button button--commit' : 'button'}
          onClick={onOpen}
        >
          {option === undefined ? 'Decide now' : 'Change your choice'}
        </button>
      </div>
    </DecisionPanel>
  );
}
