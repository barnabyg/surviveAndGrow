# Writing a country

How to write a country file. The country file format is a compatibility contract: a later release
must still read what this one writes, so each addition comes with a new `formatVersion`, and files
of earlier formats still load as they are.

A country is one data file; the engine contains no country-specific code. The country that ships
is [src/countries/tavara.json](../src/countries/tavara.json), and it is the best guide to the format.
All positions are coordinates in a fixed map frame 1080 wide and 720 high.

`sites` lists where things can be built. Each site has an `id`, a `name`, the `region` it belongs
to and a `type` from the game's own list: `irrigation`, `farmRoad`, `grainStore`, `mine`,
`trunkRoad`, `port`, `shallowPort`, `powerStation`, `powerLine`, from format 9 `dam`, or from
format 10 `clinic` or `school`. What a
type costs, how long it takes and what it does are the game's, not the country's.

- An irrigation scheme, a grain store, a mine, a port, a shallow port, a power station, a dam, a
  clinic and a school stand in one place, given by `at`, which must lie inside the site's region.
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
- In a file of `"formatVersion": 9`, a site may name in `needs` a technology that must be known
  before it can be started, one of the game's own: `droughtResistantSeed`, `improvedIrrigation`,
  `coldStorage`, `roadEngineering`, `gridEfficiency` or `hydropower`, or from format 10
  `publicHealth` or `teacherTraining`. A name the game does not
  have is a fault. Until it is known the site is **locked**: on the map with a padlock, and
  impossible to start. A file of format 9 may also name a `dam`, which research unlocks of itself:
  every dam is locked until `hydropower` is known, whether or not it says so. A dam is a power
  station, so a power line may depend on it, and it may be an alternative to a power station. A
  locked site does not count towards the upkeep the game starts with when the file leaves it out.
  Files of earlier formats cannot say `needs` or name a dam, and still load as they are, with
  nothing locked. Tavara offers Korr Falls dam as an alternative to its power station, so its
  lines serve whichever is built; the test country has a dam standing alone, with a power line of
  its own that says it needs `hydropower` too:

```json
{
  "id": "sand-dam-line",
  "type": "powerLine",
  "name": "Power line, Sandreach dam to Sandreach",
  "region": "sandreach",
  "route": [[648, 342], [668, 400], [705, 455]],
  "dependsOn": ["sand-dam"],
  "needs": "hydropower"
}
```

- In a file of `"formatVersion": 10`, a site may be a `clinic` or a `school`. Research unlocks
  each of itself, as it does a dam: every clinic is locked until `publicHealth` is known and
  every school until `teacherTraining` is. One in use raises where its own region's health or
  education level settles, so where a file puts them decides which regions can be lifted that
  way. Files of earlier formats cannot name either, and still load as they are. Tavara has two of
  each in four regions; the test country has one of each in the same region.

The starting budget in `start.budget` may leave out `upkeep`: the game then starts with enough
upkeep to keep in good repair every one of the file's sites that can stand together, choosing the
costlier of alternatives, rounded up to the next $1.0m.

In a file of `"formatVersion": 11`, `start.budget.spending` must say what the country starts by
spending on `defence`, in millions a quarter like the other areas. The army expects $0.4m a
quarter for each million people, and the game starts with the army in each region where that
spending settles it, so a figure near what the army expects opens the game with a loyal army
and one far below it with an army already slipping. A file of an earlier format cannot name
`defence`, and still loads as it is: it is read as spending the least the slider allows that
holds the army loyal. Tavara, with 5.2 million people, starts on $2.0m a quarter; the test
country, with 400,000, on $1.0m, the least the slider allows above nothing:

```json
"start": {
  "treasury": 42,
  "budget": {
    "taxRate": 18,
    "spending": {
      "agriculture": 11,
      "foodRelief": 7,
      "health": 7,
      "education": 6,
      "security": 5,
      "defence": 2
    }
  },
  "foodReserve": 182000
}
```

In a file of `"formatVersion": 12`, each of `map.neighbours` may give an `ambition`: how much
the neighbour wants of the country, a whole percentage from 0 to 100. What it weighs against
the country's deterrence grows with the prosperity tier (nothing at Subsistence, the whole of
it at Prosperous), and the neighbour turns watchful and then hostile as deterrence falls
short of it, so an ambition near what the starting Defence deters threatens early and a low
one late or never. A neighbour that leaves it out has none and stays peaceful for good. A file
of an earlier format cannot give one, and still loads as it is, with peaceful neighbours.
A hostile neighbour may announce border incidents, which close the crossings that lead to it
and cost the regions on its border output and approval. A file says nothing of where they
fall: a region is on a neighbour's border when one of its edges faces the neighbour's `shape`,
so draw a neighbour against every region it should be able to trouble.
Tavara gives Voskar 60 and Selama 45; the test country gives its one neighbour 85, since its
few people make its starting Defence deter far more per head:

```json
{ "id": "voskar", "name": "Voskar", "shape": [[0, 0], [1080, 0], [1080, 280]], "label": [760, 44], "ambition": 60 }
```

In a file of format 2, a region may also set `populationGrowth`, its people's growth in percent a
year, from 0 to 10. A region that leaves it out grows at the game's own rate.

In a file of `"formatVersion": 13`, a region may give its faction mix in `factions`: the whole
percentage of its people who are `farmers`, `workers` and `business`, each from 0 to 100 and
adding up to no more than 100. Those are the factions with a share of a region's people; the
army has none, and a file cannot add a faction. The three standings bear on the region's
approval in proportion to these shares, so the mix decides whom a region follows: a farming
region the farmers, a port city business and workers. Whoever is left over, where the shares
come to less than 100, follows no faction and is moved by none. A region that leaves `factions`
out is read as an even mix, a third of its people in each, and so is every region of a file of
an earlier format, which cannot give one and still loads as it is. Tavara's Lowmere Plains are
70% farmers, and half of its Salt Coast is business:

```json
{ "id": "salt-coast", "name": "Salt Coast", "factions": { "farmers": 15, "workers": 35, "business": 50 } }
```

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

In a file of `"formatVersion": 5`, `crossings` names the border crossings, the trade links open
from the start. Each has an `id`, a `name`, the `neighbour` it leads to (the `id` of one of
`map.neighbours`) and the `tonnes` it carries across the border a quarter, in whole thousands from
1,000 to 100,000:

```json
"crossings": [
  { "id": "korr-pass", "name": "Korr Pass", "neighbour": "voskar", "tonnes": 50000 }
]
```

Ports in use add their own capacity. A file of format 5 that lists no crossings trades only
through its ports. A file of an earlier format cannot name crossings, and is read as having one on
each neighbour carrying 45,000 tonnes; it still loads as it is.

The map draws the trade routes from the file alone, so no country needs artwork for them. A
crossing stands on the country's border with its neighbour, at the point nearest the
neighbour's `label`, so place the label where the crossing should be. A port's shipping lane runs
straight from the port to whichever edge of the map it reaches over the least land, the
country's own or a neighbour's: give a port a stretch of open sea between it and the edge.
Each route is tagged with what it carried last quarter against what it can carry.

Each region's `eventLikelihood` says how likely each of the game's events is to strike it in a
year: the chance, from 0 to 1, of a `drought` (40% off its harvest) and, in a file of
`"formatVersion": 6`, of a `flood` (30% off its harvest, and every site in use there decaying
until its upkeep is paid). Both begin with the planting season, and they share one roll in each
region, so a region's chances of the two may come to at most 1 between them. An event the region
leaves out never strikes it. A file of an earlier format cannot name floods, and still loads as it
is, with none:

```json
"eventLikelihood": { "drought": 0, "flood": 0.1 }
```

In a file of `"formatVersion": 7`, `priceShockLikelihood` says how likely each world price shock
is: the chance, from 0 to 1, that it is announced as a quarter begins, unless one of its kind is
already announced or in force. The shocks are the game's own: `failedHarvestsAbroad` (the world
grain price pushed up by $36 a tonne a quarter) and `oreGlut` (the world ore price pushed down by
$20 a tonne a quarter), each announced two quarters before it first moves the price and in force
for three. One the file leaves out never comes, and the whole entry may be left out. A file of an
earlier format cannot name them, and still loads as it is, with none. Tavara gives failed harvests
abroad 4% a quarter and an ore glut 5%:

```json
"priceShockLikelihood": { "failedHarvestsAbroad": 0.04, "oreGlut": 0.05 }
```

In a file of `"formatVersion": 8`, `deposits` hides deposits of ore for surveys to find. A deposit
is not on the map, and nothing can be built on it, until the player surveys its region and the
survey finds it. Each has:

- an `id`, and the `region` it lies in. A region holds at most one deposit, and a region with
  none cannot be surveyed.
- `likelihood`: the chance, above 0 and at most 1, that a survey finds it there.
- `tonnes`: the `min` and `max` ore its mine could produce a quarter, each a whole number of
  10,000 t from 10,000 t to 1,500,000 t. A deposit found is somewhere in that range, every step
  as likely as another. The player sees the likelihood and the range before surveying.
- `mine`: a site of type `mine`, written as in `sites` but without a `region`: it stands in the
  deposit's region. It must depend on the deposit's route, and may depend on the country's own
  sites, such as a power line.
- `route`: a site of type `trunkRoad`, written as in `sites`, which serves the mine. It depends
  on the country's own sites that lead on to a port.

The deposit's sites share `id`s and names with the country's sites, so neither may repeat one,
neither may name alternatives, and none of the country's sites may depend on them or name them as
an alternative: they are hidden until found. Which deposits a game finds, and how large, depends
on its seed and the deposit's `id`, so the same seed always finds the same. A file of an earlier
format cannot name deposits, and still loads as it is, with none. Tavara hides one on the Salt
Coast, likely to be there, of 150,000 t to 350,000 t, and a larger, less likely one in the Dry
East, whose trunk road runs the width of the country to Saltmouth:

```json
"deposits": [
  {
    "id": "westhaven-ore",
    "region": "salt-coast",
    "likelihood": 0.6,
    "tonnes": { "min": 150000, "max": 350000 },
    "mine": {
      "id": "westhaven-mine",
      "type": "mine",
      "name": "Westhaven mine",
      "at": [170, 330],
      "dependsOn": ["westhaven-trunk-road"]
    },
    "route": {
      "id": "westhaven-trunk-road",
      "type": "trunkRoad",
      "name": "Trunk road, Westhaven mine to Saltmouth",
      "region": "salt-coast",
      "route": [[172, 318], [150, 280], [142, 236]],
      "dependsOn": ["saltmouth-port"]
    }
  }
]
```

`dilemmaLikelihood` says how likely each dilemma is: the chance, from 0 to 1, that it arises as a
quarter begins, provided the conditions it needs hold. The dilemmas are the game's own:
`grainOffer` (the reserve is below its safe level), `merchantOffer` (the first quarter of a year,
with the reserve above its safe level), `emergencyWorks` (a region is in drought or flood),
`strikeTalks` (a region is striking or protesting), `teachersPay` (any time) and `donorGrant` (the
treasury is low). One the file leaves out never arises, and the whole entry may be left out. What each
dilemma offers scales with the country's population, so the same dilemma suits a country of any
size.

To try a country of your own, put the file in `public/countries/` and name it in the address:
`?country=/countries/mine.json`. The game checks the file as it loads and lists everything that
is wrong with it.

A saved game carries the country file it was started on, so it goes on being played on that
country even after you edit the file. Start a new game to play your changes.
