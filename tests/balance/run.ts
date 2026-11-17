import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { availableParallelism, tmpdir } from 'node:os';
import path from 'node:path';
import { expect, it } from 'vitest';
import { DEFAULT_TERMS, summarise } from './batch';
import { COUNTRIES, countryNamed, playersFor, type Job, type Played } from './jobs';
import { writeUp, type Row } from './report';

/**
 * The balance run: `npm run balance`. It plays every scripted player through whole games on
 * the countries as they ship, over a range of seeds, and reports how often each wins and
 * what the others lose to. It is not part of the test suite and gates nothing.
 *
 *   BALANCE_SEEDS    the seeds to play, as `from-to` (default `1-300`)
 *   BALANCE_COUNTRY  `tavara`, `testland` or `both` (default `both`)
 *   BALANCE_OUT      where the results are written (default `balance-results.md`)
 *   BALANCE_PLAYERS  `all` adds the one-lever players that probe for a winning trick
 *   BALANCE_TERMS    the most terms each game is played for (default 4; 1 is Phase 1's single term)
 *   BALANCE_WORKERS  how many workers play games at once (default: all but two processors)
 *
 * The games are shared out among workers (`worker.ts`), each a process of its own, and every
 * game depends only on its country, player and seed, so the report is the same however many
 * workers play it.
 */
const SEEDS_PER_JOB = 20;

function seedsFrom(range: string): number[] {
  const match = /^(\d+)-(\d+)$/.exec(range);
  const from = Number(match?.[1]);
  const to = Number(match?.[2]);
  if (match === null || from > to) {
    throw new Error(`BALANCE_SEEDS must be a range such as 1-300, but is "${range}".`);
  }
  return Array.from({ length: to - from + 1 }, (_, index) => from + index);
}

function wholeNumber(name: string, fallback: number): number {
  const value = Number(process.env[name] ?? String(fallback));
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${name} must be a whole number from 1, but is "${process.env[name]}".`);
  }
  return value;
}

/** Plays one job in a worker process of its own, and gives back what it played. */
function work(job: Job): Promise<Played[]> {
  const vitest = path.resolve('node_modules', 'vitest', 'vitest.mjs');
  const config = path.resolve('tests', 'balance', 'worker.config.ts');
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [vitest, 'run', '--config', config], {
      env: { ...process.env, BALANCE_JOB: JSON.stringify(job) },
      stdio: ['ignore', 'ignore', 'pipe'],
    });
    let errors = '';
    child.stderr.on('data', (chunk: Buffer) => (errors += chunk.toString()));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`A balance worker failed (exit ${code}) on ${job.country}: ${errors}`));
        return;
      }
      resolve(JSON.parse(readFileSync(job.out, 'utf8')) as Played[]);
    });
  });
}

/** Runs the jobs, no more than `workers` at a time, and gives back what each played. */
async function runAll(
  jobs: readonly Job[],
  workers: number,
): Promise<{ readonly job: Job; readonly played: Played[] }[]> {
  const queue = [...jobs];
  const done: { job: Job; played: Played[] }[] = [];
  const next = async (): Promise<void> => {
    for (let job = queue.shift(); job !== undefined; job = queue.shift()) {
      done.push({ job, played: await work(job) });
    }
  };
  await Promise.all(Array.from({ length: Math.min(workers, jobs.length) }, next));
  return done;
}

it('plays the scripted players and reports the balance', async () => {
  const range = process.env.BALANCE_SEEDS ?? '1-300';
  const terms = wholeNumber('BALANCE_TERMS', DEFAULT_TERMS);
  const workers = wholeNumber('BALANCE_WORKERS', Math.max(1, availableParallelism() - 2));
  const wanted = process.env.BALANCE_COUNTRY ?? 'both';
  const out = path.resolve(process.env.BALANCE_OUT ?? 'balance-results.md');
  const seeds = seedsFrom(range);
  const names = wanted === 'both' ? Object.keys(COUNTRIES) : [wanted];
  const players = playersFor(process.env.BALANCE_PLAYERS);
  const scratch = mkdtempSync(path.join(tmpdir(), 'balance-'));

  try {
    const jobs = names.flatMap((country) => {
      countryNamed(country);
      return players.flatMap((player) =>
        Array.from({ length: Math.ceil(seeds.length / SEEDS_PER_JOB) }, (_, index) => ({
          country,
          players: [player.name],
          seeds: seeds.slice(index * SEEDS_PER_JOB, (index + 1) * SEEDS_PER_JOB),
          terms,
          out: path.join(scratch, `${country}-${player.name}-${index}.json`),
        })),
      );
    });
    const done = await runAll(jobs, workers);

    const sections = names.map((name) => {
      const games = done.filter(({ job }) => job.country === name).flatMap(({ played }) => played);
      const rows = players.map((player): Row => ({
        player: player.name,
        summary: summarise(
          games
            .filter((game) => game.player === player.name)
            .map((game) => game.result)
            .sort((a, b) => a.seed - b.seed),
        ),
      }));
      // Every game must reach an ending: a game that throws fails its worker and the run.
      for (const row of rows) expect(row.summary.games).toBe(seeds.length);
      return writeUp(countryNamed(name), range, terms, rows);
    });

    const report = sections.join('\n');
    console.log(`\n${report}`);
    writeFileSync(out, report);
    console.log(`Written to ${out}`);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});
