import type { ApprovalPush } from './approval';
import {
  spendingCap,
  untilAusterityEnds,
  withinAusterity,
  type Austere,
  type Austerity,
} from './austerity';
import { balance } from './balance';
import type { Budget } from './budget';
import { nextDate } from './calendar';
import { formatRate, type DebtService } from './debt';
import type { ReportEntry } from './report';
import { formatMoney, formatPoints, formatQuarters } from './text';
import type { GameDate } from './types';
import {
  CREDIT_RATING_NAMES,
  CREDIT_RATINGS,
  SPENDING_AREA_NAMES,
  SPENDING_AREAS,
} from './vocabulary';

/**
 * A bailout: what a missed payment on any debt brings, in place of losing the game. The
 * debts are consolidated into one bailout loan (`serveDebts` in `debt.ts`), the credit rating
 * falls to its lowest step (`credit.ts`), approval takes a blow, and austerity holds for a
 * fixed number of quarters (`austerity.ts`). A missed payment during austerity extends it.
 * Neither ends the game.
 */

/** What the label of the blow to approval reads in its breakdown. */
const BAILOUT_PUSH_LABEL = 'Bailout';

/** What a quarter's missed payments, if any, did beyond the debt. */
export interface BailoutOutcome {
  /** True when a missed payment brought a bailout outside austerity this quarter. */
  readonly bailedOut: boolean;
  /** Austerity as the next quarter begins, or null when it is not in force. */
  readonly austerity: Austerity | null;
  readonly entries: readonly ReportEntry[];
}

/**
 * The blow a bailout deals approval in every region as it lands, or none: a missed payment
 * during austerity deals none.
 */
export function bailoutPushes(
  service: Pick<DebtService, 'missed'>,
  game: Pick<Austere, 'austerity'>,
): readonly ApprovalPush[] {
  return service.missed > 0 && game.austerity === null
    ? [{ label: BAILOUT_PUSH_LABEL, permille: balance.finance.bailout.approvalPermille }]
    : [];
}

/**
 * What the quarter's repayments did to austerity. A missed payment outside austerity brings
 * a bailout and austerity begins with the next quarter. One during it extends it. Otherwise
 * a quarter of austerity is spent, and it ends as its last quarter ends.
 * `borrowing` says whether money was to be borrowed this quarter, which a bailout stops.
 */
export function resolveBailout(
  game: Austere,
  service: DebtService,
  borrowing: boolean,
): BailoutOutcome {
  const { quarters, extendQuarters } = balance.finance.austerity;
  const { austerity, date } = game;
  if (service.missed > 0 && austerity === null) {
    const next = { quartersLeft: quarters };
    return {
      bailedOut: true,
      austerity: next,
      entries: [bailoutEntry(game, service, next, borrowing)],
    };
  }
  if (service.missed > 0 && austerity !== null) {
    const next = { quartersLeft: austerity.quartersLeft - 1 + extendQuarters };
    return {
      bailedOut: false,
      austerity: next,
      entries: [extendedEntry(date, service, next)],
    };
  }
  if (austerity === null) {
    return { bailedOut: false, austerity: null, entries: [] };
  }
  const left = austerity.quartersLeft - 1;
  return {
    bailedOut: false,
    austerity: left > 0 ? { quartersLeft: left } : null,
    entries: left > 0 ? [] : [endedEntry(service)],
  };
}

/**
 * The budget in force once the quarter is over: the one decided, brought within austerity if
 * a bailout has just imposed it.
 */
export function budgetAfter(
  game: Pick<Austere, 'country' | 'date'>,
  decided: Budget,
  outcome: BailoutOutcome,
): Budget {
  return withinAusterity(
    { country: game.country, date: nextDate(game.date), austerity: outcome.austerity },
    decided,
  );
}

/**
 * What a missed payment would bring as the game stands, in a sentence: a bailout, or during
 * austerity, more of it.
 */
export function missedPaymentMeans(game: Pick<Austere, 'country' | 'austerity'>): string {
  const { austerity, bailout } = balance.finance;
  if (game.austerity !== null) {
    return `A missed payment during austerity extends it by ${formatQuarters(austerity.extendQuarters)}.`;
  }
  const lowest = CREDIT_RATING_NAMES[CREDIT_RATINGS[0]];
  return `A missed payment brings a bailout: everything owed becomes one bailout loan, the credit rating falls to ${lowest}, approval takes a blow of ${formatPoints(-bailout.approvalPermille)}, and austerity holds for ${formatQuarters(austerity.quarters)}: ${austerityTerms(game)}.`;
}

/** What austerity asks, in a sentence. */
export function austerityTerms(game: Pick<Austere, 'country'>): string {
  const { taxFloorPercent } = balance.finance.austerity;
  const caps = SPENDING_AREAS.flatMap((area) => {
    const cap = spendingCap(game.country, area);
    return cap === null ? [] : [`${SPENDING_AREA_NAMES[area].toLowerCase()} ${formatMoney(cap)}`];
  });
  return `the tax rate no lower than ${taxFloorPercent}%, spending capped (${caps.join(', ')} a quarter), no new borrowing and no new projects`;
}

function bailoutEntry(
  game: Austere,
  service: DebtService,
  next: Austerity,
  borrowing: boolean,
): ReportEntry {
  const loan = service.bailoutLoan;
  const lowest = CREDIT_RATING_NAMES[CREDIT_RATINGS[0]];
  const start = nextDate(game.date);
  const consolidated =
    loan === null
      ? ''
      : ` Lenders consolidated everything owed, ${formatMoney(loan.owed)}, into one bailout loan at ${formatRate(loan.annualRateBasisPoints)} a year, repaid at ${formatMoney(loan.repayment)} a quarter over ${formatQuarters(loan.termQuarters)} from next quarter.`;
  const lent = borrowing ? ' What was to be borrowed this quarter was not lent.' : '';
  return {
    kind: 'bailout',
    seriousness: 'serious',
    headline: 'Bailout: the nation’s debts taken over',
    cause: `The treasury and the quarter’s revenue could not cover ${formatMoney(service.missed)} due on ${service.missedOn.join(' and ')}.${consolidated}${lent} The credit rating falls to ${lowest}, approval takes a blow of ${formatPoints(-balance.finance.bailout.approvalPermille)}, and austerity holds for ${formatQuarters(next.quartersLeft)}, ${untilAusterityEnds(next, start)}: ${austerityTerms(game)}. Projects under way carry on.`,
  };
}

function extendedEntry(date: GameDate, service: DebtService, next: Austerity): ReportEntry {
  const loan = service.bailoutLoan;
  const consolidated =
    loan === null
      ? ''
      : ` Everything owed, ${formatMoney(loan.owed)}, is consolidated again into a bailout loan repaid at ${formatMoney(loan.repayment)} a quarter over ${formatQuarters(loan.termQuarters)}.`;
  return {
    kind: 'missedPayment',
    seriousness: 'serious',
    headline: 'Missed payment: austerity extended',
    cause: `The treasury and the quarter’s revenue could not cover ${formatMoney(service.missed)} due on ${service.missedOn.join(' and ')}.${consolidated} Austerity is extended by ${formatQuarters(balance.finance.austerity.extendQuarters)}, and now holds ${untilAusterityEnds(next, nextDate(date))}.`,
  };
}

function endedEntry(service: DebtService): ReportEntry {
  const loan = service.debts.find((debt) => debt.kind === 'bailout');
  const still =
    loan === undefined
      ? ''
      : ` The bailout loan is still repaid at ${formatMoney(loan.repayment)} a quarter, ${formatQuarters(loan.quartersLeft)} to go.`;
  return {
    kind: 'austerity',
    seriousness: 'notable',
    headline: 'Austerity ends',
    cause: `The bailout’s terms are lifted: the tax rate and spending may be set freely again, and loans and new projects are open once more.${still}`,
  };
}
