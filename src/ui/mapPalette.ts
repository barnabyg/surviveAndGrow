import type { Terrain } from '../sim';

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
};
