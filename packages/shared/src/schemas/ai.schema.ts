import * as yup from 'yup';
import { AI_TEXT_MAX, VERIFIABLE_FIELDS } from '../constants/ai';
import { objectIdSchema, urlSchema } from './common.schema';

export const autofillRequestSchema = yup
  .object({
    text: yup.string().trim().max(AI_TEXT_MAX, `Text cannot exceed ${AI_TEXT_MAX} characters`),
    url: urlSchema.optional(),
  })
  .test('one-of-text-url', 'Provide either text or url', (value) => {
    const hasText = Boolean(value?.text && value.text.length > 0);
    const hasUrl = Boolean(value?.url && value.url.length > 0);
    return hasText !== hasUrl;
  });

export const verifyCompanyRequestSchema = yup.object({
  force: yup.boolean().default(false),
});

export const applySuggestionsSchema = yup.object({
  fields: yup
    .array()
    .of(
      yup
        .string()
        .oneOf([...VERIFIABLE_FIELDS])
        .required(),
    )
    .min(1)
    .required(),
});

export const companyLookupRequestSchema = yup.object({
  name: yup.string().trim().min(2).max(120).required('Company name is required'),
  hint: yup.string().trim().max(200).optional(),
});

export const verificationIdParamSchema = yup.object({
  id: objectIdSchema.required(),
  vid: objectIdSchema.required(),
});

export type AutofillRequestInput = yup.InferType<typeof autofillRequestSchema>;
export type VerifyCompanyRequestInput = yup.InferType<typeof verifyCompanyRequestSchema>;
export type ApplySuggestionsInput = yup.InferType<typeof applySuggestionsSchema>;
export type CompanyLookupRequestInput = yup.InferType<typeof companyLookupRequestSchema>;
