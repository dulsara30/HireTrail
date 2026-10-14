import { type OrbitRecurrenceFreq } from '@hiretrail/shared';

const DAY_MS = 24 * 60 * 60 * 1000;

/** The calendar date (YYYY-MM-DD) of a moment in a named time zone, for example Asia/Colombo. */
export function localDateKey(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** The hour (0 to 23) of a moment in a named time zone. */
export function localHour(date: Date, timeZone: string): number {
  const hour = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    hourCycle: 'h23',
  }).format(date);
  return Number(hour) % 24;
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** The calendar date (YYYY-MM-DD) of a moment for a fixed UTC offset in minutes (east is positive). */
export function dayKeyAtOffset(date: Date, offsetMinutes: number): string {
  return new Date(date.getTime() + offsetMinutes * 60_000).toISOString().slice(0, 10);
}

export function previousDayKey(key: string): string {
  return new Date(Date.parse(`${key}T00:00:00.000Z`) - DAY_MS).toISOString().slice(0, 10);
}

/** Start of the week (Monday 00:00 local time) as a UTC moment. */
export function weekStartUtc(now: Date, offsetMinutes: number): Date {
  const local = new Date(now.getTime() + offsetMinutes * 60_000);
  const midnight = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  const daysSinceMonday = (local.getUTCDay() + 6) % 7;
  return new Date(midnight - daysSinceMonday * DAY_MS - offsetMinutes * 60_000);
}

/** Start of the local day as a UTC moment. */
export function dayStartUtc(now: Date, offsetMinutes: number): Date {
  const local = new Date(now.getTime() + offsetMinutes * 60_000);
  const midnight = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  return new Date(midnight - offsetMinutes * 60_000);
}

/** Days in a row, ending today (or yesterday when today is still empty), that have some activity. */
export function streakDays(activeDays: ReadonlySet<string>, todayKey: string): number {
  let key = activeDays.has(todayKey) ? todayKey : previousDayKey(todayKey);
  let count = 0;
  while (activeDays.has(key) && count < 3650) {
    count++;
    key = previousDayKey(key);
  }
  return count;
}

/** One step of a repeat: daily, weekly or monthly (a month step keeps the day of the month when it can). */
export function addRecurrence(
  date: Date,
  recurrence: { freq: OrbitRecurrenceFreq; interval: number },
): Date {
  const interval = Math.max(1, recurrence.interval);
  if (recurrence.freq === 'DAILY') return new Date(date.getTime() + interval * DAY_MS);
  if (recurrence.freq === 'WEEKLY') return new Date(date.getTime() + interval * 7 * DAY_MS);

  const next = new Date(date.getTime());
  const day = next.getUTCDate();
  next.setUTCDate(1);
  next.setUTCMonth(next.getUTCMonth() + interval);
  const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
  next.setUTCDate(Math.min(day, lastDay));
  return next;
}

/** The first repeat after `now`, so finishing a late item does not create one that is already overdue. */
export function nextOccurrence(
  dueAt: Date,
  recurrence: { freq: OrbitRecurrenceFreq; interval: number },
  now: Date,
): Date {
  let next = addRecurrence(dueAt, recurrence);
  for (let i = 0; i < 500 && next.getTime() <= now.getTime(); i++) {
    next = addRecurrence(next, recurrence);
  }
  return next;
}
