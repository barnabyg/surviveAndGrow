import { useState } from 'react';
import { advanceQuarter, previewQuarter, type GameState, type TurnReport } from '../sim';
import { ApprovalChart } from './ApprovalChart';
import { BudgetPanel, countChanges } from './BudgetPanel';
import { ConfirmDialog } from './ConfirmDialog';
import { GameOverDialog } from './GameOverDialog';
import { MapView } from './MapView';
import { RegionCard } from './RegionCard';
import { RegionList } from './RegionList';
import { ReliefPanel } from './ReliefPanel';
import { ReportList } from './ReportList';
import { TopBar } from './TopBar';

interface GameScreenProps {
  readonly initialGame: GameState;
  /** Leaves this game for the start screen. */
  readonly onRestart: () => void;
}

export function GameScreen({ initialGame, onRestart }: GameScreenProps) {
  const [game, setGame] = useState(initialGame);
  const [report, setReport] = useState<TurnReport | null>(null);
  // The committed budget is what the quarter will be resolved with. The pending budget is
  // what the sliders show, and it counts for nothing until the player commits it.
  const [committed, setCommitted] = useState(initialGame.budget);
  const [pending, setPending] = useState(initialGame.budget);
  const [reliefRegionId, setReliefRegionId] = useState<string | null>(null);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  // The report the player last selected, by its place in the list. It counts as selected
  // only while its region is still the one picked out on the map.
  const [reportPicked, setReportPicked] = useState<number | null>(null);
  const [confirmingEnd, setConfirmingEnd] = useState(false);

  const playing = game.outcome.status === 'playing';
  const decisions = { budget: committed, reliefRegionId };
  const preview = playing ? previewQuarter(game, decisions) : null;
  const selectedEntry =
    reportPicked !== null && report?.entries[reportPicked]?.regionId === selectedRegionId
      ? reportPicked
      : null;

  // Selecting a report picks its region out on the map; selecting it again lets go.
  const selectEntry = (index: number) => {
    const regionId = report?.entries[index]?.regionId;
    if (regionId === undefined) return;
    setReportPicked(index === selectedEntry ? null : index);
    setSelectedRegionId(index === selectedEntry ? null : regionId);
  };

  const resolveQuarter = () => {
    const result = advanceQuarter(game, decisions);
    setGame(result.state);
    setReport(result.report);
    setReportPicked(null);
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
          <ReportList report={report} selectedEntry={selectedEntry} onSelectEntry={selectEntry} />
          <RegionList
            game={game}
            selectedRegionId={selectedRegionId}
            onSelectRegion={setSelectedRegionId}
          />
          <ApprovalChart game={game} />
        </aside>
        <main className="column column--country" aria-label="Country">
          <div className="map-frame">
            <MapView
              game={game}
              selectedRegionId={selectedRegionId}
              reliefRegionId={reliefRegionId}
              onSelectRegion={setSelectedRegionId}
            />
            {preview !== null && selectedRegionId !== null && (
              <RegionCard
                game={game}
                regionId={selectedRegionId}
                preview={preview}
                reliefRegionId={reliefRegionId}
                onSendRelief={setReliefRegionId}
                onClose={() => {
                  setSelectedRegionId(null);
                }}
              />
            )}
          </div>
        </main>
        <aside className="column column--decisions" aria-label="Decisions">
          {preview !== null && (
            <>
              <BudgetPanel
                game={game}
                committed={committed}
                pending={pending}
                reliefRegionId={reliefRegionId}
                onChange={setPending}
                onCommit={() => {
                  setCommitted(pending);
                }}
                onReset={() => {
                  setPending(committed);
                }}
              />
              <ReliefPanel
                game={game}
                preview={preview}
                reliefSpending={committed.spending.foodRelief}
                reliefRegionId={reliefRegionId}
                onSendRelief={setReliefRegionId}
              />
            </>
          )}
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
      {!playing && <GameOverDialog game={game} onRestart={onRestart} />}
    </div>
  );
}
