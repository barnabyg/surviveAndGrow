import { listed, SPENDING_AREA_NAMES, SPENDING_AREAS } from '../sim';

/**
 * One step of the guided tour of the main screen. The step picks out the element marked
 * `data-tour="<target>"`, or with a null target stands alone in the middle of the screen.
 * A step whose element is not on screen, such as the dilemma panel with no dilemma waiting
 * or the mark of a region to survey once every region is surveyed, is passed over.
 */
export interface TourStep {
  readonly target: string | null;
  readonly title: string;
  readonly text: string;
}

/** The spending areas as a sentence names them, so that the tour keeps up with the budget. */
const SPENDING_AREAS_LISTED = listed(
  SPENDING_AREAS.map((area) => SPENDING_AREA_NAMES[area].toLowerCase()),
);

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
    text: 'The treasury, debt, credit rating, food reserve, approval, army loyalty, prosperity against its target and the time to the next election, always in view. Click a figure to see what moved it. The short lines beside them are the last eight quarters.',
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
    text: 'Each region’s food, living standard and army. National prosperity is built from the living standards, so a region left behind holds the whole country back. Select a region to open its card.',
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
    target: 'survey',
    title: 'Surveys',
    text: 'A magnifying glass marks a region that may hide a deposit of ore. Select the region, and its card says what a survey costs, how likely it is to find a deposit and how large one could be. A survey is a project with no site, and each region is surveyed once. A deposit found puts a mine and its road on the map to be built.',
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
    text: `The decisions are in tabs: budget, projects, research, finance, trade and relief, each saying where it stands. The budget sets the tax rate and spending on ${SPENDING_AREAS_LISTED}. Move a slider and the projection shows what it would do. Nothing counts until you commit it.`,
  },
  {
    target: 'projects',
    title: 'Projects',
    text: 'Anything with a cost, a build time and a lasting effect: irrigation, roads, ports, mines, power. Browse projects lists every one the treasury can cover now. A project planned now starts when the quarter ends, and can be taken back until then. Underfunded upkeep lets what you built decay.',
  },
  {
    target: 'research',
    title: 'Research',
    text: 'The technology tree. Research is a project with no site: one technology at a time, paid for in instalments and known for good once finished. Its tab says when nothing is being researched.',
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
    title: 'The quarter ahead',
    text: 'Pinned above the tabs: where your decisions leave the treasury, approval and the food reserve, and what approval would mean for the vote if the election were held at the end of this quarter.',
  },
  {
    target: 'tour',
    title: 'That is the screen',
    text: 'Everything that raises living standards pays off after the next election; subsidies and tax cuts buy approval now. The game is the gap between them. Reopen this tour here at any time.',
  },
];
