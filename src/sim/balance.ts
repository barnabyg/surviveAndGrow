import { armyBalance } from './balance/army';
import { budgetBalance } from './balance/budget';
import { calendarBalance } from './balance/calendar';
import { dilemmasBalance } from './balance/dilemmas';
import { eventsBalance } from './balance/events';
import { factionsBalance } from './balance/factions';
import { financeBalance } from './balance/finance';
import { foodBalance } from './balance/food';
import { neighboursBalance } from './balance/neighbours';
import { politicsBalance } from './balance/politics';
import { powerBalance } from './balance/power';
import { priceShocksBalance } from './balance/priceShocks';
import { prosperityBalance } from './balance/prosperity';
import { risksBalance } from './balance/risks';
import { sitesBalance } from './balance/sites';
import { surveysBalance } from './balance/surveys';
import { technologiesBalance } from './balance/technologies';
import { tradeBalance } from './balance/trade';
import { upkeepBalance } from './balance/upkeep';
import { victoryBalance } from './balance/victory';

export type { LeverBalance } from './balance/factions';
export type { CreditStepBalance } from './balance/finance';
export type { SiteBalance } from './balance/sites';
export type { SiteImprovement, TechnologyBalance } from './balance/technologies';
export type { GoodBalance } from './balance/trade';

/**
 * Every value that tunes the game lives in `balance/` as data, one mechanic's values to a file,
 * and is read through this object. The rules in the rest of the simulation read these values
 * and hold none of their own.
 */
export const balance = {
  // calendar
  ...calendarBalance,
  // budget
  ...budgetBalance,
  // food, relief, population, hunger
  ...foodBalance,
  // approval, unrest, election
  ...politicsBalance,
  // army loyalty
  ...armyBalance,
  // neighbours, deterrence
  ...neighboursBalance,
  // factions
  ...factionsBalance,
  // risks
  ...risksBalance,
  // sites
  ...sitesBalance,
  // technologies
  ...technologiesBalance,
  // surveys
  ...surveysBalance,
  // power
  ...powerBalance,
  // upkeep
  ...upkeepBalance,
  // prosperity
  ...prosperityBalance,
  // finance
  ...financeBalance,
  // trade
  ...tradeBalance,
  // priceShocks
  ...priceShocksBalance,
  // victory
  ...victoryBalance,
  // dilemmaRules, dilemmas
  ...dilemmasBalance,
  // events
  ...eventsBalance,
} as const;
