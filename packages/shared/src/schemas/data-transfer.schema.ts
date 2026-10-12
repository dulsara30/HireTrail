import * as yup from 'yup';
import { objectIdSchema } from './common.schema';

export const IMPORT_MAX_ROWS = 1000;
export const IMPORT_MAX_BYTES = 1024 * 1024;

/** Application fields a CSV column can be mapped to. */
export const IMPORT_FIELDS = [
  'company',
  'roleTitle',
  'status',
  'priority',
  'workMode',
  'jobType',
  'level',
  'source',
  'cvVersion',
  'coverLetter',
  'location',
  'jobUrl',
  'salaryMin',
  'salaryMax',
  'salaryCurrency',
  'salaryPeriod',
  'expectedSalary',
  'appliedDate',
  'deadline',
  'followUp',
  'jobDescription',
  'notes',
] as const;
export type ImportField = (typeof IMPORT_FIELDS)[number];

export const importCommitSchema = yup.object({
  importId: objectIdSchema.required('importId is required'),
  /** field -> CSV header name */
  mapping: yup
    .object(
      Object.fromEntries(IMPORT_FIELDS.map((f) => [f, yup.string().trim().max(200).optional()])),
    )
    .required(),
  createMissingOptions: yup.boolean().default(true),
});

export type ImportCommitInput = yup.InferType<typeof importCommitSchema>;
