# Phase 4 balance

Recorded 2026-11-21, for issue #73. The figures below come from the scripted players in
`tests/balance/players.ts`, played through whole games of up to four terms on the countries as
they ship, with the trade of issues #66 to #69, the trade routes of #70, the floods of #71 and the
world price shocks of #72. The Phase 3 record, which this follows, is [phase-3.md](phase-3.md).

## Targets

These are the targets proposed in issue #73. The owner accepted these results as recorded on
2026-11-21, including the two targets for world price shocks that values alone did not meet. They apply to the real country, Tavara, over games of up to four terms. Where
the issue left a target without a figure, the figure used to judge it is given in brackets.

| Target | Result on the confirmation run | Met |
| --- | --- | --- |
| The timing trader beats the same strategy without trade (by 10 points of wins or more) | The timing trader wins 90.3%, in quarter 31 in the middle; the chain builder, which plays the same but never trades, 53.5%, in quarter 38 | Yes |
| A price shock is survivable when prepared for (it costs a player that prepares for it no more than 3 points of wins) | Against the same 1,200 games without world price shocks, the timing trader, which stocks the reserve before failed harvests abroad, wins 1.5 points more with them (90.3% against 88.8%). The borrower wary of gluts, which holds off borrowing while an ore glut is announced or in force, wins 4.6 points fewer (61.7% against 66.3%), more than the sensible borrower, which ignores them, loses. No game was lost to famine or bailed out in Tavara by any of them | Partly |
| A price shock is punishing when ignored (it costs a player that ignores it 5 points of wins or more) | Against the same games without shocks, the trader blind to them wins 2.1 points more, the chain builder 1.9 more, the sensible borrower 2.2 fewer, and the player who relies on the mine none in either (0.0%). Not met, and not by any value tried: see below | No |
| No player wins every game | The best of the eight players in the balance's own set, the timing trader, wins 90.3%; the best of the probes (`BALANCE_PLAYERS=all`), the trader blind to shocks, 90.9% | Yes |
| The player who does nothing almost never wins | Wins 0.0% (95.7% lost to famine, 4.3% at the vote) | Yes |
| The player who spends everything on popularity almost never wins | Wins 0.0% (97.8% lost to famine, 2.2% at the vote) | Yes |

**No value was changed.** Every other target is met on the values as #66 to #72 left them. The
targets on price shocks are not: on Tavara's values a world price shock barely moves anyone's
chance of winning, preparing for one as the scripted players do pays nothing, and no value of
the shocks tried (larger, likelier or longer shocks) made ignoring one cost more than preparing
for it. Meeting them needs more than values: see What the runs showed. The owner should decide
whether the target, or the game, should change. Testland, the
crude second country, has no targets; every one of its 21,600 confirmation games ran to an ending
without error, every player's included.

## How a game is played and scored

As in Phase 3: a game is played until it is won, lost, or four terms (80 quarters) are up, and a
game still being played then is **still in office**. Won is the win on prosperity, with the debt
test passed as the four-quarter hold completes.

The report gained a fourth table, for trade and shocks:

- **Grain imported** and **grain exported**: what each game bought and sold abroad, in
  thousands of tonnes.
- **Trade income** and **trade spending**: what the grain sold brought in, and what the grain
  bought cost, over the game.
- **Failed harvests abroad met**, **ore gluts met**, **droughts met** and **floods met**: the
  share of games that met at least one, and how many each game met. A world price shock is met
  when it moves its price while the game is played; a drought or flood when it begins in a
  region. A game that ends early meets fewer.

`BALANCE_SHOCKS=none` plays the same games with no world price shock: the shocks have draws of
their own, keyed on the seed and the quarter, so the weather, events and world markets of a seed
stay as they were, and the difference between the two runs is what the shocks did.

## The players

The six players of Phase 3 play exactly as before. Two join them in the balance's own set:

| Player | How it plays |
| --- | --- |
| Timing trader | Plays as the chain builder does in everything but trade: it decides the budget, relief, the sites it starts and the dilemmas' answers exactly as the chain builder would, and then trades grain. It keeps the national reserve at a quarter above its safe level. Above that, it sells the surplus whenever the world grain price is at or above its usual $240, as much as the trade links carry. Below it, it buys up to it when grain is cheap (at $216 or less, nine tenths of the usual price) or failed harvests abroad are announced and still to come, with no more than half the money free to spend; and when the reserve is below its safe level while a region goes hungry, it buys up to the safe level at any price with all the money free. It never borrows. |
| Mine only | Plays as the chain builder does, but builds the mine with its trunk road and port and then the small sites, and no power. It never trades. |

Two probe players join the one-lever players (`BALANCE_PLAYERS=all`), each a twin that differs
from a player above only in how it meets a world price shock:

| Player | How it plays |
| --- | --- |
| Trader blind to shocks | The timing trader, but it pays no heed to failed harvests abroad until they move the price: it does not stock up while they are announced. |
| Borrower wary of gluts | The sensible borrower, but it borrows nothing while an ore glut is announced or in force, and saves instead. The README's advice is not to borrow against the mine before its ore cheapens. |

Because the timing trader's decisions apart from trade are the chain builder's, the two differ
only by trade and by what trade does to the treasury and the reserve, which the chain builder's
rules then answer to: the comparison between them is the worth of trading.

## The confirmation run

### Confirmation: Republic of Tavara, seeds 1001-2200, up to 4 terms

| Player | Games | Won | Still in office | Lost the vote | Lost to famine | Terms served | Quarter of the win | Prosperity at the end |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- | --- |
| Does nothing | 1200 | 0.0% | 0.0% | 4.3% | 95.7% | 1 / 1 / 2 | none | 14.1 / 19.1 / 20.4 |
| Popularity | 1200 | 0.0% | 0.0% | 2.2% | 97.8% | 1 / 1 / 1 | none | 7.2 / 13.8 / 18.0 |
| Sensible | 1200 | 0.0% | 0.0% | 100.0% | 0.0% | 1 / 2 / 4 | none | 25.5 / 34.1 / 34.5 |
| Chain builder | 1200 | 53.5% | 0.0% | 46.5% | 0.0% | 1 / 2 / 4 | 32 / 38 / 69 | 21.0 / 42.1 / 44.2 |
| Sensible borrower | 1200 | 64.1% | 0.0% | 35.9% | 0.0% | 1 / 2 / 3 | 31 / 36 / 53 | 20.5 / 42.7 / 44.0 |
| Reckless borrower | 1200 | 9.2% | 0.0% | 90.8% | 0.0% | 1 / 2 / 2 | 32 / 34 / 39 | 27.9 / 39.6 / 44.4 |
| Timing trader | 1200 | 90.3% | 0.0% | 9.8% | 0.0% | 1 / 2 / 3 | 27 / 31 / 57 | 24.7 / 43.4 / 44.4 |
| Mine only | 1200 | 0.0% | 0.4% | 99.5% | 0.1% | 1 / 2 / 4 | none | 19.3 / 38.3 / 40.6 |
| Relief only | 1200 | 0.0% | 0.0% | 99.8% | 0.3% | 1 / 2 / 4 | none | 9.9 / 19.9 / 20.6 |
| Lowest tax | 1200 | 0.0% | 0.0% | 43.4% | 56.6% | 1 / 1 / 2 | none | 5.6 / 13.8 / 18.9 |
| Says yes | 1200 | 0.0% | 0.1% | 99.6% | 0.3% | 1 / 2 / 4 | none | 6.9 / 20.0 / 20.6 |
| Squeeze then spend | 1200 | 0.0% | 5.6% | 93.6% | 0.8% | 1 / 3 / 4 | none | 8.4 / 19.0 / 20.4 |
| Power only | 1200 | 0.0% | 0.0% | 100.0% | 0.0% | 1 / 1 / 4 | none | 30.8 / 37.9 / 38.7 |
| Chain by the quay | 1200 | 50.9% | 0.0% | 49.1% | 0.0% | 1 / 2 / 3 | 29 / 36 / 59 | 23.2 / 41.9 / 43.2 |
| Borrow and build at once | 1200 | 0.0% | 0.0% | 100.0% | 0.0% | 1 / 1 / 1 | none | 36.7 / 43.0 / 44.2 |
| Borrower wary of gluts | 1200 | 61.7% | 0.0% | 38.3% | 0.0% | 1 / 2 / 3 | 31 / 37 / 57 | 20.5 / 42.6 / 44.0 |
| Trader blind to shocks | 1200 | 90.9% | 0.0% | 9.1% | 0.0% | 1 / 2 / 3 | 27 / 31 / 57 | 24.7 / 43.4 / 44.4 |
| Hover then spend | 1200 | 0.0% | 20.4% | 79.4% | 0.2% | 2 / 4 / 4 | none | 9.9 / 19.6 / 21.3 |

| Player | Highest tier reached | Vote share at the last vote | Treasury at the end | Approval at the end |
| --- | --- | --- | --- | --- |
| Does nothing | Subsistence 100.0% | 40.3% / 45.7% / 50.3% | $0.0m / $0.3m / $2.0m | 40.0% / 46.9% / 49.9% |
| Popularity | Subsistence 100.0% | 38.3% / 43.4% / 47.4% | $0.0m / $2.8m / $2.9m | 35.3% / 49.6% / 54.6% |
| Sensible | Developing 100.0% | 16.0% / 47.4% / 49.9% | $0.0m / $0.4m / $0.9m | 19.0% / 47.8% / 52.4% |
| Chain builder | Subsistence 6.5%, Developing 13.3%, Industrialising 17.3%, Prosperous 62.9% | 31.5% / 50.3% / 59.8% | $0.0m / $5.0m / $86.0m | 24.3% / 44.6% / 52.9% |
| Sensible borrower | Subsistence 17.6%, Developing 11.6%, Industrialising 3.7%, Prosperous 67.2% | 37.3% / 51.1% / 58.4% | $0.0m / $13.5m / $108.6m | 32.6% / 45.1% / 52.9% |
| Reckless borrower | Industrialising 18.2%, Prosperous 81.8% | 8.7% / 21.1% / 58.4% | $0.0m / $0.6m / $128.7m | 8.1% / 20.4% / 52.8% |
| Timing trader | Subsistence 0.6%, Developing 6.9%, Industrialising 0.9%, Prosperous 91.6% | 36.3% / 53.9% / 62.4% | $0.0m / $84.8m / $244.0m | 28.4% / 45.0% / 52.8% |
| Mine only | Subsistence 22.8%, Developing 12.5%, Industrialising 64.8% | 25.1% / 47.6% / 51.0% | $0.0m / $0.4m / $31.6m | 27.3% / 48.0% / 52.7% |
| Relief only | Subsistence 100.0% | 23.0% / 47.7% / 51.8% | $0.0m / $0.3m / $67.0m | 24.9% / 48.1% / 52.9% |
| Lowest tax | Subsistence 100.0% | 34.9% / 47.0% / 56.9% | $0.0m / $0.2m / $0.4m | 34.6% / 46.8% / 53.7% |
| Says yes | Subsistence 100.0% | 25.9% / 47.7% / 52.8% | $0.0m / $30.8m / $162.3m | 19.1% / 48.5% / 52.7% |
| Squeeze then spend | Subsistence 100.0% | 38.2% / 48.5% / 54.8% | $133.0m / $328.8m / $734.2m | 13.3% / 49.7% / 52.8% |
| Power only | Developing 56.1%, Industrialising 43.9% | 30.1% / 47.5% / 49.9% | $0.0m / $0.4m / $1.0m | 28.8% / 48.0% / 52.6% |
| Chain by the quay | Subsistence 7.7%, Developing 12.3%, Industrialising 19.3%, Prosperous 60.7% | 31.3% / 50.1% / 59.2% | $0.0m / $3.4m / $100.3m | 29.7% / 43.9% / 52.9% |
| Borrow and build at once | Prosperous 100.0% | 21.0% / 34.0% / 45.3% | $0.0m / $0.9m / $176.1m | 22.1% / 33.9% / 45.7% |
| Borrower wary of gluts | Subsistence 18.6%, Developing 11.4%, Industrialising 5.3%, Prosperous 64.8% | 37.3% / 51.0% / 58.4% | $0.0m / $11.8m / $108.6m | 32.6% / 45.4% / 52.9% |
| Trader blind to shocks | Subsistence 0.6%, Developing 6.3%, Industrialising 1.1%, Prosperous 92.0% | 36.3% / 54.0% / 62.4% | $0.0m / $86.7m / $295.3m | 28.4% / 44.9% / 52.9% |
| Hover then spend | Subsistence 100.0% | 17.6% / 47.4% / 59.6% | $0.0m / $0.4m / $82.5m | 18.1% / 47.5% / 58.5% |

| Player | Borrowed | Bailed out | Bailouts in a game | Win held back by the debt test | Debt burden at the end | Highest debt burden |
| --- | --- | ---: | --- | --- | --- | --- |
| Does nothing | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Popularity | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Sensible | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Chain builder | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Sensible borrower | $45.0m / $70.0m / $160.0m | 0.0% | none | 0.5%, 6 of 6 won later, waiting 1 / 1 / 1 quarters | 0% / 0% / 28% | 22% / 39% / 55% |
| Reckless borrower | $525.0m / $965.0m / $1105.0m | 78.2% | 1 / 1 / 1 | 74.1%, 110 of 889 won later, waiting 1 / 5 / 14 quarters | 0% / 28% / 702% | 184% / 793% / 1172% |
| Timing trader | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Mine only | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Relief only | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Lowest tax | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Says yes | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Squeeze then spend | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Power only | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Chain by the quay | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Borrow and build at once | $935.0m / $1050.0m / $1260.0m | 0.0% | none | 100.0%, 0 of 1200 won later, waiting 2 / 8 / 8 quarters | 25% / 120% / 552% | 94% / 242% / 578% |
| Borrower wary of gluts | $10.0m / $70.0m / $150.0m | 0.0% | none | 0.4%, 5 of 5 won later, waiting 1 / 1 / 1 quarters | 0% / 0% / 49% | 8% / 39% / 54% |
| Trader blind to shocks | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Hover then spend | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |

| Player | Grain imported | Grain exported | Trade income | Trade spending | Failed harvests abroad met | Ore gluts met | Droughts met | Floods met |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Does nothing | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 31.1%, 0 / 0 / 3 | 37.3%, 0 / 0 / 3 | 97.6%, 0 / 2 / 5 | 57.5%, 0 / 1 / 5 |
| Popularity | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 28.4%, 0 / 0 / 3 | 35.2%, 0 / 0 / 3 | 95.3%, 0 / 2 / 5 | 57.7%, 0 / 1 / 5 |
| Sensible | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 67.8%, 0 / 1 / 6 | 74.6%, 0 / 1 / 7 | 99.3%, 0 / 5 / 18 | 89.8%, 0 / 2 / 12 |
| Chain builder | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 77.2%, 0 / 1 / 5 | 84.0%, 0 / 2 / 6 | 100.0%, 1 / 7 / 16 | 96.9%, 0 / 3 / 9 |
| Sensible borrower | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 68.4%, 0 / 1 / 4 | 77.1%, 0 / 1 / 4 | 99.5%, 0 / 5 / 15 | 92.3%, 0 / 2 / 9 |
| Reckless borrower | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 68.4%, 0 / 1 / 5 | 74.5%, 0 / 1 / 4 | 99.0%, 0 / 5 / 15 | 91.3%, 0 / 2 / 9 |
| Timing trader | 0kt / 79kt / 393kt | 90kt / 879kt / 1888kt | $18.1m / $188.6m / $430.0m | $0.0m / $18.4m / $110.1m | 69.8%, 0 / 1 / 4 | 77.3%, 0 / 1 / 4 | 99.8%, 0 / 5 / 14 | 94.5%, 0 / 2 / 9 |
| Mine only | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 74.9%, 0 / 1 / 6 | 82.8%, 0 / 2 / 7 | 99.8%, 0 / 7 / 19 | 93.9%, 0 / 3 / 12 |
| Relief only | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 76.2%, 0 / 1 / 5 | 83.1%, 0 / 2 / 7 | 99.5%, 0 / 7 / 18 | 94.8%, 0 / 3 / 10 |
| Lowest tax | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 48.2%, 0 / 0 / 3 | 56.1%, 0 / 1 / 3 | 98.9%, 0 / 3 / 7 | 78.3%, 0 / 1 / 5 |
| Says yes | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 75.6%, 0 / 1 / 6 | 82.4%, 0 / 2 / 7 | 99.5%, 0 / 7 / 22 | 93.8%, 0 / 3 / 12 |
| Squeeze then spend | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 82.0%, 0 / 2 / 7 | 85.3%, 0 / 2 / 7 | 99.3%, 0 / 9 / 22 | 94.8%, 0 / 4 / 12 |
| Power only | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 65.2%, 0 / 1 / 6 | 73.3%, 0 / 1 / 6 | 99.1%, 0 / 5 / 20 | 88.6%, 0 / 2 / 12 |
| Chain by the quay | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 71.9%, 0 / 1 / 5 | 78.5%, 0 / 1 / 6 | 99.8%, 0 / 6 / 14 | 93.8%, 0 / 3 / 10 |
| Borrow and build at once | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 52.1%, 0 / 1 / 3 | 60.7%, 0 / 1 / 3 | 97.6%, 0 / 3 / 9 | 81.9%, 0 / 1 / 7 |
| Borrower wary of gluts | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 68.8%, 0 / 1 / 4 | 77.1%, 0 / 1 / 5 | 99.5%, 0 / 5 / 15 | 92.3%, 0 / 2 / 9 |
| Trader blind to shocks | 0kt / 44kt / 381kt | 90kt / 864kt / 1755kt | $18.1m / $186.8m / $397.2m | $0.0m / $9.4m / $83.4m | 69.8%, 0 / 1 / 4 | 77.3%, 0 / 1 / 4 | 99.8%, 0 / 5 / 14 | 94.5%, 0 / 2 / 9 |
| Hover then spend | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 94.4%, 0 / 2 / 7 | 97.1%, 0 / 3 / 8 | 100.0%, 3 / 13 / 22 | 99.8%, 0 / 6 / 14 |

Spreads are least / middle / most. Won is the win on prosperity: Prosperous held for four quarters running, with the debt burden within the debt test as the hold completes. Still in office counts the games that had neither won nor lost when their terms were up. Vote share counts only the games that reached a vote. Bailed out counts the games in which a missed payment brought a bailout, and bailouts in a game counts them in those games. The win held back by the debt test counts the games in which prosperity was held long enough to win but the debt burden was over the limit, with how many of them were won once it passed and the quarters the win waited. The debt burden is what is owed against a year’s revenue. Grain is in thousands of tonnes (kt) over the game. A shock met is a world price shock that moved its price, or a drought or flood that began in a region, while the game was played: the share of games that met one, then how many each game met.

- Does nothing: lost the vote 52 in term 1; famine brought the state down in The Dry East 602, Korr Highlands 334, Salt Coast 108, Arden Vale 104 (in quarter 8 / 8 / 24).
- Popularity: lost the vote 26 in term 1; famine brought the state down in The Dry East 585, Korr Highlands 264, Arden Vale 175, Salt Coast 97, South Delta 43, Lowmere Plains 10 (in quarter 8 / 8 / 20).
- Sensible: lost the vote 599 in term 1, 327 in term 2, 207 in term 3, 67 in term 4; famine brought the state down in no game.
- Chain builder: lost the vote 91 in term 1, 445 in term 2, 21 in term 3, 1 in term 4; famine brought the state down in no game.
- Sensible borrower: lost the vote 350 in term 1, 81 in term 2; famine brought the state down in no game.
- Reckless borrower: lost the vote 477 in term 1, 613 in term 2; famine brought the state down in no game.
- Timing trader: lost the vote 83 in term 1, 33 in term 2, 1 in term 3; famine brought the state down in no game.
- Mine only: lost the vote 289 in term 1, 595 in term 2, 162 in term 3, 148 in term 4; famine brought the state down in The Dry East 1 (in quarter 76 / 76 / 76).
- Relief only: lost the vote 246 in term 1, 570 in term 2, 338 in term 3, 43 in term 4; famine brought the state down in Korr Highlands 2, Salt Coast 1 (in quarter 58 / 60 / 76).
- Lowest tax: lost the vote 511 in term 1, 10 in term 2; famine brought the state down in The Dry East 255, Arden Vale 246, Korr Highlands 108, Salt Coast 62, South Delta 8 (in quarter 8 / 16 / 40).
- Says yes: lost the vote 337 in term 1, 357 in term 2, 361 in term 3, 140 in term 4; famine brought the state down in Korr Highlands 3, South Delta 1 (in quarter 58 / 74 / 79).
- Squeeze then spend: lost the vote 255 in term 1, 230 in term 2, 293 in term 3, 345 in term 4; famine brought the state down in Korr Highlands 5, South Delta 2, Arden Vale 1, The Dry East 1, Salt Coast 1 (in quarter 58 / 76 / 80).
- Power only: lost the vote 652 in term 1, 357 in term 2, 153 in term 3, 38 in term 4; famine brought the state down in no game.
- Chain by the quay: lost the vote 210 in term 1, 371 in term 2, 8 in term 3; famine brought the state down in no game.
- Borrow and build at once: lost the vote 1200 in term 1; famine brought the state down in no game.
- Borrower wary of gluts: lost the vote 356 in term 1, 103 in term 2, 1 in term 3; famine brought the state down in no game.
- Trader blind to shocks: lost the vote 77 in term 1, 31 in term 2, 1 in term 3; famine brought the state down in no game.
- Hover then spend: lost the vote 21 in term 2, 208 in term 3, 724 in term 4; famine brought the state down in Korr Highlands 2 (in quarter 68 / 72 / 76).

### Confirmation: Testland, seeds 1001-2200, up to 4 terms

| Player | Games | Won | Still in office | Lost the vote | Lost to famine | Terms served | Quarter of the win | Prosperity at the end |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- | --- |
| Does nothing | 1200 | 0.0% | 0.0% | 2.2% | 97.8% | 1 / 1 / 4 | none | 10.6 / 22.8 / 26.5 |
| Popularity | 1200 | 0.0% | 0.0% | 0.3% | 99.8% | 1 / 1 / 4 | none | 6.9 / 19.7 / 25.5 |
| Sensible | 1200 | 0.0% | 0.0% | 99.8% | 0.3% | 1 / 2 / 4 | none | 14.8 / 37.9 / 41.2 |
| Chain builder | 1200 | 0.0% | 0.0% | 97.9% | 2.1% | 1 / 2 / 4 | none | 12.0 / 29.2 / 35.9 |
| Sensible borrower | 1200 | 0.0% | 0.0% | 98.7% | 1.3% | 1 / 2 / 4 | none | 7.0 / 26.0 / 38.5 |
| Reckless borrower | 1200 | 0.0% | 0.0% | 99.8% | 0.2% | 1 / 1 / 2 | none | 14.3 / 30.8 / 49.6 |
| Timing trader | 1200 | 0.0% | 0.2% | 99.1% | 0.8% | 1 / 2 / 4 | none | 12.0 / 28.8 / 35.9 |
| Mine only | 1200 | 0.0% | 0.0% | 97.2% | 2.8% | 1 / 2 / 4 | none | 6.3 / 25.0 / 35.7 |
| Relief only | 1200 | 0.0% | 9.3% | 6.8% | 83.9% | 1 / 4 / 4 | none | 9.0 / 13.7 / 25.4 |
| Lowest tax | 1200 | 0.0% | 1.2% | 14.7% | 84.2% | 1 / 3 / 4 | none | 4.4 / 9.7 / 24.5 |
| Says yes | 1200 | 0.0% | 9.9% | 9.8% | 80.3% | 1 / 4 / 4 | none | 9.0 / 13.6 / 25.5 |
| Squeeze then spend | 1200 | 0.0% | 0.3% | 71.7% | 28.1% | 1 / 2 / 4 | none | 6.1 / 23.9 / 25.4 |
| Power only | 1200 | 55.8% | 0.0% | 44.0% | 0.3% | 1 / 1 / 3 | 19 / 19 / 55 | 13.4 / 42.0 / 50.7 |
| Chain by the quay | 1200 | 0.5% | 0.0% | 98.2% | 1.3% | 1 / 2 / 4 | 58 / 58 / 58 | 13.4 / 30.9 / 44.6 |
| Borrow and build at once | 1200 | 0.1% | 0.0% | 99.9% | 0.0% | 1 / 1 / 2 | 39 / 39 / 39 | 28.2 / 50.9 / 54.2 |
| Borrower wary of gluts | 1200 | 0.0% | 0.0% | 98.5% | 1.5% | 1 / 2 / 4 | none | 7.0 / 25.9 / 38.5 |
| Trader blind to shocks | 1200 | 0.0% | 0.2% | 99.0% | 0.8% | 1 / 2 / 4 | none | 12.0 / 28.7 / 35.9 |
| Hover then spend | 1200 | 0.0% | 37.6% | 11.3% | 51.1% | 1 / 4 / 4 | none | 9.8 / 21.4 / 27.5 |

| Player | Highest tier reached | Vote share at the last vote | Treasury at the end | Approval at the end |
| --- | --- | --- | --- | --- |
| Does nothing | Subsistence 100.0% | 42.2% / 58.7% / 65.6% | $7.0m / $13.8m / $68.6m | 34.9% / 55.8% / 59.5% |
| Popularity | Subsistence 100.0% | 45.1% / 61.4% / 70.3% | $0.0m / $1.2m / $23.6m | 36.0% / 55.6% / 67.6% |
| Sensible | Developing 0.2%, Industrialising 99.8% | 7.3% / 38.6% / 53.6% | $0.0m / $0.3m / $0.8m | 9.4% / 38.7% / 52.9% |
| Chain builder | Subsistence 13.9%, Developing 86.1% | 3.5% / 35.3% / 65.3% | $0.0m / $0.3m / $0.9m | 2.9% / 34.5% / 52.6% |
| Sensible borrower | Subsistence 65.5%, Developing 31.3%, Industrialising 3.3% | 0.0% / 35.4% / 68.3% | $0.0m / $0.3m / $19.6m | 0.0% / 34.8% / 52.7% |
| Reckless borrower | Subsistence 8.0%, Developing 64.6%, Industrialising 15.3%, Prosperous 12.1% | 9.1% / 41.6% / 49.9% | $0.0m / $0.4m / $35.5m | 11.8% / 42.0% / 52.9% |
| Timing trader | Subsistence 16.1%, Developing 83.9% | 4.8% / 34.9% / 66.1% | $0.0m / $0.3m / $3.6m | 1.8% / 34.8% / 55.1% |
| Mine only | Subsistence 87.9%, Developing 11.9%, Industrialising 0.2% | 3.8% / 35.0% / 70.1% | $0.0m / $0.2m / $1.2m | 2.6% / 33.8% / 52.7% |
| Relief only | Subsistence 100.0% | 39.2% / 60.5% / 71.0% | $0.0m / $0.2m / $7.6m | 33.2% / 48.7% / 62.3% |
| Lowest tax | Subsistence 100.0% | 27.5% / 56.9% / 67.2% | $0.0m / $0.3m / $2.4m | 28.2% / 45.6% / 58.4% |
| Says yes | Subsistence 100.0% | 36.3% / 59.1% / 71.0% | $0.0m / $0.2m / $1.3m | 27.2% / 47.6% / 62.3% |
| Squeeze then spend | Subsistence 100.0% | 30.4% / 49.0% / 58.3% | $34.2m / $71.3m / $144.9m | 0.0% / 48.6% / 52.8% |
| Power only | Subsistence 13.9%, Developing 25.0%, Industrialising 2.1%, Prosperous 59.0% | 3.5% / 44.6% / 63.1% | $0.0m / $2.2m / $12.8m | 3.5% / 44.1% / 53.5% |
| Chain by the quay | Subsistence 13.9%, Developing 48.1%, Industrialising 36.9%, Prosperous 1.1% | 3.5% / 36.0% / 61.0% | $0.0m / $0.3m / $5.2m | 3.5% / 35.4% / 52.6% |
| Borrow and build at once | Developing 0.7%, Industrialising 38.1%, Prosperous 61.3% | 12.8% / 38.4% / 50.5% | $0.0m / $6.9m / $35.2m | 12.4% / 38.2% / 52.0% |
| Borrower wary of gluts | Subsistence 67.4%, Developing 30.0%, Industrialising 2.6% | 0.0% / 35.4% / 68.3% | $0.0m / $0.3m / $19.6m | 0.0% / 34.8% / 52.7% |
| Trader blind to shocks | Subsistence 20.3%, Developing 79.7% | 3.7% / 35.2% / 65.0% | $0.0m / $0.3m / $3.6m | 1.8% / 35.3% / 55.1% |
| Hover then spend | Subsistence 100.0% | 23.0% / 58.2% / 72.2% | $0.0m / $0.1m / $58.9m | 10.1% / 48.9% / 67.3% |

| Player | Borrowed | Bailed out | Bailouts in a game | Win held back by the debt test | Debt burden at the end | Highest debt burden |
| --- | --- | ---: | --- | --- | --- | --- |
| Does nothing | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 8% | 55% / 55% / 55% |
| Popularity | $0.0m / $0.0m / $0.0m | 21.0% | 1 / 1 / 1 | never | 0% / 0% / 29% | 188% / 188% / 188% |
| Sensible | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 55% / 55% / 55% |
| Chain builder | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 55% / 55% / 55% |
| Sensible borrower | $0.0m / $20.0m / $60.0m | 32.5% | 1 / 1 / 1 | never | 0% / 54% / 385% | 55% / 91% / 385% |
| Reckless borrower | $80.0m / $150.0m / $325.0m | 19.8% | 1 / 1 / 1 | never | 0% / 59% / 731% | 119% / 506% / 731% |
| Timing trader | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 55% / 55% / 55% |
| Mine only | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 55% / 55% / 55% |
| Relief only | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 55% / 55% / 55% |
| Lowest tax | $0.0m / $0.0m / $0.0m | 100.0% | 1 / 1 / 1 | never | 0% / 0% / 30% | 188% / 188% / 188% |
| Says yes | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 55% / 55% / 55% |
| Squeeze then spend | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 55% / 55% / 55% |
| Power only | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 55% / 55% / 55% |
| Chain by the quay | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 55% / 55% / 55% |
| Borrow and build at once | $95.0m / $160.0m / $335.0m | 7.4% | 1 / 1 / 1 | 4.4%, 1 of 53 won later, waiting 1 / 8 / 16 quarters | 17% / 109% / 673% | 76% / 146% / 893% |
| Borrower wary of gluts | $0.0m / $20.0m / $60.0m | 30.0% | 1 / 1 / 1 | never | 0% / 53% / 385% | 55% / 83% / 385% |
| Trader blind to shocks | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 55% / 55% / 55% |
| Hover then spend | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 55% / 55% / 55% |

| Player | Grain imported | Grain exported | Trade income | Trade spending | Failed harvests abroad met | Ore gluts met | Droughts met | Floods met |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Does nothing | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 50.5%, 0 / 1 / 5 | 52.2%, 0 / 1 / 5 | 93.3%, 0 / 1 / 2 | 48.8%, 0 / 0 / 4 |
| Popularity | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 50.6%, 0 / 1 / 5 | 52.9%, 0 / 1 / 5 | 92.2%, 0 / 1 / 3 | 49.4%, 0 / 0 / 4 |
| Sensible | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 81.8%, 0 / 1 / 6 | 81.0%, 0 / 1 / 6 | 94.8%, 0 / 2 / 9 | 82.0%, 0 / 1 / 6 |
| Chain builder | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 82.0%, 0 / 2 / 6 | 83.5%, 0 / 2 / 7 | 92.9%, 0 / 3 / 10 | 88.3%, 0 / 1 / 6 |
| Sensible borrower | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 85.3%, 0 / 2 / 6 | 85.3%, 0 / 2 / 6 | 94.1%, 0 / 3 / 10 | 84.4%, 0 / 1 / 6 |
| Reckless borrower | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 65.8%, 0 / 1 / 5 | 66.8%, 0 / 1 / 4 | 83.3%, 0 / 1 / 5 | 63.2%, 0 / 1 / 4 |
| Timing trader | 0kt / 15kt / 83kt | 5kt / 33kt / 95kt | $1.0m / $7.1m / $20.6m | $0.0m / $3.5m / $17.9m | 81.3%, 0 / 2 / 6 | 80.4%, 0 / 1 / 7 | 92.2%, 0 / 3 / 9 | 86.0%, 0 / 1 / 6 |
| Mine only | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 86.9%, 0 / 2 / 6 | 87.7%, 0 / 2 / 6 | 95.3%, 0 / 3 / 10 | 86.8%, 0 / 2 / 6 |
| Relief only | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 92.8%, 0 / 2 / 7 | 93.6%, 0 / 2 / 8 | 99.1%, 0 / 4 / 11 | 93.3%, 0 / 2 / 7 |
| Lowest tax | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 89.9%, 0 / 2 / 7 | 90.2%, 0 / 2 / 7 | 98.2%, 0 / 3 / 9 | 91.5%, 0 / 2 / 6 |
| Says yes | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 93.3%, 0 / 3 / 7 | 94.3%, 0 / 3 / 8 | 99.3%, 0 / 4 / 11 | 93.8%, 0 / 2 / 6 |
| Squeeze then spend | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 83.7%, 0 / 2 / 6 | 84.5%, 0 / 2 / 7 | 93.2%, 0 / 3 / 9 | 78.2%, 0 / 1 / 6 |
| Power only | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 68.0%, 0 / 1 / 5 | 68.7%, 0 / 1 / 6 | 79.1%, 0 / 1 / 8 | 61.2%, 0 / 1 / 5 |
| Chain by the quay | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 80.8%, 0 / 1 / 6 | 81.7%, 0 / 1 / 6 | 92.1%, 0 / 2 / 9 | 83.7%, 0 / 1 / 6 |
| Borrow and build at once | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 61.8%, 0 / 1 / 4 | 62.0%, 0 / 1 / 4 | 76.0%, 0 / 1 / 6 | 55.5%, 0 / 1 / 4 |
| Borrower wary of gluts | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 85.5%, 0 / 2 / 6 | 85.3%, 0 / 2 / 6 | 94.3%, 0 / 3 / 10 | 84.6%, 0 / 1 / 6 |
| Trader blind to shocks | 0kt / 8kt / 83kt | 5kt / 31kt / 87kt | $1.0m / $6.5m / $20.7m | $0.0m / $1.6m / $17.9m | 81.3%, 0 / 1 / 6 | 78.9%, 0 / 1 / 6 | 91.0%, 0 / 2 / 9 | 84.1%, 0 / 1 / 6 |
| Hover then spend | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 95.8%, 0 / 3 / 8 | 96.5%, 0 / 3 / 8 | 99.8%, 0 / 4 / 11 | 94.6%, 0 / 3 / 7 |

Spreads are least / middle / most. Won is the win on prosperity: Prosperous held for four quarters running, with the debt burden within the debt test as the hold completes. Still in office counts the games that had neither won nor lost when their terms were up. Vote share counts only the games that reached a vote. Bailed out counts the games in which a missed payment brought a bailout, and bailouts in a game counts them in those games. The win held back by the debt test counts the games in which prosperity was held long enough to win but the debt burden was over the limit, with how many of them were won once it passed and the quarters the win waited. The debt burden is what is owed against a year’s revenue. Grain is in thousands of tonnes (kt) over the game. A shock met is a world price shock that moved its price, or a drought or flood that began in a region, while the game was played: the share of games that met one, then how many each game met.

- Does nothing: lost the vote 20 in term 1, 6 in term 2; famine brought the state down in Sandreach 1078, Northfield 96 (in quarter 8 / 16 / 72).
- Popularity: lost the vote 3 in term 1; famine brought the state down in Sandreach 1034, Northfield 163 (in quarter 8 / 16 / 72).
- Sensible: lost the vote 339 in term 1, 523 in term 2, 334 in term 3, 1 in term 4; famine brought the state down in Sandreach 2, Northfield 1 (in quarter 52 / 60 / 60).
- Chain builder: lost the vote 301 in term 1, 443 in term 2, 377 in term 3, 54 in term 4; famine brought the state down in Sandreach 18, Northfield 7 (in quarter 28 / 58 / 80).
- Sensible borrower: lost the vote 145 in term 1, 685 in term 2, 337 in term 3, 17 in term 4; famine brought the state down in Northfield 8, Sandreach 8 (in quarter 28 / 59 / 80).
- Reckless borrower: lost the vote 913 in term 1, 285 in term 2; famine brought the state down in Sandreach 2 (in quarter 20 / 20 / 20).
- Timing trader: lost the vote 364 in term 1, 417 in term 2, 329 in term 3, 79 in term 4; famine brought the state down in Northfield 5, Sandreach 4 (in quarter 44 / 60 / 80).
- Mine only: lost the vote 112 in term 1, 546 in term 2, 460 in term 3, 48 in term 4; famine brought the state down in Sandreach 21, Northfield 13 (in quarter 28 / 58 / 80).
- Relief only: lost the vote 12 in term 2, 31 in term 3, 38 in term 4; famine brought the state down in Northfield 519, Sandreach 488 (in quarter 12 / 61 / 80).
- Lowest tax: lost the vote 25 in term 1, 75 in term 2, 50 in term 3, 26 in term 4; famine brought the state down in Northfield 539, Sandreach 471 (in quarter 12 / 55 / 80).
- Says yes: lost the vote 16 in term 2, 39 in term 3, 62 in term 4; famine brought the state down in Northfield 495, Sandreach 469 (in quarter 16 / 64 / 80).
- Squeeze then spend: lost the vote 204 in term 1, 442 in term 2, 198 in term 3, 16 in term 4; famine brought the state down in Northfield 175, Sandreach 162 (in quarter 16 / 53 / 80).
- Power only: lost the vote 309 in term 1, 191 in term 2, 28 in term 3; famine brought the state down in Sandreach 3 (in quarter 28 / 28 / 39).
- Chain by the quay: lost the vote 301 in term 1, 602 in term 2, 272 in term 3, 3 in term 4; famine brought the state down in Sandreach 11, Northfield 5 (in quarter 28 / 52 / 76).
- Borrow and build at once: lost the vote 1131 in term 1, 68 in term 2; famine brought the state down in no game.
- Borrower wary of gluts: lost the vote 135 in term 1, 676 in term 2, 353 in term 3, 18 in term 4; famine brought the state down in Sandreach 10, Northfield 8 (in quarter 28 / 59 / 80).
- Trader blind to shocks: lost the vote 424 in term 1, 430 in term 2, 290 in term 3, 44 in term 4; famine brought the state down in Northfield 5, Sandreach 5 (in quarter 44 / 60 / 80).
- Hover then spend: lost the vote 3 in term 2, 32 in term 3, 101 in term 4; famine brought the state down in Northfield 319, Sandreach 294 (in quarter 18 / 69 / 80).

### Confirmation without shocks: Republic of Tavara, seeds 1001-2200, up to 4 terms, without world price shocks

| Player | Games | Won | Still in office | Lost the vote | Lost to famine | Terms served | Quarter of the win | Prosperity at the end |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- | --- |
| Chain builder | 1200 | 51.6% | 0.0% | 48.4% | 0.0% | 1 / 2 / 4 | 32 / 38 / 69 | 21.0 / 42.1 / 44.2 |
| Timing trader | 1200 | 88.8% | 0.0% | 11.3% | 0.0% | 1 / 2 / 3 | 27 / 32 / 57 | 24.7 / 43.5 / 44.6 |
| Trader blind to shocks | 1200 | 88.8% | 0.0% | 11.3% | 0.0% | 1 / 2 / 3 | 27 / 32 / 57 | 24.7 / 43.5 / 44.6 |
| Sensible borrower | 1200 | 66.3% | 0.0% | 33.7% | 0.0% | 1 / 2 / 3 | 31 / 36 / 53 | 20.8 / 42.9 / 44.1 |
| Borrower wary of gluts | 1200 | 66.3% | 0.0% | 33.7% | 0.0% | 1 / 2 / 3 | 31 / 36 / 53 | 20.8 / 42.9 / 44.1 |
| Mine only | 1200 | 0.0% | 1.8% | 98.2% | 0.1% | 1 / 2 / 4 | none | 19.3 / 38.2 / 40.9 |

| Player | Highest tier reached | Vote share at the last vote | Treasury at the end | Approval at the end |
| --- | --- | --- | --- | --- |
| Chain builder | Subsistence 6.4%, Developing 14.3%, Industrialising 16.0%, Prosperous 63.3% | 30.3% / 50.1% / 59.7% | $0.0m / $3.4m / $80.4m | 30.1% / 44.9% / 52.9% |
| Timing trader | Subsistence 0.6%, Developing 7.0%, Industrialising 1.8%, Prosperous 90.7% | 32.4% / 53.7% / 62.6% | $0.0m / $68.1m / $243.0m | 29.6% / 45.1% / 52.9% |
| Trader blind to shocks | Subsistence 0.6%, Developing 7.0%, Industrialising 1.8%, Prosperous 90.7% | 32.4% / 53.7% / 62.6% | $0.0m / $68.1m / $243.0m | 29.6% / 45.1% / 52.9% |
| Sensible borrower | Subsistence 15.9%, Developing 10.8%, Industrialising 3.2%, Prosperous 70.2% | 38.0% / 51.2% / 59.3% | $0.0m / $14.4m / $85.3m | 34.7% / 45.4% / 52.7% |
| Borrower wary of gluts | Subsistence 15.9%, Developing 10.8%, Industrialising 3.2%, Prosperous 70.2% | 38.0% / 51.2% / 59.3% | $0.0m / $14.4m / $85.3m | 34.7% / 45.4% / 52.7% |
| Mine only | Subsistence 23.4%, Developing 11.8%, Industrialising 64.8% | 26.8% / 47.7% / 52.7% | $0.0m / $0.5m / $32.1m | 27.5% / 48.1% / 52.8% |

| Player | Borrowed | Bailed out | Bailouts in a game | Win held back by the debt test | Debt burden at the end | Highest debt burden |
| --- | --- | ---: | --- | --- | --- | --- |
| Chain builder | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Timing trader | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Trader blind to shocks | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Sensible borrower | $45.0m / $70.0m / $150.0m | 0.0% | none | 0.8%, 10 of 10 won later, waiting 1 / 1 / 1 quarters | 0% / 0% / 28% | 22% / 39% / 53% |
| Borrower wary of gluts | $45.0m / $70.0m / $150.0m | 0.0% | none | 0.8%, 10 of 10 won later, waiting 1 / 1 / 1 quarters | 0% / 0% / 28% | 22% / 39% / 53% |
| Mine only | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |

| Player | Grain imported | Grain exported | Trade income | Trade spending | Failed harvests abroad met | Ore gluts met | Droughts met | Floods met |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Chain builder | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 0.0%, 0 / 0 / 0 | 0.0%, 0 / 0 / 0 | 100.0%, 1 / 7 / 16 | 97.1%, 0 / 3 / 9 |
| Timing trader | 0kt / 55kt / 406kt | 0kt / 762kt / 1590kt | $0.0m / $157.4m / $323.3m | $0.0m / $11.9m / $91.5m | 0.0%, 0 / 0 / 0 | 0.0%, 0 / 0 / 0 | 99.8%, 0 / 6 / 14 | 94.5%, 0 / 2 / 9 |
| Trader blind to shocks | 0kt / 55kt / 406kt | 0kt / 762kt / 1590kt | $0.0m / $157.4m / $323.3m | $0.0m / $11.9m / $91.5m | 0.0%, 0 / 0 / 0 | 0.0%, 0 / 0 / 0 | 99.8%, 0 / 6 / 14 | 94.5%, 0 / 2 / 9 |
| Sensible borrower | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 0.0%, 0 / 0 / 0 | 0.0%, 0 / 0 / 0 | 99.6%, 0 / 5 / 15 | 92.7%, 0 / 2 / 9 |
| Borrower wary of gluts | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 0.0%, 0 / 0 / 0 | 0.0%, 0 / 0 / 0 | 99.6%, 0 / 5 / 15 | 92.7%, 0 / 2 / 9 |
| Mine only | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 0.0%, 0 / 0 / 0 | 0.0%, 0 / 0 / 0 | 99.8%, 0 / 7 / 20 | 93.8%, 0 / 3 / 14 |

Spreads are least / middle / most. Won is the win on prosperity: Prosperous held for four quarters running, with the debt burden within the debt test as the hold completes. Still in office counts the games that had neither won nor lost when their terms were up. Vote share counts only the games that reached a vote. Bailed out counts the games in which a missed payment brought a bailout, and bailouts in a game counts them in those games. The win held back by the debt test counts the games in which prosperity was held long enough to win but the debt burden was over the limit, with how many of them were won once it passed and the quarters the win waited. The debt burden is what is owed against a year’s revenue. Grain is in thousands of tonnes (kt) over the game. A shock met is a world price shock that moved its price, or a drought or flood that began in a region, while the game was played: the share of games that met one, then how many each game met.

- Chain builder: lost the vote 91 in term 1, 471 in term 2, 19 in term 3; famine brought the state down in no game.
- Timing trader: lost the vote 80 in term 1, 54 in term 2, 1 in term 3; famine brought the state down in no game.
- Trader blind to shocks: lost the vote 80 in term 1, 54 in term 2, 1 in term 3; famine brought the state down in no game.
- Sensible borrower: lost the vote 317 in term 1, 87 in term 2; famine brought the state down in no game.
- Borrower wary of gluts: lost the vote 317 in term 1, 87 in term 2; famine brought the state down in no game.
- Mine only: lost the vote 292 in term 1, 554 in term 2, 148 in term 3, 184 in term 4; famine brought the state down in The Dry East 1 (in quarter 76 / 76 / 76).

### Confirmation, one term: Republic of Tavara, seeds 1001-2200, up to 1 term

| Player | Games | Won | Still in office | Lost the vote | Lost to famine | Terms served | Quarter of the win | Prosperity at the end |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- | --- |
| Does nothing | 1200 | 0.0% | 0.1% | 4.3% | 95.6% | 1 / 1 / 1 | none | 14.1 / 19.1 / 20.4 |
| Popularity | 1200 | 0.0% | 0.0% | 2.2% | 97.8% | 1 / 1 / 1 | none | 7.2 / 13.8 / 18.0 |
| Sensible | 1200 | 0.0% | 50.1% | 49.9% | 0.0% | 1 / 1 / 1 | none | 28.1 / 34.2 / 34.4 |
| Chain builder | 1200 | 0.0% | 92.4% | 7.6% | 0.0% | 1 / 1 / 1 | none | 20.6 / 29.3 / 30.8 |
| Sensible borrower | 1200 | 0.0% | 70.8% | 29.2% | 0.0% | 1 / 1 / 1 | none | 20.5 / 27.9 / 33.5 |
| Reckless borrower | 1200 | 0.0% | 60.3% | 39.8% | 0.0% | 1 / 1 / 1 | none | 32.8 / 43.9 / 44.5 |
| Timing trader | 1200 | 0.0% | 93.1% | 6.9% | 0.0% | 1 / 1 / 1 | none | 22.8 / 32.6 / 37.6 |
| Mine only | 1200 | 0.0% | 75.9% | 24.1% | 0.0% | 1 / 1 / 1 | none | 19.3 / 25.5 / 33.3 |
| Relief only | 1200 | 0.0% | 79.5% | 20.5% | 0.0% | 1 / 1 / 1 | none | 14.3 / 20.6 / 20.6 |
| Lowest tax | 1200 | 0.0% | 10.6% | 42.6% | 46.8% | 1 / 1 / 1 | none | 6.6 / 14.3 / 18.9 |
| Says yes | 1200 | 0.0% | 71.9% | 28.1% | 0.0% | 1 / 1 / 1 | none | 14.4 / 20.6 / 20.6 |
| Squeeze then spend | 1200 | 0.0% | 78.8% | 21.3% | 0.0% | 1 / 1 / 1 | none | 14.2 / 20.4 / 20.4 |
| Power only | 1200 | 0.0% | 45.7% | 54.3% | 0.0% | 1 / 1 / 1 | none | 31.9 / 37.9 / 38.6 |
| Chain by the quay | 1200 | 0.0% | 82.5% | 17.5% | 0.0% | 1 / 1 / 1 | none | 22.5 / 28.8 / 36.3 |
| Borrow and build at once | 1200 | 0.0% | 0.0% | 100.0% | 0.0% | 1 / 1 / 1 | none | 36.7 / 43.0 / 44.2 |
| Borrower wary of gluts | 1200 | 0.0% | 70.3% | 29.7% | 0.0% | 1 / 1 / 1 | none | 20.5 / 27.8 / 33.4 |
| Trader blind to shocks | 1200 | 0.0% | 93.6% | 6.4% | 0.0% | 1 / 1 / 1 | none | 22.8 / 32.7 / 37.7 |
| Hover then spend | 1200 | 0.0% | 100.0% | 0.0% | 0.0% | 1 / 1 / 1 | none | 15.0 / 21.2 / 21.9 |

| Player | Highest tier reached | Vote share at the last vote | Treasury at the end | Approval at the end |
| --- | --- | --- | --- | --- |
| Does nothing | Subsistence 100.0% | 40.3% / 45.7% / 50.3% | $0.0m / $0.3m / $2.0m | 40.0% / 46.9% / 49.9% |
| Popularity | Subsistence 100.0% | 38.3% / 43.4% / 47.4% | $0.0m / $2.8m / $2.9m | 35.3% / 49.6% / 54.6% |
| Sensible | Developing 100.0% | 36.6% / 50.0% / 58.0% | $0.0m / $0.4m / $0.9m | 38.6% / 50.2% / 55.8% |
| Chain builder | Subsistence 93.4%, Developing 6.6% | 46.3% / 53.4% / 59.8% | $0.0m / $0.4m / $0.9m | 47.6% / 53.5% / 58.2% |
| Sensible borrower | Subsistence 75.7%, Developing 24.3% | 41.6% / 51.4% / 58.4% | $0.0m / $0.5m / $11.3m | 42.6% / 51.5% / 57.0% |
| Reckless borrower | Industrialising 18.3%, Prosperous 81.7% | 9.7% / 51.1% / 58.4% | $0.0m / $0.4m / $128.7m | 11.6% / 51.5% / 56.6% |
| Timing trader | Subsistence 24.4%, Developing 75.6% | 45.6% / 54.1% / 62.4% | $0.0m / $0.3m / $63.9m | 47.1% / 54.1% / 62.3% |
| Mine only | Subsistence 94.8%, Developing 5.3% | 43.0% / 51.8% / 58.7% | $0.0m / $0.4m / $0.9m | 43.6% / 51.8% / 56.4% |
| Relief only | Subsistence 100.0% | 43.6% / 51.9% / 57.5% | $0.0m / $11.3m / $67.0m | 44.2% / 52.0% / 55.0% |
| Lowest tax | Subsistence 100.0% | 38.0% / 47.0% / 56.9% | $0.0m / $0.2m / $0.4m | 36.4% / 47.5% / 54.5% |
| Says yes | Subsistence 100.0% | 42.3% / 51.3% / 57.0% | $0.1m / $43.4m / $133.9m | 44.8% / 51.5% / 55.0% |
| Squeeze then spend | Subsistence 100.0% | 43.8% / 52.0% / 58.2% | $116.0m / $181.3m / $245.7m | 46.6% / 51.8% / 55.2% |
| Power only | Developing 99.8%, Industrialising 0.2% | 36.0% / 49.7% / 56.5% | $0.0m / $0.4m / $1.0m | 39.0% / 49.7% / 54.7% |
| Chain by the quay | Subsistence 77.2%, Developing 22.8% | 41.9% / 52.5% / 59.2% | $0.0m / $0.5m / $0.9m | 41.3% / 52.6% / 57.1% |
| Borrow and build at once | Prosperous 100.0% | 21.0% / 34.0% / 45.3% | $0.0m / $0.9m / $176.1m | 22.1% / 33.9% / 45.7% |
| Borrower wary of gluts | Subsistence 77.6%, Developing 22.4% | 41.6% / 51.4% / 58.4% | $0.0m / $0.5m / $34.4m | 42.5% / 51.5% / 57.0% |
| Trader blind to shocks | Subsistence 24.2%, Developing 75.8% | 45.4% / 54.2% / 62.4% | $0.0m / $0.4m / $63.9m | 47.1% / 54.2% / 62.3% |
| Hover then spend | Subsistence 100.0% | 53.1% / 61.2% / 67.3% | $0.0m / $0.4m / $40.0m | 54.6% / 61.4% / 65.9% |

| Player | Borrowed | Bailed out | Bailouts in a game | Win held back by the debt test | Debt burden at the end | Highest debt burden |
| --- | --- | ---: | --- | --- | --- | --- |
| Does nothing | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Popularity | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Sensible | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Chain builder | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Sensible borrower | $45.0m / $70.0m / $90.0m | 0.0% | none | never | 0% / 0% / 16% | 22% / 39% / 39% |
| Reckless borrower | $525.0m / $875.0m / $1105.0m | 17.9% | 1 / 1 / 1 | 73.7%, 0 of 884 won later, waiting 1 / 2 / 3 quarters | 0% / 209% / 702% | 184% / 793% / 1172% |
| Timing trader | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Mine only | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Relief only | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Lowest tax | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Says yes | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Squeeze then spend | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Power only | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Chain by the quay | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Borrow and build at once | $935.0m / $1050.0m / $1260.0m | 0.0% | none | 100.0%, 0 of 1200 won later, waiting 2 / 8 / 8 quarters | 25% / 120% / 552% | 94% / 242% / 578% |
| Borrower wary of gluts | $10.0m / $70.0m / $95.0m | 0.0% | none | never | 0% / 0% / 54% | 8% / 39% / 54% |
| Trader blind to shocks | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Hover then spend | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |

| Player | Grain imported | Grain exported | Trade income | Trade spending | Failed harvests abroad met | Ore gluts met | Droughts met | Floods met |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Does nothing | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 31.1%, 0 / 0 / 3 | 37.3%, 0 / 0 / 3 | 97.6%, 0 / 2 / 5 | 57.5%, 0 / 1 / 5 |
| Popularity | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 28.4%, 0 / 0 / 3 | 35.2%, 0 / 0 / 3 | 95.3%, 0 / 2 / 5 | 57.7%, 0 / 1 / 5 |
| Sensible | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 52.1%, 0 / 1 / 3 | 60.7%, 0 / 1 / 3 | 97.6%, 0 / 3 / 9 | 81.9%, 0 / 1 / 7 |
| Chain builder | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 52.1%, 0 / 1 / 3 | 60.7%, 0 / 1 / 3 | 97.6%, 0 / 3 / 9 | 81.9%, 0 / 1 / 7 |
| Sensible borrower | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 52.1%, 0 / 1 / 3 | 60.7%, 0 / 1 / 3 | 97.6%, 0 / 3 / 9 | 81.9%, 0 / 1 / 7 |
| Reckless borrower | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 52.1%, 0 / 1 / 3 | 60.7%, 0 / 1 / 3 | 97.6%, 0 / 3 / 9 | 81.9%, 0 / 1 / 7 |
| Timing trader | 0kt / 38kt / 237kt | 0kt / 492kt / 922kt | $0.0m / $104.7m / $218.0m | $0.0m / $8.7m / $69.1m | 52.1%, 0 / 1 / 3 | 60.7%, 0 / 1 / 3 | 97.6%, 0 / 3 / 9 | 81.9%, 0 / 1 / 7 |
| Mine only | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 52.1%, 0 / 1 / 3 | 60.7%, 0 / 1 / 3 | 97.6%, 0 / 3 / 9 | 81.9%, 0 / 1 / 7 |
| Relief only | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 52.1%, 0 / 1 / 3 | 60.7%, 0 / 1 / 3 | 97.6%, 0 / 3 / 9 | 81.9%, 0 / 1 / 7 |
| Lowest tax | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 46.9%, 0 / 0 / 3 | 54.9%, 0 / 1 / 3 | 97.6%, 0 / 3 / 7 | 76.7%, 0 / 1 / 5 |
| Says yes | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 52.1%, 0 / 1 / 3 | 60.7%, 0 / 1 / 3 | 97.6%, 0 / 3 / 9 | 81.9%, 0 / 1 / 7 |
| Squeeze then spend | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 52.1%, 0 / 1 / 3 | 60.7%, 0 / 1 / 3 | 97.6%, 0 / 3 / 9 | 81.9%, 0 / 1 / 7 |
| Power only | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 52.1%, 0 / 1 / 3 | 60.7%, 0 / 1 / 3 | 97.6%, 0 / 3 / 9 | 81.9%, 0 / 1 / 7 |
| Chain by the quay | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 52.1%, 0 / 1 / 3 | 60.7%, 0 / 1 / 3 | 97.6%, 0 / 3 / 9 | 81.9%, 0 / 1 / 7 |
| Borrow and build at once | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 52.1%, 0 / 1 / 3 | 60.7%, 0 / 1 / 3 | 97.6%, 0 / 3 / 9 | 81.9%, 0 / 1 / 7 |
| Borrower wary of gluts | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 52.1%, 0 / 1 / 3 | 60.7%, 0 / 1 / 3 | 97.6%, 0 / 3 / 9 | 81.9%, 0 / 1 / 7 |
| Trader blind to shocks | 0kt / 17kt / 237kt | 0kt / 490kt / 945kt | $0.0m / $103.6m / $239.5m | $0.0m / $3.8m / $49.7m | 52.1%, 0 / 1 / 3 | 60.7%, 0 / 1 / 3 | 97.6%, 0 / 3 / 9 | 81.9%, 0 / 1 / 7 |
| Hover then spend | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 52.1%, 0 / 1 / 3 | 60.7%, 0 / 1 / 3 | 97.6%, 0 / 3 / 9 | 81.9%, 0 / 1 / 7 |

Spreads are least / middle / most. Won is the win on prosperity: Prosperous held for four quarters running, with the debt burden within the debt test as the hold completes. Still in office counts the games that had neither won nor lost when their terms were up. Vote share counts only the games that reached a vote. Bailed out counts the games in which a missed payment brought a bailout, and bailouts in a game counts them in those games. The win held back by the debt test counts the games in which prosperity was held long enough to win but the debt burden was over the limit, with how many of them were won once it passed and the quarters the win waited. The debt burden is what is owed against a year’s revenue. Grain is in thousands of tonnes (kt) over the game. A shock met is a world price shock that moved its price, or a drought or flood that began in a region, while the game was played: the share of games that met one, then how many each game met.

- Does nothing: lost the vote 52 in term 1; famine brought the state down in The Dry East 601, Korr Highlands 334, Salt Coast 108, Arden Vale 104 (in quarter 8 / 8 / 20).
- Popularity: lost the vote 26 in term 1; famine brought the state down in The Dry East 585, Korr Highlands 264, Arden Vale 175, Salt Coast 97, South Delta 43, Lowmere Plains 10 (in quarter 8 / 8 / 20).
- Sensible: lost the vote 599 in term 1; famine brought the state down in no game.
- Chain builder: lost the vote 91 in term 1; famine brought the state down in no game.
- Sensible borrower: lost the vote 350 in term 1; famine brought the state down in no game.
- Reckless borrower: lost the vote 477 in term 1; famine brought the state down in no game.
- Timing trader: lost the vote 83 in term 1; famine brought the state down in no game.
- Mine only: lost the vote 289 in term 1; famine brought the state down in no game.
- Relief only: lost the vote 246 in term 1; famine brought the state down in no game.
- Lowest tax: lost the vote 511 in term 1; famine brought the state down in Arden Vale 213, The Dry East 195, Korr Highlands 96, Salt Coast 50, South Delta 8 (in quarter 8 / 15 / 20).
- Says yes: lost the vote 337 in term 1; famine brought the state down in no game.
- Squeeze then spend: lost the vote 255 in term 1; famine brought the state down in no game.
- Power only: lost the vote 652 in term 1; famine brought the state down in no game.
- Chain by the quay: lost the vote 210 in term 1; famine brought the state down in no game.
- Borrow and build at once: lost the vote 1200 in term 1; famine brought the state down in no game.
- Borrower wary of gluts: lost the vote 356 in term 1; famine brought the state down in no game.
- Trader blind to shocks: lost the vote 77 in term 1; famine brought the state down in no game.
- Hover then spend: lost the vote in no game; famine brought the state down in no game.

## The tuning run

Values were judged against seeds 1 to 300, with the quicker comparisons on seeds 1 to 300 or 1
to 60 and the values set in the file between runs. Since no value was changed in the end, the
tuning run is also the run before tuning: the players of Phase 3 played it exactly as they did
on the values as #66 to #72 left them (run 1 of the attempt log).

### Tuning: Republic of Tavara, seeds 1-300, up to 4 terms

| Player | Games | Won | Still in office | Lost the vote | Lost to famine | Terms served | Quarter of the win | Prosperity at the end |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- | --- |
| Does nothing | 300 | 0.0% | 0.0% | 3.7% | 96.3% | 1 / 1 / 2 | none | 10.9 / 19.1 / 20.4 |
| Popularity | 300 | 0.0% | 0.0% | 2.3% | 97.7% | 1 / 1 / 1 | none | 7.9 / 13.8 / 17.7 |
| Sensible | 300 | 0.0% | 0.0% | 100.0% | 0.0% | 1 / 1 / 4 | none | 26.1 / 34.1 / 34.5 |
| Chain builder | 300 | 53.3% | 0.0% | 46.7% | 0.0% | 1 / 2 / 3 | 32 / 38 / 58 | 22.7 / 42.1 / 43.9 |
| Sensible borrower | 300 | 58.0% | 0.0% | 42.0% | 0.0% | 1 / 2 / 3 | 31 / 36 / 47 | 23.0 / 42.7 / 44.1 |
| Reckless borrower | 300 | 6.0% | 0.0% | 93.7% | 0.3% | 1 / 2 / 2 | 32 / 34 / 39 | 26.2 / 39.7 / 44.3 |
| Timing trader | 300 | 88.7% | 0.0% | 11.3% | 0.0% | 1 / 2 / 3 | 27 / 32 / 53 | 26.2 / 43.4 / 44.5 |
| Mine only | 300 | 0.0% | 0.7% | 99.3% | 0.0% | 1 / 2 / 4 | none | 18.9 / 38.0 / 40.4 |
| Relief only | 300 | 0.0% | 0.0% | 99.7% | 0.3% | 1 / 2 / 4 | none | 12.2 / 19.9 / 20.7 |
| Lowest tax | 300 | 0.0% | 0.0% | 40.7% | 59.3% | 1 / 1 / 2 | none | 8.4 / 14.1 / 18.9 |
| Says yes | 300 | 0.0% | 0.0% | 99.7% | 0.3% | 1 / 2 / 4 | none | 9.9 / 20.0 / 20.7 |
| Squeeze then spend | 300 | 0.0% | 5.3% | 94.0% | 0.7% | 1 / 3 / 4 | none | 10.1 / 19.0 / 20.4 |
| Power only | 300 | 0.0% | 0.3% | 99.7% | 0.0% | 1 / 1 / 4 | none | 30.1 / 37.9 / 38.7 |
| Chain by the quay | 300 | 50.0% | 0.0% | 50.0% | 0.0% | 1 / 2 / 3 | 29 / 34 / 56 | 25.2 / 41.6 / 43.1 |
| Borrow and build at once | 300 | 0.0% | 0.0% | 100.0% | 0.0% | 1 / 1 / 1 | none | 37.6 / 43.0 / 44.3 |
| Borrower wary of gluts | 300 | 56.0% | 0.0% | 44.0% | 0.0% | 1 / 2 / 3 | 31 / 36 / 49 | 22.0 / 42.6 / 44.1 |
| Trader blind to shocks | 300 | 89.3% | 0.0% | 10.7% | 0.0% | 1 / 2 / 3 | 27 / 31 / 53 | 26.2 / 43.4 / 44.5 |
| Hover then spend | 300 | 0.0% | 21.3% | 78.0% | 0.7% | 2 / 4 / 4 | none | 8.9 / 19.8 / 21.1 |

| Player | Highest tier reached | Vote share at the last vote | Treasury at the end | Approval at the end |
| --- | --- | --- | --- | --- |
| Does nothing | Subsistence 100.0% | 43.1% / 46.2% / 51.9% | $0.0m / $0.3m / $2.0m | 40.4% / 46.7% / 49.9% |
| Popularity | Subsistence 100.0% | 39.3% / 44.1% / 48.9% | $0.0m / $2.8m / $2.8m | 40.1% / 49.5% / 54.1% |
| Sensible | Developing 100.0% | 26.3% / 47.5% / 49.9% | $0.0m / $0.4m / $0.9m | 28.4% / 48.2% / 52.9% |
| Chain builder | Subsistence 7.7%, Developing 17.3%, Industrialising 13.3%, Prosperous 61.7% | 36.6% / 50.2% / 57.6% | $0.0m / $7.7m / $70.9m | 29.4% / 44.6% / 52.9% |
| Sensible borrower | Subsistence 18.7%, Developing 13.0%, Industrialising 7.3%, Prosperous 61.0% | 40.8% / 50.4% / 57.4% | $0.0m / $12.4m / $89.1m | 33.0% / 45.4% / 52.7% |
| Reckless borrower | Industrialising 15.7%, Prosperous 84.3% | 8.6% / 22.4% / 56.6% | $0.0m / $0.6m / $124.8m | 9.7% / 21.2% / 52.5% |
| Timing trader | Subsistence 0.3%, Developing 8.3%, Industrialising 0.7%, Prosperous 90.7% | 38.9% / 53.8% / 62.5% | $0.0m / $85.9m / $230.0m | 35.2% / 45.0% / 51.9% |
| Mine only | Subsistence 24.3%, Developing 14.7%, Industrialising 61.0% | 33.3% / 47.4% / 52.3% | $0.0m / $0.4m / $0.9m | 32.6% / 48.1% / 52.6% |
| Relief only | Subsistence 100.0% | 32.9% / 47.7% / 51.0% | $0.0m / $0.3m / $63.7m | 30.8% / 48.3% / 52.7% |
| Lowest tax | Subsistence 100.0% | 35.5% / 46.5% / 55.1% | $0.0m / $0.2m / $0.4m | 35.5% / 47.2% / 52.8% |
| Says yes | Subsistence 100.0% | 29.9% / 47.9% / 50.0% | $0.0m / $32.2m / $165.1m | 27.9% / 48.9% / 52.8% |
| Squeeze then spend | Subsistence 100.0% | 40.0% / 48.7% / 53.1% | $128.1m / $318.7m / $507.6m | 40.9% / 50.0% / 52.9% |
| Power only | Developing 61.7%, Industrialising 38.3% | 30.7% / 47.3% / 50.9% | $0.0m / $0.5m / $0.9m | 32.4% / 48.1% / 52.5% |
| Chain by the quay | Subsistence 10.7%, Developing 13.0%, Industrialising 19.3%, Prosperous 57.0% | 35.6% / 50.0% / 58.2% | $0.0m / $0.9m / $80.0m | 32.3% / 44.0% / 52.3% |
| Borrow and build at once | Prosperous 100.0% | 23.6% / 33.6% / 44.8% | $0.0m / $0.9m / $60.9m | 25.3% / 33.6% / 44.1% |
| Borrower wary of gluts | Subsistence 20.3%, Developing 12.0%, Industrialising 7.3%, Prosperous 60.3% | 38.0% / 50.2% / 57.4% | $0.0m / $10.7m / $74.4m | 33.0% / 45.5% / 52.9% |
| Trader blind to shocks | Subsistence 0.3%, Developing 7.7%, Industrialising 0.7%, Prosperous 91.3% | 38.9% / 53.9% / 62.5% | $0.0m / $86.5m / $216.8m | 35.2% / 45.0% / 52.6% |
| Hover then spend | Subsistence 100.0% | 30.4% / 47.4% / 57.3% | $0.0m / $0.3m / $0.9m | 29.7% / 47.6% / 55.4% |

| Player | Borrowed | Bailed out | Bailouts in a game | Win held back by the debt test | Debt burden at the end | Highest debt burden |
| --- | --- | ---: | --- | --- | --- | --- |
| Does nothing | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Popularity | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Sensible | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Chain builder | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Sensible borrower | $60.0m / $70.0m / $140.0m | 0.0% | none | 1.7%, 5 of 5 won later, waiting 1 / 1 / 1 quarters | 0% / 0% / 15% | 22% / 39% / 50% |
| Reckless borrower | $525.0m / $970.0m / $1105.0m | 68.3% | 1 / 1 / 1 | 76.0%, 18 of 228 won later, waiting 1 / 4 / 12 quarters | 0% / 33% / 678% | 218% / 793% / 1139% |
| Timing trader | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Mine only | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Relief only | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Lowest tax | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Says yes | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Squeeze then spend | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Power only | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Chain by the quay | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Borrow and build at once | $945.0m / $1050.0m / $1250.0m | 0.0% | none | 100.0%, 0 of 300 won later, waiting 3 / 8 / 8 quarters | 25% / 120% / 535% | 96% / 241% / 535% |
| Borrower wary of gluts | $35.0m / $70.0m / $140.0m | 0.0% | none | 1.3%, 4 of 4 won later, waiting 1 / 1 / 1 quarters | 0% / 0% / 27% | 21% / 39% / 50% |
| Trader blind to shocks | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |
| Hover then spend | $0.0m / $0.0m / $0.0m | 0.0% | none | never | 0% / 0% / 0% | 0% / 0% / 0% |

| Player | Grain imported | Grain exported | Trade income | Trade spending | Failed harvests abroad met | Ore gluts met | Droughts met | Floods met |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Does nothing | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 30.7%, 0 / 0 / 2 | 34.7%, 0 / 0 / 3 | 98.7%, 0 / 2 / 4 | 58.0%, 0 / 1 / 4 |
| Popularity | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 27.7%, 0 / 0 / 2 | 32.7%, 0 / 0 / 3 | 97.0%, 0 / 2 / 4 | 58.7%, 0 / 1 / 4 |
| Sensible | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 67.3%, 0 / 1 / 6 | 73.3%, 0 / 1 / 5 | 99.3%, 0 / 5 / 14 | 87.7%, 0 / 2 / 9 |
| Chain builder | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 74.7%, 0 / 1 / 4 | 83.7%, 0 / 1 / 5 | 100.0%, 1 / 7 / 14 | 94.0%, 0 / 3 / 9 |
| Sensible borrower | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 66.7%, 0 / 1 / 4 | 75.3%, 0 / 1 / 4 | 99.7%, 0 / 5 / 12 | 90.0%, 0 / 2 / 8 |
| Reckless borrower | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 65.7%, 0 / 1 / 4 | 74.0%, 0 / 1 / 4 | 99.7%, 0 / 5 / 12 | 88.0%, 0 / 2 / 8 |
| Timing trader | 0kt / 76kt / 326kt | 132kt / 876kt / 1594kt | $27.0m / $188.1m / $366.8m | $0.0m / $17.9m / $81.3m | 69.3%, 0 / 1 / 4 | 75.3%, 0 / 1 / 4 | 100.0%, 1 / 5 / 12 | 91.0%, 0 / 2 / 8 |
| Mine only | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 74.7%, 0 / 1 / 6 | 83.3%, 0 / 1 / 5 | 99.7%, 0 / 7 / 21 | 92.3%, 0 / 3 / 12 |
| Relief only | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 75.3%, 0 / 1 / 6 | 83.0%, 0 / 1 / 5 | 99.7%, 0 / 7 / 15 | 92.0%, 0 / 3 / 11 |
| Lowest tax | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 45.3%, 0 / 0 / 3 | 53.3%, 0 / 1 / 4 | 99.0%, 0 / 3 / 8 | 75.7%, 0 / 1 / 4 |
| Says yes | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 73.7%, 0 / 1 / 6 | 81.3%, 0 / 1 / 7 | 99.7%, 0 / 7 / 19 | 90.0%, 0 / 3 / 12 |
| Squeeze then spend | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 82.0%, 0 / 2 / 6 | 83.7%, 0 / 2 / 7 | 99.3%, 0 / 9 / 21 | 92.7%, 0 / 4 / 13 |
| Power only | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 65.0%, 0 / 1 / 7 | 71.3%, 0 / 1 / 7 | 99.0%, 0 / 5 / 17 | 86.7%, 0 / 2 / 9 |
| Chain by the quay | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 72.0%, 0 / 1 / 4 | 77.0%, 0 / 1 / 5 | 100.0%, 1 / 6 / 12 | 91.3%, 0 / 2 / 9 |
| Borrow and build at once | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 53.7%, 0 / 1 / 3 | 57.3%, 0 / 1 / 3 | 98.3%, 0 / 3 / 8 | 80.3%, 0 / 1 / 5 |
| Borrower wary of gluts | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 67.0%, 0 / 1 / 4 | 75.3%, 0 / 1 / 4 | 99.3%, 0 / 5 / 12 | 90.3%, 0 / 2 / 8 |
| Trader blind to shocks | 0kt / 47kt / 318kt | 132kt / 869kt / 1490kt | $27.0m / $187.8m / $342.5m | $0.0m / $10.3m / $70.2m | 69.3%, 0 / 1 / 4 | 75.3%, 0 / 1 / 4 | 100.0%, 1 / 5 / 12 | 91.0%, 0 / 2 / 8 |
| Hover then spend | 0kt / 0kt / 0kt | 0kt / 0kt / 0kt | $0.0m / $0.0m / $0.0m | $0.0m / $0.0m / $0.0m | 94.0%, 0 / 3 / 6 | 97.0%, 0 / 3 / 7 | 100.0%, 4 / 12 / 21 | 100.0%, 1 / 5 / 13 |

Spreads are least / middle / most. Won is the win on prosperity: Prosperous held for four quarters running, with the debt burden within the debt test as the hold completes. Still in office counts the games that had neither won nor lost when their terms were up. Vote share counts only the games that reached a vote. Bailed out counts the games in which a missed payment brought a bailout, and bailouts in a game counts them in those games. The win held back by the debt test counts the games in which prosperity was held long enough to win but the debt burden was over the limit, with how many of them were won once it passed and the quarters the win waited. The debt burden is what is owed against a year’s revenue. Grain is in thousands of tonnes (kt) over the game. A shock met is a world price shock that moved its price, or a drought or flood that began in a region, while the game was played: the share of games that met one, then how many each game met.

- Does nothing: lost the vote 11 in term 1; famine brought the state down in The Dry East 153, Korr Highlands 78, Arden Vale 31, Salt Coast 27 (in quarter 8 / 8 / 32).
- Popularity: lost the vote 7 in term 1; famine brought the state down in The Dry East 146, Korr Highlands 64, Arden Vale 46, Salt Coast 26, South Delta 11 (in quarter 8 / 8 / 20).
- Sensible: lost the vote 158 in term 1, 83 in term 2, 47 in term 3, 12 in term 4; famine brought the state down in no game.
- Chain builder: lost the vote 32 in term 1, 104 in term 2, 4 in term 3; famine brought the state down in no game.
- Sensible borrower: lost the vote 94 in term 1, 32 in term 2; famine brought the state down in no game.
- Reckless borrower: lost the vote 138 in term 1, 143 in term 2; famine brought the state down in The Dry East 1 (in quarter 40 / 40 / 40).
- Timing trader: lost the vote 26 in term 1, 8 in term 2; famine brought the state down in no game.
- Mine only: lost the vote 84 in term 1, 133 in term 2, 44 in term 3, 37 in term 4; famine brought the state down in no game.
- Relief only: lost the vote 74 in term 1, 141 in term 2, 75 in term 3, 9 in term 4; famine brought the state down in The Dry East 1 (in quarter 80 / 80 / 80).
- Lowest tax: lost the vote 119 in term 1, 3 in term 2; famine brought the state down in The Dry East 70, Arden Vale 66, Korr Highlands 30, Salt Coast 9, South Delta 3 (in quarter 8 / 16 / 40).
- Says yes: lost the vote 97 in term 1, 93 in term 2, 79 in term 3, 30 in term 4; famine brought the state down in South Delta 1 (in quarter 80 / 80 / 80).
- Squeeze then spend: lost the vote 77 in term 1, 57 in term 2, 71 in term 3, 77 in term 4; famine brought the state down in Korr Highlands 2 (in quarter 80 / 80 / 80).
- Power only: lost the vote 180 in term 1, 73 in term 2, 37 in term 3, 9 in term 4; famine brought the state down in no game.
- Chain by the quay: lost the vote 59 in term 1, 88 in term 2, 3 in term 3; famine brought the state down in no game.
- Borrow and build at once: lost the vote 300 in term 1; famine brought the state down in no game.
- Borrower wary of gluts: lost the vote 95 in term 1, 37 in term 2; famine brought the state down in no game.
- Trader blind to shocks: lost the vote 24 in term 1, 8 in term 2; famine brought the state down in no game.
- Hover then spend: lost the vote 3 in term 2, 60 in term 3, 171 in term 4; famine brought the state down in The Dry East 1, Korr Highlands 1 (in quarter 80 / 80 / 80).

## What was changed

Nothing in the game. No value in `src/sim/balance.ts` and no country file was changed: every
value tried in the attempt log below was put back. What changed is the balance tool: the two new
players and two probes, the trade and shocks table, and `BALANCE_SHOCKS`.

## What the runs showed

**Trading well is worth a great deal.** The timing trader wins 90.3% of the confirmation games
against the chain builder's 53.5%, in quarter 31 in the middle against 38, and reaches Prosperous
in 91.6% of games against 62.9%. It loses its first vote in 83 games and its second in 33,
against the chain builder's 91 and 445: the second vote, which the chain builder loses while its
chain is still being paid for, is the one trade wins. Most of it is selling. Tavara grows more
grain than it eats, and the reserve spoils at 8% a quarter, so after each harvest there are some
300,000 t above what the reserve needs to keep. The trader sells 879,000 t over a game in the
middle, for $188.6m, and buys 79,000 t for $18.4m. Before the port the border crossings carry
90,000 t a quarter, about $17m to $23m a sale; after it, far more.

This is the largest gap any lever has opened so far, and trade is now the strongest strategy in
the game. No target asks for less, so nothing was tuned against it; if the owner wants trade to
be worth less, the values that set what selling a surplus is worth are the export margin
(`trade.exportMarginPermille`, 20%), the spoilage that makes the surplus a loss unsold
(`food.reserveSpoilagePermillePerQuarter`, 8%) and what the crossings carry (the country file's
`crossings`).

**Relying on the mine alone does not win.** The player who builds the mine's chain and no power
wins no game: it reaches Industrialising in 64.8% of games and loses the vote in 99.5%, most often
in its second term (595 games) and its first (289). Power is what lifts the farming regions, and
the mine without it does not reach Prosperous.

**World price shocks are survivable, but ignoring them is not punished.** Every player met
shocks: three games in four met failed harvests abroad and four in five an ore glut, one or two
each in the middle. Played again on the same seeds without them (`BALANCE_SHOCKS=none`), the
wins moved by no more than 2.2 points for any player that ignores them, and more often upward than
down. Three things keep them mild on Tavara:

- Tavara feeds itself. Its reserve is above its safe level nearly all the time, so the grain
  price matters only to a player who trades, and the trader is a net seller: failed harvests
  abroad raise what its surplus fetches. They help the trader that ignores them (90.9% wins with
  shocks against 88.8% without) a little more than the one that stocks up for them (90.3%), since
  what the trade links carry, not the reserve, limits its sales.
- An ore glut takes some $20 a tonne off the ore price for three quarters, and the price recovers
  within a year. The vote falls once in twenty quarters, and a player that balances its budget
  pays for the dip with a point or two of tax. The chain builder wins 1.9 points more with
  shocks than without.
- The preparation the game advises costs more than the shock. Holding off borrowing while an ore
  glut is announced or in force delays the mine's chain, and the borrower wary of gluts wins 4.6
  points fewer with shocks than without, where the sensible borrower, which borrows through
  them, loses 2.2.

Larger and likelier shocks (doubling both, or an ore glut of $40 a tonne a quarter) left this as
it was. Longer ones did punish: shocks in force for eight quarters cost the sensible borrower 10
points on seeds 1 to 60, but they cost the borrower wary of gluts just as much, so they punish
borrowing against the mine at all rather than ignoring the warning, and the values were put
back. A shock would punish a player that ignores it only if the warning gave a way to escape it,
which on Tavara it does not: a country that must buy grain (a smaller harvest or reserve), or a
glut that could bring a missed payment that a player who held off borrowing avoids. Either is a
change to the country or the rules, not to the shocks' values, and is left to the owner.

**The earlier dominant strategies are still closed.** Hover then spend, Phase 1's dominant
strategy, is re-elected in every one-term game (100.0% still in office) but wins none over four
terms (20.4% still in office after twenty years); squeeze then spend keeps office in 5.6% of
games and wins none; power alone and the borrowing binge win nothing; the reckless borrower is
bailed out in 78.2% of games and wins 9.2%. The do-nothing and popularity players lose almost
every game to famine. Trade adds no trick that wins on its own: the timing trader wins by
building the chain builder's sites sooner with what it sells. Phase 3's targets still hold on
the confirmation seeds: the sensible borrower wins 64.1% against the chain builder's 53.5%, 10.6
points more, though on the tuning seeds 1 to 300 the gap was 4.7 (58.0% against 53.3%), against
16.0 there in Phase 3: floods and the moving ore price have narrowed it.

**Testland is not balanced, and was left alone.** Every one of its 21,600 confirmation games ran
to an ending without error, the traders' included. It trades little (33,000 t sold in the middle
of the timing trader's games), limited by its links. Power alone still wins most often there,
now 55.8% against 91.8% in Phase 3; no other player wins more than 0.5%.

### Attempt log

The runs, in the order they were made, on Tavara over four terms. Each names its seeds and
players.

1. The values as #66 to #72 left them, seeds 1 to 300, the fourteen players of Phase 3
   (`BALANCE_PLAYERS=all` before the new players were added). The chain builder won 53.3% and the
   sensible borrower 58.0%; the do-nothing and popularity players none. Its figures for those
   players are the tuning run's below, since no value changed.
2. A first draft of the timing trader, which held back its sales while failed harvests abroad
   were announced and still to come, seeds 1 to 300, with the chain builder, the trader blind to
   shocks, the player who relies on the mine and the sensible borrower; then the same without
   world price shocks. With shocks: the trader 87.3%, its blind twin 89.3%, the chain builder
   53.3%, the mine alone 0.0%, the sensible borrower 58.0%. Without: 87.0%, 87.0%, 51.7%, 0.0%,
   60.3%. A sale held back is lost, since the links limit what can be sold each quarter; the
   trader was changed to go on selling, and to stock up only.
3. The trader as it now plays, with the borrower wary of gluts, seeds 1 to 300: the chain
   builder, both traders, the sensible borrower and the wary borrower, with shocks and without.
   With: 53.3%, 88.7%, 89.3%, 58.0%, 56.0%. Without: 51.7%, 87.0%, 87.0%, 60.3%, 60.3%.
4. Shocks larger and likelier, seeds 1 to 300, the players of run 2: failed harvests abroad
   pushing $72 a tonne a quarter (`priceShocks.failedHarvestsAbroad.pushPermillePerQuarter`
   300) at 8% a quarter, and an ore glut $35 (-350) at 10%. The chain builder 55.0%, the trader
   91.7%, its blind twin 92.7%, the mine alone 0.0%, the sensible borrower 55.3%.
5. A heavier ore glut, seeds 1 to 300, the players of run 3 and the mine alone: failed harvests
   abroad at $72 and 6%, an ore glut of $40 (-400) at 8%. The chain builder 54.3%, the trader
   91.3%, its blind twin 92.3%, the sensible borrower 57.7%, the wary borrower 55.0%, the mine
   alone 0.0%.
6. Longer shocks, seeds 1 to 60, the players of run 5, with shocks and without: both kinds in
   force for eight quarters (`lastsQuarters` 8) at their shipped size and likelihood. With: the
   chain builder 53.3%, both traders 91.7%, the sensible borrower 51.7%, the wary borrower 51.7%,
   the mine alone 0.0%. Without: 51.7%, 88.3%, 88.3%, 61.7%, 61.7%, 0.0%.

Each of runs 4 to 6 was put back.

## How the runs were made

```powershell
$env:BALANCE_PLAYERS = 'all'; $env:BALANCE_COUNTRY = 'tavara'; $env:BALANCE_SEEDS = '1-300'; npm run balance
```

```powershell
$env:BALANCE_PLAYERS = 'all'; $env:BALANCE_COUNTRY = 'both'; $env:BALANCE_SEEDS = '1001-2200'; npm run balance
```

```powershell
$env:BALANCE_PLAYERS = 'Chain builder,Timing trader,Trader blind to shocks,Sensible borrower,Borrower wary of gluts,Mine only'; $env:BALANCE_COUNTRY = 'tavara'; $env:BALANCE_SEEDS = '1001-2200'; $env:BALANCE_SHOCKS = 'none'; npm run balance
```

```powershell
$env:BALANCE_PLAYERS = 'all'; $env:BALANCE_COUNTRY = 'tavara'; $env:BALANCE_SEEDS = '1001-2200'; $env:BALANCE_TERMS = '1'; npm run balance
```

The first is the tuning run: seeds 1 to 300, Tavara, all eighteen players. The second is the
confirmation run, on 1,200 seeds that played no part in the tuning, both countries, all eighteen
players. The third plays the six players the shock targets compare, on the confirmation seeds,
without world price shocks. The fourth plays one term, for the check on hover then spend. The
runs of the attempt log named their players and seeds the same way; the last of them ran with
`$env:BALANCE_WORKERS = '6'`, which leaves the machine usable. The tuning run took about 12
minutes on a 20-processor machine with every processor but two, and the confirmation run about
85.

## Playing it

[The play-through](../playing.md#a-play-through) gives one command that opens the finished
Phase 4 game on seed 1, where the chain builder loses its first vote with 49.9% and the timing
trader, building the same sites, wins in quarter 30, with the trades it made.
