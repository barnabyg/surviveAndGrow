import { formatMoney, regionName, SITE_TYPE_NAMES, siteTerms, type GameState } from '../sim';
import { formatQuarters } from './format';
import { siteStateName } from './SiteMark';

interface SiteCardProps {
  readonly game: GameState;
  readonly siteId: string;
  readonly onClose: () => void;
}

/** The card for the site picked out on the map: what it is, what it costs and what it does. */
export function SiteCard({ game, siteId, onClose }: SiteCardProps) {
  const site = game.country.sites.find((candidate) => candidate.id === siteId);
  if (!site) return null;
  const terms = siteTerms(site.type);

  return (
    <section className="map-card" aria-labelledby="site-card-title">
      <div>
        <div className="label label--pending">
          {SITE_TYPE_NAMES[site.type]} · {siteStateName(site).toLowerCase()}
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
      </div>
      <div className="button-row">
        <button type="button" className="button" onClick={onClose}>
          Close
        </button>
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
