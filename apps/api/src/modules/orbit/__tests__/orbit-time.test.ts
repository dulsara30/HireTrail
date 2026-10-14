import { describe, expect, it } from 'vitest';
import {
  addRecurrence,
  dayKeyAtOffset,
  dayStartUtc,
  isValidTimeZone,
  localDateKey,
  localHour,
  nextOccurrence,
  previousDayKey,
  streakDays,
  weekStartUtc,
} from '../services/orbit-time';

const utc = (iso: string) => new Date(iso);

describe('orbit time helpers', () => {
  it('reads the local date and hour in a named time zone', () => {
    const moment = utc('2026-10-13T20:30:00Z'); // 02:00 on the 14th in Colombo (UTC+5:30)
    expect(localDateKey(moment, 'Asia/Colombo')).toBe('2026-10-14');
    expect(localHour(moment, 'Asia/Colombo')).toBe(2);
    expect(localDateKey(moment, 'UTC')).toBe('2026-10-13');
    expect(localHour(utc('2026-10-13T00:10:00Z'), 'UTC')).toBe(0);
  });

  it('recognises valid and invalid time zones', () => {
    expect(isValidTimeZone('Asia/Colombo')).toBe(true);
    expect(isValidTimeZone('Mars/Olympus')).toBe(false);
  });

  it('finds the start of the week (Monday) and of the day for a UTC offset', () => {
    // Wed 14 Oct 2026, 10:00 local at UTC+5:30
    const now = utc('2026-10-14T04:30:00Z');
    expect(weekStartUtc(now, 330).toISOString()).toBe('2026-10-11T18:30:00.000Z'); // Mon 12 Oct 00:00 local
    expect(dayStartUtc(now, 330).toISOString()).toBe('2026-10-13T18:30:00.000Z');
    // A Sunday belongs to the week that started the Monday before
    expect(weekStartUtc(utc('2026-10-18T12:00:00Z'), 0).toISOString()).toBe(
      '2026-10-12T00:00:00.000Z',
    );
  });

  it('turns a moment into a day key for an offset', () => {
    expect(dayKeyAtOffset(utc('2026-10-13T20:00:00Z'), 330)).toBe('2026-10-14');
    expect(dayKeyAtOffset(utc('2026-10-13T20:00:00Z'), -300)).toBe('2026-10-13');
    expect(previousDayKey('2026-03-01')).toBe('2026-02-28');
  });

  it('counts a streak of active days, starting today or yesterday', () => {
    const days = new Set(['2026-10-14', '2026-10-13', '2026-10-12', '2026-10-10']);
    expect(streakDays(days, '2026-10-14')).toBe(3);
    // today is still empty: the streak that ended yesterday still counts
    expect(streakDays(new Set(['2026-10-13', '2026-10-12']), '2026-10-14')).toBe(2);
    expect(streakDays(new Set(['2026-10-10']), '2026-10-14')).toBe(0);
    expect(streakDays(new Set(), '2026-10-14')).toBe(0);
  });

  it('adds one repeat step: daily, weekly and monthly (clamped to the month length)', () => {
    const start = utc('2026-01-31T09:00:00Z');
    expect(addRecurrence(start, { freq: 'DAILY', interval: 2 }).toISOString()).toBe(
      '2026-02-02T09:00:00.000Z',
    );
    expect(addRecurrence(start, { freq: 'WEEKLY', interval: 1 }).toISOString()).toBe(
      '2026-02-07T09:00:00.000Z',
    );
    expect(addRecurrence(start, { freq: 'MONTHLY', interval: 1 }).toISOString()).toBe(
      '2026-02-28T09:00:00.000Z',
    );
    expect(
      addRecurrence(utc('2026-02-15T09:00:00Z'), { freq: 'MONTHLY', interval: 12 }).toISOString(),
    ).toBe('2027-02-15T09:00:00.000Z');
  });

  it('skips repeats that are already in the past', () => {
    const next = nextOccurrence(
      utc('2026-10-01T09:00:00Z'),
      { freq: 'WEEKLY', interval: 1 },
      utc('2026-10-14T12:00:00Z'),
    );
    expect(next.toISOString()).toBe('2026-10-15T09:00:00.000Z');
  });
});
