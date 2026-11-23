import {
  advanceQuarter,
  approvalStatus,
  createGame,
  debtStatus,
  depositIn,
  electionStatus,
  GOOD_NAMES,
  isInUseState,
  knownTechnologies,
  prosperityStatus,
  siteStatus,
  surveyStatuses,
  TECHNOLOGIES,
  TIERS,
  victoryStatus,
  type Country,
  type Decisions,
  type Figure,
  type GameDate,
  type GameState,
  type Technology,
  type Tier,
} from '../../src/sim';
import { withinRules } from './players';

/** A scripted player: what it decides for the quarter, given the game as it stands. */
export type Decide = (game: GameState) => Decisions;

/**
 * The most terms a balance game is played for unless asked otherwise: four terms, twenty
 * years. A government still in office when they are up has neither won nor lost.
 */
export const DEFAULT_TERMS = 4;

/**
 * How one game ended, and the figures it ended on. A government that keeps winning elections
 * governs on without limit, so a game is played for a number of terms at most. `won` is the
 * win on prosperity; `inOffice` is a game still being played when its terms were up.
 */
export interface GameResult {
  readonly seed: number;
  readonly ending: 'won' | 'inOffice' | 'lostElection' | 'famine';
  /** The region whose famine brought the state down, or null when it did not. */
  readonly regionId: string | null;
  /** How many quarters were played. */
  readonly quarters: number;
  /** How many terms the government served, the one it ended in counted. */
  readonly terms: number;
  /** The quarter of the game, counted from 1, at whose end the game was won, or null. */
  readonly winQuarter: number | null;
  /** The share of the vote at the last election held, in thousandths, or null when none was. */
  readonly voteShare: number | null;
  /** The treasury as the game ended, in Money units. */
  readonly treasury: number;
  /** National approval as the game ended, in thousandths. */
  readonly approval: number;
  /** National prosperity as the game ended, in thousandths. */
  readonly prosperity: number;
  /** The highest tier of prosperity the nation reached in the game. */
  readonly peakTier: Tier;
  /** The highest national prosperity any quarter of the game ended on, in thousandths. */
  readonly peakProsperity: number;
  /** Everything the player borrowed over the game, in Money units. */
  readonly borrowed: number;
  /** How many bailouts a missed payment brought. One during austerity extends it instead. */
  readonly bailouts: number;
  /**
   * How many quarters ended with prosperity held long enough to win but the win withheld by
   * the debt test: the debt burden over its limit.
   */
  readonly heldByDebt: number;
  /** The debt burden as the game ended, in thousandths of a year's revenue. */
  readonly debtBurden: number;
  /** The highest debt burden any quarter of the game ended on, in thousandths. */
  readonly peakDebtBurden: number;
  /** The grain bought abroad over the game, in tonnes. */
  readonly imported: number;
  /** The grain sold abroad over the game, in tonnes. */
  readonly exported: number;
  /** What the grain sold abroad brought in over the game, in Money units. */
  readonly tradeIncome: number;
  /** What the grain bought abroad cost over the game, in Money units. */
  readonly tradeSpending: number;
  /** The shocks the game met: those that struck while it was played. */
  readonly shocks: Shocks;
  /**
   * The technologies known as the game ended, each with the quarter of the game, counted
   * from 1, at whose end its research finished.
   */
  readonly technologies: Readonly<Partial<Record<Technology, number>>>;
  /** How many regions were surveyed as the game ended: the surveys finished. */
  readonly surveys: number;
  /** How many of those surveys found a deposit. */
  readonly depositsFound: number;
  /** How many of the deposits found had their mine in use as the game ended. */
  readonly depositsMined: number;
}

/**
 * The shocks a game met: the world price shocks that moved a price while it was played, and
 * the droughts and floods that began in a region.
 */
export interface Shocks {
  readonly failedHarvestsAbroad: number;
  readonly oreGlut: number;
  readonly drought: number;
  readonly flood: number;
}

export const SHOCK_KINDS: readonly (keyof Shocks)[] = [
  'failedHarvestsAbroad',
  'oreGlut',
  'drought',
  'flood',
];

/** A quarter as a number counted from the start of time, so that dates can be compared. */
const ordinal = (date: GameDate) => date.year * 4 + date.quarter;

/** What a figure's contributions of a label add up to. */
function partOf(figure: Figure | null, label: string): number {
  return (figure?.contributions ?? [])
    .filter((contribution) => contribution.label === label)
    .reduce((total, contribution) => total + contribution.amount, 0);
}

/** The shocks met so far: each kept once, by what it is, where and when it began. */
function meeting(game: GameState, met: Set<string>): void {
  for (const shock of game.priceShocks) {
    if (ordinal(shock.begins) <= ordinal(game.date)) {
      met.add(`${shock.type} ${ordinal(shock.begins)}`);
    }
  }
  for (const event of game.events) {
    met.add(`${event.type} ${event.regionId} ${ordinal(event.began)}`);
  }
}

function countShocks(met: ReadonlySet<string>): Shocks {
  const count = (kind: keyof Shocks) => [...met].filter((key) => key.split(' ')[0] === kind).length;
  return {
    failedHarvestsAbroad: count('failedHarvestsAbroad'),
    oreGlut: count('oreGlut'),
    drought: count('drought'),
    flood: count('flood'),
  };
}

const rankOf = (tier: Tier) => TIERS.indexOf(tier);

/**
 * What the surveys of a game have come to, as the survey tab shows each region: how many are
 * finished, how many of them found a deposit, and how many of the deposits found have their
 * mine in use.
 */
function surveyed(
  game: GameState,
): Pick<GameResult, 'surveys' | 'depositsFound' | 'depositsMined'> {
  const regions = surveyStatuses(game, {});
  const found = regions.filter((region) => region.found !== null);
  const mined = found.filter((region) => {
    const mine = depositIn(game.country, region.regionId)?.mine;
    return mine !== undefined && isInUseState(siteStatus(game, mine.id).state);
  });
  return {
    surveys: regions.filter((region) => region.state === 'surveyed').length,
    depositsFound: found.length,
    depositsMined: mined.length,
  };
}

/**
 * Plays one game through the simulation's public interface, with no screen, until it ends or
 * the number of terms given is up.
 */
export function playGame(
  country: Country,
  seed: number,
  decide: Decide,
  terms = DEFAULT_TERMS,
): GameResult {
  let game = createGame(country, seed);
  const { termQuarters } = electionStatus(game);
  const limit = terms * termQuarters;
  let quarters = 0;
  let voteShare: number | null = null;
  let peakTier = game.tier;
  let peakProsperity = prosperityStatus(game).value;
  let peakDebtBurden = debtStatus(game).burden;
  let borrowed = 0;
  let bailouts = 0;
  let heldByDebt = 0;
  const traded = { imported: 0, exported: 0, tradeIncome: 0, tradeSpending: 0 };
  const sold = `${GOOD_NAMES.grain} exported`;
  const bought = `${GOOD_NAMES.grain} imported`;
  const met = new Set<string>();
  const technologies: Partial<Record<Technology, number>> = {};
  while (game.outcome.status === 'playing' && quarters < limit) {
    const decisions = withinRules(game, decide(game));
    const result = advanceQuarter(game, decisions);
    const kinds = result.report.entries.map((entry) => entry.kind);
    voteShare = result.report.election?.voteShare ?? voteShare;
    // What was planned is lent unless a missed payment brought a bailout that quarter.
    if (kinds.includes('loanTaken')) {
      borrowed += (decisions.borrow ?? []).reduce((total, each) => total + each.amount, 0);
    }
    if (kinds.includes('bailout')) bailouts += 1;
    traded.imported += partOf(result.report.food, bought);
    traded.exported -= partOf(result.report.food, sold);
    traded.tradeIncome += partOf(result.report.treasury, sold);
    traded.tradeSpending -= partOf(result.report.treasury, bought);
    game = result.state;
    meeting(game, met);
    quarters += 1;
    for (const technology of knownTechnologies(game.projects))
      technologies[technology] ??= quarters;
    if (game.outcome.status === 'playing' && victoryStatus(game).waitingOnDebt) heldByDebt += 1;
    if (rankOf(game.tier) > rankOf(peakTier)) peakTier = game.tier;
    peakProsperity = Math.max(peakProsperity, prosperityStatus(game).value);
    peakDebtBurden = Math.max(peakDebtBurden, debtStatus(game).burden);
  }
  const { outcome } = game;
  const figures = {
    seed,
    quarters,
    terms: Math.max(1, Math.ceil(quarters / termQuarters)),
    voteShare,
    treasury: game.treasury,
    approval: approvalStatus(game).approval,
    prosperity: prosperityStatus(game).value,
    peakTier,
    peakProsperity,
    borrowed,
    bailouts,
    heldByDebt,
    debtBurden: debtStatus(game).burden,
    peakDebtBurden,
    ...traded,
    shocks: countShocks(met),
    technologies,
    ...surveyed(game),
  };
  const ended = { regionId: null, winQuarter: null };
  if (outcome.status === 'playing') return { ...figures, ...ended, ending: 'inOffice' };
  switch (outcome.cause) {
    case 'famine':
      return { ...figures, ...ended, ending: 'famine', regionId: outcome.regionId };
    case 'election':
      return { ...figures, ...ended, ending: 'lostElection' };
    case 'prosperity':
      return { ...figures, ...ended, ending: 'won', winQuarter: quarters };
  }
}

/** The least, the middle and the most of a set of figures. */
export interface Spread {
  readonly min: number;
  readonly median: number;
  readonly max: number;
}

/** What a batch of games came to. */
export interface Summary {
  readonly games: number;
  readonly won: number;
  readonly inOffice: number;
  readonly lostElection: number;
  /** The games lost at the vote, by the term whose election was lost, the earliest first. */
  readonly lostElectionByTerm: readonly { readonly term: number; readonly games: number }[];
  /** The games lost to famine, by the region that collapsed, the most frequent first. */
  readonly famine: readonly { readonly regionId: string; readonly games: number }[];
  /** The share of games won on prosperity, in thousandths. */
  readonly winPermille: number;
  /** How many terms the government served. */
  readonly terms: Spread;
  /** The quarter of the game in which the games won were won, or null when none was. */
  readonly winQuarter: Spread | null;
  /** How many games reached each tier as their highest, from the lowest tier up. */
  readonly peakTier: readonly { readonly tier: Tier; readonly games: number }[];
  /** The share of the vote at the last election, in the games that reached one, or null. */
  readonly voteShare: Spread | null;
  readonly treasury: Spread;
  readonly approval: Spread;
  readonly prosperity: Spread;
  /** The highest prosperity each game reached. */
  readonly peakProsperity: Spread;
  /** The quarter in which the games lost to famine ended, or null when none was. */
  readonly famineQuarter: Spread | null;
  /** How much each game borrowed. */
  readonly borrowed: Spread;
  /** The games in which a missed payment brought at least one bailout. */
  readonly bailedOut: number;
  /** How many bailouts each game that had one went through, or null when none did. */
  readonly bailouts: Spread | null;
  /** The games in which the debt test withheld a win for at least a quarter. */
  readonly heldByDebt: number;
  /** Of those, the games won once the debt test passed. */
  readonly wonAfterHold: number;
  /** How many quarters the debt test withheld the win, in the games it withheld one. */
  readonly heldQuarters: Spread | null;
  /** The debt burden each game ended on, in thousandths. */
  readonly debtBurden: Spread;
  /** The highest debt burden each game reached, in thousandths. */
  readonly peakDebtBurden: Spread;
  /** The grain each game bought and sold abroad, in tonnes. */
  readonly imported: Spread;
  readonly exported: Spread;
  /** What each game's trade brought in and cost, in Money units. */
  readonly tradeIncome: Spread;
  readonly tradeSpending: Spread;
  /** How many of each shock each game met. */
  readonly shocks: Readonly<Record<keyof Shocks, Spread>>;
  /** The games that met at least one of each shock. */
  readonly gamesMeeting: Readonly<Record<keyof Shocks, number>>;
  /** How many technologies each game knew as it ended. */
  readonly technologies: Spread;
  /** The games that came to know at least one technology. */
  readonly researched: number;
  /** The quarter in which the first technology became known, in those games, or null. */
  readonly firstTechnology: Spread | null;
  /**
   * Each technology some game came to know, in the tree's order: the games that knew it as
   * they ended, and the quarter in which it became known in them.
   */
  readonly technologyKnown: readonly {
    readonly technology: Technology;
    readonly games: number;
    readonly quarter: Spread;
  }[];
  /** How many regions each game surveyed. */
  readonly surveys: Spread;
  /** How many deposits each game's surveys found. */
  readonly depositsFound: Spread;
  /** The games whose surveys found at least one deposit. */
  readonly foundDeposit: number;
  /**
   * Every deposit found in the batch, each game's counted, and how many of them had their
   * mine in use as their game ended.
   */
  readonly deposits: { readonly found: number; readonly mined: number };
}

export function summarise(results: readonly GameResult[]): Summary {
  const count = (ending: GameResult['ending']) =>
    results.filter((result) => result.ending === ending).length;
  const famines = results.filter((result) => result.ending === 'famine');
  const held = results.filter((result) => result.heldByDebt > 0);
  const byRegion = new Map<string, number>();
  for (const { regionId } of famines) {
    if (regionId !== null) byRegion.set(regionId, (byRegion.get(regionId) ?? 0) + 1);
  }
  const byTerm = new Map<number, number>();
  for (const { terms } of results.filter((result) => result.ending === 'lostElection')) {
    byTerm.set(terms, (byTerm.get(terms) ?? 0) + 1);
  }
  const zero = { min: 0, median: 0, max: 0 };
  /** For each game, the quarters in which its technologies became known. */
  const known = results.map((result) => Object.values(result.technologies));
  return {
    games: results.length,
    won: count('won'),
    inOffice: count('inOffice'),
    lostElection: count('lostElection'),
    lostElectionByTerm: [...byTerm]
      .map(([term, games]) => ({ term, games }))
      .sort((a, b) => a.term - b.term),
    famine: [...byRegion]
      .map(([regionId, games]) => ({ regionId, games }))
      .sort((a, b) => b.games - a.games || a.regionId.localeCompare(b.regionId)),
    winPermille: results.length === 0 ? 0 : Math.round((count('won') * 1000) / results.length),
    terms: spreadOf(results.map((result) => result.terms)) ?? zero,
    winQuarter: spreadOf(results.flatMap((result) => result.winQuarter ?? [])),
    peakTier: TIERS.map((tier) => ({
      tier,
      games: results.filter((result) => result.peakTier === tier).length,
    })),
    voteShare: spreadOf(results.flatMap((result) => result.voteShare ?? [])),
    treasury: spreadOf(results.map((result) => result.treasury)) ?? zero,
    approval: spreadOf(results.map((result) => result.approval)) ?? zero,
    prosperity: spreadOf(results.map((result) => result.prosperity)) ?? zero,
    peakProsperity: spreadOf(results.map((result) => result.peakProsperity)) ?? zero,
    famineQuarter: spreadOf(famines.map((result) => result.quarters)),
    borrowed: spreadOf(results.map((result) => result.borrowed)) ?? zero,
    bailedOut: results.filter((result) => result.bailouts > 0).length,
    bailouts: spreadOf(results.flatMap((result) => (result.bailouts > 0 ? result.bailouts : []))),
    heldByDebt: held.length,
    wonAfterHold: held.filter((result) => result.ending === 'won').length,
    heldQuarters: spreadOf(held.map((result) => result.heldByDebt)),
    debtBurden: spreadOf(results.map((result) => result.debtBurden)) ?? zero,
    peakDebtBurden: spreadOf(results.map((result) => result.peakDebtBurden)) ?? zero,
    imported: spreadOf(results.map((result) => result.imported)) ?? zero,
    exported: spreadOf(results.map((result) => result.exported)) ?? zero,
    tradeIncome: spreadOf(results.map((result) => result.tradeIncome)) ?? zero,
    tradeSpending: spreadOf(results.map((result) => result.tradeSpending)) ?? zero,
    shocks: byShock((kind) => spreadOf(results.map((result) => result.shocks[kind])) ?? zero),
    gamesMeeting: byShock((kind) => results.filter((result) => result.shocks[kind] > 0).length),
    technologies: spreadOf(known.map((quarters) => quarters.length)) ?? zero,
    researched: known.filter((quarters) => quarters.length > 0).length,
    firstTechnology: spreadOf(
      known.flatMap((quarters) => (quarters.length > 0 ? Math.min(...quarters) : [])),
    ),
    technologyKnown: TECHNOLOGIES.flatMap((technology) => {
      const quarters = results.flatMap((result) => result.technologies[technology] ?? []);
      const quarter = spreadOf(quarters);
      return quarter === null ? [] : [{ technology, games: quarters.length, quarter }];
    }),
    surveys: spreadOf(results.map((result) => result.surveys)) ?? zero,
    depositsFound: spreadOf(results.map((result) => result.depositsFound)) ?? zero,
    foundDeposit: results.filter((result) => result.depositsFound > 0).length,
    deposits: {
      found: results.reduce((total, result) => total + result.depositsFound, 0),
      mined: results.reduce((total, result) => total + result.depositsMined, 0),
    },
  };
}

function byShock<Value>(value: (kind: keyof Shocks) => Value): Record<keyof Shocks, Value> {
  return {
    failedHarvestsAbroad: value('failedHarvestsAbroad'),
    oreGlut: value('oreGlut'),
    drought: value('drought'),
    flood: value('flood'),
  };
}

function spreadOf(values: readonly number[]): Spread | null {
  const sorted = [...values].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted.at(-1);
  if (min === undefined || max === undefined) return null;
  const middle = Math.floor(sorted.length / 2);
  const upper = sorted[middle] ?? max;
  const lower = sorted[middle - 1] ?? min;
  return { min, median: sorted.length % 2 === 1 ? upper : Math.round((lower + upper) / 2), max };
}
