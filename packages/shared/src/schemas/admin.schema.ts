import * as yup from 'yup';
import { cursorPaginationSchema, objectIdSchema } from './common.schema';

const reasonSchema = yup
  .string()
  .trim()
  .min(5, 'Please give a reason (at least 5 characters)')
  .max(300)
  .required('A reason is required');

export const adminListUsersQuerySchema = cursorPaginationSchema.shape({
  q: yup.string().trim().max(100).optional(),
  plan: yup.string().oneOf(['FREE', 'PRO']).optional(),
  role: yup.string().oneOf(['USER', 'ADMIN']).optional(),
  status: yup.string().oneOf(['ACTIVE', 'SUSPENDED']).optional(),
});

export const adminChangePlanSchema = yup.object({
  plan: yup.string().oneOf(['FREE', 'PRO']).required('Plan is required'),
  reason: reasonSchema,
});

export const adminChangeStatusSchema = yup.object({
  status: yup.string().oneOf(['ACTIVE', 'SUSPENDED']).required('Status is required'),
  reason: reasonSchema,
});

export const adminListCompaniesQuerySchema = cursorPaginationSchema.shape({
  q: yup.string().trim().max(100).optional(),
});

export const adminMergeCompanySchema = yup.object({
  intoId: objectIdSchema.required('Target company is required'),
  reason: reasonSchema,
});

export const adminApplySuggestionsSchema = yup.object({
  fields: yup.array().of(yup.string().required()).min(1).required(),
  reason: reasonSchema,
});

export const adminAuditLogsQuerySchema = cursorPaginationSchema.shape({
  action: yup.string().trim().max(60).optional(),
  targetId: objectIdSchema.optional(),
});

export const adminAiUsageQuerySchema = yup.object({
  days: yup.number().integer().min(1).max(90).default(14),
});

export type AdminListUsersQuery = yup.InferType<typeof adminListUsersQuerySchema>;
export type AdminChangePlanInput = yup.InferType<typeof adminChangePlanSchema>;
export type AdminChangeStatusInput = yup.InferType<typeof adminChangeStatusSchema>;
export type AdminListCompaniesQuery = yup.InferType<typeof adminListCompaniesQuerySchema>;
export type AdminMergeCompanyInput = yup.InferType<typeof adminMergeCompanySchema>;
export type AdminApplySuggestionsInput = yup.InferType<typeof adminApplySuggestionsSchema>;
export type AdminAuditLogsQuery = yup.InferType<typeof adminAuditLogsQuerySchema>;
export type AdminAiUsageQuery = yup.InferType<typeof adminAiUsageQuerySchema>;
