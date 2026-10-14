import { type OptionColor } from './options';

/** Every kind of item on the Orbit page. Each kind has its own colour everywhere. */
export const ORBIT_KINDS = [
  'TASK',
  'REMINDER',
  'CALL',
  'MEETING',
  'INTERVIEW',
  'FOLLOW_UP',
  'DEADLINE',
  'WATCH',
  'OTHER',
] as const;
export type OrbitKind = (typeof ORBIT_KINDS)[number];

export const ORBIT_KIND_META: Record<
  OrbitKind,
  { label: string; color: OptionColor; description: string; pro?: boolean }
> = {
  TASK: { label: 'Task', color: 'info', description: 'Something to do' },
  REMINDER: { label: 'Reminder', color: 'purple', description: 'A nudge for a date' },
  CALL: { label: 'Call', color: 'teal', description: 'A phone or video call' },
  MEETING: { label: 'Meeting', color: 'indigo', description: 'A meeting' },
  INTERVIEW: { label: 'Interview', color: 'orange', description: 'An interview' },
  FOLLOW_UP: { label: 'Follow-up', color: 'pink', description: 'Follow up on an application' },
  DEADLINE: { label: 'Deadline', color: 'danger', description: 'A hard date' },
  WATCH: {
    label: 'Company watch',
    color: 'lime',
    description: 'Check a company again and again',
    pro: true,
  },
  OTHER: { label: 'Other', color: 'neutral', description: 'Anything else' },
};

/** These kinds count against the reminder limit instead of the task limit. */
export const ORBIT_REMINDER_KINDS: readonly OrbitKind[] = ['REMINDER', 'WATCH'];

export const ORBIT_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;
export type OrbitPriority = (typeof ORBIT_PRIORITIES)[number];

export const ORBIT_STATUSES = ['OPEN', 'DONE'] as const;
export type OrbitStatus = (typeof ORBIT_STATUSES)[number];

export const ORBIT_RECURRENCE_FREQS = ['DAILY', 'WEEKLY', 'MONTHLY'] as const;
export type OrbitRecurrenceFreq = (typeof ORBIT_RECURRENCE_FREQS)[number];

/** Application dates that show up on Orbit by themselves. */
export const ORBIT_APPLICATION_EVENT_FIELDS = [
  'deadlineAt',
  'followUpAt',
  'nextInterviewAt',
] as const;
export type OrbitApplicationEventField = (typeof ORBIT_APPLICATION_EVENT_FIELDS)[number];

export const ORBIT_APPLICATION_EVENT_KIND: Record<OrbitApplicationEventField, OrbitKind> = {
  deadlineAt: 'DEADLINE',
  followUpAt: 'FOLLOW_UP',
  nextInterviewAt: 'INTERVIEW',
};

/** Days the radar can show on each side of the reference date. */
export const ORBIT_ZOOM_DAYS = [7, 14, 30, 90] as const;
export type OrbitZoomDays = (typeof ORBIT_ZOOM_DAYS)[number];

export const ORBIT_WIDGET_TYPES = [
  'ORBIT',
  'TODAY',
  'TASKS',
  'REMINDERS',
  'PULSE',
  'DEADLINES',
  'PIPELINE',
  'AGING',
  'GOAL',
  'NOTES',
  'CALENDAR',
  'WATCH',
] as const;
export type OrbitWidgetType = (typeof ORBIT_WIDGET_TYPES)[number];

export interface OrbitWidgetMeta {
  label: string;
  description: string;
  /** Default size in grid cells. */
  w: number;
  h: number;
  minW: number;
  minH: number;
  /** Only Pro accounts can add this widget. */
  pro: boolean;
}

export const ORBIT_WIDGET_META: Record<OrbitWidgetType, OrbitWidgetMeta> = {
  ORBIT: {
    label: 'Orbit',
    description: 'Everything with a date on a radar. Closer means sooner.',
    w: 7,
    h: 5,
    minW: 4,
    minH: 4,
    pro: false,
  },
  TODAY: {
    label: 'Today river',
    description: 'What is happening today, hour by hour.',
    w: 5,
    h: 4,
    minW: 3,
    minH: 3,
    pro: false,
  },
  TASKS: {
    label: 'Tasks',
    description: 'Your to-do list with filters and search.',
    w: 6,
    h: 5,
    minW: 3,
    minH: 3,
    pro: false,
  },
  REMINDERS: {
    label: 'Reminders',
    description: 'Upcoming reminders with quick snooze.',
    w: 4,
    h: 4,
    minW: 3,
    minH: 3,
    pro: false,
  },
  PULSE: {
    label: 'Pulse',
    description: 'Your week in numbers: applied, done, overdue, streak.',
    w: 5,
    h: 3,
    minW: 3,
    minH: 2,
    pro: false,
  },
  DEADLINES: {
    label: 'Deadlines',
    description: 'The next deadlines and interviews across all applications.',
    w: 4,
    h: 4,
    minW: 3,
    minH: 3,
    pro: false,
  },
  PIPELINE: {
    label: 'Pipeline snapshot',
    description: 'How many applications sit in each stage.',
    w: 4,
    h: 3,
    minW: 3,
    minH: 2,
    pro: true,
  },
  AGING: {
    label: 'Waiting the longest',
    description: 'Applications sorted by days since you applied.',
    w: 4,
    h: 4,
    minW: 3,
    minH: 3,
    pro: true,
  },
  GOAL: {
    label: 'Weekly goal',
    description: 'A ring that fills as you apply this week.',
    w: 3,
    h: 3,
    minW: 2,
    minH: 2,
    pro: true,
  },
  NOTES: {
    label: 'Scratchpad',
    description: 'A free note that stays on your board.',
    w: 4,
    h: 3,
    minW: 2,
    minH: 2,
    pro: true,
  },
  CALENDAR: {
    label: 'Calendar',
    description: 'A month view with coloured dots for every item.',
    w: 5,
    h: 5,
    minW: 4,
    minH: 4,
    pro: true,
  },
  WATCH: {
    label: 'Company watch',
    description: 'Companies you keep checking, with the next check date.',
    w: 4,
    h: 4,
    minW: 3,
    minH: 3,
    pro: true,
  },
};

export const ORBIT_GRID = {
  COLUMNS: 12,
  MAX_ROWS: 12,
  MAX_Y: 200,
} as const;

export interface OrbitPlanLimits {
  /** Open items of every kind except reminders. */
  tasks: number;
  /** Open REMINDER items. */
  reminders: number;
  spaces: number;
  widgetsPerSpace: number;
  tagsPerItem: number;
  checklistSteps: number;
  recurrence: boolean;
  watch: boolean;
  templates: boolean;
  email: boolean;
  /** Largest zoom (days) the radar can use. */
  maxZoomDays: number;
}

export const ORBIT_LIMITS: Record<'FREE' | 'PRO', OrbitPlanLimits> = {
  FREE: {
    tasks: 15,
    reminders: 5,
    spaces: 1,
    widgetsPerSpace: 8,
    tagsPerItem: 2,
    checklistSteps: 0,
    recurrence: false,
    watch: false,
    templates: false,
    email: false,
    maxZoomDays: 14,
  },
  PRO: {
    tasks: 100000,
    reminders: 100000,
    spaces: 10,
    widgetsPerSpace: 24,
    tagsPerItem: 10,
    checklistSteps: 30,
    recurrence: true,
    watch: true,
    templates: true,
    email: true,
    maxZoomDays: 90,
  },
};

export const ORBIT_TEXT_LIMITS = {
  TITLE_MAX: 200,
  NOTES_MAX: 10000,
  TAG_MAX: 30,
  CHECKLIST_TEXT_MAX: 200,
  SPACE_NAME_MAX: 40,
  WIDGET_NOTE_MAX: 2000,
} as const;

/** Built-in space layouts. Templates are a Pro feature. */
export const ORBIT_TEMPLATES = ['TODAY', 'INTERVIEW_WEEK', 'DEEP_HUNT'] as const;
export type OrbitTemplate = (typeof ORBIT_TEMPLATES)[number];

export const ORBIT_TEMPLATE_META: Record<OrbitTemplate, { name: string; description: string }> = {
  TODAY: { name: 'Today', description: 'The radar, today and your tasks.' },
  INTERVIEW_WEEK: {
    name: 'Interview week',
    description: 'Interviews, calls, deadlines and prep tasks.',
  },
  DEEP_HUNT: {
    name: 'Deep hunt',
    description: 'Pipeline, waiting times, goal and company watch.',
  },
};

export function isOrbitReminderKind(kind: OrbitKind): boolean {
  return ORBIT_REMINDER_KINDS.includes(kind);
}
