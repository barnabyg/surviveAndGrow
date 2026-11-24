import { approvalInputs, approvalStatus, resolveApproval } from './approval';
import { resolveLoyalty } from './army';
import { sum } from './arithmetic';
import { bailoutPushes, budgetAfter, resolveBailout } from './bailout';
import { balance } from './balance';
import { announceIncidents, incidentPushes, rollIncidents, turnIncidents } from './borderIncidents';
import { nextDate } from './calendar';
import { budgetEntry, cutEntry } from './budget';
import { collapseEntry, collapseOf } from './collapse';
import { countEntries, coupEntry, coupOf, plottingAfter } from './coup';
import { debtBurden, debtOf } from './debt';
import { deficitOf, reassessCredit, recordAfter } from './credit';
import { checkDecisions } from './decisions';
import { resolveDeterrence } from './deterrence';
import { answerDilemma, ariseDilemma, rollDilemmas, withAnswer } from './dilemmas';
import { forecastVoteShare, holdElection, isElectionQuarter, rollSwing } from './election';
import {
  beginEntry,
  beginStruck,
  endEntry,
  endEventsAfterHarvest,
  eventsLeave,
  holdOn,
  holdsIn,
  rollEvents,
  rollWeather,
  siteDamageOf,
  worstHarvestPermille,
} from './events';
import { foodSituation, forecastFood, reliefFor, resolveFood, withExported } from './food';
import { vitalSigns } from './history';
import { quartersToHarvest, resolveMoney, withTraded } from './money';
import { withFinds } from './deposits';
import { siteEffects, sitesAmong } from './projects';
import { prosperityFigure, prosperityStatus, resolveServices } from './prosperity';
import { pushesInto, rollPriceShocks, turnShocks } from './priceShocks';
import { compileReport, type ReportEntry } from './report';
import { expectationsIn, nextTier, tierEntry } from './tiers';
import { heldAfter, victoryOf } from './victory';
import type {
  Chance,
  Decisions,
  GameState,
  Outcome,
  Preview,
  QuarterResolved,
  TurnResult,
} from './state';
import { scheduleAhead } from './timeline';
import { routeCarriage } from './tradeRoutes';
import { FULL_SWING_PERMILLE, movePrices, rollPrices, type WorldPrices } from './trade';
import { GOODS } from './vocabulary';
import { exactly } from './types';
import { damageSites } from './upkeep';

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
    // So do the border incidents a hostile neighbour may announce.
    incidentRolls: rollIncidents(state.country, state.seed, next),
    // Dilemmas answer to the seed and the quarter alone, and leave the generator untouched.
    dilemmaRolls: rollDilemmas(state.seed, next),
  });
  // The campaign's draw counts only if the vote was held: a state that fell held none.
  const rng = resolved.electionHeld && campaign !== null ? campaign.rng : events.rng;
  return { state: { ...resolved.state, rng }, report: resolved.report };
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
  const { prosperity, tier, army, deterred, regions } = lived;
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
  const collapse = collapseOf(state.country, regions);
  // The army takes power once it has plotted for long enough. It is checked with collapse,
  // before the vote and the win, so a quarter that would have won either still falls to it.
  const plottingQuarters = plottingAfter(state.plottingQuarters, army.loyalty.value);
  const coup = collapse === null ? coupOf(plottingQuarters, army.loyalty.value) : null;
  const fallen = collapse ?? coup;
  // The vote is held as each term's last quarter ends, unless the state has already fallen.
  const election =
    fallen === null && isElectionQuarter(state.date)
      ? holdElection(regions, chance.swing, state.date)
      : null;
  // The game is won on prosperity held long enough, by a government still in office.
  const defeat = election?.defeat ?? null;
  const prosperousQuarters = heldAfter(state.prosperousQuarters, tier);
  const victory =
    fallen === null && defeat === null ? victoryOf(prosperousQuarters, lived.debtBurden) : null;
  const outcome: Outcome = fallen ?? defeat ?? victory?.outcome ?? { status: 'playing' };

  const events = [...remaining, ...begun];
  // World price shocks whose time is up end, and those announced begin their notice.
  const shocks = turnShocks(state.priceShocks, chance.shocksAnnounced, date);
  // A neighbour the quarter leaves hostile may announce a border incident, by its roll.
  const incidents = announceIncidents(
    state.country,
    lived.incidents.incidents,
    lived.hostile,
    chance.incidentRolls,
    date,
  );
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
            regions,
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
    ...(coup === null ? [] : [coupEntry(coup)]),
    ...(victory === null ? [] : [victory.entry]),
    ...(election === null ? [] : [election.entry]),
    ...answer.entries,
    ...bailout.entries,
    ...serviced.entries,
    ...credit.entries,
    ...(budget.cut ? [cutEntry(budget)] : []),
    ...food.entries,
    ...approval.entries,
    ...army.entries,
    ...countEntries(state.plottingQuarters, plottingQuarters, army.loyalty.value),
    ...deterred.entries,
    ...lived.incidents.entries,
    ...incidents.entries,
    ...building.entries,
    ...upkept.entries,
    ...taken.entries,
    ...traded.entries,
    ...(passed === null ? [] : [passed]),
    ...ended.map((event) => endEntry(state.country, event)),
    ...begun.map((event) =>
      beginEntry(state.country, event, holdOn(state.country, upkept.projects, event)),
    ),
    ...damaged.entries,
    ...shocks.entries,
    budgetEntry(finances),
  ];

  return {
    state: {
      ...state,
      // A deposit a survey found this quarter is on the map, to be built, from the next.
      country: withFinds(state.country, damaged.projects, state.seed),
      date,
      treasury: finances.treasury,
      // A bailout brings the budget in force within the austerity it imposes.
      budget: budgetAfter(state, decisions.budget, bailout),
      reliefRegionId: decisions.reliefRegionId ?? null,
      foodReserve: food.foodReserve,
      // The growing year ends with the harvest.
      agricultureSpentThisYear: food.harvest === null ? agricultureSpent : 0,
      regions,
      events,
      projects: damaged.projects,
      debts: taken.debts,
      credit: credit.credit,
      worldPrices,
      priceShocks: shocks.shocks,
      borderIncidents: incidents.incidents,
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
          regions,
          worldPrices,
          borderIncidents: incidents.incidents,
          prosperity: prosperity.value,
          debtBurden: lived.debtBurden,
        }),
      ],
      dilemma,
      dilemmasAnswered,
      tier,
      prosperousQuarters,
      plottingQuarters,
      deterrence: deterred.deterrence.value,
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
      armyLoyalty: army.loyalty,
      deterrence: deterred.deterrence,
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
    pausedSites: sitesAmong(building.paused),
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
  // What was spent on health and education, and the clinics and schools in use as the quarter
  // began, build up their lasting levels or let them wear down.
  const served = resolveServices(food.regions, finances.spent, state);
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
    // A bailout's blow lands at once, beside any the answer to a dilemma dealt, and so does
    // that of a border incident in the quarter it begins, in the regions on its border.
    pushes: [...answer.pushes, ...bailoutPushes(serviced, state), ...incidentPushes(state)],
    expectations,
  });
  // The army answers to what was spent on Defence and to the unrest the quarter leaves, so a
  // region whose approval has just broken into protest pulls its army's loyalty down at once.
  const army = resolveLoyalty(
    state.country,
    state.regions,
    approval.regions,
    finances.spent.defence,
  );
  const { regions } = army;
  // Deterrence answers to what was spent on Defence too, and the neighbours to the tier the
  // quarter leaves in force: a country that has just passed one is more worth taking at once.
  const deterred = resolveDeterrence(state, finances.spent.defence, regions, tier);
  // Border incidents turn as the quarter ends, on what each neighbour then intends: one whose
  // time is up ends, and one due to begin does so only if its neighbour is still hostile.
  const after = nextDate(state.date);
  const hostile = new Set(
    deterred.neighbours
      .filter((neighbour) => neighbour.intention === 'hostile')
      .map((neighbour) => neighbour.neighbourId),
  );
  const incidents = turnIncidents(state, hostile, after);
  // The debt burden the quarter leaves: its debt against the revenue the regions and sites it
  // leaves would raise. The rating, the win, the record and the preview all judge this one.
  const owing = (worldPrices: WorldPrices) => ({
    country: state.country,
    regions,
    projects: upkept.projects,
    budget: decisions.budget,
    debts: taken.debts,
    worldPrices,
    // The revenue is the next quarter's, with the border incidents then in force.
    date: after,
    borderIncidents: incidents.incidents,
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
    army,
    deterred,
    /** The neighbours hostile as the quarter ends. */
    hostile,
    /** The border incidents as the quarter leaves them, before any new one is announced. */
    incidents,
    /** The regions as the quarter leaves them: fed, served, judged and with their armies. */
    regions,
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
        holdsIn(atHarvest, index),
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
    pausedSites: sitesAmong(building.paused),
    upkeep: {
      needed: finances.upkeep.needed,
      spent: finances.upkeep.spent,
      short: finances.upkeep.short,
    },
    schedule: scheduleAhead(state, decisions.startProjects ?? [], sitesAmong(building.paused)),
    balance: exactly(finances.balance),
    treasury: exactly(finances.treasury),
    spendingCut: finances.cut,
    harvest: forecast.harvest,
    foodReserveAfterHarvest: forecast.reserveAfterHarvest,
    shortfalls: thisQuarter.shortfalls,
    relief: thisQuarter.relief,
    approval: exactly(approval.approval.value),
    approvalHeading: exactly(approval.heading),
    armyLoyalty: exactly(lived.army.loyalty.value),
    armyLoyaltyHeading: exactly(lived.army.heading),
    deterrence: exactly(lived.deterred.deterrence.value),
    deterrenceHeading: exactly(lived.deterred.heading),
    neighbours: lived.deterred.neighbours,
    prosperity: { min: lived.prosperityAt(low), max: lived.prosperityAt(high) },
    unrest: approvalStatus({ regions: lived.regions }).unrest,
    voteShare: forecastVoteShare(approval.approval.value),
  };
}

/** The ranges the budget may be set within. */
export const budgetLimits = balance.budget;
