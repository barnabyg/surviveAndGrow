import { SERIOUSNESS_LEVELS, type ReportKind, type Seriousness } from './vocabulary';

/** One thing the player is told about a quarter: what happened, where and why. */
export interface ReportEntry {
  readonly kind: ReportKind;
  readonly seriousness: Seriousness;
  /** What happened, in a few words. */
  readonly headline: string;
  /** Why it happened or what it means, in a line. */
  readonly cause: string;
  /** The region it happened in, when it belongs to one place. */
  readonly regionId?: string;
  /** The neighbour it concerns, when it concerns one. */
  readonly neighbourId?: string;
}

/** What a report leads with when nothing in the quarter rose above the routine. */
const quietQuarter: ReportEntry = {
  kind: 'quiet',
  seriousness: 'routine',
  headline: 'A quiet quarter',
  cause: 'Nothing notable happened.',
};

/**
 * Puts a quarter's entries in the order the player reads them: the most serious first, and
 * entries of the same seriousness in the order they were given. A quarter in which nothing
 * rose above the routine says so in an entry of its own.
 */
export function compileReport(entries: readonly ReportEntry[]): readonly ReportEntry[] {
  const rank = (entry: ReportEntry) => SERIOUSNESS_LEVELS.indexOf(entry.seriousness);
  const ranked = [...entries].sort((a, b) => rank(b) - rank(a));
  return ranked.some((entry) => entry.seriousness !== 'routine')
    ? ranked
    : [quietQuarter, ...ranked];
}
