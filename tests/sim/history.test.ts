import { describe, expect, it } from 'vitest';
import {
  advanceQuarter,
  approvalStatus,
  armyLoyaltyStatus,
  createGame,
  debtStatus,
  foodStatus,
  previewQuarter,
  prosperityStatus,
  type GameState,
  type TurnReport,
} from '../../src/sim';
import { bothCountries, tavara } from './countries';
import { steward } from './playing';

/** Plays quarters with the budget in force and no relief, keeping every report. */
function play(start: GameState, quarters: number) {
  let state = start;
  const reports: TurnReport[] = [];
  for (let quarter = 0; quarter < quarters; quarter += 1) {
    const result = advanceQuarter(state, { budget: state.budget, reliefRegionId: null });
    state = result.state;
    reports.push(result.report);
  }
  return { state, reports };
}

describe('the history of the vital signs in Tavara', () => {
  it('opens with the position the game starts from', () => {
    const game = createGame(tavara(), 1);

    // 5.2 million people eat 50 kg each in a quarter.
    expect(game.history).toEqual([
      {
        date: { year: 1, quarter: 1 },
        treasury: 420,
        foodReserve: 182000,
        quarterlyConsumption: 260000,
        approval: 518,
        prosperity: 210,
        armyLoyalty: 584,
        debt: 0,
        debtBurden: 0,
      },
    ]);
  });

  it('adds the position each quarter leaves behind', () => {
    const { state } = play(createGame(tavara(), 1), 3);

    // The budget runs $7.0m short each quarter, and 8% of the reserve spoils each quarter:
    // 14,560 t of 182,000 t, then 13,395 t, then 12,323 t. Nothing moves approval or the army.
    expect(state.history).toEqual([
      {
        date: { year: 1, quarter: 1 },
        treasury: 420,
        foodReserve: 182000,
        quarterlyConsumption: 260000,
        approval: 518,
        prosperity: 210,
        armyLoyalty: 584,
        debt: 0,
        debtBurden: 0,
      },
      {
        date: { year: 1, quarter: 2 },
        treasury: 350,
        foodReserve: 167440,
        quarterlyConsumption: 260000,
        approval: 518,
        prosperity: 210,
        armyLoyalty: 584,
        debt: 0,
        debtBurden: 0,
      },
      {
        date: { year: 1, quarter: 3 },
        treasury: 280,
        foodReserve: 154045,
        quarterlyConsumption: 260000,
        approval: 518,
        prosperity: 210,
        armyLoyalty: 584,
        debt: 0,
        debtBurden: 0,
      },
      {
        date: { year: 1, quarter: 4 },
        treasury: 210,
        foodReserve: 141722,
        quarterlyConsumption: 260000,
        approval: 518,
        prosperity: 210,
        armyLoyalty: 584,
        debt: 0,
        debtBurden: 0,
      },
    ]);
  });
});

describe.each(bothCountries)('the history of the vital signs in %s', (_name, country) => {
  it('holds one record for the start and one for each quarter since, in order', () => {
    let game = createGame(country(), 5);
    const dates = [game.date];

    for (let quarter = 0; quarter < 9; quarter += 1) {
      game = advanceQuarter(game, steward(game)).state;
      dates.push(game.date);
    }

    expect(game.history.map((record) => record.date)).toEqual(dates);
  });

  it('records what the game state and the turn report give for the same moment', () => {
    let game = createGame(country(), 5);

    for (let quarter = 0; quarter < 9; quarter += 1) {
      const { state, report } = advanceQuarter(game, steward(game));
      const latest = state.history.at(-1);

      expect(latest).toEqual({
        date: state.date,
        treasury: report.treasury.value,
        foodReserve: report.food.value,
        quarterlyConsumption: foodStatus(state).quarterlyConsumption,
        approval: report.approval.value,
        prosperity: report.prosperity?.value,
        armyLoyalty: report.armyLoyalty?.value,
        debt: report.debt?.value,
        debtBurden: debtStatus(state).burden,
      });
      expect(latest?.treasury).toBe(state.treasury);
      expect(latest?.approval).toBe(approvalStatus(state).approval);
      expect(latest?.prosperity).toBe(prosperityStatus(state).value);
      expect(latest?.armyLoyalty).toBe(armyLoyaltyStatus(state).loyalty);
      // Everything before it is what was there already.
      expect(state.history.slice(0, -1)).toEqual(game.history);
      game = state;
    }
  });

  it('is not added to by a preview', () => {
    const game = advanceQuarter(createGame(country(), 5), steward(createGame(country(), 5))).state;
    const before = structuredClone(game.history);

    previewQuarter(game, { budget: game.budget });

    expect(game.history).toEqual(before);
    expect(game.history).toHaveLength(2);
  });
});
