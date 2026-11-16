import { describe, expect, it } from 'vitest';
import { CountryFileError, loadCountry, MAP_FRAME } from '../../src/sim';
import testlandFile from '../countries/testland.json';
import { tavara, testland } from './countries';

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call --
   These tests break a country file on purpose, in ways the types would not allow. */
type LooseFile = any;

/** A valid country file with one thing changed. */
function fileWith(change: (file: LooseFile) => void): unknown {
  const file: LooseFile = structuredClone(testlandFile);
  change(file);
  return file;
}

function faultsOf(file: unknown): readonly string[] {
  try {
    loadCountry(file);
  } catch (error) {
    if (error instanceof CountryFileError) return error.faults;
    throw error;
  }
  throw new Error('The country file was accepted');
}

describe('a valid country file', () => {
  it('describes the regions, settlements, neighbours and seas of Tavara', () => {
    const country = tavara();

    expect(country.formatVersion).toBe(1);
    expect(country.regions.map((region) => [region.name, region.terrain])).toEqual([
      ['Korr Highlands', 'highlands'],
      ['Salt Coast', 'coast'],
      ['Lowmere Plains', 'plains'],
      ['The Dry East', 'arid'],
      ['South Delta', 'delta'],
      ['Arden Vale', 'valley'],
    ]);
    expect(country.settlements.map((settlement) => settlement.name)).toContain('Westhaven');
    expect(country.map.neighbours.map((neighbour) => neighbour.name)).toEqual(['Voskar', 'Selama']);
    expect(country.map.seas.map((sea) => sea.name)).toEqual(['Southern Sea']);
  });

  it('describes a second, quite different country the same way', () => {
    const country = testland();

    expect(country.regions.map((region) => region.terrain)).toEqual(['plains', 'arid']);
    expect(country.map.seas).toEqual([]);
  });

  it('uses a map frame with a 3:2 aspect ratio', () => {
    expect(MAP_FRAME.width / MAP_FRAME.height).toBe(3 / 2);
  });
});

describe('an invalid country file is rejected with a message naming the fault', () => {
  it('when it is not an object', () => {
    expect(faultsOf('tavara')).toEqual(['The file must be an object, but is text.']);
  });

  it('when a field is missing', () => {
    const file = fileWith((f) => delete f.regions[0].name);

    expect(faultsOf(file)).toEqual(['regions[0].name is missing.']);
  });

  it('when a field is the wrong kind of value', () => {
    const file = fileWith((f) => {
      f.name = 42;
    });

    expect(faultsOf(file)).toEqual(['name must be text, but is a number.']);
  });

  it('when it is written for another version of the format', () => {
    const file = fileWith((f) => {
      f.formatVersion = 2;
    });

    expect(faultsOf(file)).toEqual(['formatVersion is 2, but this game reads version 1.']);
  });

  it('when a terrain is not one the game knows', () => {
    const file = fileWith((f) => {
      f.regions[1].terrain = 'swamp';
    });

    expect(faultsOf(file)).toEqual([
      'regions[1].terrain is "swamp", which is not one of: plains, highlands, coast, arid, delta, valley.',
    ]);
  });

  it('when two regions share an identifier', () => {
    const file = fileWith((f) => {
      f.regions[1].id = f.regions[0].id;
    });

    // The settlement that named the overwritten identifier is reported as well.
    expect(faultsOf(file)).toContain(
      'regions[1].id repeats "northfield", already used by regions[0].',
    );
  });

  it('when two settlements share an identifier', () => {
    const file = fileWith((f) => {
      f.settlements[1].id = f.settlements[0].id;
    });

    expect(faultsOf(file)).toEqual([
      'settlements[1].id repeats "alpha", already used by settlements[0].',
    ]);
  });

  it('when a shape reaches outside the map frame', () => {
    const file = fileWith((f) => {
      f.regions[0].shape[2] = [1200, 50];
    });

    expect(faultsOf(file)).toEqual([
      'regions[0].shape[2] is (1200, 50), outside the 1080 by 720 map frame.',
    ]);
  });

  it('when a settlement sits outside the map frame', () => {
    const file = fileWith((f) => {
      f.settlements[0].at = [300, -1];
    });

    expect(faultsOf(file)).toEqual([
      'settlements[0].at is (300, -1), outside the 1080 by 720 map frame.',
    ]);
  });

  it('when a shape has too few points to enclose anything', () => {
    const file = fileWith((f) => {
      f.regions[0].shape = f.regions[0].shape.slice(0, 2);
    });

    expect(faultsOf(file)).toEqual(['regions[0].shape needs at least 3 points, but has 2.']);
  });

  it('when a point is not a pair of coordinates', () => {
    const file = fileWith((f) => {
      f.map.neighbours[0].shape[1] = [10];
    });

    expect(faultsOf(file)).toEqual([
      'map.neighbours[0].shape[1] must be a pair of numbers [x, y].',
    ]);
  });

  it('when a settlement names a region that does not exist', () => {
    const file = fileWith((f) => {
      f.settlements[0].region = 'atlantis';
    });

    expect(faultsOf(file)).toEqual([
      'settlements[0].region is "atlantis", which is not the id of a region.',
    ]);
  });

  it('when a terrain decoration is of a kind the game does not know', () => {
    const file = fileWith((f) => {
      f.map.decorations[0].kind = 'volcano';
    });

    expect(faultsOf(file)).toEqual([
      'map.decorations[0].kind is "volcano", which is not one of: mountain, dune, field.',
    ]);
  });

  it('when it has no regions', () => {
    const file = fileWith((f) => {
      f.regions = [];
      f.settlements = [];
    });

    expect(faultsOf(file)).toEqual(['regions must list at least one region.']);
  });

  it('and every fault is reported at once', () => {
    const file = fileWith((f) => {
      delete f.name;
      f.regions[0].terrain = 'swamp';
      f.start.treasury = -5;
    });

    expect(faultsOf(file)).toHaveLength(3);
  });

  it('with all the faults in the message of the error', () => {
    const file = fileWith((f) => delete f.name);

    expect(() => loadCountry(file)).toThrow('The country file cannot be used. name is missing.');
  });
});
