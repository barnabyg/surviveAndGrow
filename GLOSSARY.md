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
  finished: building on a site, until it is in use, research, until its technology is known, or
  a survey, until its region is surveyed.
- **Target**: what a project is for: a site, a technology or a region (`ProjectTarget` in
  `src/sim/projects.ts`). Every project is paid for, paused and barred in the same way, whatever
  its target.
- **Technology**: one entry of the engine's technology tree, such as drought-resistant seed. It
  has prerequisites, a cost, a research time and a lasting effect once **known**. The list is the
  engine's (`TECHNOLOGIES` in `src/sim/vocabulary/technologies.ts`); a country file cannot add one. Not
  "tech" or "upgrade".
- **Improvement**: what a technology does for a type of site (`improves` in
  `balance.technologies`): it leaves less of what the site's effect bears on, raises what the site
  carries in a chain, or raises what a power station's power gives a region. It pays off only
  where such a site is in use, and every figure it moves names it. Not "upgrade" or "bonus".
- **Locked site**: a site that cannot be started until the technologies it needs are known: the
  one that unlocks its type (a dam needs hydropower) and any its country file names in `needs`.
  It is on the map, marked with a padlock, and is an empty site like any other once they are
  known. Not "hidden", which is a deposit's state before a survey.
- **Dam**: a type of site research unlocks. It is a power station that also lessens how far the
  weather moves its own region's harvest, as irrigation does.
- **Clinic**, **school**: the types of site that serve a region's people, each unlocked by
  research of its own (public health, teacher training). One in use raises where its region's
  health or education level settles (`services` in `balance.sites`), on top of what spending
  holds. Not "hospital" or "service building".
- **Research**: the project that makes a technology known. It is on no site, needs no upkeep and
  never decays, and one technology is researched at a time.
- **Deposit**: ore a country file hides in a region (`deposits`): a mine and the trunk road that
  would serve it, with a likelihood and a range of sizes. It is not on the map, and nothing can be
  built on it, until a survey finds it; then its sites are built like any other. Whether it is
  there, and its size, come from the seed and the deposit. Not "resource" or "field".
- **Survey**: the project that finds out whether a region holds a deposit, and how large. It is
  on no site, and a region is **surveyed** once, whatever it found.
- **Chain**: sites that only earn together. A mine's chain is the mine, a trunk road and a port (or
  shallow port); the chain ships no more than its weakest link.
- **Alternatives**: sites that play the same part in a chain, of which only one can be built.
- **Upkeep**: the money that keeps sites in good repair. A site without it is **decaying** and does
  half of what it does in good repair.

## Food and trade

- **National reserve** (the food reserve): grain held nationally, fed by regions' surpluses and
  sent out as **relief**. Its **safe level** is three months' needs.
- **Good**: something the world trades in with a world price of its own: grain and ore
  (`GOODS` in `src/sim/vocabulary/trade.ts`).
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
- **Defence**: the spending area that buys the army's loyalty. Not "security", which is a
  spending area of its own that answers to approval, and not "the military".
- **Army loyalty**: how loyal the army is, by region and nationally, moved by Defence spending
  per head and by each region's own unrest. Its **stages** are **loyal**, **restless** and
  **plotting** (`ARMY_STAGES` in `src/sim/vocabulary/army.ts`).
- **Coup**: the army taking power, which loses the game. It comes when national army loyalty has
  ended a set number of quarters running at plotting; the running count is the **countdown**
  the top bar shows. Not "putsch" or "mutiny", and not a chance event: nothing is rolled.
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
