import type { SiteSchedule, TermCalendar } from '../sim';
import { formatQuarters } from './format';

/**
 * When a site still being built opens, counted from the quarter being decided: "next
 * quarter", "in 3 quarters". The schedule is the simulation's, so the timeline, the site's
 * card and the projects list all say the same, a pause this quarter included.
 */
export function opening(schedule: SiteSchedule, calendar: TermCalendar): string {
  const away = schedule.opens - calendar.now;
  return away <= 1 ? 'next quarter' : `in ${formatQuarters(away)}`;
}
