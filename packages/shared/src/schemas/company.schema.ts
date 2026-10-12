import * as yup from 'yup';
import { TEXT_LIMITS } from '../constants/limits';
import { cursorPaginationSchema, urlSchema } from './common.schema';

export const createCompanySchema = yup.object({
  name: yup
    .string()
    .trim()
    .min(1, 'Company name is required')
    .max(
      TEXT_LIMITS.COMPANY_NAME_MAX,
      `Company name cannot exceed ${TEXT_LIMITS.COMPANY_NAME_MAX} characters`,
    )
    .required('Company name is required'),
  websiteUrl: urlSchema.nullable().optional(),
  logoUrl: urlSchema.nullable().optional(),
  location: yup.string().trim().max(TEXT_LIMITS.LOCATION_MAX).nullable().optional(),
  domain: yup.string().trim().lowercase().nullable().optional(),
  description: yup.string().trim().max(2000).nullable().optional(),
  techStack: yup.array().of(yup.string().trim().required()).optional(),
  tier: yup.string().oneOf(['A', 'B']).nullable().optional(),
  region: yup.string().oneOf(['LOCAL', 'FOREIGN']).nullable().optional(),
  careersUrl: urlSchema.nullable().optional(),
  country: yup.string().trim().max(80).nullable().optional(),
  industry: yup.string().trim().max(120).nullable().optional(),
  size: yup.string().trim().max(60).nullable().optional(),
  fromAiLookup: yup.boolean().optional(),
});

export const updateCompanySchema = yup.object({
  name: yup
    .string()
    .trim()
    .min(1, 'Company name is required')
    .max(
      TEXT_LIMITS.COMPANY_NAME_MAX,
      `Company name cannot exceed ${TEXT_LIMITS.COMPANY_NAME_MAX} characters`,
    )
    .optional(),
  websiteUrl: urlSchema.nullable().optional(),
  logoUrl: urlSchema.nullable().optional(),
  location: yup.string().trim().max(TEXT_LIMITS.LOCATION_MAX).nullable().optional(),
  domain: yup.string().trim().lowercase().nullable().optional(),
  description: yup.string().trim().max(2000).nullable().optional(),
  techStack: yup.array().of(yup.string().trim().required()).optional(),
  tier: yup.string().oneOf(['A', 'B']).nullable().optional(),
  region: yup.string().oneOf(['LOCAL', 'FOREIGN']).nullable().optional(),
});

export const listCompaniesQuerySchema = cursorPaginationSchema.shape({
  q: yup.string().trim().optional(),
  region: yup.string().oneOf(['LOCAL', 'FOREIGN']).optional(),
  tier: yup.string().oneOf(['A', 'B']).optional(),
  verification: yup.string().oneOf(['VERIFIED', 'UNVERIFIED', 'FAILED']).optional(),
  hasApplications: yup
    .string()
    .oneOf(['true', 'false'])
    .transform((val) =>
      val === true || val === 'true'
        ? 'true'
        : val === false || val === 'false'
          ? 'false'
          : undefined,
    )
    .optional(),
});

export const searchCompaniesQuerySchema = cursorPaginationSchema.shape({
  q: yup.string().trim().optional(),
});

export const upsertCompanyNotesSchema = yup.object({
  myRating: yup.number().min(1).max(5).nullable().optional(),
  notesHtml: yup.string().trim().max(10000).nullable().optional(),
});

export type CreateCompanyInput = yup.InferType<typeof createCompanySchema>;
export type UpdateCompanyInput = yup.InferType<typeof updateCompanySchema>;
export type ListCompaniesQuery = yup.InferType<typeof listCompaniesQuerySchema>;
export type SearchCompaniesQuery = yup.InferType<typeof searchCompaniesQuerySchema>;
export type UpsertCompanyNotesInput = yup.InferType<typeof upsertCompanyNotesSchema>;
