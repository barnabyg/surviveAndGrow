# Phase 1 balance

Recorded 2026-11-17, for issue #20. The figures below come from the scripted players in
`tests/balance/players.ts`, played through whole games on the countries as they ship.

## Targets

These are the targets proposed in issue #20. **They are proposals: the owner has not yet
confirmed them.** They apply to the real country, Tavara.

| Target | Result on the confirmation run | Met |
| --- | --- | --- |
| The player who does nothing loses at least 90% of games | Loses 100.0% (95.9% to famine, 4.1% at the vote) | Yes |
| The player who spends everything on popularity loses most games | Loses 100.0% (95.8% to famine, 4.2% at the vote) | Yes |
| The sensible player wins between 30% and 60% | Wins 48.1% | Yes |
| No player wins every game | The best of the three wins 48.1%; the strongest one-lever player wins 71.9% | Yes |

Testland, the crude second country, is not tuned and has no targets. Every one of its games
ran to an ending without error.

## After population growth (issue #30)

Recorded 2026-11-17. From issue #30 every region's population grows by 0.6% a quarter. Nothing
else was retuned, so the same confirmation run shows what growth alone does to Phase 1. **The
targets above no longer hold for Tavara**, and Phase 2 must retune with growth in place.

| Target | Before growth | With growth | Met |
| --- | --- | --- | --- |
| The player who does nothing loses at least 90% of games | Loses 100.0% | Loses 100.0% (95.9% to famine, 4.1% at the vote) | Yes |
| The player who spends everything on popularity loses most games | Loses 100.0% | Loses 100.0% (97.8% to famine, 2.2% at the vote) | Yes |
| The sensible player wins between 30% and 60% | Wins 48.1% | Wins 8.8% | **No** |
| No player wins every game | Best wins 71.9% | Best wins 15.1% | Yes |

Growth works against the government in two ways. Public spending is judged per head, so a
budget held steady buys less approval each quarter as the population grows; and food need
rises while farmland does not, so the reserve and the regions' own stocks run lower. Vote
shares at the vote fell by about three to five points for every player. Testland, which is
not tuned, changed little: its sensible player still wins 99.8%.

#### Republic of Tavara, seeds 1001-2200, with growth

| Player | Games | Won | Lost the vote | Lost to famine | Vote share | Treasury at the end | Approval at the end |
| --- | ---: | ---: | ---: | ---: | --- | --- | --- |
| Does nothing | 1200 | 0.0% | 4.1% | 95.9% | 29.3% / 35.9% / 41.2% | $0.0m / $0.2m / $1.3m | 28.8% / 40.2% / 43.5% |
| Popularity | 1200 | 0.0% | 2.2% | 97.8% | 29.2% / 36.3% / 39.7% | $0.0m / $2.5m / $2.9m | 30.8% / 43.8% / 48.7% |
| Sensible | 1200 | 8.8% | 91.1% | 0.1% | 31.0% / 46.3% / 52.7% | $0.0m / $0.4m / $0.9m | 28.6% / 46.5% / 50.7% |
| Relief only | 1200 | 0.0% | 99.9% | 0.1% | 31.0% / 43.6% / 49.5% | $0.0m / $1.2m / $58.0m | 32.7% / 44.0% / 47.1% |
| Lowest tax | 1200 | 0.0% | 21.9% | 78.1% | 30.9% / 37.1% / 45.5% | $0.1m / $0.2m / $0.4m | 31.2% / 39.9% / 47.4% |
| Says yes | 1200 | 0.0% | 99.9% | 0.1% | 28.8% / 41.9% / 49.2% | $0.0m / $6.3m / $79.6m | 29.8% / 42.3% / 46.7% |
| Squeeze then spend | 1200 | 0.3% | 99.6% | 0.1% | 35.6% / 45.0% / 50.7% | $0.0m / $60.2m / $127.7m | 38.3% / 45.0% / 48.8% |
| Hover then spend | 1200 | 15.1% | 84.9% | 0.0% | 35.0% / 46.9% / 53.9% | $0.0m / $0.4m / $0.9m | 36.2% / 47.1% / 52.6% |

Spreads are least / middle / most. Vote share counts only the games that reached the vote.

- Does nothing: famine brought the state down in The Dry East 602, Korr Highlands 333, Salt Coast 116, Arden Vale 100 (in quarter 8 / 8 / 20).
- Popularity: famine brought the state down in The Dry East 563, Korr Highlands 266, Arden Vale 246, Salt Coast 99 (in quarter 8 / 8 / 20).
- Sensible: famine brought the state down in Korr Highlands 1 (in quarter 20 / 20 / 20).
- Relief only: famine brought the state down in Korr Highlands 1 (in quarter 20 / 20 / 20).
- Lowest tax: famine brought the state down in The Dry East 463, Arden Vale 225, Korr Highlands 159, Salt Coast 90 (in quarter 8 / 14 / 20).
- Says yes: famine brought the state down in Arden Vale 1 (in quarter 20 / 20 / 20).
- Squeeze then spend: famine brought the state down in Korr Highlands 1 (in quarter 20 / 20 / 20).
- Hover then spend: famine brought the state down in no game.

## After prosperity tiers (issue #31)

The same Tavara run with tiers in place, on top of growth. Only the sensible player changes:
it builds sites and spends on services, so it passes into Developing, and the 3-point drop in
the approval baseline that comes with that costs it the vote. **It now wins 0.9% of games**
(from 8.8% with growth alone). Every other player's results are unchanged. Retuning for
growth and tiers together is Phase 2 work.

| Player | Won | Lost the vote | Lost to famine | Vote share |
| --- | ---: | ---: | ---: | --- |
| Sensible | 0.9% | 99.0% | 0.1% | 28.8% / 42.7% / 52.1% |
| Hover then spend | 15.1% | 84.9% | 0.0% | 35.0% / 46.9% / 53.9% |

## After multiple terms (issue #33)

From issue #33 a won election no longer wins the game: a new term begins, and the game is won
by holding Prosperous for four quarters running. The balance run therefore plays each game for
at most one term by default (`BALANCE_TERMS` sets more), so the Phase 1 figures above keep their
meaning. Its table gains a column: **Re-elected** is what **Won** counted before, a game still in
office when its terms are up, and **Won** now counts only the win on prosperity. Nothing in the
rules of a single term changed, so the figures above stand; no new run was recorded.

## After upkeep (issue #34)

From issue #34 every site in use needs upkeep each quarter ($0.4m for irrigation, $0.3m for a
farm road, $0.2m for a grain store), and a site whose upkeep goes unpaid decays to half its
effect. Upkeep is spent only as far as the sites in use need it, and a game starts with enough
for every site the country has ($3.0m in Tavara, $1.0m in Testland), so a player who never
touches the slider keeps every site in good repair. The confirmation run (seeds 1001-2200, one
term) was made before and after. Only the sensible player builds, so only it changes:

| Country | Player | Re-elected before | Re-elected after | Vote share before | Vote share after |
| --- | --- | ---: | ---: | --- | --- |
| Tavara | Sensible | 0.9% | 1.1% | 28.8% / 42.7% / 52.1% | 20.8% / 42.2% / 51.5% |
| Testland | Sensible | 99.8% | 99.5% | 49.0% / 58.5% / 65.8% | 49.1% / 56.8% / 65.1% |

Upkeep costs the sensible player about half a point of vote share in the middle of the spread.
Its worst Tavara game falls further (20.8% from 28.8%), where a treasury already cutting every
area also cuts upkeep and its sites decay. Every other player's results are unchanged, and no
upkeep value was tuned.

## After chains (issue #35)

From issue #35 Tavara and Testland each have a mine, a trunk road and a port. A mine adds its
output to its region only while its trunk road and port are in use, and no more than the
weakest link carries, a decaying link carrying half:

| Site | Cost | Build time | Upkeep | Produces or carries a quarter |
| --- | ---: | ---: | ---: | ---: |
| Mine | $40.0m | 6 quarters | $0.6m | $20.0m |
| Trunk road | $30.0m | 5 quarters | $0.5m | $24.0m |
| Port | $50.0m | 8 quarters | $0.8m | $30.0m |

The whole chain costs $120.0m, about four quarters of Tavara's tax, and $1.9m a quarter in
upkeep. At the 18% starting tax its $20.0m of output pays $3.6m a quarter, so in money alone it
barely pays its upkeep; what it buys is income per head in its region and more for a higher
tax rate to take. The values are first guesses, to be tuned when Phase 2 is balanced.

The scripted players do not build chain sites, so their games are unchanged except through the
starting upkeep, which a country file that leaves it out sets for all its sites: it rises from
$3.0m to $4.0m in Tavara and from $1.0m to $3.0m in Testland. Upkeep is spent only as far as the
sites in use need it, so this costs nothing, but the sensible player keeps a cushion of a few
quarters of everything the sliders set, upkeep included, so it builds a little later. The
confirmation run (seeds 1001-2200, one term) was made before and after. Only the sensible player
changes, within the noise of 1,200 games:

| Country | Player | Re-elected before | Re-elected after | Vote share before | Vote share after |
| --- | --- | ---: | ---: | --- | --- |
| Tavara | Sensible | 1.1% | 1.3% | 20.8% / 42.2% / 51.5% | 21.5% / 42.4% / 51.8% |
| Testland | Sensible | 99.5% | 99.2% | 49.1% / 56.8% / 65.1% | 47.5% / 56.8% / 65.1% |

## After alternatives (issue #36)

From issue #36 Tavara and Testland each have a shallow port, a quay, as the alternative to their
port. Starting one closes the other, and either completes the mine's chain:

| Site | Cost | Build time | Upkeep | Ships a quarter |
| --- | ---: | ---: | ---: | ---: |
| Port | $50.0m | 8 quarters | $0.8m | $30.0m |
| Shallow port | $25.0m | 5 quarters | $0.4m | $12.0m |

Through the quay the chain costs $95.0m instead of $120.0m and is complete two quarters sooner,
with the mine, but the quay is its bottleneck: the mine earns $12.0m a quarter instead of $20.0m,
and choosing the quay gives up the larger trade for good. The values are first guesses, to be
tuned when Phase 2 is balanced.

The starting upkeep counts only the costlier of two alternatives, so it stays at $4.0m in Tavara
and $3.0m in Testland. The scripted players build only irrigation, grain stores and farm roads,
so their games are unchanged and the confirmation run was not repeated.

## After power (issue #37)

From issue #37 Tavara and Testland each have a power station and power lines from it. A region is
powered while a line of its own in use links it to a station in use:

| Site | Cost | Build time | Upkeep | Infrastructure access |
| --- | ---: | ---: | ---: | ---: |
| Power station | $30.0m | 5 quarters | $0.5m | +5 points, its own region |
| Power line | $6.0m | 2 quarters | $0.1m | none of its own |

A powered region produces 20% more of its own output and gains 15 points of infrastructure
access; while the station or a line on the way decays, it has half of each. In Tavara the station
and its three lines cost $48.0m and add $21.2m a quarter of output (Arden Vale $10.4m, Lowmere
Plains $7.6m, Korr Highlands $3.2m), about $3.8m a quarter in tax at 18% against $0.8m of upkeep,
and lift each powered region's living standard by about 4 points. That makes power the strongest
building for prosperity so far. Testland's mine now also needs its power line and station, so
its chain costs $36.0m more; Tavara's mine does not need power. The values are first guesses, to
be tuned when Phase 2 is balanced.

The starting upkeep rises from $4.0m to $5.0m in Tavara and from $3.0m to $4.0m in Testland.
The scripted players never build power, but the larger upkeep setting widens the cushion they
keep before building, so they build a little later. A confirmation run (`BALANCE_PLAYERS=all`,
seeds 1001-2200, both countries) was made. On Tavara it found the sensible player re-elected in
1.3% of games and hover-then-spend in 15.1%, far below the run recorded below; the same run on
seeds 1001-1100 at the commit before power (82deff1) also re-elects the sensible player in no
game, so that fall predates power and needs #39's attention. Against that baseline, power moves
the sensible player's middle vote share from 43.3% to 41.9% on those 100 seeds; the other two
players are unchanged. Testland's sensible player is still re-elected in 98.6% of games.

## Phase 2 (issue #39)

Phase 2 retuned the game for several terms and the win on prosperity, and changed the scripted
players and the balance tool; the targets above no longer apply. The balance run now plays up to
four terms by default (`BALANCE_TERMS=1` gives a single term, as here), and its table's
**Re-elected** column is now **Still in office**. The values changed, the new targets and the
runs are recorded in [phase-2.md](phase-2.md).

## How the runs were made

```powershell
$env:BALANCE_PLAYERS = 'all'; $env:BALANCE_COUNTRY = 'tavara'; $env:BALANCE_SEEDS = '1-300'; npm run balance
```

```powershell
$env:BALANCE_PLAYERS = 'all'; $env:BALANCE_COUNTRY = 'both'; $env:BALANCE_SEEDS = '1001-2200'; npm run balance
```

Values were tuned against seeds 1 to 300 (and 1 to 200 for the quicker comparisons). The
confirmation run uses 1,200 seeds that played no part in the tuning, so the result is not
fitted to the seeds. With `BALANCE_PLAYERS` unset the run plays only the three players the
targets name.

## The confirmation run

### Confirmation: Republic of Tavara, seeds 1001-2200

| Player | Games | Won | Lost the vote | Lost to famine | Vote share | Treasury at the end | Approval at the end |
| --- | ---: | ---: | ---: | ---: | --- | --- | --- |
| Does nothing | 1200 | 0.0% | 4.1% | 95.9% | 35.2% / 40.8% / 46.6% | $0.0m / $0.2m / $1.3m | 33.3% / 41.2% / 44.2% |
| Popularity | 1200 | 0.0% | 4.2% | 95.8% | 34.3% / 41.0% / 45.6% | $0.0m / $2.6m / $2.9m | 35.9% / 44.6% / 49.7% |
| Sensible | 1200 | 48.1% | 51.9% | 0.0% | 41.7% / 49.8% / 55.6% | $0.0m / $0.3m / $0.9m | 43.9% / 49.9% / 53.4% |
| Relief only | 1200 | 3.5% | 96.5% | 0.0% | 37.6% / 46.4% / 51.6% | $0.0m / $15.6m / $82.0m | 38.0% / 46.5% / 49.2% |
| Lowest tax | 1200 | 0.8% | 55.5% | 43.7% | 34.7% / 43.5% / 51.5% | $0.0m / $0.2m / $0.4m | 35.3% / 43.0% / 49.3% |
| Says yes | 1200 | 1.8% | 98.2% | 0.0% | 35.2% / 45.5% / 51.1% | $0.0m / $33.0m / $108.2m | 36.4% / 45.6% / 49.1% |
| Squeeze then spend | 1200 | 1.8% | 98.3% | 0.0% | 39.7% / 46.0% / 51.4% | $17.1m / $95.8m / $170.8m | 41.3% / 46.0% / 49.1% |
| Hover then spend | 1200 | 71.9% | 28.1% | 0.0% | 44.7% / 51.4% / 57.6% | $0.0m / $0.3m / $0.9m | 46.2% / 51.4% / 56.0% |

Spreads are least / middle / most. Vote share counts only the games that reached the vote.

- Does nothing: famine brought the state down in The Dry East 599, Korr Highlands 336, Salt Coast 118, Arden Vale 98 (in quarter 8 / 8 / 20).
- Popularity: famine brought the state down in The Dry East 606, Korr Highlands 287, Arden Vale 150, Salt Coast 107 (in quarter 8 / 8 / 20).
- Sensible: famine brought the state down in no game.
- Relief only: famine brought the state down in no game.
- Lowest tax: famine brought the state down in Arden Vale 203, The Dry East 172, Korr Highlands 88, Salt Coast 61 (in quarter 8 / 14 / 20).
- Says yes: famine brought the state down in no game.
- Squeeze then spend: famine brought the state down in no game.
- Hover then spend: famine brought the state down in no game.

### Confirmation: Testland, seeds 1001-2200

| Player | Games | Won | Lost the vote | Lost to famine | Vote share | Treasury at the end | Approval at the end |
| --- | ---: | ---: | ---: | ---: | --- | --- | --- |
| Does nothing | 1200 | 31.6% | 0.0% | 68.4% | 50.7% / 55.6% / 60.1% | $17.7m / $26.0m / $30.0m | 48.2% / 52.8% / 57.1% |
| Popularity | 1200 | 32.2% | 0.0% | 67.8% | 52.3% / 59.0% / 64.9% | $0.0m / $2.2m / $2.8m | 52.4% / 57.6% / 62.2% |
| Sensible | 1200 | 100.0% | 0.0% | 0.0% | 57.3% / 65.1% / 70.9% | $0.0m / $0.1m / $0.2m | 60.0% / 65.1% / 68.2% |
| Relief only | 1200 | 100.0% | 0.0% | 0.0% | 54.1% / 58.5% / 63.9% | $12.6m / $25.5m / $30.0m | 57.1% / 58.3% / 61.4% |
| Lowest tax | 1200 | 99.8% | 0.3% | 0.0% | 48.4% / 56.0% / 62.8% | $0.0m / $0.1m / $0.4m | 50.8% / 56.2% / 59.9% |
| Says yes | 1200 | 100.0% | 0.0% | 0.0% | 54.1% / 58.5% / 63.9% | $10.9m / $25.5m / $30.0m | 57.1% / 58.3% / 61.4% |
| Squeeze then spend | 1200 | 1.3% | 98.7% | 0.0% | 41.3% / 45.9% / 51.0% | $50.3m / $64.0m / $71.3m | 43.9% / 45.7% / 48.8% |
| Hover then spend | 1200 | 100.0% | 0.0% | 0.0% | 57.1% / 61.5% / 66.9% | $11.9m / $42.5m / $47.0m | 60.1% / 61.3% / 64.4% |

Spreads are least / middle / most. Vote share counts only the games that reached the vote.

- Does nothing: famine brought the state down in Sandreach 821 (in quarter 8 / 12 / 20).
- Popularity: famine brought the state down in Sandreach 814 (in quarter 8 / 12 / 20).
- Sensible: famine brought the state down in no game.
- Relief only: famine brought the state down in no game.
- Lowest tax: famine brought the state down in no game.
- Says yes: famine brought the state down in no game.
- Squeeze then spend: famine brought the state down in no game.
- Hover then spend: famine brought the state down in no game.

## The tuning run

### Tuning: Republic of Tavara, seeds 1-300

| Player | Games | Won | Lost the vote | Lost to famine | Vote share | Treasury at the end | Approval at the end |
| --- | ---: | ---: | ---: | ---: | --- | --- | --- |
| Does nothing | 300 | 0.0% | 4.0% | 96.0% | 38.3% / 41.8% / 44.7% | $0.0m / $0.2m / $1.3m | 34.0% / 41.1% / 44.2% |
| Popularity | 300 | 0.0% | 4.0% | 96.0% | 36.7% / 41.6% / 43.7% | $0.0m / $2.4m / $2.9m | 35.6% / 44.5% / 48.5% |
| Sensible | 300 | 44.7% | 55.3% | 0.0% | 41.2% / 49.6% / 54.7% | $0.0m / $0.3m / $0.9m | 43.9% / 49.8% / 53.4% |
| Relief only | 300 | 1.3% | 98.7% | 0.0% | 37.5% / 46.1% / 50.8% | $0.0m / $15.6m / $78.9m | 39.9% / 46.5% / 49.1% |
| Lowest tax | 300 | 0.3% | 51.0% | 48.7% | 37.1% / 43.0% / 51.8% | $0.0m / $0.2m / $0.4m | 35.5% / 43.1% / 49.2% |
| Says yes | 300 | 0.0% | 100.0% | 0.0% | 38.7% / 45.3% / 49.7% | $0.1m / $33.1m / $112.4m | 38.0% / 45.8% / 48.4% |
| Squeeze then spend | 300 | 0.3% | 99.7% | 0.0% | 41.3% / 45.7% / 50.3% | $25.7m / $96.6m / $151.3m | 42.7% / 45.9% / 48.3% |
| Hover then spend | 300 | 65.7% | 34.3% | 0.0% | 44.7% / 51.1% / 56.7% | $0.0m / $0.3m / $0.9m | 47.0% / 51.4% / 55.5% |

Spreads are least / middle / most. Vote share counts only the games that reached the vote.

- Does nothing: famine brought the state down in The Dry East 151, Korr Highlands 77, Arden Vale 30, Salt Coast 30 (in quarter 8 / 8 / 20).
- Popularity: famine brought the state down in The Dry East 152, Korr Highlands 66, Arden Vale 44, Salt Coast 26 (in quarter 8 / 8 / 20).
- Sensible: famine brought the state down in no game.
- Relief only: famine brought the state down in no game.
- Lowest tax: famine brought the state down in The Dry East 57, Arden Vale 54, Korr Highlands 23, Salt Coast 12 (in quarter 8 / 14 / 20).
- Says yes: famine brought the state down in no game.
- Squeeze then spend: famine brought the state down in no game.
- Hover then spend: famine brought the state down in no game.

## What was changed

Only data was changed: `src/sim/balance.ts` and `src/countries/tavara.json`. No rule of the
simulation was touched.

| Value | From | To | Why |
| --- | --- | --- | --- |
| `approval.baselinePermille` | 540 | 455 | Sets the level a competent player ends near. At 540 the sensible player won every game. |
| `approval.adjustPermillePerQuarter` | 300 | 100 | Approval now moves a tenth of the way each quarter where it moved three tenths. This is what stops a last-minute giveaway from winning (see below). |
| `approval.food` (tight, shortage, famine) | −60, −150, −300 | −120, −300, −600 | Doubled, so that hunger still reaches approval, and strikes, within a few quarters now that approval moves more slowly. |
| `unrest.strikes.outputPermille` | 850 | 700 | A striking region now costs more revenue than the tax that provoked it brings in. |
| `unrest.protests.outputPermille` | 700 | 400 | The same, more so. |
| Tavara drought chance, Korr Highlands | 0.10 | 0.15 | Drought now threatens four regions where it threatened two. |
| Tavara drought chance, The Dry East | 0.30 | 0.35 | |
| Tavara drought chance, Arden Vale | 0 | 0.10 | |
| Tavara drought chance, Salt Coast | 0 | 0.07 | |

Left as they were: the tax range and what a point of tax costs, what the public expects of
health, education and security, the election's 50% and its 3-point swing, the strike and
protest thresholds (40% and 30%), every site's cost, build time and effect, every dilemma and
its chance, and all of Tavara's starting figures. The game now opens with approval at 45.8%
and the election forecast reading 42.8% to 48.8%, on course to lose.

## What the runs showed

**Before tuning.** On seeds 1 to 200 the player who does nothing lost 84.5% of games, the
popularity player 82.0%, and a first version of the sensible player won 100.0%, with a vote
share of 53% to 64%.
Lowering the baseline alone met the three targets, but left a strategy that won nearly always.

**A dominant strategy, and how far it has been blunted.** Money keeps and approval fades, so
the best play is to be unpopular early and generous late. Two one-lever players test this.
Their "before" figures are from a trial with the baseline at 470 and approval still moving
three tenths of the way each quarter:

- "Squeeze then spend" taxes at the top rate and spends nothing on services until six quarters
  before the vote, then spends everything on approval. With approval moving three tenths of the
  way each quarter it won 99.5% of 200 games, ending with over $200m unspent. With approval
  moving a tenth of the way it wins 1.8%: six quarters are not enough to be forgiven.
- "Hover then spend" holds tax as high as keeps approval just clear of the strike line, then
  does the same. It won 99.5% of 200 games before and wins 71.9% now. This is the strongest
  line found. It is the sensible player's own plan run with a tighter hand, so some edge is
  right, but it is a mechanical recipe that wins seven games in ten. Raising the strike
  threshold to 45% took it to 88% at an earlier setting and was not kept. Closing it further
  needs a rule the game does not yet have, such as expectations that rise with what the
  treasury holds; that is a matter for the owner.

**No other single lever wins.** Relief alone wins 3.5%, the lowest tax 0.8%, saying yes to
every dilemma 1.8%.

**How the sensible player loses.** Always at the vote, never to famine: sending relief to the
hungriest region each quarter kept every region alive in all 1,200 games. Famine is what ends
the games of players who send none, most often in quarter 8, six quarters after a first-year
drought is announced. The fairness test in `tests/sim/risks.test.ts`
still holds on the tuned files.

**Building does not change the result.** At one setting during tuning the sensible player won
47.0% of 200 games whether or not it built anything.
Sites are insurance against the cost of drought, and in Phase 1 nothing they save comes back
as money or approval before the vote. This was not measured again at the final values.

**Dilemmas matter more than their cost suggests.** Answering them for approval where the
treasury allowed was worth about two points of vote share to the sensible player during
tuning. A push on approval fades at the same slow rate as everything else, so it lasts.

**The balance is steep.** The campaign moves the vote at most 3 points, so each point of final
approval is worth about 15 points of win rate: at a baseline of 460 the sensible player won
54.5% of 200 games, and at 470 it won 71.0%. A change to any value that bears on approval
needs a fresh run.

**Testland is easy.** Its starting budget buys 57.1% approval, and its sensible player wins
every game. It exists to prove that nothing is tied to Tavara, and was left alone.
