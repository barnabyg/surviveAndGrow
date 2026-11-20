import {
  buildingBarred,
  formatMoney,
  siteStatus,
  siteTerms,
  startFault,
  termCalendar,
  type GameState,
  type Preview,
  type Site,
  type SiteStatus,
  formatQuarters,
} from '../sim';
import { opening } from './schedule';
import { progressOf } from './SiteMark';
import { DecisionPanel } from './DecisionPanel';
import './ProjectsPanel.css';

interface ProjectsPanelProps {
  readonly game: GameState;
  /** What the decisions now in force will do this quarter. */
  readonly preview: Preview;
  /** The sites the player means to start building on when the quarter ends. */
  readonly plannedSiteIds: readonly string[];
  /** Plans building on a site this quarter, or takes the plan back. */
  readonly onPlan: (siteId: string, planned: boolean) => void;
}

/**
 * What is being built and what could be. Projects under way show how far they have got and
 * what they will do. Below them is every empty site the treasury can cover now, on top of
 * whatever is already planned for this quarter.
 */
export function ProjectsPanel({ game, preview, plannedSiteIds, onPlan }: ProjectsPanelProps) {
  const sites = game.country.sites.map((site) => ({
    site,
    status: siteStatus(game, site.id),
    planned: plannedSiteIds.includes(site.id),
  }));
  const underway = sites.filter(
    ({ status, planned }) => planned || status.state === 'building' || status.state === 'paused',
  );
  const inUse = sites.filter(
    ({ status }) => status.state === 'operating' || status.state === 'decaying',
  );
  // Austerity forbids starting anything, whatever the treasury holds.
  const barred = buildingBarred(game);
  const affordable = sites.filter(
    ({ site, status, planned }) =>
      status.state === 'empty' &&
      !planned &&
      startFault(game, [...plannedSiteIds, site.id]) === null,
  );

  // When each opens is the simulation's to say, so the list agrees with the timeline.
  const calendar = termCalendar(game);
  const openingOf = (siteId: string) => {
    const scheduled = preview.schedule.find((entry) => entry.siteId === siteId);
    return scheduled === undefined ? null : opening(scheduled, calendar);
  };

  return (
    <DecisionPanel
      id="projects"
      title="Projects"
      note={
        <span className="section-note">
          {underway.length === 0
            ? 'None underway'
            : `${underway.length} underway · ${formatMoney(preview.projectSpending.min)} this quarter`}
        </span>
      }
    >
      {underway.map(({ site, status, planned }) => (
        <ProjectCard
          key={site.id}
          site={site}
          status={status}
          planned={planned}
          opens={openingOf(site.id)}
          unpaid={preview.pausedSites.includes(site.id)}
          onCancel={() => {
            onPlan(site.id, false);
          }}
        />
      ))}
      {inUse.length > 0 && (
        <p className="projects__in-use">
          In use:{' '}
          {inUse
            .map(({ site, status }) =>
              status.state === 'decaying' ? `${site.name} (▲ decaying)` : site.name,
            )
            .join(' · ')}
        </p>
      )}

      <h3 className="label" id="affordable-title">
        Affordable now
      </h3>
      {barred !== null ? (
        <p className="warning-note" role="note" aria-label="Austerity">
          ▲ {barred}
        </p>
      ) : affordable.length === 0 ? (
        <p className="section-empty">
          {sites.some(({ status, planned }) => status.state === 'empty' && !planned)
            ? 'The treasury does not hold the whole cost of any empty site.'
            : 'Every site is built on or spoken for.'}
        </p>
      ) : (
        <ul className="projects__offers" aria-labelledby="affordable-title">
          {affordable.map(({ site }) => {
            const terms = siteTerms(site.type);
            return (
              <li key={site.id}>
                <div>
                  <div className="projects__name">{site.name}</div>
                  <div className="projects__terms">
                    {formatMoney(terms.cost)} · {formatQuarters(terms.buildQuarters)} ·{' '}
                    {terms.effect}
                  </div>
                  {site.alternatives.length > 0 && (
                    <div className="projects__terms">
                      ▲ Closes{' '}
                      {site.alternatives
                        .map(
                          (id) =>
                            game.country.sites.find((candidate) => candidate.id === id)?.name ?? id,
                        )
                        .join(', ')}{' '}
                      for good.
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className="button"
                  aria-label={`Plan ${site.name}`}
                  onClick={() => {
                    onPlan(site.id, true);
                  }}
                >
                  Plan
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </DecisionPanel>
  );
}

interface ProjectCardProps {
  readonly site: Site;
  readonly status: SiteStatus;
  readonly planned: boolean;
  /** When it opens as things stand, such as "next quarter", or null if it has no schedule. */
  readonly opens: string | null;
  /** The treasury will not cover this quarter's instalment. */
  readonly unpaid: boolean;
  readonly onCancel: () => void;
}

/** One project under way or planned: how far it has got, as a bar and in words. */
function ProjectCard({ site, status, planned, opens, unpaid, onCancel }: ProjectCardProps) {
  const { effect } = siteTerms(site.type);
  return (
    <div className="project" role="group" aria-label={site.name}>
      <div className="project__head">
        <span className="project__name">{site.name}</span>
        <span className="project__progress">{planned ? 'Planned' : progressOf(status)}</span>
      </div>
      <div
        className="project__bar"
        role="progressbar"
        aria-label={`${site.name}: quarters built`}
        aria-valuemin={0}
        aria-valuemax={status.buildQuarters}
        aria-valuenow={status.quartersPaid}
        aria-valuetext={`${progressOf(status)} quarters built`}
      >
        <div
          style={{ width: `${(status.quartersPaid * 100) / Math.max(1, status.buildQuarters)}%` }}
        />
      </div>
      {planned && (
        <div className="project__planned">
          <p className="project__note">
            Building starts when this quarter ends, at {formatMoney(status.instalment)} a quarter.
          </p>
          <button
            type="button"
            className="button"
            aria-label={`Cancel ${site.name}`}
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      )}
      {status.state === 'paused' && (
        <p className="warning-note">
          ▲ Paused: the treasury could not cover its {formatMoney(status.instalment)} instalment.
          {opens !== null && (unpaid ? ` Would open ${opens}.` : ` Opens ${opens}.`)}
        </p>
      )}
      {status.state === 'building' && unpaid && opens !== null && (
        <p className="warning-note">▲ Cannot be paid for this quarter. Would open {opens}.</p>
      )}
      {status.state === 'building' && !unpaid && opens !== null && (
        <p className="project__note">
          Opens {opens}. {effect}
        </p>
      )}
    </div>
  );
}
