import {
  formatIndex,
  formatMoney,
  formatPercent,
  regionName,
  TIER_NAMES,
  type Country,
} from '../../src/sim';
import type { Spread, Summary } from './batch';

/** One player's batch on one country, ready to be written up. */
export interface Row {
  readonly player: string;
  readonly summary: Summary;
}

const share = (games: number, of: number) =>
  of === 0 ? '0.0%' : `${((games * 100) / of).toFixed(1)}%`;

function spread(figures: Spread | null, format: (value: number) => string): string {
  return figures === null
    ? 'none'
    : `${format(figures.min)} / ${format(figures.median)} / ${format(figures.max)}`;
}

/** A batch on one country as Markdown tables, with the causes of loss spelt out beneath. */
export function writeUp(
  country: Country,
  seeds: string,
  terms: number,
  rows: readonly Row[],
): string {
  const lines = [
    `### ${country.name}, seeds ${seeds}, up to ${terms} ${terms === 1 ? 'term' : 'terms'}`,
    '',
    '| Player | Games | Won | Still in office | Lost the vote | Lost to famine | Terms served | Quarter of the win | Prosperity at the end |',
    '| --- | ---: | ---: | ---: | ---: | ---: | --- | --- | --- |',
    ...rows.map(({ player, summary }) => {
      const famines = summary.famine.reduce((total, region) => total + region.games, 0);
      return `| ${[
        player,
        summary.games,
        share(summary.won, summary.games),
        share(summary.inOffice, summary.games),
        share(summary.lostElection, summary.games),
        share(famines, summary.games),
        spread(summary.terms, String),
        spread(summary.winQuarter, String),
        spread(summary.prosperity, (permille) => formatIndex(permille)),
      ].join(' | ')} |`;
    }),
    '',
    '| Player | Highest tier reached | Vote share at the last vote | Treasury at the end | Approval at the end |',
    '| --- | --- | --- | --- | --- |',
    ...rows.map(({ player, summary }) => {
      const tiers = summary.peakTier
        .filter((entry) => entry.games > 0)
        .map((entry) => `${TIER_NAMES[entry.tier]} ${share(entry.games, summary.games)}`)
        .join(', ');
      return `| ${[
        player,
        tiers,
        spread(summary.voteShare, (permille) => formatPercent(permille, 1)),
        spread(summary.treasury, formatMoney),
        spread(summary.approval, (permille) => formatPercent(permille, 1)),
      ].join(' | ')} |`;
    }),
    '',
    '| Player | Borrowed | Bailed out | Bailouts in a game | Win held back by the debt test | Debt burden at the end | Highest debt burden |',
    '| --- | --- | ---: | --- | --- | --- | --- |',
    ...rows.map(({ player, summary }) => {
      const held =
        summary.heldByDebt === 0
          ? 'never'
          : `${share(summary.heldByDebt, summary.games)}, ${summary.wonAfterHold} of ${summary.heldByDebt} won later, waiting ${spread(summary.heldQuarters, String)} quarters`;
      return `| ${[
        player,
        spread(summary.borrowed, formatMoney),
        share(summary.bailedOut, summary.games),
        spread(summary.bailouts, String),
        held,
        spread(summary.debtBurden, (permille) => formatPercent(permille, 0)),
        spread(summary.peakDebtBurden, (permille) => formatPercent(permille, 0)),
      ].join(' | ')} |`;
    }),
    '',
    'Spreads are least / middle / most. Won is the win on prosperity: Prosperous held for four quarters running, with the debt burden within the debt test as the hold completes. Still in office counts the games that had neither won nor lost when their terms were up. Vote share counts only the games that reached a vote. Bailed out counts the games in which a missed payment brought a bailout, and bailouts in a game counts them in those games. The win held back by the debt test counts the games in which prosperity was held long enough to win but the debt burden was over the limit, with how many of them were won once it passed and the quarters the win waited. The debt burden is what is owed against a year’s revenue.',
    '',
    ...rows.map(({ player, summary }) => {
      const votes = summary.lostElectionByTerm
        .map((entry) => `${entry.games} in term ${entry.term}`)
        .join(', ');
      const where = summary.famine
        .map((region) => `${regionName(country, region.regionId)} ${region.games}`)
        .join(', ');
      const when = spread(summary.famineQuarter, (quarter) => `${quarter}`);
      return `- ${player}: lost the vote ${votes === '' ? 'in no game' : votes}; famine brought the state down in ${
        where === '' ? 'no game' : `${where} (in quarter ${when})`
      }.`;
    }),
    '',
  ];
  return lines.join('\n');
}
