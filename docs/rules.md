# The rules as built

Every rule the game plays by as it stands, one heading per mechanic. The design intent and the
phase plan are in [design.md](design.md); where each rule lives in the code is in
[src/sim/README.md](../src/sim/README.md); and what the screen shows is in [screen.md](screen.md).

The figures here (costs, build times, upkeep, rates, limits, thresholds) come from
the files in [src/sim/balance/](../src/sim/balance). A change to a figure there must change it here in
the same commit. [tests/sim/docsFigures.test.ts](../tests/sim/docsFigures.test.ts) renders the
main figures from the balance values and fails if this file, [playing.md](playing.md) or
[countries.md](countries.md) does not state them; a figure it does not list is checked by no one.

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
- You lose the game to a coup when national army loyalty has ended four quarters running at
  plotting, below 30% (see Defence and army loyalty): the army takes power. A quarter that ends
  with loyalty back at 30% or above ends the count, and it starts afresh if the army plots again.
  Nothing is rolled, so the same seed and decisions always bring the same coup. It is checked
  with famine's collapse as a quarter ends, before the election and the win, so a quarter that
  would have won the vote or the game still falls to it, and no vote is held. While the army
  plots, the top bar counts the quarters left to a coup beneath army loyalty, and the figure's
  breakdown says where the count stands. The turn report says in each quarter that ends with the
  army plotting how many are left, from the first; that the coup is off, in the quarter loyalty
  recovers; and, critically, that the army has taken power.
- However the game ends, a summary gives the outcome and its cause, how long you were in office
  over how many terms, the treasury, debt, debt burden, food reserve, approval, army loyalty and
  prosperity over the whole game, and each term in turn with prosperity at its start and end. From
  it you can replay the same game or start a new one.

## Approval and unrest

- Approval is the third vital sign. Each region has its own, and the national figure is their
  average by population. It answers to the region's food situation, the tax rate, and health,
  education and security spending per head, and to the factions by the region's mix of them
  (see Factions). It moves a tenth of the way each quarter towards where those would settle it, so the public remembers: a last-minute giveaway moves the vote
  little, and a hard year is not forgotten by polling day. The budget panel shows what a change would do to approval next
  quarter and where it is heading.
- A region whose approval falls below 40% goes on strike and produces 30% less, which costs the
  treasury tax. Below 30% it protests and produces 60% less. Both end when approval recovers.

## Factions

- The factions are the game's own: farmers, workers, business and the army. A country file
  cannot add one. Farmers, workers and business each have one national standing with the
  government, from 0% to 100%, which rests at 50% when nothing moves it. The army has no share
  of a region's people and moves no approval: its standing is national army loyalty, shown
  beside the others.
- Each standing answers to a few levers of its own. Each lever settles the standing up or down
  by no more than what it is worth, in proportion between its marks:
  - Farmers answer to agriculture's share of what the budget spends, worth 30 points either
    way: a share of 24% leaves them where they are, 48% or more settles them the whole of it
    higher, and none the whole of it lower. They also answer to drought and flood where farmers
    live, worth 20 points: a harvest left whole changes nothing, and one cut by 50% or more
    settles them the whole of it lower.
  - Workers answer to health and education's share of what the budget spends, worth 30 points
    either way: 37% leaves them where they are and 74% or more is their best. They also answer
    to the tax rate, worth 15 points either way: 18% leaves them where they are, 8% or less is
    their best and 28% or more their worst.
  - Business answers to the tax rate, worth 20 points either way on the same marks; to the
    budget's balance, worth 15 points: a budget that pays its way changes nothing, and one that
    spends 40% more than the tax raises, or worse, settles it the whole of it lower; to the debt
    burden, worth 10 points either way: 50% of a year's revenue leaves it where it is, none is
    its best and 150% or more its worst; and to the large sites in use, worth 15 points: none
    changes nothing, and 4 or more settle it the whole of it higher. A large site is one that
    plays a part in a chain or makes power.
- The shares are of what is actually spent on the spending areas in the quarter, after any
  forced cut, with upkeep counted only as far as the sites in use need it. The budget's balance
  is the tax raised less that spending: it leaves out the instalments on projects and the
  repayments on debts. The debt burden, the large sites in use and the drought and flood in
  force are read as the quarter begins.
- A standing moves a fifth of the way each quarter towards where its levers settle it, lever
  by lever, as approval does, so a budget is felt over quarters. It is read in a word: pleased
  from 60%, content below that, uneasy below 40% and angry below 25%.
- No budget settles farmers, workers and business all at their best. Farmers are at their best
  with 48% of what is spent and workers with 74%, which is more than there is to share. Business
  answers to money instead, and nothing sets it against the other two directly: moving money
  from one area to another leaves it where it was. It is set against them when their share is
  bought by spending more than is raised, or by taxing more, both of which it resents.
- Each region has a faction mix: the share of its people who are farmers, workers and
  business, from the country file. The standings bear on the region's approval as one more
  effect, Factions: 0.3 of a point of approval for each point a faction stands above or below
  50%, in proportion to its share of the region's people, each faction's part rounded towards
  nothing. A farming region follows the farmers;
  a port city follows business and workers. The effect follows the standings at once, since
  they have already moved their fifth, and the rest of approval is as it was. People of no
  faction, where a region's shares come to less than all of it, are moved by none.
- A game opens with the standings where its starting budget settles them, so nothing moves
  until something changes. In Tavara the farmers open at 56.1%, the workers at 47.8% and
  business at 51.6%, which moves no region's approval by more than 1.2 points; in the test
  country no more than 1.0 point.
- Approval's breakdowns have a Factions line, split by faction: what moved approval names what
  moved each faction most, where its part comes to anything, and what approval is made of gives
  each faction's standing and word.
  The left column shows the four standings, each with its word and a trend line, the army's
  being its loyalty and stage; a standing opens to what it is made of and where the budget in
  force is heading it. A region's card gives its mix and what the factions do to its approval.
  The budget panel's outlook has a Factions fold: each standing next quarter and where it is
  heading, with its word. A first-time tip explains factions once they move any region's
  approval by 2.0 points or more.
- A country file of an older format gives no mix, and each of its regions is read as an even
  mix: a third of its people in each faction. A save from before the factions opens with every
  standing at 50% and nothing pushing it, so approval is where it was, and the standings then
  move their fifth each quarter towards where the budget in force settles them.

## Defence and army loyalty

- Defence is a spending area of its own, beside Security: Security answers to approval, as it
  always has, and Defence to the army. It has a slider in the budget like the others.
- Each region has an army loyalty, and the national figure is the regions' average by
  population. A region's loyalty stands at 60% when Defence is spent as the army expects, $0.4m
  a quarter for each million people, and the region is calm. Spending nothing settles it 40
  points lower, double what the army expects or more settles it 40 points higher, and in between
  in proportion. Strikes in a region settle the loyalty of the army there 10 points lower, and
  protests 25 points lower. Loyalty moves a fifth of the way each quarter towards where those
  would settle it, so a cut to Defence is felt over quarters and not at once. A region's unrest
  is read as the quarter leaves it, which gives the cascade: hunger, then protests, then an army
  less loyal there.
- Loyalty is read in three stages: loyal, restless below 45% and plotting below 30%. The stages
  are shown and reported. A restless army ends nothing; an army left plotting takes power (see
  Elections, winning and the end of a game).
- National army loyalty is a vital sign in the top bar, with its stage named beneath it, a trend
  line with the restless mark drawn on it, what moved it last quarter, what it is made of and
  each region's own. A region's card and the region list show its army's loyalty and stage, and
  the card warns while its army is anything but loyal or is heading that way. The budget panel
  shows what a change would do to loyalty next quarter and where it is heading, each with its
  stage. The turn report says when the nation's stage or a region's changes, for the worse or
  the better, and why; a region that moves with the nation is named in the nation's report, and
  any other has a report of its own tied to its place. A first-time tip explains Defence and the
  army once the army anywhere is less than loyal, or the budget in force would leave it so.
- Austerity caps Defence as it caps Security (see Bailout and austerity).
- A country file says what the country starts by spending on Defence, and a game starts with
  the army in each region where that and the region's unrest settle it. Tavara starts on $2.0m a
  quarter, which holds its army loyal at 58.4%. A country file written before Defence, and a
  save from before it, are read as spending the least the slider allows that holds the army
  loyal in a calm region, with a loyal army.

## Neighbours and deterrence

- Each neighbour has an ambition, given by the country file. There is no combat of any kind:
  what a neighbour intends is read from its ambition against the country's deterrence.
- Deterrence is one national figure that Defence spending builds. Where the spending settles
  it is judged per head against what the army expects: nothing spent settles it at nothing,
  150% of what the army expects settles it at half, and each dollar more buys less than the
  last, so no spending reaches the whole. Deterrence moves 15% of the way each quarter
  towards where what was spent on Defence would settle it, more slowly than army loyalty: it is
  slow to build and slow to lose, so it has to be bought ahead. A treasury that cannot cover
  the budget cuts Defence with the rest, and deterrence answers to what was really spent.
- A state worth taking: what a neighbour's ambition weighs against deterrence grows with the
  prosperity tier in force. It weighs nothing at Subsistence, 55% of the ambition at
  Developing, 80% at Industrialising and the whole of it at Prosperous. Early in a game the
  neighbours are no threat, whatever is spent on Defence; the pressure arrives as the country
  prospers.
- Each neighbour's intention is peaceful, watchful or hostile. It is hostile while deterrence
  is below what its ambition weighs, watchful while deterrence is below 125% of that, and
  otherwise peaceful. It is read afresh as each quarter ends, from the tier the quarter leaves
  in force and deterrence as it then stands; nothing but deterrence is kept. A neighbour whose
  ambition weighs nothing is peaceful whatever deterrence is.
- A hostile neighbour may announce a border incident (see Border incidents). It does nothing
  else: no territory changes hands, and a neighbour never ends the game.
- Each neighbour is drawn on the map under every lens: its name with a tag beneath or above
  it that gives what it intends as a mark and a word (a ring for peaceful, an eye for
  watchful, a spearhead for hostile), and its border with the country drawn by the same
  intention, dashed while it is watchful and solid and toothed while it is hostile. Picking a
  neighbour, by its name, its tag or its land, opens its card: its intention, deterrence
  against the marks below which it is watchful and hostile, what its ambition weighs in each
  tier, what moved it last quarter, and where the Defence budget in force would settle
  deterrence and leave the neighbour.
- The budget panel's outlook has a Neighbours fold: deterrence next quarter and where it is
  heading, and each neighbour's intention next quarter and where it is heading, before and
  after a change to the Defence slider. A neighbour that the budget on the sliders leaves
  hostile, or heading for it, is warned of above the fold. The forecast reads the tier the
  quarter leaves with world prices where they are: a tier that only a rise in the world ore
  price would carry the country past is not in it, and is warned of in the risks ahead.
- The turn report says when a neighbour's intention changes, for the worse or the better, and
  why: a tier passed, which makes the country more worth taking, or deterrence fallen or
  rebuilt, with what is spent on Defence and where that settles deterrence. The report picks
  the neighbour out on the map. A first-time tip explains neighbours and deterrence once a
  neighbour is anything but peaceful.
- A country file may give each neighbour an ambition, a whole percentage from 0 to 100. Tavara
  gives Voskar 60% and Selama 45%. A neighbour given none, and every neighbour of a country
  file written before ambitions, stays peaceful for good.
- A game starts with deterrence where its starting Defence settles it: 39.0% in Tavara, on
  $2.0m a quarter. A save from before deterrence is read as having what its Defence budget in
  force would settle; its country file gives no neighbour an ambition, so none ever stirs.

## Border incidents

- A border incident is what a hostile neighbour does when deterrence fails. It is abstract and
  works only through money, time and approval: no territory changes hands, and a neighbour
  never ends the game.
- As each quarter ends, each neighbour that is hostile as the quarter leaves it, with no
  incident of its own announced or in force, has a 20% chance of announcing one. Its draw
  comes from the seed and the quarter alone, like a world price shock's, so it leaves the
  weather and events a seed brings as they were, and a game with no hostile neighbour plays
  exactly as it would without border incidents.
- An incident is announced two quarters before it begins. It is judged again as it would
  begin: if the neighbour is no longer hostile as the quarter before ends, read from the tier
  and deterrence that quarter leaves, it is called off, and the report says so. Raising
  Defence in time can therefore still stop one. Once begun it runs its course, whatever the
  neighbour then intends.
- It lasts three quarters. While it lasts:
  - the neighbour's border crossings carry nothing, so the trade links carry that much less
    and less grain can be bought or sold (see Trade). Ore is shipped by a port, never over a
    crossing, so a mine earns as before;
  - each region that borders the neighbour produces 20% less, as a region in unrest produces
    less: it pays tax on what is left, after anything strikes or protests there have already
    taken, and the treasury's breakdown gives the tax lost in each region under the incident's
    name. The debt burden is judged on the revenue the quarter leaves, so it counts the loss;
  - each of those regions takes a blow of 8 points to approval in the quarter it begins, under
    the incident's name in approval's breakdown, which then fades like any passing event.
- The regions that border a neighbour are worked out from the map: each region with an edge
  that faces the neighbour's land. A country file says nothing of them. A region that borders
  two neighbours can be under two incidents at once, each taking its share in turn.
- Its loss of output and approval feeds the cascade already built: a border region pushed into
  strikes or protests has a less loyal army (see Defence and army loyalty).
- The map draws an incident along the neighbour's border from its announcement until it ends,
  under every lens: barred diamonds, hollow while it is announced and solid while it is in
  force, and a tag by the neighbour's name that says which and for how long. While it is in
  force each region on the border is tagged with what it costs, and each closed crossing is
  drawn thinly dashed with a cross over its bar and tagged closed. The neighbour's card, the
  region's card and the crossing's card each say what it does and for how long.
- The turn report says when one is announced, begins, is called off and ends, each picking the
  neighbour out on the map. A first-time tip explains border incidents when one is first
  announced.
- The live preview and the quarters ahead count an incident announced: the closed crossing,
  the lost output and the blow to approval.

## Prosperity, tiers and people

- Prosperity, the game's objective, is the fourth figure in the top bar, on a scale of 0 to 100
  against the target of 42. Each region has a living standard built from food security, income
  per head, health, education and infrastructure access (the sites in use there, and power),
  weighted 15% each for the first four and 40% for infrastructure, so building is the main road
  to prosperity. A small farming site in use adds 20 to 30 points of infrastructure access to its region,
  a large one 10 to 40, a clinic or a school 5, and power 15. Prosperity is the regions' living standards averaged by
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
  budget holds them. Their spending still moves approval at once, as before. A clinic or a school
  in use lifts its own region's level further (see Clinics and schools).

## Building

- The map marks the sites where something could be built, such as an irrigation scheme, a farm
  road or a grain store. An empty site is a dashed round marker with the symbol of its type, and a possible
  road is a dashed line. Select one to open a card with its cost, build time and effect. The
  legend under the map explains the marks.
- Start a project from a site's card, or from **Browse projects…** in the projects tab of the
  right column, which lists what the treasury can afford, grouped by kind. The treasury must hold the whole cost, which is then paid in instalments over the
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
  for every site the country has, counting only the costlier of two alternatives and none that
  is locked.
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

## Locked sites and the dam

- Some sites are **locked** until research is done: a site of a type research unlocks, such as a
  dam, and any site its country file says needs a technology. A locked site is faded and dashed
  on the map and wears a padlock, which the legend explains. Its card names the research it
  needs and says what the site would do, and offers no start; it cannot be planned, the
  affordable list leaves it out, and the projects tab counts it apart. Once the research is known
  it is an empty site like any other. A site closed by its alternative stays closed.
- A **dam** is unlocked by **Hydropower**. It is a power station: a power line in use that leads
  to it powers its region as from any station, and grid efficiency improves it in the same way.
  It also takes 40% off how far weather, drought and flood move its own region's harvest, less
  than an irrigation scheme does, and improved irrigation does not improve it. It is large and
  slow to build: $55.0m over 8 quarters, $0.7m upkeep, adding 10 points to its region's
  infrastructure access. A country may offer it as an alternative to a power station: Tavara's
  Korr Falls dam, in the Korr Highlands, is one to Korr Falls power station, so the lines from
  the station serve whichever is built. In the test country the dam stands alone, with a line of
  its own locked behind the same research.
- A dam in use shows in its region's breakdowns: its power as a line of the region's output and
  infrastructure access ("Power from Korr Falls dam"), and its steadying in the region card's
  breakdown of how much less the weather moves its harvest, which lists each site in use there
  and each technology known that lessens it, and what they take off together.

## Clinics and schools

- A **clinic** and a **school** are small sites that serve their region's people, so research
  reaches prosperity through health and education as well as through infrastructure. **Public
  health** unlocks the clinic and **Teacher training** the school; until then their sites are
  locked. Each costs $8.0m over 3 quarters and $0.3m upkeep, and adds 5 points to its region's
  infrastructure access.
- A clinic in use lets its region's health level settle 15 points higher than health spending
  alone holds it, and a school does the same for its education level. The level is not raised at
  once: it climbs there over the quarters the site is in use, as it does towards what spending
  holds, closing 5% of the gap each quarter for health and 4% for education. Several in one
  region add up, and no level passes 100. No other region gains.
- Like any site they need upkeep and decay without it, and a flood damages them. A decaying
  clinic or school gives half. A level a site held up wears back down once the site gives less.
- A region's card gives its health and education levels. Where a clinic or a school is in use,
  it also breaks down where that level settles: what spending holds, under the budget
  committed, and each clinic or school by name. A site's card says what it would do before it is
  built, and the infrastructure breakdown names it too.
- The preview's prosperity and the risks ahead count them, the warning that upkeep will fall
  short among them.
- Tavara has two clinic sites, at Dustwell in The Dry East and at Westhaven on the Salt Coast,
  and two school sites, at Southbank in the South Delta and at Korrgate in the Korr Highlands.
  The test country has one of each, side by side in Sandreach.

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

## Research

- The **Research** tab in the right column shows the technology tree: every technology, whether
  it is known, being researched and how far it has got, planned, available or locked, what it
  costs and how long it takes, what it needs and leads to, and what it does. Each state is named
  in words beside a symbol. The tab's note says what is being researched, or that nothing is, so
  an idle research slot is not forgotten.
- Research is a project on no site. Start it from the tab, which shows its cost and research
  time first. Its prerequisites must be known, nothing else may be being researched, the treasury
  must hold its whole cost beside any sites planned, and austerity must not be in force; the tab
  says why when it cannot be started. It begins when the quarter ends, so until then the plan can
  be taken back. **One technology is researched at a time.**
- It is paid in instalments over its research time with the other projects, after the budget and
  the oldest first, and pauses like them when the treasury cannot pay. It needs no upkeep and
  never decays. Finishing it is reported, and the technology is known for good from the next
  quarter.
- Drought-resistant seed costs $8.0m over 4 quarters and needs nothing. Once known, weather and
  drought move every region's harvest 30% less, so a drought takes 28% of a harvest instead of
  40%. It does not hold back a flood's water. Where a region has irrigation too, the two multiply
  together. The harvest report names it, and the harvest forecast, a drought's description on the
  map and the risks ahead count it.
- The rest of the tree **improves what is built**. Each technology improves a type of site, so it
  pays off only where such a site is in use. A decaying site does only part of what the improved
  site does, as it does of its own figures:
  - **Improved irrigation** (needs drought-resistant seed; $10.0m over 4 quarters): an irrigation
    scheme takes 60% off how far weather, drought and flood move its region's harvest, not 50%.
  - **Cold storage** (needs drought-resistant seed; $8.0m over 3 quarters): a grain store saves 40%
    of what spoils in the national reserve, not 25%.
  - **Road engineering** (needs improved irrigation; $7.5m over 5 quarters): trunk roads, ports
    and shallow ports carry 25% more. A chain held back by its road or its port ships more (a
    mine shipping through a shallow port, 450,000 tonnes a quarter instead of 360,000), and a port
    carries more grain across the border. A chain its mine holds back gains nothing.
  - **Grid efficiency** (needs cold storage; $7.5m over 5 quarters): a powered region produces
    25% more, not 20%, and gains 18.7 points of infrastructure access, not 15, whether its power
    comes from a power station or a dam.
- **Hydropower** (needs improved irrigation and grid efficiency; $20.0m over 6 quarters) does
  nothing of itself: it unlocks the dam (see Locked sites and the dam). Its card in the Research
  tab names the sites of this country it unlocks, and their regions.
- **Public health** and **Teacher training** ($8.0m over 4 quarters each) are a branch of their
  own: each needs nothing first and does nothing of itself. Public health unlocks the clinic and
  teacher training the school (see Clinics and schools), and each names the sites it unlocks.
- A site's card gives each figure a known technology moves beside what it would be without it, as
  in "40% (25% without Cold storage)", and so do a port's trade link and its shipping lane, and
  the report of a site finished while the technology is known. The
  region's output and infrastructure access, the treasury's tax and the food reserve each give
  what a technology adds as a line of its own that names it ("Korrgate mine: Road engineering",
  "Kept from spoiling by Cold storage"). The harvest report names improved irrigation where an
  irrigation scheme is in use. The preview and the risks ahead count every technology known.
- Each technology in the Research tab says what it would improve in this game: every site in use
  it improves, with the figures it would move beside what they are now, and every chain and
  region it would move, and by how much. One whose sites are not built yet says it improves
  nothing until one is.

## Surveys

- A country may hide deposits of ore, at most one in a region. A region that may hide one is
  marked on the map with a magnifying glass until it has been surveyed; the legend says so. A
  region the country hides nothing in cannot be surveyed, and its card says nothing of surveys.
- A **survey** is a project on no site. Start it from the region's card, which shows first what
  it costs ($4.0m over 2 quarters), the chance that it finds a deposit and the range of sizes one
  could be, in tonnes of ore a quarter. The treasury must hold its whole cost beside everything
  else planned, and austerity must not be in force; the card says why when it cannot be started.
  It begins when the quarter ends, so until then the plan can be taken back. **A region is
  surveyed once.**
- It is paid in instalments with the other projects, after the budget and the oldest first, and
  pauses like them when the treasury cannot pay. Several regions may be surveyed at once.
- When it finishes, the report says what it found: nothing, or a deposit of a definite size. The
  region is surveyed either way. A deposit's mine and the trunk road that serves it appear on the
  map from the next quarter, and are built like any mine and road. The mine produces the size the
  survey found, not a mine's usual 600,000 tonnes, and earns at the world ore price through its
  chain like any other.
- Whether a deposit is there and how large it is depend on the game's seed and the deposit alone:
  the same seed always finds the same deposits, and surveying changes neither the weather, the
  events, the risks ahead nor the preview.

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
  spending on agriculture is capped at what the game began with and on health, education,
  security and defence at four fifths of it (on a $1.0m step, never below one step), and no loan, bond or
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
  limited to what is left, so a mine that fills its port leaves grain the crossings alone. A
  crossing to a neighbour whose border incident is in force is closed and carries nothing
  while it lasts (see Border incidents): the trade panel and the crossing's card say it is
  closed and for how long. The
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
  payment on a loan, a bond's maturity the treasury cannot cover, a cut in the credit rating, a
  neighbour turning hostile, a border incident, a coup, and, in the term's last four quarters, losing the vote. The game plays the next four quarters with
  your committed decisions held as they are, once for each course the weather could take and each
  drought or flood that could still begin, and lists each danger with how likely it is, as a five-step meter and in words, and a line saying why, cut short until the risk is picked out (its whole text is in a tooltip). The four most likely are shown and the rest fold behind **Show more**. Hunger
  shows a quarter after the harvest that causes it, so famine alone is looked for one quarter
  further. A danger too unlikely to matter is left out, unless it would end the game, and a risk
  to one region picks that region out on the map, and one from a neighbour picks out the
  neighbour. Neither famine, a coup nor a lost election can end the
  game without having been listed first. A flood is listed while it could begin within the four
  quarters, however unlikely, with the share of the harvest it would take and the sites it would
  damage, so none comes without warning. A world price shock is listed as almost certain once it
  is announced, and while it has quarters to run, and before that whenever it could be announced
  in time to move its price within the four quarters, however unlikely, with the chance of it and
  what it would do. The quarters ahead are played with the shocks announced pushing the prices,
  so the dangers one brings, such as a treasury a glut would empty, are weighed from the quarter
  it is announced.
- A coup is listed in every quarter from which the army could take power within the four
  quarters, on your decisions as they are: while the count runs, and before it starts when
  loyalty is on course to fall below 30% and stay there. It ends the game, so it is listed
  however small the chance. Its line says where national army loyalty stands, how long the army
  has plotted, when it would take power, and what is spent on Defence against what the army
  expects. Raising Defence in the budget takes it off the list as soon as the quarters ahead no
  longer end in one. While a mine earns, a coup that only a slump in the world ore price would
  bring, through a treasury that cuts Defence with the rest of the budget, is listed as unlikely.
- A neighbour turning hostile is listed, with how likely it is, for each neighbour not yet
  hostile that would be within the four quarters on your decisions as they are: because
  deterrence is on course to fall below what its ambition weighs, or because the country is on
  course to pass a tier in which it weighs more than deterrence. Its line says which, when, and
  what is spent on Defence against where that settles deterrence. A neighbour that would turn
  only if a rise in the world ore price carried the country past a tier is listed as unlikely,
  with the price it would take (the last bullet here says how that is looked for). What is not
  looked for is the two together: a tier that takes both the best of the weather and the ore
  price at the high end of its forecast.
- A border incident is listed in three ways, each picking its neighbour out on the map. While
  a neighbour is hostile, or on course to be as a quarter ends, with no incident of its own
  pending, the chance that it announces one in time to begin within the four quarters is
  listed, however small, with what it would close, which regions would produce less and what
  that would cost in tax a quarter. Once one is announced it is listed until it begins, as
  almost certain while your decisions leave the neighbour hostile as it would begin, and as
  remote, on course to be called off, once they do not. While it is in force it is listed
  with the quarters it has left. The quarters ahead are played with every incident announced
  beginning, being called off and ending as the rules have it, so the dangers one brings,
  such as strikes in a border region, are weighed from the quarter it is announced. No
  incident begins without having been listed in every quarter since its announcement. Its
  chance is listed the quarter before one could be announced, for a neighbour that only a rise
  in the world ore price would turn hostile as for any other.
- The treasury runs out when it cannot cover the budget, and every area is cut, or when it
  cannot cover an instalment on a project, which pauses. The warning says which gives way first
  and when: the budget, or the oldest project left unpaid, named for what it is, whether
  building on a site, research into a technology or the survey of a region. The instalments of
  every project under way or planned are counted in each quarter played, so research or a
  survey planned now is warned of when its instalments would leave a later quarter's budget
  short.
- While a mine earns, the game also plays the quarters ahead with ordinary weather and the world
  ore price slumping to the low end of its forecast. A treasury that would run out, or a
  repayment that would be missed, only in that slump is listed as unlikely, with the price it
  would take and, for the treasury, what would give way: the budget, or the building, research
  or survey that would pause. While a neighbour with an ambition is not yet hostile, the game
  plays them once more with ordinary weather and the ore price rising to the high end of its
  forecast: the mines earn more, and a country that would pass a tier only on that rise, into
  one where the neighbour weighs more than deterrence, has the neighbour listed as unlikely,
  and with it the chance of its border incident.

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
