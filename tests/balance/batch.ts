import {
  advanceQuarter,
  approvalStatus,
  createGame,
  type Country,
  type Decisions,
  type GameState,
} from '../../src/sim';

/** A scripted player: what it decides for the quarter, given the game as it stands. */
export type Decide = (game: GameState) => Decisions;

/** How one whole game ended, and the figures it ended on. */
export interface GameResult {
  readonly seed: number;
  readonly ending: 'won' | 'lostElection' | 'famine';
  /** The region whose famine brought the state down, or null when the game ran to the vote. */
  readonly regionId: string | null;
  /** How many quarters were played. */
  readonly quarters: number;
  /** The share of the vote, in thousandths, or null when no election was held. */
  readonly voteShare: number | null;
  /** The treasury as the game ended, in Money units. */
  readonly treasury: number;
  /** National approval as the game ended, in thousandths. */
  readonly approval: number;
}

/** Plays one whole game through the simulation's public interface, with no screen. */
export function playGame(country: Country, seed: number, decide: Decide): GameResult {
  let game = createGame(country, seed);
  let quarters = 0;
  while (game.outcome.status === 'playing') {
    game = advanceQuarter(game, decide(game)).state;
    quarters += 1;
  }
  const { outcome } = game;
  const figures = {
    seed,
    quarters,
    treasury: game.treasury,
    approval: approvalStatus(game).approval,
  };
  return outcome.cause === 'famine'
    ? { ...figures, ending: 'famine', regionId: outcome.regionId, voteShare: null }
    : {
        ...figures,
        ending: outcome.status === 'won' ? 'won' : 'lostElection',
        regionId: null,
        voteShare: outcome.voteShare,
      };
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
  readonly lostElection: number;
  /** The games lost to famine, by the region that collapsed, the most frequent first. */
  readonly famine: readonly { readonly regionId: string; readonly games: number }[];
  /** The share of games won, in thousandths. */
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
