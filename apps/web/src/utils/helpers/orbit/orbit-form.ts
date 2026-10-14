import {
  type CreateOrbitTaskInput,
  type OrbitChecklistItemDto,
  type OrbitKind,
  type OrbitPriority,
  type OrbitRecurrenceFreq,
  type OrbitTaskDto,
  type UpdateOrbitTaskInput,
} from '@hiretrail/shared';
import { htmlToText } from '../job-description';
import { sourceTextToHtml } from '../autofill';
import { fromLocalInput, toDateInput, toDateTimeLocal } from './orbit-dates';

export type RemindMode = 'none' | 'at' | '15m' | '1h' | '1d' | 'custom';

export const REMIND_OFFSETS_MS: Record<Exclude<RemindMode, 'none' | 'custom'>, number> = {
  at: 0,
  '15m': 15 * 60_000,
  '1h': 60 * 60_000,
  '1d': 24 * 60 * 60_000,
};

export const REMIND_LABELS: Record<RemindMode, string> = {
  none: 'No reminder',
  at: 'At the due time',
  '15m': '15 minutes before',
  '1h': '1 hour before',
  '1d': '1 day before',
  custom: 'Pick a time',
};

export interface TaskFormValues {
  title: string;
  kind: OrbitKind;
  priority: OrbitPriority;
  allDay: boolean;
  /** `YYYY-MM-DD` when all day, otherwise `YYYY-MM-DDTHH:mm` (the user's own time zone). */
  due: string;
  remindMode: RemindMode;
  remindCustom: string;
  notes: string;
  applicationId: string;
  applicationLabel: string;
  companyId: string;
  companyName: string;
  tags: string[];
  checklist: OrbitChecklistItemDto[];
  recurrenceFreq: '' | OrbitRecurrenceFreq;
  recurrenceInterval: number;
  watchUrl: string;
}

export interface TaskDraft {
  kind?: OrbitKind;
  dueAt?: string;
  applicationId?: string;
  companyId?: string;
}

export function emptyTaskForm(draft: TaskDraft = {}): TaskFormValues {
  const due = draft.dueAt ? new Date(draft.dueAt) : null;
  const kind = draft.kind ?? 'TASK';
  return {
    title: '',
    kind,
    priority: 'MEDIUM',
    allDay: false,
    due: due ? toDateTimeLocal(due) : '',
    remindMode: kind === 'REMINDER' || kind === 'WATCH' ? 'at' : 'none',
    remindCustom: '',
    notes: '',
    applicationId: draft.applicationId ?? '',
    applicationLabel: '',
    companyId: draft.companyId ?? '',
    companyName: '',
    tags: [],
    checklist: [],
    recurrenceFreq: '',
    recurrenceInterval: 1,
    watchUrl: '',
  };
}

function remindModeOf(task: OrbitTaskDto): RemindMode {
  if (!task.remindAt) return 'none';
  if (!task.dueAt) return 'custom';
  const gap = new Date(task.dueAt).getTime() - new Date(task.remindAt).getTime();
  const match = (Object.entries(REMIND_OFFSETS_MS) as Array<[RemindMode, number]>).find(
    ([, ms]) => ms === gap,
  );
  return match ? match[0] : 'custom';
}

export function taskToForm(task: OrbitTaskDto): TaskFormValues {
  const due = task.dueAt ? new Date(task.dueAt) : null;
  return {
    title: task.title,
    kind: task.kind,
    priority: task.priority,
    allDay: task.allDay,
    due: due ? (task.allDay ? toDateInput(due) : toDateTimeLocal(due)) : '',
    remindMode: remindModeOf(task),
    remindCustom: task.remindAt ? toDateTimeLocal(new Date(task.remindAt)) : '',
    notes: htmlToText(task.notesHtml),
    applicationId: task.applicationId ?? '',
    applicationLabel: task.applicationLabel ?? '',
    companyId: task.companyId ?? '',
    companyName: task.companyName ?? '',
    tags: task.tags,
    checklist: task.checklist,
    recurrenceFreq: task.recurrence?.freq ?? '',
    recurrenceInterval: task.recurrence?.interval ?? 1,
    watchUrl: task.watchUrl ?? '',
  };
}

export function dueFromForm(form: TaskFormValues): Date | null {
  return fromLocalInput(form.due);
}

/** When the reminder should fire, from the chosen mode. No date means only a custom time works. */
export function remindAtFromForm(form: TaskFormValues): Date | null {
  if (form.remindMode === 'none') return null;
  if (form.remindMode === 'custom') return fromLocalInput(form.remindCustom);
  const due = dueFromForm(form);
  if (!due) return null;
  // An all-day item reminds at 9:00 on its day
  const base = form.allDay ? new Date(due.getFullYear(), due.getMonth(), due.getDate(), 9) : due;
  return new Date(base.getTime() - REMIND_OFFSETS_MS[form.remindMode]);
}

/** Switching between all day and a time keeps the same date. */
export function changeAllDay(form: TaskFormValues, allDay: boolean): TaskFormValues {
  if (!form.due) return { ...form, allDay };
  const due = fromLocalInput(form.due);
  if (!due) return { ...form, allDay };
  return {
    ...form,
    allDay,
    due: allDay
      ? toDateInput(due)
      : toDateTimeLocal(new Date(due.getFullYear(), due.getMonth(), due.getDate(), 9)),
  };
}

const clean = (value: string): string | null => value.trim() || null;

function shared(form: TaskFormValues) {
  const due = dueFromForm(form);
  return {
    title: form.title.trim(),
    kind: form.kind,
    priority: form.priority,
    allDay: form.allDay,
    dueAt: due,
    remindAt: remindAtFromForm(form),
    notesHtml: form.notes.trim() ? sourceTextToHtml(form.notes.trim()) : null,
    applicationId: form.applicationId || null,
    companyId: form.companyId || null,
    tags: form.tags,
    checklist: form.checklist
      .filter((c) => c.text.trim())
      .map((c) => ({ id: c.id, text: c.text.trim(), done: c.done })),
    recurrence: form.recurrenceFreq
      ? { freq: form.recurrenceFreq, interval: form.recurrenceInterval || 1 }
      : null,
    watchUrl: clean(form.watchUrl),
  };
}

export function formToCreateInput(form: TaskFormValues): CreateOrbitTaskInput {
  return shared(form);
}

export function formToUpdateInput(form: TaskFormValues, version: number): UpdateOrbitTaskInput {
  return { ...shared(form), version };
}

/** True when the form differs from the saved item, so Save only lights up when there is something to save. */
export function isFormChanged(form: TaskFormValues, task: OrbitTaskDto | null): boolean {
  const base = task ? taskToForm(task) : emptyTaskForm();
  return JSON.stringify(form) !== JSON.stringify(base);
}

export function validateForm(form: TaskFormValues): string | null {
  if (!form.title.trim()) return 'Add a title.';
  if (form.due && !fromLocalInput(form.due)) return 'That date is not valid.';
  if (form.remindMode === 'custom' && !fromLocalInput(form.remindCustom)) {
    return 'Pick a time for the reminder.';
  }
  if (form.remindMode !== 'none' && form.remindMode !== 'custom' && !form.due) {
    return 'A reminder before or at the due time needs a due date.';
  }
  if (form.recurrenceFreq && !form.due) return 'A repeating item needs a due date.';
  if (form.watchUrl.trim() && !/^https?:\/\//i.test(form.watchUrl.trim())) {
    return 'The link must start with http:// or https://';
  }
  return null;
}
