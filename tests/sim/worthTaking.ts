// Countries rich enough to be worth taking, for the tests about neighbours and their border
// incidents: a country as it ships is at Subsistence for years, where no neighbour stirs.
import tavaraFile from '../../src/countries/tavara.json';
import { loadCountry, type Country } from '../../src/sim';
import testlandFile from '../countries/testland.json';
import { withChances } from './countries';

/** The two country files as written, by the names the scenarios run under. */
export const FILES = { Tavara: tavaraFile, Testland: testlandFile } as const;
export const fileOf = (name: string): unknown => FILES[name as keyof typeof FILES];

/**
 * How many times over each country's regions produce in the game that grows rich: enough that
 * health and education, built up from nothing, carry it from Subsistence through the tiers in
 * a few years.
 */
const RICHES = { Tavara: 10, Testland: 4 } as const;

export interface RichFile {
  regions: { output: number }[];
  start: { treasury: number; budget: { spending: { health: number; education: number } } };
}

/** A copy of a country file whose regions produce many times over, with a full treasury. */
export function enriched(file: unknown, name: string): RichFile {
  const copy = structuredClone(file) as RichFile;
  for (const region of copy.regions) region.output *= RICHES[name as keyof typeof RICHES];
  copy.start.treasury = 20_000;
  return copy;
}

/**
 * A country already worth taking: its regions produce many times over, its treasury is full,
 * and it spends on health and education what it ships with, which starts it in Developing. On
 * the budget it starts with nothing in it moves, so only what is spent on Defence does. Nothing
 * in it is left to chance.
 */
export const established = (name: string): Country => withChances(enriched(fileOf(name), name), {});

/**
 * A country worth taking with everything else as it ships: its weather, events, dilemmas,
 * shocks, growth and debts. The forewarning sweeps play it, so that neighbours turn hostile.
 */
export const worthTakingAsShipped = (name: string): Country =>
  loadCountry(enriched(fileOf(name), name));
