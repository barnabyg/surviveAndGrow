import { describe, expect, it } from 'vitest';
import {
  advanceQuarter,
  createGame,
  onTechnology,
  researchFault,
  researchStatuses,
  technologyTerms,
  TECHNOLOGIES,
  TECHNOLOGY_DEFINITIONS,
  type GameState,
  type Technology,
} from '../../src/sim';
import { tavara } from './countries';

/** Improved irrigation needs drought-resistant seed: the tree's prerequisites at work. */
const LATER: Technology = 'improvedIrrigation';
const SEED: Technology = 'droughtResistantSeed';

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

/** How many technologies stand between a technology and the root of the tree, itself counted. */
function tierOf(technology: Technology): number {
  const { prerequisites } = TECHNOLOGY_DEFINITIONS[technology];
  return 1 + Math.max(0, ...prerequisites.map(tierOf));
}

describe('the technology tree as it ships', () => {
  it('has drought-resistant seed at its root and at least two tiers built on it', () => {
    expect(TECHNOLOGIES.filter((technology) => tierOf(technology) === 1)).toEqual([SEED]);
    expect(Math.max(...TECHNOLOGIES.map(tierOf))).toBeGreaterThanOrEqual(3);
    // Every prerequisite comes before what needs it, so the tab reads down the tree.
    for (const technology of TECHNOLOGIES) {
      for (const needed of TECHNOLOGY_DEFINITIONS[technology].prerequisites) {
        expect(TECHNOLOGIES.indexOf(needed)).toBeLessThan(TECHNOLOGIES.indexOf(technology));
      }
    }
  });
});

describe('a technology with a prerequisite', () => {
  const game = createGame(tavara(), 1);

  it('is locked until its prerequisite is known, and says so', () => {
    expect(researchFault(game, LATER, [])).toBe(
      'Improved irrigation needs Drought-resistant seed to be known first.',
    );
    expect(() => advanceQuarter(game, { budget: game.budget, startResearch: LATER })).toThrow(
      'Improved irrigation needs Drought-resistant seed to be known first.',
    );
    // The tree is shown in the vocabulary's order: the seed, then what builds on it.
    const [seed, later] = researchStatuses(game, null);
    expect(seed).toMatchObject({ technology: SEED, state: 'available' });
    expect(seed?.leadsTo).toContain(LATER);
    expect(later).toMatchObject({ technology: LATER, state: 'locked', prerequisites: [SEED] });
  });

  it('is available once its prerequisite is known, and can then be researched', () => {
    const known = withSeedKnown(game);
    expect(researchFault(known, LATER, [])).toBeNull();
    const stateOf = (state: GameState, technology: Technology) =>
      researchStatuses(state, null).find((status) => status.technology === technology)?.state;
    expect(stateOf(known, SEED)).toBe('known');
    expect(stateOf(known, LATER)).toBe('available');
    const { state, report } = advanceQuarter(known, {
      budget: known.budget,
      startResearch: LATER,
    });
    expect(report.entries.map((entry) => entry.headline)).toContain(
      'Research begins: Improved irrigation',
    );
    expect(stateOf(state, LATER)).toBe('researching');
  });

  it('cannot be researched alongside its prerequisite', () => {
    const statuses = researchStatuses(game, SEED);
    expect(statuses.find((status) => status.technology === SEED)).toMatchObject({
      state: 'planned',
      fault: 'Drought-resistant seed is planned.',
    });
    expect(statuses.find((status) => status.technology === LATER)).toMatchObject({
      state: 'locked',
      fault: 'One technology is researched at a time, and Drought-resistant seed is planned.',
    });
  });
});
