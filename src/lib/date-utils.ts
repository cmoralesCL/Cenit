import { addMonths, endOfMonth } from 'date-fns';

/**
 * Utility functions for handling dates in the Chile timezone (America/Santiago).
 * This ensures consistency across Vercel (UTC) and Local (System TZ) environments.
 */

export const CHILE_TIMEZONE = 'America/Santiago';

/**
 * Returns the current date/time shifted to appear as Chile time, 
 * even if the server is in UTC.
 * 
 * USE WITH CAUTION: The resulting Date object will have the "correct" numbers for Chile,
 * but the system will think it's in the local timezone (e.g., UTC).
 * This is useful for date-fns calculations that assume local time.
 */
export function getNowInChile(): Date {
    const now = new Date();

    // Check if we are already in the correct timezone (approximate check)
    // or if the environment variable TZ is set correctly.
    // However, explicitly converting is safer for serverless.

    const chileTimeStr = new Intl.DateTimeFormat('en-US', {
        timeZone: CHILE_TIMEZONE,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false,
    }).format(now);

    return new Date(chileTimeStr);
}

/**
 * Helper to get just the current date string YYYY-MM-DD in Chile time.
 */
export function getChileDateString(): string {
    return new Intl.DateTimeFormat('en-CA', { // en-CA gives YYYY-MM-DD
        timeZone: CHILE_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(new Date());
}

/**
 * Returns the start of the semester for a given date.
 * January 1st for the first semester (months 0-5).
 * July 1st for the second semester (months 6-11).
 * @param date The date to check.
 * @returns The start date of the semester.
 */
export function startOfSemester(date: Date): Date {
    const month = date.getMonth();
    const year = date.getFullYear();
    // First semester (Jan-Jun) starts in January (month 0).
    // Second semester (Jul-Dec) starts in July (month 6).
    const startMonth = month < 6 ? 0 : 6;
    return new Date(year, startMonth, 1);
}

/**
 * Returns the end of the semester for a given date.
 * June 30th for the first semester.
 * December 31st for the second semester.
 * @param date The date to check.
 * @returns The end date of the semester.
 */
export function endOfSemester(date: Date): Date {
    const start = startOfSemester(date);
    // Add 5 months to get to June or December, then get the end of that month.
    const endMonth = addMonths(start, 5);
    return endOfMonth(endMonth);
}
