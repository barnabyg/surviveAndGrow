import { describe, expect, it } from 'vitest';
import tavaraFile from '../../src/countries/tavara.json';
import { createGame, loadCountry, surveyStatuses } from '../../src/sim';
import testlandFile from '../countries/testland.json';
import { tavara, testland, testlandFormat7File, testlandFormat8File } from './countries';
import { faultsOf, valueAt, withValue, without } from './files';

/** Testland's one deposit, as its file writes it. */
const north = valueAt(testlandFile, ['deposits', 0]) as Record<string, unknown> & {
  mine: Record<string, unknown>;
  route: Record<string, unknown>;
};

/** Testland with the deposits given in place of its own. */
const hiding = (deposits: unknown) => withValue(testlandFile, ['deposits', 0], deposits);

describe('a country file in format 8', () => {
  it('hides deposits, each a mine and its route in a region, with a likelihood and a range', () => {
    expect(
      testland().deposits.map(({ id, regionId, likelihood, tonnes, mine, route }) => ({
        id,
        regionId,
        likelihood,
        tonnes,
        mine: [mine.id, mine.type, mine.regionId, mine.dependsOn],
        route: [route.id, route.type, route.regionId, route.dependsOn],
      })),
    ).toEqual([
      {
        id: 'north-ore',
        regionId: 'northfield',
        likelihood: 0.5,
        tonnes: { min: 200_000, max: 400_000 },
        mine: ['north-mine', 'mine', 'northfield', ['north-trunk-road']],
        route: ['north-trunk-road', 'trunkRoad', 'northfield', ['alpha-port']],
      },
    ]);
  });

  it('gives Tavara deposits of its own, in other regions and of other sizes', () => {
    expect(
      tavara().deposits.map(({ id, regionId, likelihood, tonnes }) => [
        id,
        regionId,
        likelihood,
        tonnes,
      ]),
    ).toEqual([
      ['westhaven-ore', 'salt-coast', 0.6, { min: 150_000, max: 350_000 }],
      ['dustwell-ore', 'dry-east', 0.35, { min: 400_000, max: 900_000 }],
    ]);
  });

  it('keeps a deposit’s sites off the map until a survey finds them', () => {
    for (const country of [tavara(), testland()]) {
      const hidden = country.deposits.flatMap(({ mine, route }) => [mine.id, route.id]);
      expect(country.sites.filter((site) => hidden.includes(site.id))).toEqual([]);
    }
  });

  it('is read from an older file as hiding nothing, so every region is barren', () => {
    const country = loadCountry(testlandFormat7File());
    expect(country.deposits).toEqual([]);
    const game = createGame(country, 1);
    expect(surveyStatuses(game, {}).map((status) => status.state)).toEqual(['barren', 'barren']);
  });

  it('cannot hide deposits in a format 7 file', () => {
    expect(faultsOf(withValue(testlandFormat8File(), ['formatVersion'], 7))).toEqual([
      'deposits needs country file format 8 or later.',
    ]);
  });

  it('is rejected when a deposit’s region, likelihood or range is not one the game allows', () => {
    expect(
      faultsOf(
        withValue(
          testlandFile,
          ['deposits'],
          [
            { ...north, region: 'atlantis', likelihood: 0 },
            {
              ...north,
              id: 'second',
              region: 'sandreach',
              likelihood: 1.5,
              tonnes: { min: 5000, max: 2_000_000 },
              mine: { ...north.mine, id: 'm2', name: 'M2' },
              route: { ...north.route, id: 'r2', name: 'R2' },
            },
            {
              ...north,
              id: 'third',
              region: 'sandreach',
              tonnes: { min: 300_000, max: 200_000 },
              mine: { ...north.mine, id: 'm3', name: 'M3', at: [700, 300], dependsOn: ['r3'] },
              route: { ...north.route, id: 'r3', name: 'R3' },
            },
            {
              ...north,
              id: 'north-ore',
              tonnes: 'lots',
              mine: { ...north.mine, id: 'm4', name: 'M4', dependsOn: ['r4'] },
              route: { ...north.route, id: 'r4', name: 'R4' },
            },
          ],
        ),
      ),
    ).toEqual([
      'deposits[0].region is "atlantis", which is not the id of a region.',
      'deposits[0].likelihood is 0, but must be a chance above 0 and at most 1.',
      'deposits[0].mine.region is "atlantis", which is not the id of a region.',
      'deposits[1].likelihood is 1.5, but must be a chance above 0 and at most 1.',
      'deposits[1].tonnes.min is 5000, but must be a whole number of 10,000 t from 10,000 t to 1,500,000 t.',
      'deposits[1].tonnes.max is 2000000, but must be a whole number of 10,000 t from 10,000 t to 1,500,000 t.',
      'deposits[1].mine.at is (300, 200), outside its region "sandreach".',
      'deposits[1].mine.dependsOn must include "r2", the deposit’s route: its ore leaves along it.',
      'deposits[2].region is "sandreach", which already holds deposits[1]: a region holds at most one deposit.',
      'deposits[2].tonnes runs from 300,000 t down to 200,000 t, but its min must be no more than its max.',
      'deposits[3].id repeats "north-ore", already used by deposits[0].',
      'deposits[3].tonnes must be an object with a min and a max, but is text.',
      'deposits[1].mine.dependsOn[0] is "north-trunk-road", a site of another deposit: a deposit’s site may depend only on the country’s sites and its own deposit’s.',
    ]);
  });

  it('is rejected when a deposit’s sites are not a mine and a trunk road, or clash with the country’s', () => {
    expect(
      faultsOf(
        hiding({
          ...north,
          mine: { ...north.mine, name: 'Alpha port', type: 'port', region: 'northfield' },
          route: { ...north.route, type: 'farmRoad', alternatives: ['sand-trunk-road'] },
        }),
      ),
    ).toEqual([
      'deposits[0].mine.region must be left out: a deposit’s mine stands in the deposit’s region.',
      'deposits[0].mine.name repeats "Alpha port", already used by sites[5].',
      'deposits[0].mine.type is "port", but a deposit’s mine must be a mine.',
      'deposits[0].route.type is "farmRoad", but a deposit’s route must be a trunk road.',
      'deposits[0].route.alternatives must be left out: a deposit’s site has no alternatives.',
    ]);
  });

  it('is rejected when the country’s sites depend on a hidden site, or a deposit’s chain leads nowhere', () => {
    const leaning = withValue(
      withValue(testlandFile, ['sites', 0, 'dependsOn'], ['north-mine']),
      ['deposits', 0, 'route', 'dependsOn'],
      [],
    );
    expect(faultsOf(leaning)).toEqual([
      'deposits[0].mine.dependsOn must lead, directly or through other sites, to a port or shallow port: a mine earns only through a chain that reaches one.',
      'sites[0].dependsOn[0] is "north-mine", a deposit’s site, which is hidden until a survey finds it.',
    ]);
    expect(faultsOf(without(tavaraFile, ['deposits', 1, 'route', 'route']))).toEqual([
      'deposits[1].route.route is missing.',
    ]);
  });
});
