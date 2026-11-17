import {
  formatMoney,
  regionName,
  SITE_TYPE_NAMES,
  siteStatus,
  siteTerms,
  startFault,
  type GameState,
} from '../sim';
import { formatDate, formatQuarters } from './format';
import { progressOf, siteStateName } from './SiteMark';

interface SiteCardProps {
  readonly game: GameState;
  readonly siteId: string;
  /** The sites the player means to start building on when the quarter ends. */
  readonly plannedSiteIds: readonly string[];
  /** Plans building here this quarter, or takes the plan back. */
  readonly onPlan: (siteId: string, planned: boolean) => void;
  readonly onClose: () => void;
}

/**
 * The card for the site picked out on the map: what it is, what it costs, what it does and
 * how it stands. Building is started here. It begins when the quarter ends, so until then
 * the plan can be taken back.
 */
export function SiteCard({ game, siteId, plannedSiteIds, onPlan, onClose }: SiteCardProps) {
  const site = game.country.sites.find((candidate) => candidate.id === siteId);
  if (!site) return null;
  const terms = siteTerms(site.type);
  const status = siteStatus(game, site.id);
  const planned = plannedSiteIds.includes(site.id);
  const underWay = status.state === 'building' || status.state === 'paused';
  const toGo = status.buildQuarters - status.quartersPaid;
  // An empty site can be started unless the treasury cannot cover it with what is planned.
  const fault =
    status.state === 'empty' && !planned ? startFault(game, [...plannedSiteIds, site.id]) : null;

  return (
    <section className="map-card" aria-labelledby="site-card-title">
      <div>
        <div className="label label--pending">
          {SITE_TYPE_NAMES[site.type]} · {siteStateName(site, status, planned).toLowerCase()}
        </div>
        <h2 className="map-card__name" id="site-card-title">
          {site.name}
        </h2>
      </div>
      <p className="map-card__note">{terms.effect}</p>
      <div className="map-card__facts">
        <Fact label="Cost" value={formatMoney(terms.cost)} />
        <Fact label="Build time" value={formatQuarters(terms.buildQuarters)} />
        <Fact label="Region" value={regionName(game.country, site.regionId)} />
        {underWay && <Fact label="Built" value={`${progressOf(status)} quarters`} />}
      </div>

      {planned && (
        <p className="map-card__note">
          Building starts when this quarter ends. The first instalment is{' '}
          {formatMoney(status.instalment)}.
        </p>
      )}
      {status.state === 'building' && (
        <p className="map-card__note">
          {toGo === 1 ? 'It opens next quarter' : `It opens in ${formatQuarters(toGo)}`}, if each
          instalment is paid. The next is {formatMoney(status.instalment)}.
        </p>
      )}
      {status.state === 'paused' && (
        <p className="warning-note">
          ▲ Building is paused: the treasury could not cover the {formatMoney(status.instalment)}{' '}
          instalment. It carries on when the instalment can be paid.
        </p>
      )}
      {status.opened !== null && (
        <p className="map-card__note">In use since {formatDate(status.opened)}.</p>
      )}
      {fault !== null && <p className="warning-note">▲ {fault}</p>}

      <div className="button-row">
        <button type="button" className="button" onClick={onClose}>
          Close
        </button>
        {status.state === 'empty' && (
          <button
            type="button"
            className="button button--commit"
            disabled={fault !== null}
            onClick={() => {
              onPlan(site.id, !planned);
            }}
          >
            {planned ? 'Cancel building' : 'Start building'}
          </button>
        )}
      </div>
    </section>
  );
}

function Fact({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div role="group" aria-label={label}>
      <div className="map-card__term">{label}</div>
      <div className="map-card__value">{value}</div>
    </div>
  );
}
