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
