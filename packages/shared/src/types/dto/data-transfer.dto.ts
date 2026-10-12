import { type ImportField } from '../../schemas/data-transfer.schema';

export interface ImportPreviewDto {
  importId: string;
  fileName: string;
  headers: string[];
  rowCount: number;
  /** First 20 rows, keyed by header. */
  sampleRows: Array<Record<string, string>>;
  suggestedMapping: Partial<Record<ImportField, string>>;
  /** Validation problems found in the sample rows with the suggested mapping. */
  sampleErrors: Array<{ row: number; message: string }>;
  /** Option values in the file that do not match the user's options yet. */
  unknownOptions: Partial<Record<ImportField, string[]>>;
  expiresAt: string;
}

export interface ImportResultDto {
  created: number;
  skipped: number;
  createdOptions: number;
  errors: Array<{ row: number; message: string }>;
}

export interface InsightItemDto {
  title: string;
  detail: string;
  basedOn: string[];
}

export interface InsightsDto {
  isoWeek: string;
  insights: InsightItemDto[];
  refreshedAt: string;
  /** When the next refresh is allowed (once a day). */
  nextRefreshAt: string;
}
