import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  armyLoyaltyStatus,
  balance,
  createGame,
  factionsStatus,
  formatCount,
  formatMoney,
  formatPercent,
  formatPoints,
  previewQuarter,
  regionFactions,
  type Country,
  type GameState,
} from '../../src/sim';
import { tavaraAsShipped, testlandAsShipped } from './countries';

/**
 * The docs restate figures from `src/sim/balance/` by hand. Each check below renders one
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

const FRACTIONS: Readonly<Record<number, string>> = { 4: 'quarter', 5: 'fifth', 10: 'tenth' };

/** A share in thousandths as the docs give a fraction: 200 is `a fifth`. */
function fraction(permille: number): string {
  const word = FRACTIONS[1000 / permille];
  if (word === undefined) throw new Error(`No word for ${String(permille)} thousandths`);
  return `a ${word}`;
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

const { sites, finance, trade, priceShocks, events, technologies, surveys } = balance;
const seed = technologies.droughtResistantSeed;
const { improvedIrrigation, coldStorage, roadEngineering, gridEfficiency, hydropower } =
  technologies;
const { publicHealth } = technologies;
const { services } = balance.prosperity;
/** What a site's effect leaves, improved by what a technology leaves of it. */
const improvedLeft = (own: number, by: number) => Math.floor((own * by) / 1000);
/** A figure raised by a share in thousandths of it. */
const raised = (figure: number, permille: number) =>
  Math.floor((figure * (1000 + permille)) / 1000);
/** A technology's cost and research time, as the rules give them. */
const researched = (technology: { cost: number; researchQuarters: number }) =>
  `${formatMoney(technology.cost)} over ${String(technology.researchQuarters)} quarters`;
const { tiers } = balance.prosperity;
const { strikes, protests } = balance.unrest;
const { grain, ore } = trade.goods;
const loans = finance.loans;
const { loyalty } = balance.army;
const { neighbours } = balance;
const worth = neighbours.worthTakingPermille;
/** A share of an ambition in thousandths, as the rules give it: none, part or all of it. */
function shareOf(permille: number): string {
  if (permille === 0) return 'nothing';
  return permille === 1000 ? 'the whole of it' : percent(permille);
}
/** The mark a neighbour is hostile below, as a share in thousandths of what its ambition weighs. */
function markOf(permille: number): string {
  return permille === 1000
    ? 'what its ambition weighs'
    : `${percent(permille)} of what its ambition weighs`;
}
/** A neighbour's ambition as a country file writes it, a whole percentage. */
const ambitionOf = (country: Country, neighbourId: string): string =>
  String(
    (country.map.neighbours.find((neighbour) => neighbour.id === neighbourId)?.ambition ?? 0) / 10,
  );
/** Tavara as it ships, as a game opens on it. */
const tavaraOpening = createGame(tavaraAsShipped(), 1);
const tavaraArmy = armyLoyaltyStatus(tavaraOpening);
const { factions } = balance;
const { farmers, workers, business } = factions.levers;
/** What a lever is worth, in points of standing: 300 thousandths is `30`. */
const worthOf = (lever: { weightPermille: number }): string => String(lever.weightPermille / 10);
/** A civil faction's standing as a game opens, as the rules give it: `56.1%`. */
const openingAt = (game: GameState, index: number): string =>
  formatPercent(factionsStatus(game).standings[index]?.standing ?? 0);
/** The most the factions move any region's approval as a game opens, either way. */
const mostSwayed = (game: GameState): string =>
  formatPoints(
    Math.max(...game.regions.map((region) => Math.abs(regionFactions(game, region.id).effect))),
  );

const RULES: readonly string[] = [
  // Food
  `A drought cuts a region's harvest by ${cut(events.drought.effects.harvestPermille)}`,
  `cuts the region's harvest by ${cut(events.flood.effects.harvestPermille)}`,
  `A famine that lasts ${words(balance.hunger.collapseAfterFamineQuarters)} quarters running collapses the state`,
  // Elections and winning
  `A term is ${String(balance.election.termQuarters)} quarters`,
  `With ${percent(balance.election.winSharePermille)} or more you are re-elected`,
  `for ${words(balance.victory.quartersToHold)} quarters running, with the debt burden no more than ${percent(balance.victory.debtBurdenLimitPermille)} of a year's revenue`,
  `You lose the game to a coup when national army loyalty has ended ${words(balance.army.coup.afterPlottingQuarters)} quarters running at plotting, below ${percent(loyalty.stages.plottingBelowPermille)}`,
  `A quarter that ends with loyalty back at ${percent(loyalty.stages.plottingBelowPermille)} or above ends the count`,
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
  `Improved irrigation** (needs drought-resistant seed; ${researched(improvedIrrigation)})`,
  `an irrigation scheme takes ${cut(improvedLeft(sites.irrigation.effects.harvestWeather, improvedIrrigation.improves.irrigation.effects.harvestWeather))} off how far weather, drought and flood move its region's harvest, not ${cut(sites.irrigation.effects.harvestWeather)}`,
  `Cold storage** (needs drought-resistant seed; ${researched(coldStorage)})`,
  `a grain store saves ${cut(improvedLeft(sites.grainStore.effects.reserveSpoilage, coldStorage.improves.grainStore.effects.reserveSpoilage))} of what spoils in the national reserve, not ${cut(sites.grainStore.effects.reserveSpoilage)}`,
  `Road engineering** (needs improved irrigation; ${researched(roadEngineering)})`,
  `carry ${percent(roadEngineering.improves.trunkRoad.capacityPermille)} more`,
  `${oreTonnes(raised(sites.shallowPort.capacity, roadEngineering.improves.shallowPort.capacityPermille))} tonnes a quarter instead of ${oreTonnes(sites.shallowPort.capacity)}`,
  `Grid efficiency** (needs cold storage; ${researched(gridEfficiency)})`,
  `${percent(raised(balance.power.outputPermille, gridEfficiency.improves.powerStation.powerPermille))} more, not ${percent(balance.power.outputPermille)}, and gains ${String(raised(balance.power.infrastructurePermille, gridEfficiency.improves.powerStation.powerPermille) / 10)} points of infrastructure access, not ${String(balance.power.infrastructurePermille / 10)}`,
  `Hydropower** (needs improved irrigation and grid efficiency; ${researched(hydropower)})`,
  // Locked sites and the dam
  `It also takes ${cut(sites.dam.effects.harvestWeather)} off how far weather, drought and flood move its own region's harvest`,
  `${formatMoney(sites.dam.cost)} over ${String(sites.dam.buildQuarters)} quarters, ${formatMoney(sites.dam.upkeep)} upkeep, adding ${String(sites.dam.infrastructurePermille / 10)} points`,
  // Clinics and schools
  `a clinic or a school ${String(sites.clinic.infrastructurePermille / 10)}, and power ${String(balance.power.infrastructurePermille / 10)}`,
  `Each costs ${formatMoney(sites.clinic.cost)} over ${String(sites.clinic.buildQuarters)} quarters and ${formatMoney(sites.clinic.upkeep)} upkeep, and adds ${String(sites.clinic.infrastructurePermille / 10)} points`,
  `settle ${String(sites.clinic.services.health / 10)} points higher than health spending alone holds it`,
  `closing ${percent(services.health.buildPermillePerQuarter)} of the gap each quarter for health and ${percent(services.education.buildPermillePerQuarter)} for education`,
  `Public health** and **Teacher training** (${researched(publicHealth)} each)`,
  // Surveys
  `what it costs (${formatMoney(surveys.cost)} over ${String(surveys.surveyQuarters)} quarters)`,
  `not a mine's usual ${oreTonnes(sites.mine.capacity)} tonnes`,
  // Borrowing
  `offers a loan of ${listOr(loans.amounts.map(formatMoney))} over ${listOr(loans.terms.map((term) => String(term.quarters)))} quarters, at ${listOr(loans.terms.map((term) => rate(term.annualRateBasisPoints)))} a year to a nation rated A`,
  // Factions
  `which rests at ${percent(factions.neutralPermille)} when nothing moves it`,
  `agriculture's share of what the budget spends, worth ${worthOf(farmers.agricultureShare)} points either way: a share of ${percent(farmers.agricultureShare.neutral)} leaves them where they are, ${percent(farmers.agricultureShare.best)} or more settles them the whole of it higher`,
  `drought and flood where farmers live, worth ${worthOf(farmers.harvest)} points: a harvest left whole changes nothing, and one cut by ${cut(farmers.harvest.worst)} or more settles them the whole of it lower`,
  `health and education's share of what the budget spends, worth ${worthOf(workers.servicesShare)} points either way: ${percent(workers.servicesShare.neutral)} leaves them where they are and ${percent(workers.servicesShare.best)} or more is their best`,
  `to the tax rate, worth ${worthOf(workers.tax)} points either way: ${String(workers.tax.neutral)}% leaves them where they are, ${String(workers.tax.best)}% or less is their best and ${String(workers.tax.worst)}% or more their worst`,
  `Business answers to the tax rate, worth ${worthOf(business.tax)} points either way on the same marks`,
  `budget's balance, worth ${worthOf(business.budgetBalance)} points: a budget that pays its way changes nothing, and one that spends ${percent(-business.budgetBalance.worst)} more than the tax raises, or worse, settles it the whole of it lower`,
  `burden, worth ${worthOf(business.debtBurden)} points either way: ${percent(business.debtBurden.neutral)} of a year's revenue leaves it where it is, none is its best and ${percent(business.debtBurden.worst)} or more its worst`,
  `the large sites in use, worth ${worthOf(business.works)} points: none changes nothing, and ${String(business.works.best)} or more settle it the whole of it higher`,
  `A standing moves ${fraction(factions.adjustPermillePerQuarter)} of the way each quarter towards where its levers settle it`,
  `pleased from ${percent(factions.moods.pleasedFromPermille)}, content below that, uneasy below ${percent(factions.moods.uneasyBelowPermille)} and angry below ${percent(factions.moods.angryBelowPermille)}`,
  `Farmers are at their best with ${percent(farmers.agricultureShare.best)} of what is spent and workers with ${percent(workers.servicesShare.best)}, which is more than there is to share`,
  `Factions: ${String(factions.approvalScalePermille / 1000)} of a point of approval for each point a faction stands above or below ${percent(factions.neutralPermille)}`,
  `In Tavara the farmers open at ${openingAt(tavaraOpening, 0)}, the workers at ${openingAt(tavaraOpening, 1)} and business at ${openingAt(tavaraOpening, 2)}, which moves no region's approval by more than ${mostSwayed(tavaraOpening)}; in the test country no more than ${mostSwayed(createGame(testlandAsShipped(), 1))}`,
  `A first-time tip explains factions once they move any region's approval by ${formatPoints(factions.noticeablePermille)} or more`,
  `opens with every standing at ${percent(factions.neutralPermille)} and nothing pushing it`,
  // Defence and army loyalty
  `A region's loyalty stands at ${percent(loyalty.baselinePermille)} when Defence is spent as the army expects, ${formatMoney(loyalty.defence.expectedPerMillionPeople)} a quarter for each million people`,
  `Spending nothing settles it ${String(loyalty.defence.weightPermille / 10)} points lower, double what the army expects or more settles it ${String(loyalty.defence.weightPermille / 10)} points higher`,
  `Strikes in a region settle the loyalty of the army there ${String(-loyalty.unrest.strikes / 10)} points lower, and protests ${String(-loyalty.unrest.protests / 10)} points lower`,
  `Loyalty moves ${fraction(loyalty.adjustPermillePerQuarter)} of the way each quarter`,
  `loyal, restless below ${percent(loyalty.stages.restlessBelowPermille)} and plotting below ${percent(loyalty.stages.plottingBelowPermille)}`,
  `Tavara starts on ${formatMoney(tavaraArmy.spent)} a quarter, which holds its army loyal at ${formatPercent(tavaraArmy.loyalty)}`,
  // Neighbours and deterrence
  `nothing spent settles it at nothing, ${percent(neighbours.deterrence.halfAtPermilleOfExpected)} of what the army expects settles it at half`,
  `Deterrence moves ${percent(neighbours.deterrence.adjustPermillePerQuarter)} of the way each quarter`,
  `It weighs ${shareOf(worth.subsistence)} at Subsistence, ${shareOf(worth.developing)} of the ambition at Developing, ${shareOf(worth.industrialising)} at Industrialising and ${shareOf(worth.prosperous)} at Prosperous`,
  `It is hostile while deterrence is below ${markOf(neighbours.intentions.hostileBelowPermilleOfWeight)}, watchful while deterrence is below ${percent(neighbours.intentions.watchfulBelowPermilleOfWeight)} of that`,
  `a whole percentage from 0 to ${String(neighbours.mostAmbitionPercent)}. Tavara gives Voskar ${ambitionOf(tavaraOpening.country, 'voskar')}% and Selama ${ambitionOf(tavaraOpening.country, 'selama')}%`,
  `A game starts with deterrence where its starting Defence settles it: ${formatPercent(tavaraOpening.deterrence)} in Tavara, on ${formatMoney(tavaraArmy.spent)} a quarter`,
  // Border incidents
  `has a ${percent(neighbours.incident.chancePermillePerQuarter)} chance of announcing one`,
  `An incident is announced ${words(neighbours.incident.noticeQuarters)} quarters before it begins`,
  `It lasts ${words(neighbours.incident.lastsQuarters)} quarters`,
  `each region that borders the neighbour produces ${cut(neighbours.incident.outputPermille)} less`,
  `takes a blow of ${String(-neighbours.incident.approvalPermille / 10)} points to approval in the quarter it begins`,
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

const PLAYING: readonly string[] = [
  `a budget that loses ${formatMoney(-previewQuarter(tavaraOpening, { budget: tavaraOpening.budget }).balance.min)} a quarter`,
  `Below ${percent(strikes.belowPermille)} a region strikes`,
  `An army that plots for ${words(balance.army.coup.afterPlottingQuarters)} quarters running takes power`,
  `an ore glut pushes the ore price down, for ${words(priceShocks.oreGlut.lastsQuarters)} quarters. Each is announced ${words(priceShocks.oreGlut.noticeQuarters)} quarters ahead`,
  `its usual $${String(grain.usualDollarsPerTonne)}`,
];

const COUNTRIES: readonly string[] = [
  `Tavara's Lowmere Plains are ${percent(regionFactions(tavaraOpening, 'lowmere-plains').shares.farmers)} farmers`,
  `{ "farmers": ${String(regionFactions(tavaraOpening, 'salt-coast').shares.farmers / 10)}, "workers": ${String(regionFactions(tavaraOpening, 'salt-coast').shares.workers / 10)}, "business": ${String(regionFactions(tavaraOpening, 'salt-coast').shares.business / 10)} }`,
  `a whole percentage from 0 to ${String(neighbours.mostAmbitionPercent)}`,
  `Tavara gives Voskar ${ambitionOf(tavaraOpening.country, 'voskar')} and Selama ${ambitionOf(tavaraOpening.country, 'selama')}; the test country gives its one neighbour ${ambitionOf(testlandAsShipped(), 'elsewhere')}`,
  `The army expects ${formatMoney(loyalty.defence.expectedPerMillionPeople)} a quarter for each million people`,
  `Tavara, with 5.2 million people, starts on ${formatMoney(tavaraArmy.spent)} a quarter`,
  `(the world grain price pushed up by ${dollarsOf(priceShocks.failedHarvestsAbroad.pushPermillePerQuarter, grain.usualDollarsPerTonne)} a tonne a quarter) and \`oreGlut\` (the world ore price pushed down by ${dollarsOf(priceShocks.oreGlut.pushPermillePerQuarter, ore.usualDollarsPerTonne)} a tonne a quarter)`,
  `a \`drought\` (${cut(events.drought.effects.harvestPermille)} off its harvest)`,
  `a \`flood\` (${cut(events.flood.effects.harvestPermille)} off its harvest`,
  `in whole thousands from ${formatCount(trade.crossings.leastTonnes)} to ${formatCount(trade.crossings.mostTonnes)}`,
  `each a whole number of ${formatCount(surveys.tonnesStep)} t from ${formatCount(surveys.tonnesStep)} t to ${formatCount(surveys.mostTonnes)} t`,
  `one on each neighbour carrying ${formatCount(trade.crossings.unlistedTonnes)} tonnes`,
];

describe.each([
  { doc: 'docs/rules.md', figures: RULES },
  { doc: 'docs/playing.md', figures: PLAYING },
  { doc: 'docs/countries.md', figures: COUNTRIES },
])('$doc states the balance figures', ({ doc, figures }) => {
  const text = docText(doc);
  it.each(figures)('%s', (figure) => {
    expect(text).toContain(figure);
  });
});
