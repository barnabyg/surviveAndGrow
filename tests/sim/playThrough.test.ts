import { describe, expect, it } from 'vitest';
import {
  advanceQuarter,
  createGame,
  foodStatus,
  formatCount,
  GOOD_NAMES,
  MONEY_PER_MILLION,
  tradeCapacity,
  type GameDate,
  type GameState,
  type TradeOrder,
} from '../../src/sim';
import { withinRules } from '../balance/players';
import { tavaraAsShipped } from './countries';
import { ordinal, PLAY_THROUGH_SEED, playThroughText } from './playThrough';
import { playerNamed } from './scripted';

/**
 * The play-through in docs/playing.md says what the timing trader does in the first quarters
 * of its seed. This plays those quarters as the balance run plays them and looks for each
 * figure, word for word, in the doc.
 * How each player's whole game on the seed ends is checked where those games are already
 * played, in players.test.ts.
 */

/** One quarter as the timing trader played it. */
interface Played {
  readonly date: GameDate;
  /** The world grain price as the quarter began, in dollars a tonne. */
  readonly price: number;
  readonly announced: boolean;
  /** Whether the food reserve was below its safe level as the quarter began. */
  readonly belowSafeLevel: boolean;
  /** What the border crossings carry between them, in tonnes, or null once a port carries too. */
  readonly crossingsCarry: number | null;
  readonly orders: readonly TradeOrder[];
  /** What grain sold abroad brought the treasury, in Money units. */
  readonly income: number;
}

/** The first quarters of the play-through's seed, as the timing trader plays them. */
function firstQuarters(count: number): Played[] {
  const { decide } = playerNamed('Timing trader');
  const played: Played[] = [];
  let game: GameState = createGame(tavaraAsShipped(), PLAY_THROUGH_SEED);
  for (let quarter = 0; quarter < count; quarter += 1) {
    const decisions = withinRules(game, decide(game));
    const result = advanceQuarter(game, decisions);
    const { links, total } = tradeCapacity(game);
    played.push({
      date: game.date,
      price: game.worldPrices.grain.at(-1) ?? 0,
      announced: game.priceShocks.some(
        (shock) =>
          shock.type === 'failedHarvestsAbroad' &&
          shock.announced.year === game.date.year &&
          shock.announced.quarter === game.date.quarter,
      ),
      belowSafeLevel: foodStatus(game).belowSafeLevel,
      crossingsCarry: links.length === game.country.crossings.length ? total : null,
      orders: decisions.trade ?? [],
      income: result.report.treasury.contributions
        .filter((contribution) => contribution.label === `${GOOD_NAMES.grain} exported`)
        .reduce((total, contribution) => total + contribution.amount, 0),
    });
    game = result.state;
  }
  return played;
}

/** The tonnes of grain a quarter's orders moved in one direction. */
function tonnes({ orders }: Played, direction: TradeOrder['direction']): number {
  return orders
    .filter((order) => order.good === 'grain' && order.direction === direction)
    .reduce((total, order) => total + order.tonnes, 0);
}

describe('the play-through in docs/playing.md', () => {
  const text = playThroughText();
  const played = firstQuarters(8);
  const announcement = played.findIndex((quarter) => quarter.announced);
  const sales = played.filter((quarter) => tonnes(quarter, 'export') > 0).slice(0, 2);

  it('says when failed harvests abroad are announced', () => {
    const date = played[announcement]?.date;

    expect(date?.year).toBe(1);
    expect(text).toContain(
      `In the ${ordinal(date?.quarter ?? 0)} quarter of the first year failed harvests abroad are announced`,
    );
    expect(played[announcement]?.belowSafeLevel).toBe(true);
    expect(text).toContain('The reserve is below its safe level, so buy grain');
  });

  it('says how much grain the timing trader buys before the price rises', () => {
    const [first, second] = played.slice(announcement, announcement + 2);

    expect(text).toContain(
      `about ${formatCount(first ? tonnes(first, 'import') : 0)} t, and ${formatCount(second ? tonnes(second, 'import') : 0)} t more the quarter after`,
    );
  });

  it('says what it sells once the harvest is in, and at what price', () => {
    const sold = new Set(sales.map((quarter) => tonnes(quarter, 'export')));
    const floor = Math.floor(Math.min(...sales.map((quarter) => quarter.price)) / 10) * 10;

    expect(sales).toHaveLength(2);
    expect(sold.size).toBe(1);
    expect(sales.map((quarter) => quarter.crossingsCarry)).toEqual([...sold, ...sold]);
    expect(text).toContain(
      `${formatCount([...sold][0] ?? 0)} t a quarter, all the border crossings carry`,
    );
    expect(text).toContain(`at more than $${String(floor)} a tonne while the shock lasts`);
  });

  it('says what each sale brings in', () => {
    const millions = new Set(
      sales.map((quarter) => Math.round(quarter.income / MONEY_PER_MILLION)),
    );

    expect(millions.size).toBe(1);
    expect(text).toContain(`Each sale brings in about $${String([...millions][0] ?? 0)}m`);
  });
});
