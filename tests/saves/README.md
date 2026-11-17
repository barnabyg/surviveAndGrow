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

## Adding one

When a release raises `SAVE_FORMAT_VERSION` in `src/sim/save.ts`:

1. Add the migration from the old version to the new in the same file.
2. Run the command below once. It writes `format-N.json` for the new version and refuses to
   write over a file that is already here.
3. Commit the new file, and add tests in `tests/sim/save.test.ts` that it loads and plays on.
   Keep the tests for every older file.

```powershell
npm run save:fixture
```

The script is `write-fixture.ts`. It plays a short scripted game through the simulation's public
interface and saves it; change the script freely for a new format, since it never touches the
files already kept.
