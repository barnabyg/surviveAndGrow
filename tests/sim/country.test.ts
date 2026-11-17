import { describe, expect, it } from 'vitest';
import {
  advanceQuarter,
  createGame,
  loadCountry,
  MAP_FRAME,
  siteTerms,
  type GameState,
} from '../../src/sim';
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

  it('describes the sites of Tavara where something could be built', () => {
    const country = tavara();

    expect(country.sites.map((site) => [site.name, site.type, site.regionId, site.form])).toEqual([
      ['Farm road, Arden to Lowmere', 'farmRoad', 'lowmere-plains', 'route'],
      ['Lowmere irrigation', 'irrigation', 'lowmere-plains', 'place'],
      ['Lowmere grain store', 'grainStore', 'lowmere-plains', 'place'],
      ['Dustwell irrigation', 'irrigation', 'dry-east', 'place'],
      ['Southbank grain store', 'grainStore', 'south-delta', 'place'],
      ['Farm road, Westhaven to Arden', 'farmRoad', 'salt-coast', 'route'],
      ['Farm road, Korrgate to Arden', 'farmRoad', 'korr-highlands', 'route'],
    ]);
  });

  it('describes the sites of the second country the same way, one of each type', () => {
    const country = testland();

    expect(country.sites).toEqual([
      {
        id: 'north-irrigation',
        type: 'irrigation',
        name: 'North irrigation',
        regionId: 'northfield',
        dependsOn: [],
        form: 'place',
        at: [290, 330],
      },
      {
        id: 'alpha-store',
        type: 'grainStore',
        name: 'Alpha grain store',
        regionId: 'northfield',
        dependsOn: [],
        form: 'place',
        at: [440, 440],
      },
      {
        id: 'sand-road',
        type: 'farmRoad',
        name: 'Farm road, Alpha to Beta',
        regionId: 'sandreach',
        dependsOn: [],
        form: 'route',
        route: [
          [385, 385],
          [540, 400],
          [695, 418],
        ],
      },
    ]);
  });
});

describe('the types of site', () => {
  it('each have a cost, a build time and an effect', () => {
    expect(siteTerms('irrigation')).toEqual({
      cost: 120,
      buildQuarters: 3,
      effect: 'Weather and drought move its region’s harvest 50% less.',
    });
    expect(siteTerms('farmRoad')).toEqual({
      cost: 100,
      buildQuarters: 3,
      effect: '50% less of its region’s surplus is lost on the way to the national reserve.',
    });
    expect(siteTerms('grainStore')).toEqual({
      cost: 60,
      buildQuarters: 2,
      effect: '25% less of the national reserve spoils each quarter.',
    });
  });
});

describe('a country file in format 2', () => {
  const format2 = (dependsOn: Record<number, unknown>) => {
    // No dilemma arises, so a game in it can be played on without answering one.
    let file = withValue(withValue(testlandFile, ['formatVersion'], 2), ['dilemmaLikelihood'], {});
    for (const [index, value] of Object.entries(dependsOn)) {
      file = withValue(file, ['sites', Number(index), 'dependsOn'], value);
    }
    return file;
  };

  it('may say which other sites a site depends on', () => {
    const country = loadCountry(format2({ 2: ['north-irrigation', 'alpha-store'] }));

    expect(country.formatVersion).toBe(2);
    expect(country.sites.map((site) => site.dependsOn)).toEqual([
      [],
      [],
      ['north-irrigation', 'alpha-store'],
    ]);
  });

  it('plays the same game as the same country in format 1', () => {
    const decisions = (game: GameState) => ({ budget: game.budget });
    let one = createGame(testland(), 7);
    let two = createGame(loadCountry(format2({ 0: ['alpha-store'] })), 7);
    for (let quarter = 0; quarter < 8; quarter += 1) {
      one = advanceQuarter(one, decisions(one)).state;
      two = advanceQuarter(two, decisions(two)).state;
      expect(two.regions).toEqual(one.regions);
      expect(two.treasury).toBe(one.treasury);
    }
  });

  it('is rejected when a site depends on a site the country does not have', () => {
    expect(faultsOf(format2({ 0: ['atlantis'] }))).toEqual([
      'sites[0].dependsOn[0] is "atlantis", which is not the id of a site.',
    ]);
  });

  it('is rejected when a site depends on itself', () => {
    expect(faultsOf(format2({ 1: ['alpha-store'] }))).toEqual([
      'sites[1].dependsOn[0] is "alpha-store": a site cannot depend on itself.',
    ]);
  });

  it('is rejected when dependencies go round in a circle, naming the circle once', () => {
    expect(
      faultsOf(format2({ 0: ['alpha-store'], 1: ['sand-road'], 2: ['north-irrigation'] })),
    ).toEqual([
      'sites[0].dependsOn goes round in a circle: "north-irrigation" depends on "alpha-store" depends on "sand-road" depends on "north-irrigation".',
    ]);
  });

  it('is rejected when the dependencies are not a list of site ids, or repeat one', () => {
    expect(faultsOf(format2({ 0: 'alpha-store' }))).toEqual([
      'sites[0].dependsOn must be a list of site ids, but is text.',
    ]);
    expect(faultsOf(format2({ 0: ['alpha-store', 'alpha-store', 3] }))).toEqual([
      'sites[0].dependsOn[1] repeats "alpha-store".',
      'sites[0].dependsOn[2] must be the id of a site, but is a number.',
    ]);
  });

  it('cannot be given dependencies in a format 1 file', () => {
    const file = withValue(testlandFile, ['sites', 0, 'dependsOn'], ['alpha-store']);

    expect(faultsOf(file)).toEqual(['sites[0].dependsOn needs country file format 2 or later.']);
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
    const file = withValue(testlandFile, ['formatVersion'], 3);

    expect(faultsOf(file)).toEqual(['formatVersion is 3, but this game reads versions 1 to 2.']);
  });

  it('when its format version is not a number', () => {
    const file = withValue(testlandFile, ['formatVersion'], '1');

    expect(faultsOf(file)).toEqual(['formatVersion must be a number, but is text.']);
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

  it('when two regions share a name', () => {
    const file = withValue(testlandFile, ['regions', 1, 'name'], 'Northfield');

    expect(faultsOf(file)).toEqual([
      'regions[1].name repeats "Northfield", already used by regions[0].',
    ]);
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
    const empty = withValue(withValue(testlandFile, ['regions'], []), ['settlements'], []);
    const file = withValue(empty, ['sites'], []);

    expect(faultsOf(file)).toEqual(['regions must list at least one region.']);
  });

  it('when it lists no sites at all', () => {
    const file = without(testlandFile, ['sites']);

    expect(faultsOf(file)).toEqual(['sites is missing.']);
  });

  it('when a site is of a type the game does not know', () => {
    const file = withValue(testlandFile, ['sites', 0, 'type'], 'airport');

    expect(faultsOf(file)).toEqual([
      'sites[0].type is "airport", which is not one of: irrigation, farmRoad, grainStore.',
    ]);
  });

  it('when a site names a region that does not exist', () => {
    const file = withValue(testlandFile, ['sites', 1, 'region'], 'atlantis');

    expect(faultsOf(file)).toEqual([
      'sites[1].region is "atlantis", which is not the id of a region.',
    ]);
  });

  it('when two sites share an identifier', () => {
    const file = withValue(testlandFile, ['sites', 1, 'id'], 'north-irrigation');

    expect(faultsOf(file)).toEqual([
      'sites[1].id repeats "north-irrigation", already used by sites[0].',
    ]);
  });

  it('when two sites share a name', () => {
    const file = withValue(testlandFile, ['sites', 1, 'name'], 'North irrigation');

    expect(faultsOf(file)).toEqual([
      'sites[1].name repeats "North irrigation", already used by sites[0].',
    ]);
  });

  it('when a site that stands in one place is outside its region', () => {
    const file = withValue(testlandFile, ['sites', 0, 'at'], [700, 300]);

    expect(faultsOf(file)).toEqual(['sites[0].at is (700, 300), outside its region "northfield".']);
  });

  it('when a site that stands in one place is given a route', () => {
    const route = valueAt(testlandFile, ['sites', 2, 'route']);
    const file = withValue(without(testlandFile, ['sites', 1, 'at']), ['sites', 1, 'route'], route);

    expect(faultsOf(file)).toEqual([
      'sites[1].route must be left out: a grain store stands in one place, given by "at".',
      'sites[1].at is missing.',
    ]);
  });

  it('when a site that runs along a route is given a position', () => {
    const file = withValue(
      without(testlandFile, ['sites', 2, 'route']),
      ['sites', 2, 'at'],
      [600, 400],
    );

    expect(faultsOf(file)).toEqual([
      'sites[2].at must be left out: a farm road runs along a line, given by "route".',
      'sites[2].route is missing.',
    ]);
  });

  it('when a route is too short to lead anywhere', () => {
    const file = withValue(testlandFile, ['sites', 2, 'route'], [[600, 400]]);

    expect(faultsOf(file)).toEqual(['sites[2].route needs at least 2 points, but has 1.']);
  });

  it('when a route leaves the country', () => {
    const file = withValue(testlandFile, ['sites', 2, 'route', 1], [540, 100]);

    expect(faultsOf(file)).toEqual(['sites[2].route[1] is (540, 100), outside the country.']);
  });

  it('when a route neither starts nor ends in its region', () => {
    const file = withValue(testlandFile, ['sites', 2, 'route', 2], [500, 418]);

    expect(faultsOf(file)).toEqual(['sites[2].route must start or end in its region "sandreach".']);
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
