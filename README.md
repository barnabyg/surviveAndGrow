# Survive and Grow

A turn-based economics and politics survival game that runs in the browser. You lead a small
developing country: raise its living standards, and stay in office long enough to see it done.

The design is in [docs/design.md](docs/design.md).

## Requirements

- Node.js 24 or later.
- `npm ci` once after cloning.
- `npx playwright install chromium` once, for the browser tests.

## Play it

```powershell
npm run play
```

Or double-click `run.bat`, which also installs the dependencies if they are missing.

This starts the game at http://localhost:41730 and opens it in your browser. It is designed for a
2560 x 1440 display.

Add `?seed=7` to the address to replay a known game: the same seed and the same decisions
always give the same game. The summary at the end of a game gives its seed and offers to replay it.

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

### Your first term

The first term is 20 quarters, ending in an election. Win it and you govern on into another term;
the game itself is won on prosperity, held in the top tier.
It is meant to be hard. You take office with approval near 52%, a budget that loses $5.0m a
quarter, and a food reserve below its safe level. Left alone, the country votes you out, if a
drought does not starve a region first.

- **Feed people first.** Watch the risks in the left column. When a region runs short, pick it
  on the map and send it relief, and pay for relief only while someone needs it.
- **Stay solvent.** The treasury cannot go below nothing: spending is cut, and building pauses.
- **Earn the vote over the whole term.** Approval moves slowly towards where your tax and
  spending would settle it, and the election forecast in the right column says where you stand.
  Below 40% a region strikes, which costs far more revenue than the tax that provoked it.
- **If you build, build early.** The timeline under the map shows how long a site would be in
  use before the vote. What you build has to be kept up, so leave room for upkeep.

### A Phase 2 play-through

To play the finished Phase 2 game from the start on a seed the balance run knows well:

```powershell
Set-Location C:\docs\git\surviveAndGrow; npm.cmd run dev -- --open '/?seed=8'
```

This starts the game at http://localhost:41730/?seed=8 and opens it in your browser. On seed 8
the scripted chain builder wins in quarter 37, early in its second term; the scripted player who
builds only small sites loses the vote in its third term, and one who builds only power in its
second. Try to win the same way:

1. In the first year, build the Korr Falls power station and then its three power lines, and
   send relief wherever the risks show hunger. Expect Developing, and a 3-point drop in the
   approval baseline, soon after the lines open.
2. Keep the budget a little in surplus and save: the treasury must hold a site's whole cost
   before it can start. Start Saltmouth port (or the cheaper quay), then the trunk road, then the
   Korrgate mine, each as soon as the treasury can pay for it. Use the infrastructure lens to see
   which links of the chain are still missing.
3. Spend your savings on approval in the last year before each vote. The second vote is the
   hard one: the chain costs most then, and pays off after it.
4. Once the mine earns, build the small sites and spend on health and education. The game is won
   when prosperity has stood at 42 or more, Prosperous, for four quarters running; the top bar
   counts them.

Expected: the mine adds $60.0m a quarter to the Korr Highlands once its road and port are in use,
the prosperity breakdown is led by infrastructure access, and a win shows the end-of-game summary
with each term served. Losing the second vote while the chain is still being built is common: it
is the risk the game is about.

### A Phase 3 play-through

To play the finished Phase 3 game, with borrowing, from the start on a seed the balance run
knows well:

```powershell
Set-Location C:\docs\git\surviveAndGrow; npm.cmd run dev -- --open '/?seed=6'
```

This starts the game at http://localhost:41730/?seed=6 and opens it in your browser. On seed 6
the scripted chain builder, which saves up for each site, loses the vote at the end of its
second term; the scripted sensible borrower wins in quarter 36, late in its second term; and the
reckless borrower is bailed out and loses its first vote. Try to win the way the sensible
borrower does:

1. Borrow for the mine's chain rather than save for it. In the first year a loan of $10.0m with
   the treasury's $42.0m pays for Saltmouth port, then a $50.0m loan over 12 quarters for the
   trunk road; in the second year a $10.0m loan tops up the savings for the Korrgate mine. The
   money arrives as the quarter ends: start the site the quarter after. Keep the repayments
   within 15% of a quarter's revenue.
2. Keep the budget balanced with the repayments in it. Expect the tax near 27% while the loans
   run, approval to sag in the second and third years, and the credit rating to rise to AA as
   the repayments are made on time.
3. Once the mine earns, in the fourth year, the loans are soon repaid and the tax can come down.
   Build the power station from savings, spend on approval in the last year before the vote, and
   win it.
4. In the second term build the power lines and the small sites. Each tier passed lowers
   approval for a while. The game is won when prosperity has stood at 42 or more for four
   quarters running with the debt burden no more than 30% of a year's revenue; the top bar
   counts the quarters and says whether the debt test is passed.

Expected: the finance panel offers loans at 6% to 10% while the nation is rated A; the debt and
its burden sit beside the treasury in the top bar; the rating is raised to AA in the third year.
To see the other side, borrow everything the finance panel allows and spend it: the treasury
cannot cover a repayment, a bailout consolidates the debt, approval takes a 12-point blow and
austerity holds for 8 quarters.

What is in the game:

- Set the tax rate and the spending for each area in the right column. The panel shows what a
  change would do before you commit it. End the quarter with the button in the top bar.
- Each region feeds itself from its own harvest, which comes in quarter 4, and sends its surplus
  to the national food reserve. The harvest forecast is a range that narrows through the year.
- A drought cuts a region's harvest and is announced two quarters ahead. A region that runs short
  goes from adequate to tight, to shortage, to famine. Pick the region on the map, or in the food
  relief panel, to send it relief from the national reserve.
- A famine that lasts two quarters running collapses the state and ends the game.
- A term is 20 quarters, and an election is held when the last of them ends. The vote share is
  national approval on polling day, moved up to 3 points either way by the campaign. With 50% or
  more you are re-elected and a new term begins, with no limit on how many; with less you lose
  the game. The top bar counts down to the election that closes the current term, and the right
  column forecasts the vote as a range against the 50% needed.
- You win the game by holding national prosperity in the top tier, Prosperous, for four quarters
  running, with the debt burden no more than 30% of a year's revenue as the fourth quarter ends:
  the debt test, which keeps a win bought with a borrowing binge from counting. A burden over the
  limit does not end the hold; it keeps counting, and the game is won as the first quarter ends
  with the burden brought within the limit. Once there, the prosperity figure in the top bar shows
  how many of the four you have held and whether the debt test is passed, and its breakdown shows
  how far the debt burden is from the limit and says when the debt test is all that stands between
  you and the win.
- However the game ends, a summary gives the outcome and its cause, how long you were in office
  over how many terms, the treasury, debt, debt burden, food reserve, approval and prosperity over
  the whole game, and each term in turn with prosperity at its start and end. From it you can
  replay the same game or start a new one.
- Approval is the third vital sign. Each region has its own, and the national figure is their
  average by population. It answers to the region's food situation, the tax rate, and health,
  education and security spending per head, and it moves a tenth of the way each quarter towards
  where those would settle it, so the public remembers: a last-minute giveaway moves the vote
  little, and a hard year is not forgotten by polling day. The budget panel shows what a change would do to approval next
  quarter and where it is heading.
- A region whose approval falls below 40% goes on strike and produces 30% less, which costs the
  treasury tax. Below 30% it protests and produces 60% less. Both end when approval recovers.
- Prosperity, the game's objective, is the fourth figure in the top bar, on a scale of 0 to 100
  against the target of 42. Each region has a living standard built from food security, income
  per head, health, education and infrastructure access (the sites in use there, and power),
  weighted 15% each for the first four and 40% for infrastructure, so building is the main road
  to prosperity. A small site in use adds 20 to 30 points of infrastructure access to its region,
  a large one 10 to 40, and power 15. Prosperity is the regions' living standards averaged by
  population. The region list in the left column
  shows each region's living standard as a figure and a bar, so inequality shows at a glance.
- Prosperity is divided into four tiers: Subsistence, then Developing from 30, Industrialising
  from 38 and Prosperous from 42, the target. Tavara starts at about 21. The prosperity figure names the tier in force and
  how far it is to the next. Passing a tier is reported, gives the whole map a new palette, and
  raises what people expect, so the approval baseline drops 3 points a tier (shown as
  Expectations in what approval is made of). A tier is lost only when prosperity falls 2 points
  below where it begins; falling back is reported too, the map's look follows it down, and
  expectations ease. The risks ahead warn when the nation is on course to fall back.
- Each region's people grow in number every quarter, about 1.2% a year, except where famine has
  taken hold. Standing still loses: food need, the relief a region needs and the months the
  reserve lasts all follow the larger population, and output per head falls unless the economy
  keeps up. A region's card shows how many people it gained, or lost to famine, last quarter.
- Health and education are lasting levels in each region. Spending on them builds the levels up
  over many quarters, and they wear down without it; a game starts with them where the starting
  budget holds them. Their spending still moves approval at once, as before.
- Click the treasury, the debt, the credit rating, the food reserve, approval or prosperity in the
  top bar to see what moved it. Approval, prosperity and the credit rating also list what they
  are made of.
- A short trend line beside the treasury, the debt, the food reserve, approval and prosperity shows the last
  eight quarters, with the food reserve's safe level, the strike threshold and the prosperity
  target drawn as dashed lines. The
  left column has a larger approval chart with the strike threshold and the 50% line marked.
- After each quarter the left column reports what happened and why, the most serious first: the
  budget outcome, forced spending cuts, the harvest, hunger and events. A report about one region
  is a button: select it to pick that region out on the map and open its card. A quarter in which
  nothing notable happened says so.
- The map marks the sites where something could be built, such as an irrigation scheme, a farm
  road or a grain store. An empty site is a dashed round marker with the symbol of its type, and a possible
  road is a dashed line. Select one to open a card with its cost, build time and effect. The
  legend under the map explains the marks.
- Start a project from a site's card, or from the list of what the treasury can afford in the
  right column. The treasury must hold the whole cost, which is then paid in instalments over the
  build time, as a fixed cost shown apart from the budget's sliders. Building starts when the
  quarter ends, so until then the plan can be taken back.
- The budget's own spending is paid first and instalments out of what is left, the oldest project
  first. A project the treasury cannot pay for pauses for the quarter and carries on when it can
  be paid. The map shows how far each has got, and a road is drawn along the part that is built.
- A finished site is in use from the next quarter. Irrigation halves how far the weather and
  drought move its region's harvest; a farm road halves the share of its region's surplus lost on
  the way to the reserve; a grain store cuts what spoils in the national reserve by a quarter.
  Several of one type multiply together.
- Every site in use needs upkeep each quarter: $0.4m for an irrigation scheme, $0.3m for a farm
  road and $0.2m for a grain store. Upkeep is a spending area with its own slider, and it is spent
  only as far as the sites in use need it, so setting more than they need costs nothing. The
  budget panel shows what they need against what is spent, and a game starts with enough upkeep
  for every site the country has, counting only the costlier of two alternatives.
- When upkeep falls short, by a cut to the slider or because the treasury cuts every area, sites
  decay. Upkeep keeps sites in good repair in the order building began on them, so the newest
  decay first. A decaying site does half of what it does in good repair, and adds half as much to
  its region's infrastructure access, from the quarter after its upkeep went unpaid. It wears the
  warning triangle on the map, and its card says why and what restores it. A quarter in which its
  upkeep is paid restores it from the next. Decay and recovery are reported, and the risks ahead
  warn when upkeep will fall short.
- Some sites form a chain. A mine adds $60.0m a quarter to its region's output, which is taxed and
  raises its people's income, but only while a trunk road links it to a port and both are in
  use. Each link carries only so much: a trunk road $72.0m a quarter and a port $90.0m, and a
  decaying link half as much, so the chain yields no more than its weakest link. These are large
  projects ($40.0m, $30.0m and $50.0m; 6, 5 and 8 quarters to build; $0.6m, $0.5m and $0.8m
  upkeep), and one started late in a term opens after the vote. A mine's card lists every site
  of its chain with how it stands, marks the missing links and the bottleneck, and says what the
  mine earns. Picking out a mine, or any site of its chain, draws the missing links on the map:
  a dotted route or a crossed marker, each tagged "✕ Missing link". A mine in use that earns
  nothing is tagged "▲ Earning nothing", and what a mine earns is taxed as a line of its own.
- Some sites are alternatives: one game cannot build everything. Next to Saltmouth port, Tavara's
  deep-water port, is Saltmouth quay, a shallow port at half the cost ($25.0m, 5 quarters to
  build, $0.4m upkeep) that ships only $36.0m a quarter, less than the mine produces. Either
  completes the mine's chain. The card of a site with alternatives, and the affordable list, say
  what starting it closes for good, and the two cannot be planned together. Once building begins
  on one, the other is closed: it is faded and struck through on the map, and its card says which
  choice closed it and offers no start.
- Power reaches a region along a power line. Tavara has one power station, at Korr Falls ($30.0m,
  5 quarters to build, $0.5m upkeep), and three power lines from it, to Arden, Lowmere and
  Korrgate ($6.0m, 2 quarters, $0.1m upkeep each). A region is powered while a power line of its
  own in use links it, directly or through other lines, to a station in use; a station alone
  powers no region, not even its own. A powered region produces 20% more of its own output, which
  is taxed as a line of its own, and gains 15 points of infrastructure access. While the station
  or a line on the way decays, the region has half of each. The region's card says where its
  power comes from and breaks its output and infrastructure access into their parts, and a power
  site's card names the regions it powers. Power lines are drawn as fine dashed lines in every
  state. A site can need power to produce: in the test country, the mine's chain runs through a
  power line and its station as well as a trunk road and a port.
- The nation can borrow. The finance panel in the right column offers a loan of $10.0m, $25.0m
  or $50.0m over 4, 8 or 12 quarters, at 6%, 8% or 10% a year to a nation rated A, and shows the quarterly repayment
  and the interest in all before you plan it. Like a project, the money arrives when the quarter
  ends, so until then the plan can be taken back. Repayments of interest and principal begin the
  quarter after, and are paid before anything else: a heavy debt squeezes the budget and building.
  Rated A, the nation may owe no more than a year's revenue at the budget in force. The debt sits beside
  the treasury in the top bar with its debt burden, what is owed against a year's revenue; click
  it to see each loan, what is still owed and the quarters left. A repayment that the treasury
  and the quarter's revenue cannot cover is a missed payment, which brings a bailout (below).
  Taking and repaying a loan are reported, and the treasury's breakdown lists each repayment.
- The nation has a credit rating, one of AA, A, BBB, BB and B, which sets the rate of a new loan
  (AA takes a point off every rate; BBB adds 1.5 points, BB 3 and B 5) and the most that
  may be owed (from 125% of a year's revenue at AA down to 25% at B). Loans already taken keep
  the rate they were taken at. The rating is reassessed as each quarter ends from a score: the
  payment record, less a share of the debt burden and of the quarter's deficit (spending beyond
  revenue, not counting repaid principal). A game starts with a record of 700, rated A unless
  the country starts in debt, when the debt burden sets its opening rating. A missed
  payment brings a bailout, which leaves the record at 0 and the rating at B; each quarter whose
  repayments are all made on time puts 25 back, up to 1,000. The rating sits in the top bar; click it to see the score's parts
  and every step with its rates and limit. The finance panel shows the rates the rating gets and
  what a step up or down would mean, and says when the loans planned or the budget would cut or
  raise it; the budget's outlook shows the rating next quarter. A change of rating is reported
  with its cause, and the risks ahead warn when it is on course to fall, and why.
- Rated AA, the best rating, the nation can issue bonds. A game opens at A, so bonds must be
  earned: repaying debt on time adds 25 points a quarter to the payment record, and with a small
  loan and no deficit AA comes in about nine quarters. The finance panel offers a bond of
  $20.0m, $50.0m, $100.0m or $200.0m maturing in 8, 12 or 16 quarters, at 3.5%, 4% or 4.5% a
  year, below any loan's rate at AA. It shows the quarterly interest, the date the whole sum
  falls due and the interest in all before you plan it, and the plan can be taken back until
  the quarter ends. Only interest is paid each quarter, first like a loan's repayment; the whole
  sum falls due in one payment at maturity. A maturity the treasury and the quarter's revenue
  cannot cover is a missed payment, and brings a bailout like any other. Bonds count in the
  debt, the debt burden, the most that may be owed and the rating, so issuing a large one can cost the AA that allowed it. Below AA the finance panel
  says what rating bonds need. The finance panel and the debt's breakdown list each bond with
  its maturity, the timeline marks every maturity (in the column beyond the vote for one that
  falls due after it), and the risks ahead warn of a maturity the treasury is not on course to
  cover: inside the four quarters played from the quarters themselves, and further off by
  carrying the treasury on at the pace those quarters set, less the principal other debts repay
  first.
- A missed payment on any loan or bond does not end the game: it brings a bailout. Lenders
  consolidate everything owed, with the interest that went unpaid, into one bailout loan at 7% a
  year, repaid over 16 quarters from the next; anything to be borrowed that quarter is not lent.
  The credit rating falls to B, and approval takes a 12-point blow in every region that fades
  like any passing event. Austerity then holds for 8 quarters: the tax rate cannot go below 25%,
  spending on agriculture is capped at what the game began with and on health, education and
  security at four fifths of it (on a $1.0m step, never below one step), and no loan, bond or
  project can be started; projects under way carry on, and food relief and upkeep are not
  capped. The bailout brings the budget in force within those limits. The budget's sliders stop
  at the floor and the caps and say so, the finance and projects panels and a site's card say
  why nothing can be started, and the top bar counts down the quarters left. Austerity ends on
  schedule if the payments are made; a missed payment during it consolidates the debt again and
  extends it by 4 quarters, and never ends the game. The report says what the bailout did, when
  austerity is extended and when it ends, and the risks ahead warn of a bailout, or of austerity
  extended, on the current course.
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
  infrastructure access, from none upwards; one site in use moves a region up a step. The
  infrastructure lens also marks every link missing from a chain, ringed, with no site picked
  out, so you can see what each region has built and what it still lacks. Each lens has a scale
  beside the buttons, its steps differ in lightness, and every region also carries its value as
  text. The lens stays as you chose it from quarter to quarter, and sites, routes, events and
  relief are drawn under all of them.
- The left column lists the risks ahead: famine in a region, strikes, a treasury that runs out,
  a bailout from a missed payment on a loan, a bond's maturity the treasury cannot cover, a cut in the credit rating, and, in the term's last four quarters, losing the vote. The game plays the next four quarters with your committed decisions held as they are, once
  for each course the weather could take and each drought that could still begin, and lists each
  danger with how likely it is, as a five-step meter and in words, and a line saying why. Hunger
  shows a quarter after the harvest that causes it, so famine alone is looked for one quarter
  further. A danger too unlikely to matter is left out, unless it would end the game, and a risk
  to one region picks that region out on the map. Neither famine nor a lost election can end the
  game without having been listed first.
- Some quarters open with a dilemma: a neighbour offering grain, merchants wanting to buy from
  the reserve, a region in drought asking for emergency works, strikers asking for talks,
  teachers demanding a pay rise, a donor offering a grant with conditions. Each has two or three
  options, and each option states everything it will do, in money, food and approval, before you
  choose. You can put the dilemma aside to look at the country, but the quarter cannot end until
  you choose, and you can change your choice until it does. An option the treasury or the reserve
  cannot cover is shown and cannot be chosen. The choice takes effect when the quarter ends, the
  outlook and the risks count it at once, and the next report says what you chose and what it did.
- Which dilemmas arise, and when, is fixed by the seed, and they leave the weather a seed brings
  as it was. The risks ahead suppose that no new dilemma arises, since what one does is your choice.
- The side columns scroll on their own when they run long, and the map gives up height to the
  timeline, so the whole screen stays in view.

## Write a country

A country is one data file; the engine contains no country-specific code. The country that ships
is [src/countries/tavara.json](src/countries/tavara.json), and it is the best guide to the format.
All positions are coordinates in a fixed map frame 1080 wide and 720 high.

`sites` lists where things can be built. Each site has an `id`, a `name`, the `region` it belongs
to and a `type` from the game's own list: `irrigation`, `farmRoad`, `grainStore`, `mine`,
`trunkRoad`, `port`, `shallowPort`, `powerStation` or `powerLine`. What a type costs, how long it takes and what it does are
the game's, not the country's.

- An irrigation scheme, a grain store, a mine, a port, a shallow port and a power station stand
  in one place, given by `at`, which must lie inside the site's region.
- A farm road, a trunk road and a power line run along a line, given by `route` as two or more positions. Every position must
  lie inside the country, and the route must start or end in the site's region, which is the
  region the road serves or the line powers.
- In a file of `"formatVersion": 2`, a site may list the `id`s of the sites it depends on in
  `dependsOn`. Each must be another site in the file, and the dependencies must not go round in a
  circle. A file of format 1 cannot say this, and still loads as it is.
- A mine earns only through its chain, so it must depend, directly or through other sites, on a
  port or shallow port: in Tavara the mine depends on a trunk road and the trunk road on a port. A
  mine therefore needs format 2.
- A power line carries power only from a station, so it must depend on a power station, directly
  or through other power lines: in Tavara each line depends on Korr Falls power station. A power
  line therefore needs format 2. Any site may depend on a power line or station, as a mine may
  to need power for its chain.
- In a file of `"formatVersion": 3`, a site may list the `id`s of the sites it is an alternative
  to in `alternatives`. Saying so on one side is enough: building on either closes the other. Each
  must be another site in the file that plays the same part in a chain (a port and a shallow port
  are both outlets) and in bringing power, and a site may not depend on its own alternative. A site that depends on a
  site with alternatives depends on whichever of them is chosen: in Tavara the trunk road depends
  on Saltmouth port, and Saltmouth quay, its alternative, serves as well. Files of formats 1 and 2
  cannot say this, and still load as they are.

The starting budget in `start.budget` may leave out `upkeep`: the game then starts with enough
upkeep to keep in good repair every one of the file's sites that can stand together, choosing the
costlier of alternatives, rounded up to the next $1.0m.

In a file of format 2, a region may also set `populationGrowth`, its people's growth in percent a
year, from 0 to 10. A region that leaves it out grows at the game's own rate.

In a file of `"formatVersion": 4`, a country can start in debt. `start.loans` lists the loans it
owes as the game begins, each with its `amount` in millions, its yearly `rate` in percent (to at
most two decimal places, from 0 to 25) and the `quarters` left to repay it (1 to 40):

```json
"loans": [
  { "amount": 7, "rate": 7, "quarters": 8 },
  { "amount": 4, "rate": 9.5, "quarters": 12 }
]
```

They are owed as Loan 1, Loan 2 and so on, in the file's order, and repaid like any other loan,
in level repayments of interest and principal, the first in the game's first quarter. The game
opens at the credit rating its debt burden leads to under the usual rules; the file does not
state it. A country may start with at most five loans, owing between them no more than half a
year's output from its regions, and their first repayments must be payable from the starting
treasury and the first quarter's tax, so that the game cannot open on a missed payment. Testland,
the test country, starts owing $11.0m, which opens it at BBB. A file of an earlier format starts
owing nothing, and still loads as it is.

`dilemmaLikelihood` says how likely each dilemma is: the chance, from 0 to 1, that it arises as a
quarter begins, provided the conditions it needs hold. The dilemmas are the game's own:
`grainOffer` (the reserve is below its safe level), `merchantOffer` (the first quarter of a year,
with the reserve above its safe level), `emergencyWorks` (a region is in drought), `strikeTalks`
(a region is striking or protesting), `teachersPay` (any time) and `donorGrant` (the treasury is
low). One the file leaves out never arises, and the whole entry may be left out. What each
dilemma offers scales with the country's population, so the same dilemma suits a country of any
size.

To try a country of your own, put the file in `public/countries/` and name it in the address:
`?country=/countries/mine.json`. The game checks the file as it loads and lists everything that
is wrong with it.

A saved game carries the country file it was started on, so it goes on being played on that
country even after you edit the file. Start a new game to play your changes.

## Check it

```powershell
npm run verify
```

This one command runs every check, in this order, and fails on any error or warning. Continuous
integration runs the same command on every push and pull request.

| Gate | Tool | Script |
| --- | --- | --- |
| Formatting | Prettier | `npm run format:check` |
| Lint and static bug analysis | ESLint with the strict, type-checked typescript-eslint rules | `npm run lint` |
| Type check | TypeScript in strict mode | `npm run typecheck` |
| Simulation tests | Vitest | `npm run test:unit` |
| Dependency vulnerabilities | `npm audit`, less the dated exceptions in `scripts/audit.ts` | `npm run audit` |
| Build | Vite | `npm run build` (run by the next gate) |
| Browser tests | Playwright, against the production build | `npm run test:e2e` |

`npm run format` rewrites files to the house format.

Gates that do not apply:

- **Secret scanning** has no local tool. The game has no server and holds no credentials;
  GitHub's push protection covers the repository.
- **Packaging** is the Vite build. Nothing is published to a registry.

## Balance it

```powershell
npm run balance
```

This plays scripted players through whole games with no screen, on the countries as they ship,
for up to four terms each, and reports how often each wins on prosperity, how often it is still in
office when its terms are up, and what the others lose to: the vote, by term, or famine, by
region. It also gives the terms served, the quarter of each win, and the prosperity and tier each
game reached, and what each player borrowed: how many games a bailout struck, how often the debt
test held back a win and whether it was won later, and the debt burden. It prints the tables and writes them to `balance-results.md`. It is not one of the
checks and gates nothing; a short run of the same players over a few seeds is part of the
simulation tests. The games are shared out among worker processes, so a run uses most of the
machine; 300 seeds of every player take a few minutes.

Six players are what the balance is judged by: one that does nothing, one that spends
everything on popularity, one that plays sensibly but builds no large site, one that builds
power and the mine's chain and saves up for each site, one that builds the same sites but
borrows for them within limits of its own, and one that borrows recklessly. They are in
`tests/balance/players.ts`, with a handful of one-lever players that probe for a trick that wins
on its own, two that build only part of the chain and one that borrows all it can to build
everything at once.

The runs the values were tuned to, with their seeds, the values changed and what they showed, are
recorded in [docs/balance/phase-1.md](docs/balance/phase-1.md) for Phase 1,
[docs/balance/phase-2.md](docs/balance/phase-2.md) for Phase 2 and
[docs/balance/phase-3.md](docs/balance/phase-3.md) for Phase 3.

Set these before the command to change the run:

| Variable | Meaning | Default |
| --- | --- | --- |
| `BALANCE_SEEDS` | The seeds to play, as `from-to` | `1-300` |
| `BALANCE_COUNTRY` | `tavara`, `testland` or `both` | `both` |
| `BALANCE_PLAYERS` | `all` adds the one-lever and partial players; or the players' names, separated by commas | the six |
| `BALANCE_TERMS` | The most terms each game is played for | `4` |
| `BALANCE_WORKERS` | How many games are played at once | all but two processors |
| `BALANCE_OUT` | Where the tables are written | `balance-results.md` |

```powershell
$env:BALANCE_SEEDS = '1001-2200'; $env:BALANCE_PLAYERS = 'all'; npm run balance
```

## How the code is laid out

- `src/sim/` is the simulation. It is a pure function of the game state, the player's decisions
  and a seeded random generator, and it knows nothing about the interface, the clock or storage.
  The lint rules and `tsconfig.sim.json` enforce this. Everything else reaches it through
  `src/sim/index.ts`. [src/sim/README.md](src/sim/README.md) gives the order a quarter is
  resolved in and the files a new mechanic touches.
- `src/countries/` holds the countries that ship, as data files. The engine contains no
  country-specific code.
- `src/ui/` is the interface. Each component imports its own stylesheet, named after it
  (`MapView.css` beside `MapView.tsx`). `styles.css` holds the colours, the base elements and
  the rules several components share, and `chart.css` and `map-card.css` are shared by the
  two components that draw charts and the two map cards. `main.tsx` imports `styles.css`
  before the components, so their rules come after it.
- `tests/sim/` tests the game rules through the simulation's public interface.
- `tests/e2e/` drives the real app in a browser at 2560 x 1440.
- `tests/countries/` holds a crude second country, used to prove that nothing is tied to the first.
- `tests/balance/` holds the scripted players and the balance run.
- `tests/saves/` holds a saved game from each save format, kept so that every later release can
  prove it still opens them. They are never regenerated; see its README.
- `docs/adr/` records decisions that are hard to reverse.

The save format and the country file format are compatibility contracts: a later release must
still read what this one writes. The save format, and how to change it, are in
[docs/adr/0001-save-format.md](docs/adr/0001-save-format.md). `npm run save:fixture` writes the
kept save for a new format.

Both test suites run in parallel. They stop at the first failure in continuous integration and
report every failure locally. Set `E2E_PORT` to run the browser tests from two checkouts at once.
Each browser test has storage of its own, so one test's saved game never reaches another.
