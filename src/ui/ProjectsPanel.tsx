import {
  formatMoney,
  siteStatus,
  siteTerms,
  startFault,
  type GameState,
  type Site,
  type SiteStatus,
} from '../sim';
import { formatQuarters } from './format';
import { progressOf } from './SiteMark';

interface ProjectsPanelProps {
  readonly game: GameState;
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
export function ProjectsPanel({ game, plannedSiteIds, onPlan }: ProjectsPanelProps) {
  const sites = game.country.sites.map((site) => ({
    site,
    status: siteStatus(game, site.id),
    planned: plannedSiteIds.includes(site.id),
  }));
  const underway = sites.filter(
    ({ status, planned }) => planned || status.state === 'building' || status.state === 'paused',
  );
  const inUse = sites.filter(({ status }) => status.state === 'operating');
  const affordable = sites.filter(
    ({ site, status, planned }) =>
      status.state === 'empty' &&
      !planned &&
      startFault(game, [...plannedSiteIds, site.id]) === null,
  );
  const instalments = underway.reduce((total, { status }) => total + status.instalment, 0);

  return (
    <section className="projects" aria-labelledby="projects-title">
      <div className="section-head">
        <h2 className="section-title" id="projects-title">
          Projects
        </h2>
        <span className="section-note">
          {underway.length === 0
            ? 'None underway'
            : `${underway.length} underway · ${formatMoney(instalments)} a quarter`}
        </span>
      </div>

      {underway.map(({ site, status, planned }) => (
        <ProjectCard
          key={site.id}
          site={site}
          status={status}
          planned={planned}
          onCancel={() => {
            onPlan(site.id, false);
          }}
        />
      ))}
      {inUse.length > 0 && (
        <p className="projects__in-use">In use: {inUse.map(({ site }) => site.name).join(' · ')}</p>
      )}

      <h3 className="label" id="affordable-title">
        Affordable now
      </h3>
      {affordable.length === 0 ? (
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
    </section>
  );
}

interface ProjectCardProps {
  readonly site: Site;
  readonly status: SiteStatus;
  readonly planned: boolean;
  readonly onCancel: () => void;
}

/** One project under way or planned: how far it has got, as a bar and in words. */
function ProjectCard({ site, status, planned, onCancel }: ProjectCardProps) {
  const toGo = status.buildQuarters - status.quartersPaid;
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
        </p>
      )}
      {status.state === 'building' && (
        <p className="project__note">
          {toGo === 1 ? 'Opens next quarter.' : `Opens in ${formatQuarters(toGo)}.`} {effect}
        </p>
      )}
    </div>
  );
}
