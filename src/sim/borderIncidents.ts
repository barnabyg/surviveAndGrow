import type { ApprovalPush } from './approval';
import { percentOff } from './arithmetic';
import { balance } from './balance';
import { borderRegions } from './borders';
import { dateOfQuarter, quarterNumber } from './calendar';
import { neighbourName, regionName, type Country, type Crossing } from './country';
import type { ReportEntry } from './report';
import { drawAt } from './rng';
import {
  capitalised,
  formatDate,
  formatPoints,
  formatQuarters,
  formatTonnes,
  listed,
} from './text';
import type { GameDate } from './types';
import { BORDER_INCIDENT_NAME } from './vocabulary';

/*
 * Border incidents: what a hostile neighbour does when deterrence fails. An incident is
 * abstract, and works only through money, time and approval: for a set time the neighbour's
 * border crossings carry nothing, and the regions on its border produce less and think less
 * of the government. No territory changes hands, and a neighbour never ends the game. Like a
 * world price shock it is drawn from the seed and the quarter alone, announced ahead, and
 * leaves the generator, and so the weather and events a seed brings, as they were.
 */

/** A border incident announced, which may already be in force. */
export interface BorderIncident {
  /** The neighbour whose border it is on. */
  readonly neighbourId: string;
  /** The quarter it was announced as beginning: the first the player was told of it in. */
  readonly announced: GameDate;
  /** The first quarter it is in force. */
  readonly begins: GameDate;
}

/** What a game must say for its border incidents to be read. */
export interface IncidentWatch {
  readonly country: Country;
  /** The quarter now being decided. */
  readonly date: GameDate;
  /** The incidents announced and not yet ended: those to come and those in force. */
  readonly borderIncidents: readonly BorderIncident[];
}

const rules = balance.neighbours.incident;

/** A key that keeps the draws for incidents apart from every other draw keyed on the seed. */
const INCIDENT_DRAWS = 0x626f7264;

/**
 * The roll for each neighbour as the game moves into a quarter, from 0 up to 1, in the
 * country file's order. Each is drawn from the seed and the quarter alone. A neighbour whose
 * roll falls under the chance announces an incident, if it is hostile and has none of its own
 * announced or in force (`announceIncidents`).
 */
export function rollIncidents(country: Country, seed: number, date: GameDate): number[] {
  return country.map.neighbours.map((_, index) =>
    drawAt(seed, INCIDENT_DRAWS, quarterNumber(date), index),
  );
}

/** The quarter, counted from the start of the game, an incident is first no longer in force in. */
function endOf(incident: BorderIncident): number {
  return quarterNumber(incident.begins) + rules.lastsQuarters;
}

/** Whether an incident is in force in a quarter. */
function inForceIn(incident: BorderIncident, date: GameDate): boolean {
  const quarter = quarterNumber(date);
  return quarterNumber(incident.begins) <= quarter && quarter < endOf(incident);
}

/** The border crossings that lead to a neighbour, in the country file's order. */
function crossingsTo(country: Country, neighbourId: string): Crossing[] {
  return country.crossings.filter((crossing) => crossing.neighbourId === neighbourId);
}

/**
 * Whether a neighbour has a border an incident could be on: a crossing to close, or a region
 * that faces it.
 */
function hasBorder(country: Country, neighbourId: string): boolean {
  return (
    crossingsTo(country, neighbourId).length > 0 || borderRegions(country, neighbourId).length > 0
  );
}

/** An incident that closes a crossing in the quarter being decided, and for how much longer. */
export interface CrossingClosure {
  readonly neighbourId: string;
  /** The neighbour's name. */
  readonly name: string;
  /** How many quarters the crossing stays closed, counting the one being decided. */
  readonly quartersLeft: number;
}

/**
 * The incident that closes a border crossing in the quarter being decided, or null while the
 * crossing is open: one in force on the border of the neighbour it leads to.
 */
export function crossingClosure(
  watch: IncidentWatch,
  crossing: Pick<Crossing, 'neighbourId'>,
): CrossingClosure | null {
  const incident = watch.borderIncidents.find(
    (each) => each.neighbourId === crossing.neighbourId && inForceIn(each, watch.date),
  );
  if (incident === undefined) return null;
  return {
    neighbourId: incident.neighbourId,
    name: neighbourName(watch.country, incident.neighbourId),
    quartersLeft: endOf(incident) - quarterNumber(watch.date),
  };
}

/** What an incident in force leaves of a region's output, and what it is called. */
export interface OutputHeld {
  /** What the breakdowns call it: "the border incident with Voskar". */
  readonly called: string;
  /** What it leaves of the region's output, in thousandths. */
  readonly permille: number;
}

/**
 * The incidents in force that cut what a region produces in the quarter being decided: each
 * on the border of a neighbour the region faces, in the order they were announced.
 */
export function outputHeldIn(watch: IncidentWatch, regionId: string): OutputHeld[] {
  return watch.borderIncidents
    .filter(
      (incident) =>
        inForceIn(incident, watch.date) &&
        borderRegions(watch.country, incident.neighbourId).includes(regionId),
    )
    .map((incident) => ({
      called: called(watch.country, incident.neighbourId),
      permille: rules.outputPermille,
    }));
}

/**
 * The blows to approval that land in the quarter being decided: one in each region on the
 * border of a neighbour whose incident begins in it. Each lands at once under the incident's
 * name and then fades like any passing event.
 */
export function incidentPushes(watch: IncidentWatch): ApprovalPush[] {
  const now = quarterNumber(watch.date);
  return watch.borderIncidents
    .filter((incident) => quarterNumber(incident.begins) === now)
    .flatMap((incident) =>
      borderRegions(watch.country, incident.neighbourId).map((regionId) => ({
        label: capitalised(headlineOf(watch.country, incident.neighbourId)),
        permille: rules.approvalPermille,
        regionId,
      })),
    );
}

/**
 * The incidents as the game moves into a quarter, before any new one is announced: those
 * whose time is up end, and one due to begin does so if its neighbour is still hostile as the
 * quarter before it ends, and is otherwise called off. `hostile` holds the neighbours hostile
 * as that quarter ends. The report says what began, what was called off and what ended.
 */
export function turnIncidents(
  watch: Pick<IncidentWatch, 'country' | 'borderIncidents'>,
  hostile: ReadonlySet<string>,
  date: GameDate,
): { readonly incidents: readonly BorderIncident[]; readonly entries: readonly ReportEntry[] } {
  const quarter = quarterNumber(date);
  const { country, borderIncidents } = watch;
  const ended = borderIncidents.filter((incident) => endOf(incident) === quarter);
  const remaining = borderIncidents.filter((incident) => endOf(incident) > quarter);
  const due = remaining.filter((incident) => quarterNumber(incident.begins) === quarter);
  const calledOff = due.filter((incident) => !hostile.has(incident.neighbourId));
  const begun = due.filter((incident) => hostile.has(incident.neighbourId));
  return {
    incidents: remaining.filter((incident) => !calledOff.includes(incident)),
    entries: [
      ...begun.map((incident) => begunEntry(country, incident)),
      ...calledOff.map((incident) => calledOffEntry(country, incident)),
      ...ended.map((incident) => endedEntry(country, incident)),
    ],
  };
}

/**
 * The incidents once those the rolls announce have begun their notice. `incidents` is what
 * `turnIncidents` left as the game moves into the quarter. A neighbour announces one when it
 * is hostile as the quarter before ends, has a border for it to be on and none of its own
 * announced or in force, and its roll falls under the chance in balance data.
 */
export function announceIncidents(
  country: Country,
  incidents: readonly BorderIncident[],
  hostile: ReadonlySet<string>,
  rolls: readonly number[],
  date: GameDate,
): { readonly incidents: readonly BorderIncident[]; readonly entries: readonly ReportEntry[] } {
  const quarter = quarterNumber(date);
  const fresh = country.map.neighbours.flatMap((neighbour, index): BorderIncident[] => {
    const roll = rolls[index];
    const announces =
      roll !== undefined &&
      roll * 1000 < rules.chancePermillePerQuarter &&
      hostile.has(neighbour.id) &&
      hasBorder(country, neighbour.id) &&
      !incidents.some((incident) => incident.neighbourId === neighbour.id);
    return announces
      ? [
          {
            neighbourId: neighbour.id,
            announced: date,
            begins: dateOfQuarter(quarter + rules.noticeQuarters),
          },
        ]
      : [];
  });
  return {
    incidents: [...incidents, ...fresh],
    entries: fresh.map((incident) => comingEntry(country, incident)),
  };
}

/** What an incident with a neighbour is called in the middle of a sentence. */
function called(country: Country, neighbourId: string): string {
  return `the ${headlineOf(country, neighbourId)}`;
}

/** An incident as a headline or a breakdown names it, without its capital: "border incident with Voskar". */
function headlineOf(country: Country, neighbourId: string): string {
  return `${BORDER_INCIDENT_NAME.toLowerCase()} with ${neighbourName(country, neighbourId)}`;
}

/**
 * How long a closed crossing or a region's lost output has to run, counting the quarter being
 * decided: "this quarter and 2 more", or "for this last quarter".
 */
export function quartersLeftWords(quartersLeft: number): string {
  return quartersLeft <= 1 ? 'for this last quarter' : `this quarter and ${quartersLeft - 1} more`;
}

/** An incident with a neighbour as a headline names it: "Border incident with Voskar". */
export function incidentHeadline(country: Country, neighbourId: string): string {
  return capitalised(headlineOf(country, neighbourId));
}

/** How much less a region on the border produces, as a whole percentage. */
function outputCutPercent(): number {
  return percentOff(rules.outputPermille);
}

/** What an incident costs, for whoever must put it into words. */
export interface IncidentCost {
  /** The neighbour's crossings, which carry nothing while it lasts. */
  readonly crossings: readonly Pick<Crossing, 'id' | 'name' | 'tonnes'>[];
  /** The regions on the neighbour's border, in the country file's order. */
  readonly regionIds: readonly string[];
  /** How much less each of those regions produces while it lasts, as a whole percentage. */
  readonly outputCutPercent: number;
  /** The blow to approval in each of those regions as it begins, in thousandths. */
  readonly approvalPermille: number;
  /** How many quarters it lasts. */
  readonly lastsQuarters: number;
  /** How many quarters before it begins it is announced. */
  readonly noticeQuarters: number;
}

/** What an incident on a neighbour's border costs. */
export function incidentCost(country: Country, neighbourId: string): IncidentCost {
  return {
    crossings: crossingsTo(country, neighbourId).map(({ id, name, tonnes }) => ({
      id,
      name,
      tonnes,
    })),
    regionIds: borderRegions(country, neighbourId),
    outputCutPercent: outputCutPercent(),
    approvalPermille: rules.approvalPermille,
    lastsQuarters: rules.lastsQuarters,
    noticeQuarters: rules.noticeQuarters,
  };
}

/** The tense an incident is told in: announced, supposed, or in force now. */
type Tense = 'will' | 'would' | 'now';

/**
 * What an incident does while it lasts, as a clause with its verbs in a tense: "Korr Pass
 * (50,000 t a quarter) will carry nothing, and Korr Highlands and Salt Coast will produce 20%
 * less".
 */
function does(country: Country, neighbourId: string, tense: Tense): string {
  const { crossings, regionIds } = incidentCost(country, neighbourId);
  // A verb in the tense asked for, agreeing with one subject or several.
  const verb = (one: string, several: string, plural: boolean) =>
    tense === 'now' ? (plural ? several : one) : `${tense} ${several}`;
  const names = regionIds.map((regionId) => regionName(country, regionId));
  const closed =
    crossings.length === 0
      ? []
      : [
          `${listed(crossings.map((crossing) => `${crossing.name} (${formatTonnes(crossing.tonnes)} a quarter)`))} ${verb('carries', 'carry', crossings.length > 1)} nothing`,
        ];
  const cut =
    names.length === 0
      ? []
      : [
          `${listed(names)} ${verb('produces', 'produce', names.length > 1)} ${outputCutPercent()}% less`,
        ];
  return [...closed, ...cut].join(', and ');
}

/**
 * The blow to approval as an incident begins, as a sentence in a tense: "Approval there will
 * take a blow of 8.0 points as it begins." Nothing for a neighbour that borders no region.
 */
function blow(country: Country, neighbourId: string, tense: Tense): string {
  if (borderRegions(country, neighbourId).length === 0) return '';
  const points = formatPoints(Math.abs(rules.approvalPermille));
  const takes = tense === 'now' ? 'takes' : `${tense} take`;
  return ` Approval there ${takes} a blow of ${points} as it ${tense === 'would' ? 'began' : 'begins'}, which fades.`;
}

/** What an incident announced will do and when, in a line. */
export function incidentForecast(country: Country, incident: BorderIncident): string {
  const { neighbourId } = incident;
  return `From ${formatDate(incident.begins)}, for ${formatQuarters(rules.lastsQuarters)}, ${does(country, neighbourId, 'will')}.${blow(country, neighbourId, 'will')}`;
}

/** What an incident on a neighbour's border would do, as a sentence. */
export function incidentWouldDo(country: Country, neighbourId: string): string {
  return `For ${formatQuarters(rules.lastsQuarters)} ${does(country, neighbourId, 'would')}.${blow(country, neighbourId, 'would')}`;
}

function comingEntry(country: Country, incident: BorderIncident): ReportEntry {
  const name = neighbourName(country, incident.neighbourId);
  return {
    kind: 'borderIncident',
    seriousness: 'warning',
    headline: `${capitalised(headlineOf(country, incident.neighbourId))} ahead`,
    cause: `${name} is hostile, and its troops are gathering on the border. ${incidentForecast(country, incident)} It is called off if ${name} is no longer hostile as that quarter begins.`,
    neighbourId: incident.neighbourId,
  };
}

function begunEntry(country: Country, incident: BorderIncident): ReportEntry {
  const { neighbourId } = incident;
  const name = neighbourName(country, neighbourId);
  return {
    kind: 'borderIncident',
    seriousness: 'serious',
    headline: capitalised(headlineOf(country, neighbourId)),
    cause: `${name} is still hostile, and its troops have closed the border. For ${formatQuarters(rules.lastsQuarters)} ${does(country, neighbourId, 'now')}.${blow(country, neighbourId, 'now')}`,
    neighbourId,
  };
}

function calledOffEntry(country: Country, incident: BorderIncident): ReportEntry {
  const name = neighbourName(country, incident.neighbourId);
  return {
    kind: 'borderIncident',
    seriousness: 'notable',
    headline: `${capitalised(headlineOf(country, incident.neighbourId))} called off`,
    cause: `${name} is no longer hostile, and its troops have drawn back from the border: the incident announced for ${formatDate(incident.begins)} does not begin.`,
    neighbourId: incident.neighbourId,
  };
}

function endedEntry(country: Country, incident: BorderIncident): ReportEntry {
  const { crossings, regionIds } = incidentCost(country, incident.neighbourId);
  const name = neighbourName(country, incident.neighbourId);
  const names = regionIds.map((regionId) => regionName(country, regionId));
  const open =
    crossings.length === 0
      ? []
      : [
          `${listed(crossings.map((crossing) => crossing.name))} ${crossings.length > 1 ? 'carry' : 'carries'} goods again`,
        ];
  const whole =
    names.length === 0
      ? []
      : [`${listed(names)} ${names.length > 1 ? 'produce' : 'produces'} in full`];
  return {
    kind: 'borderIncident',
    seriousness: 'notable',
    headline: `${capitalised(headlineOf(country, incident.neighbourId))} has ended`,
    cause: `${name}’s troops have drawn back from the border. ${capitalised([...open, ...whole].join(', and '))}.`,
    neighbourId: incident.neighbourId,
  };
}

/** A border incident announced or in force, as the player sees it. */
export interface IncidentStatus extends IncidentCost {
  readonly neighbourId: string;
  /** The neighbour's name. */
  readonly name: string;
  /** What it is called: "Border incident with Voskar". */
  readonly headline: string;
  /** Whether it is in force in the quarter being decided, or still to come. */
  readonly inForce: boolean;
  /** How many quarters after this one it begins: nothing once it is in force. */
  readonly beginsIn: number;
  /** How many quarters it has left in force, counting this one once it has begun. */
  readonly quartersLeft: number;
  readonly begins: GameDate;
  /** What it does and when, in a line. */
  readonly description: string;
}

/** The border incidents announced or in force, in the order they were announced. */
export function borderIncidentStatuses(watch: IncidentWatch): IncidentStatus[] {
  const now = quarterNumber(watch.date);
  const { country } = watch;
  return watch.borderIncidents.map((incident) => {
    const inForce = inForceIn(incident, watch.date);
    const quartersLeft = inForce ? endOf(incident) - now : rules.lastsQuarters;
    return {
      ...incidentCost(country, incident.neighbourId),
      neighbourId: incident.neighbourId,
      name: neighbourName(country, incident.neighbourId),
      headline: capitalised(headlineOf(country, incident.neighbourId)),
      inForce,
      beginsIn: Math.max(0, quarterNumber(incident.begins) - now),
      quartersLeft,
      begins: incident.begins,
      description: inForce
        ? `${capitalised(does(country, incident.neighbourId, 'now'))}, ${quartersLeftWords(quartersLeft)}.`
        : `${incidentForecast(country, incident)} It is called off if ${neighbourName(country, incident.neighbourId)} is no longer hostile as that quarter begins.`,
    };
  });
}

/**
 * What a border incident is, whoever's border it is on: its notice, its length and what it
 * does, for the interface to explain one before any has come.
 */
export const borderIncidentTerms = {
  noticeQuarters: rules.noticeQuarters,
  lastsQuarters: rules.lastsQuarters,
  outputCutPercent: percentOff(rules.outputPermille),
  approvalPermille: rules.approvalPermille,
} as const;

/** The chance each quarter, from 0 to 1, that a hostile neighbour announces an incident. */
export const incidentChance = rules.chancePermillePerQuarter / 1000;

/**
 * Whether a neighbour could announce an incident as a quarter ends, were it hostile: it has a
 * border for one to be on, and none of its own announced or in force that would still be so.
 * `quarter` is the quarter the game would move into, counted from the start of the game.
 */
export function couldAnnounce(watch: IncidentWatch, neighbourId: string, quarter: number): boolean {
  return (
    hasBorder(watch.country, neighbourId) &&
    !watch.borderIncidents.some(
      (incident) => incident.neighbourId === neighbourId && endOf(incident) > quarter,
    )
  );
}
