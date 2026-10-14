import {
  type OrbitApplicationEventField,
  type OrbitKind,
  type OrbitPriority,
  type OrbitRecurrenceFreq,
  type OrbitStatus,
  type OrbitWidgetType,
} from '../../constants/orbit';

export interface OrbitChecklistItemDto {
  id: string;
  text: string;
  done: boolean;
}

export interface OrbitTaskDto {
  id: string;
  title: string;
  notesHtml: string | null;
  kind: OrbitKind;
  status: OrbitStatus;
  priority: OrbitPriority;
  dueAt: string | null;
  allDay: boolean;
  remindAt: string | null;
  applicationId: string | null;
  /** "Role at Company" for the linked application, for display. */
  applicationLabel: string | null;
  companyId: string | null;
  companyName: string | null;
  tags: string[];
  checklist: OrbitChecklistItemDto[];
  recurrence: { freq: OrbitRecurrenceFreq; interval: number } | null;
  watchUrl: string | null;
  completedAt: string | null;
  snoozedUntil: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

/** A date from an application (deadline, follow-up, next interview). Read only on Orbit. */
export interface OrbitApplicationEventDto {
  id: string;
  applicationId: string;
  field: OrbitApplicationEventField;
  kind: OrbitKind;
  at: string;
  roleTitle: string;
  companyName: string;
}

export interface OrbitTimelineDto {
  tasks: OrbitTaskDto[];
  applicationEvents: OrbitApplicationEventDto[];
  /** True when the window held more items than were returned. */
  truncated: boolean;
}

export interface OrbitPulseDto {
  appliedThisWeek: number;
  appliedLastWeek: number;
  doneThisWeek: number;
  openTotal: number;
  overdue: number;
  dueToday: number;
  /** Days in a row (ending today or yesterday) with an application sent or an item completed. */
  streakDays: number;
  /** Days since the oldest application that is still waiting for a reply, or null. */
  oldestWaitDays: number | null;
  weeklyGoal: number;
}

/** What the AI understood from one sentence. It only fills the preview: nothing is saved until the user adds it. */
export interface OrbitQuickParseDto {
  title: string;
  kind: OrbitKind;
  dueAt: string | null;
  allDay: boolean;
  priority: OrbitPriority | null;
  tags: string[];
  /** A company name taken from the text, to be matched against the user's companies. */
  company: string | null;
  recurrence: { freq: OrbitRecurrenceFreq; interval: number } | null;
  watchUrl: string | null;
}

export interface OrbitDueDto {
  /** Items whose reminder or due time has passed and that are still open. */
  due: OrbitTaskDto[];
  overdueCount: number;
}

export interface OrbitWidgetDto {
  id: string;
  type: OrbitWidgetType;
  x: number;
  y: number;
  w: number;
  h: number;
  config: Record<string, unknown>;
}

export interface OrbitSpaceDto {
  id: string;
  name: string;
  order: number;
  widgets: OrbitWidgetDto[];
  version: number;
}

export interface OrbitSettingsDto {
  timezone: string;
  emailDigest: boolean;
  emailReminders: boolean;
  digestHour: number;
  weeklyGoal: number;
}

export interface OrbitPlanDto {
  plan: 'FREE' | 'PRO';
  openTasks: number;
  openReminders: number;
  limits: {
    tasks: number;
    reminders: number;
    spaces: number;
    widgetsPerSpace: number;
    tagsPerItem: number;
    checklistSteps: number;
    recurrence: boolean;
    watch: boolean;
    templates: boolean;
    email: boolean;
    maxZoomDays: number;
  };
}
