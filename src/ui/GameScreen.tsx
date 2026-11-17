import { useMemo, useState } from 'react';
import {
  advanceQuarter,
  previewQuarter,
  risksAhead,
  siteSchedule,
  type GameState,
  type TurnReport,
} from '../sim';
import { ApprovalChart } from './ApprovalChart';
import { BudgetPanel, countChanges } from './BudgetPanel';
import { ConfirmDialog } from './ConfirmDialog';
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
  /** Starts the same game again from its first quarter. */
  readonly onReplay: () => void;
  /** Leaves this game for the start screen, where a new one begins. */
  readonly onNewGame: () => void;
}

export function GameScreen({ initialGame, onReplay, onNewGame }: GameScreenProps) {
  const [game, setGame] = useState(initialGame);
  const [report, setReport] = useState<TurnReport | null>(null);
  // The committed budget is what the quarter will be resolved with. The pending budget is
  // what the sliders show, and it counts for nothing until the player commits it.
  const [committed, setCommitted] = useState(initialGame.budget);
  const [pending, setPending] = useState(initialGame.budget);
  const [reliefRegionId, setReliefRegionId] = useState<string | null>(null);
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
  // What the map shows. It is the player's choice and stays put from quarter to quarter.
  const [lens, setLens] = useState<Lens>('country');

  const playing = game.outcome.status === 'playing';
  const decisions = { budget: committed, reliefRegionId, startProjects: plannedSiteIds };
  const preview = playing ? previewQuarter(game, decisions) : null;
  // The risks answer to the decisions in force, not to sliders the player is still moving.
  const risks = useMemo(
    () =>
      playing
        ? risksAhead(game, { budget: committed, reliefRegionId, startProjects: plannedSiteIds })
        : [],
    [playing, game, committed, reliefRegionId, plannedSiteIds],
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
              <BudgetPanel
                game={game}
                committed={committed}
                pending={pending}
                reliefRegionId={reliefRegionId}
                startProjects={plannedSiteIds}
                onChange={setPending}
                onCommit={() => {
                  setCommitted(pending);
                }}
                onReset={() => {
                  setPending(committed);
                }}
              />
              <ProjectsPanel game={game} plannedSiteIds={plannedSiteIds} onPlan={planSite} />
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
      {!playing && <GameSummary game={game} onReplay={onReplay} onNewGame={onNewGame} />}
    </div>
  );
}
