import { approvalStatus, resolveApproval, startingApproval, type ApprovalInputs } from './approval';
import { sum } from './arithmetic';
import { austerityBudgetFault } from './austerity';
import { bailoutPushes, budgetAfter, resolveBailout } from './bailout';
import { balance } from './balance';
import { nextDate, quartersUntilHarvest } from './calendar';
import {
  budgetEntry,
  checkBudget,
  cutEntry,
  resolveBudget,
  revenueOf,
  withBorrowed,
  withFixedCosts,
  type BudgetOutcome,
} from './budget';
import {
  borrowFault,
  debtBurden,
  debtOf,
  serveDebts,
  startingDebts,
  takeDebts,
  type Borrowing,
} from './debt';
import { deficitOf, openingCredit, reassessCredit, recordAfter } from './credit';
import { regionName, type Country } from './country';
import {
  answerDilemma,
  ariseDilemma,
  choiceFault,
  rollDilemmas,
  type DilemmaOutcome,
} from './dilemmas';
import { forecastVoteShare, holdElection, isElectionQuarter, rollSwing } from './election';
import {
  beginEntry,
  beginStruck,
  describeEventWithHold,
  endEntry,
  endEventsAfterHarvest,
  harvestPermille,
  rollEvents,
  siteDamageOf,
  worstHarvestPermille,
  type ActiveEvent,
  type EventStrike,
} from './events';
import {
  forecastFood,
  reliefCapacity,
  resolveFood,
  regionKeep,
  type FoodInputs,
  type FoodSituation,
} from './food';
import { vitalSigns } from './history';
import {
  resolveProjects,
  siteEffects,
  startFault,
  type BuildingOutcome,
  type Project,
  type SiteEffects,
} from './projects';
import {
  prosperityFigure,
  prosperityStatus,
  resolveServices,
  startingServices,
} from './prosperity';
import { pushesInto, rollPriceShocks, turnShocks } from './priceShocks';
import { compileReport, type ReportEntry } from './report';
import { expectationsIn, nextTier, tierAt, tierEntry } from './tiers';
import { heldAfter, victoryOf } from './victory';
import { nextRandom, seedGenerator, type RngState } from './rng';
import type { Decisions, GameState, Outcome, Preview, RegionState, TurnResult } from './state';
import { scheduleAhead } from './timeline';
import { routeCarriage } from './tradeRoutes';
import {
  FULL_SWING_PERMILLE,
  movePrices,
  openingPrices,
  resolveTrade,
  rollPrices,
  tradeFault,
  type TradeOrder,
  type TradeOutcome,
  type WorldPrices,
} from './trade';
import { GOODS, type PriceShockType } from './vocabulary';
import { exactly, type Contribution, type Money } from './types';
import { damageSites, resolveUpkeep } from './upkeep';

/** Starts a game. The same country and seed always start the same game. */
export function createGame(country: Country, seed: number): GameState {
  const approval = startingApproval(country);
  const services = startingServices(country);
  const date = { year: 1, quarter: 1 } as const;
  const opening = {
    country,
    projects: [],
    // The rating the game opens at follows from the debt it starts with.
    debts: startingDebts(country.start.loans, date),
    budget: country.start.budget,
    date,
    treasury: country.start.treasury,
    foodReserve: country.start.foodReserve,
    worldPrices: openingPrices(),
    priceShocks: [],
    tradeCarried: [],
    regions: country.regions.map((region): RegionState => ({
      id: region.id,
      population: region.population,
      output: region.output,
      foodStock: regionKeep(region.population),
      weather: 0,
      foodStage: 'adequate',
      famineQuarters: 0,
      ...approval,
      ...services,
    })),
  } as const;
  const signs = vitalSigns(opening);
  // The game begins in whatever tier its starting prosperity reaches.
  const tier = tierAt(signs.prosperity ?? 0);
  return {
    seed,
    rng: seedGenerator(seed),
    ...opening,
    reliefRegionId: null,
    agricultureSpentThisYear: 0,
    events: [],
    history: [signs],
    dilemma: null,
    dilemmasAnswered: [],
    credit: openingCredit(opening),
    tier,
    startingTier: tier,
    prosperousQuarters: 0,
    austerity: null,
    outcome: { status: 'playing' },
  };
}

/**
 * Resolves the current quarter with the player's decisions and moves the date on.
 * @throws RangeError when a decision is outside what the game allows.
 * @throws Error when the game is already over.
 */
export function advanceQuarter(state: GameState, decisions: Decisions): TurnResult {
  checkDecisions(state, decisions);
  // Everything chance decides is drawn here, in a fixed order, and nowhere else.
  const weather = rollWeather(state.rng, state.regions.length);
  const next = nextDate(state.date);
  // World prices, like the dilemmas, answer to the seed and the quarter alone.
  const priceShocks = rollPrices(state.seed, next);
  // So do the world price shocks announced, which strike no region.
  const shocksAnnounced = rollPriceShocks(state.country, state.seed, next);
  const events = rollEvents(state.country, next, weather.rng);
  const campaign = isElectionQuarter(state.date) ? rollSwing(events.rng) : null;
  const resolved = resolveQuarter(state, decisions, {
    weatherShocks: weather.shocks,
    struck: events.struck,
    swing: campaign?.swing ?? 0,
    priceShocks,
    shocksAnnounced,
    // Dilemmas answer to the seed and the quarter alone, and leave the generator untouched.
    dilemmaRolls: rollDilemmas(state.seed, next),
  });
  // The campaign's draw counts only if the vote was held: a state that fell held none.
  const rng = resolved.electionHeld && campaign !== null ? campaign.rng : events.rng;
  return { state: { ...resolved.state, rng }, report: resolved.report };
}

/**
 * What chance decides in a quarter. A turn draws it from the game's generator; a projection
 * supposes it, which is how the game looks ahead without drawing anything.
 */
export interface Chance {
  /** How far the quarter's weather moves each region's coming harvest, in thousandths. */
  readonly weatherShocks: readonly number[];
  /** The events that strike as the calendar moves into the next quarter. */
  readonly struck: readonly EventStrike[];
  /** How far the campaign moves the vote, in thousandths, if an election is held. */
  readonly swing: number;
  /**
   * How far world markets move each good's price this quarter, as a share of its full swing
   * in thousandths, in the goods' order. A good with none given does not move but for the
   * pull back towards its usual price.
   */
  readonly priceShocks: readonly number[];
  /**
   * The world price shocks announced as the calendar moves into the next quarter. One of a
   * kind already announced or in force is not announced again.
   */
  readonly shocksAnnounced: readonly PriceShockType[];
  /**
   * The roll for each kind of dilemma, from 0 up to 1, in the vocabulary's order. One
   * arises when its roll falls under its chance. A kind with no roll does not arise.
   */
  readonly dilemmaRolls: readonly number[];
}

/** A quarter resolved, with the signs of trouble a projection looks for. */
export interface QuarterResolved extends TurnResult {
  /** True when the treasury could not cover the budget and every area was cut. */
  readonly spendingCut: boolean;
  /** The sites where building paused because the treasury could not pay. */
  readonly pausedSites: readonly string[];
  /** The sites in use that went without upkeep, and are decaying from the next quarter. */
  readonly upkeepShort: readonly string[];
  /** What fell due on debts and could not be paid. */
  readonly missedPayment: Money;
  /** The debts a payment was missed on, by name. */
  readonly missedOn: readonly string[];
  /** True when a missed payment brought a bailout, outside austerity. */
  readonly bailedOut: boolean;
  /** What the quarter's payments on debts took off the principal owed. */
  readonly principalRepaid: Money;
  /** What borrowing brought into the treasury as the quarter ended. */
  readonly borrowed: Money;
  /** What was paid for goods bought abroad as the quarter ended. */
  readonly tradePaid: Money;
  /** What goods sold abroad brought in as the quarter ended. */
  readonly tradeEarned: Money;
  /** The share of their needs each region's people ate, in thousandths, in the regions' order. */
  readonly fedPermille: readonly number[];
  readonly electionHeld: boolean;
}

/**
 * One quarter, given the decisions and what chance decided. It checks nothing and draws
 * nothing: the generator in the state it returns is the one it was given.
 */
export function resolveQuarter(
  given: GameState,
  decisions: Decisions,
  chance: Chance,
): QuarterResolved {
  // The world prices move as the quarter ends, pushed by any world price shock in force. The
  // quarter earns at the prices it began with, and is judged as it ends at the prices it leaves.
  const date = nextDate(given.date);
  const worldPrices = movePrices(
    given.worldPrices,
    chance.priceShocks,
    pushesInto(given.priceShocks, date),
  );
  const lived = liveQuarter(given, decisions, chance.weatherShocks, worldPrices);
  const { answer, state, budget, building, upkept, finances, agricultureSpent, food, approval } =
    lived;
  const { serviced, taken, traded, credit, bailout } = lived;
  const { prosperity, tier } = lived;
  const passed = tierEntry(state.tier, tier, state.startingTier, prosperity.value);

  // A harvest ends the events that were waiting on it; then the new quarter may bring more.
  const { ended, remaining } =
    food.harvest === null
      ? { ended: [], remaining: state.events }
      : endEventsAfterHarvest(state.events);
  const begun = beginStruck(remaining, chance.struck, date);
  // An event that damages sites sets those in use in its region decaying as it begins.
  const damaged = damageSites(
    { country: state.country, projects: upkept.projects },
    siteDamageOf(state.country, begun),
  );
  const collapse = collapseOf(state.country, approval.regions);
  // The vote is held as each term's last quarter ends, unless the state has already fallen.
  const election =
    collapse === null && isElectionQuarter(state.date)
      ? holdElection(approval.regions, chance.swing, state.date)
      : null;
  // The game is won on prosperity held long enough, by a government still in office.
  const defeat = election?.defeat ?? null;
  const prosperousQuarters = heldAfter(state.prosperousQuarters, tier);
  const victory =
    collapse === null && defeat === null ? victoryOf(prosperousQuarters, lived.debtBurden) : null;
  const outcome: Outcome = collapse ?? defeat ?? victory?.outcome ?? { status: 'playing' };

  const events = [...remaining, ...begun];
  // World price shocks whose time is up end, and those announced begin their notice.
  const shocks = turnShocks(state.priceShocks, chance.shocksAnnounced, date);
  const dilemmasAnswered = [...state.dilemmasAnswered, ...answer.answered];
  // A game still being played may be put a new dilemma as the next quarter begins.
  const dilemma =
    outcome.status === 'playing'
      ? ariseDilemma(
          {
            country: state.country,
            date,
            treasury: finances.treasury,
            foodReserve: food.foodReserve,
            regions: approval.regions,
            events,
            dilemmasAnswered,
            worldPrices,
          },
          chance.dilemmaRolls,
        )
      : null;

  // Within one seriousness the report keeps this order, so what ends the game leads it.
  const entries: ReportEntry[] = [
    ...(collapse === null ? [] : [collapseEntry(collapse)]),
    ...(victory === null ? [] : [victory.entry]),
    ...(election === null ? [] : [election.entry]),
    ...answer.entries,
    ...bailout.entries,
    ...serviced.entries,
    ...credit.entries,
    ...(budget.cut ? [cutEntry(budget)] : []),
    ...food.entries,
    ...approval.entries,
    ...building.entries,
    ...upkept.entries,
    ...taken.entries,
    ...traded.entries,
    ...(passed === null ? [] : [passed]),
    ...ended.map((event) => endEntry(state.country, event)),
    ...begun.map((event) =>
      beginEntry(state.country, event, holdOn(state.country, upkept.projects, event.regionId)),
    ),
    ...damaged.entries,
    ...shocks.entries,
    budgetEntry(finances),
  ];

  return {
    state: {
      ...state,
      date,
      treasury: finances.treasury,
      // A bailout brings the budget in force within the austerity it imposes.
      budget: budgetAfter(state, decisions.budget, bailout),
      reliefRegionId: decisions.reliefRegionId ?? null,
      foodReserve: food.foodReserve,
      // The growing year ends with the harvest.
      agricultureSpentThisYear: food.harvest === null ? agricultureSpent : 0,
      regions: approval.regions,
      events,
      projects: damaged.projects,
      debts: taken.debts,
      credit: credit.credit,
      worldPrices,
      priceShocks: shocks.shocks,
      // What crossed the border by each link, as the links stood when the quarter began.
      tradeCarried: routeCarriage(state, traded.imported + traded.exported),
      history: [
        ...state.history,
        vitalSigns({
          country: state.country,
          projects: upkept.projects,
          budget: decisions.budget,
          debts: taken.debts,
          date,
          treasury: finances.treasury,
          foodReserve: food.foodReserve,
          regions: approval.regions,
          worldPrices,
          prosperity: prosperity.value,
          debtBurden: lived.debtBurden,
        }),
      ],
      dilemma,
      dilemmasAnswered,
      tier,
      prosperousQuarters,
      austerity: bailout.austerity,
      outcome,
    },
    report: {
      date: state.date,
      treasury: {
        value: finances.treasury,
        change: finances.treasury - given.treasury,
        contributions: [...answer.money, ...finances.contributions],
      },
      food: {
        value: food.foodReserve,
        change: food.foodReserve - given.foodReserve,
        contributions: [...answer.food, ...food.contributions],
      },
      approval: approval.approval,
      debt: {
        value: debtOf(taken.debts),
        change: debtOf(taken.debts) - debtOf(given.debts),
        contributions: [...serviced.changes, ...taken.changes],
      },
      credit: credit.figure,
      prosperity,
      population: {
        value: sum(food.regions.map((region) => region.population)),
        change: sum(food.population.map((line) => line.amount)),
        contributions: food.population,
      },
      harvest: food.harvest,
      election: election?.result ?? null,
      entries: compileReport(entries),
    },
    spendingCut: budget.cut,
    pausedSites: building.paused,
    upkeepShort: finances.upkeep.short,
    missedPayment: serviced.missed,
    missedOn: serviced.missedOn,
    bailedOut: bailout.bailedOut,
    principalRepaid: serviced.principal,
    borrowed: taken.borrowed,
    tradePaid: traded.paid,
    tradeEarned: traded.earned,
    fedPermille: food.fedPermille,
    electionHeld: election !== null,
  };
}

/**
 * What a quarter does to money, food and approval, given the decisions and the weather. The
 * turn and the preview both live the quarter through here, so they cannot come to differ.
 * The quarter earns at the world prices it began with; what it leaves, prosperity and the
 * debt burden, is judged at `pricesAfter`, the world prices once it is over.
 */
function liveQuarter(
  given: GameState,
  decisions: Decisions,
  weatherShocks: readonly number[],
  pricesAfter: WorldPrices,
) {
  // The answer to a dilemma takes effect first, so the rest of the quarter starts from it.
  const answer = answerDilemma(given, decisions.dilemmaChoice ?? null);
  const state = withAnswer(given, answer);
  const { budget, building, upkept, serviced, taken, traded, finances } = resolveMoney(
    state,
    decisions,
  );

  const agricultureSpent = state.agricultureSpentThisYear + finances.spent.agriculture;
  // The sites in use as the quarter begins are the ones that bear on it.
  const sites = siteEffects(state);
  // Grain sold abroad is set aside from the reserve first, so it is neither eaten nor spoiled.
  // Grain bought abroad reaches the reserve as the quarter ends, once its food is done.
  const food = withTraded(
    resolveFood(withExported(foodSituation(state), traded.exported), {
      agricultureSpentThisYear: agricultureSpent,
      weatherShocks,
      harvestPermille: eventsLeave(state, sites),
      sites,
      relief: reliefFor(decisions, finances),
    }),
    traded,
  );
  // What was spent on health and education builds up, or lets wear down, their lasting levels.
  const served = resolveServices(food.regions, finances.spent);
  // Prosperity is judged on the regions and the sites in use as the quarter leaves them.
  // Approval plays no part in it, so it is judged first, and the tier it reaches sets what
  // the public expects of the government from now on.
  const left = (worldPrices: WorldPrices) => ({
    country: state.country,
    regions: served,
    projects: upkept.projects,
    worldPrices,
  });
  const prosperity = prosperityFigure(prosperityStatus(given), prosperityStatus(left(pricesAfter)));
  const tier = nextTier(state.tier, prosperity.value);
  const expectations = {
    was: expectationsIn(state.tier, state.startingTier),
    now: expectationsIn(tier, state.startingTier),
  };
  // Strikes in force as the quarter began have already cut its revenue. The approval the
  // quarter leaves behind decides who strikes in the next.
  const approval = resolveApproval(state.country, state.regions, served, {
    ...approvalInputs(decisions, finances, answer),
    // A bailout's blow lands at once, beside any the answer to a dilemma dealt.
    pushes: [...answer.pushes, ...bailoutPushes(serviced, state)],
    expectations,
  });
  // The debt burden the quarter leaves: its debt against the revenue the regions and sites it
  // leaves would raise. The rating, the win, the record and the preview all judge this one.
  const owing = (worldPrices: WorldPrices) => ({
    country: state.country,
    regions: approval.regions,
    projects: upkept.projects,
    budget: decisions.budget,
    debts: taken.debts,
    worldPrices,
  });
  const burden = debtBurden(owing(pricesAfter));
  // The rating is reassessed as the quarter ends, on the debt and revenue it leaves behind.
  const credit = reassessCredit(
    given,
    {
      record: recordAfter(given.credit.record, serviced),
      burden,
      deficit: deficitOf(finances.revenue, finances.balance, serviced.principal),
    },
    serviced.missedOn,
  );
  const bailout = resolveBailout(state, serviced, (decisions.borrow ?? []).length > 0);
  return {
    answer,
    state,
    budget,
    building,
    upkept,
    serviced,
    taken,
    traded,
    finances,
    agricultureSpent,
    sites,
    food,
    approval,
    prosperity,
    tier,
    credit,
    bailout,
    debtBurden: burden,
    /** Prosperity as the quarter leaves it, judged at other world prices. */
    prosperityAt: (worldPrices: WorldPrices) => prosperityStatus(left(worldPrices)).value,
    /** The debt burden as the quarter leaves it, judged at other world prices. */
    debtBurdenAt: (worldPrices: WorldPrices) => debtBurden(owing(worldPrices)),
  };
}

/**
 * Projects what a set of decisions would do in the current quarter. It changes nothing and
 * draws nothing from the random generator, so previewing never alters the game that follows.
 * @throws RangeError when a decision is outside what the game allows.
 * @throws Error when the game is already over.
 */
export function previewQuarter(given: GameState, decisions: Decisions): Preview {
  // A dilemma need not be answered to look ahead: unanswered, nothing of it is counted.
  checkDecisions(given, decisions, false);
  // Who goes short this quarter, what relief reaches them and where approval is left do not
  // turn on the weather, so they are projected exactly by living the quarter without any.
  const calm = given.regions.map(() => 0);
  // World markets are left to chance: the quarter is lived as if they left the prices be, and
  // what the prices it leaves bear on is given as the range their limits allow.
  // A world price shock in force next quarter is certain, so it moves the prices either way.
  const pushes = pushesInto(given.priceShocks, nextDate(given.date));
  const lived = liveQuarter(given, decisions, calm, movePrices(given.worldPrices, [], pushes));
  const low = movePrices(
    given.worldPrices,
    GOODS.map(() => -FULL_SWING_PERMILLE),
    pushes,
  );
  const high = movePrices(
    given.worldPrices,
    GOODS.map(() => FULL_SWING_PERMILLE),
    pushes,
  );
  const { state, building, finances, sites, food: thisQuarter, approval } = lived;
  const { serviced, taken, traded, credit } = lived;
  const owed = debtOf(taken.debts);
  const situation = foodSituation(state);
  const { quarter } = state.date;

  const ahead = quartersToHarvest(state, decisions);
  // The harvest answers to the sites in use in the quarter it comes in.
  const atHarvest = ahead.at(-1)?.sites ?? sites;
  const forecast = forecastFood(situation, {
    agricultureSpentSoFar: state.agricultureSpentThisYear,
    quarters: ahead.map((quarterly) => ({
      agricultureSpent: quarterly.finances.spent.agriculture,
      relief: reliefFor(decisions, quarterly.finances),
      sites: quarterly.sites,
      imported: quarterly.imported,
      exported: quarterly.exported,
    })),
    // At worst, every event that could still begin this growing year does.
    worstHarvestPermille: state.regions.map((region, index) =>
      worstHarvestPermille(
        state.country,
        state.events,
        region.id,
        quarter,
        atHarvest.inRegion.harvestWeather[index] ?? 1000,
      ),
    ),
    bestHarvestPermille: eventsLeave(state, atHarvest),
  });

  return {
    revenue: exactly(finances.revenue),
    spending: exactly(finances.spending),
    projectSpending: exactly(building.paid),
    repayments: exactly(serviced.paid),
    missedPayment: serviced.missed,
    borrowed: taken.borrowed,
    trade: {
      imported: traded.imported,
      paid: traded.paid,
      exported: traded.exported,
      earned: traded.earned,
    },
    debt: exactly(owed),
    debtBurden: { min: lived.debtBurdenAt(high), max: lived.debtBurdenAt(low) },
    creditRating: credit.credit.rating,
    creditScore: exactly(credit.after.score),
    pausedSites: building.paused,
    upkeep: {
      needed: finances.upkeep.needed,
      spent: finances.upkeep.spent,
      short: finances.upkeep.short,
    },
    schedule: scheduleAhead(state, decisions.startProjects ?? [], building.paused),
    balance: exactly(finances.balance),
    treasury: exactly(finances.treasury),
    spendingCut: finances.cut,
    harvest: forecast.harvest,
    foodReserveAfterHarvest: forecast.reserveAfterHarvest,
    shortfalls: thisQuarter.shortfalls,
    relief: thisQuarter.relief,
    approval: exactly(approval.approval.value),
    approvalHeading: exactly(approval.heading),
    prosperity: { min: lived.prosperityAt(low), max: lived.prosperityAt(high) },
    unrest: approvalStatus({ regions: approval.regions }).unrest,
    voteShare: forecastVoteShare(approval.approval.value),
  };
}

/**
 * An event in force and what it does to its region as things stand, in a few words:
 * "Drought · harvest −40%", or less where irrigation is in use.
 */
export function describeEvent(
  state: Pick<GameState, 'country' | 'projects'>,
  event: ActiveEvent,
): string {
  return describeEventWithHold(event, holdOn(state.country, state.projects, event.regionId));
}

/** The ranges the budget may be set within. */
export const budgetLimits = balance.budget;

/**
 * @throws RangeError when a decision is outside what the game allows.
 * @throws Error when the game is already over.
 */
export function checkDecisions(state: GameState, decisions: Decisions, mustAnswer = true): void {
  if (state.outcome.status !== 'playing') throw new Error('The game is over.');
  const unanswered = choiceFault(state, decisions.dilemmaChoice ?? null, mustAnswer);
  if (unanswered !== null) throw new RangeError(unanswered);
  checkBudget(decisions.budget);
  const austere = austerityBudgetFault(state, decisions.budget);
  if (austere !== null) throw new RangeError(austere);
  const target = decisions.reliefRegionId ?? null;
  if (target !== null && !state.regions.some((region) => region.id === target)) {
    throw new RangeError(`There is no region "${target}" to send food relief to.`);
  }
  const fault = startFault(state, decisions.startProjects ?? []);
  if (fault !== null) throw new RangeError(fault);
  const borrowing = borrowFault(state, decisions.borrow ?? []);
  if (borrowing !== null) throw new RangeError(borrowing);
  const trading = tradeFault(state, decisions.trade ?? []);
  if (trading !== null) throw new RangeError(trading);
}

interface QuarterMoney {
  /** What repaying debts did, before anything else. */
  readonly serviced: ReturnType<typeof serveDebts>;
  /** What the budget alone did: revenue, and spending on the areas it sets. */
  readonly budget: BudgetOutcome;
  /** What building did with the money the budget left. */
  readonly building: BuildingOutcome;
  /** The projects once upkeep has told on the sites in use, and what the report says of it. */
  readonly upkept: ReturnType<typeof resolveUpkeep>;
  /** What was borrowed, which arrives as the quarter ends. */
  readonly taken: ReturnType<typeof takeDebts>;
  /** What was bought abroad, paid for as the quarter ends, after what was borrowed arrives. */
  readonly traded: TradeOutcome;
  /** All of it together: the quarter's whole effect on the treasury. */
  readonly finances: BudgetOutcome;
}

/**
 * One quarter of money. Repayments on debts come first, out of the treasury and the
 * quarter's revenue; then the budget's own spending, cut if what is left cannot cover it;
 * then the instalments on projects are paid out of what is left. The sites that upkeep did
 * not reach are decaying from the next quarter. What is borrowed arrives as the quarter
 * ends, after all of it, unless a missed payment has brought a bailout; and then what was
 * bought abroad is paid for.
 */
function resolveMoney(
  state: Pick<
    GameState,
    | 'country'
    | 'treasury'
    | 'regions'
    | 'projects'
    | 'date'
    | 'debts'
    | 'credit'
    | 'worldPrices'
    | 'foodReserve'
  >,
  decisions: Decisions,
  starts: readonly string[] = decisions.startProjects ?? [],
  borrowing: readonly Borrowing[] = decisions.borrow ?? [],
  trading: readonly TradeOrder[] = decisions.trade ?? [],
): QuarterMoney {
  const serviced = serveDebts(
    state.debts,
    state.treasury + revenueOf(state, decisions.budget),
    state.date,
  );
  const budget = resolveBudget(state, decisions.budget, serviced);
  const building = resolveProjects(state, starts, state.date, budget.treasury);
  // A missed payment puts everything owed in the bailout loan, and nothing more is lent.
  const taken = takeDebts(
    serviced.debts,
    serviced.missed > 0 ? [] : borrowing,
    state.date,
    state.credit.rating,
  );
  const borrowed = withBorrowed(
    withFixedCosts(budget, building.paid, building.contributions),
    taken.borrowed,
    taken.contributions,
  );
  const traded = resolveTrade(state, trading, borrowed.treasury, state.foodReserve);
  return {
    serviced,
    budget,
    building,
    upkept: resolveUpkeep({ country: state.country, projects: building.projects }, budget.upkeep),
    taken,
    traded,
    // Goods bought or sold abroad move the treasury but are no part of the budget's balance.
    finances: withBorrowed(borrowed, traded.earned - traded.paid, traded.money),
  };
}

/** The food situation once the grain sold abroad has been set aside from the reserve. */
function withExported(situation: FoodSituation, exported: number): FoodSituation {
  return { ...situation, foodReserve: situation.foodReserve - exported };
}

/**
 * The quarter's food with its trade: the grain sold abroad, set aside before it began, and
 * the grain bought abroad, which reaches the national reserve once it is over.
 */
function withTraded<Food extends { foodReserve: number; contributions: readonly Contribution[] }>(
  food: Food,
  traded: TradeOutcome,
): Food {
  return {
    ...food,
    foodReserve: food.foodReserve + traded.imported,
    contributions: [...traded.sold, ...food.contributions, ...traded.bought],
  };
}

/** Relief goes where the player sends it, as far as what was actually spent on it can move. */
function reliefFor(decisions: Decisions, finances: BudgetOutcome): FoodInputs['relief'] {
  return {
    regionId: decisions.reliefRegionId ?? null,
    capacity: reliefCapacity(finances.spent.foodRelief),
  };
}

/** Approval answers to the tax rate decided and to what was actually spent. */
function approvalInputs(
  decisions: Decisions,
  finances: BudgetOutcome,
  answer: DilemmaOutcome,
): ApprovalInputs {
  return {
    taxRatePercent: decisions.budget.taxRatePercent,
    spent: finances.spent,
    pushes: answer.pushes,
  };
}

/** The game as the quarter starts once the answer to a dilemma has taken effect. */
function withAnswer(state: GameState, answer: DilemmaOutcome): GameState {
  return {
    ...state,
    treasury: answer.treasury,
    foodReserve: answer.foodReserve,
    regions: answer.regions,
  };
}

/** What the events in force leave of each region's harvest, given the sites in use. */
function eventsLeave(state: Pick<GameState, 'regions' | 'events'>, sites: SiteEffects): number[] {
  return state.regions.map((region, index) =>
    harvestPermille(state.events, region.id, sites.inRegion.harvestWeather[index] ?? 1000),
  );
}

/** What irrigation in use leaves of the weather's and of events' hold on one region. */
function holdOn(country: Country, projects: readonly Project[], regionId: string): number {
  const index = country.regions.findIndex((region) => region.id === regionId);
  return siteEffects({ country, projects }).inRegion.harvestWeather[index] ?? 1000;
}

interface QuarterAhead {
  readonly finances: BudgetOutcome;
  /** The sites in use as that quarter begins. */
  readonly sites: SiteEffects;
  /** The grain bought abroad that reaches the reserve as that quarter ends, in tonnes. */
  readonly imported: number;
  /** The grain sold abroad, set aside from the reserve as that quarter begins, in tonnes. */
  readonly exported: number;
}

/**
 * What the budget will bring in and pay out in each quarter from this one to the harvest
 * if it is left as it is, and the sites that will be in use by then. A treasury that runs
 * dry on the way cuts the later quarters' spending and pauses building, and the forecast
 * must know it.
 */
function quartersToHarvest(state: GameState, decisions: Decisions): QuarterAhead[] {
  const quarterly: QuarterAhead[] = [];
  let { treasury, date } = state;
  let projects: readonly Project[] = state.projects;
  let { debts } = state;
  for (let ahead = quartersUntilHarvest(state.date.quarter); ahead > 0; ahead -= 1) {
    // Projects are started, money borrowed and goods bought in the quarter being decided and
    // none after.
    const later = quarterly.length === 0 ? undefined : [];
    const money = resolveMoney(
      { ...state, treasury, projects, date, debts },
      decisions,
      later,
      later,
      later,
    );
    quarterly.push({
      finances: money.finances,
      sites: siteEffects({ ...state, projects }),
      imported: money.traded.imported,
      exported: money.traded.exported,
    });
    ({ treasury } = money.finances);
    ({ projects } = money.upkept);
    ({ debts } = money.taken);
    date = nextDate(date);
  }
  return quarterly;
}

function foodSituation(state: GameState): FoodSituation {
  return {
    country: state.country,
    quarter: state.date.quarter,
    regions: state.regions,
    foodReserve: state.foodReserve,
  };
}

type Collapse = Extract<Outcome, { readonly cause: 'famine' }>;

/** The state collapses when famine has held one region for too many quarters running. */
function collapseOf(country: Country, regions: readonly RegionState[]): Collapse | null {
  const limit = balance.hunger.collapseAfterFamineQuarters;
  const stricken = regions.find((region) => region.famineQuarters >= limit);
  if (stricken === undefined) return null;
  return {
    status: 'lost',
    cause: 'famine',
    regionId: stricken.id,
    headline: 'The state has collapsed',
    summary: `Famine held ${regionName(country, stricken.id)} for ${limit} quarters running. The state has collapsed.`,
  };
}

/** What the turn report says when famine brings the state down. */
function collapseEntry(outcome: Collapse): ReportEntry {
  return {
    kind: 'collapse',
    seriousness: 'critical',
    headline: outcome.headline,
    cause: outcome.summary,
    regionId: outcome.regionId,
  };
}

/** This quarter's weather: one shock for each region, drawn in the regions' order. */
function rollWeather(
  rng: RngState,
  regionCount: number,
): { readonly shocks: readonly number[]; readonly rng: RngState } {
  const swing = balance.food.weatherSwingPermillePerQuarter;
  const shocks: number[] = [];
  let current = rng;
  for (let region = 0; region < regionCount; region += 1) {
    const roll = nextRandom(current);
    shocks.push((roll.value % (2 * swing + 1)) - swing);
    current = roll.state;
  }
  return { shocks, rng: current };
}
