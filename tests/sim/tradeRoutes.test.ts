import { describe, expect, it } from 'vitest';
import {
  contains,
  createGame,
  tradeRoutes,
  type Country,
  type GameState,
  type Point,
  type ProjectStatus,
} from '../../src/sim';
import { bothCountries, tavara, testland } from './countries';

/** Whether a point lies on land of the country's own: in one of its regions. */
const onOwnLand = (country: Country, point: Point) =>
  country.regions.some((region) => contains(region.shape, point));

/** The game's border crossings as the map draws them. */
const crossings = (game: GameState) =>
  tradeRoutes(game).filter((route) => route.kind === 'crossing');

/** The game with the sites given standing as given, built long ago. */
function withSites(game: GameState, sites: Record<string, ProjectStatus>): GameState {
  return {
    ...game,
    projects: Object.entries(sites).map(([siteId, status]) => ({
      siteId,
      began: { year: 1, quarter: 1 },
      quartersPaid: 8,
      status,
      opened: status === 'operating' || status === 'decaying' ? { year: 1, quarter: 1 } : null,
    })),
  };
}

describe('border crossings on the map', () => {
  it('stand on Testland’s border with Elsewhere, at the point nearest its name, and lead into it', () => {
    const [gate, ...others] = crossings(createGame(testland(), 1));

    expect(others).toEqual([]);
    expect(gate).toMatchObject({ id: 'elsewhere-gate', kind: 'crossing', capacity: 15_000 });
    // Elsewhere's name is written at (540, 60); the nearest point of Testland's border to it
    // is where its two regions meet the top edge.
    expect(gate?.path[0]).toEqual([540, 150]);
    const [x, y] = gate?.path.at(-1) ?? [0, 0];
    expect(x).toBe(540);
    expect(y).toBeLessThan(150);
  });

  it.each(bothCountries)(
    'stand on %s’s border and lead out into the neighbour each leads to',
    (_, country) => {
      const game = createGame(country(), 1);
      const routes = crossings(game);

      expect(routes.map((route) => route.name)).toEqual(
        game.country.crossings.map((crossing) => crossing.name),
      );
      for (const crossing of game.country.crossings) {
        const route = routes.find((candidate) => candidate.id === crossing.id);
        const neighbour = game.country.map.neighbours.find(
          (candidate) => candidate.id === crossing.neighbourId,
        );
        const nowhere: Point = [0, 0];
        const [start, end] = [route?.path[0] ?? nowhere, route?.path.at(-1) ?? nowhere];
        expect(onOwnLand(game.country, start)).toBe(true);
        expect(onOwnLand(game.country, end)).toBe(false);
        expect(contains(neighbour?.shape ?? [], end)).toBe(true);
      }
    },
  );
});

describe('shipping lanes on the map', () => {
  it.each([
    // Testland has no sea: the lane leaves Alpha port by the shortest way off its own land.
    ['Testland', testland, 'alpha-port', [250, 500], [250, 720]],
    // Saltmouth port, on Tavara's west coast, looks out over open sea to the west.
    ['Tavara', tavara, 'saltmouth-port', [140, 222], [0, 222]],
  ] as const)(
    'run in %s from a port in use to the edge of the map, over as little land as can be',
    (_, country, portId, from, to) => {
      const game = createGame(country(), 1);
      const lane = tradeRoutes(withSites(game, { [portId]: 'operating' })).find(
        (route) => route.id === portId,
      );
      expect(lane).toMatchObject({ kind: 'port', state: 'open', capacity: 900_000 });
      expect(lane?.path).toEqual([from, to]);
    },
  );
});

describe('what the routes carry this quarter', () => {
  const chain = { 'korr-mine': 'operating', 'korr-trunk-road': 'operating' } as const;
  const grain = (tonnes: number) => ({ good: 'grain', direction: 'import', tonnes }) as const;

  it('sends the mine’s ore by its port, and grain over the border crossings first', () => {
    const game = withSites(createGame(tavara(), 1), { ...chain, 'saltmouth-port': 'operating' });

    const carried = tradeRoutes(game, [grain(70_000)]).map((route) => [
      route.name,
      route.ore,
      route.grain,
      route.carried,
      route.capacity,
    ]);

    expect(carried).toEqual([
      ['Korr Pass', 0, 50_000, 50_000, 50_000],
      ['Selama bridge', 0, 20_000, 20_000, 40_000],
      ['Saltmouth port', 600_000, 0, 600_000, 900_000],
    ]);
  });

  it('sends grain by sea once the border crossings are full', () => {
    const game = withSites(createGame(tavara(), 1), { ...chain, 'saltmouth-port': 'operating' });

    const port = tradeRoutes(game, [grain(150_000)]).find((route) => route.kind === 'port');

    expect(port).toMatchObject({ ore: 600_000, grain: 60_000, carried: 660_000 });
  });
});

describe('missing and weak trade links', () => {
  it('are the ports not yet in use, and a port that decays', () => {
    const game = createGame(tavara(), 1);

    // Before anything is built, both of Saltmouth's ports are missing links, and say what
    // each would carry once in use.
    expect(
      tradeRoutes(game)
        .filter((route) => route.kind === 'port')
        .map((route) => [route.name, route.state, route.capacity, route.carried]),
    ).toEqual([
      ['Saltmouth port', 'missing', 900_000, 0],
      ['Saltmouth quay', 'missing', 360_000, 0],
    ]);

    // Building the quay closes the port for good, so it is no longer missing.
    const quay = withSites(game, { 'saltmouth-quay': 'building' });
    expect(
      tradeRoutes(quay)
        .filter((route) => route.kind === 'port')
        .map((route) => [route.name, route.state]),
    ).toEqual([['Saltmouth quay', 'missing']]);

    const decaying = withSites(game, { 'saltmouth-port': 'decaying' });
    expect(tradeRoutes(decaying).find((route) => route.kind === 'port')).toMatchObject({
      name: 'Saltmouth port',
      state: 'weak',
      capacity: 450_000,
    });
  });
});
