# Playing Survive and Grow

A guide for the player: how saved games behave, how to get through a first term, and a
play-through on a known seed. The [README](../README.md#play-it) says how to start the game. The
rules as built, one heading per mechanic, are in [rules.md](rules.md), and what each part of the
screen shows is in [screen.md](screen.md).

## Saved games

The game saves itself in your browser as each quarter ends. Open it again and it offers to resume
the saved game or to start a new one:

- A new game replaces the saved one when its own first quarter ends, and not before.
- Resuming opens the start of the quarter you had reached: the budget last committed, relief
  still going where you last sent it, and last quarter's reports. Budget changes you had not
  committed, projects you had planned and a dilemma you had answered were never part of the
  quarter, so they are not saved.
- A finished game is saved too, and opens again on its summary.
- A seed in the address is the seed of the next new game. It does not hide or discard a saved game.
- A save the game cannot open, such as one written by a newer release, is refused with the
  reason and left exactly as it is. While it is there nothing is saved, even a new game, until
  you choose to discard it.
- If the browser will not store the game (storage full or blocked, or a private window), the
  game says so and plays on.
- A country file you are trying out with `?country=` keeps its own save, apart from the game on
  the built-in country.

## Your first term

The first term is 20 quarters, ending in an election. Win it and you govern on into another term;
the game itself is won on prosperity, held in the top tier.
It is meant to be hard. You take office with approval near 52%, a budget that loses $7.0m a
quarter, and a food reserve below its safe level. Left alone, the country votes you out, if a
drought or a flood does not starve a region first.

- **Feed people first.** Watch the risks in the left column. When a region runs short, pick it
  on the map and send it relief, and pay for relief only while someone needs it.
- **Stay solvent.** The treasury cannot go below nothing: spending is cut, and building pauses.
- **Earn the vote over the whole term.** Approval moves slowly towards where your tax and
  spending would settle it, and the election forecast in the right column says where you stand.
  Below 40% a region strikes, which costs far more revenue than the tax that provoked it.
- **Keep the army loyal.** Defence in the budget is judged against what the army expects for
  the country's people. Cut it and army loyalty falls a part of the way each quarter, from loyal
  to restless and then to plotting; strikes in a region pull the army there down, and protests
  further. The top bar shows national loyalty and its stage, the budget panel what a change
  would do to it, and each region's card its own. An army that plots for four quarters running
  takes power, and the game is lost: the top bar counts the quarters left, the risks ahead list
  the coup before it can come, and Defence restored in time calls it off. An empty treasury
  cuts Defence with everything else, so insolvency can starve the army without your choosing to.
- **Deter the neighbours before you prosper.** Each neighbour has an ambition, which weighs
  nothing while the country is at Subsistence and more with every prosperity tier it passes.
  Defence spending also builds deterrence, one figure for the whole country, and it moves
  slowly, so raise Defence before the tier that needs it. A neighbour is peaceful, watchful or
  hostile by how deterrence stands against what its ambition weighs: its name on the map
  carries the word and a mark, its card says what it would take to change it, the budget's
  outlook says what a change to Defence would do, and the risks ahead warn before one turns
  hostile. A hostile neighbour may announce a border incident, two quarters ahead: for three
  quarters its crossings carry nothing, so less grain can be bought, and the regions on its
  border produce less and approve less, which can tip them into strikes. It is called off if
  the neighbour is no longer hostile as it would begin, so Defence raised at once can still
  stop it; the risks ahead give the chance of one, and what it would cost, while a neighbour
  is hostile.
- **Buy grain when the harvest fails.** The trade panel in the right column orders grain for the
  national reserve at the world price, which moves every quarter. Money can stand in for a bad
  season, and austerity does not stop it.
- **Sell a surplus after a good harvest.** The same panel sells grain from the reserve at the
  world price less a margin. Keep the reserve above its safe level: the panel and the risks
  ahead warn when a sale would take it below.
- **Trade needs links.** Grain crosses the border only as far as the crossings and ports carry,
  after the mine's ore. The trade panel shows what is free; a port widens it, and one left to
  decay carries half.
- **Don't bank on the mine.** A mine's ore sells at a world ore price that swings further than
  grain's. Its card shows the price, its forecast and what the mine earns across it, and the
  risks ahead warn when a slump would empty the treasury or miss a repayment.
- **Prepare for shocks abroad.** Failed harvests abroad push the grain price up, and an ore glut
  pushes the ore price down, for three quarters. Each is announced two quarters ahead, in the
  report, under the price and among the risks: stock the reserve before grain grows dear, and don't
  borrow against the mine before its ore cheapens.
- **Research for the long run.** The research tab holds the technology tree. Research is a
  project with no site, paid in instalments like a site and known for good once finished; one
  technology is researched at a time. Drought-resistant seed makes weather and drought move every
  region's harvest less. What builds on it improves what you have built: irrigation schemes, grain
  stores, trunk roads and ports, and power stations each do more, but only where one is in use.
  Each technology says what it would improve in your game, and a site's card, the breakdowns
  and the infrastructure lens name the technology behind each figure it moves. Hydropower unlocks the dam: until then a dam's site is locked,
  marked with a padlock, and its card names the research it needs.
- **Clinics and schools lift one region.** Public health and teacher training need nothing
  first; each unlocks a small, cheap site. A clinic in use lets its region's health level settle
  higher than health spending alone holds it, and a school its education level, climbing there
  over the quarters it is in use. The region's card shows both levels and names the clinic or
  school that raises one.
- **A dam does two jobs.** It powers the regions its lines reach, like a power station, and
  steadies its own region's harvest. It is dear and slow to build, and in Tavara it is an
  alternative to the Korr Falls power station: build one or the other.
- **Survey for ore.** A region marked with a magnifying glass may hide a deposit. Its card shows
  what a survey costs, how likely it is to find one and how large it could be; if it finds one,
  a new mine and road appear on the map, earning what the survey found once their chain reaches a
  port. A region is surveyed once, and the same seed always finds the same.
- **If you build, build early.** The timeline under the map shows how long a site would be in
  use before the vote. What you build has to be kept up, so leave room for upkeep.

## A play-through

To play the game as Phase 5 leaves it, from the start on a seed the balance run knows well, run
this in the repository's folder:

```powershell
npm.cmd run dev -- --open '/?seed=1'
```

This starts the game at http://localhost:41730/?seed=1 and opens it in your browser. On seed 1
the scripted chain builder, which never trades, loses its first vote with 48.8%; the timing
trader, which builds the same sites in the same order and trades grain besides, wins in quarter
30, in the third year of its second term. The improver, which builds the same sites and
researches the technologies that improve them, wins its first vote and loses its second.
Try to win the way the timing trader does:

1. Build as the chain builder does: the Korr Falls power station and its lines first, then
   Saltmouth port, the trunk road and the Korrgate mine, each once the treasury holds its cost.
2. In the third quarter of the first year failed harvests abroad are announced: the report says
   so, and the grain price in the trade panel lists the shock and its forecast rises. The
   reserve is below its safe level, so buy grain before the price rises, about 33,000 t, and
   17,000 t more the quarter after.
3. Once the first harvest is in, sell the surplus while grain is dear: 90,000 t a quarter, all
   the border crossings carry, at more than $320 a tonne while the shock lasts. Keep the
   reserve about a quarter above its safe level, and sell only while the price is at or above
   its usual $240. Each sale brings in about $23m, which builds the chain sooner.
4. Once the port is in use it carries far more grain, after the mine's ore: sell the surplus after
   each harvest, and buy back if a drought takes the reserve below its safe level.

Expected: the trade panel shows the price, its trend and forecast, what the links carry and what
is free; a sale's income and an import's cost appear in the treasury's breakdown; the failed
harvests abroad are listed under the grain price from their announcement to their end. Over
the 400 games of Phase 5's confirmation run on Tavara, the timing trader wins in quarter 32 in
the middle of its games, against the chain builder's 38
([balance/phase-5.md](balance/phase-5.md)).

The figures this section states for seed 1 are checked by tests that play the same player on
the same seed: the announcement and the trades of steps 2 and 3 in
`tests/sim/playThrough.test.ts`, and how each whole game ends in `tests/sim/players.test.ts`.
When a change to the game moves one, the test fails, and the figure is corrected here.
