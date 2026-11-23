import { describe, expect, it } from 'vitest';
import {
  createGame,
  onSite,
  onTechnology,
  type GameState,
  type Project,
  type Technology,
} from '../../src/sim';
import { infrastructureWords } from '../../src/ui/lens';
import { tavaraAsShipped } from '../sim/countries';

/** A project finished before the game began: a site in use, or a technology known. */
function finished(target: Project['target'], game: GameState): Project {
  return {
    target,
    began: game.date,
    quartersPaid: 1,
    status: target.kind === 'technology' ? 'known' : 'operating',
    opened: game.date,
  };
}

/** Tavara with Korr Falls power station and its line to Arden in use, and the technologies given known. */
function powered(technologies: readonly Technology[]): GameState {
  const game = createGame(tavaraAsShipped(), 1);
  return {
    ...game,
    projects: [
      finished(onSite('korr-falls-station'), game),
      finished(onSite('arden-power-line'), game),
      ...technologies.map((technology) => finished(onTechnology(technology), game)),
    ],
  };
}

describe('the infrastructure lens', () => {
  it('states a region’s access alone while no technology moves it', () => {
    const words = infrastructureWords(powered([]), 'arden-vale');
    expect(words.figure).toMatch(/^Infrastructure: \d+\.\d$/);
    expect(words.description).toMatch(/^infrastructure access \d+\.\d$/);
  });

  it('names the technology that moves a region’s access, and what it would be without it', () => {
    const without = infrastructureWords(powered([]), 'arden-vale');
    const words = infrastructureWords(powered(['gridEfficiency']), 'arden-vale');
    const access = /(\d+\.\d)$/.exec(without.figure)?.[1] ?? '';
    expect(words.figure).toMatch(/^Infrastructure: \d+\.\d with Grid efficiency$/);
    expect(words.figure).not.toBe(`Infrastructure: ${access} with Grid efficiency`);
    expect(words.description).toMatch(
      new RegExp(`^infrastructure access \\d+\\.\\d \\(${access} without Grid efficiency\\)$`),
    );
    // A region the improved power does not reach is stated as before.
    expect(infrastructureWords(powered(['gridEfficiency']), 'lowmere-plains').figure).toMatch(
      /^Infrastructure: \d+\.\d$/,
    );
  });
});
