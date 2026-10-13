import { describe, expect, it } from 'vitest';
import { daysSince, formatDaysShort, formatDaysSince } from './days-since';

const NOW = new Date(2026, 9, 13, 15, 30); // 13 Oct 2026, 15:30 local

describe('daysSince', () => {
  it('counts whole calendar days, ignoring the time of day', () => {
    expect(daysSince('2026-10-13', NOW)).toBe(0);
    expect(daysSince('2026-10-12T23:59:59.000Z', NOW)).toBe(1);
    expect(daysSince('2026-10-08T00:00:00.000Z', NOW)).toBe(5);
    expect(daysSince('2026-01-01', NOW)).toBe(285);
  });

  it('counts across a month and a year boundary', () => {
    expect(daysSince('2026-09-30', NOW)).toBe(13);
    expect(daysSince('2025-10-13', NOW)).toBe(365);
  });

  it('returns null for missing, invalid or future dates', () => {
    expect(daysSince(null, NOW)).toBeNull();
    expect(daysSince(undefined, NOW)).toBeNull();
    expect(daysSince('', NOW)).toBeNull();
    expect(daysSince('not a date', NOW)).toBeNull();
    expect(daysSince('2026-10-14', NOW)).toBeNull();
  });

  it('formats the count for people', () => {
    expect(formatDaysSince(0)).toBe('Today');
    expect(formatDaysSince(1)).toBe('1 day ago');
    expect(formatDaysSince(12)).toBe('12 days ago');
    expect(formatDaysShort(0)).toBe('today');
    expect(formatDaysShort(12)).toBe('12d');
  });
});
