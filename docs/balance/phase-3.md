# Phase 3 balance

Recorded 2026-11-20, for issue #57. The figures below come from the scripted players in
`tests/balance/players.ts`, played through whole games of up to four terms on the countries as
they ship, with the loans, bonds, credit rating, bailout and austerity of issues #53 to #56. The
Phase 2 record, which this follows, is [phase-2.md](phase-2.md).

## Targets

These are the targets proposed in issue #57. **They are proposals: the owner has not yet
confirmed them.** They apply to the real country, Tavara, over games of up to four terms. Where
the issue left a target without a figure, the figure used to judge it is given in brackets.

| Target | Result on the confirmation run | Met |
| --- | --- | --- |
| The sensible borrower clearly beats the chain builder that saves up (by 10 points of wins or more) | The sensible borrower wins 68.5%, in quarter 37 in the middle; the chain builder 44.3%, in quarter 50 | Yes |
| The reckless borrower is usually bailed out (in more than half its games) | Bailed out in 80.6% of games | Yes |
| The reckless borrower rarely wins (under 10%) | Wins 7.3% | Yes |
| No player wins every game | The best of the six wins 68.5%; the best of the others, the chain through the quay, 42.1% | Yes |
| The player who does nothing almost never wins | Wins 0.0% (96.3% lost to famine, 3.8% at the vote) | Yes |
| The player who spends everything on popularity almost never wins | Wins 0.0% (96.8% lost to famine, 3.3% at the vote) | Yes |

Testland, the crude second country, has no targets. It now starts the game in debt (issue #56),
and every one of its games ran to an ending without error, every player's included.

## How a game is played and scored

As in Phase 2: a game is played until it is won, lost, or four terms (80 quarters) are up, and a
game still being played then is **still in office**. Won is the win on prosperity, which since
Phase 3 needs the debt test passed as the four-quarter hold completes.

The report gained a third table for borrowing:

- **Borrowed**: everything the player borrowed over the game.
- **Bailed out**: the games in which a missed payment brought a bailout. A missed payment during
  austerity extends it and is not counted again; **bailouts in a game** counts the bailouts in
  the games that had one.
- **Win held back by the debt test**: the games in which prosperity was held long enough to win
  while the debt burden was over the limit, with how many of those were won once it passed and
  how many quarters the win waited.
- **Debt burden at the end** and **highest debt burden**: what was owed against a year's
  revenue at the budget in force.

`BALANCE_PLAYERS` can now also name the players to play, separated by commas, which the quicker
tuning comparisons below used.

## The players

The four players of Phase 2 play exactly as before; a player that never borrows is untouched
by the values tuned here, and its figures on the tuning seeds are the same as in Phase 2. Two
players join them in the balance's own set:

| Player | How it plays |
| --- | --- |
| Sensible borrower | Builds what the chain builder builds, but the mine's chain first (port, trunk road, mine), then power and the small sites. When the money free to spend falls more than $6.0m short of the next site, it borrows the shortfall instead of saving: loans over 12 quarters while the rating is below AA, bonds over 16 quarters once it is AA. It takes the smallest sum that covers the shortfall, and borrows no further once what is owed would pass half a year's revenue or the repayments 15% of a quarter's revenue. It puts a like share of each bond by every quarter towards its maturity, and does not spend it. It pays a site's first instalment out of the money it borrowed, and does not save for a site while borrowing for it. The rest of its play, the budget balanced with the repayments in it, relief, farms, dilemmas and the campaign, is the chain builder's. |
| Reckless borrower | Every quarter it can, borrows all the lenders allow: the largest sums at the lowest rate, which is the shortest term. It starts every site the treasury can pay for, in the chain builder's order, and spends what is left over the year on whatever the preview says wins most approval. It sets the tax as if nothing were owed and nothing being built, so the repayments and instalments come out of the treasury until it runs dry. |

One probe player joins the one-lever players (`BALANCE_PLAYERS=all`):

| Player | How it plays |
| --- | --- |
| Borrow and build at once | The reckless borrower, but with the tax set to pay the repayments and the building out of each quarter's revenue: a binge that pays as it goes. It is the earlier draft of the reckless borrower, kept because it probes whether a borrowing binge wins on its own. |

During austerity every player is held to its terms, as in issue #56: the budget is brought
within the tax floor and the spending caps, and nothing is started or borrowed.

The sensible borrower issues bonds in about two games in five (114 of the 300 tuning games). It
is first rated AA after some quarters of repayments on time, often once the mine's chain is paid
for, and then borrows only for what is left.

## The confirmation run

### Confirmation: Republic of Tavara, seeds 1001-2200, up to 4 terms

| Player | Games | Won | Still in office | Lost the vote | Lost to famine | Terms served | Quarter of the win | Prosperity at the end |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- | --- |
| Does nothing | 1200 | 0.0% | 0.0% | 3.8% | 96.3% | 1 / 1 / 2 | none | 12.8 / 19.1 / 20.4 |
| Popularity | 1200 | 0.0% | 0.0% | 3.3% | 96.8% | 1 / 1 / 1 | none | 10.6 / 14.5 / 18.0 |
| Sensible | 1200 | 0.0% | 0.0% | 100.0% | 0.0% | 1 / 1 / 4 | none | 28.7 / 34.2 / 34.5 |
| Chain builder | 1200 | 44.3% | 0.0% | 55.8% | 0.0% | 1 / 2 / 4 | 36 / 50 / 69 | 21.6 / 41.9 / 43.7 |
| Sensible borrower | 1200 | 68.5% | 0.0% | 31.5% | 0.0% | 1 / 2 / 3 | 31 / 37 / 53 | 21.3 / 43.0 / 43.7 |
| Reckless borrower | 1200 | 7.3% | 0.0% | 92.8% | 0.0% | 1 / 2 / 2 | 31 / 34 / 39 | 29.8 / 39.6 / 44.3 |
| Relief only | 1200 | 0.0% | 0.0% | 99.8% | 0.2% | 1 / 2 / 4 | none | 12.5 / 20.1 / 20.6 |
| Lowest tax | 1200 | 0.0% | 0.0% | 41.3% | 58.8% | 1 / 1 / 3 | none | 10.5 / 14.4 / 18.9 |
| Says yes | 1200 | 0.0% | 0.0% | 99.9% | 0.1% | 1 / 2 / 4 | none | 12.6 / 20.3 / 20.6 |
| Squeeze then spend | 1200 | 0.0% | 9.8% | 89.8% | 0.4% | 1 / 3 / 4 | none | 13.0 / 19.4 / 20.4 |
| Power only | 1200 | 0.0% | 0.1% | 99.9% | 0.0% | 1 / 1 / 4 | none | 32.9 / 37.9 / 38.7 |
| Chain by the quay | 1200 | 42.1% | 0.0% | 57.9% | 0.0% | 1 / 2 / 3 | 32 / 36 / 56 | 23.4 / 41.9 / 42.8 |
| Borrow and build at once | 1200 | 0.0% | 0.0% | 100.0% | 0.0% | 1 / 1 / 1 | none | 38.1 / 43.1 / 43.9 |
| Hover then spend | 1200 | 0.0% | 30.3% | 69.5% | 0.2% | 2 / 4 / 4 | none | 14.3 / 19.9 / 21.1 |

| Player | Highest tier reached | Vote share at the last vote | Treasury at the end | Approval at the end |
| --- | --- | --- | --- | --- |
| Does nothing | Subsistence 100.0% | 43.6% / 47.6% / 51.9% | $0.0m / $0.3m / $2.0m | 36.6% / 47.1% / 49.9% |
| Popularity | Subsistence 100.0% | 39.5% / 44.7% / 49.9% | $0.0m / $2.8m / $2.9m | 40.3% / 50.2% / 54.7% |
| Sensible | Developing 100.0% | 23.4% / 47.3% / 49.9% | $0.0m / $0.4m / $0.9m | 25.0% / 47.8% / 52.5% |
| Chain builder | Subsistence 8.0%, Developing 27.6%, Industrialising 19.4%, Prosperous 45.0% | 33.1% / 49.6% / 57.4% | $0.0m / $0.9m / $70.3m | 25.4% / 45.6% / 52.9% |
| Sensible borrower | Subsistence 21.1%, Developing 1.7%, Industrialising 7.6%, Prosperous 69.7% | 39.6% / 51.4% / 57.3% | $0.0m / $10.7m / $71.9m | 31.7% / 44.8% / 52.7% |
| Reckless borrower | Industrialising 27.4%, Prosperous 72.6% | 9.3% / 20.3% / 56.2% | $0.0m / $0.5m / $100.7m | 8.9% / 19.4% / 52.8% |
| Relief only | Subsistence 100.0% | 30.9% / 48.0% / 52.2% | $0.0m / $0.3m / $67.0m | 31.4% / 48.6% / 52.8% |
| Lowest tax | Subsistence 100.0% | 36.3% / 48.0% / 56.9% | $0.0m / $0.2m / $0.4m | 37.4% / 47.6% / 53.2% |
| Says yes | Subsistence 100.0% | 29.6% / 47.9% / 53.7% | $0.0m / $27.3m / $139.3m | 31.6% / 48.7% / 52.8% |
| Squeeze then spend | Subsistence 100.0% | 40.2% / 48.8% / 56.2% | $132.1m / $336.6m / $733.4m | 16.4% / 50.3% / 53.3% |
| Power only | Developing 67.5%, Industrialising 32.5% | 31.2% / 47.1% / 50.8% | $0.0m / $0.4m / $1.0m | 31.3% / 47.7% / 52.1% |
| Chain by the quay | Subsistence 13.3%, Developing 6.3%, Industrialising 35.4%, Prosperous 45.0% | 33.2% / 49.3% / 57.6% | $0.0m / $0.8m / $71.4m | 31.6% / 43.7% / 52.9% |
| Borrow and build at once | Prosperous 100.0% | 26.0% / 34.1% / 43.0% | $0.0m / $0.8m / $34.4m | 27.6% / 33.9% / 42.0% |
| Hover then spend | Subsistence 100.0% | 25.1% / 48.6% / 57.3% | $0.0m / $0.4m / $72.4m | 25.6% / 48.9% / 56.2% |

| Player | Borrowed | Bailed out | Bailouts in a game | Win held back by the debt test | Debt burden at the end | Highest debt burden |
| --- | --- | ---: | --- | --- | --- | --- |
| Does nothing | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Popularity | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Sensible | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Chain builder | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Sensible borrower | $60.0m / $70.0m / $175.0m | 0.0% | none | never | 0% / 0% / 28% | 27% / 39% / 54% |
| Reckless borrower | $525.0m / $957.5m / $1085.0m | 80.6% | 1 / 1 / 1 | 69.7%, 87 of 836 won later, waiting 1 / 6 / 12 quarters | 0% / 23% / 554% | 203% / 773% / 1143% |
| Relief only | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Lowest tax | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Says yes | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Squeeze then spend | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Power only | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Chain by the quay | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Borrow and build at once | $960.0m / $1060.0m / $1205.0m | 0.0% | none | 100.0%, 0 of 1200 won later, waiting 3 / 8 / 8 quarters | 30% / 113% / 371% | 86% / 245% / 533% |
| Hover then spend | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |

Spreads are least / middle / most. Won is the win on prosperity: Prosperous held for four quarters running, with the debt burden within the debt test as the hold completes. Still in office counts the games that had neither won nor lost when their terms were up. Vote share counts only the games that reached a vote. Bailed out counts the games in which a missed payment brought a bailout, and bailouts in a game counts them in those games. The win held back by the debt test counts the games in which prosperity was held long enough to win but the debt burden was over the limit, with how many of them were won once it passed and the quarters the win waited. The debt burden is what is owed against a year’s revenue.

- Does nothing: lost the vote 45 in term 1; famine brought the state down in The Dry East 604, Korr Highlands 336, Salt Coast 108, Arden Vale 107 (in quarter 8 / 8 / 36).
- Popularity: lost the vote 39 in term 1; famine brought the state down in The Dry East 600, Korr Highlands 269, Arden Vale 190, Salt Coast 102 (in quarter 8 / 8 / 20).
- Sensible: lost the vote 758 in term 1, 345 in term 2, 85 in term 3, 12 in term 4; famine brought the state down in no game.
- Chain builder: lost the vote 75 in term 1, 573 in term 2, 21 in term 3; famine brought the state down in no game.
- Sensible borrower: lost the vote 272 in term 1, 106 in term 2; famine brought the state down in no game.
- Reckless borrower: lost the vote 561 in term 1, 552 in term 2; famine brought the state down in no game.
- Relief only: lost the vote 286 in term 1, 510 in term 2, 349 in term 3, 53 in term 4; famine brought the state down in The Dry East 1, Korr Highlands 1 (in quarter 58 / 67 / 76).
- Lowest tax: lost the vote 475 in term 1, 20 in term 2; famine brought the state down in The Dry East 277, Arden Vale 255, Korr Highlands 104, Salt Coast 69 (in quarter 8 / 18 / 44).
- Says yes: lost the vote 409 in term 1, 397 in term 2, 285 in term 3, 108 in term 4; famine brought the state down in Korr Highlands 1 (in quarter 72 / 72 / 72).
- Squeeze then spend: lost the vote 270 in term 1, 223 in term 2, 235 in term 3, 349 in term 4; famine brought the state down in Korr Highlands 3, The Dry East 1, Salt Coast 1 (in quarter 58 / 72 / 80).
- Power only: lost the vote 797 in term 1, 333 in term 2, 60 in term 3, 9 in term 4; famine brought the state down in no game.
- Chain by the quay: lost the vote 176 in term 1, 508 in term 2, 11 in term 3; famine brought the state down in no game.
- Borrow and build at once: lost the vote 1200 in term 1; famine brought the state down in no game.
- Hover then spend: lost the vote 16 in term 2, 167 in term 3, 651 in term 4; famine brought the state down in Korr Highlands 2 (in quarter 66 / 71 / 76).

### Confirmation: Testland, seeds 1001-2200, up to 4 terms

| Player | Games | Won | Still in office | Lost the vote | Lost to famine | Terms served | Quarter of the win | Prosperity at the end |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- | --- |
| Does nothing | 1200 | 0.0% | 0.2% | 0.3% | 99.5% | 1 / 1 / 4 | none | 13.1 / 22.9 / 24.4 |
| Popularity | 1200 | 0.0% | 0.1% | 0.4% | 99.5% | 1 / 1 / 4 | none | 8.9 / 20.4 / 22.4 |
| Sensible | 1200 | 0.0% | 0.0% | 100.0% | 0.0% | 1 / 2 / 4 | none | 27.6 / 38.8 / 41.2 |
| Chain builder | 1200 | 0.0% | 0.1% | 99.8% | 0.1% | 1 / 3 / 4 | none | 22.5 / 31.2 / 35.9 |
| Sensible borrower | 1200 | 0.0% | 0.0% | 100.0% | 0.0% | 1 / 3 / 4 | none | 10.9 / 28.8 / 38.5 |
| Reckless borrower | 1200 | 0.0% | 0.0% | 100.0% | 0.0% | 1 / 1 / 2 | none | 24.3 / 34.0 / 49.6 |
| Relief only | 1200 | 0.0% | 26.1% | 11.8% | 62.1% | 2 / 4 / 4 | none | 12.0 / 21.0 / 24.5 |
| Lowest tax | 1200 | 0.0% | 3.6% | 20.3% | 76.1% | 2 / 4 / 4 | none | 6.9 / 16.0 / 20.0 |
| Says yes | 1200 | 0.0% | 30.0% | 14.0% | 56.0% | 3 / 4 / 4 | none | 12.0 / 20.9 / 24.5 |
| Squeeze then spend | 1200 | 0.0% | 0.6% | 86.3% | 13.2% | 1 / 2 / 4 | none | 8.7 / 24.5 / 25.4 |
| Power only | 1200 | 91.8% | 0.0% | 8.2% | 0.0% | 1 / 1 / 3 | 19 / 19 / 50 | 22.5 / 42.0 / 50.6 |
| Chain by the quay | 1200 | 2.8% | 0.0% | 97.2% | 0.0% | 1 / 3 / 4 | 58 / 58 / 59 | 22.5 / 36.7 / 44.6 |
| Borrow and build at once | 1200 | 0.0% | 0.0% | 100.0% | 0.0% | 1 / 1 / 2 | none | 31.8 / 50.9 / 54.2 |
| Hover then spend | 1200 | 0.0% | 81.1% | 3.4% | 15.5% | 3 / 4 / 4 | none | 12.8 / 25.2 / 27.4 |

| Player | Highest tier reached | Vote share at the last vote | Treasury at the end | Approval at the end |
| --- | --- | --- | --- | --- |
| Does nothing | Subsistence 100.0% | 40.8% / 60.7% / 65.6% | $7.3m / $13.8m / $77.8m | 42.1% / 57.3% / 59.5% |
| Popularity | Subsistence 100.0% | 39.0% / 62.5% / 68.8% | $0.0m / $1.2m / $18.0m | 40.3% / 58.5% / 65.1% |
| Sensible | Industrialising 100.0% | 11.5% / 40.6% / 49.9% | $0.0m / $0.3m / $0.8m | 13.6% / 40.1% / 52.9% |
| Chain builder | Subsistence 0.8%, Developing 99.2% | 13.6% / 36.0% / 53.5% | $0.0m / $0.3m / $0.9m | 13.7% / 35.9% / 52.8% |
| Sensible borrower | Subsistence 30.7%, Developing 61.6%, Industrialising 7.8% | 1.5% / 36.6% / 49.9% | $0.0m / $0.5m / $19.6m | 1.8% / 36.5% / 52.8% |
| Reckless borrower | Subsistence 0.9%, Developing 57.3%, Industrialising 15.5%, Prosperous 26.3% | 11.2% / 42.9% / 49.9% | $0.0m / $0.4m / $35.5m | 11.9% / 42.9% / 52.9% |
| Relief only | Subsistence 100.0% | 36.8% / 58.8% / 67.3% | $0.0m / $0.3m / $8.1m | 35.8% / 53.3% / 60.7% |
| Lowest tax | Subsistence 100.0% | 24.8% / 56.0% / 64.1% | $0.0m / $0.3m / $0.4m | 25.5% / 49.2% / 56.4% |
| Says yes | Subsistence 100.0% | 36.2% / 57.7% / 66.6% | $0.0m / $0.2m / $1.9m | 35.5% / 52.5% / 60.7% |
| Squeeze then spend | Subsistence 100.0% | 30.4% / 48.7% / 55.2% | $35.9m / $70.9m / $152.5m | 3.1% / 49.4% / 52.8% |
| Power only | Subsistence 0.8%, Developing 5.9%, Industrialising 1.3%, Prosperous 91.9% | 23.9% / 56.7% / 64.3% | $0.0m / $2.8m / $12.8m | 21.3% / 46.5% / 51.6% |
| Chain by the quay | Subsistence 0.8%, Developing 16.3%, Industrialising 77.5%, Prosperous 5.4% | 12.1% / 36.5% / 60.4% | $0.0m / $0.3m / $7.5m | 13.3% / 35.8% / 52.8% |
| Borrow and build at once | Industrialising 27.3%, Prosperous 72.8% | 11.3% / 37.7% / 49.9% | $0.0m / $6.2m / $30.5m | 11.7% / 37.8% / 52.0% |
| Hover then spend | Subsistence 100.0% | 40.7% / 59.2% / 70.6% | $0.0m / $0.1m / $46.4m | 39.7% / 57.1% / 66.5% |

| Player | Borrowed | Bailed out | Bailouts in a game | Win held back by the debt test | Debt burden at the end | Highest debt burden |
| --- | --- | ---: | --- | --- | --- | --- |
| Does nothing | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 8% | 55% / 55% / 55% |
| Popularity | $0.0m / $0.0m / $0.0m | 14.1% | 1 / 1 / 1 | never | 0% / 0% / 29% | 188% / 188% / 188% |
| Sensible | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 55% / 55% / 55% |
| Chain builder | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 55% / 55% / 55% |
| Sensible borrower | $0.0m / $20.0m / $60.0m | 28.1% | 1 / 1 / 1 | never | 0% / 66% / 385% | 55% / 100% / 385% |
| Reckless borrower | $105.0m / $170.0m / $340.0m | 12.0% | 1 / 1 / 1 | never | 0% / 69% / 658% | 242% / 506% / 731% |
| Relief only | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 55% / 55% / 55% |
| Lowest tax | $0.0m / $0.0m / $0.0m | 100.0% | 1 / 1 / 1 | never | 0% / 0% / 0% | 188% / 188% / 188% |
| Says yes | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 55% / 55% / 55% |
| Squeeze then spend | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 55% / 55% / 55% |
| Power only | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 55% / 55% / 55% |
| Chain by the quay | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 55% / 55% / 55% |
| Borrow and build at once | $130.0m / $160.0m / $325.0m | 2.6% | 1 / 1 / 1 | 6.3%, 0 of 75 won later, waiting 2 / 10 / 10 quarters | 15% / 120% / 633% | 76% / 171% / 781% |
| Hover then spend | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 55% / 55% / 55% |

Spreads are least / middle / most. Won is the win on prosperity: Prosperous held for four quarters running, with the debt burden within the debt test as the hold completes. Still in office counts the games that had neither won nor lost when their terms were up. Vote share counts only the games that reached a vote. Bailed out counts the games in which a missed payment brought a bailout, and bailouts in a game counts them in those games. The win held back by the debt test counts the games in which prosperity was held long enough to win but the debt burden was over the limit, with how many of them were won once it passed and the quarters the win waited. The debt burden is what is owed against a year’s revenue.

- Does nothing: lost the vote 1 in term 3, 3 in term 4; famine brought the state down in Sandreach 1194 (in quarter 8 / 16 / 74).
- Popularity: lost the vote 5 in term 4; famine brought the state down in Sandreach 1194 (in quarter 8 / 16 / 74).
- Sensible: lost the vote 131 in term 1, 497 in term 2, 571 in term 3, 1 in term 4; famine brought the state down in no game.
- Chain builder: lost the vote 47 in term 1, 179 in term 2, 677 in term 3, 295 in term 4; famine brought the state down in Sandreach 1 (in quarter 80 / 80 / 80).
- Sensible borrower: lost the vote 9 in term 1, 537 in term 2, 611 in term 3, 43 in term 4; famine brought the state down in no game.
- Reckless borrower: lost the vote 740 in term 1, 460 in term 2; famine brought the state down in no game.
- Relief only: lost the vote 7 in term 3, 135 in term 4; famine brought the state down in Sandreach 745 (in quarter 36 / 70 / 80).
- Lowest tax: lost the vote 1 in term 2, 44 in term 3, 199 in term 4; famine brought the state down in Sandreach 913 (in quarter 36 / 64 / 80).
- Says yes: lost the vote 3 in term 3, 165 in term 4; famine brought the state down in Sandreach 672 (in quarter 41 / 72 / 80).
- Squeeze then spend: lost the vote 247 in term 1, 454 in term 2, 263 in term 3, 71 in term 4; famine brought the state down in Sandreach 158 (in quarter 44 / 68 / 80).
- Power only: lost the vote 45 in term 1, 45 in term 2, 8 in term 3; famine brought the state down in no game.
- Chain by the quay: lost the vote 47 in term 1, 498 in term 2, 607 in term 3, 14 in term 4; famine brought the state down in no game.
- Borrow and build at once: lost the vote 1119 in term 1, 81 in term 2; famine brought the state down in no game.
- Hover then spend: lost the vote 41 in term 4; famine brought the state down in Sandreach 186 (in quarter 59 / 76 / 80).

### Confirmation, one term: Republic of Tavara, seeds 1001-2200, up to 1 term

| Player | Games | Won | Still in office | Lost the vote | Lost to famine | Terms served | Quarter of the win | Prosperity at the end |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- | --- |
| Does nothing | 1200 | 0.0% | 0.7% | 3.8% | 95.6% | 1 / 1 / 1 | none | 14.1 / 19.1 / 20.4 |
| Popularity | 1200 | 0.0% | 0.0% | 3.3% | 96.8% | 1 / 1 / 1 | none | 10.6 / 14.5 / 18.0 |
| Sensible | 1200 | 0.0% | 36.8% | 63.2% | 0.0% | 1 / 1 / 1 | none | 28.9 / 34.2 / 34.4 |
| Chain builder | 1200 | 0.0% | 93.8% | 6.3% | 0.0% | 1 / 1 / 1 | none | 21.6 / 26.9 / 29.5 |
| Sensible borrower | 1200 | 0.0% | 77.3% | 22.7% | 0.0% | 1 / 1 / 1 | none | 21.3 / 26.9 / 32.5 |
| Reckless borrower | 1200 | 0.0% | 53.3% | 46.8% | 0.0% | 1 / 1 / 1 | none | 31.3 / 44.1 / 44.4 |
| Relief only | 1200 | 0.0% | 76.2% | 23.8% | 0.0% | 1 / 1 / 1 | none | 15.4 / 20.6 / 20.6 |
| Lowest tax | 1200 | 0.0% | 16.8% | 39.6% | 43.6% | 1 / 1 / 1 | none | 11.0 / 14.9 / 19.0 |
| Says yes | 1200 | 0.0% | 65.9% | 34.1% | 0.0% | 1 / 1 / 1 | none | 15.4 / 20.6 / 20.6 |
| Squeeze then spend | 1200 | 0.0% | 77.5% | 22.5% | 0.0% | 1 / 1 / 1 | none | 15.1 / 20.4 / 20.4 |
| Power only | 1200 | 0.0% | 33.6% | 66.4% | 0.0% | 1 / 1 / 1 | none | 32.9 / 37.9 / 38.2 |
| Chain by the quay | 1200 | 0.0% | 85.3% | 14.7% | 0.0% | 1 / 1 / 1 | none | 23.4 / 28.7 / 31.8 |
| Borrow and build at once | 1200 | 0.0% | 0.0% | 100.0% | 0.0% | 1 / 1 / 1 | none | 38.1 / 43.1 / 43.9 |
| Hover then spend | 1200 | 0.0% | 100.0% | 0.0% | 0.0% | 1 / 1 / 1 | none | 16.0 / 21.2 / 21.8 |

| Player | Highest tier reached | Vote share at the last vote | Treasury at the end | Approval at the end |
| --- | --- | --- | --- | --- |
| Does nothing | Subsistence 100.0% | 43.6% / 47.6% / 51.9% | $0.0m / $0.3m / $2.0m | 41.3% / 47.2% / 49.9% |
| Popularity | Subsistence 100.0% | 39.5% / 44.7% / 49.9% | $0.0m / $2.8m / $2.9m | 40.3% / 50.2% / 54.7% |
| Sensible | Developing 100.0% | 36.8% / 48.9% / 55.1% | $0.0m / $0.4m / $0.9m | 38.2% / 49.3% / 53.2% |
| Chain builder | Subsistence 100.0% | 47.8% / 53.3% / 58.0% | $0.0m / $0.4m / $0.9m | 49.0% / 53.4% / 57.0% |
| Sensible borrower | Subsistence 97.8%, Developing 2.3% | 44.0% / 52.0% / 57.3% | $0.0m / $0.5m / $11.3m | 44.4% / 52.0% / 56.3% |
| Reckless borrower | Industrialising 27.4%, Prosperous 72.6% | 9.6% / 50.2% / 56.8% | $0.0m / $0.4m / $73.1m | 11.5% / 50.9% / 55.3% |
| Relief only | Subsistence 100.0% | 44.2% / 51.7% / 57.4% | $0.0m / $14.0m / $67.0m | 45.5% / 51.7% / 54.4% |
| Lowest tax | Subsistence 100.0% | 40.0% / 48.3% / 56.9% | $0.0m / $0.2m / $0.4m | 41.6% / 48.5% / 54.5% |
| Says yes | Subsistence 100.0% | 42.8% / 50.9% / 56.6% | $0.1m / $37.7m / $105.8m | 44.7% / 51.1% / 54.3% |
| Squeeze then spend | Subsistence 100.0% | 45.6% / 51.9% / 58.2% | $117.6m / $180.8m / $237.8m | 48.1% / 51.7% / 55.2% |
| Power only | Developing 99.9%, Industrialising 0.1% | 35.9% / 48.7% / 54.7% | $0.0m / $0.4m / $1.0m | 38.3% / 48.9% / 52.8% |
| Chain by the quay | Subsistence 98.2%, Developing 1.8% | 45.0% / 52.5% / 58.4% | $0.0m / $0.4m / $0.9m | 45.9% / 52.7% / 56.7% |
| Borrow and build at once | Prosperous 100.0% | 26.0% / 34.1% / 43.0% | $0.0m / $0.8m / $34.4m | 27.6% / 33.9% / 42.0% |
| Hover then spend | Subsistence 100.0% | 53.3% / 60.5% / 66.2% | $0.0m / $0.3m / $12.6m | 55.3% / 60.5% / 64.5% |

| Player | Borrowed | Bailed out | Bailouts in a game | Win held back by the debt test | Debt burden at the end | Highest debt burden |
| --- | --- | ---: | --- | --- | --- | --- |
| Does nothing | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Popularity | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Sensible | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Chain builder | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Sensible borrower | $60.0m / $70.0m / $90.0m | 0.0% | none | never | 0% / 0% / 15% | 24% / 34% / 39% |
| Reckless borrower | $525.0m / $875.0m / $1080.0m | 27.3% | 1 / 1 / 1 | 69.7%, 0 of 836 won later, waiting 1 / 2 / 3 quarters | 0% / 197% / 554% | 203% / 773% / 1143% |
| Relief only | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Lowest tax | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Says yes | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Squeeze then spend | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Power only | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Chain by the quay | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Borrow and build at once | $960.0m / $1060.0m / $1205.0m | 0.0% | none | 100.0%, 0 of 1200 won later, waiting 3 / 8 / 8 quarters | 30% / 113% / 371% | 86% / 245% / 533% |
| Hover then spend | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |

Spreads are least / middle / most. Won is the win on prosperity: Prosperous held for four quarters running, with the debt burden within the debt test as the hold completes. Still in office counts the games that had neither won nor lost when their terms were up. Vote share counts only the games that reached a vote. Bailed out counts the games in which a missed payment brought a bailout, and bailouts in a game counts them in those games. The win held back by the debt test counts the games in which prosperity was held long enough to win but the debt burden was over the limit, with how many of them were won once it passed and the quarters the win waited. The debt burden is what is owed against a year’s revenue.

- Does nothing: lost the vote 45 in term 1; famine brought the state down in The Dry East 601, Korr Highlands 334, Salt Coast 108, Arden Vale 104 (in quarter 8 / 8 / 20).
- Popularity: lost the vote 39 in term 1; famine brought the state down in The Dry East 600, Korr Highlands 269, Arden Vale 190, Salt Coast 102 (in quarter 8 / 8 / 20).
- Sensible: lost the vote 758 in term 1; famine brought the state down in no game.
- Chain builder: lost the vote 75 in term 1; famine brought the state down in no game.
- Sensible borrower: lost the vote 272 in term 1; famine brought the state down in no game.
- Reckless borrower: lost the vote 561 in term 1; famine brought the state down in no game.
- Relief only: lost the vote 286 in term 1; famine brought the state down in no game.
- Lowest tax: lost the vote 475 in term 1; famine brought the state down in Arden Vale 202, The Dry East 183, Korr Highlands 87, Salt Coast 51 (in quarter 8 / 16 / 20).
- Says yes: lost the vote 409 in term 1; famine brought the state down in no game.
- Squeeze then spend: lost the vote 270 in term 1; famine brought the state down in no game.
- Power only: lost the vote 797 in term 1; famine brought the state down in no game.
- Chain by the quay: lost the vote 176 in term 1; famine brought the state down in no game.
- Borrow and build at once: lost the vote 1200 in term 1; famine brought the state down in no game.
- Hover then spend: lost the vote in no game; famine brought the state down in no game.

## The tuning run

Values were tuned against seeds 1 to 300, with the quicker comparisons on seeds 1 to 100 or 1 to
200 and the values set in the file between runs.

### Tuning: Republic of Tavara, seeds 1-300, up to 4 terms

| Player | Games | Won | Still in office | Lost the vote | Lost to famine | Terms served | Quarter of the win | Prosperity at the end |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- | --- |
| Does nothing | 300 | 0.0% | 0.0% | 3.3% | 96.7% | 1 / 1 / 2 | none | 13.2 / 19.1 / 20.4 |
| Popularity | 300 | 0.0% | 0.0% | 2.7% | 97.3% | 1 / 1 / 1 | none | 11.0 / 14.0 / 17.7 |
| Sensible | 300 | 0.0% | 0.0% | 100.0% | 0.0% | 1 / 1 / 4 | none | 28.0 / 34.2 / 34.5 |
| Chain builder | 300 | 45.7% | 0.0% | 54.3% | 0.0% | 1 / 2 / 4 | 36 / 51 / 68 | 20.2 / 41.9 / 43.7 |
| Sensible borrower | 300 | 61.7% | 0.0% | 38.3% | 0.0% | 1 / 2 / 3 | 33 / 37 / 53 | 23.0 / 43.0 / 43.6 |
| Reckless borrower | 300 | 5.3% | 0.0% | 94.7% | 0.0% | 1 / 1 / 2 | 32 / 39 / 39 | 28.8 / 39.6 / 44.3 |
| Relief only | 300 | 0.0% | 0.0% | 100.0% | 0.0% | 1 / 2 / 4 | none | 13.6 / 20.1 / 20.7 |
| Lowest tax | 300 | 0.0% | 0.0% | 40.7% | 59.3% | 1 / 1 / 2 | none | 11.1 / 14.5 / 18.9 |
| Says yes | 300 | 0.0% | 0.0% | 100.0% | 0.0% | 1 / 2 / 4 | none | 13.4 / 20.3 / 20.7 |
| Squeeze then spend | 300 | 0.0% | 9.7% | 90.0% | 0.3% | 1 / 3 / 4 | none | 13.2 / 19.7 / 20.4 |
| Power only | 300 | 0.0% | 0.0% | 100.0% | 0.0% | 1 / 1 / 3 | none | 32.8 / 37.9 / 38.6 |
| Chain by the quay | 300 | 44.0% | 0.0% | 56.0% | 0.0% | 1 / 2 / 3 | 33 / 36 / 57 | 25.1 / 41.6 / 42.7 |
| Borrow and build at once | 300 | 0.0% | 0.0% | 100.0% | 0.0% | 1 / 1 / 1 | none | 37.9 / 43.1 / 43.8 |
| Hover then spend | 300 | 0.0% | 31.7% | 68.3% | 0.0% | 2 / 4 / 4 | none | 14.0 / 20.0 / 21.2 |

| Player | Highest tier reached | Vote share at the last vote | Treasury at the end | Approval at the end |
| --- | --- | --- | --- | --- |
| Does nothing | Subsistence 100.0% | 45.7% / 47.6% / 51.9% | $0.0m / $0.3m / $2.0m | 41.3% / 47.0% / 49.9% |
| Popularity | Subsistence 100.0% | 40.5% / 44.8% / 48.9% | $0.0m / $2.8m / $2.8m | 41.4% / 50.2% / 54.1% |
| Sensible | Developing 100.0% | 36.8% / 47.2% / 49.9% | $0.0m / $0.4m / $0.9m | 36.6% / 47.9% / 51.8% |
| Chain builder | Subsistence 7.0%, Developing 27.3%, Industrialising 19.3%, Prosperous 46.3% | 35.2% / 49.5% / 57.9% | $0.0m / $0.9m / $63.0m | 33.2% / 45.1% / 52.9% |
| Sensible borrower | Subsistence 25.0%, Developing 2.3%, Industrialising 9.0%, Prosperous 63.7% | 37.8% / 50.8% / 57.0% | $0.0m / $9.0m / $57.1m | 34.3% / 45.2% / 52.7% |
| Reckless borrower | Industrialising 29.3%, Prosperous 70.7% | 10.5% / 19.7% / 54.5% | $0.0m / $0.5m / $100.3m | 12.5% / 19.3% / 52.6% |
| Relief only | Subsistence 100.0% | 35.3% / 48.1% / 49.9% | $0.0m / $0.3m / $63.7m | 34.8% / 48.8% / 52.5% |
| Lowest tax | Subsistence 100.0% | 35.5% / 48.1% / 56.3% | $0.0m / $0.2m / $0.4m | 37.6% / 48.1% / 52.8% |
| Says yes | Subsistence 100.0% | 29.7% / 48.1% / 49.9% | $0.0m / $29.5m / $123.2m | 31.6% / 48.9% / 52.5% |
| Squeeze then spend | Subsistence 100.0% | 42.0% / 49.0% / 54.3% | $117.9m / $314.8m / $521.7m | 43.9% / 50.5% / 52.7% |
| Power only | Developing 73.7%, Industrialising 26.3% | 38.3% / 47.0% / 49.9% | $0.0m / $0.5m / $0.9m | 38.3% / 47.7% / 51.5% |
| Chain by the quay | Subsistence 14.0%, Developing 7.3%, Industrialising 32.3%, Prosperous 46.3% | 35.6% / 49.5% / 57.4% | $0.0m / $0.8m / $65.3m | 30.3% / 43.7% / 52.6% |
| Borrow and build at once | Prosperous 100.0% | 27.0% / 33.6% / 42.1% | $0.0m / $0.8m / $60.2m | 28.5% / 33.7% / 41.7% |
| Hover then spend | Subsistence 100.0% | 34.7% / 48.6% / 56.8% | $0.0m / $0.4m / $0.9m | 33.3% / 48.8% / 55.3% |

| Player | Borrowed | Bailed out | Bailouts in a game | Win held back by the debt test | Debt burden at the end | Highest debt burden |
| --- | --- | ---: | --- | --- | --- | --- |
| Does nothing | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Popularity | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Sensible | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Chain builder | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Sensible borrower | $60.0m / $70.0m / $160.0m | 0.0% | none | never | 0% / 0% / 26% | 28% / 39% / 54% |
| Reckless borrower | $525.0m / $915.0m / $1055.0m | 76.7% | 1 / 1 / 1 | 67.0%, 16 of 201 won later, waiting 1 / 5 / 11 quarters | 2% / 25% / 478% | 218% / 773% / 1176% |
| Relief only | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Lowest tax | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Says yes | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Squeeze then spend | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Power only | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Chain by the quay | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Borrow and build at once | $965.0m / $1055.0m / $1195.0m | 0.0% | none | 100.0%, 0 of 300 won later, waiting 3 / 8 / 8 quarters | 45% / 111% / 252% | 104% / 242% / 405% |
| Hover then spend | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |

Spreads are least / middle / most. Won is the win on prosperity: Prosperous held for four quarters running, with the debt burden within the debt test as the hold completes. Still in office counts the games that had neither won nor lost when their terms were up. Vote share counts only the games that reached a vote. Bailed out counts the games in which a missed payment brought a bailout, and bailouts in a game counts them in those games. The win held back by the debt test counts the games in which prosperity was held long enough to win but the debt burden was over the limit, with how many of them were won once it passed and the quarters the win waited. The debt burden is what is owed against a year’s revenue.

- Does nothing: lost the vote 10 in term 1; famine brought the state down in The Dry East 153, Korr Highlands 78, Arden Vale 31, Salt Coast 28 (in quarter 8 / 8 / 32).
- Popularity: lost the vote 8 in term 1; famine brought the state down in The Dry East 152, Korr Highlands 64, Arden Vale 49, Salt Coast 27 (in quarter 8 / 8 / 20).
- Sensible: lost the vote 200 in term 1, 69 in term 2, 30 in term 3, 1 in term 4; famine brought the state down in no game.
- Chain builder: lost the vote 19 in term 1, 134 in term 2, 10 in term 3; famine brought the state down in no game.
- Sensible borrower: lost the vote 82 in term 1, 33 in term 2; famine brought the state down in no game.
- Reckless borrower: lost the vote 157 in term 1, 127 in term 2; famine brought the state down in no game.
- Relief only: lost the vote 90 in term 1, 121 in term 2, 79 in term 3, 10 in term 4; famine brought the state down in no game.
- Lowest tax: lost the vote 117 in term 1, 5 in term 2; famine brought the state down in The Dry East 68, Arden Vale 66, Korr Highlands 33, Salt Coast 11 (in quarter 8 / 16 / 40).
- Says yes: lost the vote 116 in term 1, 97 in term 2, 65 in term 3, 22 in term 4; famine brought the state down in no game.
- Squeeze then spend: lost the vote 85 in term 1, 60 in term 2, 55 in term 3, 70 in term 4; famine brought the state down in Korr Highlands 1 (in quarter 80 / 80 / 80).
- Power only: lost the vote 219 in term 1, 62 in term 2, 19 in term 3; famine brought the state down in no game.
- Chain by the quay: lost the vote 50 in term 1, 115 in term 2, 3 in term 3; famine brought the state down in no game.
- Borrow and build at once: lost the vote 300 in term 1; famine brought the state down in no game.
- Hover then spend: lost the vote 2 in term 2, 43 in term 3, 160 in term 4; famine brought the state down in no game.

### Before tuning: the values as #55 and #56 left them, seeds 1-300

The same players and run on the values as they stood at the start of #57 (commit eefacdf). The
reckless borrower wins 37.3% of games, in quarter 31 in the middle, and a borrowing binge that
pays as it goes wins 15.3%, all of it before the first vote.

| Player | Games | Won | Still in office | Lost the vote | Lost to famine | Terms served | Quarter of the win | Prosperity at the end |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- | --- |
| Does nothing | 300 | 0.0% | 0.0% | 3.3% | 96.7% | 1 / 1 / 2 | none | 13.2 / 19.1 / 20.4 |
| Popularity | 300 | 0.0% | 0.0% | 2.7% | 97.3% | 1 / 1 / 1 | none | 11.0 / 14.0 / 17.7 |
| Sensible | 300 | 0.0% | 0.0% | 100.0% | 0.0% | 1 / 1 / 4 | none | 28.0 / 34.2 / 34.5 |
| Chain builder | 300 | 45.7% | 0.0% | 54.3% | 0.0% | 1 / 2 / 4 | 36 / 51 / 68 | 20.2 / 41.9 / 43.7 |
| Sensible borrower | 300 | 61.7% | 0.0% | 38.3% | 0.0% | 1 / 2 / 3 | 33 / 37 / 53 | 23.0 / 43.0 / 43.6 |
| Reckless borrower | 300 | 37.3% | 0.0% | 62.7% | 0.0% | 1 / 1 / 2 | 26 / 31 / 39 | 28.8 / 43.0 / 44.3 |
| Relief only | 300 | 0.0% | 0.0% | 100.0% | 0.0% | 1 / 2 / 4 | none | 13.6 / 20.1 / 20.7 |
| Lowest tax | 300 | 0.0% | 0.0% | 40.7% | 59.3% | 1 / 1 / 2 | none | 11.1 / 14.5 / 18.9 |
| Says yes | 300 | 0.0% | 0.0% | 100.0% | 0.0% | 1 / 2 / 4 | none | 13.4 / 20.3 / 20.7 |
| Squeeze then spend | 300 | 0.0% | 9.7% | 90.0% | 0.3% | 1 / 3 / 4 | none | 13.2 / 19.7 / 20.4 |
| Power only | 300 | 0.0% | 0.0% | 100.0% | 0.0% | 1 / 1 / 3 | none | 32.8 / 37.9 / 38.6 |
| Chain by the quay | 300 | 44.0% | 0.0% | 56.0% | 0.0% | 1 / 2 / 3 | 33 / 36 / 57 | 25.1 / 41.6 / 42.7 |
| Borrow and build at once | 300 | 15.3% | 0.0% | 84.7% | 0.0% | 1 / 1 / 1 | 12 / 17 / 19 | 37.9 / 43.1 / 43.8 |
| Hover then spend | 300 | 0.0% | 31.7% | 68.3% | 0.0% | 2 / 4 / 4 | none | 14.0 / 20.0 / 21.2 |

| Player | Highest tier reached | Vote share at the last vote | Treasury at the end | Approval at the end |
| --- | --- | --- | --- | --- |
| Does nothing | Subsistence 100.0% | 45.7% / 47.6% / 51.9% | $0.0m / $0.3m / $2.0m | 41.3% / 47.0% / 49.9% |
| Popularity | Subsistence 100.0% | 40.5% / 44.8% / 48.9% | $0.0m / $2.8m / $2.8m | 41.4% / 50.2% / 54.1% |
| Sensible | Developing 100.0% | 36.8% / 47.2% / 49.9% | $0.0m / $0.4m / $0.9m | 36.6% / 47.9% / 51.8% |
| Chain builder | Subsistence 7.0%, Developing 27.3%, Industrialising 19.3%, Prosperous 46.3% | 35.2% / 49.5% / 57.9% | $0.0m / $0.9m / $63.0m | 33.2% / 45.1% / 52.9% |
| Sensible borrower | Subsistence 25.0%, Developing 2.3%, Industrialising 9.0%, Prosperous 63.7% | 37.8% / 50.8% / 57.0% | $0.0m / $9.0m / $57.1m | 34.3% / 45.2% / 52.7% |
| Reckless borrower | Industrialising 29.3%, Prosperous 70.7% | 13.9% / 48.3% / 55.5% | $0.0m / $0.4m / $50.8m | 15.0% / 30.4% / 52.6% |
| Relief only | Subsistence 100.0% | 35.3% / 48.1% / 49.9% | $0.0m / $0.3m / $63.7m | 34.8% / 48.8% / 52.5% |
| Lowest tax | Subsistence 100.0% | 35.5% / 48.1% / 56.3% | $0.0m / $0.2m / $0.4m | 37.6% / 48.1% / 52.8% |
| Says yes | Subsistence 100.0% | 29.7% / 48.1% / 49.9% | $0.0m / $29.5m / $123.2m | 31.6% / 48.9% / 52.5% |
| Squeeze then spend | Subsistence 100.0% | 42.0% / 49.0% / 54.3% | $117.9m / $314.8m / $521.7m | 43.9% / 50.5% / 52.7% |
| Power only | Developing 73.7%, Industrialising 26.3% | 38.3% / 47.0% / 49.9% | $0.0m / $0.5m / $0.9m | 38.3% / 47.7% / 51.5% |
| Chain by the quay | Subsistence 14.0%, Developing 7.3%, Industrialising 32.3%, Prosperous 46.3% | 35.6% / 49.5% / 57.4% | $0.0m / $0.8m / $65.3m | 30.3% / 43.7% / 52.6% |
| Borrow and build at once | Prosperous 100.0% | 27.0% / 33.2% / 42.1% | $0.0m / $0.9m / $179.3m | 23.1% / 32.9% / 41.7% |
| Hover then spend | Subsistence 100.0% | 34.7% / 48.6% / 56.8% | $0.0m / $0.4m / $0.9m | 33.3% / 48.8% / 55.3% |

| Player | Borrowed | Bailed out | Bailouts in a game | Win held back by the debt test | Debt burden at the end | Highest debt burden |
| --- | --- | ---: | --- | --- | --- | --- |
| Does nothing | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Popularity | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Sensible | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Chain builder | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Sensible borrower | $60.0m / $70.0m / $160.0m | 0.0% | none | never | 0% / 0% / 26% | 28% / 39% / 54% |
| Reckless borrower | $525.0m / $875.0m / $1040.0m | 76.7% | 1 / 1 / 1 | 67.0%, 112 of 201 won later, waiting 1 / 7 / 10 quarters | 2% / 38% / 478% | 218% / 773% / 1176% |
| Relief only | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Lowest tax | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Says yes | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Squeeze then spend | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Power only | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Chain by the quay | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Borrow and build at once | $695.0m / $1050.0m / $1195.0m | 0.0% | none | 97.7%, 39 of 293 won later, waiting 1 / 8 / 8 quarters | 42% / 104% / 252% | 91% / 222% / 405% |
| Hover then spend | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |

Spreads are least / middle / most. Won is the win on prosperity: Prosperous held for four quarters running, with the debt burden within the debt test as the hold completes. Still in office counts the games that had neither won nor lost when their terms were up. Vote share counts only the games that reached a vote. Bailed out counts the games in which a missed payment brought a bailout, and bailouts in a game counts them in those games. The win held back by the debt test counts the games in which prosperity was held long enough to win but the debt burden was over the limit, with how many of them were won once it passed and the quarters the win waited. The debt burden is what is owed against a year’s revenue.

- Does nothing: lost the vote 10 in term 1; famine brought the state down in The Dry East 153, Korr Highlands 78, Arden Vale 31, Salt Coast 28 (in quarter 8 / 8 / 32).
- Popularity: lost the vote 8 in term 1; famine brought the state down in The Dry East 152, Korr Highlands 64, Arden Vale 49, Salt Coast 27 (in quarter 8 / 8 / 20).
- Sensible: lost the vote 200 in term 1, 69 in term 2, 30 in term 3, 1 in term 4; famine brought the state down in no game.
- Chain builder: lost the vote 19 in term 1, 134 in term 2, 10 in term 3; famine brought the state down in no game.
- Sensible borrower: lost the vote 82 in term 1, 33 in term 2; famine brought the state down in no game.
- Reckless borrower: lost the vote 157 in term 1, 31 in term 2; famine brought the state down in no game.
- Relief only: lost the vote 90 in term 1, 121 in term 2, 79 in term 3, 10 in term 4; famine brought the state down in no game.
- Lowest tax: lost the vote 117 in term 1, 5 in term 2; famine brought the state down in The Dry East 68, Arden Vale 66, Korr Highlands 33, Salt Coast 11 (in quarter 8 / 16 / 40).
- Says yes: lost the vote 116 in term 1, 97 in term 2, 65 in term 3, 22 in term 4; famine brought the state down in no game.
- Squeeze then spend: lost the vote 85 in term 1, 60 in term 2, 55 in term 3, 70 in term 4; famine brought the state down in Korr Highlands 1 (in quarter 80 / 80 / 80).
- Power only: lost the vote 219 in term 1, 62 in term 2, 19 in term 3; famine brought the state down in no game.
- Chain by the quay: lost the vote 50 in term 1, 115 in term 2, 3 in term 3; famine brought the state down in no game.
- Borrow and build at once: lost the vote 254 in term 1; famine brought the state down in no game.
- Hover then spend: lost the vote 2 in term 2, 43 in term 3, 160 in term 4; famine brought the state down in no game.

## What was changed

Only data was changed, both values in `src/sim/balance.ts`. No rule of the simulation was
touched, and neither country file was.

| Value | From | To | Why |
| --- | --- | --- | --- |
| `finance.bailout.approvalPermille` | -80 | -120 | The blow a bailout deals approval in every region: 8 points before, 12 now. On the values as they stood the reckless borrower was bailed out in 76.7% of the tuning games and still won 37.3%: about half its games survived the first vote, and most of those went on to win in the second term. Neither change alone was enough on seeds 1 to 100: a debt test of 25% with the old blow left it 33.0%, and a blow of 15 points with the old test 10.0%. |
| `victory.debtBurdenLimitPermille` | 500 | 300 | The win's debt test: half a year's revenue before, three tenths now. At half, a binge that borrows everything the lenders allow in the first year, builds every site at once and taxes hard to repay passed the test before the first vote in 15.3% of the tuning games, in quarters 12 to 19. At three tenths it is still over the limit when the term ends, and it loses the vote. With both changes the reckless borrower's wins wait for the debt to come down until its second vote, which it usually loses. A sensible borrower's debt burden at the win is within both limits. |

Left as they were: every loan and bond on the menu and its rate; the credit rating's steps,
their limits and the score's weights; the bailout loan's rate and term; austerity's length, tax
floor and caps; the starting debt limits; and every value Phase 2 tuned.

## What the runs showed

**Borrowing sensibly wins more often, and sooner.** The sensible borrower wins 68.5% of the
confirmation games against the chain builder's 44.3%, in quarter 37 in the middle against 50,
and no win later than quarter 53. It borrows $70.0m in the middle of its games and $175.0m at
most, so that the port, the trunk road and the mine are started in the first two years and the
mine earns before the second vote, which is the vote the chain builder loses (573 of its 1,200
games). The price is paid in the first term: on seed 6, for one, the repayments hold the tax
near 27% for three years before the mine earns, and over the confirmation run it loses its
first vote in 272 games against the chain builder's 75. It was never bailed out, and its debt
burden never passed 54% of a year's revenue nor stood above 28% at the end of a game, so the
debt test never held back one of its wins.

**Borrowing recklessly is bailed out and rarely wins.** The reckless borrower is bailed out in
80.6% of games and wins 7.3%. It builds every site in its first year or two, so its prosperity
ends near 40 and three games in four reach Prosperous; but it borrows $957.5m in the middle of
its games, at its worst its debt stands at several years' revenue at the low tax it keeps, a
bailout's 12-point blow lands before the vote, and it loses the vote in 561 games of 1,200 in its
first term and 552 in its second. In 836 games the debt test held back a win it had otherwise
earned; it won 87 of those once the debt came down.

**A borrowing binge that pays as it goes wins nothing.** The probe that borrows everything the
lenders allow and builds everything at once, but taxes to repay, reaches Prosperous in every
game, but the debt test holds its win back in every game and it loses every first vote, with a
vote share of 34.1% in the middle: its taxes and the tiers it passes in a hurry cost it the
public. On the values as #55 and #56 left them it won 15.3% of the tuning games, before the first
vote, which is the win bought with a borrowing binge that the debt test exists to stop.

**The earlier dominant strategies are still closed.** Every player that never borrows plays
exactly as in Phase 2, and its figures on the confirmation seeds are the same: hover then spend,
Phase 1's dominant strategy, is re-elected in every one-term game but wins none over four terms
(30.3% still in office after twenty years); squeeze then spend keeps office in 9.8% of games and
wins none; the do-nothing and popularity players still lose almost every game to famine. Power
alone wins nothing, and the chain through the quay still wins nearly as often as the full chain
(42.1%). Borrowing adds no trick that wins on its own: the reckless borrower wins 7.3% and the
binge 0.0%. No player wins every game.

**The balance is steep in approval, as before.** The bailout's blow and the debt test were the
only values that moved the borrowers without touching the players that never borrow. The
sensible borrower's result rests on its own habit of keeping repayments within 15% of a quarter's
revenue: allowed 20% it won 43.0% on seeds 1 to 100, and 12% 53.0%. A player that borrows more
than it can repay from the quarter's revenue raises its tax and loses the first vote.

**Testland is not balanced, and was left alone.** It now starts the game in debt, owing $11.0m
on two loans, 55% of a year's revenue, which opens it at BBB. Every one of its 16,800
confirmation games ran to an ending without error, bailouts included: the lowest-tax player is
bailed out in every game, the popularity player in 14.1%, the sensible borrower in 28.1% (it
borrows on top of the starting debt) and the reckless borrower in 12.0%. Power alone still wins
most games (91.8%, against 95.2% in Phase 2) and no other player wins more than 2.8%.

### Attempt log

The tuning, in the order it was done, on Tavara over four terms.

1. Values as #55 and #56 left them, with a first draft of the two new players on seeds 1 to 100.
   The sensible borrower built in the chain builder's order (power first) and allowed itself
   debts up to 70% of a year's revenue and repayments up to 30% of a quarter's: it won 16.0%,
   losing its first vote in 84 games of 100, against the chain builder's 50.0%. Borrowing let it
   build sooner, but the repayments kept the tax near 27% before anything paid off, and the
   tiers it passed early lowered the approval baseline before the vote. The reckless borrower,
   which then set the tax to pay the building but not the repayments, won 50.0% and was bailed
   out in 54.0% of games, some of its wins coming as early as quarter 14.
2. The sensible borrower's habits, on seeds 1 to 100. Building the mine's chain first, so that
   the mine's revenue comes in to repay the loans, and paying a site's first instalment from the
   money borrowed for it: 26.0%. Limiting repayments to 15% of a quarter's revenue: 64.0% (12%:
   53.0%; 20%: 43.0%; 15% with power first: 45.0%). With repayments limited, its limit on the
   debt made no difference anywhere from 40% to 100% of a year's revenue; 50% was kept.
3. The credit rating's weight on the debt burden raised from 400 to 600, the bailout loan at 12%
   over 12 quarters and a blow of 12 points, against that first reckless borrower: 47.0%, with
   wins in quarters 13 to 28 and bailouts in 2.0% of games, since it rolled its short loans over
   and taxed hard. Lowering the lenders' limits as well (at AA, A, BB and B to 35%, 50%, 20% and
   10% of a year's revenue) made it win 98.0%: what a binge cannot borrow it does not have to
   repay, and the debt test passes sooner. Both were dropped.
4. The reckless borrower made reckless: the tax set as if nothing were owed or being built. On
   the values as #55 and #56 left them it won 44.0% and was bailed out in 84.0% of games; most
   of its wins came in its second term, after a bailout in its first and a narrow vote. The first
   draft was kept as the probe player that borrows and builds at once.
5. One value at a time against the reckless borrower, seeds 1 to 100: a bailout blow of 15
   points, 10.0%; austerity for 12 quarters, 45.0%; both, 31.0% (longer austerity keeps the tax
   up and probably repays the bailout loan sooner); the debt test at 25%, 33.0%; a blow of 15
   points, austerity for 12 quarters and the debt test at 30%, 6.0%; a blow of 12 points and the
   debt test at 30%, 6.0%.
6. The two smallest candidates on seeds 1 to 200 with every player: a blow of 15 points alone
   gave the reckless borrower 10.0% and the binge that pays as it goes 14.0%, all of its wins
   before the first vote; a blow of 12 points and the debt test at 30% gave 5.5% and 0.0%. The
   second was kept: the debt test is what the design meant to stop a win bought with a borrowing
   binge, and at 50% it did not. The sensible borrower won 63.0% under both, and the players
   that never borrow were unchanged.
7. The sensible borrower held to the new debt test's 30% instead of half a year's revenue: 58.5%
   on seeds 1 to 200 against 63.0%. It was left at half: what it owes is mostly repaid before it
   reaches Prosperous.

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

```powershell
$env:BALANCE_PLAYERS = 'Chain builder,Sensible borrower,Reckless borrower'; $env:BALANCE_COUNTRY = 'tavara'; $env:BALANCE_SEEDS = '1-100'; npm run balance
```

The first is the tuning run; the before-tuning run is the same command on the values of commit
eefacdf. The second is the confirmation run, on 1,200 seeds that played no part in the tuning.
The third plays one term, as Phase 1 did, for the check on hover then spend. The fourth is the
shape of the quicker comparisons. Each run shares its games out among worker processes; the
report is the same however many play it. The tuning run took about 7 minutes on a
20-processor machine, and the confirmation run about 45 minutes.

## Playing it

[The README](../../README.md#a-phase-3-play-through) gives one command that opens the finished
Phase 3 game on seed 6, where the chain builder loses its second vote, the sensible borrower wins
in quarter 36 and the reckless borrower is bailed out and loses its first vote, with the steps
the sensible borrower took.
