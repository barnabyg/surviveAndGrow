import {
  armyLoyaltyStatus,
  chainsThrough,
  coupAfterPlottingQuarters,
  electionStatus,
  formatQuarters,
  researchStatuses,
  surveyStatus,
  surveyStatuses,
  TIERS,
  type GameState,
  type Risk,
  type Technology,
} from '../sim';

/**
 * What a first-time tip waits for. Each is read from the game as it stands, the risks ahead,
 * the projects the player has planned and what the player has open, by `tipsDue`.
 */
export type TipCondition =
  | 'dilemma'
  | 'weather-warning'
  | 'unrest'
  | 'decay'
  | 'price-shock'
  | 'missing-link'
  | 'bailout'
  | 'election-near'
  | 'tier-passed'
  | 'research'
  | 'survey'
  | 'army-loyalty';

/** A note shown once, the first time what it explains appears in a game. */
export interface Tip {
  /** Names the tip in storage, which remembers it was seen. Renaming one shows it again. */
  readonly id: string;
  readonly when: TipCondition;
  /** The part of the screen it points at, as a tour step does. */
  readonly target: string | null;
  readonly title: string;
  readonly text: string;
}

/** The tips, in the order they are shown when several are due at once. */
export const TIPS: readonly Tip[] = [
  {
    id: 'dilemma',
    when: 'dilemma',
    target: 'dilemma-panel',
    title: 'A dilemma',
    text: 'Now and then a quarter puts a decision to you. Each answer says what it will do before you choose it. The quarter cannot end until you have answered, and you can change your answer here until it does.',
  },
  {
    id: 'bailout',
    when: 'bailout',
    target: 'vitals',
    title: 'Bailout and austerity',
    text: 'A payment was missed, so everything owed has been rolled into one bailout loan, the credit rating is at its lowest, and austerity holds for a time: a floor on tax, caps on spending, and no new borrowing or projects. The top bar counts down the quarters it has left.',
  },
  {
    id: 'weather-warning',
    when: 'weather-warning',
    target: 'risks',
    title: 'Drought and flood',
    text: 'Risks ahead warns of a drought or flood that could strike, and what it would cost. Weather cuts a region’s harvest, and a flood also sets its sites decaying. Grain stores, irrigation, a healthy reserve and relief are how a region rides one out.',
  },
  {
    id: 'unrest',
    when: 'unrest',
    target: 'regions',
    title: 'Strikes and protests',
    text: 'Where approval falls below the strike threshold a region strikes, and its output falls, which costs far more revenue than the tax that provoked it. Lower down it protests. The approval lens shows where.',
  },
  {
    id: 'price-shock',
    when: 'price-shock',
    target: 'trade',
    title: 'A world price shock',
    text: 'A shock abroad has been announced: it will push a world price for three quarters, two quarters from when it was announced. Trade and the mines’ earnings feel it. Buy or sell before it lands if that helps.',
  },
  {
    id: 'missing-link',
    when: 'missing-link',
    target: 'map',
    title: 'Chains need every link',
    text: 'The project you have planned is part of a chain, and a link of it is missing. A mine earns nothing until a road links it to a port, and a chain yields no more than its weakest link. The infrastructure lens marks every missing link.',
  },
  {
    id: 'decay',
    when: 'decay',
    target: 'budget',
    title: 'Decay',
    text: 'A site is decaying. When upkeep spending is short of what the sites in use need, the newest decay first, and a decaying site does only part of its work. Raise upkeep in the budget to repair it.',
  },
  {
    id: 'election-near',
    when: 'election-near',
    target: 'election',
    title: 'The election is near',
    text: 'The vote is a year away. Approval at the end of the term becomes your share of the vote, and below 50% you are out. Projects that open after the vote do nothing to win it.',
  },
  {
    id: 'tier-passed',
    when: 'tier-passed',
    target: 'vitals',
    title: 'A new tier',
    text: 'The country has passed into a higher tier of prosperity, and the map shows it. People now expect more, so approval settles lower for the same budget. Hold the top tier for a year, with debt in check, to win.',
  },
  {
    id: 'research',
    when: 'research',
    target: 'research',
    title: 'Research',
    text: 'The research tab holds the technology tree. Research is a project with no site: the treasury must hold its whole cost, it is paid in instalments after the budget and pauses when the treasury cannot pay. One technology is researched at a time, and it is known for good from the quarter after its last instalment.',
  },
  {
    id: 'survey',
    when: 'survey',
    target: 'map',
    title: 'Surveys',
    text: 'A region marked with a magnifying glass may hide a deposit of ore. Its card says what a survey costs, how likely it is to find one and how large it could be. A survey is paid like any project and each region is surveyed once. If it finds a deposit, its mine and road appear on the map to be built.',
  },
  {
    id: 'army-loyalty',
    when: 'army-loyalty',
    target: 'vitals',
    title: 'Defence and the army',
    text: `The army’s loyalty is slipping, or is set to. Defence spending in the budget is judged against what the army expects for the country’s people: spend less and loyalty falls, a part of the way each quarter. Strikes in a region pull the army there down, and protests further. The army is read as loyal, restless or plotting, and an army left plotting for ${formatQuarters(coupAfterPlottingQuarters)} running takes power, and the game is lost. The top bar shows national loyalty with its stage, counts the quarters left while it plots, and opens to say what moves it; each region’s card shows its own.`,
  },
];

/**
 * What a tip may be shown for: the game as it stands, what the player has planned and what
 * the player has open.
 */
export interface TipView {
  readonly game: GameState;
  /** The risks ahead under the decisions in force. */
  readonly risks: readonly Risk[];
  /** The sites the player has planned to build on this quarter. */
  readonly plannedSiteIds: readonly string[];
  /** The technology the player has planned to research this quarter, if any. */
  readonly plannedResearch?: Technology | null;
  /** The regions the player has planned to survey this quarter. */
  readonly plannedSurveys?: readonly string[];
  /** The decisions tab the player has open, if known. */
  readonly openTab?: string | null;
  /** The region the player has picked out on the map, whose card is open, if any. */
  readonly selectedRegionId?: string | null;
}

/** How many quarters before the election quarter its tip is shown: a year ahead. */
const ELECTION_NOTICE_QUARTERS = 3;

/** The tip conditions that hold now. */
export function tipsDue(view: TipView): ReadonlySet<TipCondition> {
  const { game, risks, plannedSiteIds, plannedResearch, plannedSurveys } = view;
  const due = new Set<TipCondition>();
  if (game.outcome.status !== 'playing') return due;
  if (game.dilemma !== null) due.add('dilemma');
  if (risks.some((risk) => risk.kind === 'event')) due.add('weather-warning');
  if (game.regions.some((region) => region.unrest !== 'calm')) due.add('unrest');
  if (game.projects.some((project) => project.status === 'decaying')) due.add('decay');
  if (game.priceShocks.length > 0) due.add('price-shock');
  const missingLink = plannedSiteIds.some((siteId) =>
    chainsThrough(game, siteId).some((chain) =>
      chain.missing.some((missing) => !plannedSiteIds.includes(missing)),
    ),
  );
  if (missingLink) due.add('missing-link');
  if (game.austerity !== null) due.add('bailout');
  if (electionStatus(game).quartersAway <= ELECTION_NOTICE_QUARTERS) due.add('election-near');
  if (TIERS.indexOf(game.tier) > TIERS.indexOf(game.startingTier)) due.add('tier-passed');
  // Research is explained once the player opens its tab, plans it, or has it under way.
  const research = researchStatuses(game, plannedResearch ?? null);
  const researching = research.some((status) =>
    ['planned', 'researching', 'paused'].includes(status.state),
  );
  if (view.openTab === 'research' || researching) due.add('research');
  // Surveys are explained once the player opens the card of a region that could be surveyed,
  // plans one, or has one under way.
  const plan = { startSurveys: plannedSurveys ?? [] };
  const surveys = surveyStatuses(game, plan);
  const surveying = surveys.some((status) =>
    ['planned', 'surveying', 'paused'].includes(status.state),
  );
  const regionId = view.selectedRegionId ?? null;
  const offered = regionId !== null && surveyStatus(game, regionId, plan).state !== 'barren';
  if (offered || surveying) due.add('survey');
  // Defence and the army are explained once the army anywhere is less than loyal, or the
  // budget in force would leave it so.
  const army = armyLoyaltyStatus(game);
  const slipping = [army, ...army.regions].some(
    (each) => each.stage !== 'loyal' || each.settlesStage !== 'loyal',
  );
  if (slipping) due.add('army-loyalty');
  return due;
}
