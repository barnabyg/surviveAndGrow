import {
  approvalStatus,
  bondOffers,
  borrowingBarred,
  budgetLimits,
  buildingBarred,
  debtStatus,
  electionStatus,
  FOOD_STAGES,
  foodStatus,
  pendingDilemma,
  ORDER_STEP_TONNES,
  previewQuarter,
  priceStatus,
  siteStatus,
  siteTerms,
  startFault,
  SPENDING_AREAS,
  loanOffers,
  importTerms,
  exportTerms,
  tradeCapacity,
  type Borrowing,
  type Budget,
  type Decisions,
  type GameState,
  type LoanOffer,
  type Money,
  type PendingDilemma,
  type SiteType,
  type SpendingArea,
  type TradeOrder,
  withinAusterity,
} from '../../src/sim';
import type { Decide } from './batch';

/**
 * The decisions brought within what austerity allows. The players plan as if there were none:
 * during it their budget is brought within its limits and they start and borrow nothing,
 * which is what a player who knew no better would be held to.
 */
export function withinRules(game: GameState, decisions: Decisions): Decisions {
  const { startProjects, borrow, ...rest } = decisions;
  const building = buildingBarred(game) === null && startProjects !== undefined;
  const borrowing = borrowingBarred(game) === null && borrow !== undefined;
  return {
    ...rest,
    budget: withinAusterity(game, decisions.budget),
    ...(building ? { startProjects } : {}),
    ...(borrowing ? { borrow } : {}),
  };
}

/** What a quarter would bring with these decisions, brought within austerity. */
function previewAllowed(game: GameState, decisions: Decisions) {
  return previewQuarter(game, withinRules(game, decisions));
}

/**
 * The scripted players the balance is judged by. Each is a plain function from the game to
 * the quarter's decisions, and sees only what the simulation's public interface shows a
 * person at the screen: the state, the preview, the sites and the dilemma put to them.
 */
export interface ScriptedPlayer {
  readonly name: string;
  /** How it plays, in a line, for the balance report. */
  readonly manner: string;
  readonly decide: Decide;
}

type DilemmaOption = PendingDilemma['options'][number];

/**
 * The answer to the pending dilemma that scores highest among those the game will take:
 * money and grain cannot be given that are not there.
 */
function answer(game: GameState, score: (option: DilemmaOption) => number): string | null {
  const { dilemma } = game;
  if (dilemma === null) return null;
  const open = new Set(
    pendingDilemma(game)
      ?.options.filter((option) => option.unavailable === null)
      .map((option) => option.id),
  );
  const best = dilemma.options
    .filter((option) => open.has(option.id))
    .sort((a, b) => score(b) - score(a))[0];
  return best?.id ?? null;
}

/** What an option does to the treasury: negative when it costs money. */
function moneyOf(option: DilemmaOption): Money {
  return option.effects.reduce(
    (total, effect) => total + (effect.kind === 'treasury' ? effect.amount : 0),
    0,
  );
}

/** What an option does to the national reserve, in tonnes: negative when grain leaves it. */
function grainOf(option: DilemmaOption): number {
  return option.effects.reduce((total, effect) => {
    if (effect.kind === 'reserve') return total + effect.tonnes;
    return effect.kind === 'regionGrain' ? total - effect.tonnes : total;
  }, 0);
}

/** The push an option gives approval, in thousandths, wherever it lands. */
function approvalOf(option: DilemmaOption): number {
  return option.effects.reduce(
    (total, effect) => total + (effect.kind === 'approval' ? effect.permille : 0),
    0,
  );
}

/** Whether an option changes nothing at all: the way of a player who will not decide. */
const changesNothing = (option: DilemmaOption) => (option.effects.length === 0 ? 1 : 0);

/**
 * Does nothing: keeps the budget the game began with, sends no relief and builds nothing.
 * The game will not go on past a dilemma without an answer, so it gives the one that
 * changes nothing, or failing that the one that costs neither money nor grain.
 */
const doesNothing: Decide = (game) => ({
  budget: game.budget,
  dilemmaChoice: answer(
    game,
    (option) =>
      changesNothing(option) * 2 + (moneyOf(option) === 0 && grainOf(option) === 0 ? 1 : 0),
  ),
});

/**
 * Spends everything on popularity: the lowest tax, and all the money there is on health,
 * education and security. Nothing for the farms, for relief or for building, and whatever
 * answer to a dilemma pleases the crowd most.
 */
const popularity: Decide = (game) => {
  const { taxRatePercent, spending } = budgetLimits;
  const lowTax: Budget = {
    taxRatePercent: taxRatePercent.min,
    spending: { agriculture: 0, foodRelief: 0, health: 0, education: 0, security: 0, upkeep: 0 },
  };
  // Everything in the treasury once this quarter's tax is in, shared between the three.
  const available = previewAllowed(game, { budget: lowTax }).treasury.min;
  const share = Math.min(spending.max, stepped(Math.floor(available / 3)));
  return {
    budget: {
      ...lowTax,
      spending: { ...lowTax.spending, health: share, education: share, security: share },
    },
    dilemmaChoice: answer(game, (option) => approvalOf(option) * 1000 + moneyOf(option)),
  };
};

/** How the sensible player runs the country. These are its habits, not the game's rules. */
const habits = {
  /** It campaigns for this many quarters before the vote, and saves until then. */
  campaignQuarters: 6,
  /** It likes the treasury to hold this many quarters of its spending before it builds. */
  cushionQuarters: 1,
  /**
   * Outside the campaign it keeps the tax at this rate at least, and spends what that leaves
   * over on health and education.
   */
  investAtTaxPercent: 20,
  /** What it puts by each quarter while something is still to be built, in Money units. */
  savingPerQuarter: 30,
} as const;

/** The small sites, in the order the sensible players build them: irrigation first. */
const SMALL_SITES: readonly SiteType[] = ['irrigation', 'grainStore', 'farmRoad'];

/**
 * Plays sensibly, the way a careful person might on a first serious attempt, and builds no
 * large site. It keeps the budget in balance and pays for relief only while someone is
 * hungry, sending it to the region worst off. It funds the farms more while the reserve is
 * below its safe level, and less again once it is not. It saves a little each quarter for
 * the next small site and starts it once the treasury holds its cost, until every one is
 * built; after that it spends what the budget can spare on health and education. As each
 * election nears it spends what it has saved on what the preview says the public will
 * thank it for.
 */
const sensible: Decide = builder(SMALL_SITES);

/** The large sites in the order the chain builder builds them: power, then the mine's chain. */
const CHAIN: readonly SiteType[] = ['powerStation', 'powerLine', 'port', 'trunkRoad', 'mine'];

/**
 * Plays as the sensible player does, but builds the large sites first: power, which lifts
 * the output of every region a line reaches, and then the mine's chain, outlet first. The
 * game will not start a site the treasury cannot pay for outright, so it saves for each in
 * turn. It builds through every term and stops only for the campaign, so what it starts
 * late pays off after the vote. Then it builds the small sites.
 */
const chainBuilder: Decide = builder([...CHAIN, ...SMALL_SITES]);

/** A sensible player who builds every site of the types given, in that order. */
function builder(order: readonly SiteType[], lending: Lending = savesUp): Decide {
  return (game) => steward(game, order, lending);
}

/**
 * How a sensible player pays for the next site when the treasury cannot: what it borrows
 * this quarter towards a site whose cost the money free to spend falls `short` of.
 */
type Lending = (game: GameState, short: Money) => Borrowing[];

/** Borrows nothing: it saves until the treasury holds the site's cost. */
function savesUp(): Borrowing[] {
  return [];
}

/** How the sensible borrower borrows. These are its habits, not the game's rules. */
const borrowerHabits = {
  /**
   * It borrows no further once what is owed would pass this share of a year's revenue: half
   * of what lenders allow a nation rated A.
   */
  mostBurdenPermille: 500,
  /**
   * It borrows no further once the quarter's repayments would pass this share of a
   * quarter's revenue.
   */
  mostRepaymentsPermille: 150,
  /** It borrows for a site only when it lacks more than this, and otherwise saves. */
  leastShortfall: 2 * habits.savingPerQuarter,
} as const;

/**
 * Borrows what the next site lacks, with a margin to stay clear of the lenders' limit and of
 * repayments it could not meet: bonds once the rating allows them, which pay only interest
 * until they mature and cost less, and loans over the longest term until then, which ask the
 * least each quarter. It takes the smallest sum that covers the shortfall, or failing that the
 * largest it allows itself.
 */
const borrowsSensibly: Lending = (game, short) => {
  if (short <= borrowerHabits.leastShortfall) return [];
  const status = debtStatus(game);
  const quarterRevenue = Math.floor(status.yearRevenue / 4);
  const mostOwed = Math.floor((status.yearRevenue * borrowerHabits.mostBurdenPermille) / 1000);
  const mostRepaid = Math.floor((quarterRevenue * borrowerHabits.mostRepaymentsPermille) / 1000);
  const planned: Borrowing[] = [];
  let owed = status.debt;
  let repayments = status.repayments;
  let lacking = short;
  while (lacking > 0 && planned.length < 3) {
    const bonds = bondOffers(game, planned).filter((offer) => offer.unavailable === null);
    const offers = bonds.length > 0 ? bonds : loanOffers(game, planned);
    const longest = Math.max(...offers.map((offer) => offer.quarters));
    const fitting = offers.filter(
      (offer) =>
        offer.unavailable === null &&
        offer.quarters === longest &&
        owed + offer.amount <= mostOwed &&
        repayments + quarterlyCost(offer) <= mostRepaid,
    );
    const choice =
      fitting.filter((offer) => offer.amount >= lacking).sort(byAmount)[0] ??
      fitting.sort(byAmount).at(-1);
    if (choice === undefined) break;
    planned.push({ kind: choice.kind, amount: choice.amount, quarters: choice.quarters });
    owed += choice.amount;
    repayments += quarterlyCost(choice);
    lacking -= choice.amount;
  }
  return planned;
};

const byAmount = (a: LoanOffer, b: LoanOffer) => a.amount - b.amount;

/**
 * What a debt on offer will cost each quarter, as the sensible borrower budgets for it: a
 * loan's repayment, or a bond's interest and what it puts by towards its maturity.
 */
function quarterlyCost(offer: LoanOffer): Money {
  return offer.kind === 'bond'
    ? offer.repayment + Math.ceil(offer.amount / offer.quarters)
    : offer.repayment;
}

/** The order the sensible borrower builds in: the mine's chain, then power and the small sites. */
const BORROWER_ORDER: readonly SiteType[] = [
  'port',
  'trunkRoad',
  'mine',
  'powerStation',
  'powerLine',
  ...SMALL_SITES,
];

/**
 * Plays as the chain builder does and builds the same sites, but the mine's chain first, so
 * that what the mine earns comes in to pay what was borrowed, and power after it. It borrows
 * for each site the treasury cannot yet pay for instead of saving up for it, within limits of
 * its own: loans while the credit rating allows nothing better, bonds once it allows them. It
 * puts money by for each bond's maturity as the bond runs.
 */
const sensibleBorrower: Decide = builder(BORROWER_ORDER, borrowsSensibly);

/**
 * Borrows as the sensible borrower does, but nothing while an ore glut is announced or in
 * force: what the mine earns will not repay it as the borrower counted on.
 */
const borrowsUnlessGlut: Lending = (game, short) =>
  priceStatus(game, 'ore').shocks.length > 0 ? [] : borrowsSensibly(game, short);

/**
 * The sensible way of running the country, building the sites of the types given in turn: a
 * balanced budget that puts a little by while something is left to build, relief for the
 * hungry, the farms helped while the reserve is low, and the savings spent on approval as
 * the vote nears. The instalments on what is being built come out of savings. A player that
 * borrows puts money by for each bond's maturity, and does not count it as savings.
 */
function steward(game: GameState, order: readonly SiteType[], lending: Lending): Decisions {
  const { quartersAway } = electionStatus(game);
  const quartersLeft = quartersAway + 1;
  const campaigning = quartersLeft <= habits.campaignQuarters;
  const putBy = maturityFund(game);
  const savings = Math.max(0, game.treasury - putBy.held);

  // Relief goes to the hungry region furthest gone, and is paid for only when one is.
  const reliefRegionId = hungriest(game);
  let budget = withRelief(game, usualServices(game), reliefRegionId);
  budget = withGrowingFarms(game, budget);

  const dilemmaChoice = answer(game, (option) => judge(game, option, campaigning));
  const choices = { reliefRegionId, dilemmaChoice };

  if (campaigning) {
    // What is saved is spent evenly over the quarters left, on what wins approval.
    const allowance = Math.floor(savings / quartersLeft);
    budget = campaign(game, budget, choices, putBy.thisQuarter - allowance);
    return { budget, ...choices };
  }

  const next = nextSite(game, order);
  // What is already promised to the sites being built is not there to spend.
  const free = savings - remainingCost(game);
  const startProjects = next !== null && next.cost <= free ? [next.siteId] : [];
  const borrow = next !== null && startProjects.length === 0 ? lending(game, next.cost - free) : [];
  // It saves for the next site only when it is not borrowing for it.
  const saving = next === null || borrow.length > 0 ? 0 : habits.savingPerQuarter;
  const floor = saving + putBy.thisQuarter - Math.min(instalmentsDue(game), savings);
  budget = balanced(game, budget, choices, floor);
  if (next === null) budget = invested(game, budget, choices, floor);
  if (next !== null && startProjects.length > 0) {
    // A player that borrows has the site's cost in hand, and pays its first instalment from it.
    const first = lending === savesUp ? 0 : siteStatus(game, next.siteId).instalment;
    budget = balanced(game, budget, { ...choices, startProjects }, floor - first);
  }
  return { budget, ...choices, startProjects, ...(borrow.length > 0 ? { borrow } : {}) };
}

/**
 * What a player that pays each bond off at maturity has put by for it: a like share of the
 * sum each quarter the bond runs, held in the treasury until it falls due. `thisQuarter` is
 * what the quarter adds to it, less what it pays out at a maturity.
 */
function maturityFund(game: GameState): { readonly held: Money; readonly thisQuarter: Money } {
  let held = 0;
  let thisQuarter = 0;
  for (const debt of game.debts) {
    if (debt.schedule !== 'atMaturity') continue;
    const share = Math.ceil(debt.owed / debt.termQuarters);
    const runs = debt.termQuarters - debt.quartersLeft;
    const already = Math.min(debt.owed, share * runs);
    held += already;
    thisQuarter += debt.quartersLeft <= 1 ? -already : share;
  }
  return { held, thisQuarter };
}

/**
 * Borrows recklessly: every quarter it can, it borrows as much as the lenders allow, taking
 * the largest sums at the lowest rate on offer, which is the shortest term. It treats what it
 * borrows as money to spend: it starts every site it can pay for, in the chain builder's
 * order, and spends the rest over the year on whatever the preview says wins most approval.
 * It sets the tax to balance the budget as if nothing were owed, so the repayments come out
 * of the treasury, and when it runs dry a payment is missed. Relief, the farms and dilemmas
 * it handles as the sensible player does, with an eye on approval.
 */
const recklessBorrower: Decide = (game) => borrowAndBuild(game, false);

/**
 * Borrows as much as the lenders allow and builds everything it can at once, as the reckless
 * borrower does, or, when `paysAsItGoes`, with the tax set to pay the repayments and the
 * building out of each quarter's revenue.
 */
function borrowAndBuild(game: GameState, paysAsItGoes: boolean): Decisions {
  const quartersLeft = electionStatus(game).quartersAway + 1;
  const reliefRegionId = hungriest(game);
  const start = withGrowingFarms(game, withRelief(game, usualServices(game), reliefRegionId));
  const dilemmaChoice = answer(game, (option) => approvalOf(option) + moneyOf(option) / 4);
  const startProjects = affordable(game, [...CHAIN, ...SMALL_SITES]);
  const choices = { reliefRegionId, dilemmaChoice, startProjects };
  const cost = startProjects.reduce((total, id) => total + costOf(game, id), 0);
  const left = Math.max(0, game.treasury - remainingCost(game) - cost);
  // What is left is spent within the year, or before the vote if that comes sooner.
  const allowance = Math.floor(left / Math.min(4, quartersLeft));
  // The reckless borrower budgets as if the repayments and what is being built cost nothing.
  const owing = paysAsItGoes
    ? 0
    : debtStatus(game).repayments +
      instalmentsDue(game) +
      startProjects.reduce((total, id) => total + siteStatus(game, id).instalment, 0);
  const budget = campaign(game, start, choices, -owing - allowance, -owing);
  const borrow = mostOnOffer(game);
  return { budget, ...choices, ...(borrow.length > 0 ? { borrow } : {}) };
}

/** Every empty site of the types given that the treasury can pay for, taken in that order. */
function affordable(game: GameState, order: readonly SiteType[]): string[] {
  let free = game.treasury - remainingCost(game);
  const chosen: string[] = [];
  for (const type of order) {
    for (const site of game.country.sites) {
      if (site.type !== type || siteStatus(game, site.id).state !== 'empty') continue;
      const { cost } = siteTerms(type);
      // A site is passed over when an alternative to it is already chosen.
      if (cost > free || startFault(game, [...chosen, site.id]) !== null) continue;
      chosen.push(site.id);
      free -= cost;
    }
  }
  return chosen;
}

function costOf(game: GameState, siteId: string): Money {
  const site = game.country.sites.find((candidate) => candidate.id === siteId);
  return site === undefined ? 0 : siteTerms(site.type).cost;
}

/**
 * As much as the lenders allow this quarter: the largest sum on offer at the lowest rate,
 * again and again until no more can be taken, loans and bonds alike.
 */
function mostOnOffer(game: GameState): Borrowing[] {
  const planned: Borrowing[] = [];
  for (;;) {
    const offers = [...loanOffers(game, planned), ...bondOffers(game, planned)].filter(
      (offer) => offer.unavailable === null,
    );
    const choice = offers.sort(
      (a, b) => b.amount - a.amount || a.annualRateBasisPoints - b.annualRateBasisPoints,
    )[0];
    if (choice === undefined) return planned;
    planned.push({ kind: choice.kind, amount: choice.amount, quarters: choice.quarters });
  }
}

/** What the sites being built cost this quarter. */
function instalmentsDue(game: GameState): Money {
  return game.country.sites.reduce((total, site) => {
    const status = siteStatus(game, site.id);
    return ['building', 'paused'].includes(status.state) ? total + status.instalment : total;
  }, 0);
}

type Choices = Omit<Decisions, 'budget'>;

/** The region that most needs relief: the furthest gone, and among equals the shortest. */
function hungriest(game: GameState): string | null {
  const stageOf = (regionId: string) =>
    FOOD_STAGES.indexOf(
      game.regions.find((region) => region.id === regionId)?.foodStage ?? 'adequate',
    );
  const { shortfalls } = previewAllowed(game, { budget: game.budget });
  const worst = [...shortfalls].sort(
    (a, b) => stageOf(b.regionId) - stageOf(a.regionId) || b.shortfall - a.shortfall,
  )[0];
  return worst?.regionId ?? null;
}

/** Relief spending set to what moves the food the chosen region is short of, and no more. */
function withRelief(game: GameState, budget: Budget, reliefRegionId: string | null): Budget {
  const none = spend(budget, 'foodRelief', 0);
  if (reliefRegionId === null) return none;
  const { relief } = previewAllowed(game, { budget: none, reliefRegionId });
  for (let amount = 0; amount <= budgetLimits.spending.max; amount += budgetLimits.spending.step) {
    const tried = spend(budget, 'foodRelief', amount);
    const moved = previewAllowed(game, { budget: tried, reliefRegionId }).relief;
    if (moved.capacity >= relief.shortfall) return tried;
  }
  return spend(budget, 'foodRelief', budgetLimits.spending.max);
}

/** A step more for the farms while the reserve is below its safe level, a step less when not. */
function withFarms(game: GameState, budget: Budget): Budget {
  const usual = game.country.start.budget.spending.agriculture;
  const { step, max } = budgetLimits.spending;
  const amount = foodStatus(game).belowSafeLevel ? Math.min(max, usual + 2 * step) : usual;
  return spend(budget, 'agriculture', amount);
}

/**
 * The budget with health, education and security back where the game began them: what a
 * campaign added is taken back once the vote is over.
 */
function usualServices(game: GameState): Budget {
  const { spending } = game.country.start.budget;
  return {
    ...game.budget,
    spending: {
      ...game.budget.spending,
      health: spending.health,
      education: spending.education,
      security: spending.security,
    },
  };
}

/**
 * The farms funded as the people to be fed grow in number: two steps more each quarter the
 * reserve is below its safe level, and one step less, down to the usual, each quarter it is not.
 */
function withGrowingFarms(game: GameState, budget: Budget): Budget {
  const usual = game.country.start.budget.spending.agriculture;
  const { step, max } = budgetLimits.spending;
  const now = budget.spending.agriculture;
  const amount = foodStatus(game).belowSafeLevel
    ? Math.min(max, Math.max(usual, now) + 2 * step)
    : Math.max(usual, now - step);
  return spend(budget, 'agriculture', amount);
}

/** The lowest tax rate at which the quarter leaves at least `floor` over. */
function balanced(game: GameState, budget: Budget, choices: Choices, floor: Money = 0): Budget {
  const { min, max }: { min: number; max: number } = budgetLimits.taxRatePercent;
  for (let rate = min; rate <= max; rate += 1) {
    const tried = { ...budget, taxRatePercent: rate };
    const preview = previewAllowed(game, { budget: tried, ...choices });
    if (preview.balance.min >= floor && !preview.spendingCut) return tried;
  }
  return { ...budget, taxRatePercent: max };
}

/**
 * A balanced budget with what the tax rate it keeps to can spare spent on health and
 * education, a step at a time to whichever has less. Prosperity is built from both.
 */
function invested(game: GameState, budget: Budget, choices: Choices, floor: Money): Budget {
  if (budget.taxRatePercent > habits.investAtTaxPercent) return budget;
  const { step, max } = budgetLimits.spending;
  let best: Budget = { ...budget, taxRatePercent: habits.investAtTaxPercent };
  for (;;) {
    const area = best.spending.health <= best.spending.education ? 'health' : 'education';
    if (best.spending[area] + step > max) return best;
    const tried = spend(best, area, best.spending[area] + step);
    const preview = previewAllowed(game, { budget: tried, ...choices });
    if (preview.balance.min < floor || preview.spendingCut) return best;
    best = tried;
  }
}

/**
 * The campaign budget: starting from one balanced to leave `from` over, it takes whichever single step the
 * preview says does most for approval for the money (a point off tax, or a step more on
 * health, education or security) until the quarter's allowance is spent.
 */
function campaign(
  game: GameState,
  start: Budget,
  choices: Choices,
  floor: Money,
  from: Money = 0,
): Budget {
  const heading = (budget: Budget) => previewAllowed(game, { budget, ...choices });
  let budget = balanced(game, start, choices, from);
  let now = heading(budget);
  for (;;) {
    let best: { budget: Budget; gain: number; preview: typeof now } | null = null;
    for (const tried of steps(budget)) {
      const preview = heading(tried);
      if (preview.spendingCut || preview.balance.min < floor) continue;
      const cost = now.balance.min - preview.balance.min;
      const won = preview.approvalHeading.min - now.approvalHeading.min;
      if (won <= 0 || cost <= 0) continue;
      const gain = won / cost;
      if (best === null || gain > best.gain) best = { budget: tried, gain, preview };
    }
    if (best === null) return budget;
    budget = best.budget;
    now = best.preview;
  }
}

/** The single steps a campaign can take from a budget. */
function steps(budget: Budget): Budget[] {
  const { taxRatePercent, spending } = budgetLimits;
  const tried: Budget[] = [];
  if (budget.taxRatePercent > taxRatePercent.min) {
    tried.push({ ...budget, taxRatePercent: budget.taxRatePercent - 1 });
  }
  for (const area of ['health', 'education', 'security'] as const) {
    const amount = budget.spending[area] + spending.step;
    if (amount <= spending.max) tried.push(spend(budget, area, amount));
  }
  return tried;
}

/** The next site to build: the first still empty of the types given, in that order. */
function nextSite(
  game: GameState,
  order: readonly SiteType[],
): { readonly siteId: string; readonly cost: Money } | null {
  for (const type of order) {
    const site = game.country.sites.find(
      (candidate) => candidate.type === type && siteStatus(game, candidate.id).state === 'empty',
    );
    if (site !== undefined) return { siteId: site.id, cost: siteTerms(type).cost };
  }
  return null;
}

/** What the sites being built have still to be paid. */
function remainingCost(game: GameState): Money {
  return game.country.sites.reduce((total, site) => {
    const status = siteStatus(game, site.id);
    if (!['building', 'paused'].includes(status.state)) return total;
    const paid = Math.floor((status.cost * status.quartersPaid) / status.buildQuarters);
    return total + status.cost - paid;
  }, 0);
}

/**
 * How the sensible player weighs an answer to a dilemma. Until the campaign it will not
 * spend below its cushion; once campaigning it pays whatever it can for approval. It buys
 * grain only when food is short somewhere or a harvest is in danger, and never sells grain
 * while the reserve is below its safe level.
 */
function judge(game: GameState, option: DilemmaOption, campaigning: boolean): number {
  const money = moneyOf(option);
  const grain = grainOf(option);
  const quarterly = SPENDING_AREAS.reduce((total, area) => total + game.budget.spending[area], 0);
  const cushion = campaigning ? 0 : habits.cushionQuarters * quarterly;
  if (money < 0 && game.treasury + money < cushion) return -1_000_000;
  const belowSafe = foodStatus(game).belowSafeLevel;
  if (grain < 0 && belowSafe) return -1_000_000;
  const foodInDanger =
    game.events.length > 0 || game.regions.some((region) => region.foodStage !== 'adequate');
  // A tonne of grain is worth having when food is in danger, and worth nothing to it otherwise.
  const grainWorth = grain > 0 && belowSafe && foodInDanger ? grain / 100 : 0;
  return approvalOf(option) * (campaigning ? 3 : 1) + money / 4 + grainWorth;
}

function spend(budget: Budget, area: SpendingArea, amount: Money): Budget {
  return { ...budget, spending: { ...budget.spending, [area]: amount } };
}

/** An amount brought down to a whole step of spending. */
function stepped(amount: Money): Money {
  const { step } = budgetLimits.spending;
  return Math.max(0, Math.floor(amount / step) * step);
}

/** How the timing trader trades. These are its habits, not the game's rules. */
const traderHabits = {
  /**
   * The grain it keeps in the national reserve, in thousandths of its safe level: it sells
   * only what is above this, and stocks up to it when grain is cheap or about to grow dear.
   */
  keepPermille: 1250,
  /** It sells when the world grain price is at least this share of its usual price. */
  sellAtPermille: 1000,
  /** It stocks up when the world grain price is at most this share of its usual price. */
  buyAtPermille: 900,
  /**
   * The most of the money free to spend it puts into grain the reserve does not yet need, in
   * thousandths. Grain for a reserve below its safe level while people go hungry it buys with
   * all the money free.
   */
  mostOnStockPermille: 500,
} as const;

/**
 * The timing trader's orders for the quarter, on top of what it has already decided: it buys
 * grain when the reserve is short, and stocks up when grain is cheap or failed harvests abroad
 * are announced; it sells what the reserve holds above what it keeps when grain is dear, but
 * not while failed harvests abroad are still to come, which will make it dearer.
 */
function timedTrade(game: GameState, decisions: Decisions, heedsShocks = true): TradeOrder[] {
  const grain = priceStatus(game, 'grain');
  const { quarterlyConsumption, safeReserveMonths } = foodStatus(game);
  const safe = Math.ceil((safeReserveMonths * quarterlyConsumption) / 3);
  const keep = Math.floor((safe * traderHabits.keepPermille) / 1000);
  const dearer =
    heedsShocks &&
    grain.shocks.some((shock) => shock.type === 'failedHarvestsAbroad' && !shock.inForce);
  const cheap = grain.price * 1000 <= grain.usual * traderHabits.buyAtPermille;
  const dear = grain.price * 1000 >= grain.usual * traderHabits.sellAtPermille;
  const hungry = game.regions.some((region) => region.foodStage !== 'adequate');
  const carried = wholeSteps(tradeCapacity(game).free);
  const reserve = game.foodReserve;

  const starting = (decisions.startProjects ?? []).reduce(
    (total, id) => total + costOf(game, id),
    0,
  );
  const free = Math.max(0, game.treasury - remainingCost(game) - starting);
  const urgent = reserve < safe && hungry;
  let wanted = urgent ? safe - reserve : 0;
  if (cheap || dearer) wanted = Math.max(wanted, keep - reserve);
  if (wanted > 0) {
    const money = urgent ? free : Math.floor((free * traderHabits.mostOnStockPermille) / 1000);
    for (let tonnes = Math.min(carried, roundUp(wanted)); tonnes > 0; tonnes -= ORDER_STEP_TONNES) {
      const terms = importTerms(game, 'grain', tonnes);
      if (terms.unavailable === null && terms.cost <= money) {
        return [{ good: 'grain', direction: 'import', tonnes }];
      }
    }
    return [];
  }
  const surplus = wholeSteps(Math.min(carried, reserve - keep));
  if (dear && surplus > 0) {
    for (let tonnes = surplus; tonnes > 0; tonnes -= ORDER_STEP_TONNES) {
      if (exportTerms(game, 'grain', tonnes).unavailable === null) {
        return [{ good: 'grain', direction: 'export', tonnes }];
      }
    }
  }
  return [];
}

/** A weight brought down to a whole number of order steps. */
function wholeSteps(tonnes: number): number {
  return Math.max(0, Math.floor(tonnes / ORDER_STEP_TONNES) * ORDER_STEP_TONNES);
}

/** A weight brought up to a whole number of order steps. */
function roundUp(tonnes: number): number {
  return Math.ceil(tonnes / ORDER_STEP_TONNES) * ORDER_STEP_TONNES;
}

/**
 * Plays as the chain builder does in everything but trade, so that the two differ only in it:
 * it buys grain in shortages and when it is cheap, and sells the reserve's surplus when it is
 * dear, watching for failed harvests abroad.
 */
const timingTrader: Decide = (game) => trading(game, true);

/** The chain builder's decisions with the timing trader's orders, heeding shocks or not. */
function trading(game: GameState, heedsShocks: boolean): Decisions {
  const decisions = chainBuilder(game);
  const trade = timedTrade(game, decisions, heedsShocks);
  return trade.length > 0 ? { ...decisions, trade } : decisions;
}

export const SCRIPTED_PLAYERS: readonly ScriptedPlayer[] = [
  {
    name: 'Does nothing',
    manner: 'Keeps the starting budget, sends no relief, builds nothing.',
    decide: doesNothing,
  },
  {
    name: 'Popularity',
    manner: 'Lowest tax, everything on health, education and security, nothing else.',
    decide: popularity,
  },
  {
    name: 'Sensible',
    manner:
      'Balances the budget, relieves hunger, builds small sites early, and spends its savings before the vote. Builds no large sites.',
    decide: sensible,
  },
  {
    name: 'Chain builder',
    manner:
      'Plays as the sensible player does, and goes on to build power and the mine with its road and port.',
    decide: chainBuilder,
  },
  {
    name: 'Sensible borrower',
    manner:
      'Plays as the chain builder does, but borrows for each site it cannot yet pay for, loans and then bonds, within limits of its own.',
    decide: sensibleBorrower,
  },
  {
    name: 'Reckless borrower',
    manner:
      'Borrows all the lenders allow, builds whatever that pays for, spends the rest on approval and leaves the repayments to the treasury.',
    decide: recklessBorrower,
  },
  {
    name: 'Timing trader',
    manner:
      'Plays as the chain builder does, and trades grain with timing: buys in shortages and when it is cheap, sells the surplus when it is dear.',
    decide: timingTrader,
  },
  {
    name: 'Mine only',
    manner:
      'Plays as the chain builder does, but builds the mine with its road and port and no power, and never trades.',
    decide: builder(['port', 'trunkRoad', 'mine', ...SMALL_SITES]),
  },
];

/** The hungriest region relieved, at whatever relief costs, on top of a budget. */
function relieving(
  game: GameState,
  budget: Budget,
): { budget: Budget; reliefRegionId: string | null } {
  const reliefRegionId = hungriest(game);
  return { budget: withRelief(game, budget, reliefRegionId), reliefRegionId };
}

const firstOption: (option: DilemmaOption) => number = () => 0;

/**
 * Players that each lean on one lever, or build only part of what the chain builder builds.
 * They are not part of the balance targets: they are here to show whether any single trick
 * wins on its own, and what each large project is worth (`BALANCE_PLAYERS=all`).
 */
export const DEGENERATE_PLAYERS: readonly ScriptedPlayer[] = [
  {
    name: 'Relief only',
    manner: 'The starting budget, with relief sent wherever people are hungry.',
    decide: (game) => ({
      ...relieving(game, game.budget),
      dilemmaChoice: answer(game, changesNothing),
    }),
  },
  {
    name: 'Lowest tax',
    manner: 'Tax at the minimum, relief, and whatever the rest of the starting budget can keep.',
    decide: (game) => ({
      ...relieving(game, { ...game.budget, taxRatePercent: budgetLimits.taxRatePercent.min }),
      dilemmaChoice: answer(game, changesNothing),
    }),
  },
  {
    name: 'Says yes',
    manner: 'The starting budget and relief, taking the first answer to every dilemma.',
    decide: (game) => ({
      ...relieving(game, game.budget),
      dilemmaChoice: answer(game, firstOption),
    }),
  },
  {
    name: 'Squeeze then spend',
    manner:
      'Top tax and nothing for services until the campaign, then everything saved on approval.',
    decide: (game) => {
      const quartersLeft = electionStatus(game).quartersAway + 1;
      const squeezed: Budget = {
        taxRatePercent: budgetLimits.taxRatePercent.max,
        spending: { ...game.budget.spending, health: 0, education: 0, security: 0 },
      };
      const { budget, reliefRegionId } = relieving(game, squeezed);
      const choices = { reliefRegionId, dilemmaChoice: answer(game, changesNothing) };
      if (quartersLeft > habits.campaignQuarters) return { budget, ...choices };
      const allowance = Math.floor(game.treasury / quartersLeft);
      return { budget: campaign(game, budget, choices, -allowance), ...choices };
    },
  },
  {
    name: 'Power only',
    manner: 'Plays as the chain builder does, but builds only the power station and its lines.',
    decide: builder(['powerStation', 'powerLine', ...SMALL_SITES]),
  },
  {
    name: 'Chain by the quay',
    manner: 'Plays as the chain builder does, but ships through the shallow port.',
    decide: builder([
      'powerStation',
      'powerLine',
      'shallowPort',
      'trunkRoad',
      'mine',
      ...SMALL_SITES,
    ]),
  },
  {
    name: 'Borrow and build at once',
    manner:
      'Borrows all the lenders allow and builds everything at once, as the reckless borrower does, but taxes enough to pay the repayments and the building as it goes.',
    decide: (game) => borrowAndBuild(game, true),
  },
  {
    name: 'Borrower wary of gluts',
    manner:
      'Plays as the sensible borrower does, but borrows nothing while an ore glut is announced or in force.',
    decide: builder(BORROWER_ORDER, borrowsUnlessGlut),
  },
  {
    name: 'Trader blind to shocks',
    manner:
      'Trades as the timing trader does, but pays no heed to failed harvests abroad until they move the price.',
    decide: (game) => trading(game, false),
  },
  {
    name: 'Hover then spend',
    manner:
      'Tax as high as keeps approval just clear of strikes until the campaign, then everything saved on approval.',
    decide: (game) => {
      const quartersLeft = electionStatus(game).quartersAway + 1;
      const start = relieving(game, withFarms(game, usualServices(game)));
      const choices = {
        reliefRegionId: start.reliefRegionId,
        dilemmaChoice: answer(game, (option) => approvalOf(option) + moneyOf(option) / 4),
      };
      if (quartersLeft <= habits.campaignQuarters) {
        const allowance = Math.floor(game.treasury / quartersLeft);
        return { budget: campaign(game, start.budget, choices, -allowance), ...choices };
      }
      // The highest tax that leaves approval heading for a little above the strike line.
      const line = approvalStatus(game).strikesBelow + 30;
      let budget = balanced(game, start.budget, choices);
      for (
        let rate = budget.taxRatePercent + 1;
        rate <= budgetLimits.taxRatePercent.max;
        rate += 1
      ) {
        const tried = { ...budget, taxRatePercent: rate };
        const preview = previewAllowed(game, { budget: tried, ...choices });
        if (preview.approvalHeading.min < line || preview.unrest.length > 0) break;
        budget = tried;
      }
      return { budget, ...choices };
    },
  },
];
