import { useState } from 'react';
import { advanceQuarter, type GameState, type TurnReport } from '../sim';
import { BudgetPanel, countChanges } from './BudgetPanel';
import { ConfirmDialog } from './ConfirmDialog';
import { MapView } from './MapView';
import { ReportList } from './ReportList';
import { TopBar } from './TopBar';

export function GameScreen({ initialGame }: { readonly initialGame: GameState }) {
  const [game, setGame] = useState(initialGame);
  const [report, setReport] = useState<TurnReport | null>(null);
  // The committed budget is what the quarter will be resolved with. The pending budget is
  // what the sliders show, and it counts for nothing until the player commits it.
  const [committed, setCommitted] = useState(initialGame.budget);
  const [pending, setPending] = useState(initialGame.budget);
  const [confirmingEnd, setConfirmingEnd] = useState(false);

  const resolveQuarter = () => {
    const result = advanceQuarter(game, { budget: committed });
    setGame(result.state);
    setReport(result.report);
    setConfirmingEnd(false);
  };

  const endQuarter = () => {
    if (countChanges(pending, committed) > 0) {
      setConfirmingEnd(true);
    } else {
      resolveQuarter();
    }
  };

  return (
    <div className="game">
      <TopBar game={game} report={report} onEndQuarter={endQuarter} />
      <div className="columns">
        <aside className="column column--situation" aria-label="Situation">
          <ReportList report={report} />
        </aside>
        <main className="column column--country" aria-label="Country">
          <MapView country={game.country} />
        </main>
        <aside className="column column--decisions" aria-label="Decisions">
          <BudgetPanel
            game={game}
            committed={committed}
            pending={pending}
            onChange={setPending}
            onCommit={() => {
              setCommitted(pending);
            }}
            onReset={() => {
              setPending(committed);
            }}
          />
        </aside>
      </div>

      {confirmingEnd && (
        <ConfirmDialog
          title="You have changes you have not committed"
          cancelLabel="Go back"
          confirmLabel="End quarter anyway"
          onCancel={() => {
            setConfirmingEnd(false);
          }}
          onConfirm={resolveQuarter}
        >
          The budget changes on screen have not been committed. If you end the quarter now, it is
          resolved with the last budget you committed, and the changes stay pending.
        </ConfirmDialog>
      )}
    </div>
  );
}
