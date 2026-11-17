# Phase 2 balance

Recorded 2026-11-17, for issue #39. The figures below come from the scripted players in
`tests/balance/players.ts`, played through whole games of up to four terms on the countries as
they ship. The Phase 1 record, which this follows, is [phase-1.md](phase-1.md).

## Targets

These are the targets proposed in issue #39. **They are proposals: the owner has not yet
confirmed them.** They apply to the real country, Tavara, over games of up to four terms.

| Target | Result on the confirmation run | Met |
| --- | --- | --- |
| The player who does nothing almost never wins | Wins 0.0% (96.3% lost to famine, 3.8% at the vote) | Yes |
| The player who spends everything on popularity almost never wins | Wins 0.0% (96.8% lost to famine, 3.3% at the vote) | Yes |
| The chain builder clearly beats the player that does not build | The chain builder wins 44.3%; the sensible player, who builds no large site, wins 0.0% | Yes |
| The sensible chain builder wins between 30% and 60% | Wins 44.3%, in quarter 36 at the earliest and 50 in the middle | Yes |
| No player wins every game | The best of the four wins 44.3%; the best of the others, the chain through the quay, 42.1% | Yes |

Testland, the crude second country, has no targets. Every one of its games ran to an ending
without error.

## How a game is played and scored

A game is played until it is won, lost, or four terms (80 quarters, twenty years) are up. Four
terms is the balance tool's limit, not the game's: the game itself has no limit on terms. Every
winning game in the runs below was won by quarter 69, so a longer limit would change
little, and a game still being played after twenty years has neither won nor lost: it is
reported as **still in office**. For each player the run reports how often it won, was still in
office, lost the vote or lost to famine; how many terms it served; the quarter in which it won;
the prosperity it ended on and the highest tier it reached; and, beneath, in which term each
lost vote fell and which region's famine brought each collapse.

## The players

| Player | How it plays |
| --- | --- |
| Does nothing | Keeps the starting budget, sends no relief, builds nothing. |
| Popularity | The lowest tax and everything on health, education and security. Nothing for the farms, relief or building. |
| Sensible | Balances the budget and relieves hunger. It funds the farms more while the reserve is below its safe level, puts $3.0m a quarter by for the next small site (irrigation, grain stores, farm roads) and starts it once the treasury holds its cost, and once every one is built spends what a 20% tax leaves over on health and education. It spends its savings on approval in the six quarters before each vote. It builds no large site. |
| Chain builder | Plays as the sensible player does, but builds the large sites first: the power station and its three lines, then the port, the trunk road and the mine, then the small sites. It saves for each in turn, since the treasury must hold a site's whole cost before building can begin. |

The one-lever players of Phase 1 are kept (`BALANCE_PLAYERS=all`), with two partial builders
that show what each large project is worth on its own:

| Player | How it plays |
| --- | --- |
| Power only | Plays as the chain builder does, but builds only power and then the small sites. |
| Chain by the quay | Plays as the chain builder does, but ships through the shallow port instead of the deep-water one. |

The sensible player changed for Phase 2. In Phase 1 it built a small site only when it could
spare the money and the site would be in use well before the vote. Over several terms that left
it with two or three of the seven small sites and no reason to save, so it now saves for them in
turn, as the chain builder saves for large ones; two habits that only show after a first term
were also fixed: what a campaign adds to health, education and security is taken back once the
vote is over, and farm spending rises step by step while the reserve stays low, as the people to
be fed grow in number. The comparison the targets ask for, between building chains and not,
is between two players that differ only in what they build.

## The confirmation run

### Confirmation: Republic of Tavara, seeds 1001-2200, up to 4 terms

| Player | Games | Won | Still in office | Lost the vote | Lost to famine | Terms served | Quarter of the win | Prosperity at the end |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- | --- |
| Does nothing | 1200 | 0.0% | 0.0% | 3.8% | 96.3% | 1 / 1 / 2 | none | 12.8 / 19.1 / 20.4 |
| Popularity | 1200 | 0.0% | 0.0% | 3.3% | 96.8% | 1 / 1 / 1 | none | 10.6 / 14.5 / 18.0 |
| Sensible | 1200 | 0.0% | 0.0% | 100.0% | 0.0% | 1 / 1 / 4 | none | 28.7 / 34.2 / 34.5 |
| Chain builder | 1200 | 44.3% | 0.0% | 55.8% | 0.0% | 1 / 2 / 4 | 36 / 50 / 69 | 21.6 / 41.9 / 43.7 |
| Relief only | 1200 | 0.0% | 0.0% | 99.8% | 0.2% | 1 / 2 / 4 | none | 12.5 / 20.1 / 20.6 |
| Lowest tax | 1200 | 0.0% | 0.0% | 41.3% | 58.8% | 1 / 1 / 3 | none | 10.5 / 14.4 / 18.9 |
| Says yes | 1200 | 0.0% | 0.0% | 99.9% | 0.1% | 1 / 2 / 4 | none | 12.6 / 20.3 / 20.6 |
| Squeeze then spend | 1200 | 0.0% | 9.8% | 89.8% | 0.4% | 1 / 3 / 4 | none | 13.0 / 19.4 / 20.4 |
| Power only | 1200 | 0.0% | 0.1% | 99.9% | 0.0% | 1 / 1 / 4 | none | 32.9 / 37.9 / 38.7 |
| Chain by the quay | 1200 | 42.1% | 0.0% | 57.9% | 0.0% | 1 / 2 / 3 | 32 / 36 / 56 | 23.4 / 41.9 / 42.8 |
| Hover then spend | 1200 | 0.0% | 30.3% | 69.5% | 0.2% | 2 / 4 / 4 | none | 14.3 / 19.9 / 21.1 |

| Player | Highest tier reached | Vote share at the last vote | Treasury at the end | Approval at the end |
| --- | --- | --- | --- | --- |
| Does nothing | Subsistence 100.0% | 43.6% / 47.6% / 51.9% | $0.0m / $0.3m / $2.0m | 36.6% / 47.1% / 49.9% |
| Popularity | Subsistence 100.0% | 39.5% / 44.7% / 49.9% | $0.0m / $2.8m / $2.9m | 40.3% / 50.2% / 54.7% |
| Sensible | Developing 100.0% | 23.4% / 47.3% / 49.9% | $0.0m / $0.4m / $0.9m | 25.0% / 47.8% / 52.5% |
| Chain builder | Subsistence 8.0%, Developing 27.6%, Industrialising 19.4%, Prosperous 45.0% | 33.1% / 49.6% / 57.4% | $0.0m / $0.9m / $70.3m | 25.4% / 45.6% / 52.9% |
| Relief only | Subsistence 100.0% | 30.9% / 48.0% / 52.2% | $0.0m / $0.3m / $67.0m | 31.4% / 48.6% / 52.8% |
| Lowest tax | Subsistence 100.0% | 36.3% / 48.0% / 56.9% | $0.0m / $0.2m / $0.4m | 37.4% / 47.6% / 53.2% |
| Says yes | Subsistence 100.0% | 29.6% / 47.9% / 53.7% | $0.0m / $27.3m / $139.3m | 31.6% / 48.7% / 52.8% |
| Squeeze then spend | Subsistence 100.0% | 40.2% / 48.8% / 56.2% | $132.1m / $336.6m / $733.4m | 16.4% / 50.3% / 53.3% |
| Power only | Developing 67.5%, Industrialising 32.5% | 31.2% / 47.1% / 50.8% | $0.0m / $0.4m / $1.0m | 31.3% / 47.7% / 52.1% |
| Chain by the quay | Subsistence 13.3%, Developing 6.3%, Industrialising 35.4%, Prosperous 45.0% | 33.2% / 49.3% / 57.6% | $0.0m / $0.8m / $71.4m | 31.6% / 43.7% / 52.9% |
| Hover then spend | Subsistence 100.0% | 25.1% / 48.6% / 57.3% | $0.0m / $0.4m / $72.4m | 25.6% / 48.9% / 56.2% |

Spreads are least / middle / most. Won is the win on prosperity: Prosperous held for four quarters running. Still in office counts the games that had neither won nor lost when their terms were up. Vote share counts only the games that reached a vote.

- Does nothing: lost the vote 45 in term 1; famine brought the state down in The Dry East 604, Korr Highlands 336, Salt Coast 108, Arden Vale 107 (in quarter 8 / 8 / 36).
- Popularity: lost the vote 39 in term 1; famine brought the state down in The Dry East 600, Korr Highlands 269, Arden Vale 190, Salt Coast 102 (in quarter 8 / 8 / 20).
- Sensible: lost the vote 758 in term 1, 345 in term 2, 85 in term 3, 12 in term 4; famine brought the state down in no game.
- Chain builder: lost the vote 75 in term 1, 573 in term 2, 21 in term 3; famine brought the state down in no game.
- Relief only: lost the vote 286 in term 1, 510 in term 2, 349 in term 3, 53 in term 4; famine brought the state down in The Dry East 1, Korr Highlands 1 (in quarter 58 / 67 / 76).
- Lowest tax: lost the vote 475 in term 1, 20 in term 2; famine brought the state down in The Dry East 277, Arden Vale 255, Korr Highlands 104, Salt Coast 69 (in quarter 8 / 18 / 44).
- Says yes: lost the vote 409 in term 1, 397 in term 2, 285 in term 3, 108 in term 4; famine brought the state down in Korr Highlands 1 (in quarter 72 / 72 / 72).
- Squeeze then spend: lost the vote 270 in term 1, 223 in term 2, 235 in term 3, 349 in term 4; famine brought the state down in Korr Highlands 3, The Dry East 1, Salt Coast 1 (in quarter 58 / 72 / 80).
- Power only: lost the vote 797 in term 1, 333 in term 2, 60 in term 3, 9 in term 4; famine brought the state down in no game.
- Chain by the quay: lost the vote 176 in term 1, 508 in term 2, 11 in term 3; famine brought the state down in no game.
- Hover then spend: lost the vote 16 in term 2, 167 in term 3, 651 in term 4; famine brought the state down in Korr Highlands 2 (in quarter 66 / 71 / 76).

### Confirmation: Testland, seeds 1001-2200, up to 4 terms

| Player | Games | Won | Still in office | Lost the vote | Lost to famine | Terms served | Quarter of the win | Prosperity at the end |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- | --- |
| Does nothing | 1200 | 0.0% | 0.2% | 0.3% | 99.5% | 1 / 1 / 4 | none | 13.1 / 22.9 / 24.4 |
| Popularity | 1200 | 0.0% | 0.1% | 0.4% | 99.5% | 1 / 1 / 4 | none | 9.0 / 21.3 / 22.5 |
| Sensible | 1200 | 0.0% | 0.0% | 100.0% | 0.0% | 1 / 3 / 4 | none | 27.6 / 38.4 / 41.2 |
| Chain builder | 1200 | 0.0% | 0.1% | 99.8% | 0.1% | 1 / 3 / 4 | none | 22.5 / 31.2 / 35.9 |
| Relief only | 1200 | 0.0% | 29.3% | 9.0% | 61.7% | 3 / 4 / 4 | none | 12.0 / 21.1 / 24.5 |
| Lowest tax | 1200 | 0.0% | 3.3% | 20.3% | 76.3% | 2 / 4 / 4 | none | 6.8 / 15.9 / 19.9 |
| Says yes | 1200 | 0.0% | 49.0% | 12.3% | 38.7% | 3 / 4 / 4 | none | 12.0 / 20.9 / 24.5 |
| Squeeze then spend | 1200 | 0.0% | 0.6% | 86.3% | 13.2% | 1 / 2 / 4 | none | 8.7 / 24.5 / 25.4 |
| Power only | 1200 | 95.2% | 0.0% | 4.8% | 0.0% | 1 / 1 / 3 | 19 / 19 / 47 | 22.5 / 42.0 / 50.6 |
| Chain by the quay | 1200 | 2.9% | 0.0% | 97.1% | 0.0% | 1 / 3 / 4 | 58 / 58 / 59 | 22.5 / 36.8 / 44.6 |
| Hover then spend | 1200 | 0.0% | 82.9% | 1.8% | 15.3% | 3 / 4 / 4 | none | 12.8 / 25.6 / 27.4 |

| Player | Highest tier reached | Vote share at the last vote | Treasury at the end | Approval at the end |
| --- | --- | --- | --- | --- |
| Does nothing | Subsistence 100.0% | 40.8% / 60.7% / 65.6% | $18.0m / $26.0m / $90.0m | 42.1% / 57.3% / 59.5% |
| Popularity | Subsistence 100.0% | 39.0% / 64.8% / 70.7% | $0.0m / $1.6m / $2.9m | 40.3% / 62.8% / 66.9% |
| Sensible | Industrialising 100.0% | 11.5% / 37.8% / 49.9% | $0.0m / $0.3m / $0.8m | 13.6% / 37.9% / 52.8% |
| Chain builder | Subsistence 0.6%, Developing 99.4% | 13.6% / 35.9% / 53.5% | $0.0m / $0.3m / $0.9m | 13.7% / 35.9% / 52.8% |
| Relief only | Subsistence 100.0% | 38.3% / 59.9% / 67.7% | $0.0m / $4.7m / $20.3m | 35.8% / 55.8% / 61.6% |
| Lowest tax | Subsistence 100.0% | 24.8% / 56.1% / 66.2% | $0.0m / $0.3m / $0.4m | 25.5% / 49.2% / 56.4% |
| Says yes | Subsistence 100.0% | 29.1% / 58.5% / 67.7% | $0.0m / $0.3m / $13.8m | 31.4% / 54.6% / 62.5% |
| Squeeze then spend | Subsistence 100.0% | 30.4% / 48.7% / 55.2% | $48.1m / $83.1m / $164.7m | 3.1% / 49.4% / 52.8% |
| Power only | Subsistence 0.6%, Developing 2.8%, Industrialising 0.5%, Prosperous 96.1% | 22.4% / 56.4% / 64.4% | $0.0m / $2.8m / $12.7m | 21.3% / 48.9% / 52.9% |
| Chain by the quay | Subsistence 0.6%, Developing 15.3%, Industrialising 78.5%, Prosperous 5.6% | 12.3% / 36.6% / 60.5% | $0.0m / $0.3m / $7.6m | 13.5% / 36.0% / 52.6% |
| Hover then spend | Subsistence 100.0% | 40.9% / 62.0% / 70.6% | $0.0m / $0.2m / $58.6m | 40.3% / 60.7% / 67.1% |

Spreads are least / middle / most. Won is the win on prosperity: Prosperous held for four quarters running. Still in office counts the games that had neither won nor lost when their terms were up. Vote share counts only the games that reached a vote.

- Does nothing: lost the vote 1 in term 3, 3 in term 4; famine brought the state down in Sandreach 1194 (in quarter 8 / 16 / 74).
- Popularity: lost the vote 5 in term 4; famine brought the state down in Sandreach 1194 (in quarter 8 / 16 / 74).
- Sensible: lost the vote 24 in term 1, 526 in term 2, 649 in term 3, 1 in term 4; famine brought the state down in no game.
- Chain builder: lost the vote 35 in term 1, 174 in term 2, 692 in term 3, 297 in term 4; famine brought the state down in Sandreach 1 (in quarter 80 / 80 / 80).
- Relief only: lost the vote 1 in term 3, 107 in term 4; famine brought the state down in Sandreach 740 (in quarter 41 / 71 / 80).
- Lowest tax: lost the vote 1 in term 2, 44 in term 3, 199 in term 4; famine brought the state down in Sandreach 916 (in quarter 35 / 64 / 80).
- Says yes: lost the vote 3 in term 3, 145 in term 4; famine brought the state down in Sandreach 464 (in quarter 49 / 73 / 80).
- Squeeze then spend: lost the vote 247 in term 1, 454 in term 2, 263 in term 3, 71 in term 4; famine brought the state down in Sandreach 158 (in quarter 44 / 68 / 80).
- Power only: lost the vote 35 in term 1, 16 in term 2, 7 in term 3; famine brought the state down in no game.
- Chain by the quay: lost the vote 35 in term 1, 493 in term 2, 623 in term 3, 14 in term 4; famine brought the state down in no game.
- Hover then spend: lost the vote 21 in term 4; famine brought the state down in Sandreach 184 (in quarter 59 / 76 / 80).

### Confirmation, one term: Republic of Tavara, seeds 1001-2200, up to 1 term

| Player | Games | Won | Still in office | Lost the vote | Lost to famine | Terms served | Quarter of the win | Prosperity at the end |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- | --- |
| Does nothing | 1200 | 0.0% | 0.7% | 3.8% | 95.6% | 1 / 1 / 1 | none | 14.1 / 19.1 / 20.4 |
| Popularity | 1200 | 0.0% | 0.0% | 3.3% | 96.8% | 1 / 1 / 1 | none | 10.6 / 14.5 / 18.0 |
| Sensible | 1200 | 0.0% | 36.8% | 63.2% | 0.0% | 1 / 1 / 1 | none | 28.9 / 34.2 / 34.4 |
| Chain builder | 1200 | 0.0% | 93.8% | 6.3% | 0.0% | 1 / 1 / 1 | none | 21.6 / 26.9 / 29.5 |
| Relief only | 1200 | 0.0% | 76.2% | 23.8% | 0.0% | 1 / 1 / 1 | none | 15.4 / 20.6 / 20.6 |
| Lowest tax | 1200 | 0.0% | 16.8% | 39.6% | 43.6% | 1 / 1 / 1 | none | 11.0 / 14.9 / 19.0 |
| Says yes | 1200 | 0.0% | 65.9% | 34.1% | 0.0% | 1 / 1 / 1 | none | 15.4 / 20.6 / 20.6 |
| Squeeze then spend | 1200 | 0.0% | 77.5% | 22.5% | 0.0% | 1 / 1 / 1 | none | 15.1 / 20.4 / 20.4 |
| Power only | 1200 | 0.0% | 33.6% | 66.4% | 0.0% | 1 / 1 / 1 | none | 32.9 / 37.9 / 38.2 |
| Chain by the quay | 1200 | 0.0% | 85.3% | 14.7% | 0.0% | 1 / 1 / 1 | none | 23.4 / 28.7 / 31.8 |
| Hover then spend | 1200 | 0.0% | 100.0% | 0.0% | 0.0% | 1 / 1 / 1 | none | 16.0 / 21.2 / 21.8 |

| Player | Highest tier reached | Vote share at the last vote | Treasury at the end | Approval at the end |
| --- | --- | --- | --- | --- |
| Does nothing | Subsistence 100.0% | 43.6% / 47.6% / 51.9% | $0.0m / $0.3m / $2.0m | 41.3% / 47.2% / 49.9% |
| Popularity | Subsistence 100.0% | 39.5% / 44.7% / 49.9% | $0.0m / $2.8m / $2.9m | 40.3% / 50.2% / 54.7% |
| Sensible | Developing 100.0% | 36.8% / 48.9% / 55.1% | $0.0m / $0.4m / $0.9m | 38.2% / 49.3% / 53.2% |
| Chain builder | Subsistence 100.0% | 47.8% / 53.3% / 58.0% | $0.0m / $0.4m / $0.9m | 49.0% / 53.4% / 57.0% |
| Relief only | Subsistence 100.0% | 44.2% / 51.7% / 57.4% | $0.0m / $14.0m / $67.0m | 45.5% / 51.7% / 54.4% |
| Lowest tax | Subsistence 100.0% | 40.0% / 48.3% / 56.9% | $0.0m / $0.2m / $0.4m | 41.6% / 48.5% / 54.5% |
| Says yes | Subsistence 100.0% | 42.8% / 50.9% / 56.6% | $0.1m / $37.7m / $105.8m | 44.7% / 51.1% / 54.3% |
| Squeeze then spend | Subsistence 100.0% | 45.6% / 51.9% / 58.2% | $117.6m / $180.8m / $237.8m | 48.1% / 51.7% / 55.2% |
| Power only | Developing 99.9%, Industrialising 0.1% | 35.9% / 48.7% / 54.7% | $0.0m / $0.4m / $1.0m | 38.3% / 48.9% / 52.8% |
| Chain by the quay | Subsistence 98.2%, Developing 1.8% | 45.0% / 52.5% / 58.4% | $0.0m / $0.4m / $0.9m | 45.9% / 52.7% / 56.7% |
| Hover then spend | Subsistence 100.0% | 53.3% / 60.5% / 66.2% | $0.0m / $0.3m / $12.6m | 55.3% / 60.5% / 64.5% |

Spreads are least / middle / most. Won is the win on prosperity: Prosperous held for four quarters running. Still in office counts the games that had neither won nor lost when their terms were up. Vote share counts only the games that reached a vote.

- Does nothing: lost the vote 45 in term 1; famine brought the state down in The Dry East 601, Korr Highlands 334, Salt Coast 108, Arden Vale 104 (in quarter 8 / 8 / 20).
- Popularity: lost the vote 39 in term 1; famine brought the state down in The Dry East 600, Korr Highlands 269, Arden Vale 190, Salt Coast 102 (in quarter 8 / 8 / 20).
- Sensible: lost the vote 758 in term 1; famine brought the state down in no game.
- Chain builder: lost the vote 75 in term 1; famine brought the state down in no game.
- Relief only: lost the vote 286 in term 1; famine brought the state down in no game.
- Lowest tax: lost the vote 475 in term 1; famine brought the state down in Arden Vale 202, The Dry East 183, Korr Highlands 87, Salt Coast 51 (in quarter 8 / 16 / 20).
- Says yes: lost the vote 409 in term 1; famine brought the state down in no game.
- Squeeze then spend: lost the vote 270 in term 1; famine brought the state down in no game.
- Power only: lost the vote 797 in term 1; famine brought the state down in no game.
- Chain by the quay: lost the vote 176 in term 1; famine brought the state down in no game.
- Hover then spend: lost the vote in no game; famine brought the state down in no game.

## The tuning run

Values were tuned against seeds 1 to 300 (1 to 40, 1 to 60 and 1 to 80 for the quicker
comparisons, with values set from the command line rather than in the files).

### Tuning: Republic of Tavara, seeds 1-300, up to 4 terms

| Player | Games | Won | Still in office | Lost the vote | Lost to famine | Terms served | Quarter of the win | Prosperity at the end |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- | --- |
| Does nothing | 300 | 0.0% | 0.0% | 3.3% | 96.7% | 1 / 1 / 2 | none | 13.2 / 19.1 / 20.4 |
| Popularity | 300 | 0.0% | 0.0% | 2.7% | 97.3% | 1 / 1 / 1 | none | 11.0 / 14.0 / 17.7 |
| Sensible | 300 | 0.0% | 0.0% | 100.0% | 0.0% | 1 / 1 / 4 | none | 28.0 / 34.2 / 34.5 |
| Chain builder | 300 | 45.7% | 0.0% | 54.3% | 0.0% | 1 / 2 / 4 | 36 / 51 / 68 | 20.2 / 41.9 / 43.7 |
| Relief only | 300 | 0.0% | 0.0% | 100.0% | 0.0% | 1 / 2 / 4 | none | 13.6 / 20.1 / 20.7 |
| Lowest tax | 300 | 0.0% | 0.0% | 40.7% | 59.3% | 1 / 1 / 2 | none | 11.1 / 14.5 / 18.9 |
| Says yes | 300 | 0.0% | 0.0% | 100.0% | 0.0% | 1 / 2 / 4 | none | 13.4 / 20.3 / 20.7 |
| Squeeze then spend | 300 | 0.0% | 9.7% | 90.0% | 0.3% | 1 / 3 / 4 | none | 13.2 / 19.7 / 20.4 |
| Power only | 300 | 0.0% | 0.0% | 100.0% | 0.0% | 1 / 1 / 3 | none | 32.8 / 37.9 / 38.6 |
| Chain by the quay | 300 | 44.0% | 0.0% | 56.0% | 0.0% | 1 / 2 / 3 | 33 / 36 / 57 | 25.1 / 41.6 / 42.7 |
| Hover then spend | 300 | 0.0% | 31.7% | 68.3% | 0.0% | 2 / 4 / 4 | none | 14.0 / 20.0 / 21.2 |

| Player | Highest tier reached | Vote share at the last vote | Treasury at the end | Approval at the end |
| --- | --- | --- | --- | --- |
| Does nothing | Subsistence 100.0% | 45.7% / 47.6% / 51.9% | $0.0m / $0.3m / $2.0m | 41.3% / 47.0% / 49.9% |
| Popularity | Subsistence 100.0% | 40.5% / 44.8% / 48.9% | $0.0m / $2.8m / $2.8m | 41.4% / 50.2% / 54.1% |
| Sensible | Developing 100.0% | 36.8% / 47.2% / 49.9% | $0.0m / $0.4m / $0.9m | 36.6% / 47.9% / 51.8% |
| Chain builder | Subsistence 7.0%, Developing 27.3%, Industrialising 19.3%, Prosperous 46.3% | 35.2% / 49.5% / 57.9% | $0.0m / $0.9m / $63.0m | 33.2% / 45.1% / 52.9% |
| Relief only | Subsistence 100.0% | 35.3% / 48.1% / 49.9% | $0.0m / $0.3m / $63.7m | 34.8% / 48.8% / 52.5% |
| Lowest tax | Subsistence 100.0% | 35.5% / 48.1% / 56.3% | $0.0m / $0.2m / $0.4m | 37.6% / 48.1% / 52.8% |
| Says yes | Subsistence 100.0% | 29.7% / 48.1% / 49.9% | $0.0m / $29.5m / $123.2m | 31.6% / 48.9% / 52.5% |
| Squeeze then spend | Subsistence 100.0% | 42.0% / 49.0% / 54.3% | $117.9m / $314.8m / $521.7m | 43.9% / 50.5% / 52.7% |
| Power only | Developing 73.7%, Industrialising 26.3% | 38.3% / 47.0% / 49.9% | $0.0m / $0.5m / $0.9m | 38.3% / 47.7% / 51.5% |
| Chain by the quay | Subsistence 14.0%, Developing 7.3%, Industrialising 32.3%, Prosperous 46.3% | 35.6% / 49.5% / 57.4% | $0.0m / $0.8m / $65.3m | 30.3% / 43.7% / 52.6% |
| Hover then spend | Subsistence 100.0% | 34.7% / 48.6% / 56.8% | $0.0m / $0.4m / $0.9m | 33.3% / 48.8% / 55.3% |

Spreads are least / middle / most. Won is the win on prosperity: Prosperous held for four quarters running. Still in office counts the games that had neither won nor lost when their terms were up. Vote share counts only the games that reached a vote.

- Does nothing: lost the vote 10 in term 1; famine brought the state down in The Dry East 153, Korr Highlands 78, Arden Vale 31, Salt Coast 28 (in quarter 8 / 8 / 32).
- Popularity: lost the vote 8 in term 1; famine brought the state down in The Dry East 152, Korr Highlands 64, Arden Vale 49, Salt Coast 27 (in quarter 8 / 8 / 20).
- Sensible: lost the vote 200 in term 1, 69 in term 2, 30 in term 3, 1 in term 4; famine brought the state down in no game.
- Chain builder: lost the vote 19 in term 1, 134 in term 2, 10 in term 3; famine brought the state down in no game.
- Relief only: lost the vote 90 in term 1, 121 in term 2, 79 in term 3, 10 in term 4; famine brought the state down in no game.
- Lowest tax: lost the vote 117 in term 1, 5 in term 2; famine brought the state down in The Dry East 68, Arden Vale 66, Korr Highlands 33, Salt Coast 11 (in quarter 8 / 16 / 40).
- Says yes: lost the vote 116 in term 1, 97 in term 2, 65 in term 3, 22 in term 4; famine brought the state down in no game.
- Squeeze then spend: lost the vote 85 in term 1, 60 in term 2, 55 in term 3, 70 in term 4; famine brought the state down in Korr Highlands 1 (in quarter 80 / 80 / 80).
- Power only: lost the vote 219 in term 1, 62 in term 2, 19 in term 3; famine brought the state down in no game.
- Chain by the quay: lost the vote 50 in term 1, 115 in term 2, 3 in term 3; famine brought the state down in no game.
- Hover then spend: lost the vote 2 in term 2, 43 in term 3, 160 in term 4; famine brought the state down in no game.

### Tuning, one term: Republic of Tavara, seeds 1-300, up to 1 term

| Player | Games | Won | Still in office | Lost the vote | Lost to famine | Terms served | Quarter of the win | Prosperity at the end |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- | --- |
| Does nothing | 300 | 0.0% | 0.7% | 3.3% | 96.0% | 1 / 1 / 1 | none | 13.2 / 19.1 / 20.4 |
| Popularity | 300 | 0.0% | 0.0% | 2.7% | 97.3% | 1 / 1 / 1 | none | 11.0 / 14.0 / 17.7 |
| Sensible | 300 | 0.0% | 33.3% | 66.7% | 0.0% | 1 / 1 / 1 | none | 29.0 / 34.2 / 34.4 |
| Chain builder | 300 | 0.0% | 93.7% | 6.3% | 0.0% | 1 / 1 / 1 | none | 20.2 / 26.9 / 29.5 |
| Relief only | 300 | 0.0% | 70.0% | 30.0% | 0.0% | 1 / 1 / 1 | none | 14.0 / 20.6 / 20.7 |
| Lowest tax | 300 | 0.0% | 13.0% | 39.0% | 48.0% | 1 / 1 / 1 | none | 11.6 / 14.7 / 18.9 |
| Says yes | 300 | 0.0% | 61.3% | 38.7% | 0.0% | 1 / 1 / 1 | none | 14.0 / 20.6 / 20.7 |
| Squeeze then spend | 300 | 0.0% | 71.7% | 28.3% | 0.0% | 1 / 1 / 1 | none | 13.8 / 20.4 / 20.4 |
| Power only | 300 | 0.0% | 27.0% | 73.0% | 0.0% | 1 / 1 / 1 | none | 32.8 / 37.9 / 37.9 |
| Chain by the quay | 300 | 0.0% | 83.3% | 16.7% | 0.0% | 1 / 1 / 1 | none | 22.1 / 28.7 / 31.8 |
| Hover then spend | 300 | 0.0% | 100.0% | 0.0% | 0.0% | 1 / 1 / 1 | none | 14.6 / 21.2 / 21.8 |

| Player | Highest tier reached | Vote share at the last vote | Treasury at the end | Approval at the end |
| --- | --- | --- | --- | --- |
| Does nothing | Subsistence 100.0% | 45.7% / 47.6% / 51.9% | $0.0m / $0.3m / $2.0m | 41.3% / 47.1% / 49.9% |
| Popularity | Subsistence 100.0% | 40.5% / 44.8% / 48.9% | $0.0m / $2.8m / $2.8m | 41.4% / 50.2% / 54.1% |
| Sensible | Developing 100.0% | 37.8% / 48.7% / 55.1% | $0.0m / $0.5m / $0.9m | 39.7% / 49.2% / 52.9% |
| Chain builder | Subsistence 100.0% | 46.8% / 53.2% / 58.0% | $0.0m / $0.4m / $0.9m | 49.2% / 53.3% / 56.1% |
| Relief only | Subsistence 100.0% | 42.8% / 51.3% / 56.0% | $0.0m / $15.3m / $66.0m | 45.4% / 51.7% / 54.0% |
| Lowest tax | Subsistence 100.0% | 40.7% / 48.3% / 56.3% | $0.0m / $0.2m / $0.4m | 41.1% / 48.7% / 54.4% |
| Says yes | Subsistence 100.0% | 44.2% / 50.8% / 55.2% | $0.1m / $38.6m / $117.4m | 45.6% / 51.2% / 54.0% |
| Squeeze then spend | Subsistence 100.0% | 47.2% / 51.5% / 55.9% | $116.6m / $179.9m / $234.5m | 48.7% / 51.6% / 54.3% |
| Power only | Developing 100.0% | 39.6% / 48.4% / 54.7% | $0.0m / $0.5m / $1.0m | 39.5% / 48.5% / 52.8% |
| Chain by the quay | Subsistence 97.0%, Developing 3.0% | 44.5% / 52.3% / 57.4% | $0.0m / $0.4m / $0.9m | 46.5% / 52.5% / 56.0% |
| Hover then spend | Subsistence 100.0% | 53.7% / 60.1% / 65.3% | $0.0m / $0.4m / $11.6m | 56.1% / 60.4% / 64.2% |

Spreads are least / middle / most. Won is the win on prosperity: Prosperous held for four quarters running. Still in office counts the games that had neither won nor lost when their terms were up. Vote share counts only the games that reached a vote.

- Does nothing: lost the vote 10 in term 1; famine brought the state down in The Dry East 152, Korr Highlands 78, Arden Vale 31, Salt Coast 27 (in quarter 8 / 8 / 20).
- Popularity: lost the vote 8 in term 1; famine brought the state down in The Dry East 152, Korr Highlands 64, Arden Vale 49, Salt Coast 27 (in quarter 8 / 8 / 20).
- Sensible: lost the vote 200 in term 1; famine brought the state down in no game.
- Chain builder: lost the vote 19 in term 1; famine brought the state down in no game.
- Relief only: lost the vote 90 in term 1; famine brought the state down in no game.
- Lowest tax: lost the vote 117 in term 1; famine brought the state down in Arden Vale 55, The Dry East 52, Korr Highlands 26, Salt Coast 11 (in quarter 8 / 15 / 20).
- Says yes: lost the vote 116 in term 1; famine brought the state down in no game.
- Squeeze then spend: lost the vote 85 in term 1; famine brought the state down in no game.
- Power only: lost the vote 219 in term 1; famine brought the state down in no game.
- Chain by the quay: lost the vote 50 in term 1; famine brought the state down in no game.
- Hover then spend: lost the vote in no game; famine brought the state down in no game.

### Before tuning: the values as #36, #37 and #38 left them, seeds 1-300

The same players and run on the values as they stood at the start of #39 (commit e91b07f).
Every player that reaches a vote loses it in the first term, and no player comes near
Prosperous: the best ends on 28.5.

| Player | Games | Won | Still in office | Lost the vote | Lost to famine | Terms served | Quarter of the win | Prosperity at the end |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- | --- |
| Does nothing | 300 | 0.0% | 0.0% | 4.0% | 96.0% | 1 / 1 / 1 | none | 15.5 / 20.2 / 22.0 |
| Popularity | 300 | 0.0% | 0.0% | 1.0% | 99.0% | 1 / 1 / 1 | none | 9.2 / 16.3 / 20.2 |
| Sensible | 300 | 0.0% | 0.0% | 100.0% | 0.0% | 1 / 1 / 1 | none | 19.4 / 24.9 / 26.1 |
| Chain builder | 300 | 0.0% | 0.0% | 100.0% | 0.0% | 1 / 1 / 1 | none | 18.3 / 24.5 / 26.4 |
| Relief only | 300 | 0.0% | 0.0% | 100.0% | 0.0% | 1 / 1 / 1 | none | 16.0 / 21.6 / 22.7 |
| Lowest tax | 300 | 0.0% | 0.0% | 18.3% | 81.7% | 1 / 1 / 1 | none | 10.5 / 14.9 / 20.2 |
| Says yes | 300 | 0.0% | 0.0% | 100.0% | 0.0% | 1 / 1 / 1 | none | 16.0 / 21.6 / 22.7 |
| Squeeze then spend | 300 | 0.0% | 0.0% | 100.0% | 0.0% | 1 / 1 / 2 | none | 15.9 / 21.9 / 22.6 |
| Power only | 300 | 0.0% | 0.0% | 100.0% | 0.0% | 1 / 1 / 1 | none | 20.6 / 26.8 / 28.5 |
| Chain by the quay | 300 | 0.0% | 0.0% | 100.0% | 0.0% | 1 / 1 / 1 | none | 19.5 / 24.7 / 26.4 |
| Hover then spend | 300 | 0.0% | 0.0% | 100.0% | 0.0% | 1 / 1 / 2 | none | 15.8 / 22.9 / 23.7 |

| Player | Highest tier reached | Vote share at the last vote | Treasury at the end | Approval at the end |
| --- | --- | --- | --- | --- |
| Does nothing | Subsistence 100.0% | 30.4% / 34.3% / 39.0% | $0.0m / $0.2m / $1.3m | 30.3% / 40.0% / 43.5% |
| Popularity | Subsistence 100.0% | 36.3% / 38.2% / 38.4% | $0.0m / $2.4m / $2.9m | 33.0% / 43.8% / 48.0% |
| Sensible | Developing 100.0% | 8.9% / 18.1% / 40.8% | $0.0m / $0.4m / $0.9m | 10.6% / 18.0% / 38.0% |
| Chain builder | Developing 100.0% | 10.1% / 22.2% / 43.4% | $0.0m / $0.4m / $1.1m | 11.8% / 21.9% / 41.5% |
| Relief only | Subsistence 100.0% | 33.2% / 43.2% / 48.9% | $0.0m / $0.3m / $57.5m | 35.0% / 43.7% / 46.4% |
| Lowest tax | Subsistence 100.0% | 31.9% / 36.3% / 43.3% | $0.1m / $0.2m / $0.4m | 32.8% / 39.4% / 47.2% |
| Says yes | Subsistence 100.0% | 29.8% / 41.6% / 47.2% | $0.0m / $5.6m / $74.1m | 30.8% / 42.1% / 46.0% |
| Squeeze then spend | Subsistence 100.0% | 36.7% / 44.5% / 49.9% | $1.5m / $60.3m / $110.9m | 39.1% / 44.8% / 48.1% |
| Power only | Developing 100.0% | 9.6% / 17.1% / 38.2% | $0.0m / $0.4m / $0.9m | 11.1% / 17.0% / 37.4% |
| Chain by the quay | Subsistence 0.3%, Developing 99.7% | 10.0% / 18.3% / 37.9% | $0.0m / $0.4m / $0.9m | 11.3% / 18.2% / 37.5% |
| Hover then spend | Subsistence 100.0% | 9.1% / 45.9% / 49.9% | $0.0m / $0.4m / $0.9m | 11.5% / 46.4% / 51.6% |

Spreads are least / middle / most. Won is the win on prosperity: Prosperous held for four quarters running. Still in office counts the games that had neither won nor lost when their terms were up. Vote share counts only the games that reached a vote.

- Does nothing: lost the vote 12 in term 1; famine brought the state down in The Dry East 150, Korr Highlands 77, Arden Vale 32, Salt Coast 29 (in quarter 8 / 8 / 20).
- Popularity: lost the vote 3 in term 1; famine brought the state down in The Dry East 146, Korr Highlands 66, Arden Vale 57, Salt Coast 28 (in quarter 8 / 8 / 20).
- Sensible: lost the vote 300 in term 1; famine brought the state down in no game.
- Chain builder: lost the vote 300 in term 1; famine brought the state down in no game.
- Relief only: lost the vote 300 in term 1; famine brought the state down in no game.
- Lowest tax: lost the vote 55 in term 1; famine brought the state down in The Dry East 120, Arden Vale 57, Korr Highlands 45, Salt Coast 23 (in quarter 8 / 14 / 20).
- Says yes: lost the vote 300 in term 1; famine brought the state down in no game.
- Squeeze then spend: lost the vote 299 in term 1, 1 in term 2; famine brought the state down in no game.
- Power only: lost the vote 300 in term 1; famine brought the state down in no game.
- Chain by the quay: lost the vote 300 in term 1; famine brought the state down in no game.
- Hover then spend: lost the vote 275 in term 1, 25 in term 2; famine brought the state down in no game.

## What was changed

Only data was changed, all of it in `src/sim/balance.ts`. No rule of the simulation was touched,
and neither country file was. The infrastructure lens's steps (`src/ui/lens.ts`) were doubled to
match the sites' doubled infrastructure access, and the living-standards lens's lowest step moved
from four fifths to seven tenths of Developing, so that the poorest regions still stand apart
on the opening map now that Developing begins at 30.

| Value | From | To | Why |
| --- | --- | --- | --- |
| `population.growthPerTenThousandPerQuarter` | 60 | 30 | About 2.4% a year halved to 1.2%. Output and farmland do not grow, so at 2.4% every per-head figure fell by a third over twenty years and Tavara could not feed itself after about eight: with the vote taken out of the game, every careful player's game ended in famine between quarters 39 and 56. |
| `food.agriculture.bonusPermillePerThousandMoney` | 375 | 600 | Farm spending has to be able to keep up with the people to be fed. The most the budget allows now lifts a harvest to 133% of full yield instead of 115%; with this and slower growth, no careful player's game ended in famine in 80 quarters. |
| `approval.baselinePermille` | 455 | 515 | After growth (#30) and tiers (#31) the sensible player was re-elected in 1.3% of one-term games, and with the new players no player that reaches a vote survived a first term. At 51.5% the sensible player is re-elected in about a third of one-term games (36.8% on the confirmation run; Phase 1 ended at 48.1%), and a builder can survive the second term, in which it pays for its chain, about half the time. |
| `prosperity.weightsPermille` (income, health, education, infrastructure) | 250, 200, 200, 200 | 150, 150, 150, 400 | Building is now the main road to prosperity. Health and education are bought with the budget alone, and at 200 each they let a player who builds nothing come as close to the top as one who builds everything. Food security stays at 150. |
| `sites.*.infrastructurePermille` (irrigation, farm road, grain store, mine, trunk road, port, shallow port, power station) | 100, 150, 100, 50, 200, 150, 100, 50 | 200, 300, 200, 100, 400, 300, 200, 100 | All doubled, so that a region with most of its sites in use reaches well over half of full access. Power's own 15 points were not changed: it is the strongest single building for prosperity already (see below). |
| `sites.mine.capacity` | 200 | 600 | A mine adds $60.0m a quarter to its region's output instead of $20.0m. At $20.0m the whole chain ($120.0m) paid back its cost in tax only after some 30 quarters, and moved income per head in one region of six; now it pays back in about ten and lifts the treasury enough to fund the services that build prosperity. |
| `sites.trunkRoad.capacity`, `sites.port.capacity`, `sites.shallowPort.capacity` | 240, 300, 120 | 720, 900, 360 | Tripled with the mine, so each link keeps its part: the road and port still carry more than the mine produces, and the shallow port still ships less (60% of the mine's output). |
| `prosperity.tiers.*.fromPermille` (Developing, Industrialising, Prosperous) | 250, 450, 700 | 300, 380, 420 | The design calls 25, 45 and 70 placeholders. Prosperous at 70 could not be reached by any player: with every site built and the most the budget allows on health and education, Tavara stood near 42. Tavara now starts at 21.0 in Subsistence; a careful player who builds no large site levels off at about 34.5, in Developing; power and the small sites alone reach about 38, in Industrialising; the whole chain and power reach 42 to 44. Testland starts at 26.9, also in Subsistence. |

Left as they were: every site's cost, build time and upkeep; power's output and infrastructure;
the tax range and what a point of tax costs; what the public expects of health, education and
security, and how quickly spending builds them; what each tier does to expectations (3 points a
tier); the election's 50% and its 3-point swing; the strike and protest thresholds; every
dilemma and its chance; the drought chances; and both country files.

## What the runs showed

**The chain builder wins in 44% of games, and no player that builds nothing wins at all.** Its
wins come in the second or third term (quarter 36 at the earliest, 50 in the middle, 69 at the
latest), once the chain and power are in use and the small sites built. It loses at the vote,
never to famine, and mostly in its second term (573 of 1,200 confirmation games; 75 in its first,
21 in its third): that is the term in which it saves for and builds the
port, road and mine, and passes into Developing and often Industrialising, each of which lowers
the approval baseline by 3 points. What it builds pays off after that vote. No game is still in
office after four terms: a builder that survives is Prosperous before then.

**The chain beats power alone, and the port beats the quay, by margin rather than by kind.**
Power and the small sites lift Tavara to about 38 to 39, Industrialising, but never to 42; such a
player wins no game, and two out of three lose their first vote, having passed two tiers and
raised what people expect by 6 points within a term. The chain through the quay reaches about
42.8 and wins nearly as often as the full chain (42.1% against 44.3%): it is
cheaper and complete two quarters sooner, so it is often in use before the second vote, but it
leaves the nation only just over the line, where a bad harvest takes it back below. Through the
deep-water port the nation stands higher, about 43.7.

**Hover then spend, Phase 1's dominant strategy, keeps office but cannot win.** On one term it
is re-elected in 100.0% of the confirmation games (it was 15.1% before this issue; 71.9% at
the end of Phase 1), more than any other player: holding tax just short of strikes and spending
the savings before the vote is still the best way to win an election. But it builds nothing, so
its prosperity ends near 20, in Subsistence, and over four terms it wins no game: it is still in office after twenty years in 30.3% of games and voted out in the rest, mostly in its fourth term.
The win on prosperity is what closes the strategy: it can stay in office, but not win. Squeeze
then spend keeps office in some games too, with hundreds of millions unspent, for the same
reason.

**The do-nothing and popularity players still die young.** Both lose almost every game to
famine, most in quarter 8 after a first-year drought, as in Phase 1. A handful of their games
reach the vote and lose it.

**The sensible player keeps office for a term in about a third of games, then fades.** It is re-elected in
36.8% of one-term confirmation games (48.1% at the end of Phase 1). Over four terms it is out
of office in every game, the last in its fourth term: with no large site its prosperity levels
off near 34.5, in Developing, which costs it 3 points of approval, while its people grow in
number and expect more for the same budget.

**The balance is steep in approval.** With everything else as shipped, a baseline of 51.0% gave
the chain builder 37.5% wins on seeds 1 to 80 and 51.5% gave 51.2%; on seeds 1 to 60, 52.0% gave
55.0%. A change to any value that bears on approval needs a fresh run, as in Phase 1.

**Testland is not balanced, and was left alone.** It exists to prove that nothing is tied to
Tavara and has no targets; every one of its games ran to an ending. It starts at 26.9, in
Subsistence, and is small and rich per head, so it plays very differently: power and its small
sites alone make it Prosperous, in quarter 19 in the middle of the games, and that player wins
95.2%; its chain needs power as well as a road and a port, and the chain builder, saving for all
of it, loses the vote in nearly every game. A player who does nothing starves in Sandreach.

**Tavara's mine still does not need power.** In Testland the mine's chain runs through a power
line and its station; in Tavara it does not, and this was left as it is. Power is cheap, quick to
build and pays off within a term, while the chain is costly and pays off in the next; keeping
them apart lets a player choose which to build first, and whether to build both. Tying the mine
to the Korrgate line would make the chain the single largest plan in the game, at $126.0m, and
would change nothing for the chain builder, which builds power first anyway. The dependency is a
line in the country file if the owner wants it.

### Attempt log

The tuning, in the order it was done. Each line names what changed from the line before; runs
are on Tavara, four terms, with the chain builder unless said.

1. Values as shipped, the new tool: every player that reaches a vote loses it in term 1
   (sensible's vote share 43.6%, chain builder's 34.5% in the middle of seeds 1 to 40).
   Prosperous at 70 is out of reach: everything built and the most the budget allows on health
   and education stands near 42.
2. The vote taken out (`election.winSharePermille` 0): every careful player's game ends in famine
   between quarters 39 and 56. Growth 30 with an agriculture bonus of 600, or growth 40 with 750,
   ends none in 80 quarters.
3. A higher baseline alone (49.0%, 52.0%) keeps the players in office a term longer, but the
   chain builder's highest prosperity is only 2.5 points above the sensible player's.
4. Mine, road and port capacities tripled, health and education levels built nearly twice as
   fast by spending, infrastructure doubled, income scored in full at $150 a head: the chain
   builder reaches 40 to 42, the sensible player 32 to 34. With tiers at 33, 38 and 42.5 the
   chain builder wins 13.3%, losing the vote in terms 1 and 2.
5. A baseline of 54.0%, and large sites a fifth cheaper: 48.3%. But Testland, rich per head,
   then starts above Prosperous and wins in its fourth quarter, so faster services were dropped.
6. Weights moved from health and education to infrastructure (150, 150, 150, 400), with health
   and education built by spending at the shipped speed again: Testland starts at 29.2, Tavara
   at 22.2. The players also had to be fixed here: once their large sites were built they built
   no small one, and never saved for them.
7. Tiers 30, 38 and 47, a baseline of 54.0%, still with the cheaper large sites, income scored
   in full at $150 a head and power's infrastructure doubled: 73.3%, the quay 68.3%. Baseline
   52.0%: 48.3%; 50.0%: 15.0%.
8. Site costs and income scoring put back as shipped, to change fewer values; Prosperous at 43:
   48.3%, the quay 40.0%. Power alone then levelled off at 41 to 42, close to the line, so its
   infrastructure was put back to 15 points: power alone about 38, the chain builder 40.0% with
   Prosperous at 43 and 55.0% at 42.
9. Baseline 51.5% with Prosperous at 42: 51.2% on seeds 1 to 80. The road's and port's
   capacities were then set to keep their Phase 1 proportions to the mine (720 and 900 rather
   than 600, the quay 360 rather than 300), which left the chain builder unchanged and lifted the
   quay from 23.8% to 38.8% on the same seeds. The tuning run: 45.7%.

## How the runs were made

```powershell
$env:BALANCE_PLAYERS = 'all'; $env:BALANCE_COUNTRY = 'tavara'; $env:BALANCE_SEEDS = '1-300'; npm run balance
```

```powershell
$env:BALANCE_PLAYERS = 'all'; $env:BALANCE_COUNTRY = 'both'; $env:BALANCE_SEEDS = '1001-2200'; npm run balance
```

```powershell
$env:BALANCE_PLAYERS = 'all'; $env:BALANCE_COUNTRY = 'tavara'; $env:BALANCE_SEEDS = '1001-2200'; $env:BALANCE_TERMS = '1'; npm run balance
```

Each game is played for up to four terms (`BALANCE_TERMS`, default 4); the third command
plays one term, as Phase 1 did, for the check on hover then spend. The confirmation run uses
1,200 seeds that played no part in the tuning. The run shares the games out among worker
processes (`BALANCE_WORKERS`, by default all but two processors); every game depends only on its
country, player and seed, so the report is the same however many workers play it. The tuning
run took about 7 minutes on a 20-processor machine.
