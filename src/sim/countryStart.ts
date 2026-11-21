import { sum } from './arithmetic';
import { balance } from './balance';
import { spendingFault, taxOn, taxRateFault, type Budget } from './budget';
import type { Country, Region, Site } from './country';
import { join, type Json, type Reader } from './countryReader';
import { levelRepaymentOf, type StartingLoan } from './debt';
import { formatMoney, formatPercent } from './text';
import type { Money } from './types';
import { upkeepForEvery } from './upkeep';
import { SPENDING_AREAS, type SpendingArea } from './vocabulary';

/**
 * The starting budget, written with the tax rate in percent and spending in millions. It
 * is held to the same rules as a budget the player sets. Upkeep may be left out: the game
 * then starts with enough to keep in good repair every one of the country's sites that can
 * stand together, which costs nothing until they are built, since upkeep is spent only as
 * far as it is needed.
 */
function readBudget(reader: Reader, budget: Json, path: string, sites: readonly Site[]): Budget {
  const spendingPath = join(path, 'spending');
  const written = reader.object(budget, 'spending', path);
  for (const key of Object.keys(written)) {
    if (!SPENDING_AREAS.some((area) => area === key)) {
      reader.fault(
        join(spendingPath, key),
        `is not a spending area this game has (${SPENDING_AREAS.join(', ')})`,
      );
    }
  }
  const spending = Object.fromEntries(
    SPENDING_AREAS.map((area) => {
      if (area === 'upkeep' && written.upkeep === undefined) {
        return [area, upkeepForEvery(costliestTogether(sites).map((site) => site.type))];
      }
      const before = reader.faults.length;
      const amount = reader.money(written, area, spendingPath);
      const fault = reader.faults.length === before ? spendingFault(amount) : null;
      if (fault !== null) reader.fault(join(spendingPath, area), fault);
      return [area, amount];
    }),
  ) as Record<SpendingArea, Money>;

  const before = reader.faults.length;
  const taxRatePercent = reader.number(budget, 'taxRate', path);
  const fault = reader.faults.length === before ? taxRateFault(taxRatePercent) : null;
  if (fault !== null) reader.fault(join(path, 'taxRate'), fault);

  return { taxRatePercent, spending };
}

/** What the game starts with: the treasury, the budget, the food reserve and any loans. */
export function readStart(
  reader: Reader,
  start: Json,
  formatVersion: number,
  regions: readonly Region[],
  sites: readonly Site[],
): Country['start'] {
  const treasury = reader.money(start, 'treasury', 'start');
  const budget = readBudget(reader, reader.object(start, 'budget', 'start'), 'start.budget', sites);
  return {
    treasury,
    budget,
    foodReserve: reader.wholeNumber(start, 'foodReserve', 'start', 0),
    loans: readStartingLoans(reader, start, formatVersion, regions, { treasury, budget }),
  };
}

/**
 * The loans a file of format 4 or later may say the game starts with, in `start.loans`:
 * each the sum owed, in millions, its yearly rate in percent to at most two decimal places,
 * and the quarters left to repay it. Between them they may owe no more than balance data
 * allows against the regions' output, and their first repayments must be payable from the
 * starting treasury and the first quarter's revenue, before anything unrest costs.
 */
function readStartingLoans(
  reader: Reader,
  start: Json,
  formatVersion: number,
  regions: readonly Region[],
  { treasury, budget }: Pick<Country['start'], 'treasury' | 'budget'>,
): StartingLoan[] {
  if (start.loans === undefined) return [];
  if (formatVersion < 4) {
    reader.fault('start.loans', 'needs country file format 4 or later');
    return [];
  }
  const limits = balance.finance.startingDebt;
  const loans = reader.list(start, 'loans', 'start', (item, path): StartingLoan => {
    const before = reader.faults.length;
    const owed = reader.money(item, 'amount', path);
    if (reader.faults.length === before && owed === 0) {
      reader.fault(join(path, 'amount'), 'must be more than 0');
    }
    return {
      owed,
      annualRateBasisPoints: readRate(reader, item, path, limits.mostRatePercent),
      quarters: reader.wholeNumber(item, 'quarters', path, 1, limits.mostQuarters),
    };
  });
  if (loans.length > limits.mostLoans) {
    reader.fault(
      'start.loans',
      `lists ${loans.length} loans, but a country may start with at most ${limits.mostLoans}`,
    );
  }
  // What the loans come to together means nothing while any part of them, or of the
  // regions and budget they are weighed against, is in doubt.
  if (reader.faults.length > 0) return loans;

  const output = sum(regions.map((region) => region.output));
  const owed = sum(loans.map((loan) => loan.owed));
  const mostOwed = Math.floor((4 * output * limits.mostOwedPermille) / 1000);
  if (owed > mostOwed) {
    reader.fault(
      'start.loans',
      `owe ${formatMoney(owed)} between them, but a country may start owing at most ${formatMoney(mostOwed)}: ${formatPercent(limits.mostOwedPermille, 0)} of a year’s output from its regions`,
    );
  }
  // Repayments are paid first, out of the treasury and the quarter's revenue.
  const repayments = sum(loans.map(levelRepaymentOf));
  const revenue = sum(regions.map((region) => taxOn(region.output, budget.taxRatePercent)));
  if (repayments > treasury + revenue) {
    reader.fault(
      'start.loans',
      `ask ${formatMoney(repayments)} in the first quarter, but the starting treasury and the first quarter’s revenue come to ${formatMoney(treasury + revenue)}: the game would open on a missed payment`,
    );
  }
  return loans;
}

/** A loan's yearly rate, written in percent to at most two decimal places. */
function readRate(reader: Reader, loan: Json, path: string, mostPercent: number): number {
  const before = reader.faults.length;
  const percent = reader.number(loan, 'rate', path);
  if (reader.faults.length > before) return 0;
  const basisPoints = Math.round(percent * 100);
  if (percent < 0 || percent > mostPercent || Math.abs(percent * 100 - basisPoints) > 1e-6) {
    reader.fault(
      join(path, 'rate'),
      `is ${percent}, but must be a yearly percentage from 0 to ${mostPercent}, to at most two decimal places`,
    );
    return 0;
  }
  return basisPoints;
}

/**
 * The sites that could all be in use at once and between them need the most upkeep: every
 * site, less those ruled out by the alternatives chosen.
 */
export function costliestTogether(sites: readonly Site[]): Site[] {
  const upkeepOf = (chosen: readonly Site[]) =>
    sum(chosen.map((site) => balance.sites[site.type].upkeep));
  const choose = (left: readonly Site[], chosen: readonly Site[]): Site[] => {
    const [site, ...rest] = left;
    if (site === undefined) return [...chosen];
    if (chosen.some((other) => other.alternatives.includes(site.id))) return choose(rest, chosen);
    if (site.alternatives.length === 0) return choose(rest, [...chosen, site]);
    const withIt = choose(rest, [...chosen, site]);
    const withoutIt = choose(rest, chosen);
    return upkeepOf(withIt) >= upkeepOf(withoutIt) ? withIt : withoutIt;
  };
  return choose(sites, []);
}
