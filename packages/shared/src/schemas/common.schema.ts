import * as yup from 'yup';
import { MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE } from '../constants/limits';

export const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

export const objectIdSchema = yup
  .string()
  .trim()
  .matches(OBJECT_ID_REGEX, 'Must be a valid 24-character hexadecimal ObjectId');

export const cursorPaginationSchema = yup.object({
  limit: yup.number().integer().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  cursor: yup.string().trim().optional(),
});

export const dateRangeSchema = yup.object({
  from: yup.date().optional(),
  to: yup.date().optional(),
});

export const urlSchema = yup
  .string()
  .trim()
  .test('http-https-url', 'Must be a valid http or https URL', (value) => {
    if (!value) return true;
    try {
      const parsed = new URL(value);
      return (
        (parsed.protocol === 'http:' || parsed.protocol === 'https:') && Boolean(parsed.hostname)
      );
    } catch {
      return false;
    }
  });

export const moneySchema = yup.object({
  amount: yup.number().integer('Amount must be an integer in minor units').required(),
  currency: yup
    .string()
    .trim()
    .length(3, 'Currency must be an ISO 4217 3-letter code')
    .matches(/^[A-Z]{3}$/, 'Currency must be 3 uppercase letters')
    .required(),
});

export type CursorPaginationQuery = yup.InferType<typeof cursorPaginationSchema>;
export type DateRangeQuery = yup.InferType<typeof dateRangeSchema>;
export type MoneyInput = yup.InferType<typeof moneySchema>;
