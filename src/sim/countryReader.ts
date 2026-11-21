import type { Point } from './country';
import { MONEY_PER_MILLION, type Money } from './types';
import { MAP_FRAME } from './vocabulary';

/** A country file, or any object inside it, as it was parsed. */
export type Json = Readonly<Record<string, unknown>>;

/**
 * Reads values out of a country file, noting every fault it meets and carrying on with a
 * harmless stand-in, so the author is told about all of them at once.
 */
export class Reader {
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

  /** A whole number no smaller than `min` and, when given, no larger than `max`. */
  wholeNumber(parent: Json, key: string, path: string, min: number, max?: number): number {
    const value = this.number(parent, key, path);
    if (typeof parent[key] !== 'number' || !Number.isFinite(parent[key])) return min;
    if (Number.isInteger(value) && value >= min && (max === undefined || value <= max)) {
      return value;
    }
    const allowed = max === undefined ? `of at least ${min}` : `from ${min} to ${max}`;
    this.fault(join(path, key), `is ${value}, but must be a whole number ${allowed}`);
    return min;
  }

  /** One of the engine's own words, such as a terrain. */
  oneOf<Word extends string>(
    parent: Json,
    key: string,
    path: string,
    words: readonly [Word, ...Word[]],
  ): Word {
    const value = parent[key];
    const word = words.find((candidate) => candidate === value);
    if (word !== undefined) return word;
    this.fault(
      join(path, key),
      typeof value === 'string'
        ? `is "${value}", which is not one of: ${words.join(', ')}`
        : wrongKind(value, 'text'),
    );
    return words[0];
  }

  /** Text that must not repeat one already seen in the same list, such as an identifier. */
  unique(parent: Json, key: string, path: string, seen: Map<string, string>): string {
    const value = this.text(parent, key, path);
    if (value === '') return value;
    const earlier = seen.get(value);
    if (earlier === undefined) {
      seen.set(value, path);
    } else {
      this.fault(join(path, key), `repeats "${value}", already used by ${earlier}`);
    }
    return value;
  }

  /** A list of objects, each read by `read` with its own path, such as `regions[2]`. */
  list<Item>(
    parent: Json,
    key: string,
    path: string,
    read: (item: Json, itemPath: string) => Item,
  ): Item[] {
    const value = parent[key];
    const listPath = join(path, key);
    if (!Array.isArray(value)) {
      this.fault(listPath, wrongKind(value, 'a list'));
      return [];
    }
    return value.map((item: unknown, index) => {
      const itemPath = `${listPath}[${index}]`;
      if (isRecord(item)) return read(item, itemPath);
      this.fault(itemPath, wrongKind(item, 'an object'));
      return read({}, itemPath);
    });
  }

  /** A position, which must lie inside the map frame. */
  point(parent: Json, key: string, path: string): Point {
    const value = parent[key];
    if (value === undefined) {
      this.fault(join(path, key), 'is missing');
      return [0, 0];
    }
    return this.pointAt(value, join(path, key));
  }

  /** A line or outline, which needs at least `fewest` positions. */
  points(parent: Json, key: string, path: string, fewest: number): Point[] {
    const value = parent[key];
    const listPath = join(path, key);
    if (!Array.isArray(value)) {
      this.fault(listPath, wrongKind(value, 'a list of points'));
      return [];
    }
    if (value.length < fewest) {
      this.fault(listPath, `needs at least ${fewest} points, but has ${value.length}`);
    }
    return value.map((item: unknown, index) => this.pointAt(item, `${listPath}[${index}]`));
  }

  private pointAt(value: unknown, path: string): Point {
    if (!Array.isArray(value) || value.length !== 2) {
      this.fault(path, 'must be a pair of numbers [x, y]');
      return [0, 0];
    }
    const pair: readonly unknown[] = value;
    const [x, y] = pair;
    if (typeof x !== 'number' || typeof y !== 'number' || !isFinite(x) || !isFinite(y)) {
      this.fault(path, 'must be a pair of numbers [x, y]');
      return [0, 0];
    }
    if (x < 0 || x > MAP_FRAME.width || y < 0 || y > MAP_FRAME.height) {
      this.fault(
        path,
        `is (${x}, ${y}), outside the ${MAP_FRAME.width} by ${MAP_FRAME.height} map frame`,
      );
    }
    return [x, y];
  }
}

export function isRecord(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function join(path: string, key: string): string {
  return path === '' ? key : `${path}.${key}`;
}

export function wrongKind(value: unknown, wanted: string): string {
  return value === undefined ? 'is missing' : `must be ${wanted}, but is ${describeKind(value)}`;
}

export function describeKind(value: unknown): string {
  if (value === null) return 'empty';
  if (Array.isArray(value)) return 'a list';
  if (typeof value === 'string') return value.trim() === '' ? 'blank' : 'text';
  if (typeof value === 'number') return Number.isFinite(value) ? 'a number' : 'not a finite number';
  if (typeof value === 'boolean') return 'true or false';
  return typeof value === 'object' ? 'an object' : 'missing';
}

/**
 * A chance, from 0 to 1, for each of the engine's words of one kind, such as each event. A
 * word the file does not mention gets no chance, and a word the engine does not have is a fault.
 */
export function readChances<Word extends string>(
  reader: Reader,
  parent: Json,
  key: string,
  path: string,
  words: readonly Word[],
  kind: string,
): Record<Word, number> {
  const chancesPath = join(path, key);
  const written = parent[key] === undefined ? {} : reader.object(parent, key, path);
  for (const name of Object.keys(written)) {
    if (!words.some((word) => word === name)) {
      reader.fault(join(chancesPath, name), `is not ${kind} this game has (${words.join(', ')})`);
    }
  }
  return Object.fromEntries(
    words.map((word) => {
      if (written[word] === undefined) return [word, 0];
      const chance = reader.number(written, word, chancesPath);
      if (chance < 0 || chance > 1) {
        reader.fault(join(chancesPath, word), `is ${chance}, but must be a chance from 0 to 1`);
        return [word, 0];
      }
      return [word, chance];
    }),
  ) as Record<Word, number>;
}
