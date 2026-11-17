import { formatMoney, formatPercent, regionName, type Country } from '../../src/sim';
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

/** A batch on one country as a Markdown table, with the causes of loss spelt out beneath. */
export function writeUp(country: Country, seeds: string, rows: readonly Row[]): string {
  const lines = [
    `### ${country.name}, seeds ${seeds}`,
    '',
    '| Player | Games | Won | Re-elected | Lost the vote | Lost to famine | Vote share | Treasury at the end | Approval at the end |',
    '| --- | ---: | ---: | ---: | ---: | ---: | --- | --- | --- |',
    ...rows.map(({ player, summary }) => {
      const famines = summary.famine.reduce((total, region) => total + region.games, 0);
      return `| ${[
        player,
        summary.games,
        share(summary.won, summary.games),
        share(summary.reelected, summary.games),
        share(summary.lostElection, summary.games),
        share(famines, summary.games),
        spread(summary.voteShare, (permille) => formatPercent(permille, 1)),
        spread(summary.treasury, formatMoney),
        spread(summary.approval, (permille) => formatPercent(permille, 1)),
      ].join(' | ')} |`;
    }),
    '',
    'Spreads are least / middle / most. Vote share counts only the games that reached the vote. Won is the win on prosperity; re-elected games were still in office when their terms were up.',
    '',
    ...rows.map(({ player, summary }) => {
      const where = summary.famine
        .map((region) => `${regionName(country, region.regionId)} ${region.games}`)
        .join(', ');
      const when = spread(summary.famineQuarter, (quarter) => `${quarter}`);
      return `- ${player}: famine brought the state down in ${where === '' ? 'no game' : where}${
        where === '' ? '' : ` (in quarter ${when})`
      }.`;
    }),
    '',
  ];
  return lines.join('\n');
}
