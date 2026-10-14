import { describe, expect, it } from 'vitest';
import {
  type OrbitApplicationEventDto,
  type OrbitTaskDto,
  type OrbitTimelineDto,
} from '@hiretrail/shared';
import {
  EMPTY_ORBIT_FILTERS,
  filterEvents,
  hasActiveOrbitFilters,
  timelineToEvents,
} from './orbit-events';
import { patchTaskPages, patchTimeline, type TaskPages } from './orbit-cache';
import {
  diffLocalDays,
  dueBucket,
  formatWhen,
  fromLocalInput,
  snoozeOptions,
  toDateTimeLocal,
} from './orbit-dates';

const NOW = new Date(2026, 9, 14, 10, 0, 0);

const task = (over: Partial<OrbitTaskDto>): OrbitTaskDto => ({
  id: 't1',
  title: 'Prepare notes',
  notesHtml: null,
  kind: 'TASK',
  status: 'OPEN',
  priority: 'MEDIUM',
  dueAt: new Date(2026, 9, 15, 9, 0).toISOString(),
  allDay: false,
  remindAt: null,
  applicationId: null,
  applicationLabel: null,
  companyId: null,
  companyName: null,
  tags: [],
  checklist: [],
  recurrence: null,
  watchUrl: null,
  completedAt: null,
  snoozedUntil: null,
  version: 0,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  ...over,
});

const appEvent: OrbitApplicationEventDto = {
  id: 'app:1:deadlineAt',
  applicationId: '1',
  field: 'deadlineAt',
  kind: 'DEADLINE',
  at: new Date(2026, 9, 16, 12, 0).toISOString(),
  roleTitle: 'Engineer',
  companyName: 'ASTA',
};

describe('orbit events', () => {
  const timeline: OrbitTimelineDto = {
    tasks: [
      task({ id: 'late', title: 'Late one', dueAt: new Date(2026, 9, 12, 9, 0).toISOString() }),
      task({ id: 'done', title: 'Done one', status: 'DONE' }),
      task({ id: 'nodate', title: 'No date', dueAt: null }),
      task({
        id: 'call',
        title: 'Call Altrium',
        kind: 'CALL',
        tags: ['hot'],
        companyName: 'Altrium',
        priority: 'HIGH',
      }),
    ],
    applicationEvents: [appEvent],
    truncated: false,
  };

  it('merges tasks and application dates, soonest first, and skips undated items', () => {
    const events = timelineToEvents(timeline, NOW);
    expect(events.map((e) => e.id)).toEqual(['late', 'call', 'done', 'app:1:deadlineAt']);
    expect(events.find((e) => e.id === 'late')?.overdue).toBe(true);
    expect(events.find((e) => e.id === 'done')?.overdue).toBe(false);
    expect(events.find((e) => e.id === 'app:1:deadlineAt')?.source).toBe('application');
    expect(timelineToEvents(undefined, NOW)).toEqual([]);
  });

  it('filters by kind, search, priority and hides done items unless asked', () => {
    const events = timelineToEvents(timeline, NOW);
    expect(filterEvents(events, EMPTY_ORBIT_FILTERS).map((e) => e.id)).toEqual([
      'late',
      'call',
      'app:1:deadlineAt',
    ]);
    expect(filterEvents(events, { ...EMPTY_ORBIT_FILTERS, showDone: true })).toHaveLength(4);
    expect(
      filterEvents(events, { ...EMPTY_ORBIT_FILTERS, kinds: ['CALL'] }).map((e) => e.id),
    ).toEqual(['call']);
    expect(
      filterEvents(events, { ...EMPTY_ORBIT_FILTERS, kinds: ['DEADLINE'] }).map((e) => e.id),
    ).toEqual(['app:1:deadlineAt']);
    expect(filterEvents(events, { ...EMPTY_ORBIT_FILTERS, q: 'altrium' }).map((e) => e.id)).toEqual(
      ['call'],
    );
    expect(filterEvents(events, { ...EMPTY_ORBIT_FILTERS, q: 'HOT' }).map((e) => e.id)).toEqual([
      'call',
    ]);
    expect(filterEvents(events, { ...EMPTY_ORBIT_FILTERS, q: 'asta' }).map((e) => e.id)).toEqual([
      'app:1:deadlineAt',
    ]);
    expect(
      filterEvents(events, { ...EMPTY_ORBIT_FILTERS, priority: 'HIGH' }).map((e) => e.id),
    ).toEqual(['call']);
  });

  it('tells whether any filter is on', () => {
    expect(hasActiveOrbitFilters(EMPTY_ORBIT_FILTERS)).toBe(false);
    expect(hasActiveOrbitFilters({ ...EMPTY_ORBIT_FILTERS, q: ' ' })).toBe(false);
    expect(hasActiveOrbitFilters({ ...EMPTY_ORBIT_FILTERS, kinds: ['TASK'] })).toBe(true);
  });
});

describe('cache patches', () => {
  const timeline: OrbitTimelineDto = {
    tasks: [task({ id: 'a' }), task({ id: 'b' })],
    applicationEvents: [],
    truncated: false,
  };
  const pages: TaskPages = {
    pageParams: [undefined],
    pages: [{ items: [task({ id: 'a' }), task({ id: 'b' })], page: { hasMore: false, limit: 30 } }],
  };

  it('changes or removes one item in a timeline and leaves the others', () => {
    const done = patchTimeline(timeline, 'a', { status: 'DONE' });
    expect(done.tasks.map((t) => t.status)).toEqual(['DONE', 'OPEN']);
    expect(patchTimeline(timeline, 'a', null).tasks.map((t) => t.id)).toEqual(['b']);
    expect(patchTimeline(timeline, 'zzz', { status: 'DONE' })).toBe(timeline);
  });

  it('changes or removes one item in loaded pages', () => {
    expect(patchTaskPages(pages, 'b', { title: 'New' }).pages[0]?.items[1]?.title).toBe('New');
    expect(patchTaskPages(pages, 'b', null).pages[0]?.items.map((t) => t.id)).toEqual(['a']);
    expect(patchTaskPages(pages, 'zzz', null)).toBe(pages);
  });
});

describe('orbit dates', () => {
  it('counts local days and groups by due date', () => {
    expect(diffLocalDays(NOW, new Date(2026, 9, 16, 1, 0))).toBe(2);
    expect(diffLocalDays(NOW, new Date(2026, 9, 13, 23, 0))).toBe(-1);
    expect(dueBucket(null, false, NOW)).toBe('none');
    expect(dueBucket(new Date(2026, 9, 13, 9, 0), false, NOW)).toBe('overdue');
    expect(dueBucket(new Date(2026, 9, 14, 8, 0), false, NOW)).toBe('overdue');
    expect(dueBucket(new Date(2026, 9, 14, 8, 0), true, NOW)).toBe('today');
    expect(dueBucket(new Date(2026, 9, 14, 15, 0), false, NOW)).toBe('today');
    expect(dueBucket(new Date(2026, 9, 15, 9, 0), false, NOW)).toBe('tomorrow');
    expect(dueBucket(new Date(2026, 9, 19, 9, 0), false, NOW)).toBe('week');
    expect(dueBucket(new Date(2026, 9, 30, 9, 0), false, NOW)).toBe('later');
  });

  it('formats a date for people', () => {
    expect(formatWhen(null, false, NOW)).toBe('No date');
    expect(formatWhen(new Date(2026, 9, 14, 15, 30), false, NOW)).toMatch(/^Today, 15:30$/);
    expect(formatWhen(new Date(2026, 9, 15, 0, 0), true, NOW)).toBe('Tomorrow');
    expect(formatWhen(new Date(2026, 9, 13, 9, 0), true, NOW)).toBe('Yesterday');
  });

  it('round-trips a local date-time input', () => {
    const date = new Date(2026, 9, 14, 9, 5);
    expect(toDateTimeLocal(date)).toBe('2026-10-14T09:05');
    expect(fromLocalInput('2026-10-14T09:05')?.getTime()).toBe(date.getTime());
    expect(fromLocalInput('2026-10-14')?.getHours()).toBe(0);
    expect(fromLocalInput('')).toBeNull();
    expect(fromLocalInput('nonsense')).toBeNull();
  });

  it('offers snooze times that are all in the future and in order', () => {
    const options = snoozeOptions(NOW);
    expect(options.map((o) => o.label)).toContain('Next Monday');
    for (const option of options) expect(option.at.getTime()).toBeGreaterThan(NOW.getTime());
    const monday = options.find((o) => o.label === 'Next Monday')!;
    expect(monday.at.getDay()).toBe(1);
    expect(monday.at.getHours()).toBe(9);
  });
});
