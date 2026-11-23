/**
 * The versions of the country file format: the newest and the oldest this game reads, and the
 * format that first lets a file say each thing added since the first.
 */

import type { EventType, SiteType, Technology } from './vocabulary';

/**
 * The newest version of the country file format this game reads. It still reads every
 * earlier version: format 2 added the sites a site depends on and a region's own population
 * growth, which format 1 cannot say, and format 3 added sites that are alternatives to each
 * other, which format 2 cannot, format 4 added debt the game starts with, which format 3
 * cannot, format 5 added border crossings, which format 4 cannot, format 6 added floods,
 * which format 5 cannot, format 7 added world price shocks, which format 6 cannot, format 8
 * added hidden deposits that a survey may find, which format 7 cannot, format 9 added sites
 * locked until a technology is known, among them dams, which format 8 cannot, and format 10
 * added clinics and schools, which format 9 cannot.
 */
export const COUNTRY_FORMAT_VERSION = 10;

/**
 * The country file format that first lets a site say which technology it needs, and name a
 * type of site that research unlocks.
 */
export const LOCKED_SITE_FORMAT = 9;

/** The country file format that first lets a file name a site that serves a region's people. */
export const SERVICE_SITE_FORMAT = 10;

/** The country file format that first lets a file name each type of site added after format 1. */
export const SITE_TYPE_FORMATS: Readonly<Partial<Record<SiteType, number>>> = {
  dam: LOCKED_SITE_FORMAT,
  clinic: SERVICE_SITE_FORMAT,
  school: SERVICE_SITE_FORMAT,
};

/**
 * The country file format that first lets a site say it needs each technology added since a
 * site could say so at all.
 */
export const TECHNOLOGY_FORMATS: Readonly<Partial<Record<Technology, number>>> = {
  publicHealth: SERVICE_SITE_FORMAT,
  teacherTraining: SERVICE_SITE_FORMAT,
};

/** The country file format that first lets a file hide deposits for surveys to find. */
export const DEPOSIT_FORMAT = 8;

/** The country file format that first lets a file say how likely each world price shock is. */
export const PRICE_SHOCK_FORMAT = 7;

/** The country file format that first lets a file say how likely each event is. */
export const EVENT_FORMATS = { drought: 1, flood: 6 } as const satisfies Record<EventType, number>;

/** The oldest country file format this game still reads. */
export const OLDEST_COUNTRY_FORMAT_VERSION = 1;
