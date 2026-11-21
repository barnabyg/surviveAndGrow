# The rules as built

Every rule the game plays by as it stands, one heading per mechanic. The design intent and the
phase plan are in [design.md](design.md); where each rule lives in the code is in
[src/sim/README.md](../src/sim/README.md).

The figures here (costs, build times, upkeep, rates, limits, thresholds) come from
[src/sim/balance.ts](../src/sim/balance.ts). Nothing checks them against it, so a change to a
figure there must change it here in the same commit.

## The quarter and the budget

- Set the tax rate and the spending for each area in the right column. The panel shows what a
  change would do before you commit it. End the quarter with the button in the top bar.

## Food

- Each region feeds itself from its own harvest, which comes in quarter 4, and sends its surplus
  to the national food reserve. The harvest forecast is a range that narrows through the year.
- A drought cuts a region's harvest by 40% and is announced two quarters ahead. A region that runs
  short goes from adequate to tight, to shortage, to famine. Pick the region on the map, or in the food
  relief panel, to send it relief from the national reserve.
- A flood also comes with the planting season, two quarters before the harvest it spoils, and cuts
  the region's harvest by 30%. It damages every site in use in the region as it begins: each is
  decaying from that quarter, doing half of what it does in good repair, and a quarter in which
  its upkeep is paid restores it from the next. A region has at most one of drought and flood in a
  year. Both are drawn on the map the same way, and last until the harvest is in.
- A famine that lasts two quarters running collapses the state and ends the game.

## Elections, winning and the end of a game

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

## Approval and unrest

- Approval is the third vital sign. Each region has its own, and the national figure is their
  average by population. It answers to the region's food situation, the tax rate, and health,
  education and security spending per head, and it moves a tenth of the way each quarter towards
  where those would settle it, so the public remembers: a last-minute giveaway moves the vote
  little, and a hard year is not forgotten by polling day. The budget panel shows what a change would do to approval next
  quarter and where it is heading.
- A region whose approval falls below 40% goes on strike and produces 30% less, which costs the
  treasury tax. Below 30% it protests and produces 60% less. Both end when approval recovers.

## Prosperity, tiers and people

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

## Building

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
- A finished site is in use from the next quarter. Irrigation halves how far the weather, drought
  and flood move its region's harvest; a farm road halves the share of its region's surplus lost on
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
  its region's infrastructure access, from the quarter after its upkeep went unpaid. A flood
  sets the sites in its region decaying in the same way. A decaying site wears the warning
  triangle on the map, and its card says why and what restores it. A quarter in which its
  upkeep is paid restores it from the next. Decay and recovery are reported, and the risks ahead
  warn when upkeep will fall short.

## Chains and alternatives

- Some sites form a chain. A mine ships 600,000 tonnes of ore a quarter abroad, but only while a
  trunk road links it to a port and both are in use. What it ships is sold at the world ore price
  (see Trade) and added to its region's output, which is taxed and raises its people's income: at
  the usual $100 a tonne that is $60.0m a quarter, at $80 it is $48.0m. Capacities are given as
  what their ore is worth at the usual price. Each link carries only so much: a trunk road $72.0m
  a quarter (720,000 tonnes) and a port $90.0m (900,000 tonnes), and a decaying link half as much,
  so the chain ships no more than its weakest link. These are large projects ($40.0m, $30.0m and
  $50.0m; 6, 5 and 8 quarters to build; $0.6m, $0.5m and $0.8m upkeep), and one started late in a
  term opens after the vote. A mine's card lists every site of its chain with how it stands, marks
  the missing links and the bottleneck, and says what the mine earns at the world ore price, with
  that price, its trend, its forecast range and what the mine would earn at the low and high ends
  of it. Picking out a mine, or any site of its chain, draws the missing links on the map: a
  dotted route or a crossed marker, each tagged "✕ Missing link". A mine in use that earns nothing
  is tagged "▲ Earning nothing", and what a mine earns is taxed as a line of its own. While the
  ore price is away from its usual level, the region's output and the treasury's breakdowns show
  its effect as a line beside the mine's: "Korrgate mine: ore at $85 a tonne".
- Some sites are alternatives: one game cannot build everything. Next to Saltmouth port, Tavara's
  deep-water port, is Saltmouth quay, a shallow port at half the cost ($25.0m, 5 quarters to
  build, $0.4m upkeep) that ships only $36.0m a quarter, less than the mine produces. Either
  completes the mine's chain. The card of a site with alternatives, and the affordable list, say
  what starting it closes for good, and the two cannot be planned together. Once building begins
  on one, the other is closed: it is faded and struck through on the map, and its card says which
  choice closed it and offers no start.

## Power

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

## Borrowing and the credit rating

- The nation can borrow. The finance panel in the right column offers a loan of $10.0m, $25.0m
  or $50.0m over 4, 8 or 12 quarters, at 6%, 8% or 10% a year to a nation rated A, and shows the quarterly repayment
  and the interest in all before you plan it. Like a project, the money arrives when the quarter
  ends, so until then the plan can be taken back. Repayments of interest and principal begin the
  quarter after, and are paid before anything else: a heavy debt squeezes the budget and building.
  Rated A, the nation may owe no more than a year's revenue at the budget in force. The debt sits beside
  the treasury in the top bar with its debt burden, what is owed against a year's revenue; click
  it to see each loan, what is still owed and the quarters left. A repayment that the treasury
  and the quarter's revenue cannot cover is a missed payment, which brings a
  bailout (see Bailout and austerity).
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

## Bailout and austerity

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

## Trade

- Grain has a world price, which moves every quarter: world markets move it by up to $30 a tonne
  either way, and it is pulled a quarter of the way back towards its usual $240, never leaving
  $150 to $420. The trade panel in the right column shows the price with its trend over the last
  eight quarters and a forecast range over the next four; click it to see what moved it. Order
  grain for the national reserve there, in thousands of tonnes, with the cost at this quarter's
  price shown before you order. The treasury must hold the cost, and the order can be taken back
  until the quarter ends. The grain arrives and is paid for as the quarter ends, after anything
  borrowed arrives; if the treasury can no longer pay for all of it by then, it buys the
  thousands of tonnes it can, and the report says so. The cost is in the treasury's breakdown
  but not in the budget's balance, and the grain in the reserve's, in the outlook and in the
  risks ahead. Austerity does not bar imports: austerity starves no one.
- Grain can also be sold from the national reserve in the trade panel, in thousands of tonnes,
  at the world grain price less a 20% margin for shipping and the traders' cut, so selling
  fetches less than buying costs. The income is shown before you order, and the sale can be
  taken back until the quarter ends. The reserve must hold the grain, and the grain is set
  aside at once, so it is neither eaten nor spoiled; it is shipped and paid for as the quarter
  ends. If a dilemma's answer has taken some of the reserve first, the sale is cut to the
  thousands of tonnes left, and the report says so. The income is in the treasury's breakdown
  but not in the budget's balance, and the grain in the reserve's, in the outlook and in the
  forecast reserve after the harvest. A sale that takes the reserve below its safe level is
  allowed, but the panel warns of it before you order and the risks ahead list it. Grain cannot
  be both bought and sold in one quarter, and austerity bars neither.
- Ore has a world price too, drawn after grain's each quarter, so it never changes grain's: world
  markets move it by up to $15 a tonne either way, and it is pulled a fifth of the way back
  towards its usual $100, never leaving $45 to $190. It swings further than grain, so a country
  that lives on its mine lives with a riskier income. Ore is not ordered: a mine's chain sells
  what it ships at the ore price, and the mine's card shows the price, its trend and forecast.
  The price moves as the quarter ends, so prosperity and the debt burden the quarter leaves are
  judged at the new price, and the outlook gives prosperity next quarter as a range while a mine
  earns.
- Everything that crosses the border moves through a trade link. Border crossings are named in
  the country file, each carrying so many tonnes a quarter from the start: Tavara's Korr Pass to
  Voskar carries 50,000 t and Selama bridge 40,000 t. A port in use adds what it ships for a
  chain: 900,000 t for a port and 360,000 t for a shallow port, half while it decays. The ore
  the mines' chains ship takes its share first, and grain bought and sold abroad together is
  limited to what is left, so a mine that fills its port leaves grain the crossings alone. The
  trade panel shows what the links carry, the ore's share, the grain ordered and what is free,
  and refuses an order beyond it. What the links carry is fixed as the quarter begins, so an
  order the panel accepts is never cut for want of room. A port's card says what it carries and
  how it is shared. The grain a dilemma's offer brings or takes is outside this limit.
- World price shocks are events abroad that push one good's world price, on top of what markets
  do, for three quarters: failed harvests abroad push the grain price up by $36 a tonne a quarter,
  and an ore glut pushes the ore price down by $20 a tonne a quarter. The country file says how
  likely each is to be announced as a quarter begins (Tavara: 4% and 5%), and one of a kind is
  not announced while another of its kind is announced or in force. Each is announced two
  quarters before it first moves the price, so there are two quarters to buy grain, or to hold
  off borrowing against the mine, at the price as it stands. The report says when one is
  announced, when it first pushes the price and when it ends. While one is announced or in force
  it is listed under the price it moves, the price's forecast takes in what it will push, and
  the price's breakdown shows its push as a line of its own. Like the prices, the shocks a seed
  brings are drawn from the seed and the quarter alone, so they leave its weather and events as
  they were.

## Risks ahead

- The left column lists the risks ahead: famine in a region, a flood that could begin, a world
  price shock announced or that could be, grain sold below the reserve's safe level, strikes, a treasury that runs out, a bailout from a missed
  payment on a loan, a bond's maturity the treasury cannot cover, a cut in the credit rating, and,
  in the term's last four quarters, losing the vote. The game plays the next four quarters with
  your committed decisions held as they are, once for each course the weather could take and each
  drought or flood that could still begin, and lists each danger with how likely it is, as a five-step meter and in words, and a line saying why. Hunger
  shows a quarter after the harvest that causes it, so famine alone is looked for one quarter
  further. A danger too unlikely to matter is left out, unless it would end the game, and a risk
  to one region picks that region out on the map. Neither famine nor a lost election can end the
  game without having been listed first. A flood is listed while it could begin within the four
  quarters, however unlikely, with the share of the harvest it would take and the sites it would
  damage, so none comes without warning. A world price shock is listed as almost certain once it
  is announced, and while it has quarters to run, and before that whenever it could be announced
  in time to move its price within the four quarters, however unlikely, with the chance of it and
  what it would do. The quarters ahead are played with the shocks announced pushing the prices,
  so the dangers one brings, such as a treasury a glut would empty, are weighed from the quarter
  it is announced.
- While a mine earns, the game also plays the quarters ahead with ordinary weather and the world
  ore price slumping to the low end of its forecast. A treasury that would run out, or a
  repayment that would be missed, only in that slump is listed as unlikely, with the price it
  would take.

## Dilemmas

- Some quarters open with a dilemma: a neighbour offering grain, merchants wanting to buy from
  the reserve, a region in drought or flood asking for emergency works, strikers asking for talks,
  teachers demanding a pay rise, a donor offering a grant with conditions. The neighbour's grain
  is priced at the world grain price, and the merchants pay the world grain price, with no
  export margin, since they fetch the grain themselves. Each has two or three
  options, and each option states everything it will do, in money, food and approval, before you
  choose. You can put the dilemma aside to look at the country, but the quarter cannot end until
  you choose, and you can change your choice until it does. An option the treasury or the reserve
  cannot cover is shown and cannot be chosen. The choice takes effect when the quarter ends, the
  outlook and the risks count it at once, and the next report says what you chose and what it did.
- Which dilemmas arise, and when, is fixed by the seed, and they leave the weather a seed brings
  as it was. The risks ahead suppose that no new dilemma arises, since what one does is your choice.

## The screen

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
