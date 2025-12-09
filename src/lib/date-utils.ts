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
