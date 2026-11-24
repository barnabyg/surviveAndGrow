import {
  ARMY_STAGE_NAMES,
  armyLoyaltyStatus,
  borderIncidentStatuses,
  buildingBarred,
  CIVIL_FACTIONS,
  DECAYING_SHARE,
  describeEvent,
  describeUnrest,
  FACTION_NAMES,
  FOOD_STAGE_NAMES,
  formatCount,
  formatMoney,
  formatPercent,
  formatPoints,
  formatSignedPoints,
  formatIndex,
  formatQuarters,
  formatTonnes,
  LASTING_SERVICE_NAMES,
  listed,
  livingStandards,
  percentOff,
  PROSPERITY_PART_NAMES,
  regionFactions,
  serviceLevels,
  surveyStatus,
  SURVEY_STATE_NAMES,
  technologyName,
  weatherHold,
  type Budget,
  type Contribution,
  type GameState,
  type LivingStandard,
  type Preview,
  type RegionArmyLoyalty,
  type RegionFactions,
  type ProjectPlan,
  type SurveyStatus,
  type TurnReport,
  type WeatherHold,
} from '../sim';
import { formatDate, formatSignedCount } from './format';
import { quartersLeftWords } from './IncidentMark';
import './map-card.css';

interface RegionCardProps {
  readonly game: GameState;
  /** The report on the quarter just ended, which says what moved the region's people. */
  readonly report: TurnReport | null;
  readonly regionId: string;
  /** What the decisions now in force will do this quarter. */
  readonly preview: Preview;
  /** The budget the quarter will be resolved with, which holds health and education. */
  readonly budget: Budget;
  /** The region food relief is being sent to, if any. */
  readonly reliefRegionId: string | null;
  readonly onSendRelief: (regionId: string | null) => void;
  /** Everything the player means to start this quarter, among it the surveys. */
  readonly plan: ProjectPlan;
  /** Plans a survey of the region this quarter, or takes the plan back. */
  readonly onPlanSurvey: (regionId: string, planned: boolean) => void;
  readonly onClose: () => void;
}

/** The card for the region picked out on the map: how it stands, and relief at a click. */
export function RegionCard(props: RegionCardProps) {
  const { game, report, regionId, preview, reliefRegionId, onSendRelief, onClose } = props;
  const { plan, onPlanSurvey, budget } = props;
  const region = game.country.regions.find((candidate) => candidate.id === regionId);
  const state = game.regions.find((candidate) => candidate.id === regionId);
  if (!region || !state) return null;

  const events = game.events.filter((event) => event.regionId === regionId);
  const shortfall = preview.shortfalls.find((entry) => entry.regionId === regionId)?.shortfall;
  const relieved = reliefRegionId === regionId;
  const survey = surveyStatus(game, regionId, plan);
  const unrest = describeUnrest(state.unrest);
  // The border incidents announced or in force on a border this region is on.
  const incidents = borderIncidentStatuses(game).filter((incident) =>
    incident.regionIds.includes(regionId),
  );
  const standard = livingStandards(game).find((entry) => entry.regionId === regionId);
  const services = serviceLevels(game, budget).filter((entry) => entry.regionId === regionId);
  const army = armyLoyaltyStatus(game, budget).regions.find((entry) => entry.regionId === regionId);
  // What moved the region's people last quarter: its growth, and any deaths in famine.
  const moved = (report?.population?.contributions ?? []).filter(
    (line) => line.regionId === regionId,
  );

  return (
    <section className="map-card" aria-labelledby="region-card-title">
      <div>
        <div className="label label--pending">Region · {region.terrain}</div>
        <h2 className="map-card__name" id="region-card-title">
          {region.name}
        </h2>
      </div>
      <dl className="map-card__list">
        <div>
          <dt>People</dt>
          <dd>{formatCount(state.population)}</dd>
        </div>
        {moved.map((line) => (
          <div key={line.label}>
            <dt>{line.amount > 0 ? 'Grew last quarter' : 'Died in famine'}</dt>
            <dd>{formatSignedCount(line.amount)}</dd>
          </div>
        ))}
        <div>
          <dt>Living standard</dt>
          <dd>{formatIndex(standard?.value ?? 0)}</dd>
        </div>
        <div>
          <dt>Food</dt>
          <dd>{FOOD_STAGE_NAMES[state.foodStage]}</dd>
        </div>
        <div>
          <dt>In store</dt>
          <dd>{formatTonnes(state.foodStock)}</dd>
        </div>
        <div>
          <dt>Approval</dt>
          <dd>{formatPercent(state.approval)}</dd>
        </div>
        {army !== undefined && (
          <div>
            <dt>Army loyalty</dt>
            <dd>
              {formatPercent(army.loyalty)} · {ARMY_STAGE_NAMES[army.stage]}
            </dd>
          </div>
        )}
        {services.map((entry) => (
          <div key={entry.service}>
            <dt>{PROSPERITY_PART_NAMES[entry.service]}</dt>
            <dd>{formatIndex(entry.level)}</dd>
          </div>
        ))}
      </dl>
      {standard !== undefined && <PowerNote game={game} standard={standard} />}
      {standard !== undefined && (
        <div className="map-card__parts">
          <Parts
            title="Output a quarter"
            parts={standard.output}
            total={standard.output.reduce((total, part) => total + part.amount, 0)}
            format={formatMoney}
          />
          <Parts
            title="Infrastructure access"
            parts={standard.infrastructure}
            total={standard.scores.infrastructure}
            format={(permille) => formatIndex(permille)}
          />
        </div>
      )}
      {/* Spending holds every region's level alike, so only a site in use here is worth a table. */}
      {services
        .filter((entry) => entry.parts.length > 1)
        .map((entry) => (
          <Parts
            key={entry.service}
            title={`Where its ${LASTING_SERVICE_NAMES[entry.service]} level settles`}
            parts={entry.parts}
            total={entry.settles}
            format={(permille) => formatIndex(permille)}
          />
        ))}
      <WeatherHoldParts hold={weatherHold(game, regionId)} />
      {unrest !== null && <p className="warning-note">▲ {unrest}</p>}
      {incidents.map((incident) => (
        <p
          key={incident.neighbourId}
          className="warning-note"
          role="status"
          aria-label={incident.headline}
        >
          ▲{' '}
          {incident.inForce
            ? `${incident.headline} · output −${incident.outputCutPercent}% ${quartersLeftWords(incident.quartersLeft)}. The treasury’s breakdown shows the tax it costs here.`
            : `${incident.headline} from ${formatDate(incident.begins)}: output −${incident.outputCutPercent}% for ${formatQuarters(incident.lastsQuarters)}, and a blow of ${formatPoints(Math.abs(incident.approvalPermille))} to approval here as it begins. It is called off if ${incident.name} is no longer hostile by then.`}
        </p>
      ))}
      {army !== undefined && <ArmyNote army={army} />}
      <FactionsNote factions={regionFactions(game, regionId)} />
      {events.map((event) => (
        <p key={event.type} className="warning-note">
          ▲ {describeEvent(game, event)}
        </p>
      ))}
      <SurveySection status={survey} barred={buildingBarred(game) !== null} />
      <p className={shortfall === undefined ? 'map-card__note' : 'warning-note'}>
        {shortfall === undefined
          ? 'Its people have enough to eat this quarter.'
          : `▲ Its people will go short of ${formatTonnes(shortfall)} this quarter.`}
      </p>
      <div className="button-row">
        <button type="button" className="button" onClick={onClose}>
          Close
        </button>
        <SurveyButton
          status={survey}
          onPlan={(planned) => {
            onPlanSurvey(regionId, planned);
          }}
        />
        <button
          type="button"
          className="button button--commit"
          aria-pressed={relieved}
          onClick={() => {
            onSendRelief(relieved ? null : regionId);
          }}
        >
          {relieved ? 'Stop sending relief' : 'Send food relief here'}
        </button>
      </div>
    </section>
  );
}

interface SurveySectionProps {
  readonly status: SurveyStatus;
  /** Whether austerity forbids starting anything. */
  readonly barred: boolean;
}

/**
 * The region's survey in a line or two, so the card stays short: what one costs and takes,
 * how likely it is to find a deposit and how large one could be, before the player commits;
 * then how it is going, and what it found. A region where no deposit could lie shows nothing.
 */
function SurveySection({ status, barred }: SurveySectionProps) {
  const { name, state, tonnes } = status;
  if (state === 'barren') return null;
  const range =
    tonnes === null
      ? ''
      : tonnes.min === tonnes.max
        ? formatTonnes(tonnes.min)
        : `${formatTonnes(tonnes.min)} to ${formatTonnes(tonnes.max)}`;
  const progress =
    state === 'surveying' || state === 'paused'
      ? ` · ${status.quartersPaid} of ${formatQuarters(status.surveyQuarters)} done`
      : '';
  return (
    <section className="map-card__survey" aria-label="Survey">
      <p className="map-card__note">
        <span className="map-card__term">
          Survey · {SURVEY_STATE_NAMES[state]}
          {progress}
        </span>{' '}
        {state === 'unsurveyed' || state === 'planned'
          ? `${formatMoney(status.cost)} over ${formatQuarters(status.surveyQuarters)} · ${formatPercent(Math.round(status.likelihood * 1000), 0)} chance of a find · ${range} of ore a quarter if found.${state === 'planned' ? ' It starts when this quarter ends.' : ''}`
          : state === 'surveying'
            ? `${formatMoney(status.instalment)} this quarter. What it finds is reported when it is done.`
            : ''}
      </p>
      {state === 'surveyed' && (
        <p className="map-card__note" role="status" aria-label="Survey result">
          {status.found === null
            ? 'Surveyed: no deposit of ore worth mining lies here.'
            : `Surveyed: a deposit of ore was found. Its mine could yield ${formatTonnes(status.found)} a quarter.`}
        </p>
      )}
      {state === 'paused' && (
        <p className="warning-note">
          ▲ Paused: the treasury could not cover its {formatMoney(status.instalment)} instalment.
        </p>
      )}
      {state === 'unsurveyed' && status.fault !== null && (
        <p className="warning-note" role="note" aria-label={`Why ${name} cannot be surveyed`}>
          ▲ {barred ? 'No survey can be started during austerity.' : status.fault}
        </p>
      )}
    </section>
  );
}

/** The button that plans a survey of the region, or takes the plan back, when either can be done. */
function SurveyButton({
  status,
  onPlan,
}: {
  readonly status: SurveyStatus;
  readonly onPlan: (planned: boolean) => void;
}) {
  const { name, state } = status;
  if (state === 'planned') {
    return (
      <button
        type="button"
        className="button"
        aria-label={`Cancel the survey of ${name}`}
        onClick={() => {
          onPlan(false);
        }}
      >
        Cancel survey
      </button>
    );
  }
  if (state !== 'unsurveyed' || status.fault !== null) return null;
  return (
    <button
      type="button"
      className="button"
      aria-label={`Survey ${name}`}
      onClick={() => {
        onPlan(true);
      }}
    >
      Survey
    </button>
  );
}

/**
 * A warning, by a sign as well as colour, while the army in the region is anything but loyal or
 * is heading that way: how it stands and where it is heading, in a line. A loyal army that is
 * staying loyal has its figure above and no more said of it, so the card stays short.
 */
function ArmyNote({ army }: { readonly army: RegionArmyLoyalty }) {
  if (army.stage === 'loyal' && army.settlesStage === 'loyal') return null;
  const heading =
    army.settles === army.loyalty
      ? ''
      : `, and heading for ${formatPercent(army.settles)}, ${ARMY_STAGE_NAMES[army.settlesStage].toLowerCase()}, as Defence spending and the unrest here stand`;
  return (
    <p className="warning-note" role="status" aria-label="Army">
      ▲ The army here is {ARMY_STAGE_NAMES[army.stage].toLowerCase()}
      {heading}.
    </p>
  );
}

/**
 * The region's faction mix and what the factions as they stand do to its approval, in a line:
 * the share of its people in each, then the effect and each faction's part of it. A region
 * whose people follow none shows nothing.
 */
function FactionsNote({ factions }: { readonly factions: RegionFactions }) {
  const mixed = CIVIL_FACTIONS.filter((faction) => factions.shares[faction] > 0);
  // A region whose people follow no faction has nothing to say of them.
  if (mixed.length === 0) return null;
  const shares = listed(
    mixed.map(
      (faction) =>
        `${formatPercent(factions.shares[faction], 0)} ${FACTION_NAMES[faction].toLowerCase()}`,
    ),
  );
  const parts = listed(
    mixed.map(
      (faction) =>
        `${FACTION_NAMES[faction].toLowerCase()} ${formatSignedPoints(factions.parts[faction])}`,
    ),
  );
  return (
    <p className="map-card__note" role="note" aria-label="Factions">
      <span className="map-card__term">Factions</span> {shares}. As they stand they move approval
      here by {formatSignedPoints(factions.effect)}: {parts}.
    </p>
  );
}

/** Whether power reaches the region, from which station along which line, and how well. */
function PowerNote({ game, standard }: { game: GameState; standard: LivingStandard }) {
  const { power } = standard;
  const nameOf = (id: string | null) =>
    game.country.sites.find((site) => site.id === id)?.name ?? '';
  if (power.stationId === null) {
    return (
      <p className="map-card__note" role="status" aria-label="Power">
        Not powered: no power line in use links it to a power station.
      </p>
    );
  }
  const from = `${nameOf(power.stationId)}, along ${nameOf(power.lineId)}`;
  return power.weakened ? (
    <p className="warning-note" role="status" aria-label="Power">
      ▲ Power weakened: the power from {from} runs through a decaying site, so it gives only{' '}
      {DECAYING_SHARE} of what it gives in good repair.
    </p>
  ) : (
    <p className="map-card__note" role="status" aria-label="Power">
      Powered from {from}.
    </p>
  );
}

interface PartsProps {
  readonly title: string;
  readonly parts: readonly Contribution[];
  /** What the parts come to, which may be capped below their sum. */
  readonly total: number;
  readonly format: (amount: number) => string;
}

/**
 * How much less the weather, drought and flood move the region's harvest, and each site in use
 * there and technology known that lessens it, with what it takes off alone; an improved site
 * says what it would take off without the technologies that improve it. Nothing while none
 * does.
 */
function WeatherHoldParts({ hold }: { readonly hold: WeatherHold }) {
  if (hold.lines.length === 0) return null;
  const title = 'How much less the weather moves its harvest';
  return (
    <table className="breakdown__table" aria-label={title}>
      <caption className="map-card__term">{title}</caption>
      <tbody>
        {hold.lines.map((line) => (
          <tr key={line.label}>
            <th scope="row">{line.label}</th>
            <td>
              {percentOff(line.permille)}%
              {line.improvedBy.length > 0 &&
                ` (${percentOff(line.unimproved)}% without ${listed(line.improvedBy.map(technologyName))})`}
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <th scope="row">Together</th>
          <td>{percentOff(hold.left)}%</td>
        </tr>
      </tfoot>
    </table>
  );
}

/** A figure of the region's and what it is made of, line by line. */
function Parts({ title, parts, total, format }: PartsProps) {
  return (
    <table className="breakdown__table" aria-label={title}>
      <caption className="map-card__term">{title}</caption>
      <tbody>
        {parts.map((part) => (
          <tr key={part.label}>
            <th scope="row">{part.label}</th>
            <td>{format(part.amount)}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <th scope="row">Total</th>
          <td>{format(total)}</td>
        </tr>
      </tfoot>
    </table>
  );
}
