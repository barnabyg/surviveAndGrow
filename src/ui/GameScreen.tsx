import { useMemo, useState } from 'react';
import {
  advanceQuarter,
  bondMaturities,
  pendingDilemma,
  previewQuarter,
  regionName,
  risksAhead,
  siteOf,
  siteSchedule,
  siteStatus,
  withinAusterity,
  type Borrowing,
  type GameState,
  type Technology,
  type TradeOrder,
  type TurnReport,
} from '../sim';
import { ApprovalChart } from './ApprovalChart';
import { BudgetPanel, budgetTab, countChanges } from './BudgetPanel';
import { ConfirmDialog, RestartDialog } from './ConfirmDialog';
import { DecisionTabs } from './DecisionPanel';
import { DilemmaDialog } from './DilemmaDialog';
import { DilemmaPanel } from './DilemmaPanel';
import { FinancePanel, financeTab } from './FinancePanel';
import { GameSummary } from './GameSummary';
import type { Lens } from './lens';
import { LensBar } from './LensBar';
import { MapLegend } from './MapLegend';
import { MapView } from './MapView';
import { ProjectsPanel, projectsTab } from './ProjectsPanel';
import { ResearchPanel, researchTab } from './ResearchPanel';
import { QuarterSummary } from './QuarterSummary';
import { NeighbourCard } from './NeighbourCard';
import { RegionCard } from './RegionCard';
import { RegionList } from './RegionList';
import { ReliefPanel, reliefTab } from './ReliefPanel';
import { ReportList } from './ReportList';
import { RisksPanel } from './RisksPanel';
import { SiteCard } from './SiteCard';
import { Timeline } from './Timeline';
import { TipCard, useTips } from './TipCard';
import { TradePanel, tradeTab } from './TradePanel';
import { TradeRouteCard } from './TradeRouteCard';
import { TopBar } from './TopBar';
import { Lessons } from './Lessons';
import { Tour } from './Tour';
import { useLessons } from './lessonProgress';
import { TourTarget } from './spotlight';
import { readDecisionTab, storeDecisionTab } from './storage';
import { TOUR_STEPS } from './tourSteps';
import './GameScreen.css';

interface GameScreenProps {
  readonly initialGame: GameState;
  /** The report on the quarter before, when the game is resumed from a save; otherwise null. */
  readonly initialReport: TurnReport | null;
  /** Why the game is not being saved, in words for the player, or null when it is. */
  readonly saveNotice: string | null;
  /** The tutorial lesson the game opens on, by its place in LESSONS, or null outside the tutorial. */
  readonly initialLesson: number | null;
  /** Called as the tutorial moves to another lesson, or with null as it ends. */
  readonly onLessonChange: (lesson: number | null) => void;
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
  const {
    initialGame,
    initialReport,
    saveNotice,
    initialLesson,
    onLessonChange,
    onQuarterEnded,
    onReplay,
    onNewGame,
    onRestart,
  } = props;
  const [game, setGame] = useState(initialGame);
  const [report, setReport] = useState<TurnReport | null>(initialReport);
  // The committed budget is what the quarter will be resolved with. The pending budget is
  // what the sliders show, and it counts for nothing until the player commits it.
  const [committed, setCommitted] = useState(initialGame.budget);
  const [pending, setPending] = useState(initialGame.budget);
  // Relief goes on being sent where it was last sent, as the budget in force goes on.
  const [reliefRegionId, setReliefRegionId] = useState<string | null>(initialGame.reliefRegionId);
  // One thing is picked out on the map at a time: a region, a site, a trade route or a
  // neighbour. Its card is the one shown.
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [selectedNeighbourId, setSelectedNeighbourId] = useState<string | null>(null);
  // The decisions tab chosen last, which the browser remembers.
  const [decisionTab, setDecisionTab] = useState(readDecisionTab);
  // The sites the player means to start building on. Building begins when the quarter
  // ends, so until then a plan can be taken back, like the relief target.
  const [plannedSiteIds, setPlannedSiteIds] = useState<readonly string[]>([]);
  // The technology the player means to start researching, taken back the same way.
  const [plannedResearch, setPlannedResearch] = useState<Technology | null>(null);
  // The regions the player means to start surveying, taken back the same way.
  const [plannedSurveys, setPlannedSurveys] = useState<readonly string[]>([]);
  // The loans the player means to take. Their money arrives when the quarter ends, so until
  // then they can be taken back, like a planned project.
  const [plannedLoans, setPlannedLoans] = useState<readonly Borrowing[]>([]);
  // The goods the player means to buy abroad. They arrive, and are paid for, when the quarter
  // ends, so until then an order can be taken back, like a loan.
  const [plannedTrade, setPlannedTrade] = useState<readonly TradeOrder[]>([]);
  // The report the player last selected, by its place in the list. It counts as selected
  // only while its region or neighbour is still the one picked out on the map.
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
  // The step of the guided tour on screen, or null when the tour is not open.
  const [tourStep, setTourStep] = useState<number | null>(null);
  const tutorial = useLessons(initialLesson, onLessonChange);
  const { did } = tutorial;

  const playing = game.outcome.status === 'playing';
  const touring = playing && tourStep !== null;
  const learning = playing && tutorial.lesson !== null;
  const tourTarget = touring
    ? (TOUR_STEPS[tourStep]?.target ?? null)
    : learning
      ? tutorial.target
      : null;
  const decisions = {
    budget: committed,
    reliefRegionId,
    startProjects: plannedSiteIds,
    startResearch: plannedResearch,
    startSurveys: plannedSurveys,
    borrow: plannedLoans,
    trade: plannedTrade,
    dilemmaChoice,
  };
  const plan = {
    startProjects: plannedSiteIds,
    startResearch: plannedResearch,
    startSurveys: plannedSurveys,
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
            startResearch: plannedResearch,
            startSurveys: plannedSurveys,
            borrow: plannedLoans,
            trade: plannedTrade,
            dilemmaChoice,
          })
        : [],
    [
      playing,
      game,
      committed,
      reliefRegionId,
      plannedSiteIds,
      plannedResearch,
      plannedSurveys,
      plannedLoans,
      plannedTrade,
      dilemmaChoice,
    ],
  );
  // Whether a report or a risk about one place is about the place picked out on the map.
  const pickedOut = (row: { readonly regionId?: string; readonly neighbourId?: string }) =>
    row.regionId !== undefined
      ? row.regionId === selectedRegionId
      : row.neighbourId !== undefined && row.neighbourId === selectedNeighbourId;
  const pickedRisk = risks.findIndex((risk) => risk.headline === riskPicked && pickedOut(risk));
  const selectedRisk = pickedRisk === -1 ? null : pickedRisk;
  const tips = useTips({
    game,
    risks,
    plannedSiteIds,
    plannedResearch,
    plannedSurveys,
    openTab: decisionTab,
    selectedRegionId,
    quiet: touring || learning,
  });
  // The timeline shows every project, and the site picked out on the map if it is still
  // empty and unplanned, as if building there began now. A closed site can never begin, nor a
  // locked one until research unlocks it.
  const schedule =
    preview?.schedule ??
    game.projects.flatMap((project) => {
      const siteId = siteOf(project);
      return siteId === null ? [] : [siteSchedule(game, siteId)];
    });
  const considered =
    playing &&
    selectedSiteId !== null &&
    !schedule.some((entry) => entry.siteId === selectedSiteId) &&
    siteStatus(game, selectedSiteId).state === 'empty'
      ? siteSchedule(game, selectedSiteId)
      : null;
  const pickedEntry = reportPicked === null ? undefined : report?.entries[reportPicked];
  const selectedEntry = pickedEntry !== undefined && pickedOut(pickedEntry) ? reportPicked : null;

  const selectRegion = (regionId: string | null) => {
    if (regionId !== null) did('select-region');
    setSelectedRegionId(regionId);
    setSelectedSiteId(null);
    setSelectedRouteId(null);
    setSelectedNeighbourId(null);
  };
  const selectSite = (siteId: string | null) => {
    setSelectedSiteId(siteId);
    setSelectedRegionId(null);
    setSelectedRouteId(null);
    setSelectedNeighbourId(null);
  };
  const selectRoute = (routeId: string | null) => {
    setSelectedRouteId(routeId);
    setSelectedRegionId(null);
    setSelectedSiteId(null);
    setSelectedNeighbourId(null);
  };
  const selectNeighbour = (neighbourId: string | null) => {
    setSelectedNeighbourId(neighbourId);
    setSelectedRegionId(null);
    setSelectedSiteId(null);
    setSelectedRouteId(null);
  };
  // Picks out the place a report or a risk is about, or lets go of it.
  const selectPlace = (
    row: { readonly regionId?: string; readonly neighbourId?: string },
    letGo: boolean,
  ) => {
    if (row.regionId !== undefined) selectRegion(letGo ? null : row.regionId);
    else if (row.neighbourId !== undefined) selectNeighbour(letGo ? null : row.neighbourId);
  };

  // Planning a project picks its site out on the map, so the player sees where it will stand.
  const planSite = (siteId: string, planned: boolean) => {
    setPlannedSiteIds(
      planned
        ? [...plannedSiteIds.filter((id) => id !== siteId), siteId]
        : plannedSiteIds.filter((id) => id !== siteId),
    );
    if (planned) {
      selectSite(siteId);
      did('plan-project');
    }
  };

  // Planning a survey keeps its region picked out, so the player sees its card change.
  const planSurvey = (regionId: string, planned: boolean) => {
    setPlannedSurveys(
      planned
        ? [...plannedSurveys.filter((id) => id !== regionId), regionId]
        : plannedSurveys.filter((id) => id !== regionId),
    );
  };

  // Selecting a report picks its region or neighbour out on the map; selecting it again lets go.
  const selectEntry = (index: number) => {
    const entry = report?.entries[index];
    if (entry === undefined) return;
    setReportPicked(index === selectedEntry ? null : index);
    selectPlace(entry, index === selectedEntry);
  };

  // A risk to one region, or from one neighbour, picks that place out the same way.
  const selectRisk = (index: number) => {
    const risk = risks[index];
    if (risk === undefined) return;
    setRiskPicked(index === selectedRisk ? null : risk.headline);
    selectPlace(risk, index === selectedRisk);
  };

  const resolveQuarter = () => {
    const result = advanceQuarter(game, decisions);
    setGame(result.state);
    setReport(result.report);
    // A bailout brings the budget in force within austerity, and the sliders with it.
    setCommitted(result.state.budget);
    setPending(withinAusterity(result.state, pending));
    setReportPicked(null);
    setPlannedSiteIds([]);
    setPlannedResearch(null);
    setPlannedSurveys([]);
    setPlannedLoans([]);
    setPlannedTrade([]);
    setConfirmingEnd(false);
    setDilemmaChoice(null);
    setDilemmaShown(result.state.dilemma === null ? 'no' : 'yes');
    onQuarterEnded(result.state, result.report);
    did(result.state.date.quarter === 1 ? 'end-year' : 'end-quarter');
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
    <TourTarget value={tourTarget}>
      <div className="game">
        <TopBar
          game={game}
          report={report}
          onEndQuarter={endQuarter}
          onRestart={() => {
            setConfirmingRestart(true);
          }}
          onTour={() => {
            setTourStep(0);
          }}
          tips={tips}
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
            <LensBar
              game={game}
              lens={lens}
              onChange={(chosen) => {
                setLens(chosen);
                if (chosen === 'food') did('lens-food');
              }}
            />
            <div className="map-frame" data-tour="map">
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
                  plannedSurveys={plannedSurveys}
                  plannedTrade={plannedTrade}
                  selectedRouteId={selectedRouteId}
                  onSelectRoute={selectRoute}
                  selectedNeighbourId={selectedNeighbourId}
                  onSelectNeighbour={selectNeighbour}
                />
                {preview !== null && selectedRegionId !== null && (
                  <RegionCard
                    game={game}
                    report={report}
                    regionId={selectedRegionId}
                    preview={preview}
                    budget={committed}
                    reliefRegionId={reliefRegionId}
                    onSendRelief={setReliefRegionId}
                    plan={plan}
                    onPlanSurvey={planSurvey}
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
                    plan={plan}
                    schedule={schedule}
                    pausedSites={preview?.pausedSites ?? []}
                    upkeepShort={preview?.upkeep.short ?? []}
                    onPlan={planSite}
                    onClose={() => {
                      selectSite(null);
                    }}
                  />
                )}
                {selectedNeighbourId !== null && (
                  <NeighbourCard
                    game={game}
                    report={report}
                    neighbourId={selectedNeighbourId}
                    budget={committed}
                    onClose={() => {
                      selectNeighbour(null);
                    }}
                  />
                )}
                {selectedRouteId !== null && (
                  <TradeRouteCard
                    game={game}
                    routeId={selectedRouteId}
                    plannedTrade={plannedTrade}
                    onClose={() => {
                      selectRoute(null);
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
                maturities={bondMaturities(game, plannedLoans)}
                onSelectSite={selectSite}
              />
              <MapLegend />
            </div>
          </main>
          <aside className="column column--decisions" aria-label="Decisions">
            {preview !== null && (
              <>
                <QuarterSummary game={game} preview={preview}>
                  {dilemma !== null && (
                    <DilemmaPanel
                      dilemma={dilemma}
                      chosen={dilemmaChoice}
                      onOpen={() => {
                        setDilemmaShown('yes');
                      }}
                    />
                  )}
                </QuarterSummary>
                <DecisionTabs
                  chosen={decisionTab}
                  onChoose={(id) => {
                    setDecisionTab(id);
                    storeDecisionTab(id);
                  }}
                  tabs={[
                    budgetTab(pending, committed),
                    projectsTab(game, plannedSiteIds),
                    researchTab(game, plannedResearch, plannedSiteIds, plannedSurveys),
                    financeTab(game, preview, plannedLoans),
                    tradeTab(preview),
                    reliefTab(game, preview, reliefRegionId),
                  ]}
                >
                  <BudgetPanel
                    game={game}
                    committed={committed}
                    pending={pending}
                    reliefRegionId={reliefRegionId}
                    startProjects={plannedSiteIds}
                    startResearch={plannedResearch}
                    startSurveys={plannedSurveys}
                    borrow={plannedLoans}
                    trade={plannedTrade}
                    dilemmaChoice={dilemmaChoice}
                    onChange={setPending}
                    onCommit={() => {
                      setCommitted(pending);
                      did('commit-budget');
                    }}
                    onReset={() => {
                      setPending(committed);
                    }}
                  />
                  <ProjectsPanel
                    game={game}
                    preview={preview}
                    plannedSiteIds={plannedSiteIds}
                    plan={plan}
                    onPlan={planSite}
                  />
                  <ResearchPanel
                    game={game}
                    planned={plannedResearch}
                    plannedSiteIds={plannedSiteIds}
                    plannedSurveys={plannedSurveys}
                    onPlan={setPlannedResearch}
                  />
                  <FinancePanel
                    game={game}
                    preview={preview}
                    planned={plannedLoans}
                    onPlan={setPlannedLoans}
                  />
                  <TradePanel
                    game={game}
                    preview={preview}
                    planned={plannedTrade}
                    onPlan={setPlannedTrade}
                  />
                  <ReliefPanel
                    game={game}
                    preview={preview}
                    reliefSpending={committed.spending.foodRelief}
                    reliefRegionId={reliefRegionId}
                    onSendRelief={setReliefRegionId}
                  />
                </DecisionTabs>
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
          <RestartDialog
            onCancel={() => {
              setConfirmingRestart(false);
            }}
            onRestart={onRestart}
          />
        )}
        {dilemma !== null && dilemmaShown !== 'no' && (
          <DilemmaDialog
            dilemma={dilemma}
            regionName={
              dilemma.regionId === null ? null : regionName(game.country, dilemma.regionId)
            }
            chosen={dilemmaChoice}
            pressed={dilemmaShown === 'pressed'}
            onChoose={(optionId) => {
              setDilemmaChoice(optionId);
              setDilemmaShown('no');
              did('answer-dilemma');
            }}
            onLater={() => {
              setDilemmaShown('no');
            }}
          />
        )}
        {!playing && <GameSummary game={game} onReplay={onReplay} onNewGame={onNewGame} />}
        {learning && <Lessons progress={tutorial} />}
        {playing && <TipCard tips={tips} />}
        {touring && (
          <Tour
            step={tourStep}
            onStep={setTourStep}
            onEnd={() => {
              setTourStep(null);
            }}
          />
        )}
      </div>
    </TourTarget>
  );
}
