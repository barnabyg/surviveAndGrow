import type { TourStep } from './tourSteps';

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
    text: 'Projects raise living standards for good, but take money and time. Press Browse projects to see those affordable now and plan one, or select an empty site on the map and plan it from its card. A farm road is cheap and quick.',
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
