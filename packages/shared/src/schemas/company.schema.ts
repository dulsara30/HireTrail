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
});

export const searchCompaniesQuerySchema = cursorPaginationSchema.shape({
  q: yup.string().trim().optional(),
});

export type CreateCompanyInput = yup.InferType<typeof createCompanySchema>;
export type SearchCompaniesQuery = yup.InferType<typeof searchCompaniesQuerySchema>;
