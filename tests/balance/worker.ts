import { writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { playGame } from './batch';
import { countryNamed, playersNamed, type Job, type Played } from './jobs';

/**
 * One worker of the balance run: it plays the games of one job, given by the run in
 * `BALANCE_JOB`, and writes what each came to as JSON to the file the job names. The run
 * (`run.ts`) starts several at once and gathers what they write.
 */
it('plays its share of the balance run', () => {
  const job = JSON.parse(process.env.BALANCE_JOB ?? 'null') as Job | null;
  if (job === null) throw new Error('A balance worker needs BALANCE_JOB.');
  const country = countryNamed(job.country);
  const played: Played[] = playersNamed(job.players).flatMap((player) =>
    job.seeds.map((seed) => ({
      player: player.name,
      result: playGame(country, seed, player.decide, job.terms),
    })),
  );
  writeFileSync(job.out, JSON.stringify(played));
});
