import {
  buildingBarred,
  formatMoney,
  formatQuarters,
  researchStatuses,
  technologyName,
  TECHNOLOGY_STATE_NAMES,
  type GameState,
  type Technology,
  type TechnologyStatus,
} from '../sim';
import { DecisionPanel, type DecisionTab } from './DecisionPanel';
import { formatDate } from './format';
import './ProjectsPanel.css';
import './ResearchPanel.css';

interface ResearchPanelProps {
  readonly game: GameState;
  /** The technology the player means to start researching when the quarter ends, if any. */
  readonly planned: Technology | null;
  /** The sites the player means to start building on, which the treasury must cover too. */
  readonly plannedSiteIds: readonly string[];
  /** The regions the player means to survey, which the treasury must cover too. */
  readonly plannedSurveys: readonly string[];
  /** Plans research on a technology this quarter, or takes the plan back with null. */
  readonly onPlan: (technology: Technology | null) => void;
}

/**
 * What the research tab says: what is being researched and how far it has got, what is
 * planned, or that nothing is, so that an idle research slot is not forgotten.
 */
export function researchTab(
  game: GameState,
  planned: Technology | null,
  plannedSiteIds: readonly string[],
  plannedSurveys: readonly string[] = [],
): DecisionTab {
  const statuses = researchStatuses(game, planned, plannedSiteIds, plannedSurveys);
  const underway = statuses.find(
    (status) => status.state === 'researching' || status.state === 'paused',
  );
  const startable = statuses.filter((status) => status.fault === null).length;
  const tab = { id: 'research', title: 'Research' };
  if (planned !== null) return { ...tab, note: '1 planned', pending: true };
  if (underway !== undefined) {
    const progress = `${underway.quartersPaid}/${underway.researchQuarters}`;
    return {
      ...tab,
      note: underway.state === 'paused' ? `▲ Paused ${progress}` : `Researching ${progress}`,
    };
  }
  if (statuses.every((status) => status.state === 'known')) return { ...tab, note: 'All known' };
  return startable > 0
    ? { ...tab, note: `Idle · ${startable} available`, pending: true }
    : { ...tab, note: 'Idle' };
}

/**
 * The technology tree: every technology, whether it is known, being researched, planned,
 * available or locked, what it costs, how long it takes, what it needs and what it does.
 * One technology is researched at a time, and research is started from here.
 */
export function ResearchPanel(props: ResearchPanelProps) {
  const { game, planned, plannedSiteIds, plannedSurveys, onPlan } = props;
  const statuses = researchStatuses(game, planned, plannedSiteIds, plannedSurveys);
  const underway = statuses.find(
    (status) => status.state === 'researching' || status.state === 'paused',
  );
  const barred = buildingBarred(game);

  return (
    <DecisionPanel id="research">
      <p className="section-note">
        {underway !== undefined
          ? `Researching ${underway.name} · ${underway.quartersPaid} of ${formatQuarters(underway.researchQuarters)} done`
          : planned !== null
            ? `${technologyName(planned)} planned · research starts when the quarter ends`
            : 'Nothing is being researched. One technology is researched at a time.'}
      </p>
      {barred !== null && (
        <p className="warning-note" role="note" aria-label="Austerity">
          ▲ {barred}
        </p>
      )}
      <ul className="research__tree" aria-label="Technology tree">
        {statuses.map((status) => (
          <li key={status.technology}>
            <TechnologyCard
              status={status}
              barred={barred !== null}
              onPlan={() => {
                onPlan(status.technology);
              }}
              onCancel={() => {
                onPlan(null);
              }}
            />
          </li>
        ))}
      </ul>
    </DecisionPanel>
  );
}

/** How a technology's state is marked: a symbol beside its name, so colour is never alone. */
const STATE_MARKS: Readonly<Record<TechnologyStatus['state'], string>> = {
  known: '✓',
  researching: '◐',
  paused: '▲',
  planned: '○',
  available: '○',
  locked: '✕',
};

interface TechnologyCardProps {
  readonly status: TechnologyStatus;
  /** Austerity forbids starting anything, which the panel says once. */
  readonly barred: boolean;
  readonly onPlan: () => void;
  readonly onCancel: () => void;
}

/** One technology of the tree: how it stands, what it takes, needs and does. */
function TechnologyCard({ status, barred, onPlan, onCancel }: TechnologyCardProps) {
  const { name, state } = status;
  const underway = state === 'researching' || state === 'paused';
  const needs = status.prerequisites.map(technologyName);
  const leadsTo = status.leadsTo.map(technologyName);
  return (
    <div className={`technology technology--${state}`} role="group" aria-label={name}>
      <div className="project__head">
        <span className="project__name">{name}</span>
        <span className="technology__state">
          <span aria-hidden="true">{STATE_MARKS[state]} </span>
          {TECHNOLOGY_STATE_NAMES[state]}
          {underway && ` · ${status.quartersPaid} of ${status.researchQuarters}`}
        </span>
      </div>
      {underway && (
        <div
          className="project__bar"
          role="progressbar"
          aria-label={`${name}: quarters researched`}
          aria-valuemin={0}
          aria-valuemax={status.researchQuarters}
          aria-valuenow={status.quartersPaid}
          aria-valuetext={`${status.quartersPaid} of ${status.researchQuarters} quarters researched`}
        >
          <div
            style={{
              width: `${(status.quartersPaid * 100) / Math.max(1, status.researchQuarters)}%`,
            }}
          />
        </div>
      )}
      <p className="projects__terms">
        {formatMoney(status.cost)} · {formatQuarters(status.researchQuarters)} · {status.effect}
      </p>
      <dl className="technology__links">
        <div>
          <dt>Needs</dt>
          <dd>{needs.length === 0 ? 'Nothing' : needs.join(', ')}</dd>
        </div>
        {leadsTo.length > 0 && (
          <div>
            <dt>Leads to</dt>
            <dd>{leadsTo.join(', ')}</dd>
          </div>
        )}
      </dl>
      {state === 'known' && status.known !== null && (
        <p className="project__note">Known since {formatDate(status.known)}.</p>
      )}
      {state === 'paused' && (
        <p className="warning-note">
          ▲ Paused: the treasury could not cover its {formatMoney(status.instalment)} instalment. It
          carries on when the treasury can pay.
        </p>
      )}
      {state === 'researching' && (
        <p className="project__note">
          {formatMoney(status.instalment)} this quarter. Known the quarter after its last.
        </p>
      )}
      {state === 'planned' && (
        <div className="project__planned">
          <p className="project__note">
            Research starts when this quarter ends, at {formatMoney(status.instalment)} a quarter.
          </p>
          <button
            type="button"
            className="button"
            aria-label={`Cancel research into ${name}`}
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      )}
      {(state === 'available' || state === 'locked') &&
        (status.fault === null ? (
          <div className="project__planned">
            <p className="project__note">
              Paid in instalments of {formatMoney(status.instalment)} after the budget, the oldest
              project first.
            </p>
            <button
              type="button"
              className="button button--commit"
              aria-label={`Research ${name}`}
              onClick={onPlan}
            >
              Research
            </button>
          </div>
        ) : (
          !barred && (
            <p className="warning-note" role="note" aria-label={`Why ${name} cannot be started`}>
              ▲ {status.fault}
            </p>
          )
        ))}
    </div>
  );
}
