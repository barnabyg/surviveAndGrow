# Glossary

The game's own terms, as the code, the rules and the screen use them. The figures behind them are
in [docs/rules.md](docs/rules.md); this file says only what each word means. Use these words in
code, tests, issues and docs, and avoid the synonyms listed against them.

## Time

- **Quarter**: one turn. The player sets the budget and decisions, then ends the quarter, and the
  simulation resolves it (`src/sim/game.ts`). Not "turn" or "round".
- **Term**: the 20 quarters between elections. An election is held as a term's last quarter ends.
- **Seed**: the number that fixes every chance in a game. The same seed and decisions always give
  the same game.

## Building

- **Site**: a place in the country file where one thing can be built: an irrigation scheme, a road,
  a port, a mine, a power station and so on.
- **Project**: anything with a cost, a build time and a lasting effect, from planning until it is
  in use. Today every project is building on a site.
- **Target**: what a project is for: so far always a site (`ProjectTarget` in
  `src/sim/projects.ts`). Every project is paid for, paused and barred in the same way, whatever
  its target.
- **Chain**: sites that only earn together. A mine's chain is the mine, a trunk road and a port (or
  shallow port); the chain ships no more than its weakest link.
- **Alternatives**: sites that play the same part in a chain, of which only one can be built.
- **Upkeep**: the money that keeps sites in good repair. A site without it is **decaying** and does
  half of what it does in good repair.

## Food and trade

- **National reserve** (the food reserve): grain held nationally, fed by regions' surpluses and
  sent out as **relief**. Its **safe level** is three months' needs.
- **Good**: something the world trades in with a world price of its own: grain and ore
  (`GOODS` in `src/sim/vocabulary.ts`).
- **World price**: a good's price abroad, which moves every quarter. A **world price shock** pushes
  it for three quarters, announced two quarters ahead.
- **Trade link**: anything that carries goods across the border: a border crossing named in the
  country file, or a port in use. Not "trade route", except for the line the map draws for a link.

## Money

- **Treasury**: the money in hand. It cannot go below nothing.
- **Debt burden**: what is owed against a year's revenue.
- **Debt test**: the condition on a win that the debt burden is within its limit as the fourth
  quarter of the hold ends.
- **Credit rating**: the grade, from AA down to B, that sets loan rates and the most that may be owed.
- **Bailout**: what a missed repayment brings: the debt consolidated, an approval blow, and
  **austerity** for a fixed number of quarters.

## Standing

- **Approval**: the public's support, by region and nationally. The vote share at an election.
- **Prosperity**: the national living standard, on one scale. Its **tiers** are Subsistence,
  Developing, Industrialising and Prosperous; holding Prosperous for four quarters wins the game.
- **Dilemma**: a choice the game puts to the player, with two or three options that each state
  everything they will do. The quarter cannot end until it is answered.

## Learning the game

- **Tour**: the guided tour of the screen, opened from **Tour** in the top bar. It shades the screen
  but for one part at a time. Its steps are in `src/ui/tourSteps.ts`.
- **Tutorial**: the fixed game started from **Tutorial** on the start screen; its seed is in
  `src/ui/tutorialGame.ts`.
- **Lesson**: one step of the tutorial, asking the player to do one thing, and moving on once it is
  done. The lessons are in `src/ui/lessonSteps.ts`.
- **Tip**: a first-time tip, shown in any game the first time a mechanic appears, and turned off
  with **Tips** in the top bar. The tips are in `src/ui/tips.ts`.
