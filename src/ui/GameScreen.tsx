import { useMemo, useState } from 'react';
import {
  advanceQuarter,
  pendingDilemma,
  previewQuarter,
  regionName,
  risksAhead,
  siteSchedule,
  type GameState,
  type TurnReport,
} from '../sim';
import { ApprovalChart } from './ApprovalChart';
import { BudgetPanel, countChanges } from './BudgetPanel';
import { ConfirmDialog } from './ConfirmDialog';
import { DilemmaDialog } from './DilemmaDialog';
import { DilemmaPanel } from './DilemmaPanel';
import { ElectionPanel } from './ElectionPanel';
import { GameSummary } from './GameSummary';
import type { Lens } from './lens';
import { LensBar } from './LensBar';
import { MapLegend } from './MapLegend';
import { MapView } from './MapView';
import { ProjectsPanel } from './ProjectsPanel';
import { RegionCard } from './RegionCard';
import { RegionList } from './RegionList';
import { ReliefPanel } from './ReliefPanel';
import { ReportList } from './ReportList';
import { RisksPanel } from './RisksPanel';
import { SiteCard } from './SiteCard';
import { Timeline } from './Timeline';
import { TopBar } from './TopBar';

interface GameScreenProps {
  readonly initialGame: GameState;
  /** The report on the quarter before, when the game is resumed from a save; otherwise null. */
  readonly initialReport: TurnReport | null;
  /** Why the game is not being saved, in words for the player, or null when it is. */
  readonly saveNotice: string | null;
  /** Called with the game and its report as each quarter ends, which is when it is saved. */
  readonly onQuarterEnded: (game: GameState, report: TurnReport) => void;
  /** Starts the same game again from its first quarter. */
  readonly onReplay: () => void;
  /** Leaves this game for the start screen, where a new one begins. */
  readonly onNewGame: () => void;
  /**
   * Gives up the game in play, which the player has confirmed: its save is forgotten, and
   * it is either replayed from its first quarter or left for the start screen.
   */
  readonly onRestart: (how: 'replay' | 'new') => void;
}

export function GameScreen(props: GameScreenProps) {
  const { initialGame, initialReport, saveNotice, onQuarterEnded, onReplay, onNewGame, onRestart } =
    props;
  const [game, setGame] = useState(initialGame);
  const [report, setReport] = useState<TurnReport | null>(initialReport);
  // The committed budget is what the quarter will be resolved with. The pending budget is
  // what the sliders show, and it counts for nothing until the player commits it.
  const [committed, setCommitted] = useState(initialGame.budget);
  const [pending, setPending] = useState(initialGame.budget);
  // Relief goes on being sent where it was last sent, as the budget in force goes on.
  const [reliefRegionId, setReliefRegionId] = useState<string | null>(initialGame.reliefRegionId);
  // One thing is picked out on the map at a time: a region or a site. Its card is the one shown.
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  // The sites the player means to start building on. Building begins when the quarter
  // ends, so until then a plan can be taken back, like the relief target.
  const [plannedSiteIds, setPlannedSiteIds] = useState<readonly string[]>([]);
  // The report the player last selected, by its place in the list. It counts as selected
  // only while its region is still the one picked out on the map.
  const [reportPicked, setReportPicked] = useState<number | null>(null);
  // The same for a risk the player selected, kept by its headline since the list changes.
  const [riskPicked, setRiskPicked] = useState<string | null>(null);
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const [confirmingRestart, setConfirmingRestart] = useState(false);
  // The answer to the quarter's dilemma, if it has one. Like the relief target it is held
  // with the other decisions and can be changed until the quarter ends. The dilemma is put
  // to the player as its quarter begins, and again if they try to end the quarter without
  // an answer.
  const [dilemmaChoice, setDilemmaChoice] = useState<string | null>(null);
  const [dilemmaShown, setDilemmaShown] = useState<'no' | 'yes' | 'pressed'>(
    initialGame.dilemma === null ? 'no' : 'yes',
  );
  // What the map shows. It is the player's choice and stays put from quarter to quarter.
  const [lens, setLens] = useState<Lens>('country');

  const playing = game.outcome.status === 'playing';
  const decisions = {
    budget: committed,
    reliefRegionId,
    startProjects: plannedSiteIds,
    dilemmaChoice,
  };
  const dilemma = playing ? pendingDilemma(game) : null;
  const preview = playing ? previewQuarter(game, decisions) : null;
  // The risks answer to the decisions in force, not to sliders the player is still moving.
  const risks = useMemo(
    () =>
      playing
        ? risksAhead(game, {
            budget: committed,
            reliefRegionId,
            startProjects: plannedSiteIds,
            dilemmaChoice,
          })
        : [],
    [playing, game, committed, reliefRegionId, plannedSiteIds, dilemmaChoice],
  );
  const pickedRisk = risks.findIndex(
    (risk) => risk.headline === riskPicked && risk.regionId === selectedRegionId,
  );
  const selectedRisk = pickedRisk === -1 ? null : pickedRisk;
  // The timeline shows every project, and the site picked out on the map if it is still
  // empty and unplanned, as if building there began now.
  const schedule =
    preview?.schedule ?? game.projects.map((project) => siteSchedule(game, project.siteId));
  const considered =
    playing && selectedSiteId !== null && !schedule.some((entry) => entry.siteId === selectedSiteId)
      ? siteSchedule(game, selectedSiteId)
      : null;
  const selectedEntry =
    reportPicked !== null && report?.entries[reportPicked]?.regionId === selectedRegionId
      ? reportPicked
      : null;

  const selectRegion = (regionId: string | null) => {
    setSelectedRegionId(regionId);
    setSelectedSiteId(null);
  };
  const selectSite = (siteId: string | null) => {
    setSelectedSiteId(siteId);
    setSelectedRegionId(null);
  };

  // Planning a project picks its site out on the map, so the player sees where it will stand.
  const planSite = (siteId: string, planned: boolean) => {
    setPlannedSiteIds(
      planned
        ? [...plannedSiteIds.filter((id) => id !== siteId), siteId]
        : plannedSiteIds.filter((id) => id !== siteId),
    );
    if (planned) selectSite(siteId);
  };

  // Selecting a report picks its region out on the map; selecting it again lets go.
  const selectEntry = (index: number) => {
    const regionId = report?.entries[index]?.regionId;
    if (regionId === undefined) return;
    setReportPicked(index === selectedEntry ? null : index);
    selectRegion(index === selectedEntry ? null : regionId);
  };

  // A risk to one region picks that region out the same way.
  const selectRisk = (index: number) => {
    const risk = risks[index];
    if (risk?.regionId === undefined) return;
    setRiskPicked(index === selectedRisk ? null : risk.headline);
    selectRegion(index === selectedRisk ? null : risk.regionId);
  };

  const resolveQuarter = () => {
    const result = advanceQuarter(game, decisions);
    setGame(result.state);
    setReport(result.report);
    setReportPicked(null);
    setPlannedSiteIds([]);
    setConfirmingEnd(false);
    setDilemmaChoice(null);
    setDilemmaShown(result.state.dilemma === null ? 'no' : 'yes');
    onQuarterEnded(result.state, result.report);
  };

  const endQuarter = () => {
    if (dilemma !== null && dilemmaChoice === null) {
      setDilemmaShown('pressed');
    } else if (countChanges(pending, committed) > 0) {
      setConfirmingEnd(true);
    } else {
      resolveQuarter();
    }
  };

  return (
    <div className="game">
      <TopBar
        game={game}
        report={report}
        onEndQuarter={endQuarter}
        onRestart={() => {
          setConfirmingRestart(true);
        }}
      />
      <div className="columns">
        <aside className="column column--situation" aria-label="Situation">
          {saveNotice !== null && (
            <p className="warning-note" role="status">
              ▲ {saveNotice}
            </p>
          )}
          <ReportList report={report} selectedEntry={selectedEntry} onSelectEntry={selectEntry} />
          {playing && (
            <RisksPanel risks={risks} selectedRisk={selectedRisk} onSelectRisk={selectRisk} />
          )}
          <RegionList
            game={game}
            selectedRegionId={selectedRegionId}
            onSelectRegion={selectRegion}
          />
          <ApprovalChart game={game} />
        </aside>
        <main className="column column--country" aria-label="Country">
          <LensBar game={game} lens={lens} onChange={setLens} />
          <div className="map-frame">
            <div className="map-stage">
              <MapView
                game={game}
                lens={lens}
                selectedRegionId={selectedRegionId}
                reliefRegionId={reliefRegionId}
                onSelectRegion={selectRegion}
                selectedSiteId={selectedSiteId}
                onSelectSite={selectSite}
                plannedSiteIds={plannedSiteIds}
              />
              {preview !== null && selectedRegionId !== null && (
                <RegionCard
                  game={game}
                  regionId={selectedRegionId}
                  preview={preview}
                  reliefRegionId={reliefRegionId}
                  onSendRelief={setReliefRegionId}
                  onClose={() => {
                    selectRegion(null);
                  }}
                />
              )}
              {selectedSiteId !== null && (
                <SiteCard
                  game={game}
                  siteId={selectedSiteId}
                  plannedSiteIds={plannedSiteIds}
                  schedule={schedule}
                  pausedSites={preview?.pausedSites ?? []}
                  onPlan={planSite}
                  onClose={() => {
                    selectSite(null);
                  }}
                />
              )}
            </div>
          </div>
          <div className="map-footer">
            <Timeline
              game={game}
              schedule={schedule}
              considered={considered}
              pausedSites={preview?.pausedSites ?? []}
              onSelectSite={selectSite}
            />
            <MapLegend />
          </div>
        </main>
        <aside className="column column--decisions" aria-label="Decisions">
          {preview !== null && (
            <>
              {dilemma !== null && (
                <DilemmaPanel
                  dilemma={dilemma}
                  chosen={dilemmaChoice}
                  onOpen={() => {
                    setDilemmaShown('yes');
                  }}
                />
              )}
              <BudgetPanel
                game={game}
                committed={committed}
                pending={pending}
                reliefRegionId={reliefRegionId}
                startProjects={plannedSiteIds}
                dilemmaChoice={dilemmaChoice}
                onChange={setPending}
                onCommit={() => {
                  setCommitted(pending);
                }}
                onReset={() => {
                  setPending(committed);
                }}
              />
              <ProjectsPanel
                game={game}
                preview={preview}
                plannedSiteIds={plannedSiteIds}
                onPlan={planSite}
              />
              <ReliefPanel
                game={game}
                preview={preview}
                reliefSpending={committed.spending.foodRelief}
                reliefRegionId={reliefRegionId}
                onSendRelief={setReliefRegionId}
              />
              <ElectionPanel game={game} preview={preview} />
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
      {confirmingRestart && (
        <ConfirmDialog
          title="Restart this game?"
          cancelLabel="Keep playing"
          confirmLabel="Replay this game"
          onCancel={() => {
            setConfirmingRestart(false);
          }}
          onConfirm={() => {
            onRestart('replay');
          }}
          alternative={{
            label: 'New game',
            onChoose: () => {
              onRestart('new');
            },
          }}
        >
          Everything played so far is lost, and the saved game with it. Replaying starts this game
          again from its first quarter, with the same weather and the same events. A new game goes
          back to the start screen.
        </ConfirmDialog>
      )}
      {dilemma !== null && dilemmaShown !== 'no' && (
        <DilemmaDialog
          dilemma={dilemma}
          regionName={dilemma.regionId === null ? null : regionName(game.country, dilemma.regionId)}
          chosen={dilemmaChoice}
          pressed={dilemmaShown === 'pressed'}
          onChoose={(optionId) => {
            setDilemmaChoice(optionId);
            setDilemmaShown('no');
          }}
          onLater={() => {
            setDilemmaShown('no');
          }}
        />
      )}
      {!playing && <GameSummary game={game} onReplay={onReplay} onNewGame={onNewGame} />}
    </div>
  );
}
