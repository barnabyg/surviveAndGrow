import { useEffect, useRef, useState } from 'react';
import {
  buildingBarred,
  knownTechnologies,
  SITE_TYPE_NAMES,
  formatMoney,
  siteStatus,
  siteTerms,
  onSite,
  planFault,
  termCalendar,
  type GameState,
  type Preview,
  type ProjectPlan,
  type Site,
  type SiteStatus,
  type Technology,
  formatQuarters,
} from '../sim';
import { opening } from './schedule';
import { progressOf } from './SiteMark';
import { DecisionPanel, type DecisionTab } from './DecisionPanel';
import './ProjectsPanel.css';

interface ProjectsPanelProps {
  readonly game: GameState;
  /** What the decisions now in force will do this quarter. */
  readonly preview: Preview;
  /** The sites the player means to start building on when the quarter ends. */
  readonly plannedSiteIds: readonly string[];
  /** Everything the player means to start this quarter, which the treasury must cover too. */
  readonly plan: ProjectPlan;
  /** Plans building on a site this quarter, or takes the plan back. */
  readonly onPlan: (siteId: string, planned: boolean) => void;
}

/** What the projects tab says: how many are planned this quarter, and how many are building. */
export function projectsTab(game: GameState, plannedSiteIds: readonly string[]): DecisionTab {
  const building = game.country.sites.filter((site) => {
    const { state } = siteStatus(game, site.id);
    return state === 'building' || state === 'paused';
  }).length;
  const parts = [
    ...(plannedSiteIds.length > 0 ? [`${plannedSiteIds.length} planned`] : []),
    ...(building > 0 ? [`${building} building`] : []),
  ];
  return {
    id: 'projects',
    title: 'Projects',
    note: parts.length === 0 ? 'None' : parts.join(' · '),
    pending: plannedSiteIds.length > 0,
  };
}

/**
 * What is being built and what could be. Projects under way show how far they have got and
 * what they will do. Below them is every empty site the treasury can cover now, on top of
 * whatever is already planned for this quarter.
 */
export function ProjectsPanel(props: ProjectsPanelProps) {
  const { game, preview, plannedSiteIds, plan, onPlan } = props;
  const [browsing, setBrowsing] = useState(false);
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
  const locked = sites.filter(({ status }) => status.state === 'locked').length;
  const affordable = sites.filter(
    ({ site, status, planned }) =>
      status.state === 'empty' && !planned && planFault(game, plan, onSite(site.id)) === null,
  );

  // When each opens is the simulation's to say, so the list agrees with the timeline.
  const calendar = termCalendar(game);
  const openingOf = (siteId: string) => {
    const scheduled = preview.schedule.find((entry) => entry.siteId === siteId);
    return scheduled === undefined ? null : opening(scheduled, calendar);
  };

  return (
    <DecisionPanel id="projects">
      <p className="section-note">
        {underway.length === 0
          ? 'None underway'
          : `${underway.length} underway · ${formatMoney(preview.projectSpending.min)} this quarter`}
      </p>
      {underway.map(({ site, status, planned }) => (
        <ProjectCard
          key={site.id}
          site={site}
          known={knownTechnologies(game.projects)}
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

      {barred !== null ? (
        <p className="warning-note" role="note" aria-label="Austerity">
          ▲ {barred}
        </p>
      ) : (
        <div className="projects__browse">
          <button
            type="button"
            className="button button--commit"
            disabled={affordable.length === 0}
            onClick={() => {
              setBrowsing(true);
            }}
          >
            Browse projects…
          </button>
          <span className="section-note">
            {affordable.length === 0
              ? sites.some(({ status, planned }) => status.state === 'empty' && !planned)
                ? 'The treasury does not hold the whole cost of any empty site.'
                : locked > 0
                  ? 'Every site open to building is built on or spoken for.'
                  : 'Every site is built on or spoken for.'
              : `${affordable.length} affordable now`}
            {locked > 0 &&
              ` · ${locked} locked until research unlocks ${locked === 1 ? 'it' : 'them'}`}
          </span>
        </div>
      )}
      {browsing && barred === null && (
        <ProjectCatalogue
          game={game}
          sites={affordable.map(({ site }) => site)}
          onPlan={(siteId) => {
            setBrowsing(false);
            onPlan(siteId, true);
          }}
          onClose={() => {
            setBrowsing(false);
          }}
        />
      )}
    </DecisionPanel>
  );
}

interface ProjectCardProps {
  readonly site: Site;
  /** The technologies known, which may improve what the site does. */
  readonly known: readonly Technology[];
  readonly status: SiteStatus;
  readonly planned: boolean;
  /** When it opens as things stand, such as "next quarter", or null if it has no schedule. */
  readonly opens: string | null;
  /** The treasury will not cover this quarter's instalment. */
  readonly unpaid: boolean;
  readonly onCancel: () => void;
}

/** One project under way or planned: how far it has got, as a bar and in words. */
function ProjectCard(props: ProjectCardProps) {
  const { site, known, status, planned, opens, unpaid, onCancel } = props;
  const { effect } = siteTerms(site.type, site.capacity, known);
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

interface ProjectCatalogueProps {
  readonly game: GameState;
  /** The empty sites the treasury can cover now, on top of whatever is already planned. */
  readonly sites: readonly Site[];
  readonly onPlan: (siteId: string) => void;
  readonly onClose: () => void;
}

/**
 * Every project the treasury can cover now, grouped by kind: what each kind costs, how long
 * it takes and what it does, said once, then the sites it can be built on. Planning one
 * closes the catalogue, so the player sees it picked out on the map. Escape closes it too.
 */
function ProjectCatalogue({ game, sites, onPlan, onClose }: ProjectCatalogueProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
  }, []);
  const nameOf = (id: string) =>
    game.country.sites.find((candidate) => candidate.id === id)?.name ?? id;
  // Each kind in the order its first site comes in the country.
  const kinds = [...new Set(sites.map((site) => site.type))].map((type) => ({
    type,
    sites: sites.filter((site) => site.type === type),
  }));

  return (
    <dialog
      ref={dialog}
      className="dialog catalogue"
      aria-labelledby="catalogue-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="catalogue__head">
        <h2 className="dialog__title" id="catalogue-title">
          Affordable now
        </h2>
        <button type="button" className="button" onClick={onClose}>
          Close
        </button>
      </div>
      <p className="section-empty">
        Building starts when the quarter ends, and a plan can be taken back until then.
      </p>
      <div className="catalogue__kinds">
        {kinds.map(({ type, sites: ofKind }) => {
          const terms = siteTerms(type, undefined, knownTechnologies(game.projects));
          const titleId = `catalogue-${type}`;
          return (
            <section key={type} className="catalogue__kind" aria-labelledby={titleId}>
              <h3 className="projects__name" id={titleId}>
                {SITE_TYPE_NAMES[type]}
              </h3>
              <p className="projects__terms">
                {formatMoney(terms.cost)} · {formatQuarters(terms.buildQuarters)} · {terms.effect}
              </p>
              <ul className="projects__offers" aria-labelledby={titleId}>
                {ofKind.map((site) => (
                  <li key={site.id}>
                    <div>
                      <div>{site.name}</div>
                      {site.alternatives.length > 0 && (
                        <div className="projects__terms">
                          ▲ Closes {site.alternatives.map(nameOf).join(', ')} for good.
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      className="button"
                      aria-label={`Plan ${site.name}`}
                      onClick={() => {
                        onPlan(site.id);
                      }}
                    >
                      Plan
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </dialog>
  );
}
