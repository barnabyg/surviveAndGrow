import {
  approvalStatus,
  budgetLimits,
  electionStatus,
  FOOD_STAGES,
  foodStatus,
  pendingDilemma,
  previewQuarter,
  siteSchedule,
  siteStatus,
  siteTerms,
  SPENDING_AREAS,
  type Budget,
  type Decisions,
  type GameState,
  type Money,
  type PendingDilemma,
  type SiteType,
  type SpendingArea,
} from '../../src/sim';
import type { Decide } from './batch';

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
    spending: { agriculture: 0, foodRelief: 0, health: 0, education: 0, security: 0 },
  };
  // Everything in the treasury once this quarter's tax is in, shared between the three.
  const available = previewQuarter(game, { budget: lowTax }).treasury.min;
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
  /** It builds only what will be in use at least this long before the vote. */
  buildIfInUseQuarters: 6,
  /** What it builds first. */
  buildOrder: ['irrigation', 'grainStore', 'farmRoad'] satisfies SiteType[] as readonly SiteType[],
} as const;

/**
 * Plays sensibly, the way a careful person might on a first serious attempt. It keeps the
 * budget in balance and pays for relief only while someone is hungry, sending it to the
 * region worst off. It funds the farms a little more while the reserve is below its safe
 * level. It builds when the treasury can spare the money and the site will be in use well
 * before the vote, irrigation first. As the election nears it spends what it has saved on
 * what the preview says the public will thank it for.
 */
const sensible: Decide = (game) => {
  const { quartersAway } = electionStatus(game);
  const quartersLeft = quartersAway + 1;
  const campaigning = quartersLeft <= habits.campaignQuarters;

  // Relief goes to the hungry region furthest gone, and is paid for only when one is.
  const reliefRegionId = hungriest(game);
  let budget = withRelief(game, game.budget, reliefRegionId);
  budget = withFarms(game, budget);

  const dilemmaChoice = answer(game, (option) => judge(game, option, campaigning));
  const choices = { reliefRegionId, dilemmaChoice };

  if (campaigning) {
    // What is saved is spent evenly over the quarters left, on what wins approval.
    const allowance = Math.floor(game.treasury / quartersLeft);
    budget = campaign(game, budget, choices, -allowance);
    return { budget, ...choices };
  }

  budget = balanced(game, budget, choices);
  const startProjects = worthBuilding(game, budget);
  if (startProjects.length > 0) budget = balanced(game, budget, { ...choices, startProjects });
  return { budget, ...choices, startProjects };
};

type Choices = Omit<Decisions, 'budget'>;

/** The region that most needs relief: the furthest gone, and among equals the shortest. */
function hungriest(game: GameState): string | null {
  const stageOf = (regionId: string) =>
    FOOD_STAGES.indexOf(
      game.regions.find((region) => region.id === regionId)?.foodStage ?? 'adequate',
    );
  const { shortfalls } = previewQuarter(game, { budget: game.budget });
  const worst = [...shortfalls].sort(
    (a, b) => stageOf(b.regionId) - stageOf(a.regionId) || b.shortfall - a.shortfall,
  )[0];
  return worst?.regionId ?? null;
}

/** Relief spending set to what moves the food the chosen region is short of, and no more. */
function withRelief(game: GameState, budget: Budget, reliefRegionId: string | null): Budget {
  const none = spend(budget, 'foodRelief', 0);
  if (reliefRegionId === null) return none;
  const { relief } = previewQuarter(game, { budget: none, reliefRegionId });
  for (let amount = 0; amount <= budgetLimits.spending.max; amount += budgetLimits.spending.step) {
    const tried = spend(budget, 'foodRelief', amount);
    const moved = previewQuarter(game, { budget: tried, reliefRegionId }).relief;
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

/** The lowest tax rate at which the quarter does not run a deficit. */
function balanced(game: GameState, budget: Budget, choices: Choices): Budget {
  const { min, max }: { min: number; max: number } = budgetLimits.taxRatePercent;
  for (let rate = min; rate <= max; rate += 1) {
    const tried = { ...budget, taxRatePercent: rate };
    const preview = previewQuarter(game, { budget: tried, ...choices });
    if (preview.balance.min >= 0 && !preview.spendingCut) return tried;
  }
  return { ...budget, taxRatePercent: max };
}

/**
 * The campaign budget: starting from a balanced one, it takes whichever single step the
 * preview says does most for approval for the money (a point off tax, or a step more on
 * health, education or security) until the quarter's allowance is spent.
 */
function campaign(game: GameState, start: Budget, choices: Choices, floor: Money): Budget {
  const heading = (budget: Budget) => previewQuarter(game, { budget, ...choices });
  let budget = balanced(game, start, choices);
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

/**
 * The one site worth starting now, if any: the first in the building order that the
 * treasury can pay for outright with its cushion left over, and that will be in use long
 * enough before the vote. One project at a time.
 */
function worthBuilding(game: GameState, budget: Budget): string[] {
  const underWay = game.country.sites.some((site) =>
    ['building', 'paused'].includes(siteStatus(game, site.id).state),
  );
  if (underWay) return [];
  const quarterly = SPENDING_AREAS.reduce((total, area) => total + budget.spending[area], 0);
  const spare = game.treasury - habits.cushionQuarters * quarterly;
  for (const type of habits.buildOrder) {
    for (const site of game.country.sites) {
      if (site.type !== type || siteStatus(game, site.id).state !== 'empty') continue;
      if (siteTerms(type).cost > spare) continue;
      if (siteSchedule(game, site.id).inUseBeforeVote < habits.buildIfInUseQuarters) continue;
      // Irrigation goes where drought can strike; the rest wherever there is a site.
      const droughtProne =
        (game.country.regions.find((region) => region.id === site.regionId)?.eventLikelihood
          .drought ?? 0) > 0;
      if (type === 'irrigation' && !droughtProne) continue;
      return [site.id];
    }
  }
  return [];
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
      'Balances the budget, relieves hunger, builds early, and spends its savings before the vote.',
    decide: sensible,
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
 * Players that each lean on one lever. They are not part of the balance targets: they are
 * here to show whether any single trick wins on its own (`BALANCE_PLAYERS=all`).
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
    name: 'Hover then spend',
    manner:
      'Tax as high as keeps approval just clear of strikes until the campaign, then everything saved on approval.',
    decide: (game) => {
      const quartersLeft = electionStatus(game).quartersAway + 1;
      const start = relieving(game, withFarms(game, game.budget));
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
        const preview = previewQuarter(game, { budget: tried, ...choices });
        if (preview.approvalHeading.min < line || preview.unrest.length > 0) break;
        budget = tried;
      }
      return { budget, ...choices };
    },
  },
];
