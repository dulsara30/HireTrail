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

/** One star rating per user and company; null clears it. */
export const setCompanyRatingSchema = yup.object({
  myRating: yup.number().integer().min(1).max(5).nullable().defined(),
});

const companyNoteBodySchema = yup
  .string()
  .trim()
  .min(1, 'A note cannot be empty')
  .max(10000, 'A note cannot exceed 10000 characters');

export const createCompanyNoteSchema = yup.object({
  bodyHtml: companyNoteBodySchema.required('A note cannot be empty'),
});

export const updateCompanyNoteSchema = yup.object({
  bodyHtml: companyNoteBodySchema.required('A note cannot be empty'),
  version: yup.number().integer().min(0).required(),
});

export type CreateCompanyInput = yup.InferType<typeof createCompanySchema>;
export type UpdateCompanyInput = yup.InferType<typeof updateCompanySchema>;
export type ListCompaniesQuery = yup.InferType<typeof listCompaniesQuerySchema>;
export type SearchCompaniesQuery = yup.InferType<typeof searchCompaniesQuerySchema>;
export type SetCompanyRatingInput = yup.InferType<typeof setCompanyRatingSchema>;
export type CreateCompanyNoteInput = yup.InferType<typeof createCompanyNoteSchema>;
export type UpdateCompanyNoteInput = yup.InferType<typeof updateCompanyNoteSchema>;
