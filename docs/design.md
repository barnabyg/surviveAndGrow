# Survive and Grow: game design

Status: Phase 1 is built, and Phase 2 (build) is built and balanced. Last updated 2026-11-20.

This document holds the intent and the phase plan. The rules as built, with their figures, are in
the README under "What is in the game", which is the one place they are stated in full.

Main screen mock-up (private): https://claude.ai/artifact/DWLBKBkoTSS8Er7gSTR6ct

## 1. Concept

You are the benevolent leader of a small developing country. You must raise living standards to a
target level while staying in office. It is a survival game built around economics and politics, and
it is meant to be hard.

### The spine

Everything that improves living standards pays off after the next election.

- **Objective:** prosperity, an index built from food security, income, health, education and access
  to infrastructure.
- **Constraint:** approval. It keeps you in office. It is not the score.
- **The gap between them is the game.** Subsidies and tax cuts buy approval now. Roads, power and
  research buy prosperity later. Loans pull the future forward at a price.

Every system must feed this tension. A feature that does not is cut.

### Pillars

1. **Presentation is equal to decisions.** How information is shown matters as much as what the
   player can do. The screen must make the player want to tinker.
2. **Fair, not random.** Every loss is traceable to warnings the player could see. Forecasts are
   shown as ranges.
3. **Standing still loses.** Population grows, infrastructure decays, and expectations rise with
   living standards.
4. **The country is data.** No country-specific code (section 7).

## 2. Core loop

- One turn is one quarter. A term is 20 quarters. The harvest gives each year a rhythm.
- Each turn: set the budget and start projects, events fire, the simulation resolves, a report shows
  what changed and why.
- Systems talk to each other only through three shared currencies: money, time and approval. This is
  what lets systems be added one phase at a time.
- Anything with an upfront cost, a build time and a lasting effect is a **project**. Infrastructure,
  research and procurement all use the same mechanism.

## 3. Winning and losing

- **Win:** hold the prosperity target for four consecutive quarters with debt at a sustainable
  level. The debt condition blocks a win bought with a one-off borrowing binge: the debt burden must
  be within a limit in balance data as the hold completes. A burden over it does not reset the
  hold; it only withholds the win until the debt test passes.
- **Terms:** an election every 20 quarters. Winning it begins a new term, with no limit on how many;
  it does not by itself win the game.
- **Lose:** election defeat or state collapse from famine, and from Phase 6 a coup.
- **Insolvency is not an instant loss.** It triggers a bailout with forced austerity, which then
  threatens approval.
- **Cascades are the threat.** Drought leads to shortage, then falling approval, strikes, lost
  revenue and debt. The player's job is to break the chain early.

### Prosperity tiers

Prosperity is divided into four tiers: Subsistence, where a game starts, then Developing,
Industrialising and Prosperous, the win target. Passing a tier is reported and shifts the map's
look. It also raises public expectations, so the approval baseline drops. Thresholds: README, What
is in the game.

## 4. Systems

- **Economy and budget.** A tax rate and a small set of spending areas (agriculture, food relief,
  health, education, security, upkeep). Revenue comes from tax on output. Underfunded upkeep makes
  infrastructure decay, newest sites first, so standing still loses. Rules: README, What is in the
  game.
- **Food.** Each region's harvest is moved by weather and drought and feeds a national reserve, with
  grain stores and relief sent to a region. A region short of food goes through the famine stages
  (adequate, tight, shortage, famine). Phase 4 adds crop yields and imports and exports at moving
  world prices.
- **Approval and elections.** One approval number with a visible breakdown. Strikes and protests
  begin below set thresholds. An election every 20 quarters turns approval into a vote share; below
  50% the game is lost. Factions (farmers, workers, business, army) arrive in Phase 6.
- **Events.** Events and dilemmas began in Phase 1 with a handful, and gain content in every phase.
  Events are local to regions wherever possible.

### Still to come

- **Finance** (Phase 3): loans, bonds, a credit rating and debt service, once there is something
  worth borrowing for.
- **Technology** (Phase 5): a tree bought with money and time, using the project mechanism. It
  unlocks and improves what already exists.
- **Military** (Phase 6): kept abstract. Defence spending buys deterrence against neighbours and
  loyalty from the army. There is no tactical combat.

## 5. The map

A region map, not a tile grid: six to eight hand-authored regions drawn as stylised vector art.

- **Regions hold the simulation.** Each has its own population, food output, approval, living
  standard and infrastructure. National figures are derived from the regions.
- **The map starts nearly empty.** It shows fixed build sites: a port, a dam, a power station, a
  mine, irrigation, a grain store, and possible road routes.
- **Chains, not a checklist.** A mine earns nothing until a road links it to a port. The map shows
  these dependencies, and the player plans routes. A chain yields no more than its weakest link, and
  large projects started late in a term open after the election. Rules: README, What is in the game.
- **More sites than money.** Some sites are alternatives, such as a cheap shallow port against a
  costly deep-water one. One game cannot build everything. Starting a project on one closes the
  others for good, and the site card says so before the player commits.
- **Power reaches the country along lines.** A station powers the regions its lines reach, and a
  powered region produces more. A site can need power like any other link of its chain.
- **Site states are visible:** empty, closed, under construction, operating, decaying.
- **Sites are revealed over time** (Phase 5). Surveys uncover deposits, and research unlocks new
  site types.
- **Lenses:** the map switches between country, food, approval, living standards and infrastructure
  views.
- **The infrastructure lens shows what is built and what is missing,** region by region, with every
  missing link of a chain marked.

### Showing living standards

- **By region, continuously:** settlements grow denser, better built and better lit as that region's
  living standard rises. Inequality between regions is visible at a glance.
- **Nationally, in steps:** passing a tier shifts the whole map's palette and lighting.
- **The look follows reality.** If living standards fall, lights go out and sites decay.
- **Looks are built from palette, lighting and settlement density,** not redrawn maps, so art cost
  stays flat as countries are added.

## 6. Main screen

Designed for 2560 x 1440 or larger, in three columns split by purpose. The top bar holds five vital
signs, always visible, each with a short trend line: treasury, food reserve, approval, prosperity
against target, and time to the election, beside the end-quarter button. The left column says what
is happening: reports, risks ahead with likelihoods, living standards by region and an approval
chart. The centre holds the map, its lenses and the selected site's card, over the term timeline of
20 quarters to the election with harvests and projects marked. The right column is what you do:
budget sliders with a live projection, then projects underway and affordable.

Rules that apply everywhere:

- Every number can be clicked for a breakdown of what moved it.
- Changing a setting shows its projected effect before it is committed.
- Forecasts are shown as ranges.
- Meaning is never carried by colour alone.

## 7. Swappable countries

The player will eventually choose a country when setting up a game. A country is a data file; the
engine contains no country-specific code.

- **The file holds:** region shapes and terrain, build sites and possible routes, neighbours, names,
  starting figures, and how likely each kind of event is.
- **The engine owns the vocabulary:** the types of site, event and spending. A country picks from it
  and cannot add to it. The map is drawn from the data, with no artwork per country.
- **Countries are scenarios.** Each can pose a different problem (landlocked, arid, dependent on one
  export), which gives difficulty levels and replay value without new mechanics.
- **The country file format is versioned**, and a save records which country and version it was
  started on.

Tavara ships, and a second, crude test country lives in the automated tests from the start, as proof
that nothing is hard-coded. The country picker waits until there are two real countries.

## 8. Phases

Each phase delivers a complete, playable game and adds one main new decision.

| Phase | Adds | Why it is a complete game |
|---|---|---|
| 1. Survive a term | Region map with lenses, treasury, tax rate, a few spending areas, simple food with regional weather, approval with strike and protest thresholds, two or three small build sites, live preview, turn report, one election | A 20-turn game: feed people, stay solvent, win the election |
| 2. Build | Large sites (port, power, mine, trunk roads) and the chains between them, multiple terms, the prosperity index, the four tiers and the win condition | The short-term versus long-term tension now exists |
| 3. Borrow | Loans, bonds, credit rating, debt service, bailout with forced austerity | Something worth borrowing for, and a way to overreach |
| 4. Feed and trade | Crop yields, imports and exports at moving world prices, trade routes on the map (the national reserve, grain stores and famine stages came early, in Phase 1) | External shocks test the economy you built |
| 5. Research | Technology tree, surveys and new site types | Long-run strategy and replay value |
| 6. Threats | Factions, coup risk, neighbours with ambitions, unrest and army loyalty by region | Late-game pressure on a state worth taking |

Phase 1 site types pay off within one term: an irrigation scheme, a farm road and a grain store.

## 9. Technical principles

- TypeScript in strict mode, running in the browser.
- The simulation is a pure function of state, decisions and a seeded random generator, with no
  dependency on the UI. This makes the preview cheap and saves straightforward, and lets scripted
  bots play thousands of games to find dominant strategies.
- Save files and country files are versioned from the first release and are treated as compatibility
  contracts.

## 10. Risks

- **An opaque spreadsheet**, countered by the breakdowns, previews and forecasts in section 6.
- **A dominant strategy**, countered by bot play-testing (`npm run balance`).
- **Art cost**, countered by building the look from data and palette.

## 11. Assumptions still to confirm

These were proposed during design and not explicitly agreed. The turn length, the four tiers and
their thresholds, the win condition's four-quarter hold and its debt test (the debt burden within
a limit as the hold completes, which withholds the win without resetting the hold) are built and
settled. So is the bailout in place of instant loss on insolvency: a missed payment on any debt
consolidates everything owed into one bailout loan, puts the credit rating at its lowest step,
deals approval a blow and imposes austerity for a fixed number of quarters (a tax floor, spending
caps, no borrowing and no new projects). A missed payment during austerity extends it, and
neither ends the game.

- Six to eight regions per country.
- The visual direction: dark panels around a flat survey-style map.