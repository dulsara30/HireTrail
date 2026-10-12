import * as yup from 'yup';
import { OptionType, OptionColor } from '../constants/options';
import { TEXT_LIMITS } from '../constants/limits';

import { objectIdSchema } from './common.schema';

export const OPTION_COLORS: OptionColor[] = [
  'neutral',
  'accent',
  'info',
  'purple',
  'success',
  'danger',
  'orange',
  'teal',
  'pink',
  'lime',
  'brown',
  'indigo',
];

export const optionColorSchema = yup.mixed<OptionColor>().oneOf(OPTION_COLORS).required();

export const createOptionSchema = yup.object({
  type: yup.mixed<OptionType>().oneOf(Object.values(OptionType)).required('Type is required'),
  label: yup
    .string()
    .trim()
    .min(1, 'Label cannot be empty')
    .max(
      TEXT_LIMITS.OPTION_LABEL_MAX,
      `Label cannot exceed ${TEXT_LIMITS.OPTION_LABEL_MAX} characters`,
    )
    .required('Label is required'),
  color: optionColorSchema,
  meta: yup.object().optional(),
  aliases: yup.array().of(yup.string().trim().max(TEXT_LIMITS.OPTION_LABEL_MAX)).optional(),
});

export const updateOptionSchema = yup.object({
  label: yup.string().trim().min(1).max(TEXT_LIMITS.OPTION_LABEL_MAX).optional(),
  color: yup.mixed<OptionColor>().oneOf(OPTION_COLORS).optional(),
  meta: yup.object().optional(),
  aliases: yup.array().of(yup.string().trim().max(TEXT_LIMITS.OPTION_LABEL_MAX)).optional(),
  version: yup.number().integer().min(0).required('Version is required'),
});

export const moveOptionSchema = yup.object({
  beforeId: objectIdSchema.nullable().optional(),
  afterId: objectIdSchema.nullable().optional(),
});

export const archiveOptionSchema = yup.object({
  reassignToId: objectIdSchema.optional(),
});

export const resetDefaultOptionsSchema = yup.object({
  type: yup.mixed<OptionType>().oneOf(Object.values(OptionType)).required('Type is required'),
});

export const listOptionsQuerySchema = yup.object({
  type: yup.mixed<OptionType>().oneOf(Object.values(OptionType)).optional(),
  includeArchived: yup
    .boolean()
    .transform((value, originalValue) =>
      originalValue === 'true' ? true : originalValue === 'false' ? false : value,
    )
    .optional(),
});

export type CreateOptionInput = yup.InferType<typeof createOptionSchema>;
export type UpdateOptionInput = yup.InferType<typeof updateOptionSchema>;
export type MoveOptionInput = yup.InferType<typeof moveOptionSchema>;
export type ArchiveOptionInput = yup.InferType<typeof archiveOptionSchema>;
export type ResetDefaultOptionsInput = yup.InferType<typeof resetDefaultOptionsSchema>;
export type ListOptionsQuery = yup.InferType<typeof listOptionsQuerySchema>;
