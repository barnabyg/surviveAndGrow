import type { FoodStage, Terrain } from '../sim';

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
  /** The hatching laid over a region with strikes or protests on the approval lens. */
  readonly unrestMark: string;
  /**
   * Lettering over a lens colour: dark as a rule, and light over a colour too dark for
   * that. Every step of both lenses is light or dark enough for one of them to stand out
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
  mountain: '#b9b19c',
  mountainLine: '#6b634e',
  dune: '#a88a58',
  field: '#9c8c5e',
  foodLens: { adequate: '#ece3c8', tight: '#e2b565', shortage: '#c96f35', famine: '#74291c' },
  approvalLens: ['#f4f0e7', '#bcd0db', '#8fb3c8', '#5b8fad', '#28536f'],
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
