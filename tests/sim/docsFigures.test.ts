import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { balance, formatCount, formatMoney } from '../../src/sim';

/**
 * The docs restate figures from `src/sim/balance.ts` by hand. Each check below renders one
 * stated figure from the balance values and looks for it, word for word, in the doc that states
 * it, so a change to a value that leaves the doc behind fails here. A check that fails after a
 * deliberate change to the doc's wording is updated with the doc.
 */

/** A doc's text with every run of whitespace made one space, so a figure may wrap a line. */
function docText(path: string): string {
  return readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8').replace(/\s+/g, ' ');
}

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'] as const;

/** A small count in words, as the docs give it: `two`. */
function words(count: number): string {
  const word = WORDS[count];
  if (word === undefined) throw new Error(`No word for ${String(count)}`);
  return word;
}

/** Thousandths as a percentage: 400 is `40%`. */
function percent(permille: number): string {
  return `${String(permille / 10)}%`;
}

/** What is left out of a whole by a share in thousandths: 600 left is `40%` taken. */
function cut(keptPermille: number): string {
  return percent(1000 - keptPermille);
}

/** Basis points as a percentage: 600 is `6%`. */
function rate(basisPoints: number): string {
  return `${String(basisPoints / 100)}%`;
}

/** A list as the docs give one: `4, 8 or 12`. */
function listOr(items: readonly string[]): string {
  return items.join(', ').replace(/, ([^,]*)$/, ' or $1');
}

/** A share in thousandths of a usual price, in whole dollars a tonne: `$30`. */
function dollarsOf(permille: number, usualDollars: number): string {
  return `$${String(Math.round((Math.abs(permille) * usualDollars) / 1000))}`;
}

/** Ore capacity in Money units at the usual ore price, in tonnes: 600 is `600,000`. */
function oreTonnes(capacity: number): string {
  return formatCount((capacity * 100_000) / balance.trade.goods.ore.usualDollarsPerTonne);
}

const { sites, finance, trade, priceShocks, events, technologies } = balance;
const seed = technologies.droughtResistantSeed;
const { tiers } = balance.prosperity;
const { strikes, protests } = balance.unrest;
const { grain, ore } = trade.goods;
const loans = finance.loans;

const RULES: readonly string[] = [
  // Food
  `A drought cuts a region's harvest by ${cut(events.drought.effects.harvestPermille)}`,
  `cuts the region's harvest by ${cut(events.flood.effects.harvestPermille)}`,
  `A famine that lasts ${words(balance.hunger.collapseAfterFamineQuarters)} quarters running collapses the state`,
  // Elections and winning
  `A term is ${String(balance.election.termQuarters)} quarters`,
  `With ${percent(balance.election.winSharePermille)} or more you are re-elected`,
  `for ${words(balance.victory.quartersToHold)} quarters running, with the debt burden no more than ${percent(balance.victory.debtBurdenLimitPermille)} of a year's revenue`,
  // Unrest
  `falls below ${percent(strikes.belowPermille)} goes on strike and produces ${cut(strikes.outputPermille)} less`,
  `Below ${percent(protests.belowPermille)} it protests and produces ${cut(protests.outputPermille)} less`,
  // Tiers
  `Developing from ${String(tiers.developing.fromPermille / 10)}, Industrialising from ${String(tiers.industrialising.fromPermille / 10)} and Prosperous from ${String(tiers.prosperous.fromPermille / 10)}`,
  `the approval baseline drops ${String(tiers.developing.expectationsPermille / 10)} points a tier`,
  // Chains
  `A mine ships ${oreTonnes(sites.mine.capacity)} tonnes of ore a quarter abroad`,
  `a trunk road ${formatMoney(sites.trunkRoad.capacity)} a quarter (${oreTonnes(sites.trunkRoad.capacity)} tonnes) and a port ${formatMoney(sites.port.capacity)} (${oreTonnes(sites.port.capacity)} tonnes)`,
  `(${formatMoney(sites.mine.cost)}, ${formatMoney(sites.trunkRoad.cost)} and ${formatMoney(sites.port.cost)}; ${String(sites.mine.buildQuarters)}, ${String(sites.trunkRoad.buildQuarters)} and ${String(sites.port.buildQuarters)} quarters to build; ${formatMoney(sites.mine.upkeep)}, ${formatMoney(sites.trunkRoad.upkeep)} and ${formatMoney(sites.port.upkeep)} upkeep)`,
  // Research
  `Drought-resistant seed costs ${formatMoney(seed.cost)} over ${String(seed.researchQuarters)} quarters`,
  `weather and drought move every region's harvest ${cut(seed.effects.weatherAndDrought)} less, so a drought takes ${cut(1000 - Math.floor(((1000 - events.drought.effects.harvestPermille) * seed.effects.weatherAndDrought) / 1000))} of a harvest instead of ${cut(events.drought.effects.harvestPermille)}`,
  // Borrowing
  `offers a loan of ${listOr(loans.amounts.map(formatMoney))} over ${listOr(loans.terms.map((term) => String(term.quarters)))} quarters, at ${listOr(loans.terms.map((term) => rate(term.annualRateBasisPoints)))} a year to a nation rated A`,
  // Bailout and austerity
  `approval takes a ${String(-finance.bailout.approvalPermille / 10)}-point blow`,
  `Austerity then holds for ${String(finance.austerity.quarters)} quarters: the tax rate cannot go below ${String(finance.austerity.taxFloorPercent)}%`,
  // Trade
  `by up to ${dollarsOf(grain.swingPermillePerQuarter, grain.usualDollarsPerTonne)} a tonne either way, and it is pulled a quarter of the way back towards its usual $${String(grain.usualDollarsPerTonne)}, never leaving $${String(grain.lowestDollarsPerTonne)} to $${String(grain.highestDollarsPerTonne)}`,
  `at the world grain price less a ${percent(trade.exportMarginPermille)} margin`,
  `by up to ${dollarsOf(ore.swingPermillePerQuarter, ore.usualDollarsPerTonne)} a tonne either way, and it is pulled a fifth of the way back towards its usual $${String(ore.usualDollarsPerTonne)}, never leaving $${String(ore.lowestDollarsPerTonne)} to $${String(ore.highestDollarsPerTonne)}`,
  `${oreTonnes(sites.port.capacity)} t for a port and ${oreTonnes(sites.shallowPort.capacity)} t for a shallow port`,
  `failed harvests abroad push the grain price up by ${dollarsOf(priceShocks.failedHarvestsAbroad.pushPermillePerQuarter, grain.usualDollarsPerTonne)} a tonne a quarter, and an ore glut pushes the ore price down by ${dollarsOf(priceShocks.oreGlut.pushPermillePerQuarter, ore.usualDollarsPerTonne)} a tonne a quarter`,
];

const README: readonly string[] = [
  `Below ${percent(strikes.belowPermille)} a region strikes`,
  `an ore glut pushes the ore price down, for ${words(priceShocks.oreGlut.lastsQuarters)} quarters. Each is announced ${words(priceShocks.oreGlut.noticeQuarters)} quarters ahead`,
  `its usual $${String(grain.usualDollarsPerTonne)}`,
];

const COUNTRIES: readonly string[] = [
  `(the world grain price pushed up by ${dollarsOf(priceShocks.failedHarvestsAbroad.pushPermillePerQuarter, grain.usualDollarsPerTonne)} a tonne a quarter) and \`oreGlut\` (the world ore price pushed down by ${dollarsOf(priceShocks.oreGlut.pushPermillePerQuarter, ore.usualDollarsPerTonne)} a tonne a quarter)`,
  `a \`drought\` (${cut(events.drought.effects.harvestPermille)} off its harvest)`,
  `a \`flood\` (${cut(events.flood.effects.harvestPermille)} off its harvest`,
  `in whole thousands from ${formatCount(trade.crossings.leastTonnes)} to ${formatCount(trade.crossings.mostTonnes)}`,
  `one on each neighbour carrying ${formatCount(trade.crossings.unlistedTonnes)} tonnes`,
];

describe.each([
  { doc: 'docs/rules.md', figures: RULES },
  { doc: 'README.md', figures: README },
  { doc: 'docs/countries.md', figures: COUNTRIES },
])('$doc states the balance figures', ({ doc, figures }) => {
  const text = docText(doc);
  it.each(figures)('%s', (figure) => {
    expect(text).toContain(figure);
  });
});
