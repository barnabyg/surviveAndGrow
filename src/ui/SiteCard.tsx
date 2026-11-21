import {
  chainsThrough,
  damageTo,
  DECAYING_SHARE,
  forecastSpan,
  formatMoney,
  formatPrice,
  formatTonnes,
  oreEarnings,
  oreTonnesOf,
  portTonnesOf,
  priceStatus,
  regionName,
  regionPower,
  SITE_CHAIN_ROLES,
  SITE_POWER_ROLES,
  SITE_STATE_NAMES,
  SITE_TYPE_NAMES,
  siteStatus,
  siteTerms,
  startFault,
  termCalendar,
  tradeCapacity,
  UPKEEP_ORDER_RULE,
  type Chain,
  type GameState,
  type SiteSchedule,
  formatQuarters,
} from '../sim';
import { formatDate } from './format';
import { opening } from './schedule';
import { progressOf, siteStateName } from './SiteMark';
import { WorldPriceSign } from './WorldPriceSign';
import './map-card.css';

interface SiteCardProps {
  readonly game: GameState;
  readonly siteId: string;
  /** The sites the player means to start building on when the quarter ends. */
  readonly plannedSiteIds: readonly string[];
  /** When each project is built and in use, as the decisions in force will leave it. */
  readonly schedule: readonly SiteSchedule[];
  /** The sites whose instalment the treasury will not cover this quarter. */
  readonly pausedSites: readonly string[];
  /** The sites in use that this quarter's upkeep will not reach, so that they decay. */
  readonly upkeepShort: readonly string[];
  /** Plans building here this quarter, or takes the plan back. */
  readonly onPlan: (siteId: string, planned: boolean) => void;
  readonly onClose: () => void;
}

/**
 * The card for the site picked out on the map: what it is, what it costs, what it does and
 * how it stands. Building is started here. It begins when the quarter ends, so until then
 * the plan can be taken back.
 */
export function SiteCard(props: SiteCardProps) {
  const { game, siteId, plannedSiteIds, schedule, pausedSites, upkeepShort, onPlan, onClose } =
    props;
  const site = game.country.sites.find((candidate) => candidate.id === siteId);
  if (!site) return null;
  const terms = siteTerms(site.type);
  const status = siteStatus(game, site.id);
  const planned = plannedSiteIds.includes(site.id);
  const underWay = status.state === 'building' || status.state === 'paused';
  // When it opens is the simulation's to say, so the card agrees with the timeline.
  const scheduled = schedule.find((entry) => entry.siteId === site.id);
  const opens = scheduled === undefined ? null : opening(scheduled, termCalendar(game));
  const unpaid = pausedSites.includes(site.id);
  const instalment = formatMoney(status.instalment);
  const upkeep = formatMoney(terms.upkeep);
  const goesWithout = upkeepShort.includes(site.id);
  const damage = damageTo(game, site.id);
  const nameOf = (id: string) =>
    game.country.sites.find((candidate) => candidate.id === id)?.name ?? id;
  const rivals = listed(site.alternatives.map(nameOf));
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
        <Fact label="Upkeep" value={`${upkeep} a quarter`} />
        <Fact label="Region" value={regionName(game.country, site.regionId)} />
        {underWay && <Fact label="Built" value={`${progressOf(status)} quarters`} />}
      </div>

      {planned && (
        <p className="map-card__note">
          Building starts when this quarter ends. The first instalment is {instalment}.
        </p>
      )}
      {status.state === 'building' && !unpaid && opens !== null && (
        <p className="map-card__note">
          It opens {opens}, if each instalment is paid. The next is {instalment}.
        </p>
      )}
      {status.state === 'building' && unpaid && opens !== null && (
        <p className="warning-note">
          ▲ The treasury cannot cover this quarter’s {instalment} instalment, so building will
          pause. It would then open {opens}.
        </p>
      )}
      {status.state === 'paused' && opens !== null && (
        <p className="warning-note">
          ▲ Building is paused: the treasury could not cover the {instalment} instalment.{' '}
          {unpaid
            ? `It cannot cover it this quarter either, and the site would then open ${opens}.`
            : `It carries on this quarter, and the site opens ${opens} if each instalment is paid.`}
        </p>
      )}
      {status.state === 'empty' && rivals !== '' && (
        <p className="warning-note">
          ▲ Starting it closes {rivals} for good: they are alternatives, and only one of them can be
          built.
        </p>
      )}
      {status.closedBy !== null && (
        <p className="warning-note" role="status">
          ✕ Closed: building began on {nameOf(status.closedBy)}, its alternative, so {site.name} can
          no longer be built.
        </p>
      )}
      {status.opened !== null && (
        <p className="map-card__note">In use since {formatDate(status.opened)}.</p>
      )}
      {SITE_POWER_ROLES[site.type] !== null && status.opened !== null && (
        <PowerReach game={game} siteId={site.id} />
      )}
      {status.state === 'decaying' && (
        <p className="warning-note" role="status">
          ▲ Decaying: {damage === null ? 'upkeep fell short' : `${damage} damaged it`}, so it does
          only {DECAYING_SHARE} of what it does in good repair. {terms.decayingEffect}{' '}
          {goesWithout
            ? `This quarter’s upkeep will not reach it either. Paying its ${upkeep} upkeep restores it.`
            : `This quarter’s upkeep pays its ${upkeep}, which restores it from next quarter.`}
        </p>
      )}
      {status.state === 'operating' && goesWithout && (
        <p className="warning-note">
          ▲ This quarter’s upkeep will not reach it, so it will decay from next quarter.{' '}
          {UPKEEP_ORDER_RULE}
        </p>
      )}
      {SITE_CHAIN_ROLES[site.type] === 'outlet' && status.closedBy === null && (
        <TradeLinkNote game={game} siteId={site.id} />
      )}
      {chainsThrough(game, site.id).map((chain) => (
        <ChainList key={chain.sourceId} game={game} chain={chain} siteId={site.id} />
      ))}
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

interface ChainListProps {
  readonly game: GameState;
  readonly chain: Chain;
  /** The site whose card this is. */
  readonly siteId: string;
}

/**
 * A chain the site is part of: what its source earns at the world ore price, every site the
 * chain runs through with how it stands, the missing links and the bottleneck. Each mark is
 * spelt out in words, so none of it rests on colour. The source's own card shows the ore
 * price, its trend and forecast, and what the source earns at it.
 */
function ChainList({ game, chain, siteId }: ChainListProps) {
  const nameOf = (id: string) =>
    game.country.sites.find((candidate) => candidate.id === id)?.name ?? id;
  const source = nameOf(chain.sourceId);
  const own = chain.sourceId === siteId;
  const title = own ? 'Chain to a port' : `Part of the chain of ${source}`;
  const missing = chain.missing.map(nameOf).join(', ');
  return (
    <section className="map-card__chain" aria-label={title}>
      <div className="map-card__term">{title}</div>
      {chain.shipped > 0 ? (
        <p className="map-card__note" role="status">
          Earning: {source} ships {formatTonnes(chain.shipped)} of ore a quarter, which at{' '}
          {formatPrice(chain.orePrice)} adds {formatMoney(chain.output)} to its region’s output.
        </p>
      ) : (
        <p className="warning-note" role="status">
          ▲ {source} earns nothing
          {chain.complete
            ? ' until it is built.'
            : `: its chain is missing ${missing}, which must be built and in use.`}
        </p>
      )}
      <ul className="map-card__links" aria-label="Links">
        {chain.links.map((link) => {
          const inUse = link.state === 'operating' || link.state === 'decaying';
          const isMissing = chain.missing.includes(link.siteId);
          const marks = [
            ...(link.siteId === chain.sourceId ? ['source'] : []),
            ...(isMissing ? ['✕ Missing'] : []),
            ...(link.siteId === chain.bottleneck ? ['◆ Bottleneck'] : []),
          ];
          return (
            <li key={link.siteId}>
              <span className="map-card__link-name">{nameOf(link.siteId)}</span>
              <span className="map-card__link-state">
                {[
                  SITE_STATE_NAMES[link.state],
                  ...(inUse && link.carries !== null
                    ? [`carries ${formatTonnes(oreTonnesOf(link.carries))}`]
                    : []),
                  ...marks,
                ].join(' · ')}
              </span>
            </li>
          );
        })}
      </ul>
      {chain.bottleneck !== null && (
        <p className="map-card__note">
          Bottleneck: {nameOf(chain.bottleneck)}
          {chain.missing.includes(chain.bottleneck)
            ? ', which is missing.'
            : chain.shipped > 0
              ? `, which holds the chain to ${formatTonnes(chain.shipped)} of ore a quarter.`
              : ', which is not yet built.'}
        </p>
      )}
      {own && <OrePrice game={game} siteId={siteId} />}
    </section>
  );
}

/**
 * The world ore price a mine sells at, and what the mine earns, or would earn once its chain is
 * complete, at the price now and within the price's forecast.
 */
function OrePrice({ game, siteId }: { readonly game: GameState; readonly siteId: string }) {
  const earnings = oreEarnings(game, siteId);
  if (earnings === null) return null;
  const { tonnes, shipping, price, earns, forecast } = earnings;
  return (
    <section className="map-card__ore" aria-label="Earnings at the world ore price">
      <WorldPriceSign status={priceStatus(game, 'ore')} goodWhen="rising" />
      <p className="map-card__note" role="status">
        {shipping ? 'Its' : 'Once its chain is complete, its'} {formatTonnes(tonnes)} of ore a
        quarter {shipping ? 'earn' : 'would earn'} {formatMoney(earns)} at {formatPrice(price)}, and
        from {formatMoney(forecast.min)} to {formatMoney(forecast.max)} within the forecast{' '}
        {forecastSpan()}.
      </p>
    </section>
  );
}

/**
 * What a port carries across the border, and how what all the trade links carry is shared;
 * or, before it is in use, what it would add to them.
 */
function TradeLinkNote({ game, siteId }: { readonly game: GameState; readonly siteId: string }) {
  const site = game.country.sites.find((candidate) => candidate.id === siteId);
  if (site === undefined) return null;
  const capacity = tradeCapacity(game);
  const link = capacity.links.find((candidate) => candidate.id === siteId);
  if (link === undefined) {
    return (
      <p className="map-card__note">
        Once in use, it adds {formatTonnes(portTonnesOf(site.type))} a quarter to the{' '}
        {formatTonnes(capacity.total)} the trade links carry now.
      </p>
    );
  }
  return (
    <p className="map-card__note" role="status">
      Trade link: it carries {formatTonnes(link.tonnes)} a quarter across the border
      {link.decaying ? ', half its capacity while it decays' : ''}. Of the{' '}
      {formatTonnes(capacity.total)} all the trade links carry, the mines’ ore takes{' '}
      {formatTonnes(capacity.ore)}, leaving {formatTonnes(capacity.total - capacity.ore)} for grain
      bought and sold abroad.
    </p>
  );
}

/** The regions a power station or line in use brings power to, or why it brings none. */
function PowerReach({ game, siteId }: { readonly game: GameState; readonly siteId: string }) {
  const reached = regionPower(game)
    .filter((power) => power.stationId === siteId || power.lineId === siteId)
    .map((power) => regionName(game.country, power.regionId));
  return reached.length > 0 ? (
    <p className="map-card__note" role="status">
      Powering {listed(reached)}.
    </p>
  ) : (
    <p className="warning-note" role="status">
      ▲ Powering no region: power reaches a region only along a power line in use that links it to a
      power station in use.
    </p>
  );
}

/** Names in a sentence: "A", "A and B", "A, B and C". */
function listed(names: readonly string[]): string {
  return names.length < 2
    ? (names[0] ?? '')
    : `${names.slice(0, -1).join(', ')} and ${names.at(-1) ?? ''}`;
}

function Fact({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div role="group" aria-label={label}>
      <div className="map-card__term">{label}</div>
      <div className="map-card__value">{value}</div>
    </div>
  );
}
