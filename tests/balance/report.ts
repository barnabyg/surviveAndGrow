import {
  formatIndex,
  formatMoney,
  formatPercent,
  regionName,
  technologyName,
  TIER_NAMES,
  type Country,
} from '../../src/sim';
import type { ShockSetting } from './jobs';
import { SHOCK_KINDS, type Shocks, type Spread, type Summary } from './batch';

/** One player's batch on one country, ready to be written up. */
export interface Row {
  readonly player: string;
  readonly summary: Summary;
}

/** What each shock is called at the head of its column. */
const SHOCK_HEADS: Readonly<Record<keyof Shocks, string>> = {
  failedHarvestsAbroad: 'Failed harvests abroad met',
  oreGlut: 'Ore gluts met',
  drought: 'Droughts met',
  flood: 'Floods met',
};

const tonnes = (value: number) => `${Math.round(value / 1000)}kt`;

const share = (games: number, of: number) =>
  of === 0 ? '0.0%' : `${((games * 100) / of).toFixed(1)}%`;

function spread(figures: Spread | null, format: (value: number) => string): string {
  return figures === null
    ? 'none'
    : `${format(figures.min)} / ${format(figures.median)} / ${format(figures.max)}`;
}

/**
 * A batch on one country as Markdown tables, with the causes of loss and the technologies
 * each player came to know spelt out beneath.
 */
export function writeUp(
  country: Country,
  seeds: string,
  terms: number,
  rows: readonly Row[],
  shocks: ShockSetting = 'shipped',
): string {
  const without = shocks === 'none' ? ', without world price shocks' : '';
  const lines = [
    `### ${country.name}, seeds ${seeds}, up to ${terms} ${terms === 1 ? 'term' : 'terms'}${without}`,
    '',
    '| Player | Games | Won | Still in office | Lost the vote | Lost to famine | Lost to a coup | Terms served | Quarter of the win | Prosperity at the end |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- |',
    ...rows.map(({ player, summary }) => {
      const famines = summary.famine.reduce((total, region) => total + region.games, 0);
      return `| ${[
        player,
        summary.games,
        share(summary.won, summary.games),
        share(summary.inOffice, summary.games),
        share(summary.lostElection, summary.games),
        share(famines, summary.games),
        share(summary.coup, summary.games),
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
    `| Player | Grain imported | Grain exported | Trade income | Trade spending | ${SHOCK_KINDS.map((kind) => SHOCK_HEADS[kind]).join(' | ')} |`,
    `| --- | --- | --- | --- | --- | ${SHOCK_KINDS.map(() => '---').join(' | ')} |`,
    ...rows.map(
      ({ player, summary }) =>
        [
          `| ${player}`,
          spread(summary.imported, tonnes),
          spread(summary.exported, tonnes),
          spread(summary.tradeIncome, formatMoney),
          spread(summary.tradeSpending, formatMoney),
          ...SHOCK_KINDS.map(
            (kind) =>
              `${share(summary.gamesMeeting[kind], summary.games)}, ${spread(summary.shocks[kind], String)}`,
          ),
        ].join(' | ') + ' |',
    ),
    '',
    '| Player | Technologies known | Quarter of the first technology | Regions surveyed | Deposits found | Found deposits mined |',
    '| --- | --- | --- | --- | --- | --- |',
    ...rows.map(({ player, summary }) => {
      const { found, mined } = summary.deposits;
      return `| ${[
        player,
        `${share(summary.researched, summary.games)}, ${spread(summary.technologies, String)}`,
        spread(summary.firstTechnology, String),
        spread(summary.surveys, String),
        `${share(summary.foundDeposit, summary.games)}, ${spread(summary.depositsFound, String)}`,
        found === 0 ? 'none found' : `${share(mined, found)}, ${mined} of ${found}`,
      ].join(' | ')} |`;
    }),
    '',
    'Spreads are least / middle / most. Won is the win on prosperity: Prosperous held for four quarters running, with the debt burden within the debt test as the hold completes. Still in office counts the games that had neither won nor lost when their terms were up. Vote share counts only the games that reached a vote. Bailed out counts the games in which a missed payment brought a bailout, and bailouts in a game counts them in those games. The win held back by the debt test counts the games in which prosperity was held long enough to win but the debt burden was over the limit, with how many of them were won once it passed and the quarters the win waited. The debt burden is what is owed against a year’s revenue. Grain is in thousands of tonnes (kt) over the game. A shock met is a world price shock that moved its price, or a drought or flood that began in a region, while the game was played: the share of games that met one, then how many each game met. Technologies known is the share of games that came to know at least one, then how many each game knew as it ended; the quarter of the first technology is the quarter of the game in which its research finished, in those games. Regions surveyed counts the surveys finished. Deposits found is the share of games whose surveys found at least one, then how many each game found. A found deposit is mined when its mine is in use as the game ends: the share of all the deposits the games found, and how many of them.',
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
      }; the army took power in ${
        summary.coup === 0
          ? 'no game'
          : `${summary.coup} (in quarter ${spread(summary.coupQuarter, String)})`
      }.`;
    }),
    '',
    ...rows.map(({ player, summary }) => {
      const known = summary.technologyKnown
        .map(
          ({ technology, games, quarter }, index) =>
            `${technologyName(technology)} in ${share(games, summary.games)}${index === 0 ? ' of its games' : ''} (quarter ${spread(quarter, String)})`,
        )
        .join(', ');
      return `- ${player}: came to know ${known === '' ? 'no technology' : known}.`;
    }),
    '',
  ];
  return lines.join('\n');
}
