import * as yup from 'yup';
import {
  ORBIT_GRID,
  ORBIT_KINDS,
  ORBIT_PRIORITIES,
  ORBIT_RECURRENCE_FREQS,
  ORBIT_TEMPLATES,
  ORBIT_TEXT_LIMITS,
  ORBIT_WIDGET_TYPES,
  type OrbitKind,
  type OrbitPriority,
  type OrbitRecurrenceFreq,
  type OrbitTemplate,
  type OrbitWidgetType,
} from '../constants/orbit';
import { cursorPaginationSchema, objectIdSchema, urlSchema } from './common.schema';

const kindSchema = yup.mixed<OrbitKind>().oneOf([...ORBIT_KINDS]);
const prioritySchema = yup.mixed<OrbitPriority>().oneOf([...ORBIT_PRIORITIES]);

const checklistItemSchema = yup.object({
  id: yup.string().trim().min(1).max(40).required(),
  text: yup.string().trim().min(1).max(ORBIT_TEXT_LIMITS.CHECKLIST_TEXT_MAX).required(),
  done: yup.boolean().default(false),
});

const recurrenceSchema = yup
  .object({
    freq: yup
      .mixed<OrbitRecurrenceFreq>()
      .oneOf([...ORBIT_RECURRENCE_FREQS])
      .required(),
    interval: yup.number().integer().min(1).max(12).default(1),
  })
  .nullable()
  .default(undefined);

const tagsSchema = yup
  .array()
  .of(yup.string().trim().min(1).max(ORBIT_TEXT_LIMITS.TAG_MAX).required())
  .max(10);

/** A list sent as "a,b,c" (the web app) or as an array. */
const listSchema = <T extends string>(allowed: readonly T[]) =>
  yup
    .array()
    .transform((value, original) => {
      if (Array.isArray(original)) return original;
      if (typeof original === 'string') {
        return original
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean);
      }
      return value;
    })
    .of(
      yup
        .mixed<T>()
        .oneOf([...allowed])
        .required(),
    );

export const createOrbitTaskSchema = yup.object({
  title: yup
    .string()
    .trim()
    .min(1, 'A title is required')
    .max(ORBIT_TEXT_LIMITS.TITLE_MAX)
    .required('A title is required'),
  notesHtml: yup.string().max(ORBIT_TEXT_LIMITS.NOTES_MAX).nullable().optional(),
  kind: kindSchema.default('TASK'),
  priority: prioritySchema.default('MEDIUM'),
  dueAt: yup.date().nullable().optional(),
  allDay: yup.boolean().default(false),
  remindAt: yup.date().nullable().optional(),
  applicationId: objectIdSchema.nullable().optional(),
  companyId: objectIdSchema.nullable().optional(),
  tags: tagsSchema.default([]),
  checklist: yup.array().of(checklistItemSchema).max(30).default([]),
  recurrence: recurrenceSchema.optional(),
  watchUrl: urlSchema.nullable().optional(),
});

export const updateOrbitTaskSchema = yup.object({
  title: yup.string().trim().min(1).max(ORBIT_TEXT_LIMITS.TITLE_MAX).optional(),
  notesHtml: yup.string().max(ORBIT_TEXT_LIMITS.NOTES_MAX).nullable().optional(),
  kind: kindSchema.optional(),
  priority: prioritySchema.optional(),
  dueAt: yup.date().nullable().optional(),
  allDay: yup.boolean().optional(),
  remindAt: yup.date().nullable().optional(),
  applicationId: objectIdSchema.nullable().optional(),
  companyId: objectIdSchema.nullable().optional(),
  tags: tagsSchema.optional(),
  checklist: yup.array().of(checklistItemSchema).max(30).optional(),
  recurrence: recurrenceSchema.optional(),
  watchUrl: urlSchema.nullable().optional(),
  version: yup.number().integer().min(0).required('Version is required'),
});

export const orbitVersionSchema = yup.object({
  version: yup.number().integer().min(0).required('Version is required'),
});

export const snoozeOrbitTaskSchema = yup.object({
  until: yup.date().required('Choose when to be reminded again'),
  version: yup.number().integer().min(0).required('Version is required'),
});

export const listOrbitTasksQuerySchema = cursorPaginationSchema.shape({
  q: yup.string().trim().max(100).optional(),
  kind: listSchema(ORBIT_KINDS).optional(),
  status: yup.string().oneOf(['OPEN', 'DONE', 'ALL']).default('OPEN'),
  priority: prioritySchema.optional(),
  applicationId: objectIdSchema.optional(),
  companyId: objectIdSchema.optional(),
  tag: yup.string().trim().max(ORBIT_TEXT_LIMITS.TAG_MAX).optional(),
  from: yup.date().optional(),
  to: yup.date().optional(),
  sort: yup.string().oneOf(['due', 'created']).default('due'),
});

export const orbitTimelineQuerySchema = yup.object({
  from: yup.date().required('A start date is required'),
  to: yup.date().required('An end date is required'),
});

/** One typed sentence for the AI refine button on Orbit quick add. */
export const orbitQuickParseSchema = yup.object({
  text: yup
    .string()
    .trim()
    .min(2, 'Type something first')
    .max(300)
    .required('Type something first'),
  /** The browser's UTC offset in minutes (east is positive), so "tomorrow 3pm" means the user's 3pm. */
  tzOffset: yup.number().integer().min(-840).max(840).default(0),
});

export const orbitPulseQuerySchema = yup.object({
  /** The browser's UTC offset in minutes, so "this week" matches the user's clock. */
  tzOffset: yup.number().integer().min(-840).max(840).default(0),
});

const widgetSchema = yup.object({
  id: yup.string().trim().min(1).max(40).required(),
  type: yup
    .mixed<OrbitWidgetType>()
    .oneOf([...ORBIT_WIDGET_TYPES])
    .required(),
  x: yup
    .number()
    .integer()
    .min(0)
    .max(ORBIT_GRID.COLUMNS - 1)
    .required(),
  y: yup.number().integer().min(0).max(ORBIT_GRID.MAX_Y).required(),
  w: yup.number().integer().min(1).max(ORBIT_GRID.COLUMNS).required(),
  h: yup.number().integer().min(1).max(ORBIT_GRID.MAX_ROWS).required(),
  /** Small per-widget settings (for example the radar zoom or the scratchpad text). */
  config: yup.object().default({}),
});

const spaceNameSchema = yup
  .string()
  .trim()
  .min(1, 'A name is required')
  .max(ORBIT_TEXT_LIMITS.SPACE_NAME_MAX);

export const createOrbitSpaceSchema = yup.object({
  name: spaceNameSchema.required('A name is required'),
  template: yup
    .mixed<OrbitTemplate>()
    .oneOf([...ORBIT_TEMPLATES])
    .optional(),
});

export const updateOrbitSpaceSchema = yup.object({
  name: spaceNameSchema.optional(),
  widgets: yup.array().of(widgetSchema).max(24).optional(),
  version: yup.number().integer().min(0).required('Version is required'),
});

export const updateOrbitSettingsSchema = yup.object({
  /** An IANA time zone such as Asia/Colombo. */
  timezone: yup.string().trim().min(1).max(64).optional(),
  emailDigest: yup.boolean().optional(),
  emailReminders: yup.boolean().optional(),
  digestHour: yup.number().integer().min(0).max(23).optional(),
  weeklyGoal: yup.number().integer().min(1).max(100).optional(),
});

export type CreateOrbitTaskInput = yup.InferType<typeof createOrbitTaskSchema>;
export type UpdateOrbitTaskInput = yup.InferType<typeof updateOrbitTaskSchema>;
export type OrbitVersionInput = yup.InferType<typeof orbitVersionSchema>;
export type SnoozeOrbitTaskInput = yup.InferType<typeof snoozeOrbitTaskSchema>;
export type ListOrbitTasksQuery = yup.InferType<typeof listOrbitTasksQuerySchema>;
export type OrbitTimelineQuery = yup.InferType<typeof orbitTimelineQuerySchema>;
export type OrbitQuickParseInput = yup.InferType<typeof orbitQuickParseSchema>;
export type OrbitPulseQuery = yup.InferType<typeof orbitPulseQuerySchema>;
export type OrbitWidgetInput = yup.InferType<typeof widgetSchema>;
export type CreateOrbitSpaceInput = yup.InferType<typeof createOrbitSpaceSchema>;
export type UpdateOrbitSpaceInput = yup.InferType<typeof updateOrbitSpaceSchema>;
export type UpdateOrbitSettingsInput = yup.InferType<typeof updateOrbitSettingsSchema>;
