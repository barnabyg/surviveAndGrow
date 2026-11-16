import { CountryFileError, loadCountry } from '../../src/sim';

/**
 * Helpers for breaking a country file on purpose. A fault is reached by its path, such as
 * `['regions', 0, 'terrain']`, so the tests can write values the country types would refuse.
 */
export type Path = readonly (string | number)[];

type Container = Record<string | number, unknown>;

/** The value at a path inside a country file. */
export function valueAt(file: unknown, path: Path): unknown {
  return path.reduce<unknown>((value, step) => (value as Container)[step], file);
}

/** A copy of a country file with the value at a path replaced or added. */
export function withValue(file: unknown, path: Path, value: unknown): unknown {
  const { copy, parent, last } = openAt(file, path);
  parent[last] = value;
  return copy;
}

/** A copy of a country file with the value at a path taken out. */
export function without(file: unknown, path: Path): unknown {
  const { copy, parent, last } = openAt(file, path);
  Reflect.deleteProperty(parent, last);
  return copy;
}

/** The faults a country file is rejected for. */
export function faultsOf(file: unknown): readonly string[] {
  try {
    loadCountry(file);
  } catch (error) {
    if (error instanceof CountryFileError) return error.faults;
    throw error;
  }
  throw new Error('The country file was accepted');
}

function openAt(file: unknown, path: Path) {
  const last = path.at(-1);
  if (last === undefined) throw new Error('A path needs at least one step');
  const copy: unknown = structuredClone(file);
  return { copy, parent: valueAt(copy, path.slice(0, -1)) as Container, last };
}
