import * as yup from 'yup';
import { TEXT_LIMITS, MAX_LABELS } from '../constants/limits';
import { cursorPaginationSchema, objectIdSchema, urlSchema } from './common.schema';

export const salarySchema = yup.object({
  min: yup.number().integer().min(0).nullable().optional(),
  max: yup.number().integer().min(0).nullable().optional(),
  currency: yup
    .string()
    .trim()
    .length(3)
    .matches(/^[A-Z]{3}$/)
    .nullable()
    .optional(),
  period: yup.string().oneOf(['HOUR', 'MONTH', 'YEAR']).nullable().optional(),
  expected: yup.number().integer().min(0).nullable().optional(),
});

export const datesSchema = yup.object({
  savedAt: yup.date().nullable().optional(),
  appliedAt: yup.date().nullable().optional(),
  deadlineAt: yup.date().nullable().optional(),
  followUpAt: yup.date().nullable().optional(),
  nextInterviewAt: yup.date().nullable().optional(),
});

export const contactSchema = yup.object({
  name: yup.string().trim().max(100).required('Contact name is required'),
  role: yup.string().trim().max(100).nullable().optional(),
  email: yup.string().trim().email('Invalid email').nullable().optional(),
  phone: yup.string().trim().max(50).nullable().optional(),
  linkedinUrl: urlSchema.nullable().optional(),
});

export const createApplicationSchema = yup.object({
  companyId: objectIdSchema.nullable().optional(),
  companyName: yup
    .string()
    .trim()
    .min(1, 'Company name is required')
    .max(TEXT_LIMITS.COMPANY_NAME_MAX)
    .required('Company name is required'),
  roleTitle: yup
    .string()
    .trim()
    .min(1, 'Role title is required')
    .max(TEXT_LIMITS.ROLE_TITLE_MAX)
    .required('Role title is required'),
  statusId: objectIdSchema.required('Status is required'),
  priorityId: objectIdSchema.nullable().optional(),
  workModeId: objectIdSchema.nullable().optional(),
  jobTypeId: objectIdSchema.nullable().optional(),
  levelId: objectIdSchema.nullable().optional(),
  sourceId: objectIdSchema.nullable().optional(),
  cvVersionId: objectIdSchema.nullable().optional(),
  labelIds: yup
    .array()
    .of(objectIdSchema)
    .max(MAX_LABELS, `Cannot exceed ${MAX_LABELS} labels`)
    .default([]),
  location: yup.string().trim().max(TEXT_LIMITS.LOCATION_MAX).nullable().optional(),
  jobUrl: urlSchema.nullable().optional(),
  jobDescriptionHtml: yup.string().max(TEXT_LIMITS.DESCRIPTION_MAX).nullable().optional(),
  notesHtml: yup.string().max(TEXT_LIMITS.DESCRIPTION_MAX).nullable().optional(),
  salary: salarySchema.nullable().optional(),
  dates: datesSchema.nullable().optional(),
  contacts: yup.array().of(contactSchema).max(10).default([]),
});

export const updateApplicationSchema = yup.object({
  companyId: objectIdSchema.nullable().optional(),
  companyName: yup.string().trim().min(1).max(TEXT_LIMITS.COMPANY_NAME_MAX).optional(),
  roleTitle: yup.string().trim().min(1).max(TEXT_LIMITS.ROLE_TITLE_MAX).optional(),
  statusId: objectIdSchema.optional(),
  priorityId: objectIdSchema.nullable().optional(),
  workModeId: objectIdSchema.nullable().optional(),
  jobTypeId: objectIdSchema.nullable().optional(),
  levelId: objectIdSchema.nullable().optional(),
  sourceId: objectIdSchema.nullable().optional(),
  cvVersionId: objectIdSchema.nullable().optional(),
  labelIds: yup.array().of(objectIdSchema).max(MAX_LABELS).optional(),
  location: yup.string().trim().max(TEXT_LIMITS.LOCATION_MAX).nullable().optional(),
  jobUrl: urlSchema.nullable().optional(),
  jobDescriptionHtml: yup.string().max(TEXT_LIMITS.DESCRIPTION_MAX).nullable().optional(),
  notesHtml: yup.string().max(TEXT_LIMITS.DESCRIPTION_MAX).nullable().optional(),
  salary: salarySchema.nullable().optional(),
  dates: datesSchema.nullable().optional(),
  contacts: yup.array().of(contactSchema).max(10).optional(),
  version: yup
    .number()
    .integer()
    .min(1)
    .required('Version is required for optimistic concurrency check'),
});

export const moveApplicationSchema = yup.object({
  statusId: objectIdSchema.required('Status is required'),
  beforeId: objectIdSchema.nullable().optional(),
  afterId: objectIdSchema.nullable().optional(),
  version: yup
    .number()
    .integer()
    .min(1)
    .required('Version is required for optimistic concurrency check'),
});

export const listApplicationsQuerySchema = cursorPaginationSchema.shape({
  q: yup.string().trim().optional(),
  statusIds: yup.array().of(objectIdSchema).optional(),
  priorityIds: yup.array().of(objectIdSchema).optional(),
  labelIds: yup.array().of(objectIdSchema).optional(),
  workModeIds: yup.array().of(objectIdSchema).optional(),
  sourceIds: yup.array().of(objectIdSchema).optional(),
  companyId: objectIdSchema.optional(),
  appliedFrom: yup.date().optional(),
  appliedTo: yup.date().optional(),
  followUpDue: yup.boolean().optional(),
  archived: yup.boolean().default(false),
  sort: yup
    .string()
    .oneOf(['updatedAt', 'appliedAt', 'companyName', 'priority'])
    .default('updatedAt'),
  order: yup.string().oneOf(['asc', 'desc']).default('desc'),
});

export const boardQuerySchema = yup.object({
  q: yup.string().trim().optional(),
  priorityIds: yup.array().of(objectIdSchema).optional(),
  labelIds: yup.array().of(objectIdSchema).optional(),
  workModeIds: yup.array().of(objectIdSchema).optional(),
  sourceIds: yup.array().of(objectIdSchema).optional(),
  archived: yup.boolean().default(false),
});

export const laneQuerySchema = cursorPaginationSchema.shape({
  q: yup.string().trim().optional(),
  priorityIds: yup.array().of(objectIdSchema).optional(),
  labelIds: yup.array().of(objectIdSchema).optional(),
  workModeIds: yup.array().of(objectIdSchema).optional(),
  sourceIds: yup.array().of(objectIdSchema).optional(),
});

export type CreateApplicationInput = yup.InferType<typeof createApplicationSchema>;
export type UpdateApplicationInput = yup.InferType<typeof updateApplicationSchema>;
export type MoveApplicationInput = yup.InferType<typeof moveApplicationSchema>;
export type ListApplicationsQuery = yup.InferType<typeof listApplicationsQuerySchema>;
export type BoardQuery = yup.InferType<typeof boardQuerySchema>;
export type LaneQuery = yup.InferType<typeof laneQuerySchema>;
