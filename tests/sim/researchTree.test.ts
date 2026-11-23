import { describe, expect, it, vi } from 'vitest';
import {
  advanceQuarter,
  createGame,
  onTechnology,
  researchFault,
  researchStatuses,
  technologyTerms,
  type GameState,
  type Technology,
} from '../../src/sim';
import { tavara } from './countries';

/**
 * The tree as it ships has one technology, which needs nothing. To see prerequisites at work,
 * this file plays a tree of two: the seed, and a technology that needs it. Nothing else in the
 * engine changes.
 */
const LATER = 'laterSeed' as Technology;
const SEED: Technology = 'droughtResistantSeed';

vi.mock('../../src/sim/vocabulary', async (original) => {
  const vocabulary = await original<typeof import('../../src/sim/vocabulary')>();
  return {
    ...vocabulary,
    TECHNOLOGIES: [...vocabulary.TECHNOLOGIES, 'laterSeed'],
    TECHNOLOGY_DEFINITIONS: {
      ...vocabulary.TECHNOLOGY_DEFINITIONS,
      laterSeed: { name: 'Later seed', prerequisites: ['droughtResistantSeed'] },
    },
  };
});

vi.mock('../../src/sim/balance', async (original) => {
  const { balance } = await original<typeof import('../../src/sim/balance')>();
  return {
    balance: {
      ...balance,
      technologies: {
        ...balance.technologies,
        laterSeed: { cost: 40, researchQuarters: 2, effects: { weatherAndDrought: 900 } },
      },
    },
  };
});

/** A game with the seed known. */
function withSeedKnown(game: GameState): GameState {
  return {
    ...game,
    projects: [
      {
        target: onTechnology(SEED),
        began: game.date,
        quartersPaid: technologyTerms(SEED).researchQuarters,
        status: 'known',
        opened: game.date,
      },
    ],
  };
}

describe('a technology with a prerequisite', () => {
  const game = createGame(tavara(), 1);

  it('is locked until its prerequisite is known, and says so', () => {
    expect(researchFault(game, LATER, [])).toBe(
      'Later seed needs Drought-resistant seed to be known first.',
    );
    expect(() => advanceQuarter(game, { budget: game.budget, startResearch: LATER })).toThrow(
      'Later seed needs Drought-resistant seed to be known first.',
    );
    // The tree is shown in the vocabulary's order: the seed, then the technology after it.
    const [seed, later] = researchStatuses(game, null);
    expect(seed).toMatchObject({ technology: SEED, state: 'available', leadsTo: [LATER] });
    expect(later).toMatchObject({ technology: LATER, state: 'locked', prerequisites: [SEED] });
  });

  it('is available once its prerequisite is known, and can then be researched', () => {
    const known = withSeedKnown(game);
    expect(researchFault(known, LATER, [])).toBeNull();
    expect(researchStatuses(known, null).map((status) => status.state)).toEqual([
      'known',
      'available',
    ]);
    const { state, report } = advanceQuarter(known, {
      budget: known.budget,
      startResearch: LATER,
    });
    expect(report.entries.map((entry) => entry.headline)).toContain('Research begins: Later seed');
    expect(researchStatuses(state, null).map((status) => status.state)).toEqual([
      'known',
      'researching',
    ]);
  });

  it('cannot be researched alongside its prerequisite', () => {
    expect(researchStatuses(game, SEED).map((status) => [status.state, status.fault])).toEqual([
      ['planned', 'Drought-resistant seed is planned.'],
      ['locked', 'One technology is researched at a time, and Drought-resistant seed is planned.'],
    ]);
  });
});
