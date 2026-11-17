import type { FoodStage, Terrain, Tier } from '../sim';

/**
 * The colours of the map at one prosperity tier. Passing a tier changes the palette, never
 * the geometry, so the map's look costs no extra artwork as countries are added.
 */
export interface MapPalette {
  readonly sea: string;
  readonly seaLabel: string;
  readonly coastGlow: string;
  readonly neighbour: string;
  readonly neighbourBorder: string;
  readonly neighbourLabel: string;
  readonly terrain: Readonly<Record<Terrain, string>>;
  readonly outline: string;
  readonly regionBorder: string;
  readonly regionLabel: string;
  readonly river: string;
  readonly settlement: string;
  readonly settlementLabel: string;
  /** A lit building, and the glow laid behind a settlement with lights on. */
  readonly settlementLit: string;
  readonly settlementGlow: string;
  readonly mountain: string;
  readonly mountainLine: string;
  readonly dune: string;
  readonly field: string;
  /**
   * The food lens: a colour for each stage. The steps darken as hunger deepens, so they
   * can be told apart by lightness and not by hue alone.
   */
  readonly foodLens: Readonly<Record<FoodStage, string>>;
  /** The approval lens, from the lowest approval to the highest, each step darker. */
  readonly approvalLens: readonly string[];
  /**
   * The living-standards lens, from the lowest living standard to the highest, each step
   * darker, so that the steps can be told apart by lightness and not by hue alone.
   */
  readonly livingLens: readonly string[];
  /** The hatching laid over a region with strikes or protests on the approval lens. */
  readonly unrestMark: string;
  /**
   * Lettering over a lens colour: dark as a rule, and light over a colour too dark for
   * that. Every step of every lens is light or dark enough for one of them to stand out
   * at 4.5 to 1 or better.
   */
  readonly lensLabelDark: string;
  readonly lensLabelLight: string;
  /** The lines between regions under a lens, which must show against every step. */
  readonly lensBorder: string;
  /** The wash and the hatched edge laid over a region that an event has struck. */
  readonly eventTint: string;
  readonly eventLine: string;
  /** The round marker of a site, and the dark line of its edge, its symbol and its route. */
  readonly site: string;
  readonly siteLine: string;
  /** A built road: a pale line in a dark casing. */
  readonly road: string;
  readonly roadCasing: string;
  /** The part of a route still to be built once work is planned or under way. */
  readonly construction: string;
  /** The outline of the region or site the player has picked out. */
  readonly selection: string;
  /** The dark tags that carry warnings on the map. */
  readonly tagBackground: string;
  readonly tagText: string;
}

/** Tier 1, Subsistence: a flat, sun-bleached survey map. Neighbours and sea are muted. */
export const tierOnePalette: MapPalette = {
  sea: '#27444f',
  seaLabel: '#7fa6b1',
  coastGlow: '#9ccbd6',
  neighbour: '#353a3b',
  neighbourBorder: '#4a5152',
  neighbourLabel: '#8a9394',
  terrain: {
    plains: '#c2b283',
    highlands: '#a39a84',
    coast: '#b3ad86',
    arid: '#cfae7c',
    delta: '#a9ad84',
    valley: '#cdbf97',
  },
  outline: '#2f2a1e',
  regionBorder: '#7a6d4f',
  regionLabel: '#3a3426',
  river: '#4f7f8f',
  settlement: '#54483a',
  settlementLabel: '#2b2619',
  settlementLit: '#f3cf72',
  settlementGlow: '#f6c95a',
  mountain: '#b9b19c',
  mountainLine: '#6b634e',
  dune: '#a88a58',
  field: '#9c8c5e',
  foodLens: { adequate: '#ece3c8', tight: '#e2b565', shortage: '#c96f35', famine: '#74291c' },
  approvalLens: ['#f4f0e7', '#bcd0db', '#8fb3c8', '#5b8fad', '#28536f'],
  livingLens: ['#f2ecdc', '#dfdcae', '#b8cc8a', '#7aa86e', '#3a7350', '#1b4a39'],
  unrestMark: '#7a2716',
  lensLabelDark: '#14181d',
  lensLabelLight: '#fff6e6',
  lensBorder: '#14181d',
  eventTint: '#e0762f',
  eventLine: '#c9581c',
  site: '#f4ecd6',
  siteLine: '#2b2a22',
  road: '#f1e6c6',
  roadCasing: '#3a3226',
  construction: '#b86a00',
  selection: '#f2b33d',
  tagBackground: '#2a1a12',
  tagText: '#ffb58a',
};

/**
 * Tier 2, Developing: the land greener and warmer, the sea a deeper blue, settlements built
 * up in brick and lit. The lens colours, warnings and selection stay as they are, so what the
 * player reads off the map means the same at every tier.
 */
export const tierTwoPalette: MapPalette = {
  ...tierOnePalette,
  sea: '#21495a',
  seaLabel: '#86b2c0',
  coastGlow: '#a6d6e0',
  terrain: {
    plains: '#b9b479',
    highlands: '#9c9f82',
    coast: '#aab186',
    arid: '#cdb07a',
    delta: '#9db27e',
    valley: '#c3c28f',
  },
  regionBorder: '#6f6a48',
  river: '#4a87a0',
  settlement: '#6b4a33',
  mountain: '#b4b29d',
  field: '#8f9454',
};

/** Tier 3, Industrialising: a richer, darker land under a clear sea, towns in red brick. */
export const tierThreePalette: MapPalette = {
  ...tierTwoPalette,
  sea: '#1b4d66',
  seaLabel: '#8dbcd0',
  coastGlow: '#b0e0ea',
  terrain: {
    plains: '#a9b06e',
    highlands: '#98a185',
    coast: '#9fb087',
    arid: '#c9b07a',
    delta: '#8faf78',
    valley: '#b5c086',
  },
  regionBorder: '#5f6440',
  river: '#438fb0',
  settlement: '#7d3f2a',
  settlementLit: '#ffd97a',
  settlementGlow: '#ffd060',
  field: '#7f8f4a',
};

/** Tier 4, Prosperous: a lush land and a bright sea, the towns at their best. */
export const tierFourPalette: MapPalette = {
  ...tierThreePalette,
  sea: '#155273',
  seaLabel: '#95c6dc',
  coastGlow: '#bce9f2',
  terrain: {
    plains: '#9cae68',
    highlands: '#93a387',
    coast: '#94b08a',
    arid: '#c4b17e',
    delta: '#82ad74',
    valley: '#a8bd80',
  },
  regionBorder: '#55603f',
  river: '#3d97c0',
  settlement: '#8a3a26',
  settlementLit: '#ffe38f',
  settlementGlow: '#ffd96e',
  field: '#73904a',
};

/** The map's palette at each tier. Passing a tier changes the palette, never the geometry. */
export const TIER_PALETTES: Readonly<Record<Tier, MapPalette>> = {
  subsistence: tierOnePalette,
  developing: tierTwoPalette,
  industrialising: tierThreePalette,
  prosperous: tierFourPalette,
};
