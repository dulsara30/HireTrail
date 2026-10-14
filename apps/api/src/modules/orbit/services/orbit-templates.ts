import { randomUUID } from 'crypto';
import { type OrbitTemplate, type OrbitWidgetType } from '@hiretrail/shared';
import { type OrbitWidgetDoc } from '../models/orbit-space.model';

type Placement = [OrbitWidgetType, number, number, number, number];

const LAYOUTS: Record<OrbitTemplate, Placement[]> = {
  TODAY: [
    ['ORBIT', 0, 0, 7, 5],
    ['PULSE', 7, 0, 5, 3],
    ['TODAY', 7, 3, 5, 4],
    ['TASKS', 0, 5, 7, 5],
    ['REMINDERS', 7, 7, 5, 3],
  ],
  INTERVIEW_WEEK: [
    ['ORBIT', 0, 0, 6, 5],
    ['DEADLINES', 6, 0, 6, 4],
    ['TODAY', 0, 5, 6, 4],
    ['TASKS', 6, 4, 6, 5],
  ],
  DEEP_HUNT: [
    ['PIPELINE', 0, 0, 6, 3],
    ['GOAL', 6, 0, 3, 3],
    ['PULSE', 9, 0, 3, 3],
    ['AGING', 0, 3, 4, 4],
    ['WATCH', 4, 3, 4, 4],
    ['ORBIT', 8, 3, 4, 4],
    ['REMINDERS', 0, 7, 6, 4],
    ['CALENDAR', 6, 7, 6, 5],
  ],
};

/** The widgets of a built-in layout, each with a fresh id. */
export function widgetsForTemplate(template: OrbitTemplate): OrbitWidgetDoc[] {
  return LAYOUTS[template].map(([type, x, y, w, h]) => ({
    id: randomUUID(),
    type,
    x,
    y,
    w,
    h,
    config: {},
  }));
}
