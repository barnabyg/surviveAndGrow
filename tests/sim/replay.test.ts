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
import { lavish } from '../budgets';

/**
 * A budget no treasury covers. It names the areas it spends on, so a fixed game is played the
 * same when the game gains an area.
 */
const ruinous: Budget = lavish;

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
 * the fingerprint, every game again hashed as before. They were pinned again when the game
 * gained Defence and the army's loyalty. Played with nothing spent on Defence, and with the
 * army and Defence left out of the fingerprint and of the bailout's list of capped areas, every
 * game hashed as before. As pinned, each game spends on Defence what its country starts by
 * spending, which leaves it less to build with: the summaries below show what that cost it.
 * They were pinned once more when the game gained the coup: the state gained the count of
 * quarters the army has plotted, and the report what it says of the count. With both left out
 * of the fingerprint, every game hashed as before. The army plots twice in Tavara's bailed-out
 * game, in the quarters after it spends nothing on Defence, and recovers each time before the
 * count is up; in the other three it never plots. They were pinned again when the neighbours
 * gained ambitions: the state gained deterrence, the report its figure and what it says when a
 * neighbour's intention changes, and the preview its forecast of both. With all of those left
 * out of the fingerprint, every game hashed as before. A hostile neighbour does nothing yet, so
 * the summaries stand: only Tavara's building game passes a tier, in its second year, where
 * Voskar turns watchful, and then hostile and back as its overspending cuts Defence. They were
 * pinned once more when a hostile neighbour gained its border incidents: the state gained the
 * incidents announced. With that alone left out of the fingerprint, every game hashed as
 * before: none of the four meets an incident. Three never have a hostile neighbour. Tavara's
 * building game ends six quarters with Voskar hostile, and in none of them does its draw fall
 * under the chance, so it too plays exactly as it did. They were pinned again when the game
 * gained the factions: the state gained their standings, each region's approval its Factions
 * effect, the record of each quarter and the report the standings, and the preview its forecast
 * of them. Played on countries whose people follow no faction, and with all of those left out
 * of the fingerprint, every game hashed as before. As pinned, each country's regions have the
 * faction mixes it ships with, and the factions move approval, so these games play differently:
 * each taxes at 30%, which workers and business resent. Tavara's building game still loses its
 * first vote, with one site fewer kept up. Its bailed-out game, already in protest under
 * austerity's cap on Defence, now falls to a coup in its fourth year, before the vote it used to
 * lose. Testland's building game, which used to win its first vote narrowly, loses it with
 * 48.8%. Testland's bailed-out game plays on as before. Tavara's bailed-out game was pinned
 * once more when austerity came to cap Defence at what the country started on, where it had
 * capped it at half: the other three, which meet no cap on Defence below what they spend, kept
 * their hashes. Its army is now restless under austerity and never plots, so no coup comes, and
 * it loses the vote in its sixth year with 36.9%, as it did before the factions.
 */
const outcomes = [
  {
    name: 'Tavara',
    country: tavaraAsShipped,
    script: 'builds',
    hash: '8f517ae565d02e69f7f706e855f4a0e7076993fec8dd8a1dff63ec3eac759a93',
    summary: {
      date: { year: 6, quarter: 1 },
      treasury: 6,
      outcome: 'lost',
      sites: [
        'lowmere-road operating 3',
        'lowmere-irrigation operating 3',
        'lowmere-store operating 2',
        'dustwell-irrigation operating 3',
        'southbank-store operating 2',
        'coast-road operating 3',
        'highland-road decaying 3',
        'arden-power-line decaying 2',
        'lowmere-power-line paused 1',
        'korrgate-power-line paused 0',
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
    hash: '808d7e0c6f89ab3ee2f8e1b62cc37d267147bcb377c230da7c1fcd3eb3512ac5',
    summary: {
      date: { year: 6, quarter: 1 },
      treasury: 6,
      outcome: 'lost',
      sites: [
        'lowmere-road operating 3',
        'lowmere-irrigation decaying 3',
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
    hash: 'e214a72e046a1339ddb6cc7c2abcdebfdbd70aee05c4eae75b3286a3bc3f33cf',
    summary: {
      date: { year: 6, quarter: 1 },
      treasury: 43,
      outcome: 'lost',
      sites: [
        'alpha-store operating 2',
        'north-power-line operating 2',
        'sand-power-line operating 2',
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
    hash: '018f16fb5a437369b4329551e870791466976bf561f7d349770ed5d7ef2cd9e4',
    summary: {
      date: { year: 7, quarter: 1 },
      treasury: 5,
      outcome: 'playing',
      sites: [
        'alpha-store decaying 2',
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
