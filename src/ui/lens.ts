import {
  approvalStatus,
  electionStatus,
  FOOD_STAGE_NAMES,
  FOOD_STAGES,
  formatIndex,
  formatPercent,
  livingStandards,
  type GameState,
  type Region,
  type RegionState,
  type Terrain,
  tierFrom,
} from '../sim';
import type { MapPalette } from './mapPalette';

/** What the map can be made to show. The country view is the map as it looks. */
export const LENSES = ['country', 'food', 'approval', 'living', 'infrastructure'] as const;
export type Lens = (typeof LENSES)[number];

export const LENS_NAMES: Readonly<Record<Lens, string>> = {
  country: 'Country',
  food: 'Food',
  approval: 'Approval',
  living: 'Living standards',
  infrastructure: 'Infrastructure',
};

/** One step of a lens's scale: a colour and what it stands for. */
export interface LensStep {
  readonly label: string;
  readonly fill: string;
}

/** A kind of land as the scale names it: `Highlands`. */
export function terrainName(terrain: Terrain): string {
  return terrain.charAt(0).toUpperCase() + terrain.slice(1);
}

/**
 * The scale of a lens, in the order it is read. The country view's colours are the kinds
 * of land the country has; the food lens has a step for each stage; the approval lens is
 * cut at the levels that matter to the player; the living-standards and infrastructure
 * lenses at fixed marks.
 */
export function lensScale(lens: Lens, game: GameState, palette: MapPalette): LensStep[] {
  switch (lens) {
    case 'country':
      return [...new Set(game.country.regions.map((region) => region.terrain))].map((terrain) => ({
        label: terrainName(terrain),
        fill: palette.terrain[terrain],
      }));
    case 'food':
      return FOOD_STAGES.map((stage) => ({
        label: FOOD_STAGE_NAMES[stage],
        fill: palette.foodLens[stage],
      }));
    case 'approval': {
      const cuts = approvalCuts(game);
      const percent = (permille: number) => formatPercent(permille, 0);
      return approvalFills(cuts.length + 1, palette).map((fill, index) => {
        const from = cuts[index - 1];
        const to = cuts[index];
        const label =
          from === undefined
            ? `Under ${percent(to ?? 0)}`
            : to === undefined
              ? `${percent(from)} and over`
              : `${percent(from)} to ${percent(to)}`;
        return { label, fill };
      });
    }
    case 'living':
      return palette.livingLens.map((fill, index) => {
        const from = LIVING_STANDARD_CUTS[index - 1];
        const to = LIVING_STANDARD_CUTS[index];
        const label =
          from === undefined
            ? `Under ${formatIndex(to ?? 0, 0)}`
            : to === undefined
              ? `${formatIndex(from, 0)} and over`
              : `${formatIndex(from, 0)} to ${formatIndex(to, 0)}`;
        return { label, fill };
      });
    case 'infrastructure':
      return palette.infrastructureLens.map((fill, index) => {
        const from = INFRASTRUCTURE_CUTS[index - 1];
        const to = INFRASTRUCTURE_CUTS[index];
        const label =
          from === undefined
            ? 'None'
            : index === 1
              ? `Under ${formatIndex(to ?? 0, 0)}`
              : to === undefined
                ? `${formatIndex(from, 0)} and over`
                : `${formatIndex(from, 0)} to ${formatIndex(to, 0)}`;
        return { label, fill };
      });
  }
}

/**
 * Where the infrastructure lens changes colour, in thousandths of access, lowest first.
 * Every region starts with none, which is a step of its own. One ordinary site in use adds
 * 20 to 30 and power 15, so building one moves a region up a step; the top step is reached
 * only by a region with most of what it can build in use.
 */
const INFRASTRUCTURE_CUTS: readonly number[] = [1, 200, 400, 600, 800];

/** A region's infrastructure access, in thousandths. */
export function infrastructureOf(game: GameState, regionId: string): number {
  return (
    livingStandards(game).find((standard) => standard.regionId === regionId)?.scores
      .infrastructure ?? 0
  );
}

/**
 * Where the living-standards lens changes colour, in thousandths, lowest first. The steps
 * are finer low down, where every country starts and where one region falling behind
 * another should show, and take in the lines of the prosperity tiers further up, read from
 * the balance data so that retuning the tiers moves the lens with them.
 */
const LIVING_STANDARD_CUTS: readonly number[] = (() => {
  const developing = tierFrom('developing');
  const industrialising = tierFrom('industrialising');
  return [
    // Seven tenths of the way to Developing, so that the poorest regions stand apart on the
    // opening map.
    Math.round((developing * 7) / 10),
    developing,
    // Halfway from Developing to Industrialising.
    Math.round((developing + industrialising) / 2),
    industrialising,
    tierFrom('prosperous'),
  ];
})();

/** The step of the living-standards lens a living standard falls in: 0 for the lowest. */
function livingStep(standard: number): number {
  return LIVING_STANDARD_CUTS.filter((cut) => standard >= cut).length;
}

/** A region's living standard, in thousandths. */
export function livingStandardOf(game: GameState, regionId: string): number {
  return livingStandards(game).find((standard) => standard.regionId === regionId)?.value ?? 0;
}

/** The colour a lens gives one region. */
export function lensFill(
  lens: Lens,
  game: GameState,
  region: Region,
  state: RegionState | undefined,
  palette: MapPalette,
): string {
  switch (lens) {
    case 'country':
      return palette.terrain[region.terrain];
    case 'food':
      return palette.foodLens[state?.foodStage ?? 'adequate'];
    case 'approval': {
      const cuts = approvalCuts(game);
      const step = cuts.filter((cut) => (state?.approval ?? 0) >= cut).length;
      return approvalFills(cuts.length + 1, palette)[step] ?? palette.terrain[region.terrain];
    }
    case 'living':
      return (
        palette.livingLens[livingStep(livingStandardOf(game, region.id))] ??
        palette.terrain[region.terrain]
      );
    case 'infrastructure': {
      const access = infrastructureOf(game, region.id);
      const step = INFRASTRUCTURE_CUTS.filter((cut) => access >= cut).length;
      return palette.infrastructureLens[step] ?? palette.terrain[region.terrain];
    }
  }
}

/**
 * Where the approval lens changes colour, in thousandths, lowest first: where protests and
 * strikes begin, the share that wins an election, and a clear margin above it.
 */
function approvalCuts(game: GameState): number[] {
  const { strikesBelow, protestsBelow } = approvalStatus(game);
  const { needed } = electionStatus(game);
  return [...new Set([protestsBelow, strikesBelow, needed, needed + 100])]
    .filter((cut) => cut > 0 && cut < 1000)
    .sort((a, b) => a - b);
}

/** The approval ramp spread over a number of steps, from the lowest approval to the highest. */
function approvalFills(steps: number, palette: MapPalette): string[] {
  const ramp = palette.approvalLens;
  return Array.from({ length: steps }, (_, index) => {
    const along = steps === 1 ? 0 : Math.round((index * (ramp.length - 1)) / (steps - 1));
    return ramp[along] ?? ramp[0] ?? '#ffffff';
  });
}

/**
 * Whether lettering over a colour should be light. Dark lettering is the rule; a colour
 * dark enough to swallow it gets light lettering in its place. The colour is written as
 * `#rrggbb`.
 */
export function needsLightInk(fill: string): boolean {
  const channel = (start: number) => {
    const value = Number.parseInt(fill.slice(start, start + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
  return luminance < 0.19;
}
