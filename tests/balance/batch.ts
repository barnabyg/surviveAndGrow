import {
  advanceQuarter,
  approvalStatus,
  createGame,
  electionStatus,
  type Country,
  type Decisions,
  type GameState,
} from '../../src/sim';

/** A scripted player: what it decides for the quarter, given the game as it stands. */
export type Decide = (game: GameState) => Decisions;

/**
 * How one game ended, and the figures it ended on. A government that keeps winning governs
 * on without limit, so a game is played for a number of terms at most: one, unless asked for
 * more. One still in office when they are up ends `reelected`; `won` is the win on prosperity.
 */
export interface GameResult {
  readonly seed: number;
  readonly ending: 'won' | 'reelected' | 'lostElection' | 'famine';
  /** The region whose famine brought the state down, or null when it did not. */
  readonly regionId: string | null;
  /** How many quarters were played. */
  readonly quarters: number;
  /** The share of the vote at the last election held, in thousandths, or null when none was. */
  readonly voteShare: number | null;
  /** The treasury as the game ended, in Money units. */
  readonly treasury: number;
  /** National approval as the game ended, in thousandths. */
  readonly approval: number;
}

/**
 * Plays one game through the simulation's public interface, with no screen, until it ends or
 * the number of terms given is up.
 */
export function playGame(country: Country, seed: number, decide: Decide, terms = 1): GameResult {
  let game = createGame(country, seed);
  const limit = terms * electionStatus(game).termQuarters;
  let quarters = 0;
  let voteShare: number | null = null;
  while (game.outcome.status === 'playing' && quarters < limit) {
    const result = advanceQuarter(game, decide(game));
    voteShare = result.report.election?.voteShare ?? voteShare;
    game = result.state;
    quarters += 1;
  }
  const { outcome } = game;
  const figures = {
    seed,
    quarters,
    voteShare,
    treasury: game.treasury,
    approval: approvalStatus(game).approval,
  };
  if (outcome.status === 'playing') return { ...figures, ending: 'reelected', regionId: null };
  switch (outcome.cause) {
    case 'famine':
      return { ...figures, ending: 'famine', regionId: outcome.regionId };
    case 'election':
      return { ...figures, ending: 'lostElection', regionId: null };
    case 'prosperity':
      return { ...figures, ending: 'won', regionId: null };
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
  readonly reelected: number;
  readonly lostElection: number;
  /** The games lost to famine, by the region that collapsed, the most frequent first. */
  readonly famine: readonly { readonly regionId: string; readonly games: number }[];
  /** The share of games won on prosperity, in thousandths. */
  readonly winPermille: number;
  /** The share of the vote in the games that reached an election, or null when none did. */
  readonly voteShare: Spread | null;
  readonly treasury: Spread;
  readonly approval: Spread;
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
  return {
    games: results.length,
    won: count('won'),
    reelected: count('reelected'),
    lostElection: count('lostElection'),
    famine: [...byRegion]
      .map(([regionId, games]) => ({ regionId, games }))
      .sort((a, b) => b.games - a.games || a.regionId.localeCompare(b.regionId)),
    winPermille: results.length === 0 ? 0 : Math.round((count('won') * 1000) / results.length),
    voteShare: spreadOf(results.flatMap((result) => result.voteShare ?? [])),
    treasury: spreadOf(results.map((result) => result.treasury)) ?? { min: 0, median: 0, max: 0 },
    approval: spreadOf(results.map((result) => result.approval)) ?? { min: 0, median: 0, max: 0 },
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
