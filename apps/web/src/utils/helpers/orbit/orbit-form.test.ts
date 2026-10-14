import { describe, expect, it } from 'vitest';
import { type OrbitTaskDto } from '@hiretrail/shared';
import {
  changeAllDay,
  emptyTaskForm,
  formToCreateInput,
  formToUpdateInput,
  isFormChanged,
  remindAtFromForm,
  taskToForm,
  validateForm,
} from './orbit-form';

const DUE = new Date(2026, 9, 20, 15, 30);

const task = (over: Partial<OrbitTaskDto> = {}): OrbitTaskDto => ({
  id: 't1',
  title: 'Call Sysco',
  notesHtml: '<p>Ask about the team</p>',
  kind: 'CALL',
  status: 'OPEN',
  priority: 'HIGH',
  dueAt: DUE.toISOString(),
  allDay: false,
  remindAt: new Date(DUE.getTime() - 60 * 60_000).toISOString(),
  applicationId: 'a1',
  applicationLabel: 'Engineer at Sysco LABS',
  companyId: 'c1',
  companyName: 'Sysco LABS',
  tags: ['prep'],
  checklist: [{ id: 'x', text: 'Read the job post', done: false }],
  recurrence: null,
  watchUrl: null,
  completedAt: null,
  snoozedUntil: null,
  version: 3,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  ...over,
});

describe('orbit form helpers', () => {
  it('turns an item into form values and back without losing anything', () => {
    const form = taskToForm(task());
    expect(form.title).toBe('Call Sysco');
    expect(form.due).toBe('2026-10-20T15:30');
    expect(form.remindMode).toBe('1h');
    expect(form.notes).toBe('Ask about the team');

    const update = formToUpdateInput(form, 3);
    expect(update.version).toBe(3);
    expect(update.dueAt?.getTime()).toBe(DUE.getTime());
    expect(update.remindAt?.getTime()).toBe(DUE.getTime() - 60 * 60_000);
    expect(update.applicationId).toBe('a1');
    expect(update.tags).toEqual(['prep']);
    expect(update.notesHtml).toContain('Ask about the team');
  });

  it('is not changed until something is edited', () => {
    const item = task();
    const form = taskToForm(item);
    expect(isFormChanged(form, item)).toBe(false);
    expect(isFormChanged({ ...form, title: 'Call Sysco LABS' }, item)).toBe(true);
    expect(isFormChanged(emptyTaskForm(), null)).toBe(false);
    expect(isFormChanged({ ...emptyTaskForm(), title: 'x' }, null)).toBe(true);
  });

  it('recognises reminder modes and custom times', () => {
    expect(taskToForm(task({ remindAt: null })).remindMode).toBe('none');
    expect(taskToForm(task({ remindAt: DUE.toISOString() })).remindMode).toBe('at');
    expect(
      taskToForm(task({ remindAt: new Date(DUE.getTime() - 24 * 3600_000).toISOString() }))
        .remindMode,
    ).toBe('1d');
    expect(
      taskToForm(task({ remindAt: new Date(DUE.getTime() - 7 * 60_000).toISOString() })).remindMode,
    ).toBe('custom');
  });

  it('works out the reminder time, with 9:00 for all-day items', () => {
    const form = { ...emptyTaskForm(), allDay: true, due: '2026-10-20', remindMode: '1d' as const };
    expect(remindAtFromForm(form)?.getTime()).toBe(new Date(2026, 9, 19, 9, 0).getTime());
    expect(remindAtFromForm({ ...form, remindMode: 'none' })).toBeNull();
    expect(remindAtFromForm({ ...form, due: '' })).toBeNull();
    expect(
      remindAtFromForm({
        ...form,
        remindMode: 'custom',
        remindCustom: '2026-10-18T08:00',
      })?.getHours(),
    ).toBe(8);
  });

  it('keeps the date when switching between all day and a time', () => {
    const timed = { ...emptyTaskForm(), due: '2026-10-20T15:30' };
    const allDay = changeAllDay(timed, true);
    expect(allDay).toMatchObject({ allDay: true, due: '2026-10-20' });
    expect(changeAllDay(allDay, false)).toMatchObject({ allDay: false, due: '2026-10-20T09:00' });
    expect(changeAllDay(emptyTaskForm(), true).due).toBe('');
  });

  it('builds a create request with blank fields as null and empty checklist rows dropped', () => {
    const input = formToCreateInput({
      ...emptyTaskForm(),
      title: '  Check careers  ',
      kind: 'REMINDER',
      due: '2026-10-28T09:00',
      watchUrl: ' https://altrium.io/careers ',
      checklist: [
        { id: 'a', text: 'Look for QA roles', done: false },
        { id: 'b', text: '   ', done: false },
      ],
      recurrenceFreq: 'WEEKLY',
      recurrenceInterval: 2,
    });
    expect(input.title).toBe('Check careers');
    expect(input.kind).toBe('REMINDER');
    expect(input.watchUrl).toBe('https://altrium.io/careers');
    expect(input.checklist).toHaveLength(1);
    expect(input.recurrence).toEqual({ freq: 'WEEKLY', interval: 2 });
    expect(input.applicationId).toBeNull();
    expect(input.notesHtml).toBeNull();
  });

  it('starts a reminder with a reminder at the due time', () => {
    expect(emptyTaskForm({ kind: 'REMINDER' }).remindMode).toBe('at');
    expect(emptyTaskForm({ kind: 'TASK' }).remindMode).toBe('none');
    expect(emptyTaskForm({ dueAt: DUE.toISOString() }).due).toBe('2026-10-20T15:30');
  });

  it('explains what is wrong before saving', () => {
    const ok = { ...emptyTaskForm(), title: 'Fine' };
    expect(validateForm(ok)).toBeNull();
    expect(validateForm({ ...ok, title: ' ' })).toMatch(/title/);
    expect(validateForm({ ...ok, remindMode: 'at' })).toMatch(/due date/);
    expect(validateForm({ ...ok, remindMode: 'custom', remindCustom: '' })).toMatch(/time/);
    expect(validateForm({ ...ok, recurrenceFreq: 'DAILY' })).toMatch(/due date/);
    expect(validateForm({ ...ok, watchUrl: 'ftp://x' })).toMatch(/http/);
    expect(validateForm({ ...ok, due: '2026-10-20', remindMode: 'at' })).toBeNull();
  });
});
