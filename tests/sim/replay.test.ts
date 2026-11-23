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
 * the rules.
 */
const outcomes = [
  {
    name: 'Tavara',
    country: tavaraAsShipped,
    script: 'builds',
    hash: 'edd09c5ac160f8629223f7e7a0669b25db8481b134704aa0d25edc107a614550',
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
      ],
      austere: '',
    },
  },
  {
    name: 'Tavara',
    country: tavaraAsShipped,
    script: 'bailedOut',
    hash: '0a1d19d39215e63886ee4d71e4d71de309fa4327e0a6e8647097b3cb2fe0e0a5',
    summary: {
      date: { year: 6, quarter: 1 },
      treasury: 2,
      outcome: 'lost',
      sites: [
        'lowmere-road operating 3',
        'lowmere-irrigation operating 3',
        'lowmere-store paused 0',
      ],
      austere: '2 3 4 5 6 7 8 9',
    },
  },
  {
    name: 'Testland',
    country: testlandAsShipped,
    script: 'builds',
    hash: '141b880ced8c4698f4c2a50621623101f82d44471af804757fafa572ffb14973',
    summary: {
      date: { year: 7, quarter: 1 },
      treasury: 1,
      outcome: 'playing',
      sites: [
        'alpha-store decaying 2',
        'sand-road decaying 3',
        'north-power-line decaying 2',
        'sand-power-line decaying 2',
      ],
      austere: '',
    },
  },
  {
    name: 'Testland',
    country: testlandAsShipped,
    script: 'bailedOut',
    hash: '9bf4c3e8864fffbf7ba8e8b08c93b50dddf176437ee773b9b84ff5511a09ee55',
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
