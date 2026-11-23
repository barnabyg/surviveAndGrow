import { describe, expect, it } from 'vitest';
import tavaraFile from '../../src/countries/tavara.json';
import {
  advanceQuarter,
  balance,
  createGame,
  knownTechnologies,
  leftIn,
  livingStandards,
  loadCountry,
  onTechnology,
  powerGain,
  regionPower,
  researchStatuses,
  saveGame,
  loadSave,
  siteEffects,
  siteStatus,
  siteTerms,
  startFault,
  technologyGains,
  technologyTerms,
  weatherHold,
  TECHNOLOGY_DEFINITIONS,
  WEATHER_HELD_BY,
  type Country,
  type GameState,
  type Site,
  type Technology,
} from '../../src/sim';
import testlandFile from '../countries/testland.json';
import { testlandFormat8File, withChances } from './countries';
import { faultsOf, withValue } from './files';
import { steward } from './playing';

/** A country with a treasury that pays for anything, and no drought, flood or dilemma. */
function rich(file: unknown): Country {
  const copy = structuredClone(file) as { start: { treasury: number } };
  copy.start.treasury = 5000;
  return withChances(copy, {});
}

/** The country's dam. */
function damOf(country: Country): Site {
  const dam = country.sites.find((site) => site.type === 'dam');
  if (dam === undefined) throw new Error('The country has no dam');
  return dam;
}

/** The power line in the dam's region that leads to it, or to the station it stands for. */
function lineTo(country: Country, dam: Site): Site {
  const line = country.sites.find(
    (site) =>
      site.type === 'powerLine' &&
      site.regionId === dam.regionId &&
      site.dependsOn.some((id) => id === dam.id || dam.alternatives.includes(id)),
  );
  if (line === undefined) throw new Error('No power line in the dam’s region leads to it');
  return line;
}

/** Every technology a technology needs, directly or through others. */
function prerequisitesOf(technology: Technology): Technology[] {
  return [
    ...new Set(
      TECHNOLOGY_DEFINITIONS[technology].prerequisites.flatMap((needed) => [
        ...prerequisitesOf(needed),
        needed,
      ]),
    ),
  ];
}

/** The same game with the technologies given known, as if researched before it. */
function knowing(game: GameState, technologies: readonly Technology[]): GameState {
  return {
    ...game,
    projects: [
      ...game.projects,
      ...technologies.map((technology) => ({
        target: onTechnology(technology),
        began: game.date,
        quartersPaid: technologyTerms(technology).researchQuarters,
        status: 'known' as const,
        opened: game.date,
      })),
    ],
  };
}

const regionIndex = (country: Country, site: Site) =>
  country.regions.findIndex((region) => region.id === site.regionId);

const scenarios = [
  { name: 'Tavara', file: tavaraFile },
  { name: 'Testland', file: testlandFile },
] as const;

describe('a country file that locks a site', () => {
  it('ships Tavara and Testland at format 9, each with a dam placed its own way', () => {
    const tavara = loadCountry(tavaraFile);
    const testland = loadCountry(testlandFile);
    expect([tavara.formatVersion, testland.formatVersion]).toEqual([9, 9]);

    const tavaraDam = damOf(tavara);
    const testlandDam = damOf(testland);
    expect(tavaraDam.regionId).not.toBe(testlandDam.regionId);
    // Tavara offers its dam as an alternative to its power station; Testland's stands alone.
    expect(tavaraDam.alternatives.map((id) => tavara.sites.find((s) => s.id === id)?.type)).toEqual(
      ['powerStation'],
    );
    expect(testlandDam.alternatives).toEqual([]);
    // Testland's line from the dam says in the file that it needs the dam's technology.
    expect(lineTo(testland, testlandDam).needs).toBe('hydropower');
  });

  it('reads the technology a site needs', () => {
    const file = withValue(tavaraFile, ['sites', 1, 'needs'], 'improvedIrrigation');
    expect(loadCountry(file).sites[1]?.needs).toBe('improvedIrrigation');
    expect(loadCountry(tavaraFile).sites[1]?.needs).toBeUndefined();
  });

  it('rejects a site that needs a technology the game does not have, naming it', () => {
    const file = withValue(tavaraFile, ['sites', 1, 'needs'], 'warpDrive');
    expect(faultsOf(file)).toEqual([
      `sites[1].needs is "warpDrive", which is not a technology this game has (${Object.keys(TECHNOLOGY_DEFINITIONS).join(', ')}).`,
    ]);
  });

  it('rejects a site’s needs, and a dam, in a file of an earlier format', () => {
    const needing = withValue(testlandFormat8File(), ['sites', 0, 'needs'], 'coldStorage');
    expect(faultsOf(needing)).toEqual(['sites[0].needs needs country file format 9 or later.']);

    const dam = withValue(testlandFormat8File(), ['sites', 7, 'type'], 'dam');
    expect(faultsOf(dam)).toEqual([
      'sites[7].type is "dam", which needs country file format 9 or later.',
    ]);
  });

  it('still loads a file of format 8 as it is, with nothing locked', () => {
    const country = loadCountry(testlandFormat8File());
    expect(country.formatVersion).toBe(8);
    const game = createGame(country, 1);
    expect(country.sites.every((site) => siteStatus(game, site.id).state === 'empty')).toBe(true);
  });

  it('leaves a locked site out of the upkeep the opening budget sets aside', () => {
    const country = loadCountry(testlandFile);
    const unlocked = loadCountry(
      (() => {
        const copy = structuredClone(testlandFile) as { sites: { type: string; needs?: string }[] };
        copy.sites = copy.sites.filter((site) => site.type !== 'dam' && site.needs === undefined);
        return copy;
      })(),
    );
    expect(country.start.budget.spending.upkeep).toBe(unlocked.start.budget.spending.upkeep);
  });
});

describe.each(scenarios)('in $name, a locked site', ({ file }) => {
  it('stands locked, naming its research, and cannot be started until it is known', () => {
    const country = rich(file);
    const dam = damOf(country);
    const game = createGame(country, 5);

    expect(siteStatus(game, dam.id)).toMatchObject({ state: 'locked', lockedBy: ['hydropower'] });
    const fault = startFault(game, [dam.id]);
    expect(fault).toBe(`${dam.name} is locked: Hydropower must be researched first.`);
    expect(() => advanceQuarter(game, { ...steward(game), startProjects: [dam.id] })).toThrow(
      fault ?? '',
    );

    const almost = knowing(game, prerequisitesOf('hydropower'));
    expect(siteStatus(almost, dam.id).state).toBe('locked');
    const known = knowing(almost, ['hydropower']);
    expect(siteStatus(known, dam.id)).toMatchObject({ state: 'empty', lockedBy: [] });
    expect(startFault(known, [dam.id])).toBeNull();
  });

  it('a site that names its own technology is locked by it as well as by its type’s', () => {
    const country = rich(withValue(file, ['sites', 1, 'needs'], 'coldStorage'));
    const site = country.sites[1];
    if (site === undefined) throw new Error('No second site');
    const game = createGame(country, 5);
    expect(siteStatus(game, site.id)).toMatchObject({ state: 'locked', lockedBy: ['coldStorage'] });
    expect(siteStatus(knowing(game, ['droughtResistantSeed', 'coldStorage']), site.id).state).toBe(
      'empty',
    );
  });

  it('the research tab says which sites the technology unlocks and what a dam does', () => {
    const country = rich(file);
    const dam = damOf(country);
    const game = knowing(createGame(country, 5), prerequisitesOf('hydropower'));
    const terms = technologyTerms('hydropower');
    expect(terms.unlocks).toEqual(['dam']);
    expect(terms.effect).toContain(`Unlocks dams. ${siteTerms('dam').effect}`);
    expect(technologyGains(game, 'hydropower').unlocks.map((site) => site.siteId)).toContain(
      dam.id,
    );
    expect(
      researchStatuses(game, null).find((each) => each.technology === 'hydropower')?.state,
    ).toBe('available');
  });
});

describe('a dam', () => {
  it('is large and slow to build, and steadies the harvest and makes power', () => {
    const { dam, powerStation, irrigation, port } = balance.sites;
    expect(dam.cost).toBeGreaterThan(Math.max(powerStation.cost, port.cost));
    expect(dam.buildQuarters).toBeGreaterThanOrEqual(port.buildQuarters);
    expect(dam.effects.harvestWeather).toBeLessThan(1000);
    expect(dam.effects.harvestWeather).toBeGreaterThan(irrigation.effects.harvestWeather);
    expect(siteTerms('dam').effect).toMatch(/harvest .*less\. Powers each region/);
  });

  it('is improved by grid efficiency, as every station is, but not by improved irrigation', () => {
    expect(powerGain(false, ['gridEfficiency'], 'dam')).toEqual(
      powerGain(false, ['gridEfficiency'], 'powerStation'),
    );
    expect(
      siteTerms('dam', undefined, ['improvedIrrigation', 'gridEfficiency']).improvedBy,
    ).toEqual(['gridEfficiency']);
  });
});

describe.each(scenarios)('in a whole game of $name, the dam', ({ file }) => {
  it('is researched, built, powers its region and steadies its harvest', () => {
    const country = rich(file);
    const dam = damOf(country);
    const line = lineTo(country, dam);
    const index = regionIndex(country, dam);
    const budget = {
      taxRatePercent: 25,
      spending: { ...country.start.budget.spending, upkeep: 40 },
    };
    const start = knowing(createGame(country, 5), prerequisitesOf('hydropower'));
    const heldBefore = leftIn(siteEffects(start), WEATHER_HELD_BY, index);

    let state = start;
    let researchedIn: number | null = null;
    for (let quarter = 0; quarter < 30; quarter += 1) {
      const decisions = steward(state, budget);
      const unlocked = siteStatus(state, dam.id).state === 'empty';
      if (unlocked && researchedIn === null) researchedIn = quarter;
      state = advanceQuarter(state, {
        ...decisions,
        ...(quarter === 0 ? { startResearch: 'hydropower' as const } : {}),
        ...(unlocked ? { startProjects: [dam.id, line.id] } : {}),
      }).state;
      if ([dam.id, line.id].every((id) => siteStatus(state, id).state === 'operating')) break;
    }

    expect(knownTechnologies(state.projects)).toContain('hydropower');
    expect(researchedIn).toBe(technologyTerms('hydropower').researchQuarters);
    expect(siteStatus(state, dam.id).state).toBe('operating');

    // Its region is powered from the dam, along the line, as from any station.
    const power = regionPower(state).find((each) => each.regionId === dam.regionId);
    expect(power).toMatchObject({
      stationId: dam.id,
      lineId: line.id,
      ...powerGain(false, knownTechnologies(state.projects), 'dam'),
    });
    const standard = livingStandards(state).find((each) => each.regionId === dam.regionId);
    expect(standard?.output.map((part) => part.label)).toEqual(
      expect.arrayContaining([`Power from ${dam.name}`, `Power from ${dam.name}: Grid efficiency`]),
    );

    // Its harvest is steadier: the weather moves it less than before, by the dam's share.
    const heldAfter = leftIn(siteEffects(state), WEATHER_HELD_BY, index);
    expect(heldAfter).toBeLessThan(heldBefore);
    expect(siteEffects(state).inRegion.harvestWeather[index]).toBe(
      balance.sites.dam.effects.harvestWeather,
    );
    const hold = weatherHold(state, dam.regionId);
    expect(hold.left).toBe(heldAfter);
    expect(hold.lines).toContainEqual(
      expect.objectContaining({
        label: dam.name,
        permille: balance.sites.dam.effects.harvestWeather,
      }),
    );

    // A game with the dam built saves and opens again as it was.
    const stored = JSON.parse(JSON.stringify(saveGame(state, null))) as unknown;
    expect(siteStatus(loadSave(stored).game, dam.id).state).toBe('operating');
  });
});
