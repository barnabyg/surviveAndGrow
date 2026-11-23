# 1. The save format: self-contained, versioned, and checked on load

Date: 2026-11-17. Status: accepted.

## Context

The game saves itself to the browser at the end of every quarter. From the first release the
save format is a compatibility contract: a later release must still open a save written by this
one. Whatever a save holds, some later release has to be able to read or migrate, so the choice
of what goes into it is hard to reverse.

A game is the country it is played on, the seed, the state of the random generator and the game
state. The country is the awkward part. The shipped country will be retuned, a country can also
come from a file an author serves beside the game (`?country=`), and the engine's own tuning
values (`balance/`) change between releases.

## Decision

**A save is complete in itself.** It holds:

- `formatVersion`: the save format, a whole number starting at 1.
- `country`: the country's `id` and its country-file `formatVersion`, and `file`, the country
  file itself as its author wrote it.
- `seed` and `rng`: the seed the game started from and the state of the random generator.
- `state`: everything else in the game state.
- `report`: the report on the quarter that ended just before the save, or null.

**The country travels as its file, not as the engine's parsed form.** Loading a save runs the
file through `loadCountry` again. The save therefore rests on a contract that already exists,
the country file format, instead of making the engine's internal `Country` shape a second one.
A loaded `Country` keeps the file it came from (`source`) for this purpose.

**Nothing in a save is trusted.** `loadSave` checks every part against the engine's vocabulary
and against the country the save carries, builds the game afresh from what it has checked, and
refuses anything else with a message written for the player.

**Old formats are lifted, never read in place.** `migrations.ts` holds `SAVE_FORMAT_VERSION`
and a table of migrations, each under the version it lifts a save from. A save older than the
current format passes through them in turn before `save.ts` checks it. Changing what a save
holds means raising `SAVE_FORMAT_VERSION`, adding a migration, both in `migrations.ts`, and
keeping a save from the old format under `tests/saves/` with tests that it still opens. A kept
save is never regenerated.

**A save that cannot be opened is never written over.** A save from a newer release, or a
damaged one, is refused and left as it is. While it is there the game does not save, even a new
game, until the player discards it knowingly. Opening an older release by mistake must not
destroy a game.

## Consequences

- A game always resumes on the country it was started on, even after the shipped file has been
  retuned, and even when the file it came from has changed or gone.
- Engine tuning is not in the save. An old save plays on under the tuning of the release that
  opens it. The budget in force is brought inside the current limits on load. A release whose
  retuning would leave a game in progress in a state the rules cannot handle (a build time
  shortened below what a project has already paid, say) must raise the save format and migrate.
- Seed-keyed chance (dilemma rolls come from the seed and the quarter, not from the generator)
  needs nothing extra in the save: the seed is there.
- The shapes of the game state and of the turn report are part of format 1. Adding a field to
  either is a format change. The report is the one disposable part: a migration that cannot
  carry it across may set it to null, and the game is none the worse.
- A save is larger than it need be, by the size of a country file (about 20 kB). Browser
  storage holds one save per country, which is well within its limits.
- The decisions a player has made but not yet resolved (budget changes not committed, projects
  planned, a dilemma answered) are not saved. The save is made as a quarter ends, so a resumed
  game opens at the start of the quarter, with the budget in force and with relief still
  directed where the last quarter sent it.
