/**
 * The checks a save is read through, shared by loading (`save.ts`) and by lifting an old save
 * to the current format (`migrations.ts`). Each refuses what it is given with a `SaveError`
 * whose message names the part of the save at fault, in words for the player.
 */
import type { GameDate, Quarter } from './types';

/** Thrown when a save is refused. Its message is written for the player. */
export class SaveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SaveError';
  }
}

/** A save, or part of one, as plain data that nothing has yet checked. */
export type Json = Readonly<Record<string, unknown>>;

export function damaged(why: string): string {
  return `The saved game is damaged and cannot be opened: ${why}.`;
}

export function fail(path: string, problem: string): never {
  throw new SaveError(damaged(`${path} ${problem}`));
}

export function isRecord(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function record(value: unknown, path: string): Json {
  return isRecord(value) ? value : fail(path, 'is missing or is not an object');
}

export function list<Item>(
  value: unknown,
  path: string,
  read: (item: Json, itemPath: string) => Item,
): Item[] {
  if (!Array.isArray(value)) return fail(path, 'is missing or is not a list');
  return value.map((item: unknown, index) => {
    const itemPath = `${path}[${index}]`;
    return read(record(item, itemPath), itemPath);
  });
}

/** A whole number, no smaller than `min` and no larger than `max` where they are given. */
export function whole(value: unknown, path: string, min?: number, max?: number): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    return fail(path, 'is missing or is not a whole number');
  }
  if ((min !== undefined && value < min) || (max !== undefined && value > max)) {
    return fail(path, `is ${value}, which is out of range`);
  }
  return value;
}

export function text(value: unknown, path: string): string {
  return typeof value === 'string' && value !== '' ? value : fail(path, 'is missing or is blank');
}

/** One of a closed list of words: the engine's vocabulary, or the ids the country has. */
export function oneOf<Word extends string>(
  value: unknown,
  path: string,
  words: readonly Word[],
  kind: string,
): Word {
  const word = words.find((candidate) => candidate === value);
  if (word !== undefined) return word;
  return fail(
    path,
    typeof value === 'string' ? `is "${value}", which is not ${kind} this game has` : 'is missing',
  );
}

export function date(value: unknown, path: string): GameDate {
  const saved = record(value, path);
  return {
    year: whole(saved.year, `${path}.year`, 1),
    quarter: whole(saved.quarter, `${path}.quarter`, 1, 4) as Quarter,
  };
}
