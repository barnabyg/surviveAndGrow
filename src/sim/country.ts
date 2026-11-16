import { MONEY_PER_MILLION, type Money } from './types';

/** The version of the country file format this game reads. */
export const COUNTRY_FORMAT_VERSION = 1;

/** A country, checked and ready to start a game from. The engine holds no country of its own. */
export interface Country {
  readonly formatVersion: number;
  readonly id: string;
  readonly name: string;
  readonly start: {
    readonly treasury: Money;
  };
}

/** Thrown when a country file is rejected. Each fault names where it is and what is wrong. */
export class CountryFileError extends Error {
  readonly faults: readonly string[];

  constructor(faults: readonly string[]) {
    super(`The country file cannot be used. ${faults.join(' ')}`);
    this.name = 'CountryFileError';
    this.faults = faults;
  }
}

type Json = Readonly<Record<string, unknown>>;

/**
 * Reads values out of a country file, noting every fault it meets and carrying on with a
 * harmless stand-in, so the author is told about all of them at once.
 */
class Reader {
  readonly faults: string[] = [];

  fault(path: string, problem: string): void {
    this.faults.push(`${path} ${problem}.`);
  }

  object(parent: Json, key: string, path: string): Json {
    const value = parent[key];
    if (isRecord(value)) return value;
    this.fault(join(path, key), wrongKind(value, 'an object'));
    return {};
  }

  text(parent: Json, key: string, path: string): string {
    const value = parent[key];
    if (typeof value === 'string' && value.trim() !== '') return value;
    this.fault(join(path, key), wrongKind(value, 'text'));
    return '';
  }

  number(parent: Json, key: string, path: string): number {
    const value = parent[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    this.fault(join(path, key), wrongKind(value, 'a number'));
    return 0;
  }

  /** An amount written in millions of dollars, to at most one decimal place. */
  money(parent: Json, key: string, path: string): Money {
    const millions = this.number(parent, key, path);
    const units = Math.round(millions * MONEY_PER_MILLION);
    if (millions < 0) {
      this.fault(join(path, key), `must not be negative, but is ${millions}`);
      return 0;
    }
    if (Math.abs(millions * MONEY_PER_MILLION - units) > 1e-6) {
      this.fault(join(path, key), `must be in millions to one decimal place, but is ${millions}`);
      return 0;
    }
    return units;
  }
}

function isRecord(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function join(path: string, key: string): string {
  return path === '' ? key : `${path}.${key}`;
}

function wrongKind(value: unknown, wanted: string): string {
  return value === undefined ? 'is missing' : `must be ${wanted}, but is ${describe(value)}`;
}

function describe(value: unknown): string {
  if (value === null) return 'empty';
  if (Array.isArray(value)) return 'a list';
  if (typeof value === 'string') return value.trim() === '' ? 'blank' : 'text';
  if (typeof value === 'number') return Number.isFinite(value) ? 'a number' : 'not a finite number';
  if (typeof value === 'boolean') return 'true or false';
  return typeof value === 'object' ? 'an object' : 'missing';
}

/**
 * Checks a country file and returns the country it describes.
 * @throws CountryFileError naming every fault found.
 */
export function loadCountry(file: unknown): Country {
  if (!isRecord(file)) {
    throw new CountryFileError([`The file must be an object, but is ${describe(file)}.`]);
  }
  const reader = new Reader();

  const formatVersion = reader.number(file, 'formatVersion', '');
  if (file.formatVersion !== undefined && formatVersion !== COUNTRY_FORMAT_VERSION) {
    throw new CountryFileError([
      `formatVersion is ${formatVersion}, but this game reads version ${COUNTRY_FORMAT_VERSION}.`,
    ]);
  }

  const start = reader.object(file, 'start', '');
  const country: Country = {
    formatVersion,
    id: reader.text(file, 'id', ''),
    name: reader.text(file, 'name', ''),
    start: {
      treasury: reader.money(start, 'treasury', 'start'),
    },
  };

  if (reader.faults.length > 0) throw new CountryFileError(reader.faults);
  return country;
}
