import * as yup from 'yup';
import { cursorPaginationSchema, objectIdSchema } from './common.schema';
import { ADMIN_EMAIL_MAX_RECIPIENTS, ADMIN_EMAIL_TEMPLATES } from '../constants/admin-email';

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
  // Optional for plan changes: a default note is recorded when it is left out
  reason: yup.string().trim().max(300).optional(),
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

const optionalText = (max: number) => yup.string().trim().max(max).nullable().optional();
const ratingValue = yup.number().min(0).max(10).nullable().optional();

/** Admins can edit every field of a global company. Optimistic concurrency via `version`. */
export const adminUpdateCompanySchema = yup.object({
  name: yup.string().trim().min(1, 'Company name is required').max(120).optional(),
  aliases: yup.array().of(yup.string().trim().min(1).max(120).required()).max(30).optional(),
  region: yup.string().oneOf(['LOCAL', 'FOREIGN']).nullable().optional(),
  country: optionalText(80),
  city: optionalText(80),
  website: optionalText(300),
  careersUrl: optionalText(300),
  linkedinUrl: optionalText(300),
  contactEmail: optionalText(254),
  foundedYear: optionalText(10),
  size: optionalText(60),
  industry: optionalText(120),
  techStack: yup.array().of(yup.string().trim().min(1).max(60).required()).max(60).optional(),
  description: optionalText(2000),
  hiringModel: optionalText(120),
  tier: yup.string().oneOf(['A', 'B']).nullable().optional(),
  reportRatings: yup
    .object({
      culture: ratingValue,
      workExperience: ratingValue,
      salary: ratingValue,
      learning: ratingValue,
      overall: ratingValue,
      scale: ratingValue,
      appeal: ratingValue,
    })
    .nullable()
    .optional(),
  version: yup.number().integer().min(0).required(),
  reason: reasonSchema,
});

/** Creates a global company. `sourceUrls` are the public pages a lookup used (kept for the audit trail). */
export const adminCreateCompanySchema = yup.object({
  name: yup
    .string()
    .trim()
    .min(1, 'Company name is required')
    .max(120)
    .required('Company name is required'),
  website: optionalText(300),
  careersUrl: optionalText(300),
  country: optionalText(80),
  city: optionalText(80),
  industry: optionalText(120),
  size: optionalText(60),
  description: optionalText(2000),
  linkedinUrl: optionalText(300),
  contactEmail: optionalText(254),
  foundedYear: optionalText(10),
  techStack: yup.array().of(yup.string().trim().min(1).max(60).required()).max(30).default([]),
  region: yup.string().oneOf(['LOCAL', 'FOREIGN']).nullable().optional(),
  tier: yup.string().oneOf(['A', 'B']).nullable().optional(),
  fromAiLookup: yup.boolean().default(false),
  sourceUrls: yup.array().of(yup.string().trim().max(500).required()).max(10).default([]),
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
export type AdminCreateCompanyInput = yup.InferType<typeof adminCreateCompanySchema>;
export type AdminUpdateCompanyInput = yup.InferType<typeof adminUpdateCompanySchema>;
export type AdminApplySuggestionsInput = yup.InferType<typeof adminApplySuggestionsSchema>;
export type AdminAuditLogsQuery = yup.InferType<typeof adminAuditLogsQuerySchema>;
export type AdminAiUsageQuery = yup.InferType<typeof adminAiUsageQuerySchema>;

const adminEmailContent = {
  template: yup
    .string()
    .oneOf([...ADMIN_EMAIL_TEMPLATES])
    .required('Choose a template'),
  subject: yup
    .string()
    .trim()
    .min(1, 'A subject is required')
    .max(150)
    .required('A subject is required'),
  heading: yup.string().trim().max(120).optional(),
  message: yup
    .string()
    .trim()
    .max(5000)
    .when('template', {
      is: (template: string) => template !== 'DUE_TASKS',
      then: (schema) => schema.min(1, 'Write a message').required('Write a message'),
      otherwise: (schema) => schema.optional(),
    }),
  ctaLabel: yup.string().trim().max(40).optional(),
  ctaUrl: yup
    .string()
    .trim()
    .max(500)
    .matches(/^https?:\/\/\S+$/i, {
      message: 'Must start with http:// or https://',
      excludeEmptyString: true,
    })
    .optional(),
};

/** An admin sends one of the templates to chosen users. */
export const adminSendEmailSchema = yup.object({
  ...adminEmailContent,
  userIds: yup
    .array()
    .of(objectIdSchema.required())
    .min(1, 'Choose at least one person')
    .max(ADMIN_EMAIL_MAX_RECIPIENTS, `At most ${ADMIN_EMAIL_MAX_RECIPIENTS} people at a time`)
    .required('Choose at least one person'),
});

export const adminEmailPreviewSchema = yup.object(adminEmailContent);

export type AdminSendEmailInput = yup.InferType<typeof adminSendEmailSchema>;
export type AdminEmailPreviewInput = yup.InferType<typeof adminEmailPreviewSchema>;
