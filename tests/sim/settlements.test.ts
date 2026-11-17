import { describe, expect, it } from 'vitest';
import { createGame, livingStandards, settlementLook, settlementLooks } from '../../src/sim';
import { bothCountries, tavara } from './countries';

describe('how a settlement looks at a living standard', () => {
  it('shows a bare few unlit buildings where living standards are at nothing', () => {
    expect(settlementLook('town', 0)).toEqual({ buildings: 7, lit: 0 });
    expect(settlementLook('village', 0)).toEqual({ buildings: 3, lit: 0 });
  });

  it('is built up and lit throughout once the region reaches the prosperity target', () => {
    expect(settlementLook('town', 420)).toEqual({ buildings: 10, lit: 10 });
    expect(settlementLook('village', 420)).toEqual({ buildings: 5, lit: 5 });
    expect(settlementLook('town', 1000)).toEqual({ buildings: 16, lit: 16 });
  });

  it('grows denser and lights more of its buildings as living standards rise', () => {
    expect(settlementLook('town', 230)).toEqual({ buildings: 9, lit: 4 });
    expect(settlementLook('town', 350)).toEqual({ buildings: 10, lit: 8 });
    for (const size of ['town', 'village'] as const) {
      for (let standard = 0; standard < 1000; standard += 10) {
        const lower = settlementLook(size, standard);
        const higher = settlementLook(size, standard + 10);
        expect(higher.buildings).toBeGreaterThanOrEqual(lower.buildings);
        expect(higher.lit).toBeGreaterThanOrEqual(lower.lit);
        expect(higher.lit).toBeLessThanOrEqual(higher.buildings);
      }
    }
  });

  it('keeps a town larger than a village at the same living standard', () => {
    for (let standard = 0; standard <= 1000; standard += 50) {
      expect(settlementLook('town', standard).buildings).toBeGreaterThan(
        settlementLook('village', standard).buildings,
      );
    }
  });
});

describe.each(bothCountries)('the settlements of %s', (_name, country) => {
  it('each follow their own region’s living standard', () => {
    const game = createGame(country(), 1);

    const looks = settlementLooks(game);

    expect(looks.map((look) => look.settlementId)).toEqual(
      game.country.settlements.map((settlement) => settlement.id),
    );
    const standards = livingStandards(game);
    for (const [index, settlement] of game.country.settlements.entries()) {
      const standard = standards.find((entry) => entry.regionId === settlement.regionId);
      const { buildings, lit } = settlementLook(settlement.size, standard?.value ?? 0);
      expect(looks[index]).toEqual({ settlementId: settlement.id, buildings, lit });
    }
  });
});

describe('a falling living standard', () => {
  it('puts lights out in the region’s settlements and nowhere else', () => {
    const game = createGame(tavara(), 1);
    const famished = {
      ...game,
      regions: game.regions.map((region) =>
        region.id === 'dry-east' ? { ...region, foodStage: 'famine' as const } : region,
      ),
    };

    const before = settlementLooks(game);
    const after = settlementLooks(famished);

    const dustwell = (looks: typeof before) =>
      looks.find((look) => look.settlementId === 'dustwell');
    expect(dustwell(before)?.lit).toBe(1);
    expect(dustwell(after)?.lit).toBe(0);
    expect(after.filter((look) => look.settlementId !== 'dustwell')).toEqual(
      before.filter((look) => look.settlementId !== 'dustwell'),
    );
  });
});
