import { describe, expect, it } from 'vitest';
import tavaraFile from '../../src/countries/tavara.json';
import {
  depositFind,
  onSite,
  planFault,
  researchStatuses,
  surveyStatuses,
  technologyName,
  technologyTerms,
  type Country,
  type Technology,
} from '../../src/sim';
import { playGame, summarise, type Decide } from '../balance/batch';
import { writeUp } from '../balance/report';
import { tavaraAsShipped, withChances } from './countries';
import { steward } from './playing';
import { gameResult } from './results';

/** Tavara with a treasury that pays for anything, and no drought, flood, dilemma or shock. */
function richTavara(): Country {
  const copy = structuredClone(tavaraFile) as { start: { treasury: number } };
  copy.start.treasury = 5000;
  return withChances(copy, {});
}

/** A careful player that researches the technologies given, one after another. */
const researching =
  (technologies: readonly Technology[]): Decide =>
  (game) => {
    const tree = researchStatuses(game, null);
    const next = technologies.find(
      (technology) => tree.find((each) => each.technology === technology)?.fault === null,
    );
    return { ...steward(game), ...(next === undefined ? {} : { startResearch: next }) };
  };

/**
 * A careful player that surveys every region it can, and, if it `mines`, builds every port,
 * trunk road and mine there is as soon as it may.
 */
const surveying =
  (mines: boolean): Decide =>
  (game) => {
    const startSurveys = surveyStatuses(game, {})
      .filter((region) => region.fault === null)
      .map((region) => region.regionId);
    const startProjects: string[] = [];
    for (const site of game.country.sites) {
      if (!mines || !['port', 'trunkRoad', 'mine'].includes(site.type)) continue;
      const fault = planFault(game, { startProjects, startSurveys }, onSite(site.id));
      if (fault === null) startProjects.push(site.id);
    }
    return { ...steward(game), startSurveys, startProjects };
  };

/** A seed on which a survey of Tavara finds at least one of its deposits. */
function seedThatFinds(country: Country): number {
  const seed = Array.from({ length: 50 }, (_, index) => index + 1).find((each) =>
    country.deposits.some((deposit) => depositFind(each, deposit) !== null),
  );
  if (seed === undefined) throw new Error('No seed finds a deposit.');
  return seed;
}

describe('a game played for the balance', () => {
  it('records the quarter in which each technology became known', () => {
    const first = technologyTerms('droughtResistantSeed').researchQuarters;
    const second = technologyTerms('coldStorage').researchQuarters;
    const result = playGame(
      richTavara(),
      1,
      researching(['droughtResistantSeed', 'coldStorage']),
      1,
    );

    expect(result.quarters).toBeGreaterThanOrEqual(first + second);
    expect(result.technologies).toEqual({
      droughtResistantSeed: first,
      coldStorage: first + second,
    });
  });

  it('records the surveys made, the deposits found and those whose mine is in use', () => {
    const country = richTavara();
    const seed = seedThatFinds(country);
    const found = country.deposits.filter((deposit) => depositFind(seed, deposit) !== null);

    const mined = playGame(country, seed, surveying(true), 1);
    expect(mined.surveys).toBe(country.deposits.length);
    expect(mined.depositsFound).toBe(found.length);
    expect(mined.depositsMined).toBe(found.length);

    const left = playGame(country, seed, surveying(false), 1);
    expect(left.surveys).toBe(country.deposits.length);
    expect(left.depositsFound).toBe(found.length);
    expect(left.depositsMined).toBe(0);
  });

  it('records no research and no survey for a player that makes none', () => {
    const result = playGame(richTavara(), 1, steward, 1);

    expect(result.technologies).toEqual({});
    expect(result).toMatchObject({ surveys: 0, depositsFound: 0, depositsMined: 0 });
  });
});

describe('a batch of games that research and survey', () => {
  const results = [
    gameResult(1, {
      technologies: { droughtResistantSeed: 7, coldStorage: 10, gridEfficiency: 15 },
      surveys: 2,
      depositsFound: 2,
      depositsMined: 1,
    }),
    gameResult(2, { technologies: { droughtResistantSeed: 9 }, surveys: 2, depositsFound: 1 }),
    gameResult(3, { technologies: { droughtResistantSeed: 5, coldStorage: 12 }, surveys: 1 }),
    gameResult(4),
  ];

  it('is summed up by the technologies each game came to know, and when', () => {
    const summary = summarise(results);

    expect(summary.technologies).toEqual({ min: 0, median: 2, max: 3 });
    expect(summary.researched).toBe(3);
    expect(summary.firstTechnology).toEqual({ min: 5, median: 7, max: 9 });
    // Each technology some game came to know, in the tree's order.
    expect(summary.technologyKnown).toEqual([
      { technology: 'droughtResistantSeed', games: 3, quarter: { min: 5, median: 7, max: 9 } },
      { technology: 'coldStorage', games: 2, quarter: { min: 10, median: 11, max: 12 } },
      { technology: 'gridEfficiency', games: 1, quarter: { min: 15, median: 15, max: 15 } },
    ]);
  });

  it('is summed up by its surveys, the deposits they found and those mined', () => {
    const summary = summarise(results);

    expect(summary.surveys).toEqual({ min: 0, median: 2, max: 2 });
    expect(summary.depositsFound).toEqual({ min: 0, median: 1, max: 2 });
    expect(summary.foundDeposit).toBe(2);
    expect(summary.deposits).toEqual({ found: 3, mined: 1 });
  });

  it('has no quarter of a first technology when no game researched', () => {
    const summary = summarise([gameResult(1), gameResult(2)]);

    expect(summary.researched).toBe(0);
    expect(summary.firstTechnology).toBe(null);
    expect(summary.technologyKnown).toEqual([]);
    expect(summary.deposits).toEqual({ found: 0, mined: 0 });
  });

  const report = writeUp(tavaraAsShipped(), '1-4', 4, [
    { player: 'Studious', summary: summarise(results) },
    { player: 'Idle', summary: summarise([gameResult(1), gameResult(2)]) },
  ]);

  it('is written up in a table of research and surveys, a row to a player', () => {
    expect(report.split('\n')).toEqual(
      expect.arrayContaining([
        '| Player | Technologies known | Quarter of the first technology | Regions surveyed | Deposits found | Found deposits mined |',
        '| --- | --- | --- | --- | --- | --- |',
        '| Studious | 75.0%, 0 / 2 / 3 | 5 / 7 / 9 | 0 / 2 / 2 | 50.0%, 0 / 1 / 2 | 33.3%, 1 of 3 |',
        '| Idle | 0.0%, 0 / 0 / 0 | none | 0 / 0 / 0 | 0.0%, 0 / 0 / 0 | none found |',
      ]),
    );
  });

  it('is written up with each technology a player came to know, how often and when', () => {
    const [seed, storage, grid] = (
      ['droughtResistantSeed', 'coldStorage', 'gridEfficiency'] as const
    ).map(technologyName);

    expect(report).toContain(
      `- Studious: came to know ${seed} in 75.0% of its games (quarter 5 / 7 / 9), ${storage} in 50.0% (quarter 10 / 11 / 12), ${grid} in 25.0% (quarter 15 / 15 / 15).`,
    );
    expect(report).toContain('- Idle: came to know no technology.');
  });

  it('is written up with what the figures for research and surveys mean', () => {
    expect(report).toContain('Technologies known is the share of games that came to know');
    expect(report).toContain('A found deposit is mined when its mine is in use as the game ends');
  });
});
