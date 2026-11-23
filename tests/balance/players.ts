import {
  approvalStatus,
  bondOffers,
  borrowingBarred,
  budgetLimits,
  buildingBarred,
  debtStatus,
  depositIn,
  electionStatus,
  FOOD_STAGES,
  foodStatus,
  onSurvey,
  onTechnology,
  pendingDilemma,
  ORDER_STEP_TONNES,
  planFault,
  previewQuarter,
  priceStatus,
  researchStatuses,
  siteStatus,
  siteTerms,
  startFault,
  SPENDING_AREAS,
  surveyStatuses,
  technologiesNeeded,
  technologyGains,
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
  type ProjectPlan,
  type SiteType,
  type SpendingArea,
  type Technology,
  type TechnologyStatus,
  type TradeOrder,
  withinAusterity,
} from '../../src/sim';
import type { Decide } from './batch';

/**
 * The decisions brought within what austerity allows. The players plan as if there were none:
 * during it their budget is brought within its limits and they start and borrow nothing,
 * which is what a player who knew no better would be held to. Research and surveys are
 * projects too, and are started no more than sites are.
 */
export function withinRules(game: GameState, decisions: Decisions): Decisions {
  const { startProjects, startResearch, startSurveys, borrow, ...rest } = decisions;
  const building = buildingBarred(game) === null;
  const borrowing = borrowingBarred(game) === null && borrow !== undefined;
  return {
    ...rest,
    budget: withinAusterity(game, decisions.budget),
    ...(building && startProjects !== undefined ? { startProjects } : {}),
    ...(building && startResearch !== undefined ? { startResearch } : {}),
    ...(building && startSurveys !== undefined ? { startSurveys } : {}),
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
 * person at the screen: the state, the preview, the sites, the research tree, the surveys and
 * the dilemma put to them.
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
  return (game) => steward(game, { sites: ofTypes(order) }, lending);
}

/**
 * What a sensible player sets out to build and to find out. Every one of them builds sites;
 * research and surveys are for the players that study.
 */
interface Pursuits {
  /** The sites it means to build, by id, in the order it builds them. */
  readonly sites: (game: GameState) => readonly string[];
  /**
   * The technologies it wants known, the one it would rather have first. What each needs
   * before it can be researched is researched on the way, and is not listed.
   */
  readonly technologies?: (game: GameState) => readonly Technology[];
  /** Whether it surveys every region where ore may lie. */
  readonly surveys?: boolean;
}

/**
 * Every site of the types given: type by type in that order, and within a type in the
 * country file's.
 */
function ofTypes(types: readonly SiteType[]): Pursuits['sites'] {
  return (game) =>
    types.flatMap((type) =>
      game.country.sites.filter((site) => site.type === type).map((site) => site.id),
    );
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
 * borrows puts money by for each bond's maturity, and does not count it as savings. A player
 * that studies starts its research and surveys ahead of the next site, each as soon as the
 * money free covers it, and saves for them as it does for a site.
 */
function steward(game: GameState, pursuits: Pursuits, lending: Lending): Decisions {
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

  const next = nextSite(game, pursuits.sites(game));
  // What is already promised to what is being built, researched or surveyed is not there to spend.
  const unpromised = savings - remainingCost(game);
  const study = studies(game, pursuits, unpromised);
  const free = unpromised - study.cost;
  const startProjects = next !== null && next.cost <= free ? [next.siteId] : [];
  const borrow = next !== null && startProjects.length === 0 ? lending(game, next.cost - free) : [];
  const nothingLeft = next === null && !study.more;
  // It saves for the next site only when it is not borrowing for it.
  const saving = nothingLeft || borrow.length > 0 ? 0 : habits.savingPerQuarter;
  const floor = saving + putBy.thisQuarter - Math.min(instalmentsDue(game), savings);
  budget = balanced(game, budget, choices, floor);
  if (nothingLeft) budget = invested(game, budget, choices, floor);
  const starts = { startProjects, ...study.starts };
  if (startProjects.length > 0 || study.cost > 0) {
    // A player that borrows has the site's cost in hand, and pays its first instalment from it.
    const first =
      lending === savesUp || next === null || startProjects.length === 0
        ? 0
        : siteStatus(game, next.siteId).instalment;
    budget = balanced(game, budget, { ...choices, ...starts }, floor - first);
  }
  return { budget, ...choices, ...starts, ...(borrow.length > 0 ? { borrow } : {}) };
}

/**
 * The research and surveys a player that studies starts this quarter: what it starts, what
 * that costs in all, and whether anything it wants is still to be started.
 */
interface Study {
  readonly starts: Pick<ProjectPlan, 'startResearch' | 'startSurveys'>;
  readonly cost: Money;
  readonly more: boolean;
}

/**
 * What a player starts this quarter of the research and surveys it pursues, with `free` to
 * spend: the surveys first, of each region where ore may lie that is not yet surveyed, and
 * then the next technology on the way to those it wants. Each is started only if the money
 * free covers its whole cost beside the others, and the game allows it beside them.
 */
function studies(game: GameState, pursuits: Pursuits, free: Money): Study {
  const startSurveys: string[] = [];
  let cost = 0;
  let more = false;
  if (pursuits.surveys === true) {
    for (const region of surveyStatuses(game, {})) {
      if (region.state !== 'unsurveyed') continue;
      more = true;
      const fault = planFault(game, { startSurveys }, onSurvey(region.regionId));
      if (region.cost > free - cost || fault !== null) continue;
      startSurveys.push(region.regionId);
      cost += region.cost;
    }
  }
  const surveys = startSurveys.length > 0 ? { startSurveys } : {};
  const research = researchTowards(game, pursuits.technologies?.(game) ?? []);
  more ||= research.more;
  const { next } = research;
  if (next === null || next.cost > free - cost) return { starts: surveys, cost, more };
  if (planFault(game, surveys, onTechnology(next.technology)) !== null) {
    return { starts: surveys, cost, more };
  }
  return {
    starts: { ...surveys, startResearch: next.technology },
    cost: cost + next.cost,
    more,
  };
}

/**
 * The research the technologies a player wants call for: the technology to start on `next`,
 * or null when there is none or one is being researched, since one technology is researched
 * at a time; and whether any is still to be started (`more`). It makes for the wanted
 * technology that costs least to reach, counting what it needs first and is not yet known,
 * and among equals for the one listed first; and it starts with whatever that needs first.
 */
function researchTowards(
  game: GameState,
  wanted: readonly Technology[],
): { readonly next: TechnologyStatus | null; readonly more: boolean } {
  if (wanted.length === 0) return { next: null, more: false };
  const tree = researchStatuses(game, null);
  /** A technology and all it needs first, less what is known: what is needed first, first. */
  const wayTo = (technology: Technology): TechnologyStatus[] => {
    const status = tree.find((each) => each.technology === technology);
    if (status === undefined || status.state === 'known') return [];
    return [...new Set([...status.prerequisites.flatMap(wayTo), status])];
  };
  const underWay = (each: TechnologyStatus) => ['researching', 'paused'].includes(each.state);
  const ways = wanted.map(wayTo).filter((way) => way.length > 0);
  const more = ways.some((way) => way.some((each) => !underWay(each)));
  if (tree.some(underWay)) return { next: null, more };
  const costOf = (way: readonly TechnologyStatus[]) =>
    way.reduce((total, each) => total + each.cost, 0);
  const nearest = [...ways].sort((a, b) => costOf(a) - costOf(b))[0];
  return { next: nearest?.find((each) => each.state === 'available') ?? null, more };
}

/**
 * The technologies not yet known that would improve a site in use, as the research tab says
 * of each (`technologyGains`), in the tree's order: what a player wants that researches the
 * improvements to what it has built.
 */
function improvingWhatIsBuilt(game: GameState): Technology[] {
  return researchStatuses(game, null)
    .filter((each) => each.state !== 'known')
    .filter((each) => technologyGains(game, each.technology).sites.length > 0)
    .map((each) => each.technology);
}

/**
 * Plays as the chain builder does and builds the same sites in the same order, and researches
 * the improvements to what it has built: whenever a site in use stands to gain from a
 * technology, it makes for that technology, the nearest first, by way of whatever it needs
 * first. It starts each as soon as the money free covers it, ahead of the next site. Its twin
 * is the chain builder, which researches nothing: the difference between them is what
 * improving sites is worth.
 */
const improver: Decide = (game) =>
  steward(
    game,
    { sites: ofTypes([...CHAIN, ...SMALL_SITES]), technologies: improvingWhatIsBuilt },
    savesUp,
  );

/**
 * The sites that cannot be started until a technology is known, known yet or not, in the
 * country file's order: those of a type research unlocks, and those the country file says
 * need one.
 */
function sitesToUnlock(game: GameState): string[] {
  return game.country.sites
    .filter((site) => technologiesNeeded(site).length > 0)
    .map((site) => site.id);
}

/**
 * The sites a player leaves alone for the sake of those it means to unlock: an alternative to
 * one of them not yet begun, since building on it would rule that one out, and whatever
 * depends on a site left alone, since it would stand idle. Once the unlocked site is begun
 * its alternative is closed, and what depended on it waits no longer: it will do for them
 * what the alternative would have.
 */
function leftAloneFor(game: GameState, unlocking: readonly string[]): ReadonlySet<string> {
  const { sites } = game.country;
  const awaited = sites.filter(
    (site) =>
      unlocking.includes(site.id) && ['locked', 'empty'].includes(siteStatus(game, site.id).state),
  );
  const left = new Set(
    sites
      .filter(
        (site) =>
          !unlocking.includes(site.id) &&
          awaited.some(
            (other) => other.alternatives.includes(site.id) || site.alternatives.includes(other.id),
          ),
      )
      .map((site) => site.id),
  );
  // What depends on a site left alone is left alone too, and so on down the line.
  let grew = true;
  while (grew) {
    grew = false;
    for (const site of sites) {
      if (left.has(site.id) || unlocking.includes(site.id)) continue;
      if (site.dependsOn.some((id) => left.has(id))) {
        left.add(site.id);
        grew = true;
      }
    }
  }
  return left;
}

/**
 * Plays as the chain builder does, but chases the sites research unlocks. From the first
 * quarter it makes for the technologies the country's locked sites wait on, the nearest
 * first, by way of whatever each needs first, and starts each as soon as the money free
 * covers it, ahead of the next site. A site it has unlocked it builds before anything else.
 * The rest it builds in the chain builder's order.
 *
 * It gives up nothing for a locked site: where one is an alternative to a site the chain
 * builder builds, as Tavara's dam is to its power station, it builds that site in its turn,
 * which closes the locked one, and then no longer makes for what would have unlocked it.
 * `holdingOut`, it instead leaves alone whatever would rule a locked site out, and what
 * depends on that, until the locked site is begun: in Tavara the power station and the power
 * lines, which wait for the dam.
 *
 * Its twin is the chain builder, which researches nothing and so never builds a site research
 * unlocks: the difference between them is what chasing new types of site is worth.
 */
function unlocking(holdingOut: boolean): Decide {
  return (game) =>
    steward(
      game,
      {
        sites: (now) => {
          const chased = sitesToUnlock(now);
          const left = holdingOut ? leftAloneFor(now, chased) : new Set<string>();
          const rest = ofTypes([...CHAIN, ...SMALL_SITES])(now);
          return [...chased, ...rest.filter((id) => !chased.includes(id) && !left.has(id))];
        },
        // A site an alternative has closed is locked by nothing, so nothing is researched for it.
        technologies: (now) => [
          ...new Set(sitesToUnlock(now).flatMap((id) => siteStatus(now, id).lockedBy)),
        ],
      },
      savesUp,
    );
}

/**
 * The sites of the deposits the surveys have found, deposit by deposit in the country file's
 * order of regions: the trunk road first, which the mine depends on, and then the mine.
 */
function sitesFound(game: GameState): string[] {
  return surveyStatuses(game, {}).flatMap((region) => {
    const deposit = region.found === null ? null : depositIn(game.country, region.regionId);
    return deposit === null ? [] : [deposit.route.id, deposit.mine.id];
  });
}

/**
 * Plays as the chain builder does, but surveys early and builds what it finds. Before it
 * builds anything it starts a survey of every region where ore may lie, each as soon as the
 * money free covers it. The road and the mine of each deposit found it builds once the
 * chain builder's own large sites are built, the mine's chain among them, whose port the
 * found mines ship through, and before the small sites. Its twin is the chain builder, which
 * never surveys and so builds only the mine the country shows: the difference between them is
 * what surveying is worth.
 */
const prospector: Decide = (game) =>
  steward(
    game,
    {
      sites: (now) => {
        const found = sitesFound(now);
        const shown = (types: readonly SiteType[]) =>
          ofTypes(types)(now).filter((id) => !found.includes(id));
        return [...shown(CHAIN), ...found, ...shown(SMALL_SITES)];
      },
      surveys: true,
    },
    savesUp,
  );

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

/** What the sites being built, and the research and surveys under way, cost this quarter. */
function instalmentsDue(game: GameState): Money {
  const sites = game.country.sites.reduce((total, site) => {
    const status = siteStatus(game, site.id);
    return ['building', 'paused'].includes(status.state) ? total + status.instalment : total;
  }, 0);
  return studiesUnderway(game).reduce((total, study) => total + study.instalment, sites);
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

/** The next site to build: the first still empty of those given, in that order. */
function nextSite(
  game: GameState,
  order: readonly string[],
): { readonly siteId: string; readonly cost: Money } | null {
  for (const siteId of order) {
    const status = siteStatus(game, siteId);
    if (status.state === 'empty') return { siteId, cost: status.cost };
  }
  return null;
}

/** What the sites being built, and the research and surveys under way, have still to be paid. */
function remainingCost(game: GameState): Money {
  const sites = game.country.sites.reduce((total, site) => {
    const status = siteStatus(game, site.id);
    if (!['building', 'paused'].includes(status.state)) return total;
    const paid = Math.floor((status.cost * status.quartersPaid) / status.buildQuarters);
    return total + status.cost - paid;
  }, 0);
  return studiesUnderway(game).reduce((total, study) => {
    const paid = Math.floor((study.cost * study.quartersPaid) / study.quarters);
    return total + study.cost - paid;
  }, sites);
}

/** Research or a survey under way, as far as paying for it goes. */
interface StudyUnderway {
  readonly cost: Money;
  /** How many quarters it takes in all, and how many of them are paid for. */
  readonly quarters: number;
  readonly quartersPaid: number;
  /** What its next quarter costs. */
  readonly instalment: Money;
}

/** The research and the surveys under way, those paused for want of money among them. */
function studiesUnderway(game: GameState): StudyUnderway[] {
  // Most games have none: only a player that studies starts any.
  const any = game.projects.some(
    ({ target, status }) => target.kind !== 'site' && ['building', 'paused'].includes(status),
  );
  if (!any) return [];
  return [
    ...researchStatuses(game, null)
      .filter((each) => ['researching', 'paused'].includes(each.state))
      .map((each) => ({ ...each, quarters: each.researchQuarters })),
    ...surveyStatuses(game, {})
      .filter((each) => ['surveying', 'paused'].includes(each.state))
      .map((each) => ({ ...each, quarters: each.surveyQuarters })),
  ];
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
 * are announced; it sells what the reserve holds above what it keeps when grain is at or above
 * its usual price. It sells even while failed harvests abroad are still to come: the trade
 * links cap what it can sell in a quarter, so a quarter held back is a sale lost.
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
  {
    name: 'Improver',
    manner:
      'Plays as the chain builder does, and researches each technology that improves a site it has in use, by way of whatever that needs first.',
    decide: improver,
  },
  {
    name: 'Unlocker',
    manner:
      'Plays as the chain builder does, but researches towards every site a technology unlocks and builds each once it is unlocked, before anything else. It gives up no site for one: a locked site that an earlier site rules out goes unbuilt.',
    decide: unlocking(false),
  },
  {
    name: 'Prospector',
    manner:
      'Plays as the chain builder does, but first surveys every region where ore may lie, and builds the road and mine of each deposit found once its other large sites are built.',
    decide: prospector,
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
  {
    name: 'Unlocker holding out',
    manner:
      'Plays as the unlocker does, but leaves alone whatever would rule a locked site out, and what depends on it, until the locked site is begun.',
    decide: unlocking(true),
  },
];
