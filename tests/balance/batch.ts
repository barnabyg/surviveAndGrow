import {
  advanceQuarter,
  approvalStatus,
  createGame,
  electionStatus,
  prosperityStatus,
  TIERS,
  type Country,
  type Decisions,
  type GameState,
  type Tier,
} from '../../src/sim';

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
}

const rankOf = (tier: Tier) => TIERS.indexOf(tier);

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
  while (game.outcome.status === 'playing' && quarters < limit) {
    const result = advanceQuarter(game, decide(game));
    voteShare = result.report.election?.voteShare ?? voteShare;
    game = result.state;
    quarters += 1;
    if (rankOf(game.tier) > rankOf(peakTier)) peakTier = game.tier;
    peakProsperity = Math.max(peakProsperity, prosperityStatus(game).value);
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
}

export function summarise(results: readonly GameResult[]): Summary {
  const count = (ending: GameResult['ending']) =>
    results.filter((result) => result.ending === ending).length;
  const famines = results.filter((result) => result.ending === 'famine');
  const byRegion = new Map<string, number>();
  for (const { regionId } of famines) {
    if (regionId !== null) byRegion.set(regionId, (byRegion.get(regionId) ?? 0) + 1);
  }
  const byTerm = new Map<number, number>();
  for (const { terms } of results.filter((result) => result.ending === 'lostElection')) {
    byTerm.set(terms, (byTerm.get(terms) ?? 0) + 1);
  }
  const zero = { min: 0, median: 0, max: 0 };
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
