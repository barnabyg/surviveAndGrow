import { nationalApproval } from './approval';
import { clamp } from './arithmetic';
import { balance } from './balance';
import { dateOfQuarter, quarterNumber } from './calendar';
import type { ReportEntry } from './report';
import { nextRandom, type RngState } from './rng';
import type { ElectionResult, Outcome, RegionState } from './state';
import { termBounds, termOf } from './terms';
import { formatOrdinal, formatPercent, formatSignedPoints } from './text';
import type { GameDate, Range } from './types';

export { isElectionQuarter } from './terms';

/** When the election falls and what it takes to win it. */
export interface ElectionStatus {
  /** The term of office the game is in, counted from 1. The election closes it. */
  readonly term: number;
  /** How many quarters a term of office lasts. */
  readonly termQuarters: number;
  /** The quarter at the end of which the vote is held. */
  readonly date: GameDate;
  /** How many quarters lie between the one being decided and the election quarter. */
  readonly quartersAway: number;
  /** The share of the vote the government needs to stay in office, in thousandths. */
  readonly needed: number;
}

/**
 * The election that closes the term the game is in. Once the game is over it is the one
 * that closed, or would have closed, the term the game ended in.
 */
export function electionStatus(game: {
  readonly date: GameDate;
  readonly outcome?: Outcome;
}): ElectionStatus {
  const { termQuarters, winSharePermille } = balance.election;
  const term = termOf(game);
  const { last } = termBounds(term);
  return {
    term,
    termQuarters,
    date: dateOfQuarter(last),
    quartersAway: Math.max(0, last - quarterNumber(game.date)),
    needed: winSharePermille,
  };
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

/**
 * The chance, in thousandths, that an election held at a level of national approval is
 * lost: the share of the campaign's swings, each as likely as the next, that would leave
 * the vote short of what is needed. It draws nothing from the random generator.
 */
export function defeatChancePermille(approval: number): number {
  const { swingPermille, winSharePermille } = balance.election;
  let losing = 0;
  for (let swing = -swingPermille; swing <= swingPermille; swing += 1) {
    if (shareOf(approval + swing) < winSharePermille) losing += 1;
  }
  return Math.round((losing * 1000) / (2 * swingPermille + 1));
}

/** How a game lost at an election ended. */
export type ElectionDefeat = Extract<Outcome, { readonly cause: 'election' }>;

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
 * Holds the election that closes a term. The vote share is national approval as the term's
 * last quarter left it, moved by the campaign's swing, which the game draws by the seed, so
 * the same seed and the same decisions always give the same result. Losing ends the game;
 * winning begins the next term, and the report says so.
 */
export function holdElection(
  regions: readonly RegionState[],
  swing: number,
  date: GameDate,
): {
  readonly result: ElectionResult;
  readonly defeat: ElectionDefeat | null;
  readonly entry: ReportEntry;
} {
  const { winSharePermille } = balance.election;
  const approval = nationalApproval(regions);
  const voteShare = shareOf(approval + swing);
  const won = voteShare >= winSharePermille;
  const result: ElectionResult = { voteShare, needed: winSharePermille, won };
  const headline = won ? 'You won the election' : 'You lost the election';
  const summary = `You took ${formatPercent(voteShare)} of the vote and needed ${formatPercent(winSharePermille, 0)}. Approval stood at ${formatPercent(approval)} on polling day, and the campaign moved the vote by ${formatSignedPoints(voteShare - approval)}.`;
  if (won) {
    const next = termOf({ date: dateOfQuarter(quarterNumber(date) + 1) });
    const { last } = termBounds(next);
    const nextVote = dateOfQuarter(last);
    return {
      result,
      defeat: null,
      entry: {
        kind: 'election',
        seriousness: 'notable',
        headline,
        cause: `${summary} Your ${formatOrdinal(next)} term begins, and the next election is held at the end of Year ${nextVote.year}, Quarter ${nextVote.quarter}.`,
      },
    };
  }
  const defeat: ElectionDefeat = {
    status: 'lost',
    cause: 'election',
    voteShare,
    needed: winSharePermille,
    headline,
    summary,
  };
  return {
    result,
    defeat,
    // A lost election ends the government, and nothing in the quarter matters more.
    entry: { kind: 'election', seriousness: 'critical', headline, cause: summary },
  };
}

/** A share of the vote cannot be less than nothing or more than everyone. */
function shareOf(permille: number): number {
  return clamp(permille, 0, 1000);
}
