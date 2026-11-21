# Kept saves

Each `format-N.json` here is a saved game exactly as the release that introduced save format N
wrote it. They exist so that every later release can prove it still loads them: the save format
is a compatibility contract (see [docs/adr/0001-save-format.md](../../docs/adr/0001-save-format.md)).

**Never regenerate, reformat or edit a kept save.** If a test against one fails, the code has
broken the contract; fix the code or add a migration. Prettier is told to leave these files alone.

`format-1.json` was written once more before the first release, after Phase 1 was tuned, so that
it is a save the released game really writes. From that release on it is frozen like any other.

| File | What it holds |
| --- | --- |
| `format-1.json` | Tavara with chance pinned (drought in the Dry East, three dilemmas), seed 2026, at Year 1 · Quarter 4: a drought in force, relief directed to the Dry East, a grain store and a farm road in use, an irrigation scheme two quarters built, two dilemmas answered and one waiting. |
| `format-2.json` | The same Tavara game, seed 2026, at Year 1 · Quarter 4, played as it ships with health and education raised: three quarters of population growth, prosperity measured each quarter and just past Developing (the tier passed as the farm road came into use, so expectations have risen), strikes in the Dry East, the irrigation scheme paused for want of money, and a dilemma waiting. |
| `format-3.json` | Tavara with a tenth of its people (so every region is rich per head), a $2,000.0m treasury, no drought and the merchants calling each new year, seed 2026, at Year 7 · Quarter 4: re-elected at the end of Year 5 and in its second term, played on low tax with health and education as high as the budget allows, with prosperity two quarters into Prosperous (two of the four quarters held towards the win), a grain store and farm road in Lowmere in use, and no dilemma waiting. |
| `format-4.json` | Tavara as it ships with no drought and the teachers' pay dilemma possible, seed 2026, at Year 2 · Quarter 1: taxed at 25% with strikes in every region, two irrigation schemes (Lowmere and the Dry East) and the Arden to Lowmere farm road in use, upkeep cut to $1.0m so that the schemes, started first, are kept in good repair and the road, started last, is decaying, with its decay in the last report. |
| `format-5.json` | Tavara as it ships with no drought and the teachers' pay dilemma possible, seed 2026, at Year 3 · Quarter 2, with an irrigation scheme in Lowmere in use. It borrowed $25.0m over eight quarters in its first quarter and $10.0m over four in its second; those cut the credit rating to BBB, so the second loan was taken at BBB's 7.5%. Repaying both on time raised the rating to AA by its ninth quarter, when the first loan was repaid and it borrowed $10.0m over four quarters at 5% (numbered Loan 1 again, since the first was gone) and issued a $20.0m bond maturing in eight at 3.5%. It owes $30.0m on both, nothing yet repaid, and is rated A again for the debt. |
| `format-6.json` | Tavara as it ships with no drought and the teachers' pay dilemma possible, seed 2026, at Year 2 · Quarter 1, in austerity after a bailout. It borrowed $50.0m over four quarters in its first quarter on a 5% tax with agriculture, health, education and security at $20.0m each, and started an irrigation scheme in Lowmere in its second. In its third the treasury and the low tax could not cover the repayment: the bailout consolidated the $29.6m owed into a bailout loan at 7% over 16 quarters, cut the rating to B and imposed austerity for eight quarters, bringing the budget to a 25% tax and the caps. It has played one quarter of austerity, 7 left, with the scheme still being built. |
| `format-7.json` | Tavara as it ships with no drought and the teachers' pay dilemma possible, seed 2026, at Year 1 · Quarter 4, on the budget it starts with. It bought 10,000 t of grain abroad in its first quarter and 20,000 t in its third, at the world grain price of each; the price has moved three times since the game began ($240, $223, $209 and now $247 a tonne), and the last report has the second import in it. |
| `format-8.json` | The format 7 game played again with ore among the goods: Tavara as it ships with no drought and the teachers' pay dilemma possible, seed 2026, at Year 1 · Quarter 4, on the budget it starts with. It started building Korrgate mine in its first quarter and bought 10,000 t of grain abroad then and 20,000 t in its third. The world grain and ore prices have each moved three times since the game began (grain at $240, $223, $209 and now $247 a tonne, as in format 7, and ore at $100, $107, $96 and now $99), and the last report has the second import in it. The mine has three of its six quarters paid. |
| `format-9.json` | Tavara as it ships with no drought, the teachers' pay dilemma possible and world price shocks likelier than it ships with (failed harvests abroad at 10% a quarter and an ore glut at 60%), seed 2026, at Year 1 · Quarter 3, on the budget it starts with. It started building Korrgate mine in its first quarter and bought 10,000 t of grain abroad then and 20,000 t in its second. Both shocks were announced as its second quarter began, to push the world grain price up by $36 a tonne and the ore price down by $20 a quarter from Year 1 · Quarter 4 for three quarters; neither has moved a price yet (grain at $240, $223 and now $209 a tonne, ore at $100, $107 and now $96). The last report has the second import in it. |

## Adding one

When a release raises `SAVE_FORMAT_VERSION` in `src/sim/migrations.ts`:

1. Add the migration from the old version to the new in the same file.
2. Run the command below once. It writes `format-N.json` for the new version and refuses to
   write over a file that is already here.
3. Commit the new file, and add tests in `tests/sim/save.test.ts` that it loads and plays on.
   Move the tests for the previous format's file to `tests/sim/migrations.test.ts`, which
   holds those for every older file, and keep them all.

```powershell
npm run save:fixture
```

The script is `write-fixture.ts`. It plays a short scripted game through the simulation's public
interface and saves it; change the script freely for a new format, since it never touches the
files already kept.
