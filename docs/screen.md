# The screen

What each part of the screen shows and does, as built. The rules the game plays by are in
[rules.md](rules.md), and a guide for the player in [playing.md](playing.md).

- **Tour** in the top bar opens a guided tour of the screen in a game in play. A step at a time,
  it shades the screen but for one part of it, drawn round with a thick outline, and says beside
  it what that part is for: the vital signs, the end-quarter button, the left column, the lenses,
  the map, a region marked for a survey, the timeline and legend, and each decision panel,
  research among them. It says how far through it is, and
  Back, Next (or the arrow keys) and End tour (or Escape) move through it. A part not on screen,
  such as the dilemma panel with no dilemma waiting, or the mark of a region to survey once none
  is left, is passed over; a decision tab is shown
  while the tour or a lesson points at it, and the tab the player chose comes back after. The tour holds the screen while it is
  open.
- **Tutorial** on the start screen starts the tutorial game: a fixed game whose first year, on
  the country as it ships, has no drought, flood or world price shock, and one dilemma, as the
  second quarter begins. Its lessons take the player through that year. Each draws round a part
  of the screen without shading it, says what to do there, and moves on by itself once it is
  done, saying what the action did: commit a budget, choose the food lens, select a region, plan
  a project, end the quarter, answer the dilemma, then read the report, the risks ahead, the
  timeline and the borrowing panel, and end the year. Skip lesson passes one by, and End
  tutorial leaves an ordinary game; either way the game is saved as usual. A saved tutorial game
  resumes at the lesson it was on. The tour's steps are written in `src/ui/tourSteps.ts`, the
  lessons in `src/ui/lessonSteps.ts`, the first-time tips in `src/ui/tips.ts`, and the game's
  seed in `src/ui/tutorialGame.ts`.
- In any game, a first-time tip explains a mechanic the first time it appears, drawn round the
  part of the screen it concerns like a lesson: a dilemma, a bailout, a drought or flood warned of
  in risks ahead, a strike or protest, a world price shock announced, a planned project whose
  chain is missing a link, a site decaying, the election four quarters away, a prosperity tier
  passed, research, once its tab is first opened or research is planned, surveys, once the
  card of a region that may hide a deposit is first opened or a survey is planned, and Defence
  and the army, once the army anywhere is less than loyal or the budget in force would leave it so. When several are due, the first in that order shows. Got it dismisses one, and the
  browser remembers it was seen in every game and country, or for the visit if it will not store
  it. The top bar's Tips button turns them off, and on again, which shows them all afresh. A tip
  waits while the tour or a lesson is open. A tip about a decision panel behind another tab is
  drawn round the tab that opens it. The tips are written in `src/ui/tips.ts`.
- Each figure in the top bar shows its change this quarter and any warning, such as the food
  reserve below its safe level. Its standing note (the debt burden, the loan rates, the safe
  level, the strike threshold, the marks of the army's stages, the prosperity tier) is in its
  tooltip and at the head of its breakdown. Army loyalty names its stage beneath the figure,
  whatever it is: in a word while the army is loyal, and as a warning, with a sign and the mark
  it has fallen below, while it is restless or plotting.
- Click the treasury, the debt, the credit rating, the food reserve, approval, army loyalty or
  prosperity in the top bar to see what moved it. Approval, army loyalty, prosperity and the
  credit rating also list what they are made of, and army loyalty how the army stands in each
  region.
- A short trend line beside the treasury, the debt, the food reserve, approval, army loyalty and
  prosperity shows the last eight quarters, with the food reserve's safe level, the strike
  threshold, the mark below which the army is restless and the prosperity target drawn as
  dashed lines. The
  left column has a larger approval chart with the strike threshold and the 50% line marked.
- The region list in the left column gives each region's food situation, its living standard as
  a figure and a bar, and its army's stage in words with its loyalty, marked with a sign where
  the army is not loyal. A region's card gives its army's loyalty and stage among its figures.
- After each quarter the left column reports what happened and why, the most serious first: the
  budget outcome, forced spending cuts, the harvest, hunger and events. A report about one region
  is a button: select it to pick that region out on the map and open its card. A quarter in which
  nothing notable happened says so.
- Under the map a timeline shows the whole of the current term: every quarter to its election, with the past
  hatched, each harvest underlined and the vote marked. Each project is a bar over the quarters
  it is built in, followed by a bar that says how many quarters it will be in use before the
  vote. Pick out an empty site on the map and the timeline shows, dashed, what building there
  would mean if it began now, or says that it would not be finished before the vote. A project
  that will be finished only after the vote says when it opens, in a column beyond the vote. A
  project the treasury cannot pay for opens a quarter later for each quarter it waits.
- Buttons above the map choose what it shows. The country view is the land as it looks. The food
  lens colours each region by its food situation, and the approval lens by its approval, with
  hatching over a region on strike and cross-hatching over one in protest. The living-standards
  lens colours each region by its living standard, and the infrastructure lens by its
  infrastructure access, from none upwards; one site in use moves a region up a step. Where a
  technology known raises a region's access, through the power it is brought, the region's
  figure names it, and its description says what the access would be without it. The
  infrastructure lens also marks every link missing from a chain, ringed, with no site picked
  out, so you can see what each region has built and what it still lacks. It marks the trade
  links too: every port not yet in use has a dotted shipping lane tagged "✕ Missing trade link",
  and a decaying port's lane is tagged "▲ Weak trade link". Each lens has a scale beside the
  buttons, its steps differ in lightness, and every region also carries its value as text. The
  lens stays as you chose it from quarter to quarter, and sites, routes, trade routes, events and
  relief are drawn under all of them.
- The trade routes are drawn on the map from the country file: a bar where each border crossing
  meets its neighbour, and a shipping lane from each port in use to the edge of the map. Each
  route is as wide as what it can carry, with a pale core as wide as what it carried last
  quarter, and a tag gives both in tonnes: "600,000 t of 900,000 t". The mines' ore goes by the
  port its chain runs to, and grain bought and sold abroad over the border crossings first, then
  by sea; grain an order could not pay for, or a dilemma's answer left the reserve without, never
  crossed. A port that has just come into use has carried nothing yet. A decaying port's lane is
  dashed. Select a route to open its card: the mines' ore and the grain it carried last quarter
  and is to carry this quarter with the grain ordered so far, and how much of its capacity is
  free.
- The side columns scroll on their own when they run long, and the map gives up height to the
  timeline, so the whole screen stays in view.
