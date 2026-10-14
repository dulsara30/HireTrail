const DAY_MS = 24 * 60 * 60 * 1000;

export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + days);
  return next;
}

/** Whole local days from `from` to `to` (negative when `to` is earlier). */
export function diffLocalDays(from: Date, to: Date): number {
  return Math.round((startOfLocalDay(to).getTime() - startOfLocalDay(from).getTime()) / DAY_MS);
}

export type DueBucket = 'overdue' | 'today' | 'tomorrow' | 'week' | 'later' | 'none';

export const DUE_BUCKET_LABEL: Record<DueBucket, string> = {
  overdue: 'Overdue',
  today: 'Today',
  tomorrow: 'Tomorrow',
  week: 'This week',
  later: 'Later',
  none: 'No date',
};

export const DUE_BUCKET_ORDER: DueBucket[] = [
  'overdue',
  'today',
  'tomorrow',
  'week',
  'later',
  'none',
];

/** Which group a due date belongs to. All-day items stay "today" until the day is over. */
export function dueBucket(dueAt: Date | null, allDay: boolean, now: Date): DueBucket {
  if (!dueAt) return 'none';
  const days = diffLocalDays(now, dueAt);
  if (days < 0) return 'overdue';
  if (days === 0) return allDay || dueAt.getTime() >= now.getTime() ? 'today' : 'overdue';
  if (days === 1) return 'tomorrow';
  if (days <= 7) return 'week';
  return 'later';
}

export function isOverdue(dueAt: Date | null, allDay: boolean, now: Date): boolean {
  return dueBucket(dueAt, allDay, now) === 'overdue';
}

const time = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});
const dayMonth = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

/** "Today, 14:30", "Tomorrow", "Fri 17 Oct, 09:00", or "No date". */
export function formatWhen(at: Date | null, allDay: boolean, now: Date): string {
  if (!at) return 'No date';
  const days = diffLocalDays(now, at);
  const day =
    days === 0
      ? 'Today'
      : days === 1
        ? 'Tomorrow'
        : days === -1
          ? 'Yesterday'
          : dayMonth.format(at);
  return allDay ? day : `${day}, ${time.format(at)}`;
}

/** For <input type="datetime-local"> in the user's own time zone. */
export function toDateTimeLocal(date: Date | null): string {
  if (!date) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** For <input type="date">. */
export function toDateInput(date: Date | null): string {
  return date ? toDateTimeLocal(date).slice(0, 10) : '';
}

/** Reads a local date or date-time input back into a Date, or null when it is empty or invalid. */
export function fromLocalInput(value: string): Date | null {
  if (!value) return null;
  const date = value.length <= 10 ? new Date(`${value}T00:00:00`) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export interface SnoozeOption {
  label: string;
  at: Date;
}

/** Quick snooze choices relative to now. */
export function snoozeOptions(now: Date): SnoozeOption[] {
  const tomorrow9 = addDays(startOfLocalDay(now), 1);
  tomorrow9.setHours(9, 0, 0, 0);
  const monday = addDays(startOfLocalDay(now), (8 - now.getDay()) % 7 || 7);
  monday.setHours(9, 0, 0, 0);
  const options: SnoozeOption[] = [
    { label: 'In 3 hours', at: new Date(now.getTime() + 3 * 60 * 60 * 1000) },
  ];
  options.push({ label: 'Tomorrow, 9:00', at: tomorrow9 });
  const in3 = addDays(startOfLocalDay(now), 3);
  in3.setHours(9, 0, 0, 0);
  options.push({ label: 'In 3 days', at: in3 });
  options.push({ label: 'Next Monday', at: monday });
  const in2w = addDays(startOfLocalDay(now), 14);
  in2w.setHours(9, 0, 0, 0);
  options.push({ label: 'In 2 weeks', at: in2w });
  return options;
}
