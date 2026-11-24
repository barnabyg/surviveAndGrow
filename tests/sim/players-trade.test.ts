import { describe, expect, it } from 'vitest';
import { advanceQuarter, createGame, foodStatus, type GameState } from '../../src/sim';
import { tavaraAsShipped } from './countries';
import { GAME_TIMEOUT, playerNamed } from './scripted';

const trader = () => playerNamed('Timing trader');

/** A game of Tavara a few quarters in, past its first harvest. */
function pastTheHarvest(): GameState {
  let game: GameState = createGame(tavaraAsShipped(), 1);
  for (let quarter = 0; quarter < 4; quarter += 1) {
    game = advanceQuarter(game, playerNamed('Chain builder').decide(game)).state;
  }
  return game;
}

/** The game with the world grain price now at the price given, in dollars a tonne. */
function grainAt(game: GameState, dollars: number): GameState {
  return {
    ...game,
    worldPrices: { ...game.worldPrices, grain: [...game.worldPrices.grain, dollars] },
  };
}

describe('the timing trader', () => {
  it(
    'plays as the chain builder does in everything but trade',
    () => {
      let game: GameState = createGame(tavaraAsShipped(), 2);
      for (let quarter = 0; quarter < 12 && game.outcome.status === 'playing'; quarter += 1) {
        const { trade, ...rest } = trader().decide(game);
        expect(rest).toEqual(playerNamed('Chain builder').decide(game));
        game = advanceQuarter(game, { ...rest, ...(trade === undefined ? {} : { trade }) }).state;
      }
    },
    GAME_TIMEOUT,
  );

  it('sells grain above what the reserve needs to keep when the price is high', () => {
    const game = grainAt(pastTheHarvest(), 300);
    const trade = trader().decide(game).trade ?? [];

    expect(trade).toHaveLength(1);
    expect(trade[0]).toMatchObject({ good: 'grain', direction: 'export' });
    const left = { ...game, foodReserve: game.foodReserve - (trade[0]?.tonnes ?? 0) };
    expect(foodStatus(left).belowSafeLevel).toBe(false);
  });

  it('keeps the surplus while grain is cheaper than usual', () => {
    const game = grainAt(pastTheHarvest(), 200);

    expect(trader().decide(game).trade).toBeUndefined();
  });

  it('buys grain for a reserve below its safe level while people go hungry', () => {
    const past = pastTheHarvest();
    const game = grainAt(
      {
        ...past,
        foodReserve: 50_000,
        regions: past.regions.map((region, index) =>
          index === 0 ? { ...region, foodStage: 'shortage' as const } : region,
        ),
      },
      300,
    );
    const trade = trader().decide(game).trade ?? [];

    expect(trade).toHaveLength(1);
    expect(trade[0]).toMatchObject({ good: 'grain', direction: 'import' });
  });

  it('stocks a lean reserve while failed harvests abroad are still to come', () => {
    const past = grainAt(pastTheHarvest(), 230);
    const coming = {
      ...past,
      priceShocks: [
        {
          type: 'failedHarvestsAbroad' as const,
          announced: past.date,
          begins: { year: past.date.year + 1, quarter: past.date.quarter },
        },
      ],
    };
    // Above its safe level but below what the trader keeps; grain at $230 is not cheap.
    const reserve = Math.ceil(foodStatus(coming).quarterlyConsumption * 1.1);
    const lean = { ...coming, foodReserve: reserve };
    const blind = playerNamed('Trader blind to shocks');

    expect(trader().decide({ ...past, foodReserve: reserve }).trade).toBeUndefined();
    expect(trader().decide(lean).trade?.[0]?.direction).toBe('import');
    expect(blind.decide(lean).trade).toBeUndefined();
  });
});

describe('the borrower wary of gluts', () => {
  it('borrows nothing while an ore glut is announced, where the sensible borrower would', () => {
    const game = createGame(tavaraAsShipped(), 1);
    const glut = {
      ...game,
      priceShocks: [
        {
          type: 'oreGlut' as const,
          announced: game.date,
          begins: { year: game.date.year + 1, quarter: game.date.quarter },
        },
      ],
    };
    const wary = playerNamed('Borrower wary of gluts');

    expect(playerNamed('Sensible borrower').decide(glut).borrow?.length).toBeGreaterThan(0);
    expect(wary.decide(game).borrow).toEqual(playerNamed('Sensible borrower').decide(game).borrow);
    expect(wary.decide(glut).borrow).toBeUndefined();
  });
});

describe('the player who relies on the mine', () => {
  it(
    'builds the mine’s chain and no power, and never trades',
    () => {
      // Seed 4, on which the treasury reaches the mine's cost before the first vote is lost.
      let game: GameState = createGame(tavaraAsShipped(), 4);
      const started: string[] = [];
      for (let quarter = 0; quarter < 40 && game.outcome.status === 'playing'; quarter += 1) {
        const decisions = playerNamed('Mine only').decide(game);
        expect(decisions.trade).toBeUndefined();
        started.push(...(decisions.startProjects ?? []));
        game = advanceQuarter(game, decisions).state;
      }
      const types = started.map((id) => game.country.sites.find((site) => site.id === id)?.type);

      expect(types.slice(0, 3)).toEqual(['port', 'trunkRoad', 'mine']);
      expect(types).not.toContain('powerStation');
    },
    GAME_TIMEOUT,
  );
});
