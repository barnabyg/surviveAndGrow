import { createContext } from 'react';

/**
 * One step of the guided tour of the main screen. The step picks out the element marked
 * `data-tour="<target>"`, or with a null target stands alone in the middle of the screen.
 * A step whose element is not on screen, such as the dilemma panel with no dilemma waiting,
 * is passed over.
 */
export interface TourStep {
  readonly target: string | null;
  readonly title: string;
  readonly text: string;
}

/** The guided tour, in the order it is shown: the top bar, then the columns left to right. */
export const TOUR_STEPS: readonly TourStep[] = [
  {
    target: null,
    title: 'Welcome to office',
    text: 'You lead a small developing country. Raise its living standards to the prosperity target and hold them there for a year, while keeping enough approval to win every election on the way. This tour shows where everything is. Use the buttons or the arrow keys; Escape ends it.',
  },
  {
    target: 'vitals',
    title: 'Vital signs',
    text: 'The treasury, debt, credit rating, food reserve, approval, prosperity against its target and the time to the next election, always in view. Click a figure to see what moved it. The short lines beside them are the last eight quarters.',
  },
  {
    target: 'end-quarter',
    title: 'End the quarter',
    text: 'One turn is one quarter, and a term is 20 quarters to an election. Once your decisions are set, end the quarter: events fire, the country moves on, and a report says what changed and why.',
  },
  {
    target: 'reports',
    title: 'This quarter',
    text: 'What happened last quarter, the most serious first: the budget, the harvest, hunger and events. A report about one region is a button that picks that region out on the map.',
  },
  {
    target: 'risks',
    title: 'Risks ahead',
    text: 'The dangers of the coming quarters, with how likely each is, under the decisions you have committed. Every loss can be traced to a warning here, so read it before you end a quarter.',
  },
  {
    target: 'regions',
    title: 'Living standards by region',
    text: 'Each region’s living standard. National prosperity is built from these, so a region left behind holds the whole country back. Select a region to open its card.',
  },
  {
    target: 'approval-chart',
    title: 'Approval',
    text: 'Approval over time, with the strike threshold and the 50% line. Approval keeps you in office, and is not the score: at an election it becomes your vote share, and below 50% the game is lost.',
  },
  {
    target: 'lenses',
    title: 'Lenses',
    text: 'Choose what the map shows: the country as it looks, or each region coloured by its food situation, approval, living standard or infrastructure. The infrastructure lens marks every link missing from a chain.',
  },
  {
    target: 'map',
    title: 'The map',
    text: 'Regions, build sites, roads, power lines and trade routes. Select a region to see its figures and send it relief, a site to see what building there costs and needs, or a route to see what it carries. A mine earns nothing until a road links it to a port.',
  },
  {
    target: 'timeline',
    title: 'The term',
    text: 'Every quarter of the term to its election, with harvests underlined and each project as a bar over the quarters it is built in. A project finished after the vote does nothing to win it.',
  },
  {
    target: 'legend',
    title: 'Legend',
    text: 'What the marks on the map mean. Nothing on the map is shown by colour alone.',
  },
  {
    target: 'dilemma-panel',
    title: 'Dilemma',
    text: 'A decision the quarter puts to you. It must be answered before the quarter can end, and its answer can be changed until then.',
  },
  {
    target: 'budget',
    title: 'Budget',
    text: 'The tax rate and spending on agriculture, food relief, health, education, security and upkeep. Move a slider and the projection shows what it would do. Nothing counts until you commit it.',
  },
  {
    target: 'projects',
    title: 'Projects',
    text: 'Anything with a cost, a build time and a lasting effect: irrigation, roads, ports, mines, power. A project planned now starts when the quarter ends, and can be taken back until then. Underfunded upkeep lets what you built decay.',
  },
  {
    target: 'finance',
    title: 'Borrowing',
    text: 'Loans, and bonds once your credit rating allows them, bring money forward at the price of repayments. The rating sets the rates and the most you may owe. A missed payment brings a bailout with forced austerity.',
  },
  {
    target: 'trade',
    title: 'Trade',
    text: 'Buy grain abroad when the reserve runs short, or sell a surplus, at a world price that moves every quarter, within what the border crossings and ports can carry.',
  },
  {
    target: 'relief',
    title: 'Food relief',
    text: 'Send relief to one region short of food. Hunger runs from tight to shortage to famine, and famine can bring the state down.',
  },
  {
    target: 'election',
    title: 'Election forecast',
    text: 'What approval would mean for the vote if the election were held at the end of this quarter.',
  },
  {
    target: 'tutorial',
    title: 'That is the screen',
    text: 'Everything that raises living standards pays off after the next election; subsidies and tax cuts buy approval now. The game is the gap between them. Reopen this tour here at any time.',
  },
];

/**
 * The element the tour is picking out, or null when no tour is open. A collapsed decision
 * panel opens while the tour points at it.
 */
export const TourTarget = createContext<string | null>(null);

/**
 * What a lesson waits for the player to do. The game screen recognises each of these as the
 * player does it; a lesson with none waits for the player to press Next.
 */
export type LessonAction =
  | 'commit-budget'
  | 'lens-food'
  | 'select-region'
  | 'plan-project'
  | 'end-quarter'
  | 'answer-dilemma'
  | 'end-year';

/** One lesson of the tutorial game: a part of the screen, and something to do there. */
export interface Lesson extends TourStep {
  readonly waitFor: LessonAction | null;
  /** What the player's action did and why, said as the next lesson opens. */
  readonly after?: string;
}

/**
 * The tutorial's lessons, through the first year of the tutorial game (`tutorialGame.ts`),
 * whose only dilemma that year comes as the second quarter begins.
 */
export const LESSONS: readonly Lesson[] = [
  {
    target: null,
    waitFor: null,
    title: 'Learn by doing',
    text: 'This tutorial plays your first year with you. Each lesson asks you to do one thing and moves on once you have done it. Skip a lesson or end the tutorial whenever you like: the game carries on as an ordinary one. For a tour of the whole screen, press Tour in the top bar.',
  },
  {
    target: 'budget',
    waitFor: 'commit-budget',
    title: 'Set the budget',
    text: 'Move the Health slider up a step and watch the projection under the sliders: what the treasury, approval and prosperity would do next quarter. Nothing counts until you press Commit budget.',
    after:
      'Committed. The quarter will be resolved with that budget. Health spending lifts living standards slowly, while the treasury feels its cost at once.',
  },
  {
    target: 'lenses',
    waitFor: 'lens-food',
    title: 'Look at food',
    text: 'The map can show more than the land. Choose the Food lens to colour each region by its food situation.',
    after:
      'The food lens is on. Each region carries its food situation as text as well as colour, and the lens stays on until you change it.',
  },
  {
    target: 'map',
    waitFor: 'select-region',
    title: 'Pick out a region',
    text: 'Select a region on the map to open its card: its people, harvest, approval and living standard, and a button to send it food relief.',
    after:
      'A region’s card holds everything about one place. National figures are built from the regions, so one left behind holds the country back.',
  },
  {
    target: 'projects',
    waitFor: 'plan-project',
    title: 'Plan a project',
    text: 'Projects raise living standards for good, but take money and time. Plan one of those affordable now, or select an empty site on the map and plan it from its card. A farm road is cheap and quick.',
    after:
      'Planned. Building starts when the quarter ends, and the timeline under the map shows when it opens. Until then you can take it back.',
  },
  {
    target: 'end-quarter',
    waitFor: 'end-quarter',
    title: 'End the quarter',
    text: 'Your decisions are set. End the quarter: the harvest comes in, events fire, and the country moves on three months.',
    after: 'The quarter is over and the next has begun.',
  },
  {
    target: 'dilemma-panel',
    waitFor: 'answer-dilemma',
    title: 'Answer a dilemma',
    text: 'The new quarter puts a dilemma to you. Each answer says what it will do before you choose. Pick one; the quarter cannot end until you have.',
    after:
      'Answered. The answer takes effect when the quarter ends, and you can change it under Decision until then.',
  },
  {
    target: 'reports',
    waitFor: null,
    title: 'Read the report',
    text: 'What happened last quarter and why, the most serious first. A report about one region is a button that picks that region out on the map.',
  },
  {
    target: 'risks',
    waitFor: null,
    title: 'Look ahead',
    text: 'The dangers of the coming quarters, with how likely each is under the decisions you have committed. Forecasts are ranges, not promises. Every loss can be traced to a warning here.',
  },
  {
    target: 'timeline',
    waitFor: null,
    title: 'The term',
    text: 'Your project is a bar over the quarters it is built in. Harvests are underlined, and the election is marked at the end. A project that opens after the vote does nothing to win it.',
  },
  {
    target: 'finance',
    waitFor: null,
    title: 'Borrowing',
    text: 'A loan brings money forward, at the price of repayments that squeeze the budget later. The panel shows what each would cost before you take it. Taking one is up to you.',
  },
  {
    target: 'end-quarter',
    waitFor: 'end-year',
    title: 'Finish the year',
    text: 'Play the rest of the year yourself: set the budget, watch the risks, and end each quarter until the new year begins.',
    after: 'A year in office is behind you.',
  },
  {
    target: null,
    waitFor: null,
    title: 'Now and later',
    text: 'Subsidies and tax cuts buy approval now. Roads, power and schools raise living standards later, often after the next election. Borrowing pulls the future forward at a price. Staying in office while building for the long run is the game. Good luck.',
  },
];
