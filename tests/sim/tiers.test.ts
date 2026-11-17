import { describe, expect, it } from 'vitest';
import tavaraFile from '../../src/countries/tavara.json';
import {
  advanceQuarter,
  approvalStatus,
  createGame,
  prosperityStatus,
  risksAhead,
  tierStatus,
  type Budget,
  type Country,
  type GameState,
  type TurnReport,
} from '../../src/sim';
import { expectationsIn, nextTier, tierAt } from '../../src/sim/tiers';
import testlandFile from '../countries/testland.json';
import { withChances } from './countries';

interface File {
  regions: { id: string; output: number }[];
}

/** A copy of a country file with every region's output scaled by a percentage. */
function scaled(file: unknown, percent: number): File {
  const copy = structuredClone(file) as File;
  for (const region of copy.regions)
    region.output = Math.round((region.output * percent) / 10) / 10;
  return copy;
}

/**
 * The budget in force with health and education spending raised as far as either can usefully
 * go: enough to hold the levels at their highest, or the most the budget allows.
 */
function generous(game: GameState): Budget {
  const people = game.regions.reduce((total, region) => total + region.population, 0);
  const amount = Math.min(200, Math.ceil((1000 * people) / 11_000_000 / 10) * 10);
  return {
    ...game.budget,
    spending: { ...game.budget.spending, health: amount, education: amount },
  };
}

/** The budget in force with nothing spent on farming, relief, health or education. */
function neglect(game: GameState): Budget {
  const { spending } = game.budget;
  return {
    ...game.budget,
    spending: { ...spending, agriculture: 0, foodRelief: 0, health: 0, education: 0 },
  };
}

/**
 * The country with its regions' output raised just enough that one quarter of generous
 * spending on health and education carries it into the next tier, with the chances given.
 */
function poised(file: unknown, chances: Parameters<typeof withChances>[1] = {}): Country {
  for (let percent = 100; percent <= 400; percent += 5) {
    const country = withChances(scaled(file, percent), chances);
    const game = createGame(country, 1);
    if (advanceQuarter(game, { budget: generous(game) }).state.tier !== game.tier) return country;
  }
  throw new Error('No output poises the country below its next tier');
}

const countries = [
  { name: 'Tavara', file: tavaraFile, starts: 'subsistence', next: 'developing' },
  { name: 'Testland', file: testlandFile, starts: 'developing', next: 'industrialising' },
] as const;

describe('the tiers of prosperity', () => {
  it('begin at 25, 45 and 70, and the last is the target', () => {
    expect([0, 249, 250, 449, 450, 699, 700, 1000].map(tierAt)).toEqual([
      'subsistence',
      'subsistence',
      'developing',
      'developing',
      'industrialising',
      'industrialising',
      'prosperous',
      'prosperous',
    ]);
    expect(prosperityStatus(createGame(withChances(tavaraFile, {}), 1)).target).toBe(700);
  });

  it('are passed at once, but lost only 2 points below where they begin', () => {
    expect(nextTier('subsistence', 250)).toBe('developing');
    expect(nextTier('subsistence', 470)).toBe('industrialising');
    expect(nextTier('developing', 240)).toBe('developing');
    expect(nextTier('developing', 230)).toBe('developing');
    expect(nextTier('developing', 229)).toBe('subsistence');
    expect(nextTier('industrialising', 200)).toBe('subsistence');
  });

  it('raise expectations by 3 points a tier beyond the one the game began in', () => {
    expect(expectationsIn('developing', 'subsistence')).toBe(30);
    expect(expectationsIn('prosperous', 'developing')).toBe(60);
    expect(expectationsIn('subsistence', 'developing')).toBe(0);
  });
});

describe.each(countries)('the tier in force in $name', ({ file, starts, next }) => {
  it('is known from the start, with how far it is to the next', () => {
    const game = createGame(withChances(file, {}), 1);
    const prosperity = prosperityStatus(game).value;

    expect(game.tier).toBe(starts);
    expect(game.startingTier).toBe(starts);
    expect(tierStatus({ ...game, prosperity })).toMatchObject({
      tier: starts,
      next: { tier: next, distance: (next === 'developing' ? 250 : 450) - prosperity },
      expectations: 0,
    });
  });

  it('is passed with a report entry, and the approval baseline drops as expectations rise', () => {
    const start = createGame(poised(file), 1);

    const { state, report } = advanceQuarter(start, { budget: generous(start) });

    expect(state.tier).toBe(next);
    expect(state.startingTier).toBe(starts);
    const entry = report.entries.find((candidate) => candidate.kind === 'tier');
    expect(entry?.headline).toBe(
      `Prosperity has reached a new tier: ${next.charAt(0).toUpperCase()}${next.slice(1)}`,
    );
    expect(entry?.cause).toContain(
      'People now expect more: the approval baseline is 3.0 points lower.',
    );
    expect(report.approval.contributions).toContainEqual({
      label: 'Rising expectations',
      amount: -30,
    });
    expect(approvalStatus(state).causes).toContainEqual({ label: 'Expectations', amount: -30 });
  });

  it('falls back when hunger drags prosperity down, which is reported and eases expectations', () => {
    const drought = Object.fromEntries(
      (file as File).regions.map((region) => [region.id, 1] as const),
    );
    const start = createGame(poised(file, { drought, reserve: 0 }), 1);
    let state = advanceQuarter(start, { budget: generous(start) }).state;
    expect(state.tier).toBe(next);

    let fell: TurnReport | undefined;
    let warned = false;
    for (let quarter = 0; quarter < 16 && fell === undefined; quarter += 1) {
      if (state.outcome.status !== 'playing') break;
      const decisions = { budget: neglect(state) };
      warned ||= risksAhead(state, decisions).some((risk) => risk.kind === 'tier');
      const result = advanceQuarter(state, decisions);
      if (result.state.tier !== state.tier) fell = result.report;
      state = result.state;
    }

    expect(state.tier).toBe(starts);
    const entry = fell?.entries.find((candidate) => candidate.kind === 'tier');
    expect(entry?.headline).toMatch(/^Prosperity has fallen back to /);
    expect(entry?.cause).toContain('the approval baseline is 3.0 points higher');
    expect(fell?.approval.contributions).toContainEqual({
      label: 'Easing expectations',
      amount: 30,
    });
    // The risks ahead warned of it while there was still time.
    expect(warned).toBe(true);
  });
});
