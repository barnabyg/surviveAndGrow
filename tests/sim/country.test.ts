import { describe, expect, it } from 'vitest';
import { loadCountry, MAP_FRAME } from '../../src/sim';
import testlandFile from '../countries/testland.json';
import { tavara, testland } from './countries';
import { faultsOf, valueAt, withValue, without } from './files';

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
    const file = without(testlandFile, ['regions', 0, 'name']);

    expect(faultsOf(file)).toEqual(['regions[0].name is missing.']);
  });

  it('when a field is the wrong kind of value', () => {
    const file = withValue(testlandFile, ['name'], 42);

    expect(faultsOf(file)).toEqual(['name must be text, but is a number.']);
  });

  it('when it is written for another version of the format', () => {
    const file = withValue(testlandFile, ['formatVersion'], 2);

    expect(faultsOf(file)).toEqual(['formatVersion is 2, but this game reads version 1.']);
  });

  it('when a terrain is not one the game knows', () => {
    const file = withValue(testlandFile, ['regions', 1, 'terrain'], 'swamp');

    expect(faultsOf(file)).toEqual([
      'regions[1].terrain is "swamp", which is not one of: plains, highlands, coast, arid, delta, valley.',
    ]);
  });

  it('when two regions share an identifier', () => {
    const file = withValue(testlandFile, ['regions', 1, 'id'], 'northfield');

    // The settlement that named the overwritten identifier is reported as well.
    expect(faultsOf(file)).toContain(
      'regions[1].id repeats "northfield", already used by regions[0].',
    );
  });

  it('when two settlements share an identifier', () => {
    const file = withValue(testlandFile, ['settlements', 1, 'id'], 'alpha');

    expect(faultsOf(file)).toEqual([
      'settlements[1].id repeats "alpha", already used by settlements[0].',
    ]);
  });

  it('when a shape reaches outside the map frame', () => {
    const file = withValue(testlandFile, ['regions', 0, 'shape', 2], [1200, 50]);

    expect(faultsOf(file)).toEqual([
      'regions[0].shape[2] is (1200, 50), outside the 1080 by 720 map frame.',
    ]);
  });

  it('when a settlement sits outside the map frame', () => {
    const file = withValue(testlandFile, ['settlements', 0, 'at'], [300, -1]);

    expect(faultsOf(file)).toEqual([
      'settlements[0].at is (300, -1), outside the 1080 by 720 map frame.',
    ]);
  });

  it('when a shape has too few points to enclose anything', () => {
    const corners = valueAt(testlandFile, ['regions', 0, 'shape']) as unknown[];
    const file = withValue(testlandFile, ['regions', 0, 'shape'], corners.slice(0, 2));

    expect(faultsOf(file)).toEqual(['regions[0].shape needs at least 3 points, but has 2.']);
  });

  it('when a point is not a pair of coordinates', () => {
    const file = withValue(testlandFile, ['map', 'neighbours', 0, 'shape', 1], [10]);

    expect(faultsOf(file)).toEqual([
      'map.neighbours[0].shape[1] must be a pair of numbers [x, y].',
    ]);
  });

  it('when a settlement names a region that does not exist', () => {
    const file = withValue(testlandFile, ['settlements', 0, 'region'], 'atlantis');

    expect(faultsOf(file)).toEqual([
      'settlements[0].region is "atlantis", which is not the id of a region.',
    ]);
  });

  it('when a terrain decoration is of a kind the game does not know', () => {
    const file = withValue(testlandFile, ['map', 'decorations', 0, 'kind'], 'volcano');

    expect(faultsOf(file)).toEqual([
      'map.decorations[0].kind is "volcano", which is not one of: mountain, dune, field.',
    ]);
  });

  it('when it has no regions', () => {
    const file = withValue(withValue(testlandFile, ['regions'], []), ['settlements'], []);

    expect(faultsOf(file)).toEqual(['regions must list at least one region.']);
  });

  it('and every fault is reported at once', () => {
    const file = withValue(
      withValue(without(testlandFile, ['name']), ['regions', 0, 'terrain'], 'swamp'),
      ['start', 'treasury'],
      -5,
    );

    expect(faultsOf(file)).toHaveLength(3);
  });

  it('with all the faults in the message of the error', () => {
    const file = without(testlandFile, ['name']);

    expect(() => loadCountry(file)).toThrow('The country file cannot be used. name is missing.');
  });
});
