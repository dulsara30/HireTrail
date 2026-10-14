import {
  ORBIT_KIND_META,
  type OrbitApplicationEventDto,
  type OrbitKind,
  type OrbitPriority,
  type OrbitTaskDto,
  type OrbitTimelineDto,
} from '@hiretrail/shared';
import { isOverdue } from './orbit-dates';

/** One dated thing on the board: either the user's own item or a date from an application. */
export interface OrbitEvent {
  id: string;
  source: 'task' | 'application';
  kind: OrbitKind;
  title: string;
  at: Date;
  allDay: boolean;
  done: boolean;
  overdue: boolean;
  priority: OrbitPriority | null;
  context: string | null;
  task: OrbitTaskDto | null;
  application: OrbitApplicationEventDto | null;
}

export interface OrbitFilters {
  q: string;
  /** Empty means every kind. */
  kinds: OrbitKind[];
  showDone: boolean;
  priority: OrbitPriority | '';
}

export const EMPTY_ORBIT_FILTERS: OrbitFilters = {
  q: '',
  kinds: [],
  showDone: false,
  priority: '',
};

export function hasActiveOrbitFilters(filters: OrbitFilters): boolean {
  return Boolean(
    filters.q.trim() || filters.kinds.length > 0 || filters.showDone || filters.priority,
  );
}

/** A row in a list. Unlike a timeline event it may have no date. */
export type OrbitListItem = Omit<OrbitEvent, 'at'> & { at: Date | null };

export function taskToListItem(task: OrbitTaskDto, now: Date): OrbitListItem {
  const at = task.dueAt ? new Date(task.dueAt) : null;
  const done = task.status === 'DONE';
  return {
    id: task.id,
    source: 'task',
    kind: task.kind,
    title: task.title,
    at,
    allDay: task.allDay,
    done,
    overdue: !done && isOverdue(at, task.allDay, now),
    priority: task.priority,
    context: task.applicationLabel ?? task.companyName,
    task,
    application: null,
  };
}

export function taskToEvent(task: OrbitTaskDto, now: Date): OrbitEvent | null {
  if (!task.dueAt) return null;
  const at = new Date(task.dueAt);
  const done = task.status === 'DONE';
  return {
    id: task.id,
    source: 'task',
    kind: task.kind,
    title: task.title,
    at,
    allDay: task.allDay,
    done,
    overdue: !done && isOverdue(at, task.allDay, now),
    priority: task.priority,
    context: task.applicationLabel ?? task.companyName,
    task,
    application: null,
  };
}

export function applicationToEvent(event: OrbitApplicationEventDto): OrbitEvent {
  return {
    id: event.id,
    source: 'application',
    kind: event.kind,
    title: `${ORBIT_KIND_META[event.kind].label}: ${event.roleTitle}`,
    at: new Date(event.at),
    allDay: false,
    done: false,
    overdue: false,
    priority: null,
    context: event.companyName,
    task: null,
    application: event,
  };
}

/** Everything in a timeline as one list, soonest first. */
export function timelineToEvents(timeline: OrbitTimelineDto | undefined, now: Date): OrbitEvent[] {
  if (!timeline) return [];
  const events: OrbitEvent[] = [];
  for (const task of timeline.tasks) {
    const event = taskToEvent(task, now);
    if (event) events.push(event);
  }
  for (const item of timeline.applicationEvents) events.push(applicationToEvent(item));
  return events.sort((a, b) => a.at.getTime() - b.at.getTime() || a.id.localeCompare(b.id));
}

export function filterEvents(events: OrbitEvent[], filters: OrbitFilters): OrbitEvent[] {
  const q = filters.q.trim().toLowerCase();
  return events.filter((event) => {
    if (!filters.showDone && event.done) return false;
    if (filters.kinds.length > 0 && !filters.kinds.includes(event.kind)) return false;
    if (filters.priority && event.priority !== filters.priority) return false;
    if (q) {
      const haystack =
        `${event.title} ${event.context ?? ''} ${(event.task?.tags ?? []).join(' ')}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}
