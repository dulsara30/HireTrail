const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Whole calendar days from a date to today, or null when the date is missing, invalid or in the
 * future. Only the date part (YYYY-MM-DD) counts, so the time of day and the time zone never move
 * the result by a day.
 */
export function daysSince(date: string | null | undefined, now: Date = new Date()): number | null {
  if (!date) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (!match) return null;
  const then = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((today - then) / DAY_MS);
  return days >= 0 ? days : null;
}

/** For example "Today", "1 day ago", "12 days ago". */
export function formatDaysSince(days: number): string {
  if (days === 0) return 'Today';
  return days === 1 ? '1 day ago' : `${days} days ago`;
}

/** Compact form for small spaces: "today", "1d", "12d". */
export function formatDaysShort(days: number): string {
  return days === 0 ? 'today' : `${days}d`;
}
