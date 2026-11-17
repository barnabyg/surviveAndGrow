/**
 * `npm run audit`: `npm audit`, failing on every advisory except the few excepted below.
 *
 * npm audit has no way to set one advisory aside, so this reads its JSON report. A package
 * flagged only because it depends on an excepted package is let through with it; any other
 * advisory, at any severity, fails the run. An exception also fails the run once its review
 * date has passed, so that it is looked at again rather than forgotten.
 */
import { spawnSync } from 'node:child_process';

interface Exception {
  /** The advisory's address, as npm audit reports it. */
  readonly url: string;
  /** The one package the advisory is excepted for. */
  readonly package: string;
  /** Why it does not affect this project. */
  readonly why: string;
  /** The date, YYYY-MM-DD, after which the exception stops working until reviewed. */
  readonly reviewBy: string;
}

const EXCEPTIONS: readonly Exception[] = [
  {
    url: 'https://github.com/advisories/GHSA-fc5q-39xc-vjpf',
    package: 'picomatch',
    why:
      'ReDoS on a crafted glob pattern. picomatch is used only by the build and test tools ' +
      '(vite, vitest, typescript-eslint), on glob patterns written in this repository, and is ' +
      'not part of the game the browser loads (`npm audit --omit=dev` is clean). Every ' +
      'picomatch release, up to 4.0.7, is affected, so there is no version to move to yet. ' +
      'Remove this exception when a fixed picomatch is published and installed.',
    reviewBy: '2026-12-17',
  },
];

interface Advisory {
  readonly url: string;
  readonly title: string;
  readonly severity: string;
}

interface Report {
  readonly vulnerabilities?: Readonly<
    Record<string, { readonly via: readonly (string | Advisory)[] }>
  >;
}

// Through the shell, so that `npm` resolves to npm.cmd on Windows. The command is fixed text.
const run = spawnSync('npm audit --json', { encoding: 'utf8', shell: true });
if (run.error !== undefined) throw run.error;
const report = JSON.parse(run.stdout) as Report;
// npm audit could not check (no network, say): that is a failure, not a clean result.
if (report.vulnerabilities === undefined) {
  console.error(`npm audit gave no report:\n${run.stdout}${run.stderr}`);
  process.exit(1);
}
const today = new Date().toISOString().slice(0, 10);

const failures: string[] = [];
for (const [name, { via }] of Object.entries(report.vulnerabilities)) {
  for (const advisory of via) {
    // A package name here means "flagged through that dependency", whose own advisory is
    // checked under its own entry.
    if (typeof advisory === 'string') continue;
    const exception = EXCEPTIONS.find(
      (candidate) => candidate.url === advisory.url && candidate.package === name,
    );
    if (exception === undefined) {
      failures.push(`${name}: ${advisory.title} (${advisory.severity}) ${advisory.url}`);
    } else if (today > exception.reviewBy) {
      failures.push(
        `${name}: the exception for ${advisory.url} was due for review on ${exception.reviewBy}.`,
      );
    } else {
      console.log(`Excepted until ${exception.reviewBy}: ${name} ${advisory.url}`);
    }
  }
}

if (failures.length > 0) {
  console.error(`npm audit found advisories that are not excepted:\n${failures.join('\n')}`);
  process.exit(1);
}
console.log('npm audit: no advisories beyond the excepted ones.');
