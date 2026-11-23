import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  advanceQuarter,
  createGame,
  loanOffers,
  previewQuarter,
  siteStatus,
  startFault,
  withinAusterity,
  type Budget,
  type Country,
  type Decisions,
  type GameState,
} from '../../src/sim';
import { tavaraAsShipped, testlandAsShipped } from './countries';
import { answering, steward } from './playing';

/** Everything at its most, at the lowest tax: it spends whatever the treasury holds. */
const ruinous: Budget = {
  taxRatePercent: 5,
  spending: {
    agriculture: 200,
    foodRelief: 200,
    health: 200,
    education: 200,
    security: 200,
    upkeep: 200,
  },
};

/** How a fixed game is played: whether it borrows and overspends into a bailout first. */
type Script = 'builds' | 'bailedOut';

/**
 * A fixed game. In every quarter it starts the first site in the country file's order that
 * can be started, on its opening budget taxed at 30%, and every sixth quarter on a budget the
 * treasury cannot cover, so building pauses. Played `bailedOut`, it first takes the largest
 * loan on offer over the shortest term and overspends for three quarters, so a bailout brings
 * austerity and bars new projects. Dilemmas are answered with the option that costs nothing.
 */
function decide(script: Script, state: GameState, quarter: number): Decisions {
  const overspends = quarter % 6 === 5 || (script === 'bailedOut' && quarter < 3);
  const wanted = overspends ? ruinous : { ...state.country.start.budget, taxRatePercent: 30 };
  const start = state.country.sites.find((site) => startFault(state, [site.id]) === null);
  const [offer] =
    script === 'bailedOut' && quarter === 0
      ? loanOffers(state)
          .filter((each) => each.unavailable === null)
          .sort((a, b) => b.amount - a.amount || a.quarters - b.quarters)
      : [];
  return answering(state, {
    ...steward(state, withinAusterity(state, wanted)),
    startProjects: start === undefined ? [] : [start.id],
    borrow:
      offer === undefined ? [] : [{ kind: 'loan', amount: offer.amount, quarters: offer.quarters }],
  });
}

/**
 * The fingerprint of a fixed game, seed 2026, played for six years or until it ends: every
 * quarter's preview, report and resulting state, with each project read through the site it
 * stands on. Anything that moves a project's money, timing or effect changes it.
 */
function fingerprint(
  country: () => Country,
  script: Script,
): { readonly hash: string; readonly summary: unknown } {
  let state = createGame(country(), 2026);
  const hash = createHash('sha256');
  const austere: number[] = [];
  for (let quarter = 0; quarter < 24 && state.outcome.status === 'playing'; quarter += 1) {
    const decisions = decide(script, state, quarter);
    const preview = previewQuarter(state, decisions);
    const result = advanceQuarter(state, decisions);
    // The country never changes, and the projects are read through the sites they stand on.
    const rest = { ...result.state, country: null, projects: null };
    const sites = result.state.country.sites.map((site) => siteStatus(result.state, site.id));
    hash.update(JSON.stringify({ preview, report: result.report, state: rest, sites }));
    state = result.state;
    if (state.austerity !== null) austere.push(quarter);
  }
  return {
    hash: hash.digest('hex'),
    summary: {
      date: state.date,
      treasury: state.treasury,
      outcome: state.outcome.status,
      sites: state.country.sites
        .map((site) => siteStatus(state, site.id))
        .filter((status) => status.state !== 'empty')
        .map((status) => `${status.siteId} ${status.state} ${status.quartersPaid}`),
      austere: austere.join(' '),
    },
  };
}

/**
 * Each fixed game as it was played before a project had a target, when every project was on a
 * site. Never change these to make a test pass: a game that plays differently is a change in
 * the rules. The hashes were pinned again when sites could be locked: each site's status gained
 * what locks it, and each country a dam none of these games can research. With those left out
 * of the fingerprint, every game hashed as before. They were pinned once more when each country
 * gained clinics and schools, locked in these games as the dam is: with those sites left out of
 * the fingerprint, every game again hashed as before.
 */
const outcomes = [
  {
    name: 'Tavara',
    country: tavaraAsShipped,
    script: 'builds',
    hash: '1e286020e64c33a777d9b256642b4a97d2fd4bdf52a1b624601ba25863d8ae33',
    summary: {
      date: { year: 6, quarter: 1 },
      treasury: 2,
      outcome: 'lost',
      sites: [
        'lowmere-road operating 3',
        'lowmere-irrigation operating 3',
        'lowmere-store operating 2',
        'dustwell-irrigation operating 3',
        'southbank-store operating 2',
        'coast-road operating 3',
        'highland-road operating 3',
        'saltmouth-port closed 0',
        'saltmouth-quay paused 3',
        'arden-power-line operating 2',
        'lowmere-power-line operating 2',
        'korr-falls-dam locked 0',
        'dustwell-clinic locked 0',
        'westhaven-clinic locked 0',
        'southbank-school locked 0',
        'korrgate-school locked 0',
      ],
      austere: '',
    },
  },
  {
    name: 'Tavara',
    country: tavaraAsShipped,
    script: 'bailedOut',
    hash: '0f6763d6c12642a5ceb212663ff7d88a78057dac8745b23ac5c49e9ffb7d8aba',
    summary: {
      date: { year: 6, quarter: 1 },
      treasury: 2,
      outcome: 'lost',
      sites: [
        'lowmere-road operating 3',
        'lowmere-irrigation operating 3',
        'lowmere-store paused 0',
        'korr-falls-dam locked 0',
        'dustwell-clinic locked 0',
        'westhaven-clinic locked 0',
        'southbank-school locked 0',
        'korrgate-school locked 0',
      ],
      austere: '2 3 4 5 6 7 8 9',
    },
  },
  {
    name: 'Testland',
    country: testlandAsShipped,
    script: 'builds',
    hash: 'd2060dbc8060a16104baa934b7b31684fb11de87b4768cab908d0d7d015e5e4e',
    summary: {
      date: { year: 7, quarter: 1 },
      treasury: 1,
      outcome: 'playing',
      sites: [
        'alpha-store decaying 2',
        'sand-road decaying 3',
        'north-power-line decaying 2',
        'sand-power-line decaying 2',
        'sand-dam locked 0',
        'sand-dam-line locked 0',
        'beta-clinic locked 0',
        'beta-school locked 0',
      ],
      austere: '',
    },
  },
  {
    name: 'Testland',
    country: testlandAsShipped,
    script: 'bailedOut',
    hash: '3de46725c5848c8a73e4eb6e4b885aac896745222c79191e07177213858c515b',
    summary: {
      date: { year: 7, quarter: 1 },
      treasury: 3,
      outcome: 'playing',
      sites: [
        'north-irrigation paused 1',
        'alpha-store decaying 2',
        'sand-road paused 0',
        'north-power-line decaying 2',
        'sand-power-line decaying 2',
        'sand-dam locked 0',
        'sand-dam-line locked 0',
        'beta-clinic locked 0',
        'beta-school locked 0',
      ],
      austere: '',
    },
  },
] as const;

describe('a fixed game replayed', () => {
  it.each(outcomes)(
    'in $name, played as it $script, comes to the same outcome as it always has',
    ({ country, script, hash, summary }) => {
      const played = fingerprint(country, script);

      expect(played.summary).toEqual(summary);
      expect(played.hash).toBe(hash);
    },
  );
});
