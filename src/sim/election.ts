import { nationalApproval } from './approval';
import { clamp } from './arithmetic';
import { balance } from './balance';
import { dateOfQuarter, quarterNumber } from './calendar';
import type { ReportEntry } from './report';
import { nextRandom, type RngState } from './rng';
import type { Outcome, RegionState } from './state';
import { formatPercent, formatSignedPoints } from './text';
import type { GameDate, Range } from './types';

/** When the election falls and what it takes to win it. */
export interface ElectionStatus {
  /** How many quarters a term of office lasts. */
  readonly termQuarters: number;
  /** The quarter at the end of which the vote is held. */
  readonly date: GameDate;
  /** How many quarters lie between the one being decided and the election quarter. */
  readonly quartersAway: number;
  /** The share of the vote the government needs to stay in office, in thousandths. */
  readonly needed: number;
}

export function electionStatus(game: { readonly date: GameDate }): ElectionStatus {
  const { termQuarters, winSharePermille } = balance.election;
  return {
    termQuarters,
    date: dateOfQuarter(termQuarters),
    quartersAway: Math.max(0, termQuarters - quarterNumber(game.date)),
    needed: winSharePermille,
  };
}

/** Whether the vote is held when this quarter is resolved. */
export function isElectionQuarter(date: GameDate): boolean {
  return quarterNumber(date) === balance.election.termQuarters;
}

/**
 * The vote share an election would give at a level of national approval, in thousandths.
 * People vote as they approve, and the campaign swings the result a little either way, so
 * the forecast is a range. It draws nothing from the random generator.
 */
export function forecastVoteShare(approval: number): Range {
  const { swingPermille } = balance.election;
  return { min: shareOf(approval - swingPermille), max: shareOf(approval + swingPermille) };
}

/** How a game that reached its election ended. */
export type ElectionOutcome = Extract<Outcome, { readonly cause: 'election' }>;

/**
 * Draws how far the campaign moves the vote, in thousandths, from the game's generator: up
 * to the swing either way.
 */
export function rollSwing(rng: RngState): { readonly swing: number; readonly rng: RngState } {
  const { swingPermille } = balance.election;
  const roll = nextRandom(rng);
  return { swing: (roll.value % (2 * swingPermille + 1)) - swingPermille, rng: roll.state };
}

/**
 * Holds the election. The vote share is national approval as the term's last quarter left
 * it, moved by the campaign's swing, which the game draws by the seed, so the same seed and
 * the same decisions always give the same result.
 */
export function holdElection(
  regions: readonly RegionState[],
  swing: number,
): { readonly outcome: ElectionOutcome; readonly entry: ReportEntry } {
  const { winSharePermille } = balance.election;
  const approval = nationalApproval(regions);
  const voteShare = shareOf(approval + swing);
  const won = voteShare >= winSharePermille;
  const outcome: ElectionOutcome = {
    status: won ? 'won' : 'lost',
    cause: 'election',
    voteShare,
    needed: winSharePermille,
    headline: won ? 'You won the election' : 'You lost the election',
    summary: `You took ${formatPercent(voteShare)} of the vote and needed ${formatPercent(winSharePermille, 0)}. Approval stood at ${formatPercent(approval)} on polling day, and the campaign moved the vote by ${formatSignedPoints(voteShare - approval)}.`,
  };
  return {
    outcome,
    entry: {
      kind: 'election',
      // A lost election ends the government, and nothing in the quarter matters more.
      seriousness: won ? 'notable' : 'critical',
      headline: outcome.headline,
      cause: outcome.summary,
    },
  };
}

/** A share of the vote cannot be less than nothing or more than everyone. */
function shareOf(permille: number): number {
  return clamp(permille, 0, 1000);
}
