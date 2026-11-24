import { describe, expect, it } from 'vitest';
import {
  advanceQuarter,
  armyLoyaltyStatus,
  createGame,
  deterrenceStatus,
  risksAhead,
  type GameState,
} from '../../src/sim';
import { budgetFrom } from '../budgets';
import { TIPS, tipsDue, type TipCondition } from '../../src/ui/tips';
import { withinRules } from '../balance/players';
import { tavaraAsShipped } from '../sim/countries';
import { GAME_TIMEOUT, playerNamed } from '../sim/scripted';

/**
 * A game in the country as it ships in which each tip's condition arises: the scripted player,
 * the seed, and the quarter it arises in, counted from 0. Risks ahead are worked out apart,
 * since they take long to work out every quarter. A change to the rules or the country that
 * moves one of these breaks the test; a search over the scripted players and the first few
 * seeds finds another.
 */
const ARISES: readonly [TipCondition, player: string, seed: number, quarter: number][] = [
  ['dilemma', 'Does nothing', 2, 1],
  ['price-shock', 'Does nothing', 4, 1],
  ['missing-link', 'Sensible borrower', 1, 1],
  ['decay', 'Sensible', 2, 5],
  ['unrest', 'Does nothing', 4, 7],
  ['army-loyalty', 'Does nothing', 2, 12],
  ['tier-passed', 'Sensible', 1, 7],
  ['neighbours', 'Sensible', 1, 7],
  ['border-incident', 'Borrow and build at once', 1, 7],
  ['bailout', 'Reckless borrower', 5, 13],
  ['election-near', 'Sensible', 1, 16],
];

/** A scripted player's game in the country as it ships, as the given quarter is decided. */
function playedBy(playerName: string, seed: number, quarter: number): GameState {
  const player = playerNamed(playerName);
  let game: GameState = createGame(tavaraAsShipped(), seed);
  for (let played = 0; played < quarter; played += 1) {
    game = advanceQuarter(game, withinRules(game, player.decide(game))).state;
  }
  return game;
}

/** The tip conditions that hold as the given quarter is decided in a scripted player's game. */
function dueIn(playerName: string, seed: number, quarter: number): ReadonlySet<TipCondition> {
  const game = playedBy(playerName, seed, quarter);
  const decisions = withinRules(game, playerNamed(playerName).decide(game));
  return tipsDue({ game, risks: [], plannedSiteIds: decisions.startProjects ?? [] });
}

describe('the first-time tips', () => {
  it('each wait for a different condition', () => {
    const conditions = TIPS.map((tip) => tip.when);
    expect(new Set(conditions).size).toBe(conditions.length);
    expect(new Set(TIPS.map((tip) => tip.id)).size).toBe(TIPS.length);
  });

  it('can each arise in the country as it ships', () => {
    const covered = new Set([
      ...ARISES.map(([condition]) => condition),
      'weather-warning',
      'research',
      'survey',
    ]);
    expect(TIPS.filter((tip) => !covered.has(tip.when))).toEqual([]);
  });

  it.each(ARISES)(
    'wait for %s, which arises in a game of %s',
    (condition, player, seed, quarter) => {
      expect(dueIn(player, seed, quarter).has(condition)).toBe(true);
    },
    // Each plays a scripted player's game, which takes longer while the suite runs alongside.
    GAME_TIMEOUT,
  );

  it('wait for a drought or flood that risks ahead warns of', () => {
    const game = createGame(tavaraAsShipped(), 1);
    const risks = risksAhead(game, { budget: game.budget });
    expect(tipsDue({ game, risks, plannedSiteIds: [] }).has('weather-warning')).toBe(true);
  });

  it('wait for research once the player plans it, and while it is under way', () => {
    const game = createGame(tavaraAsShipped(), 1);
    const seed = 'droughtResistantSeed';
    expect(tipsDue({ game, risks: [], plannedSiteIds: [], plannedResearch: seed })).toContain(
      'research',
    );
    const decisions = { budget: game.budget, startResearch: seed } as const;
    const underway = advanceQuarter(game, decisions).state;
    expect(tipsDue({ game: underway, risks: [], plannedSiteIds: [] })).toContain('research');
  });

  it('wait for a survey once the player plans one, and while it is under way', () => {
    const game = createGame(tavaraAsShipped(), 1);
    expect(
      tipsDue({ game, risks: [], plannedSiteIds: [], plannedSurveys: ['salt-coast'] }),
    ).toContain('survey');
    const decisions = { budget: game.budget, startSurveys: ['salt-coast'] };
    const underway = advanceQuarter(game, decisions).state;
    expect(tipsDue({ game: underway, risks: [], plannedSiteIds: [] })).toContain('survey');
  });

  it('wait for research once the player first opens the research tab', () => {
    const game = createGame(tavaraAsShipped(), 1);
    expect(tipsDue({ game, risks: [], plannedSiteIds: [], openTab: 'research' })).toContain(
      'research',
    );
    expect(tipsDue({ game, risks: [], plannedSiteIds: [], openTab: 'budget' })).not.toContain(
      'research',
    );
  });

  it('wait for a survey once the player first picks out a region that could be surveyed', () => {
    const game = createGame(tavaraAsShipped(), 1);
    // The Salt Coast hides a deposit, so its card offers a survey; Arden Vale hides none.
    expect(
      tipsDue({ game, risks: [], plannedSiteIds: [], selectedRegionId: 'salt-coast' }),
    ).toContain('survey');
    expect(
      tipsDue({ game, risks: [], plannedSiteIds: [], selectedRegionId: 'arden-vale' }),
    ).not.toContain('survey');
  });

  it('wait for defence and the army once the budget in force would leave the army less than loyal', () => {
    const game = createGame(tavaraAsShipped(), 1);
    expect(tipsDue({ game, risks: [], plannedSiteIds: [] })).not.toContain('army-loyalty');
    // One quarter with Defence cut to nothing: the army is still loyal, but no longer heading so.
    const cut = budgetFrom(game.budget, { spending: { defence: 0 } });
    const undefended = advanceQuarter(game, { budget: cut }).state;
    expect(armyLoyaltyStatus(undefended).stage).toBe('loyal');
    expect(tipsDue({ game: undefended, risks: [], plannedSiteIds: [] })).toContain('army-loyalty');
    // With Defence restored it waits again, since nothing is slipping.
    const restored = advanceQuarter(undefended, { budget: game.budget }).state;
    expect(tipsDue({ game: restored, risks: [], plannedSiteIds: [] })).not.toContain(
      'army-loyalty',
    );
  });

  it('wait for neighbours and deterrence once a neighbour is anything but peaceful', () => {
    // Sensible's game on seed 1 passes into Developing as its seventh quarter ends, and with
    // that Voskar turns watchful.
    const peaceful = playedBy('Sensible', 1, 6);
    expect(deterrenceStatus(peaceful).neighbours.map((each) => each.intention)).toEqual([
      'peaceful',
      'peaceful',
    ]);
    expect(tipsDue({ game: peaceful, risks: [], plannedSiteIds: [] })).not.toContain('neighbours');
    const watched = playedBy('Sensible', 1, 7);
    expect(deterrenceStatus(watched).neighbours.map((each) => each.intention)).toEqual([
      'watchful',
      'peaceful',
    ]);
    expect(tipsDue({ game: watched, risks: [], plannedSiteIds: [] })).toContain('neighbours');
  });

  it('wait for border incidents until a hostile neighbour announces one', () => {
    // Borrowing and building at once carries seed 1 up the tiers on the Defence it started
    // with: Voskar turns hostile, and announces an incident as the seventh quarter ends.
    const before = playedBy('Borrow and build at once', 1, 6);
    expect(before.borderIncidents).toEqual([]);
    expect(tipsDue({ game: before, risks: [], plannedSiteIds: [] })).not.toContain(
      'border-incident',
    );
    const announced = playedBy('Borrow and build at once', 1, 7);
    expect(announced.borderIncidents.map((incident) => incident.neighbourId)).toEqual(['voskar']);
    expect(tipsDue({ game: announced, risks: [], plannedSiteIds: [] })).toContain(
      'border-incident',
    );
  });

  it('wait for nothing in a game that has only just begun, risks ahead aside', () => {
    const game = createGame(tavaraAsShipped(), 1);
    expect([...tipsDue({ game, risks: [], plannedSiteIds: [] })]).toEqual([]);
  });
});
