# Survive and Grow: game design

Status: concept agreed, nothing built. Last updated 2026-11-16.

Main screen mock-up (private): https://claude.ai/artifact/DWLBKBkoTSS8Er7gSTR6ct

## 1. Concept

You are the benevolent leader of a small developing country. You must raise
living standards to a target level while staying in office. It is a survival
game built around economics and politics, and it is meant to be hard.

### The spine

Everything that improves living standards pays off after the next election.

- **Objective:** prosperity, an index built from food security, income, health,
  education and access to infrastructure.
- **Constraint:** approval. It keeps you in office. It is not the score.
- **The gap between them is the game.** Subsidies and tax cuts buy approval
  now. Roads, power and research buy prosperity later. Loans pull the future
  forward at a price.

Every system must feed this tension. A feature that does not is cut.

### Pillars

1. **Presentation is equal to decisions.** How information is shown matters as
   much as what the player can do. The screen must make the player want to
   tinker.
2. **Fair, not random.** Every loss is traceable to warnings the player could
   see. Forecasts are shown as ranges.
3. **Standing still loses.** Population grows, infrastructure decays, and
   expectations rise with living standards.
4. **The country is data.** No country-specific code (section 7).

## 2. Core loop

- One turn is one quarter. A term is 20 quarters. The harvest gives each year
  a rhythm.
- Each turn: set the budget and start projects, events fire, the simulation
  resolves, a report shows what changed and why.
- Systems talk to each other only through three shared currencies: money, time
  and approval. This is what lets systems be added one phase at a time.
- Anything with an upfront cost, a build time and a lasting effect is a
  **project**. Infrastructure, research and procurement all use the same
  mechanism.

## 3. Winning and losing

- **Win:** hold the prosperity target for four consecutive quarters with debt
  at a sustainable level. The debt condition blocks a win bought with a
  one-off borrowing binge. The debt test has its place in the rules
  (`debtSustainable` in `src/sim/victory.ts`); until Phase 3 brings borrowing
  there is no debt, so it always passes, and Phase 3 enforces it.
- **Terms:** an election every 20 quarters. Winning it begins a new term, with
  no limit on how many; it does not by itself win the game.
- **Lose:** election defeat, a coup, or state collapse from famine.
- **Insolvency is not an instant loss.** It triggers a bailout with forced
  austerity, which then threatens approval.
- **Cascades are the threat.** Drought leads to shortage, then falling
  approval, strikes, lost revenue and debt. The player's job is to break the
  chain early.

### Prosperity tiers

Prosperity is divided into four tiers. The last is the win target.

| Tier | Name | Effect of reaching it |
|---|---|---|
| 1 | Subsistence | Starting state |
| 2 | Developing | Map look shifts, expectations rise |
| 3 | Industrialising | Map look shifts, expectations rise |
| 4 | Prosperous | Hold it to win |

Passing a tier is marked as an event. It also raises public expectations, so
the approval baseline drops. The thresholds used in the mock-up (25, 45, 70)
are placeholders.

## 4. Systems

### Economy and budget

A tax rate and a small set of spending areas (agriculture, food relief,
health, education, security, upkeep). Revenue comes from tax on output.
Underfunded upkeep makes infrastructure decay.

### Food

Phase 1 has a single food stock per region, fed by the harvest and affected by
weather. Later phases add crop yields, grain reserves, famine stages, and
imports and exports at moving world prices.

### Approval and elections

One approval number with a visible breakdown. Strikes and protests begin below
set thresholds. An election every 20 quarters turns approval into a vote
share; below 50% the game is lost. Factions (farmers, workers, business, army)
arrive in Phase 6.

### Infrastructure

Built on fixed sites on the map (section 5). Costs a lot in time and money and
needs upkeep.

### Finance

Loans, bonds, a credit rating and debt service. Arrives in Phase 3, once there
is something worth borrowing for.

### Technology

A tree bought with money and time, using the project mechanism. It unlocks
and improves what already exists, so it arrives in Phase 5.

### Military

Kept abstract. Defence spending buys deterrence against neighbours and loyalty
from the army. There is no tactical combat. Arrives in Phase 6.

### Events

An event and dilemma system starts in Phase 1 with a handful of events and
gains content in every phase. Events are local to regions wherever possible.

## 5. The map

A region map, not a tile grid: six to eight hand-authored regions drawn as
stylised vector art.

- **Regions hold the simulation.** Each has its own population, food output,
  approval, living standard and infrastructure. National figures are derived
  from the regions.
- **The map starts nearly empty.** It shows fixed build sites: a port, a dam,
  a power station, a mine, irrigation, a grain store, and possible road
  routes.
- **Chains, not a checklist.** A mine earns nothing until a road links it to a
  port. The map shows these dependencies, and the player plans routes.
- **More sites than money.** Some sites are alternatives, such as a cheap
  shallow port against a costly deep-water one. One game cannot build
  everything.
- **Site states are visible:** empty, under construction, operating, decaying.
- **Sites are revealed over time.** Surveys uncover deposits, and research
  unlocks new site types.
- **Lenses:** the map switches between country, food, approval, living
  standards and infrastructure views.

### Showing living standards

- **By region, continuously:** settlements grow denser, better built and
  better lit as that region's living standard rises. Inequality between
  regions is visible at a glance.
- **Nationally, in steps:** passing a tier shifts the whole map's palette and
  lighting.
- **The look follows reality.** If living standards fall, lights go out and
  sites decay.

Tier looks are built from palette, lighting and settlement density, not from
redrawn maps. This keeps art cost flat as countries are added.

## 6. Main screen

Designed for 2560 x 1440 or larger, in three columns split by purpose.

- **Top bar:** five vital signs, always visible: treasury, food reserve,
  approval, prosperity against target, and time to the election. Each has a
  short trend line. The end-quarter button sits here.
- **Left, what is happening:** this quarter's reports, risks ahead with
  likelihoods, living standards by region, and an approval chart.
- **Centre, the country:** the map with its lens buttons, and a card for the
  selected site.
- **Under the map, the term timeline:** all 20 quarters of the current term to
  its election, with
  harvests marked and each project as a bar. A planned project shows how many
  quarters it would be in use before the vote.
- **Right, what you do:** budget sliders with a live projection of their
  effects, then projects underway and the ones affordable now.

Rules that apply everywhere:

- Every number can be clicked for a breakdown of what moved it.
- Changing a setting shows its projected effect before it is committed.
- Forecasts are shown as ranges.
- Meaning is never carried by colour alone.

## 7. Swappable countries

The player will eventually choose a country when setting up a game. A country
is a data file; the engine contains no country-specific code.

- **The file holds:** region shapes and terrain, build sites and possible
  routes, neighbours, names, starting figures, and how likely each kind of
  event is.
- **The engine owns the vocabulary:** the types of site, event and spending. A
  country picks from it and cannot add to it.
- **The map is drawn from the data.** No painted artwork per country.
- **Countries are scenarios.** Each can pose a different problem (landlocked,
  arid, dependent on one export), which gives difficulty levels and replay
  value without new mechanics.
- **The country file format is versioned**, and a save records which country
  and version it was started on.

Phase 1 ships one country. A second, crude test country lives in the automated
tests from the start, as proof that nothing is hard-coded. The country picker
waits until there are two real countries.

## 8. Phases

Each phase delivers a complete, playable game and adds one main new decision.

| Phase | Adds | Why it is a complete game |
|---|---|---|
| 1. Survive a term | Region map with lenses, treasury, tax rate, a few spending areas, simple food with regional weather, approval with strike and protest thresholds, two or three small build sites, live preview, turn report, one election | A 20-turn game: feed people, stay solvent, win the election |
| 2. Build | Large sites (port, power, mine, trunk roads) and the chains between them, multiple terms, the prosperity index, the four tiers and the win condition | The short-term versus long-term tension now exists |
| 3. Borrow | Loans, bonds, credit rating, debt service, bailout with forced austerity | Something worth borrowing for, and a way to overreach |
| 4. Feed and trade | Crop yields, grain reserves, famine stages, imports and exports at moving world prices, trade routes on the map | External shocks test the economy you built |
| 5. Research | Technology tree, surveys and new site types | Long-run strategy and replay value |
| 6. Threats | Factions, coup risk, neighbours with ambitions, unrest and army loyalty by region | Late-game pressure on a state worth taking |

Phase 1 site types pay off within one term: an irrigation scheme, a farm road
and a grain store.

## 9. Technical principles

- TypeScript in strict mode, running in the browser.
- The simulation is a pure function of state, decisions and a seeded random
  generator. It has no dependency on the UI.
- This makes the live preview cheap, makes saves and replays straightforward,
  and lets scripted bots play thousands of games to find dominant strategies.
- Save files and country files are versioned from the first release and are
  treated as compatibility contracts.

## 10. Risks

- **An opaque spreadsheet.** Countered by the breakdowns, previews and
  forecasts in section 6.
- **A dominant strategy.** Countered by bot play-testing.
- **Art cost.** Tiers, regions and site states multiply. Countered by building
  the look from data and palette.
- **Phase 1 size.** The map and feedback roughly double it. Its systems stay
  narrow to compensate.

## 11. Assumptions still to confirm

These were proposed during design and not explicitly agreed.

- The turn length of one quarter.
- The win condition's four-quarter hold and debt test.
- A bailout in place of instant loss on insolvency.
- Four tiers, and their threshold values.
- Six to eight regions per country.
- Small build sites in Phase 1.
- The visual direction: dark panels around a flat survey-style map.
- All names and figures in the mock-up are placeholders.
