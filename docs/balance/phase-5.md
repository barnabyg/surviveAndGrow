# Phase 5 balance

Recorded 2026-11-23, for issue #106. The figures below come from the scripted players in
`tests/balance/players.ts`, played through whole games of up to four terms on the countries as
they ship, with the research, surveys and locked sites of Phase 5 and the clinics and schools of
issue #102. The Phase 4 record, which this follows, is [phase-4.md](phase-4.md). Its three
tickets were #104 (players and reporting), #105 (tuning) and #106 (this record), as
[docs/agents/balance-tickets.md](../agents/balance-tickets.md) sets out.

## Targets

These are the targets proposed in issue #104 and confirmed by the owner on 2026-11-23, with one
dropped: that the unlocker win as often as the chain builder ("I have no concern about some
approaches being worse than others"). The owner asked that the rest be read with some
flexibility, and on the same day accepted these results as recorded, the unmet target on
surveying among them. They apply to the real country, Tavara, over games of up to four terms.

| Target | Result on the confirmation run | Met |
| --- | --- | --- |
| Research raises the win rate of a player that builds: the improver wins at least 5 points more often than the chain builder | The improver wins 64.8%, the chain builder 52.5%: 12.3 points more | Yes |
| Surveying is worth it on average: the prospector wins at least as often as the chain builder, to within 3 points | The prospector wins 28.3%, 24.2 points fewer than the chain builder. Not met, and not by any value tried: see below | No |
| But not always: in at least 15% of its games the prospector's surveys find nothing | They find nothing in 24.7% of its games | Yes |
| A found deposit is worth mining: at least half of the deposits found are mined by the end of the game | 72.4% (278 of 384) | Yes |
| Nothing earlier is undone: the chain builder stays within 5 points of the 53.5% Phase 4 recorded | Wins 52.5% | Yes |
| No player wins every game | The best of the eleven players in the balance's own set, the timing trader, wins 89.0%; the best of the probes (`BALANCE_PLAYERS=all`), the trader blind to shocks, 90.0% | Yes |
| The player who does nothing almost never wins | Wins 0.0% (95.3% lost to famine, 4.8% at the vote) | Yes |
| The player who spends everything on popularity almost never wins | Wins 0.0% (98.3% lost to famine, 1.8% at the vote) | Yes |

**Two values were changed**: grid efficiency and road engineering each cost $7.5m to research, not
$15.0m. That met the target on research. The target that surveying be worth it on average is
not met, and values alone do not reach it: as the prospector plays, the money a found deposit
takes comes before the farming sites that win the game. What would meet it is a change to the
player or to what a found deposit is worth; the owner chose to accept it as unmet: see What the
runs showed. Testland, the crude second country, has no targets; every one of its 1,100 confirmation
games ran to an ending without error, every player's included.

## How a game is played and scored

As in Phase 4: a game is played until it is won, lost, or four terms (80 quarters) are up, and a
game still being played then is **still in office**. Won is the win on prosperity, with the debt
test passed as the four-quarter hold completes.

The report gained a fifth table, for research and surveys, and a line for each player beneath
the losses that names each technology it came to know, in what share of its games, and when:

- **Technologies known**: the share of games that came to know at least one, then how many
  each game knew as it ended.
- **Quarter of the first technology**: the quarter of the game in which the first research
  finished, in the games that researched.
- **Regions surveyed**: the surveys each game finished.
- **Deposits found**: the share of games whose surveys found at least one, then how many each
  game found.
- **Found deposits mined**: of all the deposits the games found, the share whose mine was in
  use as its game ended, and how many. A mine still being built is not counted.

## The players

The eight players of Phase 4 play exactly as before. Three join them in the balance's own set,
each the chain builder with one thing more, so the chain builder is the twin of all three. None
borrows or trades. Each starts its research or surveys ahead of the next site, as soon as the
money free covers the whole cost, and starts nothing during a campaign.

| Player | How it plays |
| --- | --- |
| Improver | Builds the chain builder's sites in its order, and researches each technology that would improve a site it has in use, the cheapest to reach first, by way of whatever that needs first. Until a site is in use it decides exactly as the chain builder does. |
| Unlocker | Researches towards every site a technology unlocks, the cheapest to reach first, and builds each once it is unlocked, before anything else. It gives up no site for one: where a locked site is an alternative to one the chain builder builds, as Tavara's dam is to its power station, it builds that site in its turn, which closes the locked one. In Tavara it researches public health and teacher training and builds the clinics and schools. |
| Prospector | Surveys every region where ore may lie before it builds anything, and builds the road and mine of each deposit found once the chain builder's own large sites are built, before the farming sites. Where there is nothing to survey it decides exactly as the chain builder does. |

One probe joins the one-lever players (`BALANCE_PLAYERS=all`):

| Player | How it plays |
| --- | --- |
| Unlocker holding out | The unlocker, but it leaves alone whatever would rule a locked site out, and what depends on that, until the locked site is begun: in Tavara the power station and the three power lines, which wait for the dam. |

The unlocker first played as the probe now does. On the short run of #104 it won 1% of its games
and lost 34 first votes to the chain builder's 11, which measured going nine years without
power, not what a new type of site is worth, so the two were parted.

## The confirmation run

### Confirmation: Republic of Tavara, seeds 1001-1400, up to 4 terms

| Player | Games | Won | Still in office | Lost the vote | Lost to famine | Terms served | Quarter of the win | Prosperity at the end |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- | --- |
| Does nothing | 400 | 0.0% | 0.0% | 4.8% | 95.3% | 1 / 1 / 1 | none | 14.3 / 19.1 / 20.4 |
| Popularity | 400 | 0.0% | 0.0% | 1.8% | 98.3% | 1 / 1 / 1 | none | 8.0 / 13.8 / 17.7 |
| Sensible | 400 | 0.0% | 0.0% | 100.0% | 0.0% | 1 / 1 / 4 | none | 26.5 / 34.1 / 34.4 |
| Chain builder | 400 | 52.5% | 0.0% | 47.5% | 0.0% | 1 / 2 / 3 | 32 / 38 / 57 | 21.4 / 42.2 / 44.0 |
| Sensible borrower | 400 | 66.0% | 0.0% | 34.0% | 0.0% | 1 / 2 / 3 | 31 / 36 / 53 | 20.5 / 42.8 / 44.0 |
| Reckless borrower | 400 | 9.0% | 0.0% | 91.0% | 0.0% | 1 / 2 / 2 | 32 / 34 / 39 | 29.1 / 39.6 / 44.3 |
| Timing trader | 400 | 89.0% | 0.0% | 11.0% | 0.0% | 1 / 2 / 3 | 28 / 32 / 52 | 25.9 / 43.4 / 44.4 |
| Mine only | 400 | 0.0% | 0.5% | 99.5% | 0.0% | 1 / 2 / 4 | none | 19.3 / 38.4 / 40.5 |
| Improver | 400 | 64.8% | 0.0% | 35.3% | 0.0% | 1 / 3 / 4 | 35 / 51 / 78 | 21.5 / 43.1 / 44.8 |
| Unlocker | 400 | 6.3% | 0.0% | 93.8% | 0.0% | 1 / 2 / 4 | 46 / 53 / 78 | 21.2 / 35.1 / 42.4 |
| Prospector | 400 | 28.3% | 3.5% | 68.3% | 0.0% | 1 / 3 / 4 | 32 / 52 / 77 | 21.4 / 39.9 / 44.0 |
| Relief only | 400 | 0.0% | 0.0% | 99.8% | 0.3% | 1 / 2 / 4 | none | 9.9 / 19.9 / 20.6 |
| Lowest tax | 400 | 0.0% | 0.0% | 44.3% | 55.8% | 1 / 1 / 2 | none | 7.3 / 13.8 / 18.9 |
| Says yes | 400 | 0.0% | 0.0% | 100.0% | 0.0% | 1 / 2 / 4 | none | 11.1 / 20.0 / 20.6 |
| Squeeze then spend | 400 | 0.0% | 6.0% | 93.3% | 0.8% | 1 / 3 / 4 | none | 10.2 / 18.9 / 20.4 |
| Power only | 400 | 0.0% | 0.0% | 100.0% | 0.0% | 1 / 1 / 4 | none | 30.8 / 37.9 / 38.6 |
| Chain by the quay | 400 | 52.3% | 0.0% | 47.8% | 0.0% | 1 / 2 / 3 | 30 / 36 / 57 | 23.2 / 42.0 / 43.0 |
| Borrow and build at once | 400 | 0.0% | 0.0% | 100.0% | 0.0% | 1 / 1 / 1 | none | 36.7 / 43.0 / 44.2 |
| Borrower wary of gluts | 400 | 63.5% | 0.0% | 36.5% | 0.0% | 1 / 2 / 3 | 31 / 36 / 57 | 20.5 / 42.8 / 44.0 |
| Trader blind to shocks | 400 | 90.0% | 0.0% | 10.0% | 0.0% | 1 / 2 / 3 | 28 / 31 / 50 | 25.9 / 43.4 / 44.4 |
| Hover then spend | 400 | 0.0% | 21.8% | 78.0% | 0.3% | 2 / 4 / 4 | none | 12.1 / 19.7 / 21.3 |
| Unlocker holding out | 400 | 1.0% | 0.8% | 98.3% | 0.0% | 1 / 2 / 4 | 56 / 65 / 71 | 16.6 / 28.5 / 42.0 |

| Player | Highest tier reached | Vote share at the last vote | Treasury at the end | Approval at the end |
| --- | --- | --- | --- | --- |
| Does nothing | Subsistence 100.0% | 42.9% / 45.4% / 49.9% | $0.0m / $0.3m / $2.0m | 40.4% / 46.9% / 49.9% |
| Popularity | Subsistence 100.0% | 38.3% / 43.4% / 47.4% | $0.0m / $2.8m / $2.8m | 38.6% / 49.7% / 54.6% |
| Sensible | Developing 100.0% | 25.0% / 47.3% / 49.9% | $0.0m / $0.4m / $0.9m | 27.6% / 47.8% / 52.4% |
| Chain builder | Subsistence 4.5%, Developing 14.3%, Industrialising 17.3%, Prosperous 64.0% | 32.2% / 50.1% / 59.8% | $0.0m / $2.8m / $81.0m | 32.4% / 44.8% / 52.7% |
| Sensible borrower | Subsistence 18.0%, Developing 11.3%, Industrialising 2.8%, Prosperous 68.0% | 37.3% / 51.3% / 58.4% | $0.0m / $13.6m / $100.6m | 32.6% / 45.1% / 52.9% |
| Reckless borrower | Industrialising 19.0%, Prosperous 81.0% | 9.2% / 20.9% / 57.2% | $0.0m / $0.5m / $100.9m | 10.5% / 20.2% / 52.4% |
| Timing trader | Subsistence 0.3%, Developing 7.8%, Industrialising 1.5%, Prosperous 90.5% | 42.8% / 53.6% / 61.2% | $0.0m / $86.0m / $217.2m | 33.4% / 44.9% / 52.6% |
| Mine only | Subsistence 20.8%, Developing 13.0%, Industrialising 66.3% | 28.0% / 47.9% / 50.9% | $0.0m / $0.4m / $0.9m | 27.8% / 48.0% / 52.7% |
| Improver | Subsistence 3.3%, Developing 24.0%, Industrialising 5.8%, Prosperous 67.0% | 37.4% / 51.2% / 57.6% | $0.0m / $21.7m / $82.6m | 27.4% / 44.2% / 52.6% |
| Unlocker | Subsistence 9.5%, Developing 45.8%, Industrialising 38.0%, Prosperous 6.8% | 24.3% / 47.3% / 53.6% | $0.0m / $0.5m / $80.7m | 22.6% / 47.2% / 52.6% |
| Prospector | Subsistence 6.5%, Developing 27.5%, Industrialising 34.5%, Prosperous 31.5% | 24.0% / 49.0% / 59.6% | $0.0m / $0.7m / $90.7m | 24.2% / 47.8% / 57.0% |
| Relief only | Subsistence 100.0% | 23.0% / 47.6% / 50.0% | $0.0m / $0.3m / $63.7m | 24.9% / 48.1% / 52.9% |
| Lowest tax | Subsistence 100.0% | 34.9% / 46.9% / 55.1% | $0.0m / $0.2m / $0.4m | 34.6% / 47.0% / 53.7% |
| Says yes | Subsistence 100.0% | 26.7% / 47.6% / 49.9% | $0.0m / $29.8m / $137.8m | 28.1% / 48.3% / 52.4% |
| Squeeze then spend | Subsistence 100.0% | 39.2% / 48.6% / 54.1% | $136.0m / $332.4m / $532.5m | 37.9% / 49.5% / 52.8% |
| Power only | Developing 57.3%, Industrialising 42.8% | 34.4% / 47.4% / 49.9% | $0.0m / $0.4m / $1.0m | 33.6% / 48.0% / 52.6% |
| Chain by the quay | Subsistence 7.3%, Developing 11.3%, Industrialising 20.0%, Prosperous 61.5% | 32.6% / 50.2% / 59.2% | $0.0m / $7.8m / $87.4m | 32.4% / 43.7% / 52.9% |
| Borrow and build at once | Prosperous 100.0% | 26.0% / 33.9% / 45.3% | $0.0m / $0.8m / $176.1m | 25.5% / 33.8% / 44.4% |
| Borrower wary of gluts | Subsistence 18.8%, Developing 11.0%, Industrialising 4.8%, Prosperous 65.5% | 37.3% / 51.1% / 58.4% | $0.0m / $12.9m / $100.6m | 32.6% / 45.3% / 52.9% |
| Trader blind to shocks | Subsistence 0.3%, Developing 7.5%, Industrialising 1.5%, Prosperous 90.8% | 44.4% / 53.7% / 61.2% | $0.0m / $89.5m / $217.2m | 33.4% / 44.9% / 52.7% |
| Hover then spend | Subsistence 100.0% | 30.8% / 47.5% / 59.6% | $0.0m / $0.4m / $11.3m | 33.7% / 47.6% / 56.8% |
| Unlocker holding out | Subsistence 51.8%, Developing 29.5%, Industrialising 17.0%, Prosperous 1.8% | 20.9% / 47.7% / 54.6% | $0.0m / $0.4m / $57.4m | 21.6% / 48.0% / 52.8% |

| Player | Borrowed | Bailed out | Bailouts in a game | Win held back by the debt test | Debt burden at the end | Highest debt burden |
| --- | --- | ---: | --- | --- | --- | --- |
| Does nothing | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Popularity | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Sensible | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Chain builder | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Sensible borrower | $60.0m / $70.0m / $160.0m | 0.0% | none | never | 0% / 0% / 14% | 26% / 39% / 55% |
| Reckless borrower | $525.0m / $965.0m / $1075.0m | 80.0% | 1 / 1 / 1 | 73.0%, 36 of 292 won later, waiting 1 / 4 / 12 quarters | 0% / 26% / 549% | 190% / 789% / 1143% |
| Timing trader | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Mine only | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Improver | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Unlocker | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Prospector | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Relief only | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Lowest tax | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Says yes | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Squeeze then spend | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Power only | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Chain by the quay | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Borrow and build at once | $935.0m / $1050.0m / $1255.0m | 0.0% | none | 100.0%, 0 of 400 won later, waiting 2 / 8 / 8 quarters | 25% / 120% / 552% | 94% / 236% / 578% |
| Borrower wary of gluts | $35.0m / $70.0m / $140.0m | 0.0% | none | never | 0% / 0% / 14% | 18% / 39% / 46% |
| Trader blind to shocks | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Hover then spend | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Unlocker holding out | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |

| Player | Grain imported | Grain exported | Trade income | Trade spending | Failed harvests abroad met | Ore gluts met | Droughts met | Floods met |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Does nothing | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 30.0%, 0 / 0 / 2 | 34.8%, 0 / 0 / 2 | 97.5%, 0 / 2 / 5 | 59.0%, 0 / 1 / 5 |
| Popularity | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 26.0%, 0 / 0 / 2 | 33.3%, 0 / 0 / 2 | 95.0%, 0 / 2 / 5 | 59.3%, 0 / 1 / 5 |
| Sensible | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 66.5%, 0 / 1 / 5 | 72.8%, 0 / 1 / 7 | 99.5%, 0 / 5 / 17 | 89.5%, 0 / 2 / 12 |
| Chain builder | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 77.5%, 0 / 1 / 5 | 83.3%, 0 / 1 / 5 | 100.0%, 2 / 7 / 15 | 97.0%, 0 / 3 / 9 |
| Sensible borrower | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 69.0%, 0 / 1 / 4 | 76.3%, 0 / 1 / 4 | 99.5%, 0 / 5 / 15 | 91.8%, 0 / 2 / 9 |
| Reckless borrower | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 67.5%, 0 / 1 / 4 | 75.3%, 0 / 1 / 4 | 99.0%, 0 / 5 / 15 | 90.3%, 0 / 2 / 9 |
| Timing trader | 0kt / 76kt / 331kt | 90kt / 866kt / 1762kt | $18.1m / $184.1m / $385.7m | $0.0m / $17.2m / $101.4m | 69.0%, 0 / 1 / 3 | 77.0%, 0 / 1 / 4 | 99.8%, 0 / 5 / 13 | 94.8%, 0 / 2 / 9 |
| Mine only | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 75.8%, 0 / 1 / 5 | 81.3%, 0 / 1 / 7 | 100.0%, 1 / 7 / 19 | 93.5%, 0 / 3 / 12 |
| Improver | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 82.8%, 0 / 1 / 5 | 87.0%, 0 / 2 / 6 | 99.8%, 0 / 8 / 17 | 97.0%, 0 / 4 / 11 |
| Unlocker | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 80.8%, 0 / 1 / 5 | 84.0%, 0 / 2 / 6 | 100.0%, 2 / 7 / 19 | 96.3%, 0 / 3 / 10 |
| Prospector | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 87.0%, 0 / 1 / 6 | 89.0%, 0 / 2 / 6 | 100.0%, 2 / 9 / 19 | 98.0%, 0 / 4 / 14 |
| Relief only | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 77.5%, 0 / 1 / 5 | 83.3%, 0 / 2 / 6 | 99.3%, 0 / 7 / 17 | 94.3%, 0 / 3 / 10 |
| Lowest tax | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 46.8%, 0 / 0 / 3 | 53.0%, 0 / 1 / 3 | 98.8%, 0 / 3 / 7 | 78.8%, 0 / 1 / 5 |
| Says yes | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 76.3%, 0 / 1 / 6 | 82.0%, 0 / 2 / 7 | 99.3%, 0 / 8 / 18 | 93.0%, 0 / 3 / 12 |
| Squeeze then spend | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 82.5%, 0 / 2 / 6 | 86.8%, 0 / 2 / 7 | 99.0%, 0 / 9 / 21 | 94.8%, 0 / 4 / 12 |
| Power only | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 64.5%, 0 / 1 / 5 | 71.8%, 0 / 1 / 5 | 99.0%, 0 / 5 / 19 | 88.8%, 0 / 2 / 12 |
| Chain by the quay | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 71.8%, 0 / 1 / 4 | 77.8%, 0 / 1 / 4 | 100.0%, 1 / 6 / 14 | 93.5%, 0 / 3 / 9 |
| Borrow and build at once | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 52.8%, 0 / 1 / 3 | 58.5%, 0 / 1 / 3 | 97.5%, 0 / 3 / 9 | 82.3%, 0 / 2 / 6 |
| Borrower wary of gluts | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 69.3%, 0 / 1 / 4 | 76.3%, 0 / 1 / 4 | 99.5%, 0 / 5 / 15 | 91.8%, 0 / 2 / 9 |
| Trader blind to shocks | 0kt / 39kt / 277kt | 90kt / 851kt / 1509kt | $18.1m / $182.5m / $338.4m | $0.0m / $8.9m / $62.5m | 69.0%, 0 / 1 / 3 | 76.8%, 0 / 1 / 4 | 99.8%, 0 / 5 / 13 | 94.8%, 0 / 2 / 9 |
| Hover then spend | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 95.0%, 0 / 3 / 6 | 95.5%, 0 / 3 / 7 | 100.0%, 6 / 13 / 21 | 100.0%, 1 / 5 / 14 |
| Unlocker holding out | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 74.3%, 0 / 1 / 6 | 79.3%, 0 / 1 / 7 | 99.5%, 0 / 7 / 19 | 93.5%, 0 / 3 / 12 |

| Player | Technologies known | Quarter of the first technology | Regions surveyed | Deposits found | Found deposits mined |
| --- | --- | --- | --- | --- | --- |
| Does nothing | 0.0%, 0 / 0 / 0 | none | 0 / 0 / 0 | 0.0%, 0 / 0 / 0 | none found |
| Popularity | 0.0%, 0 / 0 / 0 | none | 0 / 0 / 0 | 0.0%, 0 / 0 / 0 | none found |
| Sensible | 0.0%, 0 / 0 / 0 | none | 0 / 0 / 0 | 0.0%, 0 / 0 / 0 | none found |
| Chain builder | 0.0%, 0 / 0 / 0 | none | 0 / 0 / 0 | 0.0%, 0 / 0 / 0 | none found |
| Sensible borrower | 0.0%, 0 / 0 / 0 | none | 0 / 0 / 0 | 0.0%, 0 / 0 / 0 | none found |
| Reckless borrower | 0.0%, 0 / 0 / 0 | none | 0 / 0 / 0 | 0.0%, 0 / 0 / 0 | none found |
| Timing trader | 0.0%, 0 / 0 / 0 | none | 0 / 0 / 0 | 0.0%, 0 / 0 / 0 | none found |
| Mine only | 0.0%, 0 / 0 / 0 | none | 0 / 0 / 0 | 0.0%, 0 / 0 / 0 | none found |
| Improver | 100.0%, 3 / 5 / 5 | 7 / 7 / 7 | 0 / 0 / 0 | 0.0%, 0 / 0 / 0 | none found |
| Unlocker | 100.0%, 2 / 2 / 2 | 4 / 4 / 4 | 0 / 0 / 0 | 0.0%, 0 / 0 / 0 | none found |
| Prospector | 0.0%, 0 / 0 / 0 | none | 2 / 2 / 2 | 75.3%, 0 / 1 / 2 | 72.4%, 278 of 384 |
| Relief only | 0.0%, 0 / 0 / 0 | none | 0 / 0 / 0 | 0.0%, 0 / 0 / 0 | none found |
| Lowest tax | 0.0%, 0 / 0 / 0 | none | 0 / 0 / 0 | 0.0%, 0 / 0 / 0 | none found |
| Says yes | 0.0%, 0 / 0 / 0 | none | 0 / 0 / 0 | 0.0%, 0 / 0 / 0 | none found |
| Squeeze then spend | 0.0%, 0 / 0 / 0 | none | 0 / 0 / 0 | 0.0%, 0 / 0 / 0 | none found |
| Power only | 0.0%, 0 / 0 / 0 | none | 0 / 0 / 0 | 0.0%, 0 / 0 / 0 | none found |
| Chain by the quay | 0.0%, 0 / 0 / 0 | none | 0 / 0 / 0 | 0.0%, 0 / 0 / 0 | none found |
| Borrow and build at once | 0.0%, 0 / 0 / 0 | none | 0 / 0 / 0 | 0.0%, 0 / 0 / 0 | none found |
| Borrower wary of gluts | 0.0%, 0 / 0 / 0 | none | 0 / 0 / 0 | 0.0%, 0 / 0 / 0 | none found |
| Trader blind to shocks | 0.0%, 0 / 0 / 0 | none | 0 / 0 / 0 | 0.0%, 0 / 0 / 0 | none found |
| Hover then spend | 0.0%, 0 / 0 / 0 | none | 0 / 0 / 0 | 0.0%, 0 / 0 / 0 | none found |
| Unlocker holding out | 100.0%, 4 / 7 / 7 | 4 / 4 / 4 | 0 / 0 / 0 | 0.0%, 0 / 0 / 0 | none found |

Spreads are least / middle / most. Won is the win on prosperity: Prosperous held for four quarters running, with the debt burden within the debt test as the hold completes. Still in office counts the games that had neither won nor lost when their terms were up. Vote share counts only the games that reached a vote. Bailed out counts the games in which a missed payment brought a bailout, and bailouts in a game counts them in those games. The win held back by the debt test counts the games in which prosperity was held long enough to win but the debt burden was over the limit, with how many of them were won once it passed and the quarters the win waited. The debt burden is what is owed against a year’s revenue. Grain is in thousands of tonnes (kt) over the game. A shock met is a world price shock that moved its price, or a drought or flood that began in a region, while the game was played: the share of games that met one, then how many each game met. Technologies known is the share of games that came to know at least one, then how many each game knew as it ended; the quarter of the first technology is the quarter of the game in which its research finished, in those games. Regions surveyed counts the surveys finished. Deposits found is the share of games whose surveys found at least one, then how many each game found. A found deposit is mined when its mine is in use as the game ends: the share of all the deposits the games found, and how many of them.

- Does nothing: lost the vote 19 in term 1; famine brought the state down in The Dry East 197, Korr Highlands 117, Arden Vale 36, Salt Coast 31 (in quarter 8 / 8 / 20).
- Popularity: lost the vote 7 in term 1; famine brought the state down in The Dry East 199, Korr Highlands 89, Arden Vale 54, Salt Coast 31, South Delta 18, Lowmere Plains 2 (in quarter 8 / 8 / 20).
- Sensible: lost the vote 207 in term 1, 95 in term 2, 82 in term 3, 16 in term 4; famine brought the state down in no game.
- Chain builder: lost the vote 29 in term 1, 150 in term 2, 11 in term 3; famine brought the state down in no game.
- Sensible borrower: lost the vote 117 in term 1, 19 in term 2; famine brought the state down in no game.
- Reckless borrower: lost the vote 156 in term 1, 208 in term 2; famine brought the state down in no game.
- Timing trader: lost the vote 31 in term 1, 13 in term 2; famine brought the state down in no game.
- Mine only: lost the vote 92 in term 1, 199 in term 2, 58 in term 3, 49 in term 4; famine brought the state down in no game.
- Improver: lost the vote 24 in term 1, 83 in term 2, 34 in term 3; famine brought the state down in no game.
- Unlocker: lost the vote 45 in term 1, 229 in term 2, 94 in term 3, 7 in term 4; famine brought the state down in no game.
- Prospector: lost the vote 25 in term 1, 106 in term 2, 110 in term 3, 32 in term 4; famine brought the state down in no game.
- Relief only: lost the vote 79 in term 1, 176 in term 2, 132 in term 3, 12 in term 4; famine brought the state down in Korr Highlands 1 (in quarter 60 / 60 / 60).
- Lowest tax: lost the vote 174 in term 1, 3 in term 2; famine brought the state down in The Dry East 90, Arden Vale 71, Korr Highlands 35, Salt Coast 25, South Delta 2 (in quarter 8 / 16 / 40).
- Says yes: lost the vote 108 in term 1, 116 in term 2, 124 in term 3, 52 in term 4; famine brought the state down in no game.
- Squeeze then spend: lost the vote 88 in term 1, 67 in term 2, 97 in term 3, 121 in term 4; famine brought the state down in Arden Vale 1, The Dry East 1, South Delta 1 (in quarter 80 / 80 / 80).
- Power only: lost the vote 222 in term 1, 109 in term 2, 59 in term 3, 10 in term 4; famine brought the state down in no game.
- Chain by the quay: lost the vote 66 in term 1, 122 in term 2, 3 in term 3; famine brought the state down in no game.
- Borrow and build at once: lost the vote 400 in term 1; famine brought the state down in no game.
- Borrower wary of gluts: lost the vote 119 in term 1, 27 in term 2; famine brought the state down in no game.
- Trader blind to shocks: lost the vote 30 in term 1, 10 in term 2; famine brought the state down in no game.
- Hover then spend: lost the vote 8 in term 2, 78 in term 3, 226 in term 4; famine brought the state down in Korr Highlands 1 (in quarter 68 / 68 / 68).
- Unlocker holding out: lost the vote 116 in term 1, 164 in term 2, 93 in term 3, 20 in term 4; famine brought the state down in no game.

- Does nothing: came to know no technology.
- Popularity: came to know no technology.
- Sensible: came to know no technology.
- Chain builder: came to know no technology.
- Sensible borrower: came to know no technology.
- Reckless borrower: came to know no technology.
- Timing trader: came to know no technology.
- Mine only: came to know no technology.
- Improver: came to know Drought-resistant seed in 100.0% of its games (quarter 7 / 7 / 7), Improved irrigation in 93.3% (quarter 25 / 26 / 55), Cold storage in 100.0% (quarter 10 / 10 / 10), Road engineering in 92.5% (quarter 30 / 31 / 53), Grid efficiency in 100.0% (quarter 15 / 15 / 16).
- Unlocker: came to know Public health in 100.0% of its games (quarter 4 / 4 / 4), Teacher training in 100.0% (quarter 8 / 8 / 8).
- Prospector: came to know no technology.
- Relief only: came to know no technology.
- Lowest tax: came to know no technology.
- Says yes: came to know no technology.
- Squeeze then spend: came to know no technology.
- Power only: came to know no technology.
- Chain by the quay: came to know no technology.
- Borrow and build at once: came to know no technology.
- Borrower wary of gluts: came to know no technology.
- Trader blind to shocks: came to know no technology.
- Hover then spend: came to know no technology.
- Unlocker holding out: came to know Drought-resistant seed in 100.0% of its games (quarter 12 / 12 / 14), Improved irrigation in 100.0% (quarter 16 / 16 / 27), Cold storage in 71.0% (quarter 24 / 24 / 30), Grid efficiency in 71.0% (quarter 29 / 29 / 35), Hydropower in 67.0% (quarter 35 / 36 / 52), Public health in 100.0% (quarter 4 / 4 / 4), Teacher training in 100.0% (quarter 8 / 8 / 8).

### Confirmation: Testland, seeds 1001-1050, up to 4 terms

| Player | Games | Won | Still in office | Lost the vote | Lost to famine | Terms served | Quarter of the win | Prosperity at the end |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- | --- |
| Does nothing | 50 | 0.0% | 0.0% | 0.0% | 100.0% | 1 / 1 / 4 | none | 10.8 / 22.9 / 23.2 |
| Popularity | 50 | 0.0% | 0.0% | 2.0% | 98.0% | 1 / 1 / 4 | none | 7.4 / 20.2 / 25.5 |
| Sensible | 50 | 0.0% | 0.0% | 98.0% | 2.0% | 1 / 2 / 3 | none | 17.6 / 38.8 / 41.2 |
| Chain builder | 50 | 0.0% | 0.0% | 96.0% | 4.0% | 1 / 2 / 4 | none | 14.1 / 28.3 / 35.9 |
| Sensible borrower | 50 | 0.0% | 0.0% | 98.0% | 2.0% | 1 / 2 / 3 | none | 18.2 / 26.1 / 36.5 |
| Reckless borrower | 50 | 0.0% | 0.0% | 100.0% | 0.0% | 1 / 1 / 2 | none | 24.0 / 30.7 / 49.6 |
| Timing trader | 50 | 0.0% | 0.0% | 96.0% | 4.0% | 1 / 2 / 4 | none | 13.4 / 27.7 / 35.9 |
| Mine only | 50 | 0.0% | 0.0% | 94.0% | 6.0% | 1 / 2 / 4 | none | 12.5 / 25.1 / 35.5 |
| Improver | 50 | 0.0% | 0.0% | 96.0% | 4.0% | 1 / 2 / 4 | none | 18.0 / 29.7 / 36.4 |
| Unlocker | 50 | 0.0% | 0.0% | 98.0% | 2.0% | 1 / 2 / 4 | none | 10.4 / 25.3 / 27.7 |
| Prospector | 50 | 0.0% | 0.0% | 96.0% | 4.0% | 1 / 2 / 4 | none | 14.1 / 27.9 / 35.9 |
| Relief only | 50 | 0.0% | 6.0% | 4.0% | 90.0% | 2 / 3 / 4 | none | 9.4 / 13.5 / 24.7 |
| Lowest tax | 50 | 0.0% | 0.0% | 10.0% | 90.0% | 1 / 3 / 4 | none | 5.2 / 9.1 / 20.4 |
| Says yes | 50 | 0.0% | 8.0% | 10.0% | 82.0% | 2 / 4 / 4 | none | 9.4 / 13.6 / 24.5 |
| Squeeze then spend | 50 | 0.0% | 0.0% | 66.0% | 34.0% | 1 / 2 / 4 | none | 6.8 / 24.0 / 25.4 |
| Power only | 50 | 54.0% | 0.0% | 46.0% | 0.0% | 1 / 2 / 3 | 19 / 19 / 31 | 24.0 / 42.0 / 50.6 |
| Chain by the quay | 50 | 2.0% | 0.0% | 96.0% | 2.0% | 1 / 2 / 3 | 58 / 58 / 58 | 20.6 / 29.9 / 44.6 |
| Borrow and build at once | 50 | 0.0% | 0.0% | 100.0% | 0.0% | 1 / 1 / 2 | none | 31.6 / 50.9 / 51.3 |
| Borrower wary of gluts | 50 | 0.0% | 0.0% | 98.0% | 2.0% | 1 / 2 / 3 | none | 13.3 / 26.1 / 36.5 |
| Trader blind to shocks | 50 | 0.0% | 0.0% | 96.0% | 4.0% | 1 / 2 / 4 | none | 13.4 / 28.4 / 35.9 |
| Hover then spend | 50 | 0.0% | 36.0% | 16.0% | 48.0% | 2 / 4 / 4 | none | 9.9 / 21.5 / 27.5 |
| Unlocker holding out | 50 | 0.0% | 0.0% | 98.0% | 2.0% | 1 / 2 / 4 | none | 10.4 / 25.3 / 27.7 |

| Player | Highest tier reached | Vote share at the last vote | Treasury at the end | Approval at the end |
| --- | --- | --- | --- | --- |
| Does nothing | Subsistence 100.0% | 51.2% / 58.1% / 64.2% | $7.3m / $13.8m / $68.6m | 38.4% / 55.6% / 58.8% |
| Popularity | Subsistence 100.0% | 47.8% / 59.8% / 66.0% | $0.0m / $1.4m / $18.0m | 43.6% / 54.9% / 66.8% |
| Sensible | Industrialising 100.0% | 12.1% / 40.1% / 51.8% | $0.0m / $0.3m / $0.7m | 9.9% / 38.8% / 50.3% |
| Chain builder | Subsistence 12.0%, Developing 88.0% | 15.1% / 32.7% / 64.2% | $0.0m / $0.4m / $0.9m | 18.1% / 33.1% / 50.1% |
| Sensible borrower | Subsistence 54.0%, Developing 38.0%, Industrialising 8.0% | 3.1% / 37.4% / 54.1% | $0.0m / $0.3m / $9.1m | 0.8% / 34.1% / 52.4% |
| Reckless borrower | Subsistence 2.0%, Developing 74.0%, Industrialising 8.0%, Prosperous 16.0% | 19.7% / 41.8% / 49.8% | $0.0m / $0.5m / $35.5m | 18.7% / 42.3% / 52.1% |
| Timing trader | Subsistence 18.0%, Developing 82.0% | 13.8% / 29.9% / 66.1% | $0.0m / $0.3m / $0.9m | 10.4% / 28.4% / 51.1% |
| Mine only | Subsistence 84.0%, Developing 16.0% | 12.3% / 36.0% / 63.9% | $0.0m / $0.3m / $1.1m | 10.0% / 33.1% / 52.4% |
| Improver | Subsistence 12.0%, Developing 88.0% | 14.4% / 34.2% / 64.3% | $0.0m / $0.3m / $0.9m | 16.3% / 33.5% / 51.9% |
| Unlocker | Subsistence 100.0% | 12.5% / 33.6% / 58.6% | $0.0m / $0.4m / $0.6m | 12.0% / 32.0% / 52.3% |
| Prospector | Subsistence 20.0%, Developing 80.0% | 14.3% / 34.4% / 64.2% | $0.0m / $0.4m / $0.9m | 17.3% / 33.1% / 50.5% |
| Relief only | Subsistence 100.0% | 39.2% / 62.2% / 67.2% | $0.0m / $0.2m / $1.6m | 36.2% / 47.4% / 59.8% |
| Lowest tax | Subsistence 100.0% | 44.9% / 57.3% / 61.8% | $0.0m / $0.3m / $0.3m | 33.9% / 45.4% / 55.5% |
| Says yes | Subsistence 100.0% | 38.2% / 60.3% / 66.2% | $0.0m / $0.2m / $0.4m | 34.6% / 45.9% / 57.5% |
| Squeeze then spend | Subsistence 100.0% | 30.4% / 49.3% / 57.4% | $39.7m / $73.8m / $135.7m | 9.2% / 47.6% / 52.2% |
| Power only | Subsistence 12.0%, Developing 28.0%, Industrialising 4.0%, Prosperous 56.0% | 15.1% / 43.4% / 62.3% | $0.0m / $1.9m / $11.7m | 18.1% / 43.1% / 52.5% |
| Chain by the quay | Subsistence 12.0%, Developing 46.0%, Industrialising 40.0%, Prosperous 2.0% | 12.1% / 34.7% / 57.7% | $0.0m / $0.5m / $1.5m | 13.3% / 33.6% / 49.8% |
| Borrow and build at once | Industrialising 42.0%, Prosperous 58.0% | 19.9% / 38.4% / 49.0% | $0.0m / $8.1m / $27.3m | 18.0% / 38.1% / 52.0% |
| Borrower wary of gluts | Subsistence 64.0%, Developing 30.0%, Industrialising 6.0% | 2.9% / 38.4% / 54.1% | $0.0m / $0.3m / $14.5m | 0.6% / 37.2% / 52.4% |
| Trader blind to shocks | Subsistence 18.0%, Developing 82.0% | 13.2% / 31.3% / 65.0% | $0.0m / $0.3m / $0.9m | 9.5% / 31.4% / 50.8% |
| Hover then spend | Subsistence 100.0% | 23.0% / 56.4% / 71.4% | $0.0m / $0.2m / $58.8m | 23.6% / 49.2% / 61.9% |
| Unlocker holding out | Subsistence 100.0% | 12.5% / 33.6% / 58.6% | $0.0m / $0.4m / $0.6m | 12.0% / 32.0% / 52.3% |

| Player | Borrowed | Bailed out | Bailouts in a game | Win held back by the debt test | Debt burden at the end | Highest debt burden |
| --- | --- | ---: | --- | --- | --- | --- |
| Does nothing | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 8% | 55% / 55% / 55% |
| Popularity | $0.0m / $0.0m / $0.0m | 22.0% | 1 / 1 / 1 | never | 0% / 0% / 29% | 188% / 188% / 188% |
| Sensible | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 55% / 55% / 55% |
| Chain builder | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 55% / 55% / 55% |
| Sensible borrower | $0.0m / $20.0m / $60.0m | 24.0% | 1 / 1 / 1 | never | 0% / 50% / 125% | 55% / 81% / 385% |
| Reckless borrower | $115.0m / $155.0m / $320.0m | 12.0% | 1 / 1 / 1 | never | 4% / 69% / 506% | 219% / 506% / 658% |
| Timing trader | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 55% / 55% / 55% |
| Mine only | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 55% / 55% / 55% |
| Improver | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 55% / 55% / 55% |
| Unlocker | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 55% / 55% / 55% |
| Prospector | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 55% / 55% / 55% |
| Relief only | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 55% / 55% / 55% |
| Lowest tax | $0.0m / $0.0m / $0.0m | 100.0% | 1 / 1 / 1 | never | 0% / 0% / 2% | 188% / 188% / 188% |
| Says yes | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 55% / 55% / 55% |
| Squeeze then spend | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 55% / 55% / 55% |
| Power only | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 55% / 55% / 55% |
| Chain by the quay | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 55% / 55% / 55% |
| Borrow and build at once | $120.0m / $160.0m / $305.0m | 4.0% | 1 / 1 / 1 | 6.0%, 0 of 3 won later, waiting 5 / 10 / 10 quarters | 38% / 88% / 568% | 82% / 121% / 893% |
| Borrower wary of gluts | $0.0m / $20.0m / $40.0m | 26.0% | 1 / 1 / 1 | never | 0% / 50% / 125% | 55% / 71% / 385% |
| Trader blind to shocks | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 55% / 55% / 55% |
| Hover then spend | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 55% / 55% / 55% |
| Unlocker holding out | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 55% / 55% / 55% |

| Player | Grain imported | Grain exported | Trade income | Trade spending | Failed harvests abroad met | Ore gluts met | Droughts met | Floods met |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Does nothing | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 62.0%, 0 / 1 / 5 | 64.0%, 0 / 1 / 5 | 90.0%, 0 / 1 / 2 | 50.0%, 0 / 1 / 3 |
| Popularity | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 64.0%, 0 / 1 / 5 | 64.0%, 0 / 1 / 5 | 90.0%, 0 / 1 / 2 | 52.0%, 0 / 1 / 3 |
| Sensible | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 88.0%, 0 / 1 / 5 | 88.0%, 0 / 2 / 4 | 90.0%, 0 / 3 / 6 | 80.0%, 0 / 2 / 3 |
| Chain builder | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 92.0%, 0 / 2 / 6 | 90.0%, 0 / 2 / 6 | 94.0%, 0 / 3 / 6 | 86.0%, 0 / 2 / 3 |
| Sensible borrower | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 86.0%, 0 / 1 / 5 | 88.0%, 0 / 2 / 6 | 92.0%, 0 / 2 / 6 | 76.0%, 0 / 2 / 3 |
| Reckless borrower | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 72.0%, 0 / 1 / 3 | 74.0%, 0 / 1 / 3 | 72.0%, 0 / 1 / 4 | 52.0%, 0 / 1 / 2 |
| Timing trader | 0kt / 14kt / 67kt | 5kt / 34kt / 75kt | $1.0m / $7.0m / $15.7m | $0.0m / $3.3m / $16.5m | 90.0%, 0 / 2 / 6 | 92.0%, 0 / 2 / 6 | 94.0%, 0 / 3 / 7 | 88.0%, 0 / 2 / 3 |
| Mine only | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 88.0%, 0 / 2 / 5 | 92.0%, 0 / 2 / 6 | 94.0%, 0 / 2 / 6 | 78.0%, 0 / 2 / 3 |
| Improver | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 92.0%, 0 / 2 / 6 | 86.0%, 0 / 2 / 6 | 94.0%, 0 / 2 / 6 | 88.0%, 0 / 2 / 3 |
| Unlocker | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 88.0%, 0 / 1 / 6 | 90.0%, 0 / 2 / 6 | 94.0%, 0 / 2 / 6 | 84.0%, 0 / 2 / 3 |
| Prospector | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 92.0%, 0 / 2 / 6 | 90.0%, 0 / 2 / 6 | 94.0%, 0 / 2 / 6 | 86.0%, 0 / 2 / 3 |
| Relief only | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 98.0%, 0 / 2 / 5 | 98.0%, 0 / 3 / 6 | 94.0%, 0 / 4 / 7 | 90.0%, 0 / 2 / 5 |
| Lowest tax | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 96.0%, 0 / 2 / 5 | 94.0%, 0 / 2 / 6 | 92.0%, 0 / 3 / 6 | 90.0%, 0 / 2 / 5 |
| Says yes | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 98.0%, 0 / 2 / 6 | 98.0%, 0 / 3 / 6 | 98.0%, 0 / 4 / 7 | 90.0%, 0 / 2 / 5 |
| Squeeze then spend | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 90.0%, 0 / 2 / 5 | 88.0%, 0 / 2 / 5 | 86.0%, 0 / 3 / 7 | 72.0%, 0 / 2 / 4 |
| Power only | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 74.0%, 0 / 1 / 4 | 78.0%, 0 / 1 / 6 | 78.0%, 0 / 1 / 5 | 60.0%, 0 / 1 / 3 |
| Chain by the quay | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 88.0%, 0 / 1 / 5 | 90.0%, 0 / 2 / 6 | 90.0%, 0 / 2 / 5 | 76.0%, 0 / 1 / 3 |
| Borrow and build at once | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 64.0%, 0 / 1 / 3 | 68.0%, 0 / 1 / 2 | 70.0%, 0 / 1 / 4 | 46.0%, 0 / 0 / 2 |
| Borrower wary of gluts | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 86.0%, 0 / 2 / 5 | 88.0%, 0 / 2 / 6 | 92.0%, 0 / 2 / 6 | 76.0%, 0 / 2 / 3 |
| Trader blind to shocks | 0kt / 6kt / 47kt | 5kt / 27kt / 68kt | $1.0m / $5.9m / $17.2m | $0.0m / $1.3m / $10.0m | 90.0%, 0 / 2 / 5 | 88.0%, 0 / 2 / 5 | 92.0%, 0 / 2 / 6 | 82.0%, 0 / 2 / 3 |
| Hover then spend | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 98.0%, 0 / 3 / 6 | 98.0%, 0 / 3 / 6 | 100.0%, 1 / 5 / 7 | 90.0%, 0 / 3 / 6 |
| Unlocker holding out | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 88.0%, 0 / 1 / 6 | 90.0%, 0 / 2 / 6 | 94.0%, 0 / 2 / 6 | 84.0%, 0 / 2 / 3 |

| Player | Technologies known | Quarter of the first technology | Regions surveyed | Deposits found | Found deposits mined |
| --- | --- | --- | --- | --- | --- |
| Does nothing | 0.0%, 0 / 0 / 0 | none | 0 / 0 / 0 | 0.0%, 0 / 0 / 0 | none found |
| Popularity | 0.0%, 0 / 0 / 0 | none | 0 / 0 / 0 | 0.0%, 0 / 0 / 0 | none found |
| Sensible | 0.0%, 0 / 0 / 0 | none | 0 / 0 / 0 | 0.0%, 0 / 0 / 0 | none found |
| Chain builder | 0.0%, 0 / 0 / 0 | none | 0 / 0 / 0 | 0.0%, 0 / 0 / 0 | none found |
| Sensible borrower | 0.0%, 0 / 0 / 0 | none | 0 / 0 / 0 | 0.0%, 0 / 0 / 0 | none found |
| Reckless borrower | 0.0%, 0 / 0 / 0 | none | 0 / 0 / 0 | 0.0%, 0 / 0 / 0 | none found |
| Timing trader | 0.0%, 0 / 0 / 0 | none | 0 / 0 / 0 | 0.0%, 0 / 0 / 0 | none found |
| Mine only | 0.0%, 0 / 0 / 0 | none | 0 / 0 / 0 | 0.0%, 0 / 0 / 0 | none found |
| Improver | 68.0%, 0 / 3 / 3 | 15 / 16 / 28 | 0 / 0 / 0 | 0.0%, 0 / 0 / 0 | none found |
| Unlocker | 100.0%, 2 / 6 / 7 | 4 / 4 / 4 | 0 / 0 / 0 | 0.0%, 0 / 0 / 0 | none found |
| Prospector | 0.0%, 0 / 0 / 0 | none | 1 / 1 / 1 | 54.0%, 0 / 1 / 1 | 0.0%, 0 of 27 |
| Relief only | 0.0%, 0 / 0 / 0 | none | 0 / 0 / 0 | 0.0%, 0 / 0 / 0 | none found |
| Lowest tax | 0.0%, 0 / 0 / 0 | none | 0 / 0 / 0 | 0.0%, 0 / 0 / 0 | none found |
| Says yes | 0.0%, 0 / 0 / 0 | none | 0 / 0 / 0 | 0.0%, 0 / 0 / 0 | none found |
| Squeeze then spend | 0.0%, 0 / 0 / 0 | none | 0 / 0 / 0 | 0.0%, 0 / 0 / 0 | none found |
| Power only | 0.0%, 0 / 0 / 0 | none | 0 / 0 / 0 | 0.0%, 0 / 0 / 0 | none found |
| Chain by the quay | 0.0%, 0 / 0 / 0 | none | 0 / 0 / 0 | 0.0%, 0 / 0 / 0 | none found |
| Borrow and build at once | 0.0%, 0 / 0 / 0 | none | 0 / 0 / 0 | 0.0%, 0 / 0 / 0 | none found |
| Borrower wary of gluts | 0.0%, 0 / 0 / 0 | none | 0 / 0 / 0 | 0.0%, 0 / 0 / 0 | none found |
| Trader blind to shocks | 0.0%, 0 / 0 / 0 | none | 0 / 0 / 0 | 0.0%, 0 / 0 / 0 | none found |
| Hover then spend | 0.0%, 0 / 0 / 0 | none | 0 / 0 / 0 | 0.0%, 0 / 0 / 0 | none found |
| Unlocker holding out | 100.0%, 2 / 6 / 7 | 4 / 4 / 4 | 0 / 0 / 0 | 0.0%, 0 / 0 / 0 | none found |

Spreads are least / middle / most. Won is the win on prosperity: Prosperous held for four quarters running, with the debt burden within the debt test as the hold completes. Still in office counts the games that had neither won nor lost when their terms were up. Vote share counts only the games that reached a vote. Bailed out counts the games in which a missed payment brought a bailout, and bailouts in a game counts them in those games. The win held back by the debt test counts the games in which prosperity was held long enough to win but the debt burden was over the limit, with how many of them were won once it passed and the quarters the win waited. The debt burden is what is owed against a year’s revenue. Grain is in thousands of tonnes (kt) over the game. A shock met is a world price shock that moved its price, or a drought or flood that began in a region, while the game was played: the share of games that met one, then how many each game met. Technologies known is the share of games that came to know at least one, then how many each game knew as it ended; the quarter of the first technology is the quarter of the game in which its research finished, in those games. Regions surveyed counts the surveys finished. Deposits found is the share of games whose surveys found at least one, then how many each game found. A found deposit is mined when its mine is in use as the game ends: the share of all the deposits the games found, and how many of them.

- Does nothing: lost the vote in no game; famine brought the state down in Sandreach 42, Northfield 8 (in quarter 8 / 16 / 72).
- Popularity: lost the vote 1 in term 1; famine brought the state down in Sandreach 40, Northfield 9 (in quarter 8 / 16 / 72).
- Sensible: lost the vote 12 in term 1, 22 in term 2, 15 in term 3; famine brought the state down in Sandreach 1 (in quarter 60 / 60 / 60).
- Chain builder: lost the vote 10 in term 1, 19 in term 2, 18 in term 3, 1 in term 4; famine brought the state down in Sandreach 2 (in quarter 44 / 56 / 68).
- Sensible borrower: lost the vote 9 in term 1, 30 in term 2, 10 in term 3; famine brought the state down in Sandreach 1 (in quarter 44 / 44 / 44).
- Reckless borrower: lost the vote 39 in term 1, 11 in term 2; famine brought the state down in no game.
- Timing trader: lost the vote 14 in term 1, 15 in term 2, 14 in term 3, 5 in term 4; famine brought the state down in Northfield 1, Sandreach 1 (in quarter 44 / 52 / 60).
- Mine only: lost the vote 7 in term 1, 26 in term 2, 14 in term 3; famine brought the state down in Sandreach 3 (in quarter 44 / 48 / 68).
- Improver: lost the vote 13 in term 1, 15 in term 2, 18 in term 3, 2 in term 4; famine brought the state down in Sandreach 2 (in quarter 44 / 56 / 68).
- Unlocker: lost the vote 12 in term 1, 21 in term 2, 15 in term 3, 1 in term 4; famine brought the state down in Sandreach 1 (in quarter 68 / 68 / 68).
- Prospector: lost the vote 11 in term 1, 18 in term 2, 18 in term 3, 1 in term 4; famine brought the state down in Sandreach 2 (in quarter 44 / 56 / 68).
- Relief only: lost the vote 2 in term 4; famine brought the state down in Northfield 28, Sandreach 17 (in quarter 26 / 56 / 80).
- Lowest tax: lost the vote 1 in term 1, 2 in term 2, 2 in term 3; famine brought the state down in Northfield 23, Sandreach 22 (in quarter 20 / 52 / 80).
- Says yes: lost the vote 5 in term 4; famine brought the state down in Northfield 24, Sandreach 17 (in quarter 26 / 60 / 80).
- Squeeze then spend: lost the vote 9 in term 1, 17 in term 2, 6 in term 3, 1 in term 4; famine brought the state down in Northfield 11, Sandreach 6 (in quarter 28 / 50 / 76).
- Power only: lost the vote 10 in term 1, 12 in term 2, 1 in term 3; famine brought the state down in no game.
- Chain by the quay: lost the vote 10 in term 1, 28 in term 2, 10 in term 3; famine brought the state down in Sandreach 1 (in quarter 44 / 44 / 44).
- Borrow and build at once: lost the vote 47 in term 1, 3 in term 2; famine brought the state down in no game.
- Borrower wary of gluts: lost the vote 8 in term 1, 31 in term 2, 10 in term 3; famine brought the state down in Sandreach 1 (in quarter 44 / 44 / 44).
- Trader blind to shocks: lost the vote 18 in term 1, 13 in term 2, 14 in term 3, 3 in term 4; famine brought the state down in Northfield 1, Sandreach 1 (in quarter 44 / 52 / 60).
- Hover then spend: lost the vote 1 in term 3, 7 in term 4; famine brought the state down in Northfield 13, Sandreach 11 (in quarter 28 / 68 / 80).
- Unlocker holding out: lost the vote 12 in term 1, 21 in term 2, 15 in term 3, 1 in term 4; famine brought the state down in Sandreach 1 (in quarter 68 / 68 / 68).

- Does nothing: came to know no technology.
- Popularity: came to know no technology.
- Sensible: came to know no technology.
- Chain builder: came to know no technology.
- Sensible borrower: came to know no technology.
- Reckless borrower: came to know no technology.
- Timing trader: came to know no technology.
- Mine only: came to know no technology.
- Improver: came to know Drought-resistant seed in 68.0% of its games (quarter 15 / 16 / 28), Cold storage in 54.0% (quarter 26 / 26 / 31), Grid efficiency in 50.0% (quarter 31 / 31 / 36).
- Unlocker: came to know Drought-resistant seed in 90.0% of its games (quarter 12 / 12 / 27), Improved irrigation in 68.0% (quarter 16 / 16 / 32), Cold storage in 58.0% (quarter 26 / 26 / 35), Grid efficiency in 50.0% (quarter 31 / 31 / 36), Hydropower in 36.0% (quarter 37 / 37 / 39), Public health in 100.0% (quarter 4 / 4 / 4), Teacher training in 100.0% (quarter 8 / 8 / 8).
- Prospector: came to know no technology.
- Relief only: came to know no technology.
- Lowest tax: came to know no technology.
- Says yes: came to know no technology.
- Squeeze then spend: came to know no technology.
- Power only: came to know no technology.
- Chain by the quay: came to know no technology.
- Borrow and build at once: came to know no technology.
- Borrower wary of gluts: came to know no technology.
- Trader blind to shocks: came to know no technology.
- Hover then spend: came to know no technology.
- Unlocker holding out: came to know Drought-resistant seed in 90.0% of its games (quarter 12 / 12 / 27), Improved irrigation in 68.0% (quarter 16 / 16 / 32), Cold storage in 58.0% (quarter 26 / 26 / 35), Grid efficiency in 50.0% (quarter 31 / 31 / 36), Hydropower in 36.0% (quarter 37 / 37 / 39), Public health in 100.0% (quarter 4 / 4 / 4), Teacher training in 100.0% (quarter 8 / 8 / 8).

## What was changed

Two values in `src/sim/balance.ts`, in #105:

| Value | Was | Is | Why |
| --- | ---: | ---: | --- |
| `technologies.gridEfficiency.cost` | 150 ($15.0m) | 75 ($7.5m) | The improver spent $56.0m on research before it won, a third of what the mine's chain and its power cost, and won 14 quarters later than the chain builder: the money held its chain back longer than the improvements repaid. These were the two dearest technologies |
| `technologies.roadEngineering.cost` | 150 ($15.0m) | 75 ($7.5m) | The same. In Tavara it also buys a builder that never trades nothing, since the Korrgate mine, not its road or port, limits its chain |

The third tier of the tree now costs less than the tiers below it (drought-resistant seed and
cold storage $8.0m, improved irrigation $10.0m). Nothing else was changed: no country file, and
none of the figures #102 gave the clinic, the school, public health and teacher training.

The balance tool changed in #104: the three new players and the probe, the research and surveys
table, and the line of technologies known.

## What the runs showed

**Research now pays a builder.** The improver wins 64.8% of the confirmation games against the
chain builder's 52.5%. It wins later, in quarter 51 in the middle against 38, but it is harder
to vote out: it loses 24 first votes and 83 second votes, against the chain builder's 29 and 150.
It knows drought-resistant seed by quarter 7, cold storage by quarter 10 and grid efficiency by
quarter 15 in every game, and improved irrigation and road engineering by about quarter 30 in
nine games in ten. On the values as #102 left them it won 49% of the tuning seeds against the
chain builder's 55%: research then cost more than it returned.

**Clinics and schools built first cost a builder dearly.** The unlocker researches public health
and teacher training by quarter 8, builds Tavara's two clinics and two schools before anything
else, and wins 6.3%: it reaches Prosperous in 6.8% of games against the chain builder's 64.0%,
and loses 229 second votes. The owner dropped the target on it: some approaches may be worse
than others. Holding out for the dam is worse still, 1.0%. What a clinic or a school is worth
to a player that builds it after the mine's chain, no scripted player yet shows.

**Surveying does not pay as the prospector plays, and no value makes it.** The prospector
finds a deposit in three games in four and mines 72.4% of those it finds, yet wins 28.3%. Six
games' timelines, set beside the chain builder's on the same seeds, show why:

- The chain builder wins once its mine's chain is open, at about quarter 30: it builds the seven
  farming sites within a few quarters, prosperity goes from about 30 to 43, and it has won by
  quarter 33 to 38, before the second vote.
- The prospector builds each found deposit's road and mine first, $70.0m a deposit. Its
  prosperity stays near 30 for another 15 to 20 quarters, across the quarter-40 vote, whose
  campaign spends what it had saved: it loses 110 third votes to the chain builder's 11.
- The game is won on infrastructure access, 40% of a living standard. The seven farming sites
  cost $66.0m together and, reckoned from the weights and each region's share of the people,
  raise national prosperity by about 13 points; a found deposit costs $70.0m and raises it by
  about 3.

A found mine is an ordinary mine of the size the survey found, so no value in
`src/sim/balance.ts` makes it worth more without doing the same for the Korrgate mine. Halving
what a survey costs did nothing (attempt 2), and neither did a larger port (attempt 3): a found
mine is not held to what the port has left. So the two targets on surveying pull against each
other as the players and the win stand. Built after the farming sites, a found deposit costs the
prospector almost nothing (on six seeds tried in #104 its games then matched the chain
builder's), but the game is won before any found mine opens, so found deposits would go unmined.
Built before them, as now, they are mined and the prospector loses 24 points. The choice was
the owner's, and was put on #105:

1. Accept the target as unmet: surveying is a gamble that does not raise a builder's chance of
   winning.
2. Change the prospector to build what it finds after the farming sites. It would then win as
   often as the chain builder, and leave what it found unmined in the games it wins.
3. Change what a found deposit is worth, so that it can repay itself before the farming sites
   do. That is a change to the logic or to the country file, and a ticket of its own.

The owner chose the first on 2026-11-23: the target is accepted as unmet.

**Nothing earlier moved.** The players that neither research nor survey decide as they did, and
the four fixed games of `tests/sim/replay.test.ts` play exactly as before. On seeds that played
no part in Phase 4's record the chain builder wins 52.5% (53.5% then), the timing trader 89.0%
(90.3%), and the players who do nothing or spend on popularity none.

**Testland.** Every one of its 1,100 confirmation games ran to an ending. Its improver knows a
technology in 68% of games and its unlocker in all of them. Its prospector finds a deposit in
54% of games and mines none of the 27 it finds. Almost no player wins there but the one that
builds power alone.

### Attempt log

The tuning runs of #105, in the order they were made, on Tavara over four terms, with the
players the targets name and those who do nothing and spend on popularity. The first was the
short run of #104 and was not run again.

| Attempt | Seeds | Values changed | Why | Judged by | Kept |
| --- | --- | --- | --- | --- | --- |
| Baseline | 1-100 | none | | Improver 49%, chain builder 55%, prospector 30% | |
| 1 | 1-100 | `technologies.gridEfficiency.cost` and `technologies.roadEngineering.cost`, each 150 to 75 | What the improver spends on research holds its chain back; these two are the dearest | Improver 61%, 6 points more than the chain builder | Yes |
| 2 | 1-100 | `technologies.improvedIrrigation.cost` 100 to 60; `surveys.cost` 40 to 20 | More margin for the improver, and whether the survey's price is what costs the prospector. The two bear on different players | Improver 59%, prospector 28%: neither moved beyond noise | No |
| 3 | 1-100 | `sites.port.capacity` 900 to 1500 | A guess that found mines were held to what the port has left once the Korrgate mine has shipped | Prospector 30%, every figure as attempt 1 | No |
| 4, the last | 1-300 | attempt 1's values | The larger run of the candidate | Improver 62.3%, chain builder 53.3%, prospector 31.7%; surveys find nothing in 25.0% of games; 68.6% of deposits found are mined | Yes |

Four of the six attempts were used. The fifth and sixth were left: after two attempts that did
not move the prospector, six games' timelines showed that no value would.

## How the runs were made

Each run went through the machine-wide lock, in the background, one at a time, as
[docs/agents/balance-tickets.md](../agents/balance-tickets.md) asks. In PowerShell, without the
lock, they are:

```powershell
$env:BALANCE_PLAYERS = 'Does nothing,Popularity,Chain builder,Improver,Unlocker,Prospector'; $env:BALANCE_COUNTRY = 'tavara'; $env:BALANCE_SEEDS = '1-100'; npm run balance
```

```powershell
$env:BALANCE_PLAYERS = 'Does nothing,Popularity,Chain builder,Improver,Prospector'; $env:BALANCE_COUNTRY = 'tavara'; $env:BALANCE_SEEDS = '1-300'; npm run balance
```

```powershell
$env:BALANCE_PLAYERS = 'all'; $env:BALANCE_COUNTRY = 'tavara'; $env:BALANCE_SEEDS = '1001-1400'; npm run balance
```

```powershell
$env:BALANCE_PLAYERS = 'all'; $env:BALANCE_COUNTRY = 'testland'; $env:BALANCE_SEEDS = '1001-1050'; npm run balance
```

The first is the short run of #104 and the baseline of the tuning; attempts 1 to 3 played the
second's players on seeds 1 to 100, each with its values, and the third added the timing trader.
The second is the last tuning attempt. The third and fourth are the confirmation, on seeds that
played no part in the tuning, with all twenty-two players. On a 20-processor machine with half
its processors the short run took about two minutes, the last tuning attempt about five, Tavara's
confirmation about 27 and Testland's about two.

## Playing it

[The play-through](../playing.md#a-play-through) gives one command that opens the game on seed 1.
There the chain builder loses its first vote with 49.9%; the improver, building the same sites
and researching, wins it with 51.3% and its second with 51.1%, and loses its third; and the
timing trader, building the same sites and trading grain, wins in quarter 30, with the trades it
made. Replayed for this record on the values as they now stand, each of those outcomes is as the
play-through stated it.
